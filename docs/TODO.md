# TODO

## Open items (2026-10-06)

Start here in a new conversation. Details for each are further down or in `HANDOFF.md` §4.

- [x] **Remove unused R2 keys from Vercel** (done 2026-10-06) — `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` are in Vercel (Project → Settings → Environments → Production) but only the local `scripts/tools/upload-to-r2.mjs` uses them; the app never reads them. Delete both there; keep them in `.env.local`. Owner does this in the Vercel dashboard.
- [ ] **IndoPak font licence (QuranWBW permission)** — waiting on written permission from QuranWBW.com (quranwbw@gmail.com). Until then IndoPak stays development-only. Steps once granted: see *IndoPak script by region* below.
- [ ] **Clear Supabase test data before launch** — `truncate public.quran_listens, public.quran_presence;` in the Supabase SQL editor (add `public.quran_likes, public.quran_comments` to wipe those too). See *Quran views · live · comments · likes* below.
- [x] **Admin login turned on (2026-10-06)** — migration `20261006120000_admin_login_moderation.sql` run, sign-ups off, URL Configuration set, admin added; verified live (signed in, comments load). Admin = `sarf.pearl@gmail.com`. Supabase's built-in email only sends to the org's team members and ~2 emails/hour; add custom SMTP (e.g. Resend) before adding other admins. If a link lands on `localhost:3000`, the Site URL / Redirect URLs in Auth → URL Configuration are wrong.
- [ ] **Old Bayan DB tables (owner's call)** — the Bayan section was removed from the app on 2026-10-06, but the live Supabase DB still has the tables `categories`, `speakers`, `bayan`, `bayan_plays` and the storage buckets `bayan-audio`, `bayan-images`, `speaker-images`. Nothing reads them. Back up first if the data matters, then drop them, e.g.
  `drop table if exists public.bayan_plays, public.bayan, public.speakers, public.categories cascade;`
  and delete the three buckets in Supabase Storage. Keep `public.admins` / `public.is_admin()` — comment moderation needs them. R2 also still holds unused `assets/images/bayan/*.jpg` (keep `bayan/quran.jpg`, the Quran fallback cover).

## Launch QA (2026-10-06) — work top to bottom, one at a time

Order = priority. P0 are launch blockers; P1 must be fixed before the public
launch. Each item: check it on the live site + locally, fix what fails, tick it.

### 🔴 P0 — launch blockers
- [x] **1. Quran content correctness** (2026-10-06) — `node scripts/qa/quran-content.cjs`
      checks everything against Quran.com's API: 114 Surahs (number, name,
      Arabic name, verse count, Meccan / Medinan), all 6,236 ayahs' Arabic
      text, 77,430 Tajweed glyph words + pages, the 604 Mushaf page starts,
      30 Juz ranges, one translation line per ayah in all 10 languages —
      0 failures. Known, allowed differences: Juz uses the Indo-Pak division
      (Juz 4, 7, 11, 20, 21, 23 start a few ayahs off Madani — on purpose);
      12:39 / 12:41 text view spells «يَٰصَىٰحِبَىِ» (Tanzil rasm); 37:130 is
      two timed words. Fixed: surahChapters.ts "Aal-e-Imran" → "Aal-Imran";
      Surah search now finds "yasin", "taha" (was Al-Mumtahanah only),
      "ali imran", "alfatiha", English meaning ("the cow"), Tamil
      (யாஸீன்) and Arabic with vowel marks; a typed number lists that Surah
      first (`src/lib/data/surahSearch.ts`). Hizb isn't shown anywhere in the
      app (not a feature today).
- [x] **2. Translation mapping** (2026-10-06) — `node scripts/qa/translations.cjs`:
      all 10 languages × 6,236 ayahs = their source edition verbatim, and
      each meaning closer to Quran.com's same ayah than to its neighbours
      (0 failures; 15 refrains / short oaths checked by hand, listed in the
      script). Fixed: **Hindi** switched to Quran.com's Azizul Haque al-Umari
      — the old hi.hindi (Suhel Farooq Khan) ran ayahs into each other
      (69:34 showed 69:35's meaning, 26:107 showed 26:108's, ~37 places);
      **Turkish 3:177–178** (tr.diyanet had 3:178's first half in 3:177)
      patched from Quran.com's Diyanet. A language file that can't load
      (offline) now shows English instead of an empty meaning. Surah 1
      English / Tamil stay hand-tuned (1:3, 1:5, 1:7 Tamil differ on purpose).
- [x] **3. Word / audio sync + Arabic highlight accuracy** (2026-10-06) —
      data: `sync-suite.cjs` 9 reciters × 114 Surahs × 77,430 words, 0
      failures; `audio-sources.cjs` 1,026 Word Sync streams + 30 Maher Juz
      files reachable, recording lengths unchanged since the 2026-09-30
      voice-match (so its audio-only list still holds). Live, in the browser
      (`highlight-probe.js` → `highlight-lag.cjs`, recordings in
      `scripts/qa/results/highlight/`): every lit word was the word being
      recited (245 word changes, 100%) — Surah start, long ayah (3:7),
      pause / resume, next / previous ayah, word tap, after the Isti'adhah
      prelude, reciter change (Alafasy, Sudais, Dosari), mobile 390px, Juz
      per-ayah clips. **Fixed:** the highlight came up to 257ms late (median
      135ms) — the player clock only moved on `timeupdate` (~4×/s). The player
      now also updates on the animation frame the voice crosses the next word
      boundary (`setTimeBoundary` / `nextTimelineBoundary`): median 13ms, p95
      18ms, one re-render per word. `word-boundaries.cjs` checks no word
      change falls between two boundaries (45 reciter × Surah runs, 0).
- [~] **4. Audio reliability** (2026-10-06) — checked in the browser (local
      dev): play, pause, seek (progress bar → right ayah/word, keeps playing),
      volume, mute, speed, previous / next ayah, next Surah (with Bismillah
      prelude), reciter change, loading spinner on a stall. **Fixed:**
      (1) a stream error swapped in *another reciter's* mp3quran file from
      0:00 (Mishary → Sudais) while the screen still said Mishary and lit his
      timings — now the same file is retried from where it stopped (3×, 1–3s
      apart; offline: waits for the connection), then "Couldn't load… press
      play to try again", and play reloads it at that position;
      (2) speed reset to 1× on every new Surah / prelude while the button
      still said 1.25× (`load()` resets `playbackRate` — `defaultPlaybackRate`
      is set too); (3) no lock-screen / notification controls — Media Session
      added (Surah · reciter · cover, play / pause / previous / next / seek).
      **Still to do on real phones** (no iOS Simulator on this Mac — Xcode has
      no Simulator.app): background + lock-screen playback and controls on
      iPhone Safari and Android Chrome, headphones / Bluetooth buttons, a call
      interrupting playback, Juz playing on with the screen locked.
- [x] **5. Surah navigation** (2026-10-06) — checked in the browser: Surah
      search (item 1), previous / next ayah and Surah (114 → 1 and 1 → 114
      wrap), bookmark (player 🔖 → "Bookmark · Ya-Sin 36:3" pill after a
      reload → opens it in reading mode), reading mode's "Continue reading ·
      Ya-Sin 36:4" after a reload → page 440. **Added (owner's choice):** a
      "Continue · Ya-Sin 0:17" pill beside the bookmark pill — the Surah last
      listened to, where it was left, in that reciter's voice; the app still
      opens on Al-Fatihah. Fixed with it: cueing Al-Fatihah on open overwrote
      the saved last-listened Surah (`cueBayan` no longer saves or clears it).

### 🔴 P1 — before public launch
- [x] **6. Reading mode** (2026-10-06) — `scripts/qa/reading-follow-probe.js`
      (browser) samples every 200ms whether the recited word is on screen:
      desktop Al-Baqarah at 2× across pages 2→3 200/200; mobile 390px 149/150
      (the word always 164–362px into a 584px pane — never in the faded
      edges or under the player); Juz 30 across Surah 78 → 79 (only the
      Bismillah prelude has no word) and the saved probe 60/60. Manual
      scroll: follow pauses 7s, then glides back (visible again at 9.0s).
      No horizontal scroll, no word past the edge at 390px. Reading mode
      is the Madinah page view only (no separate "continuous" mode). Noted,
      not changed: the « Bookmark » pill sits over the pane's faded top edge
      while reading (by design — it stays until its ayah is on screen).
- [~] **7. Navigation** (2026-10-06) — checked: 404 page, Back to Home,
      browser back / forward, refresh. **Added (owner's choice): deep links**
      (`src/lib/deepLink.ts`): `/surah/36`, `/surah/36/3` (an ayah) cue that
      Surah at that ayah (play is the visitor's tap — browsers block
      autoplay); `/juz/30` shows a « ▶ Juz 30 » pill; each has its own title,
      description and canonical (an ayah link → its Surah); sitemap lists 114
      Surahs + 30 Juz; bad numbers → 404. While playing, the address and
      title follow the Surah / ayah or Juz (`replaceState`), so refresh or
      sharing comes back to it; "/" still opens on Al-Fatihah and stays "/"
      until something plays; a link visit skips the auto-opening content
      browser. **Not done (owner skipped for now):** Back closing modals
      (Back on Android leaves the site while a picker is open); 404 polish
      (site title + splash on the 404 page).
- [x] **8. Responsive** (2026-10-06) — `scripts/qa/responsive-check.js` at
      1440 / 1280 / 1024 / 820 / 768 / 430 / 412 / 393 / 390 px, on the home
      screen with an ayah on screen, the content browser, the reciter picker
      and the translation picker: no horizontal scroll, nothing past the
      screen edge, no Arabic word overflowing, player inside the screen —
      at every width. **Fixed: small tap targets** — a `.tap-44` utility
      (globals.css: an invisible ≥44×44 hit area, looks unchanged) on the
      translation and Tajweed buttons, their on/off switch and close, the
      reciter picker's close, the content browser's close, previous / next
      ayah, like, shuffle, speed, mute and the live / views / comments
      counts (17px tall). Left as they are: the header's round buttons are
      40×40 below 400px (44 above; they'd no longer fit the row, and the
      reciter avatar clips a hit area), the ayah pill's « » are 36px (its
      pill clips), the progress bar is 20px tall; all pass WCAG 2.2 AA's
      24px minimum. Dense icon rows overlap each other's hit areas a little.
- [x] **9. Waqt (prayer) time in the header widget** (2026-10-07) — the
      header pill shows the **current prayer and its waqt, start – end**
      (owner's choice): "Isha 7:07 PM – 4:49 AM" + the place (md+), or
      "Isha / 7:07 – 4:49" on phones (fits 390 / 640 px with the longest
      "Maghrib 12:59 – 12:59"); between sunrise and Dhuhr, "Dhuhr from
      11:59". Tap → today's six times, method, Asr. Computed on the device
      with adhan-js (`src/lib/prayerTimes.ts`) from the saved location
      (coordinates now kept in `huda-place`; older saves ask once more).
      Method and Asr **by region** (owner's choice): India / Pakistan /
      Bangladesh / Sri Lanka → Karachi, Saudi → Umm al-Qura, Gulf, Egypt,
      Malaysia / Indonesia / Singapore, Turkey, Iran, US / Canada (ISNA),
      UK (Moonsighting), else Muslim World League; Asr Hanafi in Pakistan,
      Bangladesh, Turkey, Central Asia and India outside Kerala / Tamil Nadu
      / Puducherry / Lakshadweep, else Shafi'i. Changeable in the sheet
      (`huda:prayer-prefs`). High latitudes: twilight-angle rule; no sunrise
      / sunset (polar) → the old clock. No location → the old clock + place.
      `scripts/qa/prayer-times.cjs`: 12 cities vs AlAdhan's API on 3 dates
      (Oct, June and December solstices) — within 2 min (5 for Dubai /
      Moonsighting, whose own precaution minutes adhan applies).

### 🟠 P1
- [x] **10. Tajweed colours** (2026-10-07) — `scripts/qa/tajweed-colours.py`
      (needs fonttools + brotli): the dark Tajweed palette is identical in
      all 604 page fonts, and the header legend's 8 colours are exactly the
      font's rule colours. On the dark scene every colour passes WCAG large
      text (3:1); the weakest are red "Necessary madd" 3.88 and blue
      "Tafkhim" 4.96. Light theme: not applicable — the Quran view is always
      over the dark scene (ThemeToggle isn't rendered anywhere). **Fixed:**
      long ayahs went below their readable floor — 2:282 on a 390px phone
      shrank to 18px (and still scrolled); the 22px floor now holds, the
      recited word stays on screen (60/60 samples). **Added (owner's choice):**
      over bright scenes (sunlit sky, Surah 94; leaves, Surah 95) the
      colours lose contrast — 10% of the verse area is brighter than mid-grey
      in half the scene images; on iPhone the glyphs get no text shadow
      (WebKit GPU-crash workaround), so it's weaker there — now a soft dark
      oval scrim sits behind the ayah (`.quran-verse-scrim`, 55% at the
      centre fading to 0 at the text block's edge), in both Tajweed and plain.
- [ ] **11. Light / dark mode** — background, Arabic, translation, Tajweed,
      player, cards, icons; contrast, selected / disabled states.
- [ ] **12. SEO / share** — OG title / description / image, WhatsApp,
      Facebook, X card, favicon, apple-touch-icon, canonical, sitemap,
      robots, structured data.
- [ ] **13. Performance** — FCP / LCP, JS bundle size, images, audio
      loading, lazy loading, slow 4G, offline / error state.
- [ ] **14. Accessibility** — keyboard nav, focus states, screen-reader and
      button labels, audio controls, contrast, Arabic readability, touch
      targets ≥ 44 px, reduced motion.

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
- [x] **Per-IP limits** (`supabase/migrations/20261006150000_quran_ip_limits.sql`) —
      one IP can bring in at most 30 new browser ids a day (over that, a new id
      gets no view / live / like row) and post at most 20 comments an hour.
      Only a salted hash of the IP is kept, for 2 days. Tune in
      `public.quran_ip_limit()`. Shared IPs (mobile CGNAT, offices) share the
      cap — raise it if real listeners stop being counted.
      Live since 2026-10-06 (run together with the 2026-09-26 comment
      likes/replies migration, which had never been applied — replies and
      comment likes were broken on the live site until then). Checked live: IP
      comes from `cf-connecting-ip`; forged `X-Forwarded-For` / `X-Real-IP`
      don't change it, a forged `CF-Connecting-IP` is refused by Cloudflare.
- [ ] **Drop the temporary probe** (owner, SQL editor):
      `drop function if exists public.quran_ip_probe();`
- [ ] **Later, if spam still gets through:** Cloudflare Turnstile on comments.
- [x] **Admin login** — `/admin/comments` signs in with an email magic link
      (Supabase Auth); only users in `public.admins` can moderate. The
      moderator key is gone
      (`supabase/migrations/20261006120000_admin_login_moderation.sql`).
- [ ] Supabase Free plan pauses after ~7 days without activity and has no
      automatic backups — restore from the dashboard if paused; consider Pro
      before relying on the data.
