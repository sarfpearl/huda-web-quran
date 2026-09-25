# TODO

## Quran views · live · comments · likes (Supabase)

- [ ] **Clear test data before launch** — once testing is finished, run in the
      Supabase SQL editor:
      `truncate public.quran_listens, public.quran_presence;`
      (keeps likes and comments; add `public.quran_likes, public.quran_comments`
      to wipe those too).
- [ ] **Harden counts against abuse (later)** — views, live and likes are
      anonymous (random browser id), so someone could inflate them with many
      browsers / ids. Listening time and comment rate are already clamped on the
      server. Options: per-IP rate limiting in a Supabase Edge Function or
      Vercel middleware, a captcha (Turnstile) on comments, or counting only
      signed-in users.
- [ ] **Admin login** — `/admin` has no authentication yet; comment moderation
      is protected by a moderator key instead
      (`supabase/migrations/20260925090000_quran_comment_moderation.sql`).
      Replace with Supabase Auth + `public.admins` when admin login is added.
- [ ] Supabase Free plan pauses after ~7 days without activity and has no
      automatic backups — restore from the dashboard if paused; consider Pro
      before relying on the data.
