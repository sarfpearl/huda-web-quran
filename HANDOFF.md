# 🕌 HuDa Web Quran — Project Handoff

> **For:** Antigravity / Claude / any AI assistant continuing this project  
> **Last Updated:** 2026-10-05  
> **Project Path:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)  
> **Live Production:** `https://huda-web-quran.vercel.app` (Vercel auto-deploys on push/merge to `main`)  
> **GitHub Repository:** `github.com/sarfpearl/huda-web-quran`  

---

## 1. Current Project Status

| Item | Status |
| :--- | :--- |
| **Project** | HuDa Web Quran |
| **Repository** | `sarfpearl/huda-web-quran` |
| **Current Local Branch** | `feat/tajweed-autohide` (tracking `origin/feat/tajweed-autohide`) |
| **Current HEAD Commit** | `967a134` (`feat: migrate media assets to Cloudflare R2`) |
| **Main Branch Status** | `origin/main` is at `0305b5a` (includes PR #8 merge) |
| **Latest Merged PR** | **PR #8** (`Merge pull request #8 from sarfpearl/feat/tajweed-autohide`) |
| **Production URL** | [https://huda-web-quran.vercel.app](https://huda-web-quran.vercel.app) |
| **Current Deployment Status** | Ready on Vercel (Latest deployment: `dpl_HoYo3QmoL3jGcrwktymwMspSzZSg` / `huda-web-quran-luszzbh9m-...`) |

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

- [x] Production build uses the corrected `NEXT_PUBLIC_MEDIA_BASE_URL` (no `.dev4f`).
- [x] Direct R2 image URL and `/_next/image` optimized requests return 200.
- [x] Surah + Juz thumbnails, background video and prelude audio load from R2 in production.
- [ ] Decide what to do with the 13 untracked files (logos ~2.8 MB / ~3.7 MB — host on R2 or compress; rename `Logo_with Name.png` to drop the space; keep or drop `scripts/generation/generate_vertex_*.mjs` and `scripts/qa/results/repairs.json`). Do not commit without the owner's go-ahead.
- [x] Reciter portraits moved off Pinterest hotlinks: all 51 now self-hosted on R2 at `assets/images/reciters/<id>.jpg` (via `mediaUrl()`). The Juz "Maher" speaker image (already 403 on Pinterest) now reuses `reciters/maher.jpg`.
- [ ] `README.md` is stale (points to a HANDOFF "roadmap/directory structure" that no longer exists; omits Tajweed, Word Sync, R2). `YOUTUBE_MUSIC_GUIDE.md` describes the older bayan/YouTube player — confirm whether it is still relevant.
- [ ] Start new work from a fresh branch off `main` (`feat/tajweed-autohide` is already merged via PR #8).

---

## 5. Git / Uncommitted Work

*Source of truth from `git status` on 2026-10-04:*

### Staged Changes
None. (0 files)

### Unstaged Changes
- `HANDOFF.md` (modified with this handoff documentation update)

### Untracked Files (13 files total)
- `public/Logo_icon.png` (Brand logo asset, ~2.8 MB)
- `public/Logo_with Name.png` (Brand logo asset, ~3.7 MB)
- `scripts/generation/generate_vertex_baqarah_ch10.mjs`
- `scripts/generation/generate_vertex_baqarah_ch11.mjs`
- `scripts/generation/generate_vertex_imran_01a.mjs`
- `scripts/generation/generate_vertex_imran_02a.mjs`
- `scripts/generation/generate_vertex_imran_02b.mjs`
- `scripts/generation/generate_vertex_imran_02c.mjs`
- `scripts/generation/generate_vertex_juz01.mjs`
- `scripts/generation/generate_vertex_juz01_multi.mjs`
- `scripts/generation/generate_vertex_juz01_v2.mjs`
- `scripts/generation/generate_vertex_juz01_v3.mjs`
- `scripts/qa/results/repairs.json`

### Summary Counts
- **Staged files:** 0
- **Modified files:** 1 (`HANDOFF.md`)
- **Untracked files:** 13

---

## 6. Important Git History

Recent commits and merged PRs verified in git history:

- `0305b5a` — **Merge pull request #8** from `sarfpearl/feat/tajweed-autohide` into `main`
- `967a134` — `feat: migrate media assets to Cloudflare R2`
- `a627ed9` — `docs: refresh HANDOFF.md for Antigravity (status to 2026-10-02, rules, pending work)`
- `212d5c8` — `feat(tajweed): auto-hide the colours panel after a few seconds`
- `c0adbbb` — **Merge pull request #7** from `sarfpearl/feat/about-polish`
- `3749f94` — `fix(home): keep the Listen & Read label`
- `343cd84` — `fix(about): show Copied only when the copy worked`
- `0ac8d0f` — `feat(about): copy email, About Me text, logo balance, simpler title`
- `b453fda` — **Merge pull request #6** from `sarfpearl/feat/content-browser-about`
- Older historical PRs:
  - **PR #4** — Reading-mode page navigation (`fix/reading-mode-page-navigation`)
  - **PR #3** — Word-Sync / Voice-Sync (`feat/reciter-sync-min`)

---

## 7. Environment Configuration

### Required Environment Variables (Names and Purposes Only)

| Variable Name | Environment | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Vercel (Production/Preview) & `.env.local` | Public base URL for R2 CDN media delivery (`https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`) |
| `R2_ACCOUNT_ID` | Local `.env.local` | Cloudflare account ID for S3 SDK upload tool |
| `R2_ACCESS_KEY_ID` | Local `.env.local` | Cloudflare R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | Local `.env.local` | Cloudflare R2 API token secret access key |
| `R2_BUCKET_NAME` | Local `.env.local` | Cloudflare R2 bucket name (`huda-quran-media`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production & `.env.local` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production & `.env.local` | Supabase anonymous client key |
| `NEXT_PUBLIC_DATA_SOURCE` | Production & `.env.local` | Data source mode (e.g. `seed`) |
| `NEXT_PUBLIC_SITE_URL` | Production & `.env.local` | Canonical website base URL |

> [!CAUTION]
> Never commit `.env*` files or log secret credential values in code, terminals, or documentation.

---

## 8. Verification Status

| Check / Test | Result | Notes |
| :--- | :---: | :--- |
| `npm run typecheck` | ✅ **PASS** | 0 TypeScript errors |
| `npm run lint` | ✅ **PASS** | 0 blocking errors (only standard hook dependency warnings) |
| `npm run build` | ✅ **PASS** | 64/64 static pages generated cleanly |
| **R2 Upload Verification** | ✅ **PASS** | 270/270 files verified on R2; direct requests return HTTP 200 |
| **Production Deployment Image Loading** | ✅ **PASS** | Verified live in browser 2026-10-05 (see §3) |

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
   - Work through the open items in §4 (untracked files decision, Pinterest hotlink, README refresh).
   - If media ever breaks again: first check the Vercel env var value, then redeploy **without** build cache.

---

## 🧠 Architectural Rules That Must Not Be Broken

1. **Audio and word timings must come from the same source:** Word timings come from Quran.com QDC and match quranicaudio files. 9 reciters have them (sudais, alafasy, dosari, abdulbaset, minshawi, hussary, shuraim, shatri, tunaiji). Never borrow another reciter's timings.
2. **Repeated words:** map QDC segments by `wordIndex`, drive the active word from `verse.wordSegments`.
3. **Surah 1** = Isti'adhah prelude clip (cut at 6.60s) → reciter's own Bismillah → ayahs. **Surahs 2–114** (never 9) open with Bismillah: Dosari 2–78 embeds his own; others get `bismillah-prelude.mp3`. Audio Only reciters get no prelude. Never double the Bismillah.
4. **Juz boundaries are Indo-Pak**, not King Fahd/Madani (differ at Juz 4, 7, 11, 20, 21, 23). Don't "correct" them from quran.com.
5. **Juz with any reciter** = everyayah.com per-ayah clips (`EVERYAYAH_FOLDERS`).
6. **Arabic text:** use `text_qpc_hafs` with Hafs v0.18. Never edit Quran text to fix rendering.
7. **Tajweed:** QPC V4 COLRv1 glyph fonts (one glyph per word).
8. **Keep features focused and minimal:** Maintain simple design system, no unnecessary heavy layers.
