-- ============================================================================
--  HuDa Web Quran : comment spam guard
--  Run AFTER 20261006150000_quran_ip_limits.sql. Idempotent.
--
--  On top of the per-IP limits:
--  - A comment (or name) with a link — http(s)://, www., t.me/, wa.me/ or a
--    bare domain like example.com — is saved hidden: it shows only once an
--    admin unhides it in /admin/comments (filter "Hidden"). The call returns
--    ok with held = true.
--  - The same text again within 24 hours from the same browser id is refused
--    with 'duplicate' (case and spacing ignored); from the same IP too, once
--    it is 20+ characters — short greetings ("MashaAllah") from people who
--    share a mobile IP still go through.
--  Calls without request headers (SQL editor) skip the IP part only.
-- ============================================================================

-- True when the text carries a link.
create or replace function public.quran_has_link(p_text text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_text, '') ~* (
    '(https?://|www\.|t\.me/|wa\.me/|'
    || '\m[[:alnum:]-]+\.(com|net|org|info|biz|io|co|me|ly|xyz|top|ru|cn|in|site|online|link|click|shop|live|app|store|club|vip)\M)'
  );
$$;

-- Text as compared for duplicates: lower case, spacing collapsed.
create or replace function public.quran_comment_norm(p_text text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')));
$$;

-- Comments: same as 20261006150000 plus the link hold and duplicate check.
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
