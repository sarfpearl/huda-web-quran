-- ============================================================================
--  HuDa Web Quran : support-sheet tap counts (the gift → "Help keep HuDa free")
--  Run AFTER 20261031120000_dashboard_snapshots.sql (uses dashboard_secret_ok()).
--  Idempotent.
--
--  HuDa never sees a payment: a UPI payment goes from the visitor's UPI app
--  straight to the bank. All it can count is how often people *tried*:
--
--    upi_app   tapped "Pay with a UPI app" (phone)
--    upi_qr    the UPI QR code was shown (computer, or "Show QR code")
--    upi_copy  copied the UPI ID
--    kofi      opened the Ko-fi page
--
--  Only the kind, the time and the app's random browser id (to count people,
--  and to count one browser once per kind per 30 minutes) are kept — no
--  amount, no name, no IP, nothing from the payment.
--
--   support_taps     RLS on, no grants: reached only through the RPCs below.
--   support_tap()    the app's one way in (anon).
--   support_stats()  counts for the morning dashboard; needs the dashboard
--                    secret, like dashboard_stats().
-- ============================================================================

create table if not exists public.support_taps (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('upi_app', 'upi_qr', 'upi_copy', 'kofi')),
  viewer_id text not null check (char_length(viewer_id) between 1 and 80)
);
create index if not exists support_taps_created_idx on public.support_taps (created_at desc);
create index if not exists support_taps_viewer_idx on public.support_taps (viewer_id, kind, created_at desc);

alter table public.support_taps enable row level security;
revoke all on public.support_taps from anon, authenticated;

-- Count one tap. Silently skips repeats (same browser + kind within 30 min),
-- bad input, and anything past 5000 taps a day in total.
create or replace function public.support_tap(p_kind text, p_viewer text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_kind not in ('upi_app', 'upi_qr', 'upi_copy', 'kofi')
     or p_viewer is null or char_length(p_viewer) not between 1 and 80 then
    return;
  end if;
  if exists (select 1 from public.support_taps t
              where t.viewer_id = p_viewer and t.kind = p_kind
                and t.created_at > now() - interval '30 minutes') then
    return;
  end if;
  if (select count(*) from public.support_taps t where t.created_at > now() - interval '24 hours') >= 5000 then
    return;
  end if;
  insert into public.support_taps (kind, viewer_id) values (p_kind, p_viewer);
end;
$$;

-- Counts only: per kind for the last 24 h, 7 days and in total, and how many
-- browsers tapped any UPI way in 7 days.
create or replace function public.support_stats(p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_kinds jsonb;
begin
  if not public.dashboard_secret_ok(p_secret) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select coalesce(jsonb_object_agg(k.kind, jsonb_build_object(
           'h24', (select count(*) from public.support_taps t where t.kind = k.kind and t.created_at > now() - interval '24 hours'),
           'd7', (select count(*) from public.support_taps t where t.kind = k.kind and t.created_at > now() - interval '7 days'),
           'total', (select count(*) from public.support_taps t where t.kind = k.kind))), '{}'::jsonb)
    into v_kinds
    from (values ('upi_app'), ('upi_qr'), ('upi_copy'), ('kofi')) as k(kind);

  return jsonb_build_object(
    'ok', true,
    'kinds', v_kinds,
    'upi_people_7d', (select count(distinct t.viewer_id) from public.support_taps t
                       where t.kind like 'upi_%' and t.created_at > now() - interval '7 days'),
    'upi_people_total', (select count(distinct t.viewer_id) from public.support_taps t where t.kind like 'upi_%')
  );
end;
$$;

revoke all on function public.support_tap(text, text) from public, authenticated;
revoke all on function public.support_stats(text) from public, authenticated;
grant execute on function public.support_tap(text, text) to anon, authenticated;
grant execute on function public.support_stats(text) to anon;
