-- ============================================================================
--  HuDa Web Quran : in-app feedback (the lantern at the screen edge)
--  Run AFTER 20261012140000_quran_ip_trusted.sql (uses quran_client_ip_hash()
--  and is_admin()). Idempotent.
--
--  - public.feedback: one row per message (issue / improvement / other), with
--    an optional screenshot in the private Storage bucket 'feedback-screenshots'.
--  - The public can only SEND: submit_feedback() is the one way in (no table
--    grants for anon), rate-limited per browser, per IP and in total per day.
--  - A screenshot can only be uploaded to the path submit_feedback() handed
--    out, within 15 minutes, once (no overwrite), as a JPEG / PNG / WebP of at
--    most 1.5 MB. Nobody but an admin can list, read or delete them.
--  - Admins (public.admins) read and manage it on /admin/feedback.
--
--  Free-tier sizing: at the caps below (300 a day in total) and 1.5 MB per
--  screenshot, a worst-case day adds ~450 MB; the app shrinks screenshots to
--  ~150–400 KB before upload. Delete handled feedback on /admin/feedback to
--  free the space (its screenshot goes with it).
--
--  Tune the limits in public.feedback_limit() below.
-- ============================================================================

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('issue', 'improvement', 'other')),
  message text not null check (char_length(message) between 1 and 2000),
  -- Where it was sent from, so an issue can be reproduced.
  page text,
  ui_lang text,
  user_agent text,
  viewport text,
  -- Storage path in 'feedback-screenshots' when one was attached.
  screenshot_path text unique,
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  -- Rate limiting only; never returned to anyone.
  viewer_id text,
  ip_hash text
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_viewer_idx on public.feedback (viewer_id, created_at desc);
create index if not exists feedback_ip_idx on public.feedback (ip_hash, created_at desc);

-- RLS on, no policies and no grants: the table is reached only through the
-- security-definer functions below.
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.feedback_limit(p_name text)
returns int
language sql
immutable
set search_path = public
as $$
  select case p_name
    when 'per_browser_per_hour' then 5
    when 'per_ip_per_hour' then 8
    when 'per_ip_per_day' then 20
    when 'total_per_day' then 300
  end;
$$;
revoke all on function public.feedback_limit(text) from public, anon, authenticated;

-- Send feedback. Returns { ok, id, upload_path } — upload_path (only when
-- p_with_screenshot) is where the screenshot may be uploaded next.
-- Errors: 'invalid', 'empty', 'rate_limited'.
create or replace function public.submit_feedback(
  p_viewer text,
  p_kind text,
  p_message text,
  p_with_screenshot boolean default false,
  p_screenshot_ext text default 'jpg',
  p_page text default null,
  p_ui_lang text default null,
  p_user_agent text default null,
  p_viewport text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message text := left(btrim(coalesce(p_message, '')), 2000);
  v_ip text := public.quran_client_ip_hash();
  v_id uuid := gen_random_uuid();
  v_path text;
begin
  if p_viewer is null or char_length(p_viewer) not between 8 and 64
     or p_kind not in ('issue', 'improvement', 'other') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if v_message = '' then
    return jsonb_build_object('ok', false, 'error', 'empty');
  end if;
  -- One at a time per browser and per IP, so parallel requests can't all pass the counts.
  perform pg_advisory_xact_lock(hashtext('feedback_viewer:' || p_viewer));
  if v_ip is not null then
    perform pg_advisory_xact_lock(hashtext('feedback_ip:' || v_ip));
  end if;
  if (select count(*) from public.feedback
       where viewer_id = p_viewer and created_at > now() - interval '1 hour')
       >= public.feedback_limit('per_browser_per_hour')
     or (v_ip is not null and (
          (select count(*) from public.feedback
            where ip_hash = v_ip and created_at > now() - interval '1 hour')
            >= public.feedback_limit('per_ip_per_hour')
          or (select count(*) from public.feedback
               where ip_hash = v_ip and created_at > now() - interval '1 day')
               >= public.feedback_limit('per_ip_per_day')))
     or (select count(*) from public.feedback where created_at > now() - interval '1 day')
          >= public.feedback_limit('total_per_day') then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if coalesce(p_with_screenshot, false) then
    v_path := to_char(now() at time zone 'utc', 'YYYY-MM') || '/' || v_id::text || '.'
      || case when p_screenshot_ext in ('png', 'webp') then p_screenshot_ext else 'jpg' end;
  end if;
  insert into public.feedback (id, kind, message, page, ui_lang, user_agent, viewport, screenshot_path, viewer_id, ip_hash)
  values (v_id, p_kind, v_message, left(p_page, 300), left(p_ui_lang, 8), left(p_user_agent, 300),
          left(p_viewport, 20), v_path, p_viewer, v_ip);
  return jsonb_build_object('ok', true, 'id', v_id, 'upload_path', v_path);
end;
$$;
revoke all on function public.submit_feedback(text, text, text, boolean, text, text, text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text, boolean, text, text, text, text, text) to anon, authenticated;

-- ── Screenshots ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-screenshots', 'feedback-screenshots', false, 1572864,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True when p_name is a path submit_feedback() handed out in the last 15 minutes.
create or replace function public.feedback_upload_allowed(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.feedback
                  where screenshot_path = p_name
                    and created_at > now() - interval '15 minutes');
$$;
revoke all on function public.feedback_upload_allowed(text) from public;
grant execute on function public.feedback_upload_allowed(text) to anon, authenticated;

-- Anyone may upload, but only to a path just handed out. No select / update
-- policy for the public, so an upload can't overwrite (no upsert) or read back.
drop policy if exists feedback_screens_insert on storage.objects;
create policy feedback_screens_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'feedback-screenshots' and public.feedback_upload_allowed(name));

-- Admins only: view (signed URLs) and delete.
drop policy if exists feedback_screens_admin_read on storage.objects;
create policy feedback_screens_admin_read on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback-screenshots' and public.is_admin());
drop policy if exists feedback_screens_admin_delete on storage.objects;
create policy feedback_screens_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'feedback-screenshots' and public.is_admin());

-- ── Admin ────────────────────────────────────────────────────────────────────
-- Latest feedback. p_status: 'all' | 'new' | 'read' | 'done'. Never returns
-- the browser id or IP hash.
create or replace function public.admin_list_feedback(p_status text default 'all', p_limit int default 100)
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
  return jsonb_build_object('ok', true, 'feedback', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', f.id, 'created_at', f.created_at, 'kind', f.kind, 'message', f.message,
             'page', f.page, 'ui_lang', f.ui_lang, 'user_agent', f.user_agent, 'viewport', f.viewport,
             'screenshot_path', f.screenshot_path, 'status', f.status) order by f.created_at desc)
      from (select * from public.feedback
             where coalesce(p_status, 'all') = 'all' or status = p_status
             order by created_at desc
             limit least(greatest(coalesce(p_limit, 100), 1), 500)) f
  ), '[]'::jsonb),
  'counts', (select jsonb_build_object(
               'new', count(*) filter (where status = 'new'),
               'read', count(*) filter (where status = 'read'),
               'done', count(*) filter (where status = 'done'))
               from public.feedback));
end;
$$;

-- p_action: 'new' | 'read' | 'done' (set status) | 'delete'. The page removes
-- the screenshot from Storage before deleting the row.
create or replace function public.admin_update_feedback(p_id uuid, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if p_action in ('new', 'read', 'done') then
    update public.feedback set status = p_action where id = p_id;
  elsif p_action = 'delete' then
    delete from public.feedback where id = p_id;
  else
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  return jsonb_build_object('ok', found);
end;
$$;

revoke all on function public.admin_list_feedback(text, int) from public, anon;
revoke all on function public.admin_update_feedback(uuid, text) from public, anon;
grant execute on function public.admin_list_feedback(text, int) to authenticated;
grant execute on function public.admin_update_feedback(uuid, text) to authenticated;
