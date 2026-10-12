-- ============================================================================
--  HuDa Web Quran : raise the per-IP limits
--  Run AFTER 20261012120000_quran_function_grants.sql. Idempotent.
--
--  30 new browser ids per IP per day was too low for a shared address: on
--  2026-10-12 one office Wi-Fi reached it by midday, and every browser new to
--  that IP after that (a home-screen app, a private window, a colleague) had
--  its live count, likes and comments silently skipped / 'rate_limited'.
--  Browsers already known to the IP were unaffected.
--
--  new_viewers_per_day 30 → 500, comments_per_hour 20 → 60. Spam is still
--  held back by the per-browser limits (5 s, 100 a day), the duplicate check
--  and the link hold (20261011120000).
-- ============================================================================

create or replace function public.quran_ip_limit(p_name text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_name
    when 'new_viewers_per_day' then 500
    when 'comments_per_hour' then 60
  end;
$$;

-- create or replace keeps the existing grants; restated so a fresh database
-- matches 20261012120000 even if this runs on its own.
revoke execute on function public.quran_ip_limit(text) from public, anon, authenticated;
