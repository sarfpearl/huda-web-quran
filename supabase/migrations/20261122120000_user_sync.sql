-- ============================================================================
--  HuDa Web Quran : optional login — reading and settings follow the account
--  Run AFTER 20261121120000_account_delete.sql. Idempotent.
--  docs/LOGIN_STRATEGY.md §4–5 (Phase 2); code: src/lib/auth/sync.ts.
--
--  The browser stays the first copy (localStorage); this row is the account's
--  copy, so a signed-in reader finds the same place, bookmark and settings on
--  every phone and computer.
--
--   user_sync   one row per account:
--     last_read     {surah, ayah, at}          newer `at` wins
--     bookmarks     [{kind, juz?, surah, ayah, at}]
--     bookmarks_at  epoch ms the list last changed (a removal syncs too)
--     settings      {"<localStorage key>": {"v": "<value>", "at": ms}}
--                   per setting, the newer change wins
--
--  RLS: each account reads and writes its own row only (no admin read).
--  Delete account (delete_my_account) removes the auth user; this row goes
--  with it (on delete cascade).
-- ============================================================================

create table if not exists public.user_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_read jsonb,
  bookmarks jsonb not null default '[]'::jsonb,
  bookmarks_at bigint not null default 0,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_sync_last_read_shape check (last_read is null or jsonb_typeof(last_read) = 'object'),
  constraint user_sync_bookmarks_shape check (jsonb_typeof(bookmarks) = 'array'),
  constraint user_sync_settings_shape check (jsonb_typeof(settings) = 'object'),
  constraint user_sync_size check (
    octet_length(coalesce(last_read::text, '') || bookmarks::text || settings::text) <= 16384
  )
);

alter table public.user_sync enable row level security;

revoke all on public.user_sync from public, anon, authenticated;
grant select, insert, update on public.user_sync to authenticated;

drop policy if exists user_sync_own_select on public.user_sync;
create policy user_sync_own_select on public.user_sync
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_sync_own_insert on public.user_sync;
create policy user_sync_own_insert on public.user_sync
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_sync_own_update on public.user_sync;
create policy user_sync_own_update on public.user_sync
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
