-- ============================================================================
--  HuDa Web Quran : per-IP limits for anonymous views, live, likes, comments
--  Run AFTER 20260926150000_quran_comment_likes_replies.sql. Idempotent.
--
--  Views, live listeners and likes count random browser ids, so one person
--  could inflate them by making many ids. This caps how many NEW browser ids
--  one IP address can bring in per day, and how many comments one IP can post
--  per hour. Only a salted SHA-256 of the IP is stored, never the IP itself,
--  and rows older than 2 days are purged.
--
--  Over the cap a new id is simply not counted (no view / live / like row);
--  playback is never affected. Comments over the cap get 'rate_limited'.
--  Calls without request headers (SQL editor, cron) are never limited.
--
--  Tune the limits in public.quran_ip_limit() below.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Private settings (the IP-hash salt). No API access.
create table if not exists public.quran_private_settings (
  key text primary key,
  value text not null
);
alter table public.quran_private_settings enable row level security;
revoke all on public.quran_private_settings from anon, authenticated;
insert into public.quran_private_settings (key, value)
values ('ip_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Which browser ids each (hashed) IP has brought in.
create table if not exists public.quran_ip_viewers (
  ip_hash text not null,
  viewer_id text not null,
  first_seen timestamptz not null default now(),
  primary key (ip_hash, viewer_id)
);
create index if not exists quran_ip_viewers_seen_idx on public.quran_ip_viewers (ip_hash, first_seen desc);
create index if not exists quran_ip_viewers_viewer_idx on public.quran_ip_viewers (viewer_id);
alter table public.quran_ip_viewers enable row level security;
revoke all on public.quran_ip_viewers from anon, authenticated;

-- Limits in one place.
create or replace function public.quran_ip_limit(p_name text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_name
    when 'new_viewers_per_day' then 30
    when 'comments_per_hour' then 20
  end;
$$;

-- The caller's IP from the API request headers, or null outside the API.
-- Cloudflare's cf-connecting-ip can't be set by the client, so it wins.
create or replace function public.quran_client_ip()
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  h json;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return null;
  end;
  if h is null then return null; end if;
  return coalesce(
    nullif(btrim(h->>'cf-connecting-ip'), ''),
    nullif(btrim(split_part(h->>'x-forwarded-for', ',', 1)), ''),
    nullif(btrim(h->>'x-real-ip'), '')
  );
end;
$$;

create or replace function public.quran_client_ip_hash()
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select case when public.quran_client_ip() is null then null else
    encode(extensions.digest(
      public.quran_client_ip() || (select value from public.quran_private_settings where key = 'ip_salt'),
      'sha256'), 'hex')
  end;
$$;

-- True when this browser id may be counted from the caller's IP: it is
-- already known for this IP, or the IP is still under its daily cap of new
-- ids (then it is recorded). Always true outside the API.
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
revoke all on function public.quran_client_ip_hash() from public, anon, authenticated;

-- Skip new view / live / like rows from ids over the cap.
create or replace function public.quran_guard_viewer_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.quran_viewer_allowed(new.viewer_id) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists quran_listens_ip_guard on public.quran_listens;
create trigger quran_listens_ip_guard before insert on public.quran_listens
  for each row execute function public.quran_guard_viewer_insert();
drop trigger if exists quran_presence_ip_guard on public.quran_presence;
create trigger quran_presence_ip_guard before insert on public.quran_presence
  for each row execute function public.quran_guard_viewer_insert();
drop trigger if exists quran_likes_ip_guard on public.quran_likes;
create trigger quran_likes_ip_guard before insert on public.quran_likes
  for each row execute function public.quran_guard_viewer_insert();
drop trigger if exists quran_comment_likes_ip_guard on public.quran_comment_likes;
create trigger quran_comment_likes_ip_guard before insert on public.quran_comment_likes
  for each row execute function public.quran_guard_viewer_insert();

-- Comments: same as 20260926150000 plus the per-IP checks.
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

  insert into public.quran_comments (kind, ref_id, viewer_id, name, body, parent_id)
  values (p_kind, p_ref, p_viewer, v_name, v_body, v_parent)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'comment', public.quran_comment_json(v_row, p_viewer));
end;
$$;
grant execute on function public.add_quran_comment(text, text, int, text, text, uuid) to anon, authenticated;

-- Check after running: which header the IP came from and a short hash of the
-- caller's own IP (never the IP). Drop once checked:
--   drop function if exists public.quran_ip_probe();
create or replace function public.quran_ip_probe()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  h json;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  return jsonb_build_object(
    'has_cf_connecting_ip', h is not null and h->>'cf-connecting-ip' is not null,
    'xff_parts', case when h->>'x-forwarded-for' is null then 0
                      else array_length(string_to_array(h->>'x-forwarded-for', ','), 1) end,
    'has_x_real_ip', h is not null and h->>'x-real-ip' is not null,
    'ip_hash', left(public.quran_client_ip_hash(), 8)
  );
end;
$$;
grant execute on function public.quran_ip_probe() to anon;
