-- ============================================================================
--  HuDa Web Quran : likes and replies on comments
--  Run AFTER 20260925120000_quran_general_comments.sql. Idempotent.
--
--  - quran_comments.parent_id   a reply points at a top-level comment (one
--                               level deep: replying to a reply attaches to
--                               its top-level comment). Deleting a comment
--                               removes its replies.
--  - quran_comment_likes        one like per browser per comment.
--  - get_quran_comments         now returns the newest top-level comments
--                               with all their replies, and for each one
--                               parent_id, likes and liked (by this browser).
--  - add_quran_comment          gains p_parent (null = top-level).
--  - toggle_quran_comment_like  like / un-like a comment.
-- ============================================================================

alter table public.quran_comments
  add column if not exists parent_id uuid references public.quran_comments(id) on delete cascade;
create index if not exists quran_comments_parent_idx
  on public.quran_comments (parent_id, created_at) where parent_id is not null;

create table if not exists public.quran_comment_likes (
  viewer_id text not null check (char_length(viewer_id) between 8 and 64),
  comment_id uuid not null references public.quran_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, comment_id)
);
create index if not exists quran_comment_likes_comment_idx on public.quran_comment_likes (comment_id);
alter table public.quran_comment_likes enable row level security;
revoke all on public.quran_comment_likes from anon, authenticated;

-- One JSON object per comment, as the app reads it.
create or replace function public.quran_comment_json(c public.quran_comments, p_viewer text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'body', c.body, 'created_at', c.created_at,
    'parent_id', c.parent_id,
    'mine', p_viewer is not null and c.viewer_id = p_viewer,
    'likes', (select count(*) from public.quran_comment_likes l where l.comment_id = c.id),
    'liked', p_viewer is not null and exists (
      select 1 from public.quran_comment_likes l where l.comment_id = c.id and l.viewer_id = p_viewer));
$$;
revoke all on function public.quran_comment_json(public.quran_comments, text) from public, anon, authenticated;

-- Newest top-level comments (p_limit) plus every visible reply to them.
-- Order is newest first; the app reverses it and nests replies.
create or replace function public.get_quran_comments(p_kind text, p_ref int, p_limit int default 30, p_viewer text default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with top as (
    select * from public.quran_comments
     where kind = p_kind and ref_id = p_ref and not is_hidden and parent_id is null
     order by created_at desc
     limit least(greatest(coalesce(p_limit, 30), 1), 100)
  ), picked as (
    select id from top
    union all
    select r.id from public.quran_comments r
      join top t on r.parent_id = t.id
     where not r.is_hidden
  )
  select jsonb_build_object(
    'total', (select count(*) from public.quran_comments
               where kind = p_kind and ref_id = p_ref and not is_hidden),
    'comments', coalesce((
      select jsonb_agg(public.quran_comment_json(c, p_viewer) order by c.created_at desc)
        from public.quran_comments c
       where c.id in (select id from picked)
    ), '[]'::jsonb)
  );
$$;

-- Posts a comment or (with p_parent) a reply. Same limits as before: one per
-- 5 seconds and 100 per day per browser. Replaces the 5-argument version so
-- calls without p_parent aren't ambiguous.
drop function if exists public.add_quran_comment(text, text, int, text, text);
create or replace function public.add_quran_comment(
  p_viewer text, p_kind text, p_ref int, p_name text, p_body text, p_parent uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
  v_body text := left(btrim(coalesce(p_body, '')), 500);
  v_parent uuid;
  v_row public.quran_comments%rowtype;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_comment_ref_valid(p_kind, p_ref), false) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name = '' or v_body = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if p_parent is not null then
    -- One level deep: a reply to a reply belongs to the top-level comment.
    select coalesce(c.parent_id, c.id) into v_parent
      from public.quran_comments c
     where c.id = p_parent and c.kind = p_kind and c.ref_id = p_ref and not c.is_hidden;
    if v_parent is null then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;
  if exists (select 1 from public.quran_comments
              where viewer_id = p_viewer and created_at > now() - interval '5 seconds')
     or (select count(*) from public.quran_comments
          where viewer_id = p_viewer and created_at > now() - interval '1 day') >= 100 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.quran_comments (kind, ref_id, viewer_id, name, body, parent_id)
  values (p_kind, p_ref, p_viewer, v_name, v_body, v_parent)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'comment', public.quran_comment_json(v_row, p_viewer));
end;
$$;

-- Like / un-like a visible comment. Returns the new state and count.
create or replace function public.toggle_quran_comment_like(p_viewer text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liked boolean;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not exists (select 1 from public.quran_comments where id = p_id and not is_hidden) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  delete from public.quran_comment_likes where viewer_id = p_viewer and comment_id = p_id;
  v_liked := not found;
  if v_liked then
    insert into public.quran_comment_likes (viewer_id, comment_id) values (p_viewer, p_id)
    on conflict do nothing;
  end if;
  return jsonb_build_object(
    'ok', true,
    'liked', v_liked,
    'count', (select count(*) from public.quran_comment_likes where comment_id = p_id)
  );
end;
$$;

grant execute on function public.get_quran_comments(text, int, int, text) to anon, authenticated;
grant execute on function public.add_quran_comment(text, text, int, text, text, uuid) to anon, authenticated;
grant execute on function public.toggle_quran_comment_like(text, uuid) to anon, authenticated;
