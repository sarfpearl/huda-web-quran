# TODO

## Next phase · IndoPak script by region

- [ ] **Show the Quran in IndoPak script for South Asia** — India, Pakistan,
      Bangladesh, Sri Lanka and South Africa read the IndoPak style (its own
      harakat, sukun and madd marks); everywhere else keeps Uthmani (Madani).
      Pick the default from the device time zone (no location permission
      needed), or the country from the location the app already asks for;
      add an "Uthmani / IndoPak" switch so anyone can change it.
  - Agreed: **no Tajweed colours in IndoPak** — the colour glyphs are QPC V4
    Uthmani page fonts; IndoPak has no colour font. The recited-word highlight
    stays, drawn as plain text.
  - Check Quran.com's IndoPak text keeps the same word positions, so word
    sync works unchanged.
  - Reading mode's « Page N » counts the Madani 604 pages; IndoPak Mushafs
    paginate differently — hide the page number in IndoPak or keep Madani's.

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
