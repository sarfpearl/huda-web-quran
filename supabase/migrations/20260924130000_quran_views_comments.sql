-- ============================================================================
--  HuDa Web Quran : view count, live listeners and comments (Surah & Juz)
--  Run AFTER supabase/schema.sql (uses public.is_admin()). Idempotent.
--
--  Content is addressed as (kind, ref_id): kind 'surah' → 1..114,
--  kind 'juz' → 1..30.
--
--  quran_listens   listening seconds per anonymous browser id per content
--  quran_presence  heartbeats for the live listener count
--  quran_likes     one like per browser per content
--  quran_comments  public comments per content (no login; rate-limited;
--                  a browser can delete only its own comments)
--
--  All tables are closed to direct access; everything goes through the
--  security-definer functions below, which validate and clamp input and only
--  ever return aggregates / public comment fields (never the browser id).
-- ============================================================================

create or replace function public.quran_ref_valid(p_kind text, p_ref int)
returns boolean
language sql
immutable
as $$
  select (p_kind = 'surah' and p_ref between 1 and 114)
      or (p_kind = 'juz' and p_ref between 1 and 30);
$$;

-- ── Listening time ─────────────────────────────────────────────────────────
create table if not exists public.quran_listens (
  -- Random id kept in the listener's browser (src/lib/audio/session.ts).
  viewer_id text not null check (char_length(viewer_id) between 8 and 64),
  kind text not null,
  ref_id smallint not null,
  seconds int not null default 0 check (seconds >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (viewer_id, kind, ref_id),
  constraint quran_listens_ref check (public.quran_ref_valid(kind, ref_id))
);
create index if not exists quran_listens_ref_idx on public.quran_listens (kind, ref_id);

alter table public.quran_listens enable row level security;
revoke all on public.quran_listens from anon, authenticated;

-- Adds real listening time. A browser can never add more than the wall-clock
-- time since its previous report for that content (+5s slack, max 120s/call),
-- so the counter can't be inflated by replaying requests.
create or replace function public.add_quran_listen(p_viewer text, p_kind text, p_ref int, p_seconds int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_add int;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_ref_valid(p_kind, p_ref), false)
     or p_seconds is null or p_seconds <= 0 then
    return;
  end if;

  select updated_at into v_last from public.quran_listens
   where viewer_id = p_viewer and kind = p_kind and ref_id = p_ref
   for update;

  v_add := least(p_seconds, 120);
  if found then
    v_add := least(v_add, ceil(extract(epoch from (now() - v_last)))::int + 5);
    if v_add <= 0 then return; end if;
    update public.quran_listens
       set seconds = seconds + v_add, updated_at = now()
     where viewer_id = p_viewer and kind = p_kind and ref_id = p_ref;
  else
    insert into public.quran_listens (viewer_id, kind, ref_id, seconds)
    values (p_viewer, p_kind, p_ref, v_add);
  end if;
end;
$$;

-- ── Live listeners (heartbeats) ────────────────────────────────────────────
-- A browser counts as "live" while it has sent a heartbeat in the last 60s
-- during real playback. Rows older than 10 minutes are purged.
create table if not exists public.quran_presence (
  viewer_id text primary key check (char_length(viewer_id) between 8 and 64),
  kind text not null,
  ref_id smallint not null,
  last_seen timestamptz not null default now(),
  constraint quran_presence_ref check (public.quran_ref_valid(kind, ref_id))
);
create index if not exists quran_presence_seen_idx on public.quran_presence (last_seen desc);
alter table public.quran_presence enable row level security;
revoke all on public.quran_presence from anon, authenticated;

create or replace function public.quran_heartbeat(p_viewer text, p_kind text, p_ref int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_ref_valid(p_kind, p_ref), false) then
    return;
  end if;
  insert into public.quran_presence (viewer_id, kind, ref_id) values (p_viewer, p_kind, p_ref)
  on conflict (viewer_id) do update
    set kind = excluded.kind, ref_id = excluded.ref_id, last_seen = now();
  delete from public.quran_presence where last_seen < now() - interval '10 minutes';
end;
$$;

create or replace function public.quran_leave(p_viewer text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.quran_presence where viewer_id = p_viewer;
$$;

-- View count for one Surah / Juz, site-wide totals, and the Surah most people
-- listened to. Aggregates only.
create or replace function public.get_quran_view_stats(p_kind text, p_ref int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with top as (
    select ref_id, count(*) as users
      from public.quran_listens
     where kind = 'surah'
     group by ref_id
     order by count(*) desc, sum(seconds) desc, ref_id
     limit 1
  )
  select jsonb_build_object(
    'content', jsonb_build_object(
      'kind', p_kind,
      'id', p_ref,
      'seconds', coalesce((select sum(seconds) from public.quran_listens
                            where kind = p_kind and ref_id = p_ref), 0),
      'users', (select count(*) from public.quran_listens where kind = p_kind and ref_id = p_ref),
      'live', (select count(*) from public.quran_presence
                where kind = p_kind and ref_id = p_ref and last_seen > now() - interval '60 seconds')
    ),
    'site', jsonb_build_object(
      'seconds', coalesce((select sum(seconds) from public.quran_listens), 0),
      'users', (select count(distinct viewer_id) from public.quran_listens),
      'top_surah', (select ref_id from top),
      'top_surah_users', (select users from top),
      'live', (select count(*) from public.quran_presence where last_seen > now() - interval '60 seconds')
    )
  );
$$;

-- Listener counts for every Surah (or every Juz) at once, for the content
-- browser list: {"1": 2031, "36": 900, ...}. Aggregates only.
create or replace function public.get_quran_view_counts(p_kind text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(ref_id::text, users), '{}'::jsonb)
    from (
      select ref_id, count(*) as users
        from public.quran_listens
       where kind = p_kind
       group by ref_id
    ) t;
$$;

-- ── Likes ─────────────────────────────────────────────────────────────────
-- One like per browser per Surah / Juz; pressing again removes it.
create table if not exists public.quran_likes (
  viewer_id text not null check (char_length(viewer_id) between 8 and 64),
  kind text not null,
  ref_id smallint not null,
  created_at timestamptz not null default now(),
  primary key (viewer_id, kind, ref_id),
  constraint quran_likes_ref check (public.quran_ref_valid(kind, ref_id))
);
create index if not exists quran_likes_ref_idx on public.quran_likes (kind, ref_id);
alter table public.quran_likes enable row level security;
revoke all on public.quran_likes from anon, authenticated;

-- Like count for a Surah / Juz and whether this browser liked it.
create or replace function public.get_quran_likes(p_viewer text, p_kind text, p_ref int)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', (select count(*) from public.quran_likes where kind = p_kind and ref_id = p_ref),
    'liked', exists (select 1 from public.quran_likes
                      where viewer_id = p_viewer and kind = p_kind and ref_id = p_ref)
  );
$$;

-- This browser's liked Surahs / Juz (the Favourite tab), newest first.
create or replace function public.get_my_quran_likes(p_viewer text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'id', ref_id) order by created_at desc), '[]'::jsonb)
    from public.quran_likes
   where viewer_id = p_viewer;
$$;

-- Likes or un-likes; returns the new state and count.
create or replace function public.toggle_quran_like(p_viewer text, p_kind text, p_ref int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_ref_valid(p_kind, p_ref), false) then
    return jsonb_build_object('ok', false);
  end if;
  delete from public.quran_likes where viewer_id = p_viewer and kind = p_kind and ref_id = p_ref;
  v_liked := not found;
  if v_liked then
    insert into public.quran_likes (viewer_id, kind, ref_id) values (p_viewer, p_kind, p_ref)
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'ok', true,
    'liked', v_liked,
    'count', (select count(*) from public.quran_likes where kind = p_kind and ref_id = p_ref)
  );
end;
$$;

-- ── Comments ───────────────────────────────────────────────────────────────
create table if not exists public.quran_comments (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_id smallint not null,
  viewer_id text not null check (char_length(viewer_id) between 8 and 64),
  name text not null check (char_length(name) between 1 and 40),
  body text not null check (char_length(body) between 1 and 500),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint quran_comments_ref check (public.quran_ref_valid(kind, ref_id))
);
create index if not exists quran_comments_ref_idx
  on public.quran_comments (kind, ref_id, created_at desc) where not is_hidden;
create index if not exists quran_comments_viewer_idx
  on public.quran_comments (viewer_id, created_at desc);

alter table public.quran_comments enable row level security;
revoke all on public.quran_comments from anon, authenticated;

-- Admins (public.admins) can moderate: read everything and hide/delete.
drop policy if exists quran_comments_admin on public.quran_comments;
create policy quran_comments_admin on public.quran_comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update, delete on public.quran_comments to authenticated;

-- Posts a comment. Limits: one per 5 seconds and 100 per day per browser.
create or replace function public.add_quran_comment(p_viewer text, p_kind text, p_ref int, p_name text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
  v_body text := left(btrim(coalesce(p_body, '')), 500);
  v_row public.quran_comments%rowtype;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_ref_valid(p_kind, p_ref), false) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name = '' or v_body = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if exists (select 1 from public.quran_comments
              where viewer_id = p_viewer and created_at > now() - interval '5 seconds')
     or (select count(*) from public.quran_comments
          where viewer_id = p_viewer and created_at > now() - interval '1 day') >= 100 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.quran_comments (kind, ref_id, viewer_id, name, body)
  values (p_kind, p_ref, p_viewer, v_name, v_body)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'comment', jsonb_build_object(
    'id', v_row.id, 'name', v_row.name, 'body', v_row.body, 'created_at', v_row.created_at, 'mine', true));
end;
$$;

-- Newest comments for a Surah / Juz. `mine` tells the caller which ones it
-- wrote (so only those show a delete button); the browser id is never sent.
create or replace function public.get_quran_comments(p_kind text, p_ref int, p_limit int default 30, p_viewer text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total', (select count(*) from public.quran_comments
               where kind = p_kind and ref_id = p_ref and not is_hidden),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'body', c.body,
                                          'created_at', c.created_at,
                                          'mine', p_viewer is not null and c.viewer_id = p_viewer)
                       order by c.created_at desc)
        from (select * from public.quran_comments
               where kind = p_kind and ref_id = p_ref and not is_hidden
               order by created_at desc
               limit least(greatest(coalesce(p_limit, 30), 1), 100)) c
    ), '[]'::jsonb)
  );
$$;

-- Deletes a comment only if this browser wrote it. Returns true when deleted.
create or replace function public.delete_quran_comment(p_viewer text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.quran_comments where id = p_id and viewer_id = p_viewer;
  return found;
end;
$$;

grant execute on function public.quran_ref_valid(text, int) to anon, authenticated;
grant execute on function public.add_quran_listen(text, text, int, int) to anon, authenticated;
grant execute on function public.quran_heartbeat(text, text, int) to anon, authenticated;
grant execute on function public.quran_leave(text) to anon, authenticated;
grant execute on function public.get_quran_view_stats(text, int) to anon, authenticated;
grant execute on function public.get_quran_view_counts(text) to anon, authenticated;
grant execute on function public.get_quran_likes(text, text, int) to anon, authenticated;
grant execute on function public.toggle_quran_like(text, text, int) to anon, authenticated;
grant execute on function public.get_my_quran_likes(text) to anon, authenticated;
grant execute on function public.add_quran_comment(text, text, int, text, text) to anon, authenticated;
grant execute on function public.get_quran_comments(text, int, int, text) to anon, authenticated;
grant execute on function public.delete_quran_comment(text, uuid) to anon, authenticated;
