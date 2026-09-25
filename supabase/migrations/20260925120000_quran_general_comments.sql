-- ============================================================================
--  HuDa Web Quran : one general comment stream (not per Surah / Juz)
--  Run AFTER 20260925090000_quran_comment_moderation.sql. Idempotent.
--
--  Comments now live under (kind 'general', ref_id 0). Existing Surah / Juz
--  comments are moved there. Listens, presence and likes stay per Surah / Juz
--  (quran_ref_valid is unchanged, so 'general' is valid for comments only).
-- ============================================================================

create or replace function public.quran_comment_ref_valid(p_kind text, p_ref int)
returns boolean
language sql
immutable
as $$
  select (p_kind = 'general' and p_ref = 0) or public.quran_ref_valid(p_kind, p_ref);
$$;

alter table public.quran_comments drop constraint if exists quran_comments_ref;
alter table public.quran_comments
  add constraint quran_comments_ref check (public.quran_comment_ref_valid(kind, ref_id));

update public.quran_comments set kind = 'general', ref_id = 0 where kind <> 'general';

-- Same as before, but accepts the general stream.
create or replace function public.add_quran_comment(p_viewer text, p_kind text, p_ref int, p_name text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := left(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), 40);
  v_body text := left(btrim(coalesce(p_body, '')), 500);
  v_row public.quran_comments%rowtype;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or not coalesce(public.quran_comment_ref_valid(p_kind, p_ref), false) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_name = '' or v_body = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  if exists (select 1 from public.quran_comments
              where viewer_id = p_viewer and created_at > now() - interval '5 seconds')
     or (select count(*) from public.quran_comments
          where viewer_id = p_viewer and created_at > now() - interval '1 day') >= 100 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.quran_comments (kind, ref_id, viewer_id, name, body)
  values (p_kind, p_ref, p_viewer, v_name, v_body)
  returning * into v_row;

  return jsonb_build_object('ok', true, 'comment', jsonb_build_object(
    'id', v_row.id, 'name', v_row.name, 'body', v_row.body, 'created_at', v_row.created_at, 'mine', true));
end;
$$;

grant execute on function public.quran_comment_ref_valid(text, int) to anon, authenticated;
