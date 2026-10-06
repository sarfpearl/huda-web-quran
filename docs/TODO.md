# TODO

## Open items (2026-10-06)

Start here in a new conversation. Details for each are further down or in `HANDOFF.md` §4.

- [ ] **Remove unused R2 keys from Vercel** — `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are in Vercel (Project → Settings → Environments → Production) but only the local `scripts/tools/upload-to-r2.mjs` uses them; the app never reads them. Delete both there; keep them in `.env.local`. Owner does this in the Vercel dashboard.
- [ ] **IndoPak font licence (QuranWBW permission)** — waiting on written permission from QuranWBW.com (quranwbw@gmail.com). Until then IndoPak stays development-only. Steps once granted: see *IndoPak script by region* below.
- [ ] **Clear Supabase test data before launch** — `truncate public.quran_listens, public.quran_presence;` in the Supabase SQL editor (add `public.quran_likes, public.quran_comments` to wipe those too). See *Quran views · live · comments · likes* below.
- [ ] **Old Bayan DB tables (owner's call)** — the Bayan section was removed from the app on 2026-10-06, but the live Supabase DB still has the tables `categories`, `speakers`, `bayan`, `bayan_plays` and the storage buckets `bayan-audio`, `bayan-images`, `speaker-images`. Nothing reads them. Back up first if the data matters, then drop them, e.g.
  `drop table if exists public.bayan_plays, public.bayan, public.speakers, public.categories cascade;`
  and delete the three buckets in Supabase Storage. Keep `public.admins` / `public.is_admin()` — comment moderation needs them. R2 also still holds unused `assets/images/bayan/*.jpg` (keep `bayan/quran.jpg`, the Quran fallback cover).

## IndoPak script by region

Built on `feat/indopak-script`, **development-only** until the font is licensed
(`INDOPAK_ENABLED` in `src/lib/data/quranScript.ts`: on in `next dev`, or with
`NEXT_PUBLIC_INDOPAK=1`).

- [x] IndoPak word text at the glyph data's word positions —
      `public/data/quran-indopak/` (`scripts/generation/fetch-indopak-words.mjs`,
      Quran.com `text_indopak`); word sync, highlight and tap-to-seek unchanged.
- [x] Region default: device time zone, then the country from the location
      (India, Pakistan, Bangladesh, Sri Lanka, Nepal, South Africa, Mauritius
      → IndoPak); a script picked by hand is remembered (`huda:script`).
- [x] "Uthmani | IndoPak" picker in the Tajweed panel; Tajweed colours are
      Uthmani-only (switch disabled in IndoPak — agreed).
- [x] Reading mode keeps the Madani 604-page layout and page numbers.
- [ ] **Font licence** — Quran.com's `text_indopak` is encoded for
      "AlQuran IndoPak by QuranWBW" (it uses that font's private-use marks).
      Its licence: *not for distribution or development without written notice
      by QuranWBW.com* (quranwbw@gmail.com). Until permission arrives the text
      falls back to Noto Naskh Arabic, which shows 1,367 of 77,430 words
      (1.77%) with boxes for those marks.
- [ ] Once granted: self-host the font, declare it as `'IndoPak'` in
      `globals.css` (`.font-arabic.quran-indopak` already lists it first), set
      `NEXT_PUBLIC_INDOPAK=1` in Vercel, add the font to About → credits, and
      check the ayah-end ornament and waqf marks with the real font.

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
