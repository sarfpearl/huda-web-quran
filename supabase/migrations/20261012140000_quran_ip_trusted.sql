-- ============================================================================
--  HuDa Web Quran : trust only Cloudflare's client IP; caps that hold under load
--  Run AFTER 20261012130000_quran_ip_limits_raise.sql. Idempotent.
--
--  A gateway test on a separate Supabase project (2026-10-12) showed what
--  PostgREST hands to Postgres: cf-connecting-ip is always set and can't be
--  spoofed (a client-sent one is refused by Cloudflare, error 1000); a
--  client-sent X-Forwarded-For is kept as the LEFTMOST entry; X-Real-IP is
--  dropped. quran_client_ip() already read cf-connecting-ip first, so the
--  limits were not bypassable, but it fell back to the leftmost XFF entry
--  and accepted any string.
--
--  - quran_client_ip(): cf-connecting-ip only, parsed as an IP; IPv6 grouped
--    by /64 (one home or phone line), IPv4 by address. An API request without
--    a usable one shares a single 'invalid' bucket (limits still apply)
--    instead of being unlimited. No request headers (SQL editor) → null, no
--    limits, as before.
--  - quran_viewer_allowed() and add_quran_comment(): a transaction lock per IP
--    (and per browser for comments), so requests arriving together can't all
--    pass the count before any of them inserts.
--  Changing the hashed value resets each IP's caps once; old rows age out in
--  2 days.
-- ============================================================================

create or replace function public.quran_client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  h json;
  ip inet;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  if h is null then return null; end if;
  begin
    ip := nullif(btrim(h->>'cf-connecting-ip'), '')::inet;
  exception when others then
    ip := null;
  end;
  if ip is null then return 'invalid'; end if;
  if family(ip) = 6 then return network(set_masklen(ip, 64))::text; end if;
  return host(ip);
end;
$$;
revoke execute on function public.quran_client_ip() from public, anon, authenticated;

create or replace function public.quran_viewer_allowed(p_viewer text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text := public.quran_client_ip_hash();
begin
  if v_ip is null or p_viewer is null then return true; end if;
  -- New ids from one IP are counted one at a time (see the header).
  perform pg_advisory_xact_lock(hashtext('quran_ip:' || v_ip));
  if exists (select 1 from public.quran_ip_viewers where ip_hash = v_ip and viewer_id = p_viewer) then
    return true;
  end if;
  if (select count(*) from public.quran_ip_viewers
       where ip_hash = v_ip and first_seen > now() - interval '1 day')
     >= public.quran_ip_limit('new_viewers_per_day') then
    return false;
  end if;
  insert into public.quran_ip_viewers (ip_hash, viewer_id) values (v_ip, p_viewer)
  on conflict do nothing;
  delete from public.quran_ip_viewers where first_seen < now() - interval '2 days';
  return true;
end;
$$;
revoke all on function public.quran_viewer_allowed(text) from public, anon, authenticated;

-- Comments: as 20261011120000 (link hold, duplicates), plus the locks.
create or replace function public.add_quran_comment(
  p_viewer text, p_kind text, p_ref int, p_name text, p_body text, p_parent uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
  v_body text := left(btrim(coalesce(p_body, '')), 500);
  v_norm text;
  v_held boolean;
  v_parent uuid;
  v_row public.quran_comments%rowtype;
  v_ip text := public.quran_client_ip_hash();
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_comment_ref_valid(p_kind, p_ref), false) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name = '' or v_body = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  -- One comment at a time per browser and per IP: the checks below count
  -- rows, and two requests at once both passed them before either inserted.
  perform pg_advisory_xact_lock(hashtext('quran_viewer:' || p_viewer));
  if v_ip is not null then
    perform pg_advisory_xact_lock(hashtext('quran_ip:' || v_ip));
  end if;
  if p_parent is not null then
    -- One level deep: a reply to a reply belongs to the top-level comment.
    select coalesce(c.parent_id, c.id) into v_parent
      from public.quran_comments c
     where c.id = p_parent and c.kind = p_kind and c.ref_id = p_ref and not c.is_hidden;
    if v_parent is null then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;
  if exists (select 1 from public.quran_comments
              where viewer_id = p_viewer and created_at > now() - interval '5 seconds')
     or (select count(*) from public.quran_comments
          where viewer_id = p_viewer and created_at > now() - interval '1 day') >= 100
     or not public.quran_viewer_allowed(p_viewer)
     or (v_ip is not null and (select count(*) from public.quran_comments c
                                 join public.quran_ip_viewers v
                                   on v.viewer_id = c.viewer_id and v.ip_hash = v_ip
                                where c.created_at > now() - interval '1 hour')
                              >= public.quran_ip_limit('comments_per_hour')) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  v_norm := public.quran_comment_norm(v_body);
  if exists (select 1 from public.quran_comments c
              where c.created_at > now() - interval '1 day'
                and public.quran_comment_norm(c.body) = v_norm
                and (c.viewer_id = p_viewer
                     or (v_ip is not null and char_length(v_norm) >= 20 and exists (
                           select 1 from public.quran_ip_viewers v
                            where v.viewer_id = c.viewer_id and v.ip_hash = v_ip)))) then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  v_held := public.quran_has_link(v_body) or public.quran_has_link(v_name);

  insert into public.quran_comments (kind, ref_id, viewer_id, name, body, parent_id, is_hidden)
  values (p_kind, p_ref, p_viewer, v_name, v_body, v_parent, v_held)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'held', v_held,
                            'comment', public.quran_comment_json(v_row, p_viewer));
end;
$$;
grant execute on function public.add_quran_comment(text, text, int, text, text, uuid) to anon, authenticated;
