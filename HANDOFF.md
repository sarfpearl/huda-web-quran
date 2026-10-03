# 🕌 HuDa Web Quran — Project Handoff

> **For:** Antigravity / Claude / any AI assistant continuing this project
> **Updated:** 2026-10-02
> **Project Path:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)
> **Live:** `https://huda-web-quran.vercel.app` (Vercel auto-deploys on every push to `main`)
> **Repo:** `github.com/sarfpearl/huda-web-quran`

---

## 🟢 Latest Status — 2026-10-02 (read this first)

`main` is live and up to date (last merge: PR #7 `feat/about-polish`).
Workflow since PR #3: **one feature branch per change → PR → merge to `main` → Vercel deploys.**

### Open / unpushed work
| Branch | State | What |
|---|---|---|
| `feat/tajweed-autohide` | committed locally (`212d5c8`), **not pushed** | Tajweed colours panel hides itself after 4s (`TAJWEED_AUTO_HIDE_MS` in `ImmersiveHeader.tsx`); held open while hovered / keyboard-focused; flipping the switch restarts the timer |

To ship it: `git push -u origin feat/tajweed-autohide`, open a PR, merge.

### Shipped since the last handoff (2026-09-14 → 2026-10-02)
| Area | What | Where |
|---|---|---|
| Reciters | 9 reciters with word-level sync (QDC timings); the rest are "Audio Only" | `quranReciters.ts`, `quranVerses.ts` |
| Juz | Any reciter recites a Juz ayah-by-ayah via everyayah.com (`playAyahSequence`); Indo-Pak Juz boundaries | `quran.ts`, `AudioPlayerContext.tsx` |
| Word sync QA | Acoustic verification/repair scripts; mismatched reciter×Surah pairs fall back to audio-only | `scripts/qa/*`, `wordSyncAvailability.ts`, `reciterAvailability.ts` |
| Tajweed | Quran.com-style QPC V4 COLRv1 page fonts (colours inside the glyphs) + gold recited-word highlight | `quranGlyphs.ts`, `public/fonts/qpc-v4/`, `public/data/quran-glyphs/` |
| Reading mode | Mushaf reading view for Surah & Juz, page picker, Sajdah markers, last read, bookmarks, text size | `ReadingView.tsx`, `MushafPagePicker.tsx`, `BookmarksPanel.tsx`, `mushafPages.ts`, `sajdah.ts` |
| Engagement | Live listeners, view counts, comments (likes/replies), likes, favourites — anonymous Supabase RPCs; comment moderation page with moderator key | `QuranEngagement.tsx`, `supabase/migrations/*`, `src/app/admin` |
| Mobile / iOS | iOS 26 edge-to-edge, install guide (add to home screen), Safari crash fixes, compact player | `InstallGuide.tsx`, `CompactBayanPlayer.tsx` |
| Home | Content browser auto-opens and morphs from ☰; About HuDa (copy email, About Me) | `TopicPickerModal.tsx`, `about.ts` |

### 🎬 Videos (still local only)
- 16 early videos are tracked in git. The newer ones (**~4.7 GB**: `public/videos/juz/` and most `public/videos/surah/002-al-baqarah/*`) are **untracked** — on disk only, not deployed.
- Path convention (see `src/lib/data/surahVerseVideos.ts` → `videoPath`, Juz in `quranJuzVideos.ts`):
  - Surah loop: `public/videos/surah/NNN-slug.mp4`
  - Per-ayah clips: `public/videos/surah/NNN-slug/<clip-name>.mp4`
  - A new video must be registered in the data file or it won't play.
- **Don't commit them to plain git** (GitHub 100 MB/file limit, repo bloat, push timeouts). Host them on a CDN / object storage (Firebase Storage, Cloudflare R2, Vercel Blob…) or Git LFS, then point `videoPath` at the URL. Not decided yet — ask the user.
- Also untracked: `public/Logo_icon.png`, `public/Logo_with Name.png` (new brand logo, not yet wired as favicon/app icon), `scripts/generation/generate_vertex_*.mjs`, `scripts/qa/results/repairs.json`.

---

## 📌 Project Overview

**HuDa Web Quran** is an immersive Holy Quran listening & reading web app (Tamil + English), with word-synced recitation for all 114 Surahs and 30 Juz, Tajweed colouring, verse-aware 8K artwork and cinematic video backgrounds. A Bayan (talk) section exists but is hidden for now.

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | **Next.js 14.2** (App Router, TypeScript strict) |
| Styling | **Tailwind CSS v3** — literal hex palette + a few CSS vars |
| Animations | **Framer Motion** |
| Audio | HTML5 `<audio>` (`AudioPlayerContext.tsx`) + YouTube IFrame API (Bayan) |
| Backend | **Supabase** (views / live / comments / likes only) |
| Hosting | **Vercel** (auto-deploy from `main`) |
| Fonts | Poppins (UI), KFGQPC Uthmanic Hafs v0.18 + QPC V4 page fonts (Arabic), Noto Serif Tamil |

---

## 🗂️ Project Structure (key files)

```
src/
├── app/                      page.tsx (home), layout.tsx, globals.css, admin/, api/, bayan/ … (Bayan routes hidden)
├── components/home/
│   ├── ImmersiveHomeClient.tsx   ← orchestrator: reciter / Surah / Juz selection, Tajweed, reading mode
│   ├── ImmersiveHeader.tsx       ← Translation, Tajweed panel, reciter avatar, reading, browser buttons
│   ├── CenterVerseDisplay.tsx    ← verse + word highlight on the home stage
│   ├── ReadingView.tsx           ← Mushaf reading mode (Surah & Juz)
│   ├── CompactBayanPlayer.tsx    ← bottom player (ayah progress, bookmark, like)
│   ├── TopicPickerModal.tsx      ← content browser (Surah | Juz, favourites, About)
│   ├── ReciterPickerModal.tsx, QuranEngagement.tsx, InstallGuide.tsx, BookmarksPanel.tsx, MushafPagePicker.tsx
│   └── ImmersiveBackground / SurahCinematicBackground / JuzCinematicBackground.tsx
├── contexts/AudioPlayerContext.tsx   ← audio engine, preludes, playAyahSequence, jumpToAyah
└── lib/data/
    ├── quran.ts                ← Surah/Juz metadata, tracks, image URLs, Juz→ayah helpers
    ├── quranReciters.ts        ← reciters, QDC timing ids, everyayah folders, Bismillah rules
    ├── quranVerses.ts          ← verse text + timings, word-segment sync
    ├── quranGlyphs.ts          ← QPC V4 page fonts, Tajweed palettes, TAJWEED_LEGEND
    ├── surahTrimming.ts        ← Isti'adhah / Bismillah preludes
    ├── wordSyncAvailability.ts, reciterAvailability.ts   ← GENERATED by scripts/qa
    └── surahVerseVideos.ts, quranJuzVideos.ts, quran-artwork.ts, mushafPages.ts, sajdah.ts, about.ts
scripts/  generation/ (timings, glyphs, images, videos) · qa/ (word-sync verification) · tools/ · archive/
public/   data/quran-timings/ · data/quran-glyphs/ · fonts/qpc-v4/ · assets/images/ · audio/prelude/ · videos/
supabase/ schema.sql + migrations/
docs/     TODO.md (launch checklist)
```

---

## 🧠 Rules That Must Not Be Broken

These were hard-won; each has broken before.

1. **Audio and word timings must come from the same source.** Word timings come from Quran.com QDC and match quranicaudio files. 9 reciters have them (sudais, alafasy, dosari, abdulbaset, minshawi, hussary, shuraim, shatri, tunaiji). Never borrow another reciter's timings.
2. **Repeated words:** map QDC segments by `wordIndex`, drive the active word from `verse.wordSegments` (the highlight jumps back on a repeat).
3. **Surah 1** = Isti'adhah prelude clip (cut at 6.60s) → reciter's own Bismillah → ayahs. **Surahs 2–114** (never 9) open with Bismillah: Dosari 2–78 embeds his own; others get `bismillah-prelude.mp3`. Audio Only reciters get no prelude. Never double the Bismillah.
4. **Juz boundaries are Indo-Pak**, not King Fahd/Madani (differ at Juz 4, 7, 11, 20, 21, 23). Don't "correct" them from quran.com.
5. **Juz with any reciter** = everyayah.com per-ayah clips (`EVERYAYAH_FOLDERS`). No silent fallback to Maher — show a notice.
6. **Arabic text:** use `text_qpc_hafs` with Hafs v0.18 (Tanzil text shows dotted circles). Never edit Quran text to fix rendering. Never add letter-spacing to Arabic. Nested elements stay under `.font-arabic` (base CSS forces Poppins on spans).
7. **Tajweed** = QPC V4 COLRv1 glyph fonts (one glyph per word). A CSS-span colouring approach was tried and **rejected**.
8. **Design system stays simple:** literal hex in `tailwind.config.ts` + a few RGB vars in `globals.css`. A big token layer was removed on purpose — don't reintroduce it.
9. **iOS 26:** scene runs under the status bar; accept the iOS blur. Don't add a solid top strip.
10. **Keep features small.** The user rejected a big analytics dashboard / login system. Ask before building large systems.
11. After re-fetching timings or changing reciters, re-run `scripts/qa`: `voice-match` → `repair-timings` → `sync-suite`.

---

## 🎨 Design System

- **Primary green:** `#1a5140` · **Gold** (sparing): `#e8d19a` / `amber-300` · **Charcoal bg:** `#0e100f` · **Sand text:** `sand-50…300`
- **Glass recipe:** `bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg`; popovers `bg-black/70 backdrop-blur-xl rounded-2xl`.
- Header buttons are 40px below 400px width, 44px, 48px on `sm:` (375px phones must fit).

---

## 🗄️ Data & Backend

- Quran data is static (`public/data/…`) + external audio (quranicaudio / QDC, mp3quran.net, everyayah.com).
- **Supabase** handles views, live listeners, comments, likes — anonymous browser id, RPCs in `supabase/migrations/`. Keys in `.env.local` (gitignored) and in Vercel env vars.
- Bayan content is still seed/demo data (`seed.ts`) and hidden in the UI.

### Environment Variables
```env
NEXT_PUBLIC_DATA_SOURCE=seed
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 🐛 Pending Work

See `docs/TODO.md` for the launch checklist. Main items:
- [ ] Ship `feat/tajweed-autohide` (see top)
- [ ] Decide video hosting and publish the ~4.7 GB of untracked videos
- [ ] Wire the new logo (`public/Logo_icon.png`) as favicon / PWA icon
- [ ] Clear Supabase test data before launch; harden counts against abuse
- [ ] Admin login (currently a moderator key protects comment moderation)
- [ ] Confirm KFGQPC font licence; test Tajweed on a real iPhone
- [ ] Real Bayan content + per-category playlists (section currently hidden)

---

## 🚀 Quick Start

```bash
cd /Users/pearl-9744/Claude/Projects/huda-web-quran
npm install
npm run dev          # → http://localhost:3000
npm run typecheck    # must stay at 0 errors
```

> If the page shows only the background / `__webpack_modules__[moduleId] is not a function`: kill old servers (`lsof -ti:3000 | xargs kill -9`), `rm -rf .next`, restart `npm run dev`, hard-refresh. Don't run `next build` and `next dev` against the same `.next`.

---

## 📝 Git Notes

- Commit only code + small assets; keep `public/videos/**` out of commits.
- The old Claude sandbox pushed through a proxy that timed out on big pushes (>~100 MB). A machine with direct GitHub access doesn't have that limit, but GitHub's 100 MB/file limit still applies.
- Older branches (`feat/reciter-sync-min`, `feat/multi-reciter-word-sync`, `fix/reading-mode-page-navigation`, `claude/*`) are already merged or stale.
- `docs/HANDOFF.md` is an older copy — this root `HANDOFF.md` is the current one.
