-- ============================================================================
--  HuDa Web Quran : morning dashboard snapshots
--  Run AFTER 20261012140000_quran_ip_trusted.sql. Idempotent.
--
--  The daily GitHub Action (scripts/collect-dashboard.mjs) saves one JSON
--  snapshot here; /admin/dashboard (signed-in admins) reads them.
--
--   dashboard_snapshots  one row per day, newest 90 kept. Only admins can
--                        select (public.is_admin(), as /admin/comments does);
--                        nobody can insert / update / delete directly.
--   dashboard_secret     one row: the SHA-256 hash of a shared secret. Closed
--                        to the API roles completely.
--   dashboard_save()     the Action's only way to write a snapshot.
--   dashboard_stats()    the Action's only way to read the Supabase numbers
--                        (counts only, never rows or browser ids).
--
--  Both RPCs need the secret and answer a wrong one with the same
--  {"ok": false, "error": "forbidden"}. They are callable with the anon key.
--
--  One-time setup (the secret and its hash are NOT in this file):
--   1. Make a long random secret and keep it in a password manager:
--        openssl rand -hex 32
--   2. Hash it on your Mac (do not paste the secret into the SQL editor):
--        printf %s 'THE-SECRET' | shasum -a 256 | cut -d' ' -f1
--   3. SQL editor, with that 64-character hash:
--        insert into public.dashboard_secret (secret_sha256)
--        values ('<64-hex-hash>')
--        on conflict (singleton) do update set secret_sha256 = excluded.secret_sha256;
--   4. GitHub → Settings → Secrets → Actions: DASH_SECRET = the secret itself.
--
--  Rotate: repeat steps 1-4.  Switch off: delete from public.dashboard_secret;
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Secret (hash only) ─────────────────────────────────────────────────────
create table if not exists public.dashboard_secret (
  singleton boolean primary key default true check (singleton),
  secret_sha256 text not null check (secret_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
alter table public.dashboard_secret enable row level security;
revoke all on public.dashboard_secret from public, anon, authenticated;

-- ── Snapshots ──────────────────────────────────────────────────────────────
create table if not exists public.dashboard_snapshots (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null,
  constraint dashboard_snapshots_size check (octet_length(payload::text) <= 204800)
);
create index if not exists dashboard_snapshots_created_idx
  on public.dashboard_snapshots (created_at desc);

alter table public.dashboard_snapshots enable row level security;
revoke all on public.dashboard_snapshots from public, anon, authenticated;
grant select on public.dashboard_snapshots to authenticated;

drop policy if exists dashboard_snapshots_admin_read on public.dashboard_snapshots;
create policy dashboard_snapshots_admin_read on public.dashboard_snapshots
  for select to authenticated using (public.is_admin());

-- ── Secret check (helper, not callable through the API) ────────────────────
-- Compares the SHA-256 of p_secret with the stored hash byte by byte without
-- stopping at the first difference, and does the same work when no secret is
-- stored or p_secret is null.
create or replace function public.dashboard_secret_ok(p_secret text)
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
  select s.secret_sha256 into v_stored from public.dashboard_secret s;
  v_a := decode(coalesce(v_stored, repeat('0', 64)), 'hex');
  v_b := extensions.digest(convert_to(coalesce(p_secret, ''), 'UTF8'), 'sha256');
  for i in 0..31 loop
    v_diff := v_diff | (get_byte(v_a, i) # get_byte(v_b, i));
  end loop;
  return v_stored is not null and p_secret is not null and v_diff = 0;
end;
$$;
revoke all on function public.dashboard_secret_ok(text) from public, anon, authenticated;

-- ── dashboard_save: add a snapshot, keep the newest 90 ─────────────────────
create or replace function public.dashboard_save(p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not public.dashboard_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object'
     or octet_length(p_payload::text) > 204800 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.dashboard_snapshots (payload) values (p_payload) returning id into v_id;

  delete from public.dashboard_snapshots
   where id not in (select s.id from public.dashboard_snapshots s
                     order by s.created_at desc, s.id desc limit 90);

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

-- ── dashboard_stats: counts only ───────────────────────────────────────────
-- moderation_pending: there is no "waiting for review" column. Comments held
-- by the spam guard and comments hidden by an admin are both is_hidden, so
-- they cannot be told apart; comments_hidden_total is the closest honest count.
create or replace function public.dashboard_stats(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.dashboard_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'unique_viewers', (select count(distinct l.viewer_id) from public.quran_listens l),
    'unique_viewers_24h', (select count(distinct l.viewer_id) from public.quran_listens l
                            where l.updated_at > now() - interval '24 hours'),
    'live_listeners', (select count(*) from public.quran_presence p
                        where p.last_seen > now() - interval '60 seconds'),
    'top_surah', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.ref_id, 'listeners', t.users, 'seconds', t.secs)
                       order by t.users desc, t.secs desc, t.ref_id)
        from (select l.ref_id, count(*) as users, sum(l.seconds) as secs
                from public.quran_listens l where l.kind = 'surah'
               group by l.ref_id order by count(*) desc, sum(l.seconds) desc, l.ref_id limit 5) t
    ), '[]'::jsonb),
    'top_juz', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.ref_id, 'listeners', t.users, 'seconds', t.secs)
                       order by t.users desc, t.secs desc, t.ref_id)
        from (select l.ref_id, count(*) as users, sum(l.seconds) as secs
                from public.quran_listens l where l.kind = 'juz'
               group by l.ref_id order by count(*) desc, sum(l.seconds) desc, l.ref_id limit 5) t
    ), '[]'::jsonb),
    'likes_24h', jsonb_build_object(
      'content', (select count(*) from public.quran_likes k
                   where k.created_at > now() - interval '24 hours'),
      'comments', (select count(*) from public.quran_comment_likes k
                    where k.created_at > now() - interval '24 hours')),
    'comments_24h', (select count(*) from public.quran_comments c
                      where c.created_at > now() - interval '24 hours'),
    'comments_hidden_total', (select count(*) from public.quran_comments c where c.is_hidden),
    'moderation_pending', 'unavailable'
  );
end;
$$;

-- Only the anon key may call the two RPCs (the Action uses it); the secret
-- does the real gating.
revoke all on function public.dashboard_save(text, jsonb) from public, authenticated;
revoke all on function public.dashboard_stats(text) from public, authenticated;
grant execute on function public.dashboard_save(text, jsonb) to anon;
grant execute on function public.dashboard_stats(text) to anon;
