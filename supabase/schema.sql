-- ============================================================================
--  HuDa Web Quran : Supabase base schema
--  Run in the Supabase SQL editor (or via the CLI) BEFORE the files in
--  supabase/migrations/. It only provisions the admin membership used by the
--  Quran comment moderation (public.is_admin()).
--
--  The old Bayan tables (categories, speakers, bayan, bayan_plays) and storage
--  buckets were removed from the app on 2026-10-06. This file no longer creates
--  them; it does NOT drop them from an existing database.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── admins ──────────────────────────────────────────────────────────────────
-- Membership table gating admin access. Add a row (user_id from auth.users)
-- to grant admin rights.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

alter table public.admins enable row level security;

-- admins: only admins can see the list.
drop policy if exists admins_read on public.admins;
create policy admins_read on public.admins
  for select using (public.is_admin());
