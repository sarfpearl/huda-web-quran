-- ============================================================================
--  HuDa Web Quran : Ko-fi gifts (real payments, from Ko-fi's webhook)
--  Run AFTER 20261120120000_support_taps.sql. Idempotent.
--
--  Ko-fi → POST https://www.hudaguidance.com/api/kofi (src/app/api/kofi/route.ts)
--  → the route checks Ko-fi's verification token (Vercel env
--  KOFI_VERIFICATION_TOKEN) → kofi_gift_add() here, which checks the same
--  token again against its SHA-256 hash → one row in kofi_gifts.
--  /admin/dashboard (signed-in admins) reads the newest rows.
--
--  Kept: the name the giver typed, amount, currency, their message, whether
--  the message is public, gift type, Ko-fi's ids and time. NOT kept: the
--  giver's email, address, or anything else Ko-fi sends.
--
--   kofi_gifts      RLS on. Only admins can select (public.is_admin(), like
--                   dashboard_snapshots); nobody can write directly.
--   kofi_secret     one row: SHA-256 hash of the Ko-fi verification token.
--                   Closed to the API roles completely.
--   kofi_gift_add() the webhook's only way in (anon key + the token).
--                   Ko-fi retries the same payment → same row (no duplicate).
--
--  One-time setup (the token and its hash are NOT in this file):
--   1. Ko-fi → Settings → More → API → Webhooks: copy the Verification Token.
--   2. Hash it on your Mac (do not paste the token into the SQL editor):
--        printf %s 'THE-TOKEN' | shasum -a 256 | cut -d' ' -f1
--   3. SQL editor, with that 64-character hash:
--        insert into public.kofi_secret (token_sha256)
--        values ('<64-hex-hash>')
--        on conflict (singleton) do update set token_sha256 = excluded.token_sha256;
--   4. Vercel → Settings → Environment Variables (Production + Preview):
--        KOFI_VERIFICATION_TOKEN = the token itself. Redeploy.
--   5. Ko-fi webhook URL: https://www.hudaguidance.com/api/kofi → Update.
--
--  Remove Ko-fi's test gifts later:
--        delete from public.kofi_gifts where kofi_transaction_id = '<id>';
--  Switch off: delete from public.kofi_secret;
-- ============================================================================

-- ── Token (hash only) ──────────────────────────────────────────────────────
create table if not exists public.kofi_secret (
  singleton boolean primary key default true check (singleton),
  token_sha256 text not null check (token_sha256 ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
alter table public.kofi_secret enable row level security;
revoke all on public.kofi_secret from public, anon, authenticated;

-- ── Gifts ──────────────────────────────────────────────────────────────────
create table if not exists public.kofi_gifts (
  id bigint generated always as identity primary key,
  received_at timestamptz not null default now(),
  gift_at timestamptz not null,
  kofi_transaction_id text not null unique check (char_length(kofi_transaction_id) between 1 and 100),
  message_id text check (char_length(message_id) <= 100),
  kind text not null check (char_length(kind) between 1 and 40),
  from_name text check (char_length(from_name) <= 200),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  message text check (char_length(message) <= 2000),
  is_public boolean not null default true,
  is_subscription boolean not null default false,
  is_first_subscription boolean not null default false,
  tier_name text check (char_length(tier_name) <= 200)
);
create index if not exists kofi_gifts_gift_at_idx on public.kofi_gifts (gift_at desc);

alter table public.kofi_gifts enable row level security;
revoke all on public.kofi_gifts from public, anon, authenticated;
grant select on public.kofi_gifts to authenticated;

drop policy if exists kofi_gifts_admin_read on public.kofi_gifts;
create policy kofi_gifts_admin_read on public.kofi_gifts
  for select to authenticated using (public.is_admin());

-- ── Token check (helper, not callable through the API) ─────────────────────
-- Same constant-time comparison as dashboard_secret_ok().
create or replace function public.kofi_token_ok(p_token text)
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
  select s.token_sha256 into v_stored from public.kofi_secret s;
  v_a := decode(coalesce(v_stored, repeat('0', 64)), 'hex');
  v_b := sha256(convert_to(coalesce(p_token, ''), 'UTF8'));
  for i in 0..31 loop
    v_diff := v_diff | (get_byte(v_a, i) # get_byte(v_b, i));
  end loop;
  return v_stored is not null and p_token is not null and v_diff = 0;
end;
$$;
revoke all on function public.kofi_token_ok(text) from public, anon, authenticated;

-- ── kofi_gift_add: one gift from the webhook ───────────────────────────────
-- p_gift keys (the route builds them from Ko-fi's JSON): kofi_transaction_id,
-- message_id, kind, from_name, amount, currency, message, is_public,
-- is_subscription, is_first_subscription, tier_name, gift_at.
create or replace function public.kofi_gift_add(p_token text, p_gift jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_tx text;
  v_amount numeric;
  v_currency text;
  v_at timestamptz;
begin
  if not public.kofi_token_ok(p_token) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_gift is null or jsonb_typeof(p_gift) <> 'object' or octet_length(p_gift::text) > 16384 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_tx := nullif(btrim(p_gift->>'kofi_transaction_id'), '');
  v_currency := upper(coalesce(nullif(btrim(p_gift->>'currency'), ''), 'USD'));
  begin
    v_amount := round((p_gift->>'amount')::numeric, 2);
    v_at := coalesce((p_gift->>'gift_at')::timestamptz, now());
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end;
  if v_tx is null or char_length(v_tx) > 100 or v_amount is null or v_amount < 0
     or v_currency !~ '^[A-Z]{3}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  insert into public.kofi_gifts (
    gift_at, kofi_transaction_id, message_id, kind, from_name, amount, currency,
    message, is_public, is_subscription, is_first_subscription, tier_name)
  values (
    v_at, v_tx,
    left(nullif(btrim(p_gift->>'message_id'), ''), 100),
    left(coalesce(nullif(btrim(p_gift->>'kind'), ''), 'Donation'), 40),
    left(nullif(btrim(p_gift->>'from_name'), ''), 200),
    v_amount, v_currency,
    left(nullif(btrim(p_gift->>'message'), ''), 2000),
    coalesce((p_gift->>'is_public')::boolean, true),
    coalesce((p_gift->>'is_subscription')::boolean, false),
    coalesce((p_gift->>'is_first_subscription')::boolean, false),
    left(nullif(btrim(p_gift->>'tier_name'), ''), 200))
  on conflict (kofi_transaction_id) do nothing;

  -- Keep the table small: newest 2000 gifts.
  delete from public.kofi_gifts
   where id not in (select g.id from public.kofi_gifts g order by g.gift_at desc, g.id desc limit 2000);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.kofi_gift_add(text, jsonb) from public, authenticated;
grant execute on function public.kofi_gift_add(text, jsonb) to anon;
