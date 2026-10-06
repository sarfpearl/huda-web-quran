-- ============================================================================
--  HuDa Web Quran : admin login for comment moderation (/admin/comments)
--  Run AFTER 20260925090000_quran_comment_moderation.sql. Idempotent.
--
--  Replaces the moderator key with Supabase Auth: moderation now needs a
--  signed-in user listed in public.admins (public.is_admin(), schema.sql).
--  The admin page signs in with an email magic link.
--
--  One-time setup in the Supabase dashboard:
--   1. Authentication → Sign In / Providers → Email: enabled. Turn OFF
--      "Allow new users to sign up" (the page never creates users).
--   2. Authentication → URL Configuration: Site URL
--      https://huda-web-quran.vercel.app ; Redirect URLs add
--      https://huda-web-quran.vercel.app/admin/comments and
--      http://localhost:3000/admin/comments
--   3. Authentication → Users → Add user → your email.
--   4. SQL editor:
--        insert into public.admins (user_id)
--        select id from auth.users where email = 'you@example.com'
--        on conflict do nothing;
--
--  Remove access:  delete from public.admins where user_id =
--                    (select id from auth.users where email = 'you@example.com');
-- ============================================================================

-- The key-based versions and the key store go away.
drop function if exists public.admin_list_quran_comments(text, text, int);
drop function if exists public.moderate_quran_comment(text, uuid, text);
drop function if exists public.quran_moderator_ok(text);
drop table if exists public.quran_moderators;

-- Latest comments for moderation (hidden ones included). Never returns the
-- commenter's browser id. p_filter: 'all' | 'visible' | 'hidden'.
create or replace function public.admin_list_quran_comments(p_filter text default 'all', p_limit int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return jsonb_build_object('ok', true, 'comments', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'kind', c.kind, 'ref', c.ref_id, 'name', c.name, 'body', c.body,
             'created_at', c.created_at, 'hidden', c.is_hidden) order by c.created_at desc)
      from (select * from public.quran_comments
             where coalesce(p_filter, 'all') = 'all'
                or (p_filter = 'hidden' and is_hidden)
                or (p_filter = 'visible' and not is_hidden)
             order by created_at desc
             limit least(greatest(coalesce(p_limit, 100), 1), 500)) c
  ), '[]'::jsonb));
end;
$$;

-- p_action: 'hide' | 'unhide' | 'delete'.
create or replace function public.moderate_quran_comment(p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_action = 'hide' then
    update public.quran_comments set is_hidden = true where id = p_id;
  elsif p_action = 'unhide' then
    update public.quran_comments set is_hidden = false where id = p_id;
  elsif p_action = 'delete' then
    delete from public.quran_comments where id = p_id;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  return jsonb_build_object('ok', found);
end;
$$;

revoke all on function public.admin_list_quran_comments(text, int) from public, anon;
revoke all on function public.moderate_quran_comment(uuid, text) from public, anon;
grant execute on function public.admin_list_quran_comments(text, int) to authenticated;
grant execute on function public.moderate_quran_comment(uuid, text) to authenticated;
grant execute on function public.is_admin() to authenticated;
