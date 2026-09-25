-- ============================================================================
--  HuDa Web Quran : comment moderation (/admin/comments)
--  Run AFTER 20260924130000_quran_views_comments.sql. Idempotent.
--
--  There is no admin login yet, so moderation is gated by a moderator key:
--  only a bcrypt hash of it is stored; every call re-checks the key on the
--  server. Add a key (choose a long passphrase) in the SQL editor:
--
--    insert into public.quran_moderators (label, key_hash)
--    values ('owner', extensions.crypt('YOUR-LONG-SECRET-PASSPHRASE', extensions.gen_salt('bf')));
--
--  Remove access:  delete from public.quran_moderators where label = 'owner';
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.quran_moderators (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'moderator',
  key_hash text not null,
  created_at timestamptz not null default now()
);
alter table public.quran_moderators enable row level security;
revoke all on public.quran_moderators from anon, authenticated;

-- True when p_key matches a stored moderator key.
create or replace function public.quran_moderator_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select coalesce(char_length(p_key) >= 12, false)
     and exists (select 1 from public.quran_moderators m where m.key_hash = crypt(p_key, m.key_hash));
$$;
revoke all on function public.quran_moderator_ok(text) from public, anon, authenticated;

-- Latest comments for moderation (hidden ones included). Never returns the
-- commenter's browser id. p_filter: 'all' | 'visible' | 'hidden'.
create or replace function public.admin_list_quran_comments(p_key text, p_filter text default 'all', p_limit int default 100)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if not public.quran_moderator_ok(p_key) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
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
create or replace function public.moderate_quran_comment(p_key text, p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.quran_moderator_ok(p_key) then
    return jsonb_build_object('ok', false, 'error', 'unauthorized');
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

grant execute on function public.admin_list_quran_comments(text, text, int) to anon, authenticated;
grant execute on function public.moderate_quran_comment(text, uuid, text) to anon, authenticated;
