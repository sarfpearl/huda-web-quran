# 🕌 HuDa Web Quran — Project Handoff

> **For:** Claude / Antigravity / any AI assistant continuing this project
> **Updated:** 2026-09-03
> **Project Path:** `/Users/pearl-9744/Claude/Projects/Huda Bayan`
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)

---

## 📌 Project Overview

**HuDa Web Quran** (Huda Bayan) is an immersive, modern Holy Quran and Islamic Bayan (sermon/lecture) listening web application. It is Tamil-language focused and built for Muslims to listen to talks by category, speaker, and recitation of all 114 Quran Surahs & 30 Juz with verse-aware 8K visuals and cinematic video backgrounds.

Inspired by: `https://tamilfm.co/v/auto`

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router, TypeScript) |
| Styling | **Tailwind CSS v3** + Glassmorphism tokens & CSS variables |
| Animations | **Framer Motion** |
| Artwork Engine | **Verse-Based 8K Visual System (Surahs 1–114)** + Google Veo Cinematic Video Engine |
| Image Generation | Pollinations.ai Flux 16:9 HD Pipeline + Gemini 8K Photorealistic Renderer |
| Audio Engine | HTML5 `<audio>` Engine + YouTube IFrame API |
| Package Name | `huda-bayan` (`huda-web-quran`) |

---

## 🗂️ Project Structure

```
Huda Bayan/                               ← Root workspace
├── src/
│   ├── app/
│   │   ├── page.tsx                      ← Home page (immersive full-screen)
│   │   ├── layout.tsx                    ← Root layout (Poppins font, theme & audio providers)
│   │   ├── globals.css                   ← Global CSS + Tailwind directives + Glassmorphism
│   │   ├── admin/                        ← Admin CRUD (bayans, categories, speakers)
│   │   ├── bayan/[slug]/                 ← Bayan detail page + OG image
│   │   ├── category/[slug]/              ← Category listing page
│   │   ├── speaker/[slug]/               ← Speaker profile page
│   │   └── api/youtube/                  ← YouTube playlist & stream API routes
│   │
│   ├── components/
│   │   ├── home/
│   │   │   ├── ImmersiveHomeClient.tsx    ← Main home page orchestrator (landing on Surah 1)
│   │   │   ├── ImmersiveBackground.tsx   ← Dual-mode background (Video vs 8K Image)
│   │   │   ├── SurahCinematicBackground.tsx ← 4K uncompressed crisp Retina background
│   │   │   ├── ImmersiveHeader.tsx       ← Header with visual mode toggle & menu
│   │   │   ├── CompactBayanPlayer.tsx    ← Bottom glass player card with circular cover
│   │   │   ├── ContentListCard.tsx       ← List view card component
│   │   │   └── TopicPickerModal.tsx      ← Control panel (Categories, Surahs 1-114, Juz 1-30, Speakers)
│   │   ├── navigation/
│   │   │   ├── Header.tsx
│   │   │   ├── MobileBottomNav.tsx
│   │   │   └── TimeLocationWidget.tsx    ← Live clock + location
│   │   ├── player/GlobalAudioPlayer.tsx  ← Persistent player for secondary routes
│   │   ├── layout/MainLayout.tsx         ← Route-aware layout switcher
│   │   └── ui/                           ← Icon, CoverArt, Skeleton, etc.
│   │
│   ├── contexts/
│   │   └── AudioPlayerContext.tsx        ← Global audio engine (Surahs start at 0:00, sequential next/prev)
│   │
│   └── lib/
│       ├── site.ts                       ← Brand config (name, url, tagline)
│       ├── data/
│       │   ├── quran-artwork.ts          ← Single source of truth for 114 Surah verse concepts
│       │   ├── quran.ts                  ← Quran Juz 1–30 + Surahs 1–114 metadata & audio URLs
│       │   ├── surahList.ts              ← Thematic descriptions for all 114 Surahs
│       │   ├── surahChapters.ts          ← Chapter definitions and verse metrics
│       │   ├── seed.ts                   ← Bayan talks, speakers, and categories
│       │   └── service.ts                ← Unified data service layer
│       └── youtube/                      ← YouTube integration helpers
│
├── scripts/
│   ├── generate-quran-images-free.mjs   ← 16:9 HD verse-based image generator (Flux pipeline)
│   ├── generate_veo_fatihah.mjs         ← Veo 3.1 4-scene video generator for Al-Fatihah
│   └── generate_veo_baqarah_pilot.mjs   ← Veo 3.1 video pilot for Al-Baqarah
│
├── public/
│   ├── images/quran/                    ← 114 Surah covers (surah-1..114.jpg) + 30 Juz covers
│   ├── images/scenes/                   ← 16 Islamic category background images
│   ├── videos/surah/                    ← Veo cinematic video loops (Al-Fatihah, Al-Baqarah, etc.)
│   ├── Image-Mode.svg & Video-Mode.svg  ← Mode toggle icons
│   ├── Glass.svg, Menu.svg, YT-Music.svg← UI vector assets
│   └── manifest.webmanifest              ← PWA manifest
│
├── next.config.mjs                       ← High-DPI 4K deviceSizes (2560px, 3840px)
└── tailwind.config.ts                    ← Design tokens and theme colors
```

---

## 🎨 Design System

### Colours
- **Primary green:** `#1a5140` — Islamic green, buttons, accents
- **Gold accent:** `#e8d19a` / `amber-300` — highlights (sparse use)
- **Dark background:** `#0e100f` / `slate-950`
- **Sand/cream text:** `sand-50`, `sand-100`, `sand-300`
- **Emerald interactive:** `emerald-400`, `emerald-500` — player controls

### Z-Index Stack (home page)
```
z-50  → ImmersiveHeader (top bar + menu)
z-40  → Bottom player div
z-30  → Bismillah calligraphy (top-center, floating over scene)
z-20  → Center topic card (category name + Tamil + tagline)
z-10  → ImmersiveHomeClient root
z-0   → ImmersiveBackground (scene image)
```

### Glass Card Recipe (shared by player / hero / time widget)
`bg-black/[0.08]` tint · `backdrop-blur-[6px]` · `border border-white/15` ·
`shadow-[0_20px_50px_rgba(0,0,0,0.8)]` · `rounded-[40px]` (bounded — never
`rounded-full`, which turns multi-row cards into ellipses). Cards are
responsive: wider width + smaller radius/padding on mobile (`sm:` bumps up).

---

## 🔑 Central Brand Config

**`src/lib/site.ts`**
```ts
export const siteConfig = {
  name: "HuDa",
  fullName: "HuDa Web Quran",
  tagline: "Listen. Reflect. Improve.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  locale: "ta_IN",
  themeColor: "#1a5140",
};
```

---

## 🗄️ Data Layer

### Current Mode: **Seed (Demo — no DB needed)**
- 16 Islamic categories (Iman, Quran, Salah, Dua, Ramadan…)
- 4 placeholder Tamil-speaking speakers
- ~12 demo bayans using Quranic audio from `download.quranicaudio.com`

### Switch to Supabase (`.env.local`)
```env
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Schema: `supabase/schema.sql`. Service stubs: `src/lib/data/service.ts`.

---

## 🎵 Audio Engine (`AudioPlayerContext.tsx`)

Supports 3 source types:

| Source | Mechanism |
|---|---|
| `youtube-playlist` | YouTube IFrame Player API — plays a playlist |
| `youtube-video` | YouTube IFrame Player API — plays a single video |
| `local` | HTML5 `<audio>` — plays a direct MP3 URL |

Quran uses the **`local`** path (no new player was added). Startup is fast:
playback starts as soon as the browser can play, without waiting for full
metadata (the resume position is applied on `loadedmetadata`).

---

## 📖 Quran & Surah (`src/lib/data/quran.ts`)

The picker (`TopicPickerModal.tsx`) has three top-level tabs, in order and
defaulting to **Surah**:

| Tab | Content | Audio source |
|---|---|---|
| **Surah** | 114 Surahs (`QURAN_SURAHS` → `SURAH_TRACKS`) | Sudais, `server11.mp3quran.net/sds/NNN.mp3` |
| **Quran** | 30 Juz/Para (`QURAN_JUZ` → `QURAN_TRACKS`) | Maher Al-Muaiqly, Internet Archive **direct data-node** |
| **Bayan** | categories (`seed.ts`) | YouTube playlists |

- Each item is a `BayanWithRelations` track played through the existing
  `playBayan(track, list)`, so next/previous, auto-advance and stop-at-end
  all come for free, scoped to the same collection.
- **Juz audio URL** points at the item's *direct* archive node, NOT the
  `archive.org/download/…` redirect (that redirect times out in-browser).
  See `RECITER_BASE` in `quran.ts` — one constant to update if the node moves.
- Track ids: `quran-surah-N` / `quran-juz-N`. Helpers: `isSurahTrackId`,
  `isQuranTrackId`, `isQuranTrack`, `quranContentLabel`.
- The player shows **NOW PLAYING · title · category-line** where the
  category-line is the Quran label (e.g. "Surah 1 • 7 Verses" / "Para 1 •
  Juz 1 of 30"). Shuffle is context-aware: Surah→random Surah, Juz→random Juz.

### Quran cover images
- `quranImageUrl(kind, num)` → `/images/quran/{kind}-{num}.jpg`, gated by
  `QURAN_IMAGES_READY` (**ON by default**; set `NEXT_PUBLIC_QURAN_IMAGES=0`
  to fall back to the generative `CoverArt` placeholder).
- 144 rich mosque-scene covers live in `public/images/quran/`, generated
  **free** by `scripts/generate-quran-images-free.mjs` (Pollinations.ai — no
  API key, no billing). Re-run any time; it resumes (skips existing files).
  Regenerate one: delete its `.jpg` and re-run.
- Gemini (`generate-quran-images.mjs`) is kept for later but **requires paid
  billing** — the free tier returns `limit: 0` for image generation.
- `CoverArt.tsx` uses a strong avalanche hash so every generative placeholder
  (and every Bayan) is visibly distinct per seed/slug.

**LocalStorage keys:**
- `huda-player:last` — last played track
- `huda-player:positions` — per-bayan playback positions
- `huda-player:prefs` — volume, playback rate, mute
- `huda-theme` — light/dark mode preference
- `huda-session-id` — session identifier

---

## ⚙️ Environment Variables

```env
# Data source (default: seed)
NEXT_PUBLIC_DATA_SOURCE=seed

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Quran covers: ON by default. Set to "0" to use generative CoverArt instead.
NEXT_PUBLIC_QURAN_IMAGES=1

# Gemini image generator (scripts/generate-quran-images.mjs) — needs billing
GEMINI_API_KEY=

# Supabase (only if DATA_SOURCE=supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# YouTube Data API (optional — for live playlist metadata)
YOUTUBE_API_KEY=
```

---

## 🐛 Known Issues & Pending Work

### 🔴 Ongoing Bug
- **Home page shows only background / Internal Server Error / port 3000 in use** — caused by stale/old Next.js server processes occupying port 3000, or a mixed `.next` cache (running `next build` then `npm run dev` corrupts the dev cache → `__webpack_modules__[moduleId] is not a function`). Fix: `lsof -ti:3000 | xargs kill -9`, then `rm -rf .next`, then `npm run dev` fresh, then hard-refresh (`Cmd+Shift+R`). The z-index stacking fix is already committed (`7e15b6b`).

### 🟡 Needs Implementation
- [ ] **Supabase backend** — implement stubs in `src/lib/supabase/queries.ts`
- [x] ~~**Quran Juz audio**~~ — DONE: Juz 1–30 and Surah 1–114 are fully playable (see the Quran & Surah section above)
- [ ] **Real bayan/speaker data** — replace seed placeholders with real Tamil Islamic Bayan content
- [ ] **Per-category YouTube playlists** — all 16 categories currently share the same demo playlist `PLFRt54vRoHJs`; each needs a real Tamil Bayan playlist ID in `seed.ts`
- [ ] **Arabic font** — `font-arabic` class references `var(--font-arabic)` which is never set; add Amiri or Noto Naskh Arabic via `next/font/google` in `layout.tsx`
- [ ] **Admin write operations** — reads work; writes need Supabase
- [ ] **Admin authentication** — no auth guard on `/admin` routes yet

### ✅ Working Well
- **Verse-Based 8K Quran Artwork System (Surahs 1–114)**:
  - Single source of truth in `src/lib/data/quran-artwork.ts` mapping each Surah to specific Quranic Ayat, core theme, visual description, mood, and strict negative prompts (no faces, no calligraphy, no logos).
  - High-resolution 16:9 widescreen artwork generated and saved to `public/images/quran/surah-[1-114].jpg` and `juz-[1-30].jpg`.
- **Dual Visual Modes (Cinematic Video vs 8K Artwork)**:
  - Header toggle switch between Video Mode and Image Mode with persistent `localStorage` preference.
  - Video engine plays cinematic looping MP4 scenes generated with Google Veo (`public/videos/surah/`), with fallback to static 8K images.
- **Retina Display & Visual Sharpness**:
  - Configured `next.config.mjs` with 4K device sizes (`2560px`, `3840px`).
  - Added `-webkit-optimize-contrast` and `unoptimized={true}` on hero background components to prevent blurriness on Mac Liquid Retina XDR displays.
  - Dynamic cache busting (`?v=8`) via `quranImageUrl()` in `src/lib/data/quran.ts`.
- **Audio Playback Engine**:
  - Surahs start reliably at `0:00`.
  - Next / Previous transport buttons cycle sequentially across all 114 Surahs.
  - Initial landing track set to Surah 1: Al-Fatihah.
- **Glassmorphic UI**:
  - Dark glass player card with circular cover, animated equalizer, and playback speed control.
  - Bismillah calligraphy floating top-center.
  - Topic picker modal with 4 tabs: Categories, Surahs 1–114, Juz 1–30, and Speakers.
- **Code Quality**:
  - TypeScript strict mode — 0 errors (`npm run typecheck`).
  - Clean Next.js 14 App Router architecture.

---

## 🚀 Quick Start

```bash
cd "/Users/pearl-9744/Claude/Projects/Huda Bayan"

npm install
npm run dev
# → http://localhost:3000

# TypeScript check
npm run typecheck
```

> ⚠️ If the page shows only the background with no UI: close the browser tab, kill any old node servers (`lsof -ti:3000,3001,3002 | xargs kill -9`), restart `npm run dev`, then open a **new tab** at localhost:3000 and hard-refresh.

---

## 📝 Git History

```
(pending) feat: free Pollinations Quran/Surah cover images + docs
7f3d7a6  feat: Surah 1-114 tab, reliable per-Juz audio, context-aware shuffle & player polish
01cd418  docs: update HANDOFF.md — glass UI, Quran juz tab, playback-rate
abbd492  feat: glass UI refinements, Quran juz list, and playback-rate fix
122c7ee  docs: add HANDOFF.md for project continuation
7e15b6b  fix: resolve UI elements not visible (z-index stacking context)
c454370  refactor: rename project to huda-bayan
bdbd7b8  Refine CompactBayanPlayer UI layout and controls
f138d82  Update UI: Poppins font, TimeLocationWidget, Figma player layout
eb8780b  HuDa Right Guidance (initial commit)
```

---

## 💡 Important Notes for the Next Developer

1. **Folder name on disk is now `Huda Bayan`** — matches the project name. Git history is intact.

2. **The `font-arabic` Tailwind class** is configured in `tailwind.config.ts` but `--font-arabic` CSS variable is never defined → Bismillah renders as serif fallback. To fix, load an Arabic font in `layout.tsx`.

3. **Redundant font import** — `globals.css` line 1 has a Google Fonts `@import` for Poppins, but `layout.tsx` already loads it via `next/font`. The `@import` can be safely removed.

4. **YouTube playlists** — To add real Tamil Bayan playlists, update `youtubePlaylistId` per category in `src/lib/data/seed.ts`.

5. **Adding a new scene background** — Drop a JPG at `public/images/scenes/{category-slug}.jpg` and add the entry to the `sceneImages` map in `ImmersiveBackground.tsx`.
