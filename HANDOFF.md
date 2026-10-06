# 🕌 HuDa Web Quran — Project Handoff

> **For:** Antigravity / Claude / any AI assistant continuing this project  
> **Last Updated:** 2026-10-06  
> **Project Path:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)  
> **Live Production:** `https://huda-web-quran.vercel.app` (Vercel auto-deploys on push/merge to `main`)  
> **GitHub Repository:** `github.com/sarfpearl/huda-web-quran`  

---

## 1. Current Project Status

*Snapshot: 2026-10-06, after PR #14.*

| Item | Status |
| :--- | :--- |
| **App** | Quran-only: listen & read, 114 Surahs / 30 Juz, 51 reciters (Bayan section removed) |
| **Repository** | `sarfpearl/huda-web-quran` (public) |
| **`main`** | `5b1c970` — Merge PR #14 (`feat/indopak-script`) |
| **Latest merged PRs** | #12 Bayan removal + 10 translation languages + onboarding · #13 Maher Juz audio on R2 · #14 IndoPak script (dev-only) |
| **Open PRs** | None |
| **Production** | [huda-web-quran.vercel.app](https://huda-web-quran.vercel.app) — deploy of `5b1c970` succeeded |
| **Local working tree** | `main`, clean |

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

### Open

*Checklist for the next conversation: `docs/TODO.md` → "Open items".*

- [ ] Optional: remove `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` from Vercel — only the local upload tool uses them; the app never reads them (they're not `NEXT_PUBLIC_`, so they don't reach the browser).
- [ ] **IndoPak font licence:** waiting on QuranWBW's written permission; then self-host the font and set `NEXT_PUBLIC_INDOPAK=1` in Vercel. Steps in `docs/TODO.md`.
- [ ] **Before launch:** clear Supabase test data (`truncate public.quran_listens, public.quran_presence;`), and later harden anonymous counts against abuse — see `docs/TODO.md`.
- [ ] Optional cleanup (owner's call): old Bayan tables (`categories`, `speakers`, `bayan`, `bayan_plays`) and storage buckets (`bayan-audio`, `bayan-images`, `speaker-images`) still exist in the live Supabase DB. R2 still holds `assets/images/bayan/*.jpg`; only `bayan/quran.jpg` is used (Quran fallback cover).

### Done (2026-10-05 → 10-06)
- [x] Production R2 media issue (`.r2.dev4f` typo) resolved and verified live (§3).
- [x] 51 reciter portraits moved off Pinterest to R2 (PR #9).
- [x] README refreshed; HANDOFF media locations corrected (PR #10).
- [x] 13 untracked files resolved (PR #11).
- [x] Bayan removed, translations ×10, onboarding (PR #12).
- [x] Maher's full-Juz audio moved off archive.org to R2 (PR #13): 30 files (~1.36 GB) at `audio/juz/maher/para-NN.mp3`; masters in git-ignored `assets/audio/juz/maher/`; `upload-to-r2.mjs --category=audio-juz`. Para 30 is 320 kbps (173 MB), others 128 kbps.
- [x] IndoPak script, development-only (PR #14).
- [x] HANDOFF status + README 10 languages (PR #15); merged remote branches deleted (only `main` remains).
- [x] `NEXT_PUBLIC_DATA_SOURCE` — already absent from Vercel and `.env.local`; nothing to remove.
- [x] **`NEXT_PUBLIC_SITE_URL` added in Vercel** (Production, type Config) and redeployed. It was missing, so `sitemap.xml`, `robots.txt`, the canonical link and `og:url` all said `http://localhost:3000`. Verified live 2026-10-06: all now `https://huda-web-quran.vercel.app`.
- [x] **GCP budget alert** set (owner, 2026-10-06): "HuDa monthly budget", ₹1,000 / month, alerts at 50% / 90% / 100%, on project "Huda Quran Web" = `gen-lang-client-0172381348` (the Vertex/Veo video project). Alerts only email; they don't stop spending. ~₹3,560 of free credit was left at the time.
- [x] **Share image** (PR #17): `src/app/opengraph-image.jpg` + `twitter-image.jpg` (HuDa logo + Quran artwork, 1200×675, 213 KB); Next.js file convention, absolute URLs via `metadataBase`.

---

## 5. Git / Uncommitted Work

*2026-10-06: `main` working tree clean; no open PRs.*

> [!WARNING]
> **Two AI sessions edited the same checkout at the same time on 2026-10-06.** One session's onboarding work was briefly swept into another's commit, and a commit landed on the wrong branch (fixed by cherry-picking onto a fresh branch). Run **one session per checkout**, or give each session its own `git worktree`. Before committing, run `git status` and stage files by name, not `git add -A`.

---

## 6. Important Git History

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
| `R2_ACCESS_KEY_ID` | Local `.env.local` (also in Vercel, unused there) | Cloudflare R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | Local `.env.local` (also in Vercel, unused there) | Cloudflare R2 API token secret access key |
| `R2_BUCKET_NAME` | Local `.env.local` | Cloudflare R2 bucket name (`huda-quran-media`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Production & `.env.local` | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production & `.env.local` | Supabase anonymous client key |
| `NEXT_PUBLIC_SITE_URL` | Vercel Production (Config) | Canonical site URL `https://huda-web-quran.vercel.app` for sitemap, robots, canonical and `og:url`. Without it they fall back to `http://localhost:3000`. Not needed locally. |
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
| **Full-Juz playback in the app** | ⚠️ Not ear-tested | R2 file loads and seeks in a browser; in-app play not listened to |

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
| Quran.com API (QDC / qurancdn) | Word timings, QPC V4 Tajweed fonts, IndoPak word text — fetched once by scripts | `fetch-reciter-timings.mjs`, `fetch-qpc-v4.mjs`, `fetch-indopak-words.mjs` |
| mp3quran.net | Audio for the other 42 (Audio Only) reciters | `quranReciters.ts` |
| everyayah.com | Per-ayah clips so any reciter can recite a Juz | `EVERYAYAH_FOLDERS` |
| alquran.cloud | Translations (10 languages), built into `public/data/quran-translations/` by script | `build-quran-translations.mjs`, `quranVerses.ts` |
| OpenStreetMap Nominatim | City name in the header clock widget | `TimeLocationWidget.tsx` |

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
9. **Quran only:** Bayan / talks / YouTube were removed on 2026-10-06. Don't reintroduce them unless the owner asks.
10. **IndoPak stays development-only** until QuranWBW grants the font licence. Don't ship it to production with the Noto fallback.
11. **One AI session per checkout** (or separate worktrees); stage files by name.
