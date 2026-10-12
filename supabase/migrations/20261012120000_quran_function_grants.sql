-- ============================================================================
--  HuDa Web Quran : close the internal helper functions to the API
--  Run AFTER 20261011120000_quran_comment_spam_guard.sql. Idempotent.
--
--  These helpers are only ever called from inside the security-definer RPCs
--  (owner postgres), never by the app, but new functions are executable by
--  PUBLIC by default and Supabase also grants anon / authenticated, so they
--  were callable through /rest/v1/rpc. quran_client_ip() in particular tells
--  a caller which IP the rate limits would use for its request headers.
--  Revoking from the API roles changes nothing for the app: the owner keeps
--  execute, and the IP guard triggers fire regardless of these grants.
--
--  quran_ip_probe() (20261006150000, "drop once checked") is already gone in
--  production; dropped here too so a fresh database matches it.
-- ============================================================================

revoke execute on function public.quran_client_ip() from public, anon, authenticated;
revoke execute on function public.quran_ip_limit(text) from public, anon, authenticated;
revoke execute on function public.quran_has_link(text) from public, anon, authenticated;
revoke execute on function public.quran_comment_norm(text) from public, anon, authenticated;
revoke execute on function public.quran_guard_viewer_insert() from public, anon, authenticated;

drop function if exists public.quran_ip_probe();
