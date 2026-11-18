-- ============================================================================
--  HuDa Web Quran : Quran-reading reminders (Web Push)
--  Run AFTER 20261031120000_dashboard_snapshots.sql. Idempotent.
--
--  A browser that turns on a reminder (Settings › Reminders) saves its Web
--  Push subscription and its reminder times here. Every minute Supabase cron
--  calls https://www.hudaguidance.com/api/reminders/send, which claims the
--  reminders that are due in each browser's own time zone and sends them.
--
--   push_subscriptions   one row per browser (its push endpoint + keys, time
--                        zone, app language). user_id stays null until the
--                        optional login links a browser to an account.
--   reading_reminders    the times ("06:30") of each browser, on / off, and
--                        when each was last sent (once per day).
--   reminder_secret      one row: SHA-256 of the sender's secret.
--
--   save_reading_reminders()        anon: the browser saves its whole list
--                                   (an empty list removes the browser).
--   claim_due_reading_reminders()   sender only (secret): due reminders.
--   drop_push_subscriptions()       sender only (secret): expired endpoints.
--
--  Tables are closed to the API roles; only these functions touch them. Only
--  a salted hash of the IP is kept (per-IP cap on new browsers per day).
--
--  One-time setup (no secrets in this file):
--   1. Two random values on your Mac, kept in a password manager:
--        openssl rand -hex 32     → REMINDER_SECRET
--        openssl rand -hex 24     → REMINDER_CRON_TOKEN
--   2. The hash of REMINDER_SECRET (do not paste the secret into SQL):
--        printf %s 'THE-SECRET' | shasum -a 256 | cut -d' ' -f1
--      SQL editor:
--        insert into public.reminder_secret (secret_sha256) values ('<64-hex-hash>')
--        on conflict (singleton) do update set secret_sha256 = excluded.secret_sha256;
--   3. Vercel env vars (Production + Preview): see docs/REMINDERS.md.
--   4. Database → Extensions: turn on pg_cron and pg_net, then in SQL editor:
--        select cron.schedule('huda-reading-reminders', '* * * * *', $cron$
--          select net.http_get(
--            url := 'https://www.hudaguidance.com/api/reminders/send',
--            headers := jsonb_build_object('Authorization', 'Bearer <REMINDER_CRON_TOKEN>'),
--            timeout_milliseconds := 20000);
--        $cron$);
--      Stop: select cron.unschedule('huda-reading-reminders');
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Tables ─────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1024),
  p256dh text not null check (length(p256dh) between 20 and 200),
  auth text not null check (length(auth) between 8 and 100),
  time_zone text not null check (length(time_zone) <= 64),
  lang text not null default 'en' check (lang in ('en', 'ta', 'ur', 'ml', 'hi', 'id', 'bn', 'tr', 'fr', 'ms')),
  -- Set by the optional login later (one account, many browsers).
  user_id uuid references auth.users (id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subscriptions_ip_idx on public.push_subscriptions (ip_hash, created_at desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id) where user_id is not null;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from public, anon, authenticated;

create table if not exists public.reading_reminders (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.push_subscriptions (id) on delete cascade,
  local_time time not null,
  enabled boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subscription_id, local_time)
);
create index if not exists reading_reminders_enabled_idx on public.reading_reminders (local_time) where enabled;
alter table public.reading_reminders enable row level security;
revoke all on public.reading_reminders from public, anon, authenticated;

create table if not exists public.reminder_secret (
  singleton boolean primary key default true check (singleton),
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
alter table public.reminder_secret enable row level security;
revoke all on public.reminder_secret from public, anon, authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────────
-- A reminder is due from its time until this many minutes after it (cron
-- runs every minute; the slack covers a late or skipped run).
create or replace function public.reading_reminder_window_minutes()
returns int language sql immutable set search_path = '' as $$ select 15 $$;

-- Minutes since `p_time` today in `p_zone` (0–1439, wraps at midnight).
create or replace function public.reading_reminder_minutes_since(p_time time, p_zone text, p_now timestamptz)
returns int
language sql
stable
set search_path = ''
as $$
  select (floor(extract(epoch from ((p_now at time zone p_zone)::time - p_time)) / 60)::int + 1440) % 1440;
$$;

-- Same constant-time check as dashboard_secret_ok.
create or replace function public.reminder_secret_ok(p_secret text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_stored text;
  v_a bytea;
  v_b bytea;
  v_diff int := 0;
begin
  select s.secret_sha256 into v_stored from public.reminder_secret s;
  v_a := decode(coalesce(v_stored, repeat('0', 64)), 'hex');
  v_b := sha256(convert_to(coalesce(p_secret, ''), 'UTF8'));
  for i in 0..31 loop
    v_diff := v_diff | (get_byte(v_a, i) # get_byte(v_b, i));
  end loop;
  return v_stored is not null and p_secret is not null and v_diff = 0;
end;
$$;
revoke all on function public.reminder_secret_ok(text) from public, anon, authenticated;

-- ── save_reading_reminders: the browser's whole list ───────────────────────
-- p_times: [{"time": "06:30", "on": true}, …] (at most 10). Times kept from
-- before keep their last_sent_at; a new time that is already inside today's
-- window counts as sent, so turning one on never fires it at once.
create or replace function public.save_reading_reminders(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_time_zone text,
  p_lang text,
  p_times jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub uuid;
  v_ip text := public.quran_client_ip_hash();
  v_item jsonb;
  v_time time;
  v_times time[] := '{}';
begin
  if p_endpoint is null or p_endpoint !~ '^https://' or length(p_endpoint) > 1024 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- No times: forget this browser.
  if p_times is null or jsonb_typeof(p_times) <> 'array' or jsonb_array_length(p_times) = 0 then
    delete from public.push_subscriptions where endpoint = p_endpoint;
    return jsonb_build_object('ok', true, 'removed', true);
  end if;

  if jsonb_array_length(p_times) > 10
     or p_p256dh is null or length(p_p256dh) not between 20 and 200
     or p_auth is null or length(p_auth) not between 8 and 100
     or p_lang is null or p_lang not in ('en', 'ta', 'ur', 'ml', 'hi', 'id', 'bn', 'tr', 'fr', 'ms')
     or p_time_zone is null or length(p_time_zone) > 64
     or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_time_zone) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  for v_item in select * from jsonb_array_elements(p_times) loop
    if jsonb_typeof(v_item) <> 'object' or coalesce(v_item->>'time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end loop;

  select id into v_sub from public.push_subscriptions where endpoint = p_endpoint;
  if v_sub is null then
    -- A new browser: at most 20 per IP per day (none outside the API).
    if v_ip is not null and (select count(*) from public.push_subscriptions
                              where ip_hash = v_ip and created_at > now() - interval '1 day') >= 20 then
      return jsonb_build_object('ok', false, 'error', 'rate_limited');
    end if;
    insert into public.push_subscriptions (endpoint, p256dh, auth, time_zone, lang, ip_hash)
    values (p_endpoint, p_p256dh, p_auth, p_time_zone, p_lang, v_ip)
    on conflict (endpoint) do update set p256dh = excluded.p256dh
    returning id into v_sub;
  end if;
  update public.push_subscriptions
     set p256dh = p_p256dh, auth = p_auth, time_zone = p_time_zone, lang = p_lang, updated_at = now()
   where id = v_sub;

  for v_item in select * from jsonb_array_elements(p_times) loop
    v_time := (v_item->>'time')::time;
    if v_time = any (v_times) then continue; end if;
    v_times := v_times || v_time;
    insert into public.reading_reminders (subscription_id, local_time, enabled, last_sent_at)
    values (
      v_sub, v_time, coalesce((v_item->>'on')::boolean, true),
      case when public.reading_reminder_minutes_since(v_time, p_time_zone, now())
                < public.reading_reminder_window_minutes() then now() end
    )
    on conflict (subscription_id, local_time) do update set enabled = excluded.enabled;
  end loop;

  delete from public.reading_reminders where subscription_id = v_sub and not (local_time = any (v_times));
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.save_reading_reminders(text, text, text, text, text, jsonb) from public;
grant execute on function public.save_reading_reminders(text, text, text, text, text, jsonb) to anon, authenticated;

-- ── claim_due_reading_reminders: what to send now ──────────────────────────
-- Marks each due reminder as sent (so a second run never sends it twice) and
-- returns one item per browser, even if two of its times fell due together.
create or replace function public.claim_due_reading_reminders(p_secret text, p_limit int default 1000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_items jsonb;
begin
  if not public.reminder_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  with due as (
    select r.id
      from public.reading_reminders r
      join public.push_subscriptions s on s.id = r.subscription_id
     where r.enabled
       and (r.last_sent_at is null or r.last_sent_at < now() - interval '1 hour')
       and public.reading_reminder_minutes_since(r.local_time, s.time_zone, now())
           < public.reading_reminder_window_minutes()
     order by r.local_time
     limit greatest(1, least(coalesce(p_limit, 1000), 5000))
     for update of r skip locked
  ), sent as (
    update public.reading_reminders r set last_sent_at = now()
      from due where r.id = due.id
    returning r.subscription_id, r.local_time
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth,
           'lang', s.lang, 'time', to_char(x.local_time, 'HH24:MI'))), '[]'::jsonb)
    into v_items
    from (select subscription_id, min(local_time) as local_time from sent group by subscription_id) x
    join public.push_subscriptions s on s.id = x.subscription_id;

  return jsonb_build_object('ok', true, 'items', v_items);
end;
$$;
revoke all on function public.claim_due_reading_reminders(text, int) from public;
grant execute on function public.claim_due_reading_reminders(text, int) to anon;

-- ── drop_push_subscriptions: endpoints the push service says are gone ──────
create or replace function public.drop_push_subscriptions(p_secret text, p_endpoints text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not public.reminder_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  delete from public.push_subscriptions where endpoint = any (coalesce(p_endpoints, '{}'));
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'dropped', v_n);
end;
$$;
revoke all on function public.drop_push_subscriptions(text, text[]) from public;
grant execute on function public.drop_push_subscriptions(text, text[]) to anon;
