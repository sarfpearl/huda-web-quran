# TODO

## Open items (updated 2026-10-07)

Start here in a new conversation. Details for each are further down or in `HANDOFF.md` §4.

- [ ] **Merge the QA PR stack (owner)** — #26 … #36 (Launch QA items 1–11),
      then #37 SEO → #38 performance → #39 accessibility → #40 share button →
      #41 video re-encode script → #42 WebP scenes → #43 missing-video fix → #44 Back / 320px / install,
      each based on the one before (top branch: `fix/back-closes-dialogs`). Vercel
      deploys only from `main`. R2 media is already live (smaller clips, the
      WebPs uploaded), so #42 is safe to merge.
- [ ] **After deploy, check live:** `node scripts/qa/seo-share.cjs` → 0
      failures; an unsent link (e.g. `/surah/36/4`) in WhatsApp shows
      "Ya-Sin 36:4"; scenes load as `.webp`; going Al-Fatihah → An-Nisa leaves
      no Al-Fatihah clip on screen.
- [ ] **Real phones (Launch QA item 4)** — lock screen / background playback,
      headphones / Bluetooth buttons, a call interrupting, Juz with the screen
      locked; iPhone Safari + Android Chrome (no iOS Simulator on this Mac).
- [x] **Small code follow-ups** (2026-10-07, `fix/back-closes-dialogs`) —
      Back (Android button, browser back, iOS swipe) now closes the open
      sheet / content browser / reciter picker / install guide instead of
      leaving the site (`src/lib/useBackToClose.ts`: a same-URL history entry
      per open dialog; the address keeps following the playing ayah);
      header fits at 320px (round buttons 36px and tighter gaps below 360px —
      search was 23px off-screen); Juz share checked in the browser
      (`/juz/30`, share sheet + copied link); an install prompt arriving after
      the sheet opened no longer swaps the steps — the bottom button becomes
      "Install app" (same height, 0 layout shift). **Still open:** 404 page
      polish (item 7, owner skipped). Local dev beside another `next dev`:
      the "dev-alt" launch config (`NEXT_DIST_DIR=.next-dev-alt`) — two dev
      servers on one `.next` turn pages into 404s.
- [ ] **Content (owner)** — 103 Surahs have no background clip (they show
      their image); new clips: render → `reencode-videos.mjs` →
      `video-manifest.mjs`. No offline support (no service worker).

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
      browser. **Not done (owner skipped for now):** 404 polish
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
      **Changed (owner, 2026-10-07):** the oval scrim is gone; instead an even
      40% black over the whole scene (was a 35–55% radial).
- [x] **11. Light / dark mode** (2026-10-07) — the Quran home is always the
      dark scene (no theme toggle is rendered); only the 404 / error and
      admin pages follow the system theme (404 checked light + dark).
      Text-contrast audit (browser, every visible UI string, colour × opacity
      composited over a dark #1a1a1a and a bright #4a4a4a scene) on the home
      screen and in the content browser (Surah / Juz / About), reciter,
      translation, Tajweed, prayer-times, favourites and comments panels.
      **Fixed:** below AA 4.5:1 — the content browser's list numbers (3.2),
      view counts (4.3), the favourites hint (4.3) and the player's "Now
      playing" label (3.7) — brightened, all pass now. **Fixed, regression
      from the deep links (item 7):** the immersive screen lock (and iOS 26
      Safari bleed) was set only on "/", so on /surah/… and /juz/… — and on
      "/" as soon as playback rewrote the address to /surah/1 — the page lost
      its lock and the whole home tree would remount (MainLayout swaps its
      wrapper). Now locked on all three. The home also forces
      `color-scheme: dark` on <body>, so native controls (the prayer sheet's
      method list) don't open white-on-white under a light system theme.
      Disabled controls (opacity 30%) are exempt from contrast. Skip link:
      see item 14.
- [x] **12. SEO / share** (2026-10-07) — `node scripts/qa/seo-share.cjs
      [base-url]` (production build, `next start`): home, Surah, ayah link
      and Juz pages each have their own title / description / canonical
      (ayah → its Surah), the full Open Graph + X large card
      (`opengraph-image.jpg` 1200×675, 218 KB — under WhatsApp's ~300 KB),
      favicon / apple-touch-icon / manifest / robots (admin disallowed) /
      sitemap (145 URLs) served; bad links are 404 + noindex. **Fixed:**
      shared Surah / Juz / ayah links had **no image** and a small X card —
      a page setting `openGraph` / `twitter` replaces the layout's whole
      object (no deep merge), losing image, site name, type and
      `summary_large_image`; now every page builds both via `shareMetadata()`
      (`src/lib/site.ts`). `og:locale` was `ta_IN` on English pages →
      `en_US`. `/favicon.ico` was a 404 → `src/app/favicon.ico` (16/32/48).
      **Added:** JSON-LD — `WebSite` on home (site name in search results),
      `BreadcrumbList` on Surah / Juz (`src/lib/structuredData.ts`).
      **After deploy:** re-run against the live site, and check a link in
      Facebook's Sharing Debugger / a WhatsApp chat (WhatsApp caches a
      preview per URL — the old image-less ones may linger).
- [~] **13. Performance** (2026-10-07) — production build (`NEXT_DIST_DIR=.next-prod`,
      "prod" launch config), Lighthouse 12 mobile + `scripts/qa/perf-slow.mjs`
      (real Chrome, slow 4G + 4× CPU). Mobile score 57 → 85, desktop 99;
      FCP 2.9 → 0.9 s; CLS 0.30 → 0.01; page weight on open 17 MB → 6.4 MB
      (home), 25.7 → 7.0 MB (/surah/36); home JS 354 → 294 kB. Slow 4G probe:
      FCP 0.75 s, LCP 1.5 s (splash logo). Lighthouse's simulated LCP (4.1 s)
      counts the splash's parallel scene image — not what the phone paints.
      **Fixed:** (1) the paused open screen buffered ~15 MB of Al-Fatihah's
      20 MB clip — `preload="metadata"` until playing (same first frame,
      ~3 MB); (2) /surah/N first rendered — and downloaded — Al-Fatihah's
      scene and clip before switching (the landing track is now the link's
      Surah); (3) two random Surah images (~1 MB each) preloaded on every
      Surah change — only next / previous now; (4) Google Fonts via four
      render-blocking CSS `@import`s → self-hosted `next/font`
      (`src/app/fonts.ts`), metric-matched fallbacks, no italics (unused),
      only Poppins latin preloaded; (5) CLS 0.30 on hydration — the player
      shell rendered 0 tall until measured, and the verse stage's fallback
      paddings (192 / 64px) were far from the measured 343 / 77px; (6) the
      install sheet grew / shrank between steps (all steps' text now share
      one grid cell), and on Android Chrome it waits up to 6 s for the
      browser's install prompt before opening; (7) public pages used the full
      Supabase client (auth + realtime) for `.rpc()` only → PostgREST client
      (`src/lib/supabase/rpc.ts`, −60 kB); admin keeps the full one. Splash
      logo 512 → 384px (68 → 43 KB). Thumbnails are lazy (next/image).
      **Not done / owner:** (a) R2 media — videos: `scripts/tools/reencode-videos.mjs`
      (2026-10-07; inventory → `--encode` → `--upload --execute`): each clip
      climbs a bitrate ladder until VMAF ≥ 88 vs its source, audio stripped,
      faststart, same R2 keys. The 69 clips on R2 are 1,368 MB; Al-Baqarah /
      Juz 1 clips are 8 s of 1080p at 7–58 Mbps. **Done 2026-10-07:** 57
      clips re-encoded and uploaded, 1,365 → 386 MB (−72%; Al-Baqarah 1,088
      → 310 MB), VMAF min 88.1 / median 91.2, each verified on R2 by size and
      played in the browser (Al-Fatihah 20.5 → 7.0 MB, Baqarah 08e 57.9 →
      17.2 MB); 12 light clips (≤0.4 MB) left as they were. Backup of the
      R2-only original (Al-Fatihah): `.media-work/originals/`; the rest are
      the local masters in `public/videos/`. **Missing clips fixed 2026-10-07:** the registries named 187
      clips, 125 never existed (103 Surahs got a guessed
      `/videos/surah/NNN-slug.mp4`; Aal-Imran listed 20 chapter clips, 3
      exist; 8 Al-Baqarah ayah clips) — each a 404, and the scene kept
      showing the PREVIOUS Surah's clip over the new image (seen: An-Nisa
      under Al-Fatihah's stream). Now `src/lib/data/videoManifest.ts`
      (generated by `scripts/tools/video-manifest.mjs`; re-run after
      uploading clips, `--check` to verify) lists the 62 clips on R2, the
      resolvers only return those, and a Surah without one shows its image.
      Aal-Imran 02a–02c point at their real files. Scene images: `scripts/tools/webp-images.mjs`
      (2026-10-07) makes a .webp beside each of the 288 JPEGs (114 Surah + 30
      Juz scenes + thumbnails), SSIM ≥ 0.97 each: scenes 164.8 → 49.8 MB
      (Al-Fatihah 798 → 159 KB), thumbs 3.4 → 2.2 MB; the app now asks for
      .webp (`quranImageUrl` / `quranThumbUrl`). **Uploaded 2026-10-07:** all
      288 on R2 (`image/webp`, verified by size; every URL the app builds
      returns 200), scene + cover + list thumbnails checked in the browser; Ya-Sin's clip is a 175 KB blue placeholder;
      (b) ~~on a very slow line the install prompt could arrive after the
      sheet opened and swap the steps~~ fixed 2026-10-07 (the bottom button
      becomes Install instead); (c) offline: no service worker, so the
      site can't open offline (audio offline handling: item 4); (d) a Surah
      link preloads its recitation (~3 MB) before play — kept, so play is
      instant for someone who followed a link.
- [~] **14. Accessibility** (2026-10-07) — axe-core 4.10 (browser) on the
      home screen, a Surah link, the 404 page and with each panel open
      (content browser, reciter, translation, Tajweed, favourites, views,
      comments): 0 violations except `meta-viewport` (below). Keyboard: every
      control reachable, all 26+ have a visible focus outline. **Fixed:**
      (1) the "Skip to content" link had no target on the home screen — now
      "Skip to player" (focus moves to the player region; 404 / error pages:
      "Skip to content" → `#main`), and the home is a `<main>` landmark;
      (2) dialogs: focus didn't move into them, Tab escaped to the page behind,
      and closing lost focus — `useDialogFocus` (`src/lib/useDialogFocus.ts`)
      on the content browser / favourites, every ActionSheet, the reciter
      popover and the install sheet: focus in, Tab trapped, Escape closes,
      focus back to the opener; the content browser had no dialog role / name
      (now `role="dialog"`, titled), its search box no label; (3) the Tajweed
      glyph words read as one long word to screen readers (no spaces between
      the hidden-glyph words' real text); (4) the progress bar announced raw
      seconds ("1056.34") — now "0:07 of 0:46" / "Ayah 3 of 7"; the speed
      button didn't say the speed ("Playback speed 1.25×"); (5) the compact
      player's cover was a button inside the seek slider (nested control) —
      the slider itself plays / pauses on Space; (6) Reduce Motion: framer
      animations ignored it (`MotionConfig reducedMotion="user"`; CSS ones
      already honoured it). Contrast: item 11 (the scene is darker now, 40%).
      Touch targets: item 8. **Known exception (owner's choice, 2026-10-07):**
      `user-scalable=no` / `maximum-scale=1` (layout.tsx) and the pinch
      blocking (MainLayout) stay — the app-like, no-zoom screen; WCAG 1.4.4
      fails on purpose (axe `meta-viewport`, critical). Not changed: the Tajweed
      popover is non-modal (focus stays on its button); the background video
      still plays with Reduce Motion on (image mode is one tap away).

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
