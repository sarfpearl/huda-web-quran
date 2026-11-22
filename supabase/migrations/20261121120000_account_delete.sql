-- ============================================================================
--  HuDa Web Quran : optional login — "Delete account" (Settings › Account)
--  Run AFTER 20261115120000_reading_reminders.sql. Idempotent.
--  docs/LOGIN_STRATEGY.md §5.5; docs/LOGIN_SETUP.md (owner steps).
--
--  delete_my_account(): the signed-in user deletes their own account. It
--  removes, for auth.uid() only:
--    - push subscriptions linked to the account (their reminders go with
--      them: reading_reminders → on delete cascade). push_subscriptions.user_id
--      is "on delete set null", so without this they would stay behind.
--    - the auth.users row (and with it anything that references it with
--      "on delete cascade" — future sync tables, public.admins).
--  Nothing else: anonymous data (listens, comments, feedback, support taps)
--  was never linked to the account.
--
--  Only `authenticated` may call it; it acts on the caller alone.
-- ============================================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from public.push_subscriptions where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
