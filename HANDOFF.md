# 🕌 HuDa Web Quran — Project Handoff

> **For:** Antigravity / Claude / any AI assistant continuing this project  
> **Last Updated:** 2026-10-24  
> **Project Path:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)  
> **Live Production:** `https://huda-web-quran.vercel.app` (Vercel auto-deploys on push/merge to `main`)  
> **GitHub Repository:** `github.com/sarfpearl/huda-web-quran`  

---

## 1. Current Project Status

*Snapshot: 2026-10-24, after PR #130.*

| Item | Status |
| :--- | :--- |
| **App** | Quran-only: listen & read, 114 Surahs / 30 Juz, 51 reciters; Word Sync reciters highlight all 114 Surahs; IndoPak script live (QuranWBW font); verse/topic/voice search in content browser |
| **Repository** | `sarfpearl/huda-web-quran` (public) |
| **`main`** | `c1aa45b` — Merge PR #130: search clear button on the right; voice search as a gold floating button |
| **Latest merged PRs** | #130 search clear button & voice FAB · #129 fonts self-hosted (`next/font/local`) · #128 handoff snapshot & pipeline status · #127 Android player navigation bar clearance · #126 iOS search alignment, keyboard clearance, voice recognition · #125 Android player dock sizing, keyboard dismissal, scroll conflicts · #124 Share link sent to QuranWBW · #123 Surah 17 Al-Isra videos · #122 IndoPak nastaleeq & weekly check handoff · #121 Surah 16 An-Nahl videos · #120 Surah 15 Al-Hijr videos · #119 weekly IndoPak check · #118 IndoPak `text_indopak_nastaleeq` |
| **Open PRs** | none — #115 (IndoPak Tajweed prototype) closed unmerged 2026-10-24 after QuranWBW's review; branch `proto/indopak-tajweed` kept for reference |
| **Production** | [huda-web-quran.vercel.app](https://huda-web-quran.vercel.app) — auto-deploys `main` |
| **Video Production & R2 Storage** | Pipeline active for Surahs 18–34; Surahs 19, 23, 25, 26, 28, 30, 31, 32 video sets verified and added to `videoManifest.ts`; Cloudflare R2 Phase 3–8 cleanup & deduplication completed |

---

## 2. Completed Work

### Core Features & UI
1. **Quran Reading & Navigation Mode:**
   - Mushaf reading view for all 114 Surahs and 30 Juz.
   - Interactive Mushaf page picker, Sajdah indicators, last-read tracking, and bookmarks panel (`ReadingView.tsx`, `MushafPagePicker.tsx`, `BookmarksPanel.tsx`).
2. **Tajweed Auto-Hide:**
   - Quran.com-style QPC V4 COLRv1 page fonts (colours inside glyphs) + gold recited-word highlight.
   - Tajweed colours panel auto-hides after 4s idle timer (`TAJWEED_AUTO_HIDE_MS`), pauses on hover/focus, and resets when toggling the switch (`ImmersiveHeader.tsx`).
3. **Word & Voice Sync:**
   - 9 reciters with word-level acoustic sync using Quran.com QDC timings (`quranReciters.ts`, `quranVerses.ts`).
   - EveryAyah ayah-by-ayah sequence playback for Juz mode across all reciters (`playAyahSequence`).
   - Strict Indo-Pak Juz boundaries maintained.
   - Acoustic QA validation and fallback scripts (`scripts/qa/*`).

4. **Translations in 10 languages** (PR #12): English, Tamil + Urdu, Malayalam, Hindi, Indonesian, Bengali, Turkish, French, Malay, from alquran.cloud, built into `public/data/quran-translations/` (`scripts/generation/build-quran-translations.mjs`) and fetched per Surah when picked. First-visit language: browser language → place (country / Indian state) → time zone → English; a manual pick is remembered.
5. **First-open onboarding** (PR #12 + fixes): splash → location → Add to Home Screen → content browser, one at a time (`src/lib/onboarding.ts`). Waits for the location answer (Safari / Android quirks handled).
6. **IndoPak script by region — development-only** (PR #14): `public/data/quran-indopak/`, "Uthmani | IndoPak" picker in the Tajweed panel, region default. Enabled only in `next dev` or with `NEXT_PUBLIC_INDOPAK=1`, until the QuranWBW IndoPak font licence is granted (see `docs/TODO.md`).
7. **Quran-only app** (PR #12): the Bayan / talks section, YouTube engine and Bayan admin were removed; `/admin/comments` (comment moderation) kept.
8. **Media fully on R2:** artwork, list thumbnails (`assets/images/{surah,quran}/thumbs/`, served without Vercel Image Optimization), videos, preludes, 51 reciter portraits, and Maher's 30 full-Juz recordings (PR #13).

9. **Launch QA stack** (PRs #26–#45, 2026-10-07): Quran text / translation / word-sync / audio / navigation / reading / routes / responsive / Tajweed / theme / SEO / performance / a11y checks, each with its fixes (`docs/TODO.md` → *Launch QA*). Highlights: Surah / ayah / Juz deep links (#32), current prayer (waqt) in the header pill (#34), share button in the player (#40), 17 → 6 MB on open and CLS 0.30 → 0.01 (#38), Back closes sheets / pickers (#44), offline service worker `public/sw.js` (#45, #48).
10. **Media slimmed** (#41, #42, #51, #52): R2 background clips re-encoded (1,365 → 386 MB), scene images as WebP (164.8 → 49.8 MB), every Surah has a clip (manifest 62 → 171; only 16 Aal-Imran chapter clips missing). Replaced clips are versioned in `src/lib/data/videoVersions.ts` (R2 serves them immutable).
11. **Word Sync everywhere** (#61, #63, #65): Sudais timings improved; 18 Xing-VBR reciter streams re-hosted as CBR so seeks match the voice (falls back to the master); Surahs whose stream didn't match Quran.com timings got forced-alignment timings measured on the streamed audio (`scripts/generation/align-reciter-timings.py`) — `WORD_SYNC_UNAVAILABLE` is now empty.
12. **Phone / iPad feedback** (#54, #60, #66, #68, #69, #70): favicon, location explainer, 125% reading size on phones, lock-screen info + same-origin 512px artwork, round sheets, one audio at a time, iPhone player corners, iPad status-bar inset, Isti'adhah in the Mushaf fonts, Juz word tap, call resume.
13. **Location** (#25, #71–#73): place remembered; refreshed when the device has moved; *Update location* button in the prayer times sheet, with a "location updated" message.
14. **App language + Settings** (#74): UI language separate from the ayah meaning — English default, 10 languages (`src/lib/i18n/`, `t(lang, "English")`, localStorage `huda-ui-lang`); Settings (gear beside Close in the Surah & Juz sheet) holds it. Tamil at the Latin size; reading view opens at the heading; square lock-screen art.
15. **2026-10-11** (#76–#79):
    - **Supabase keep-alive** (#76): Vercel Cron (`vercel.json`) calls `/api/keepalive` daily at 03:17 UTC; it runs the read-only `get_quran_view_counts` RPC so the Free project never pauses. Optional `CRON_SECRET` limits the route to Vercel Cron.
    - **Juz Next** (#77): lock-screen / headset Next on a Juz's last ayah goes on to the next Juz (30 → 1), like the player's >| (`setAyahSequenceNext` in `AudioPlayerContext`, registered by `ImmersiveHomeClient`).
    - **Comment spam guard** (#78, #102): `supabase/migrations/20261011120000_quran_comment_spam_guard.sql` applied and verified live — links held for review, duplicate comments refused within 24h. Messages in all 10 languages.
    - **Aal-Imran clips** (#79): 16 scene prompts prepared; rendered on Mac and uploaded to R2 (all 03a–10b live HTTP 200).
16. **2026-10-11 → 2026-10-14** (#80–#104):
    - **IndoPak script & font live** (#100, #103, #104): QuranWBW granted written permission for the font and text (free, unmodified, credits). Self-hosted font `public/fonts/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2`. Script picker in Tajweed panel; Tajweed switch hidden in IndoPak.
    - **Next.js 15.5.27 + React 19** (#97): upgraded dependencies.
    - **Reading & Player UX**: Repeat / shuffle mode (#82); focus reading mode with full-screen text and auto-hiding controls (#90–#93); pinch-to-zoom text size (#95); seamless reciter switching continuing from the exact word/ayah (#101).
    - **Prayer times**: Zawal (solar noon) and Friday Jumu'ah display (#91); Sunset row (#86).
    - **All 187 background video clips active**: all 20 Aal-Imran chapters active in `videoManifest.ts` (manifest up from 171 to 187 clips, 0 missing).
    - **Storage consolidation**: 12.58 GB of video cache and redundant files safely cleaned up (`.media-work` cache, raw masters, QA frames, test renders). Single high-quality master format maintained (UHD 4K where available, 1080p for others). Total video storage reduced from 17.8 GB to 5.2 GB.

17. **Fonts self-hosted** (#129, 2026-10-24): Vercel builds failed now and then in `next/font/google` (PR #100, #104: `Cannot read properties of null (reading '1')` when Google served a font URL without an extension). The 8 families in `src/app/fonts.ts` (Poppins, Noto Serif Tamil, Amiri, Noto Nastaliq Urdu, Noto Sans Malayalam / Devanagari / Bengali, Noto Naskh Arabic — all OFL) are now woff2 files in `src/app/fonts/` with their licences, loaded by `next/font/local` with the same CSS variables, weights, `swap`, preload (Poppins only) and Google's subset `unicode-range`. Rebuild with `scripts/generation/build-self-hosted-fonts.py` (`pip install fonttools brotli`). The build no longer reaches Google.

### Cloudflare R2 Media Migration
- **Bucket:** `huda-quran-media`
- **Public R2 Base URL:** `https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`
- **Assets Uploaded:** **270 total files** (~2.84 GB total):
  - **Images:** 159 files (172.00 MB)
  - **Videos:** 109 files (2.68 GB)
  - **Audio:** 2 prelude files (297.26 KB)
- **Central Resolver:** `src/lib/media.ts` defines `mediaUrl(path)` which prepends `NEXT_PUBLIC_MEDIA_BASE_URL` when set, and gracefully falls back to local `/public` relative paths when unset.
- **Upload Tool:** `scripts/tools/upload-to-r2.mjs` provides safe, idempotent uploads using `@aws-sdk/client-s3` with dry-run default, concurrency queue, and skip-identical check.
- **Git Tracking Cleanup:**
  - Removed 177 previously tracked media files from Git tracking index (`git rm --cached`).
  - **100% of all local files preserved on disk**; zero files were deleted.
  - **Where the local copies actually live (checked 2026-10-05):**
    - Surah / Juz / bayan artwork → repo-root `assets/images/{surah,quran,bayan}/` (114 + 30 + 15 files, git-ignored via `/assets`), **not** `public/assets/images/`. Folder dates show they have been there since mid-September.
    - `public/assets/images/` now holds only `reciters/` (51 reciter portraits, also on R2).
    - Videos → `public/videos/{surah,juz}/`; prelude audio → `public/audio/prelude/`.
    - Consequence: with `NEXT_PUBLIC_MEDIA_BASE_URL` unset, local dev cannot load Surah artwork. Keep the variable set in `.env.local`.
  - `.gitignore` updated to ignore and protect:
    - `public/assets/images/`
    - `public/audio/prelude/`
    - `public/videos/`
    - `public/videos/**/qa_frames/`
    - `public/videos/**/test/`
    - `qa_frames/`

---

## 2a. 🎬 Automated Video Pipeline — IN PROGRESS (committed; status 2026-10-24)

> Pipeline code, skill, rules, tests, ledger and `data/progress.json` are in git (the large generated media stay out of git, on R2). Set up specifically for **Antigravity** to drive. It generates per-Surah cinematic background clips (Veo 3.1-fast + Gemini stills) in thematic 5–10 ayah sets, replacing the older ad-hoc clip scripts in §2 item 10/16.

- **Antigravity skill:** `.agents/skills/surah-video-production/SKILL.md` — Antigravity auto-discovers skills under `.agents/skills/<name>/SKILL.md`. Triggers on "complete video production for Surah N", "plan next clip", "advance Surah workflow", "remediate video defects".
- **Safety rules:** `.agents/rules/video-pipeline-gates.md` — strict **16-state lifecycle** per clip (`CLIP_PLAN_PENDING_APPROVAL` → … → `COMPLETED`), decoupled human approval gates (plan / image / video-gen / video-review / PR-merge / prod-deploy must each be separate approvals), the ₹600 INR hard-stop reserve floor must never be breached, verse text only from local `public/data/quran-verses/<surah>.json` (never fabricate/alter), resume polling instead of re-submitting a paid Veo op, and **never touch `videoManifest.ts` / R2 / Vercel during planning or local staging**.
- **Pipeline code:** `scripts/pipeline/` (new, ~10,350 lines) — `surah-orchestrator.mjs`, `surah-state-machine.mjs`, `surah-pipeline.mjs`, `generation-adapter.mjs` / `image-generation-adapter.mjs` (Veo + Gemini calls), `surah-qa-composite.mjs`, `visual-evaluator.mjs`, `seam-processor.mjs` (0.40s crossfade), `surah-staging.mjs`, `complete-pilot-postprocessing.mjs`, `surah-meaning-overrides.mjs`, `generate_surah114_storyboard_videos.mjs`.
- **Budget guard:** `scripts/tools/video-budget-guard.mjs` + ledger `docs/VIDEO_BUDGET_LEDGER.json` — project `project-04027e7d-9805-47dc-bdf` (Veo), cost **₹76.791/video** clip + ₹2.55/still, starting credit ₹28,796.63, hard-stop floor ₹600. As of the last ledger entry (2026-10-16T13:34): 16 successful generations, 0 failed, **₹27,550.12 remaining**.
- **Progress tracker:** `data/progress.json` — `pipelineVersion 1.0.0`, `currentSurah: 17`, `completedSurahCount: 22`.
  | Surah | Status | Notes |
  | :--- | :--- | :--- |
  | 3 | `LOCAL_APPROVED` | 117/200 ayahs done, **83 pending** — not yet deployed |
  | 4–17 | `DEPLOYED` | all ayahs; 15–17 via PR #120, #121, #123 |
  | 19, 23, 25, 26, 28, 30, 31, 32 | `DEPLOYED` | owner approved all 78 sets on 2026-10-25 (approval board); on R2 and in `videoManifest.ts` (PR #128) |
  | 18, 20–22, 24, 27, 29, 33–114 | — | not started |
- **QA review files (repo root):** `review_surah_16.html`, `review_surah_17.html` are in git; earlier ones (`review_surah_3.html` …) stay local — human-facing composite review pages per Surah, one set per thematic clip, generated by `surah-qa-composite.mjs`.
- **Tests:** `tests/pipeline/image-video-lifecycle.test.mjs`, `tests/pipeline/visual-evaluator.test.mjs`.
- **For Antigravity, pick up here:**
  1. Surah 3 is mid-flight (`LOCAL_APPROVED`, 83 ayahs still pending) — finish its remaining sets before moving on, or confirm with the owner whether to deploy what's done first.
  2. ~~Surahs 19, 23, 25, 26, 28, 30, 31, 32~~ — done: owner approved all 78 sets (2026-10-25), `DEPLOYED` in `data/progress.json`.
  3. Surah 18 and the other not-started Surahs: run the orchestrator fresh per the skill's "plan next clip" flow.
  4. Check `docs/VIDEO_BUDGET_LEDGER.json`'s `estimatedRemainingCreditINR` before any new paid generation, and never let it cross the ₹600 floor.
  5. Keep per-Surah video assets (large media) out of git — the sandboxed git proxy push 408s on big pushes.

---

## 3. Production R2 Media Issue — ✅ RESOLVED (verified 2026-10-05)

- **Cause:** Vercel env var `NEXT_PUBLIC_MEDIA_BASE_URL` was saved with a trailing `"4f"` (`…r2.dev4f`) → DNS failure (503) and `/_next/image` rejections (400).
- **Fix:** Env var corrected in Vercel Project Settings to `https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`, then production redeployed. No code change was needed.
- **Live verification on `https://huda-web-quran.vercel.app` (2026-10-05):**
  - Server HTML contains **no** `r2.dev4f`; Al-Fatihah artwork URL is `https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev/assets/images/surah/001-al-fatihah.jpg?v=23`.
  - Direct R2 image → HTTP 200; `/_next/image?url=<r2 url>` → HTTP 200.
  - Browser (desktop): Surah list — **120/120 images loaded, 0 broken**; Juz list — **30/30 Juz thumbnails loaded, 0 broken**; no console errors.
  - Background video `videos/surah/001-al-fatihah.mp4` streams from R2 (`readyState 4`, no error).
  - Prelude audio: playing Al-Fatihah fetched `audio/prelude/istiadhah-only-prelude.mp3` from R2, stopped at 6.6s, and handed over to the reciter (`quranicaudio …/1.mp3`) — no double Bismillah. `bismillah-prelude.mp3` on R2 returns 200/206.
  - Mobile width: Surah panel thumbnails and background video load, 0 broken images.

---

## 4. Current Work Items / Next Steps

### Open

*Checklist for the next conversation: `docs/TODO.md` → "Open items".*

- [ ] **Primary next step (Antigravity):** continue the automated video pipeline — see §2a. Finish Surah 3's remaining 83 ayahs, deploy the `LOCAL_APPROVED` Surahs (19, 23, 25, 26, 28, 30, 31, 32), then Surah 18 and the rest.

- [x] Removed `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` from Vercel (2026-10-06) — only the local upload tool uses them; the app never reads them (they're not `NEXT_PUBLIC_`, so they don't reach the browser).
- [x] **IndoPak font licence:** granted by QuranWBW (2026-10-11); font self-hosted and live (PR #100, #103, #104).
- [x] Supabase test data cleared (2026-10-07).
- [x] **Comment spam guard:** migration applied and verified live on Supabase (PR #78, #102).
- [x] Supabase Free-plan pause — daily Vercel Cron → `/api/keepalive` (2026-10-11). No automatic backups on Free — see `docs/TODO.md`.
- [x] **16 Aal-Imran chapter clips:** rendered, verified live on R2, and active in `videoManifest.ts` (all 187 clips live, 0 missing).
- [x] **Surah 2 (Al-Baqarah) Final Verification (2026-10-15):** All 44 chapters covering Verses 1–286 verified 100% continuous (0 gaps), all 44 video assets confirmed live HTTP 200 on R2, 8 real-footage Ayah clips verified, real vs synthetic video registries audited.
- [x] **Video storage consolidation (2026-10-14):** 12.58 GB freed by removing redundant raw masters, QA frames, test renders, and `.media-work` cache; single high-quality master format (UHD 4K where available, 1080p for others).
- [x] **IndoPak Tajweed colours — prototype shelved (PR #115 closed 2026-10-24).** Al-Baqarah 1–20 drawn glyph by glyph (SVG) in the Uthmani QPC V4 colours; QuranWBW approved the approach (2026-10-19) and reviewed the live preview. Their reply (2026-10-23): the new `text_indopak_nastaleeq` text "works perfectly", but the prototype breaks on multi-letter glyphs and the Tajweed colours are not exactly right (~65–70%) — a good prototype, not production level; they prefer no half-cooked Tajweed and suggest waiting, as most users read plain black/white text. So IndoPak stays without Tajweed until QuranWBW releases their IndoPak Tajweed font. Vercel Share for `proto/indopak-tajweed` set back to "Only people with access" (2026-10-24).
- [ ] Real-phone checks still open: lock-screen artwork / controls, headphone / Bluetooth buttons, a call interrupting, Juz with the screen locked, Android Back — `docs/TODO.md` → *Open items*.
- [x] Old Bayan tables dropped and no Bayan storage buckets left in Supabase (2026-10-07). R2 still holds unused `assets/images/bayan/*.jpg`; keep `bayan/quran.jpg` (Quran fallback cover).

### Next conversation — start here
1. Mondays: the **IndoPak text check** Action — an issue "IndoPak text changed on Quran.com" means re-run `dump-indopak-nastaleeq.mjs` + `fetch-indopak-words.mjs`, review, PR.
2. Still open from before: the video pipeline (§2a) and the real-phone checks (above).
3. IndoPak Tajweed: only when QuranWBW releases their IndoPak Tajweed font (PR #115 shelved).

### Done (2026-10-24)
- [x] **PR #130** `fix/search-clear-and-voice-fab`: search clear button moved right; voice search as a gold floating button.
- [x] **PR #129** `fix/self-host-fonts`: fonts self-hosted (§2 item 17); Vercel preview build passed.
- [x] **PR #127** `fix/android-player-navigation-bar-clearance`: Android 3-button navigation bar clearance with `max(env(safe-area-inset-bottom,0px), var(--vv-bottom,0px))` on player dock and reading view; scope standalone html/body height and minHeight stretch to iOS only.
- [x] **PR #126** `fix/ios-search-alignment-and-voice-input`: iOS search under-alignment fixed, 20px threshold for iPad floating shortcut bar, streaming voice recognition with Web Speech API, and `#search`/`#browse` deep links.
- [x] **PR #125** `fix/mobile-player-keyboard-scroll`: Android virtual keyboard auto-dismiss on search result tap and scroll, pause teleprompter followScroll on touch/wheel, clamp `--vv-bottom` to 0 when not typing, compact pill player default on mobile (< 768px).
- [x] **Cloudflare R2 Storage Capacity & Cleanup Audit**: 7-phase cleanup completed; consolidated video storage and deduplication reports (`docs/R2_STORAGE_CAPACITY_REPORT.md`, `docs/STAGE1_R2_COMPRESSION_ROLLOUT_REPORT.md`, `docs/FINAL_VIDEO_CLEANUP_AND_VALIDATION_REPORT.md`).
- [x] **Surah Video Manifest Expansion**: Video sets for Surahs 19, 23, 25, 26, 28, 30, 31, 32 verified and registered in `src/lib/data/videoManifest.ts` and `data/progress.json`.

### Done (2026-10-19 → 2026-10-23)
- [x] **PR #124** `docs/handoff-share-link`: Share link sent to QuranWBW; documentation refresh.
- [x] **PR #123** `feat/surah-17-al-isra`: Complete video production and manifest integration for Surah 17 Al-Isra.
- [x] **PR #122** `docs/handoff-2026-10-19`: IndoPak text switched to `text_indopak_nastaleeq`, weekly check workflow.
- [x] **PR #121** `feat/surah-16-an-nahl`: Complete video production and manifest integration for Surah 16 An-Nahl.
- [x] **PR #120** `feat/surah-15-al-hijr`: Complete video production and manifest integration for Surah 15 Al-Hijr.

### Done (2026-10-18 → 2026-10-19)
- [x] **PR #118** `fix/indopak-nastaleeq-text`: IndoPak text switched to Quran.com's `text_indopak_nastaleeq` (QuranWBW's request — `text_indopak` is deprecated) and drawn as it comes: #116's sukun swap removed (the new text's sukun is already the jazm). Placed on the words by letters against the glyph data's Uthmani words; fixes a few shifted verses (56:45, 74:46, 93:7, 103:3).
- [x] **PR #119** `chore/indopak-text-check`: weekly GitHub Action (Mondays 03:17 UTC, or Actions → Run workflow) — opens an issue "IndoPak text changed on Quran.com" if the text differs from our copy; never changes the data. First run 2026-10-19: no change.
- [x] QuranWBW asked (owner's email, 2026-10-18) and answered (2026-10-19): glyph-by-glyph Tajweed drawing acceptable; use `text_indopak_nastaleeq`; their own IndoPak Tajweed fonts are years away.

### Done (2026-10-14 → 2026-10-15)
- [x] PR #105 merged: Video manifest updated (all 187 clips active) and HANDOFF refresh.
- [x] PR #106 merged: Audio Only reading auto-scroll and follow jumps on seek drag.
- [x] Surah 2 final verification: all 44 chapters and 8 Ayah clips verified live on Cloudflare R2; registries separated.
- [x] Video pipeline QA: 0.40s loop crossfade POC and mobile portrait vs CSS object-cover evaluated.
- [x] PRs #80–#104 merged and live — see §2 item 16 and §6.

### Done (2026-10-11)
- [x] PRs #75–#79 merged — see §2 item 15 and §6.

### Done (2026-10-07 → 10-10)
- [x] PRs #24–#74 merged and live — see §2 items 9–14 and §6.

### Done (2026-10-05 → 10-06)
- [x] Production R2 media issue (`.r2.dev4f` typo) resolved and verified live (§3).
- [x] 51 reciter portraits moved off Pinterest to R2 (PR #9).
- [x] README refreshed; HANDOFF media locations corrected (PR #10).
- [x] 13 untracked files resolved (PR #11).
- [x] Bayan removed, translations ×10, onboarding (PR #12).
- [x] Maher's full-Juz audio moved off archive.org to R2 (PR #13): 30 files (~1.36 GB) at `audio/juz/maher/para-NN.mp3`; masters in git-ignored `assets/audio/juz/maher/`; `upload-to-r2.mjs --category=audio-juz`. Para 30 is 320 kbps (173 MB), others 128 kbps. **Not played by the app** (checked 2026-10-06): picking a Juz plays it ayah-by-ayah for every reciter, Maher included (`handleSelectJuz` in `ImmersiveHomeClient.tsx`); the files stay on R2 as the masters' backup.
- [x] IndoPak script, development-only (PR #14).
- [x] HANDOFF status + README 10 languages (PR #15); merged remote branches deleted (only `main` remains).
- [x] `NEXT_PUBLIC_DATA_SOURCE` — already absent from Vercel and `.env.local`; nothing to remove.
- [x] **`NEXT_PUBLIC_SITE_URL` added in Vercel** (Production, type Config) and redeployed. It was missing, so `sitemap.xml`, `robots.txt`, the canonical link and `og:url` all said `http://localhost:3000`. Verified live 2026-10-06: all now `https://huda-web-quran.vercel.app`.
- [x] **GCP budget alert** set (owner, 2026-10-06): "HuDa monthly budget", ₹1,000 / month, alerts at 50% / 90% / 100%, on project "Huda Quran Web" = `gen-lang-client-0172381348` (the Vertex/Veo video project). Alerts only email; they don't stop spending. ~₹3,560 of free credit was left at the time.
- [x] **Share image** (PR #17): `src/app/opengraph-image.jpg` + `twitter-image.jpg` (HuDa logo + Quran artwork, 1200×675, 213 KB); Next.js file convention, absolute URLs via `metadataBase`.
- [x] **Open items checklist** (PR #18): `docs/TODO.md` → "Open items" lists the four owner actions with exact steps.
- [x] **Admin login** (PR #21): `/admin/comments` signs in with an email magic link (Supabase Auth + `public.admins`); moderator key removed. Owner setup done and verified live 2026-10-06. Admin = `sarf.pearl@gmail.com`. Supabase's built-in email only sends to the org's team members and ~2 emails/hour; add custom SMTP (e.g. Resend) before adding other admins. If a link lands on `localhost:3000`, the Site URL / Redirect URLs in Auth → URL Configuration are wrong.
- [x] **Per-IP limits** (PR #23): max 30 new browser ids per IP per day (views / live / likes) and 20 comments per IP per hour; salted IP hash only. Live 2026-10-06, verified (see `docs/TODO.md`). The 2026-09-26 comment likes/replies migration was found unapplied and run at the same time — **check `supabase/migrations/` against the live DB when something comment-related misbehaves.**

---

## 5. Git / Uncommitted Work

*2026-10-24: the pipeline work listed here on 2026-10-18 (`.agents/`, `AGENTS.md`, `data/progress.json`, `docs/VIDEO_BUDGET_LEDGER.json`, `scripts/pipeline/`, `scripts/tools/video-budget-guard.mjs`, `tests/pipeline/`) is now committed. Run `git status` on the owner's Mac before starting: anything left there (local `review_surah_*.html`, `scratch/` media) is not in git — keep large media out.*

> [!WARNING]
> **Two AI sessions edited the same checkout at the same time on 2026-10-06.** One session's onboarding work was briefly swept into another's commit, and a commit landed on the wrong branch (fixed by cherry-picking onto a fresh branch). Run **one session per checkout**, or give each session its own `git worktree`. Before committing, run `git status` and stage files by name, not `git add -A`. **This applies directly to the Claude ↔ Antigravity handoff now** — if both touch this checkout at once, expect the same collision.

---

## 6. Important Git History

- `c1aa45b` — **PR #130** `fix/search-clear-and-voice-fab`: search clear button on the right; voice search as a gold floating button (ai-mic icon)
- `e544fa5` — **PR #129** `fix/self-host-fonts`: UI and script fonts self-hosted with `next/font/local` (no Google Fonts at build time)
- `762232a` — **PR #128** `docs/handoff-and-task-sync-2026-10-24`: handoff snapshot, video manifest, pipeline status, storage audit reports
- `91b7fc2` — **PR #127** `fix/android-player-navigation-bar-clearance`: Android 3-button navigation bar clearance and standalone layout overflow
- `6ec25e4` — **PR #126** `fix/ios-search-alignment-and-voice-input`: iOS search under-alignment, keyboard clearance, and voice recognition
- `6d8cf51` — **PR #125** `fix/android-mobile-player-keyboard-scroll`: Android player dock sizing, keyboard dismissal, and scroll conflicts
- `db4638a` — **PR #124** `docs/handoff-share-link`: Share link sent to QuranWBW
- `faa4be5` — **PR #123** `feat/surah-17-al-isra`: Complete video production and manifest integration for Surah 17 Al-Isra
- `a0c3ee8` — **PR #122** `docs/handoff-2026-10-19`: IndoPak text switched to `text_indopak_nastaleeq`, weekly check workflow
- `4f686dc` — **PR #121** `feat/surah-16-an-nahl`: Complete video production and manifest integration for Surah 16 An-Nahl
- `fefd7a0` — **PR #120** `feat/surah-15-al-hijr`: Complete video production and manifest integration for Surah 15 Al-Hijr
- `a32855a` — **PR #119** `chore/indopak-text-check`: weekly GitHub Action — issue when Quran.com's IndoPak text changes
- `543ed99` — **PR #118** `fix/indopak-nastaleeq-text`: IndoPak text → `text_indopak_nastaleeq`, drawn as it comes (no sukun swap)
- `7a028ab` — **PR #117** `chore/sw-cache-v3`: bump service-worker cache VERSION v2 → v3
- `11f0613` — **PR #116** `fix/indopak-sukun-justify`: sukun renders as filled jazm; tighten immersive & justify reading
- `fff9898` — **PR #114** `perf/search-index-split`: verse search index split by language, loaded on demand
- `b071351` — **PR #113** `fix/waqf-legend-centre`: optically centre each waqf sign by its ink
- `8363c8f` — **PR #112** `fix/search-above-tabs`: move search box above the Surah/Juz tabs
- `7f14c54` — **PR #111** `fix/indopak-ayah-gap`: scale ayah-number ↔ waqf gap with Arabic size
- `1ac5f01` — **PR #110** `fix/indopak-ayah-overlap`: stop ayah-number ornament overlapping waqf marks
- `620f7aa` — **PR #109** `feat/content-search`: verse, topic & voice search in the content browser
- `38eb0bd` / `34772e3` — **PR #107** `docs/indopak-tajweed-note`: IndoPak Tajweed colours wait on QuranWBW's future font
- `c6777f2` — video: bump video versions for remediated Surah 3 clips 01a, 02c, 10a
- `a8f1c40` — docs: separate authentic real-footage registry from synthetic AI registry; verify Surah 2
- `e2188c3` — **PR #104** `fix/indopak-panel-divider`: no stray divider under the script picker in IndoPak
- `cc5f628` — **PR #103** `fix/indopak-hide-tajweed`: hide the Tajweed switch in IndoPak
- `09e9503` — **PR #102** `docs/todo-spam-guard-done`: comment spam guard is live; backups deferred
- `a8b2046` — **PR #101** `fix/reciter-change-reading-scroll`: carry on word by word when reciter changes
- `45723a6` — **PR #100** `feat/indopak-font`: ship IndoPak with QuranWBW font (permission granted)
- `0b54dde` — **PR #99** `fix/source-map-js`: source-map-js 1.2.1 → 1.2.2
- `e054d3f` — **PR #98** `fix/supabase-ip-hardening`: trust only cf-connecting-ip; caps hold under concurrency
- `c695c85` — **PR #97** `feat/next15-react19`: Next.js 15.5.27 + React 19
- `d6ff4d4` — **PR #96** `fix/no-auto-browser-after-tap`: don't auto-open Surah browser once visitor taps
- `1bbda98` — **PR #95** `fix/reader-pinch-textsize-boxes`: pinch to size text; Live count back in compact player
- `e98c852` — **PR #94** `fix/standalone-audio-blocked-notice`: notice when home-screen app gets no sound
- `a3b5c37` — **PR #93** `fix/reading-focus-flicker`: no full-screen flicker on short Surahs
- `41cdb67` — **PR #92** `feat/remember-translation`: remember translation toggle per browser
- `fe450c3` — **PR #91** `feat/prayer`: Zawal row, Jumu'ah on Fridays (sheet and time pill)
- `5f0f090` — **PR #90** `feat/reading-focus-full-colour`: focus reading mode uses whole screen
- `7ffb24f` — **PR #89** `fix/ipad-resume-player`: fix recitation stuck silent after app switch
- `5eb62fc` — **PR #88** `fix/supabase-raise-ip-caps`: raise per-IP limits (500 new browsers/day, 60 comments/hr)
- `a5c2686` — **PR #87** `fix/supabase-function-grants`: close internal helper functions to API
- `3afebc9` — **PR #86** `fix/home-pills-sunset`: location follows device, Sunset row in prayer times
- `f2be116` — **PR #85** `feat/settings-language-row`: App language row opens its own page
- `afd375f` — **PR #84** `feat/comment-name-step-ux`: clearer name step with save icon
- `e85b2df` — **PR #83** `feat/reading-mode-toast-dim`: mode toast + dim unread glyph words
- `d87f8c6` — **PR #82** `feat/repeat-next-shuffle-mode`: repeat / next / shuffle player modes
- `0c7bc1c` — **PR #81** `fix/harden-next-artwork`: harden Next.js and artwork image processing
- `18251b2` — **PR #80** `docs/handoff-status-1011b`: HANDOFF status after PR #79
- `289ac85` — **PR #79** `feat/imran-clips-batch`: batch script + 16 prompts for Aal-Imran 03a–10b
- `46cfb6b` — **PR #78** `fix/comment-spam-guard`: links held for review, duplicates refused (migration to run)
- `22fb33d` — **PR #77** `fix/juz-next-at-last-ayah`: Next on a Juz's last ayah → next Juz
- `362ef5e` — **PR #76** `fix/supabase-keepalive`: daily Vercel Cron → `/api/keepalive`
- `dbfcfe4` — **PR #75** `docs/handoff-status-1011`: HANDOFF status after PR #74 (supersedes #50)
- `eddd18d` — **PR #74** `fix/square-art-lang-reading-head`: Settings + app language (10), Tamil size, square lock-screen art
- `79086f9` / `e5179cc` / `b1728aa` — **PRs #73 / #72 / #71**: location refresh, Update location button + feedback, one sheet at a time
- `9bd674c` — **PR #70** `fix/ipad-qa-batch`: iPad QA batch, word-timing load failure no longer pins the ayah glow
- PRs #66 / #68 / #69 (2026-10-09): Back-entry without user activation, iPhone player corners / iPad inset, Isti'adhah glyph font
- PRs #61 / #63 / #65 (2026-10-09): Sudais timings, CBR reciter streams, forced-alignment word timings for every Surah
- PRs #51–#54, #60 (2026-10-07/08): Surah clips (62 → 171), clip versioning, owner's phone feedback, lock-screen artwork
- PRs #26–#49 (2026-10-07): Launch QA stack, waqt pill, share, offline, WebP / re-encoded media, Supabase cleanup docs
- PRs #20–#25 (2026-10-06): admin magic-link login, per-IP limits, remembered location
- `b6cee90` — **PR #19** `docs/handoff-status-1006b`: HANDOFF status after PR #18
- `65dea7d` — **PR #18** `docs/todo-open-items`: Open items checklist in `docs/TODO.md`
- `317815f` — **PR #17** `feat/og-share-image`: share image for link previews
- `a439624` — **PR #16** `docs/handoff-env-vars`: `NEXT_PUBLIC_SITE_URL` added, env-var table
- `869c03a` — **PR #15**: HANDOFF status, README 10 languages
- `5b1c970` — **PR #14** `feat/indopak-script`: IndoPak script by region (dev-only)
- `f5360e4` — **PR #13** `feat/maher-juz-audio-r2`: Maher full-Juz audio on R2
- `427b28b` — perf: Surah/Juz list thumbnails straight from R2
- `83039a6`, `c3f9373`, `bf4dacf` — onboarding fixes (location prompt, Android)
- `ad318cf` — chore: remove unused `public/images` (served from R2)
- `d92ccb2` — **PR #12** `feat/remove-bayan`: Quran-only app, 10 translation languages, onboarding, UI polish
- `1fc0472` — **PR #11**: generation scripts + QA report committed; logos moved to `assets/brand/`
- `bbe94d7` — **PR #10**: README refresh, HANDOFF media locations
- `c6baafd` — **PR #9**: reciter portraits on R2
- `74f3ca6` — docs: production R2 issue marked resolved
- `0305b5a` — **PR #8** `feat/tajweed-autohide` (incl. `967a134` R2 media migration)
- Older: PR #7 About polish · #6 content browser + About · #4 reading-mode page navigation · #3 word / voice sync

---

## 7. Environment Configuration

### Required Environment Variables (Names and Purposes Only)

| Variable Name | Environment | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Vercel (Production/Preview) & `.env.local` | Public base URL for R2 CDN media delivery (`https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`) |
| `R2_ACCOUNT_ID` | Local `.env.local` | Cloudflare account ID for S3 SDK upload tool |
| `R2_ACCESS_KEY_ID` | Local `.env.local` (local only; removed from Vercel) | Cloudflare R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | Local `.env.local` (local only; removed from Vercel) | Cloudflare R2 API token secret access key |
| `R2_BUCKET_NAME` | Local `.env.local` | Cloudflare R2 bucket name (`huda-quran-media`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production & `.env.local` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production & `.env.local` | Supabase anonymous client key |
| `NEXT_PUBLIC_SITE_URL` | Vercel Production (Config) | Canonical site URL `https://huda-web-quran.vercel.app` for sitemap, robots, canonical and `og:url`. Without it they fall back to `http://localhost:3000`. Not needed locally. |
| `CRON_SECRET` | Vercel Production (optional) | Vercel sends it to `/api/keepalive`; when set, other callers get 401 |
| `NEXT_PUBLIC_INDOPAK` | Optional | `1` turns on the IndoPak script outside `next dev` — only once the font is licensed |

> [!CAUTION]
> Never commit `.env*` files or log secret credential values in code, terminals, or documentation.

---

## 8. Verification Status

| Check / Test | Result | Notes |
| :--- | :---: | :--- |
| `npm run typecheck` | ✅ **PASS** | 0 TypeScript errors |
| `npm run lint` | ✅ **PASS** | 0 blocking errors (only standard hook dependency warnings) |
| `npm run build` | ✅ **PASS** | 7/7 static pages (`/`, `/admin/comments`, 404, robots, sitemap) |
| **R2 Upload Verification** | ✅ **PASS** | Original 270 files + 51 reciter portraits + 30 Juz MP3s verified (200, sizes match) |
| **Production Deployment Image Loading** | ✅ **PASS** | Verified live in browser 2026-10-05 (see §3) |
| **Live site after PR #12–#13** | ✅ **PASS** | 2026-10-06: old Bayan routes 404, `/admin/comments` 200, reciter photos and video load, bundle uses the R2 Juz path |
| **Juz playback in the app** | ✅ **PASS** | 2026-10-06, live, checked from audio events + network (not by ear). Every reciter, Maher included, plays a Juz ayah-by-ayah from everyayah.com. Juz 1 (Alafasy): Isti'adhah → 1:1–1:7 → Bismillah → 2:1…, 148 ayahs. Juz 10 (Maher): starts 8:41, 128 ayahs (Indo-Pak), 8:75 → 9:1 with no Bismillah. No console errors. Maher's R2 full-Juz files (`audio/juz/maher/para-NN.mp3`) return 200 but the app does not play them (see §4). |

---

## 9. Handoff Notes for Claude

1. **What has already been completed:**
   - All 270 media files (images, videos, prelude audio) were successfully uploaded to Cloudflare R2 bucket `huda-quran-media`.
   - `src/lib/media.ts` was implemented and all 15 app components and data files route media paths through `mediaUrl()`.
   - `next.config.mjs` was updated with `pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev` in `images.remotePatterns`.
   - Media tracking deletions (177 files) and ignore rules were committed (`967a134`) and merged to `main` via PR #8.
   - All local files are physically preserved on disk (artwork under repo-root `assets/images/`, see §2).

2. **Production media issue (resolved):**
   - `NEXT_PUBLIC_MEDIA_BASE_URL` had an extra `"4f"` (`.r2.dev4f`). Corrected in Vercel and redeployed; verified live on 2026-10-05 (images, Juz thumbnails, video, prelude audio all load from R2).

3. **What must NOT be changed unnecessarily:**
   - Do NOT delete or move any local media files under `assets/images/`, `public/assets/images/`, `public/videos/`, or `public/audio/prelude/`.
   - Do NOT commit the untracked generation scripts or logo files unless asked.
   - Do NOT modify audio preludes or Indo-Pak Juz boundary logic.
   - Do NOT change `mediaUrl()` logic — it is verified correct.

4. **Where to continue from:**
   - The open items in §4. Start each task on a fresh branch off `main`, one session per checkout (§5).
   - If media ever breaks again: first check the Vercel env var value, then redeploy **without** build cache.

---

## 10. Services & Accounts

No secret values here — those live only in `.env.local` (git-ignored) and Vercel's env settings.

### Accounts we manage

| Service | Purpose | Account / ID |
| :--- | :--- | :--- |
| **Claude** (Claude Code) | Writing and testing code, PRs, this handoff | `sarf.pearl@zohocorp.com` |
| **Antigravity** (Google AI IDE) | Second AI assistant; this file was first written for it | Account not recorded |
| **GitHub** | Source code, PRs, history | User `sarfpearl` · repo `sarfpearl/huda-web-quran` (**public**) · commit author `sarf-pearl` |
| **Vercel** | Hosting; auto-deploys `main`, preview per PR | Team `hu-da-right-guidance` (`team_wteEbzTnEOJuAid754cd4N78`) · project `huda-web-quran` (`prj_OSs76BUbUlrTpgDxbOkJHTDg35Sz`) · `huda-web-quran.vercel.app` |
| **Cloudflare R2** | All media: artwork, videos, prelude audio, reciter portraits, Maher's full-Juz audio | Bucket `huda-quran-media` · public URL `pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev` · account ID in `R2_ACCOUNT_ID` |
| **Supabase** | Surah/Juz views, likes, comments (anonymous RPCs); comment moderation | Project ref `astqipbwohonowaoufwi` |
| **Google Cloud – Vertex AI (Veo)** | Generating the Surah/Juz background videos (`scripts/generation/generate_vertex_*.mjs`); not used at runtime | Project `gen-lang-client-0172381348` |

### Free third-party services (no account)

| Service | Purpose | Where |
| :--- | :--- | :--- |
| quranicaudio.com | Audio for the 9 Word Sync reciters | `quranReciters.ts` |
| Quran.com API (QDC / qurancdn) | Word timings, QPC V4 Tajweed fonts, IndoPak text (`text_indopak_nastaleeq`) — fetched by scripts; the IndoPak text is checked weekly for changes | `fetch-reciter-timings.mjs`, `fetch-qpc-v4.mjs`, `dump-indopak-nastaleeq.mjs` + `fetch-indopak-words.mjs`, `.github/workflows/indopak-text-check.yml` |
| mp3quran.net | Audio for the other 42 (Audio Only) reciters | `quranReciters.ts` |
| everyayah.com | Per-ayah clips so any reciter can recite a Juz | `EVERYAYAH_FOLDERS` |
| alquran.cloud | Translations (10 languages), built into `public/data/quran-translations/` by script | `build-quran-translations.mjs`, `quranVerses.ts` |
| OpenStreetMap Nominatim | City name in the header clock widget | `TimeLocationWidget.tsx` |

---

## 🧠 Architectural Rules That Must Not Be Broken

1. **Audio and word timings must come from the same source:** Word timings come from Quran.com QDC and match quranicaudio files. 9 reciters have them (sudais, alafasy, dosari, abdulbaset, minshawi, hussary, shuraim, shatri, tunaiji). Where a streamed recording doesn't match QDC, timings are forced-aligned on that same stream (`align-reciter-timings.py`). Never borrow another reciter's timings.
2. **Repeated words:** map QDC segments by `wordIndex`, drive the active word from `verse.wordSegments`.
3. **Surah 1** = Isti'adhah prelude clip (cut at 6.60s) → reciter's own Bismillah → ayahs. **Surahs 2–114** (never 9) open with Bismillah: Dosari 2–78 embeds his own; others get `bismillah-prelude.mp3`. Audio Only reciters get no prelude. Never double the Bismillah.
4. **Juz boundaries are Indo-Pak**, not King Fahd/Madani (differ at Juz 4, 7, 11, 20, 21, 23). Don't "correct" them from quran.com.
5. **Juz with any reciter** = everyayah.com per-ayah clips (`EVERYAYAH_FOLDERS`).
6. **Arabic text:** use `text_qpc_hafs` with Hafs v0.18. Never edit Quran text to fix rendering.
7. **Tajweed:** QPC V4 COLRv1 glyph fonts (one glyph per word).
8. **Keep features focused and minimal:** Maintain simple design system, no unnecessary heavy layers.
9. **Quran only:** Bayan / talks / YouTube were removed on 2026-10-06. Don't reintroduce them unless the owner asks.
10. **IndoPak follows QuranWBW's permission:** their font self-hosted unmodified, Quran.com's `text_indopak_nastaleeq` drawn as it comes (no code-point changes), credits shown, app free with no ads. No IndoPak Tajweed until QuranWBW's own IndoPak Tajweed font (glyph-by-glyph prototype PR #115 rejected by them as not production level) — never CSS colour on the text.
11. **One AI session per checkout** (or separate worktrees); stage files by name.
