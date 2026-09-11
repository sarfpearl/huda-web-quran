# 🕌 HuDa Web Quran — Project Handoff

> **For:** Claude / Antigravity / any AI assistant continuing this project
> **Updated:** 2026-09-09
> **Project Path:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`
> **Dev Server:** `npm run dev` → [http://localhost:3000](http://localhost:3000)

---

## 📌 Project Overview

**HuDa Web Quran** is an immersive, modern Holy Quran and Islamic Bayan (sermon/lecture) web application. It features Tamil and English translations, authentic Quranic recitation by **Sheikh Abdur Rahman As-Sudais**, live voice-synchronized Arabic word calligraphy highlights, verse-level real cinematic footage, and an elegant glassmorphism audio player.

Inspired by: `https://tamilfm.co/v/auto`

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | **Next.js 14** (App Router, TypeScript) |
| Styling | **Tailwind CSS v3** + Glassmorphism tokens & CSS variables |
| Animations | **Framer Motion** |
| Quran Reciter | **Sheikh Abdur Rahman As-Sudais** (All 114 Surahs) |
| Verse Engine | **Zero-Latency Verse & Word Sync Data Engine** (`quranVerses.ts`) |
| Video Engine | **Verse-Level Real Cinematic Drone Footage** (`surahVerseVideos.ts`) |
| Artwork Engine | **16:9 8K Quran Concept Artwork** (`quran-artwork.ts`, `public/assets/images/surah/`) |
| Audio Engine | HTML5 `<audio>` Engine + YouTube IFrame API |
| Package Name | `huda-web-quran` |

---

## 🗂️ Project Structure

```
huda-web-quran/                            ← Root workspace
├── src/
│   ├── app/
│   │   ├── page.tsx                       ← Home page (immersive full-screen)
│   │   ├── layout.tsx                     ← Root layout (fonts, theme & audio providers)
│   │   ├── globals.css                    ← Global CSS + Tailwind directives + Glassmorphism
│   │   ├── admin/                         ← Admin CRUD (bayans, categories, speakers)
│   │   ├── bayan/[slug]/                  ← Bayan detail page + OG image
│   │   ├── category/[slug]/               ← Category listing page
│   │   ├── speaker/[slug]/                ← Speaker profile page
│   │   └── api/youtube/                   ← YouTube playlist & stream API routes
│   │
│   ├── components/
│   │   ├── home/
│   │   │   ├── ImmersiveHomeClient.tsx    ← Main home page orchestrator (landing on Surah 1)
│   │   │   ├── CenterVerseDisplay.tsx     ← Center Arabic calligraphy + Tamil/English translation
│   │   │   ├── CompactBayanPlayer.tsx     ← Bottom glass player card with verse dots & transport
│   │   │   ├── ImmersiveBackground.tsx    ← Dual-mode background (Video vs 8K Image)
│   │   │   ├── SurahCinematicBackground.tsx ← Real-footage verse video with smooth crossfade
│   │   │   ├── ImmersiveHeader.tsx        ← Top bar with visual mode toggle, language switcher & menu
│   │   │   ├── TopicPickerModal.tsx       ← Control center (Surahs 1–114, Juz 1–30, Categories, Speakers)
│   │   │   ├── SyncQADebugHUD.tsx         ← Voice-audio acoustic waveform QA monitor HUD
│   │   │   └── ContentListCard.tsx        ← List view card component
│   │   ├── navigation/
│   │   │   ├── Header.tsx
│   │   │   ├── MobileBottomNav.tsx
│   │   │   └── TimeLocationWidget.tsx     ← Live clock + location
│   │   ├── player/GlobalAudioPlayer.tsx   ← Persistent player for secondary routes
│   │   └── ui/                            ← Icon, CoverArt, Skeleton, etc.
│   │
│   ├── contexts/
│   │   └── AudioPlayerContext.tsx         ← Global audio engine (Surahs start at 0:00, sequential next/prev)
│   │
│   └── lib/
│       ├── site.ts                        ← Brand config (name, url, tagline)
│       ├── data/
│       │   ├── quranVerses.ts             ← Canonical verses, Isti'adhah, Bismillah, word timestamps
│       │   ├── surahDurations.ts          ← Exact recitation durations for Sheikh Sudais (Surahs 1–114)
│       │   ├── surahVerseVideos.ts        ← Mappings of verse numbers to real cinematic MP4 footage
│       │   ├── surahChapters.ts           ← Chapter definitions and metadata
│       │   ├── quran-artwork.ts           ← Thematic verse concepts for all 114 Surahs
│       │   ├── quran.ts                   ← Quran metadata & audio URLs
│       │   ├── surahList.ts               ← Surah descriptions & Arabic names
│       │   ├── seed.ts                    ← Bayan talks, speakers, and categories
│       │   └── service.ts                 ← Unified data service layer
│       └── youtube/                       ← YouTube integration helpers
│
├── public/
│   ├── assets/
│   │   ├── audio/surah/                   ← Local authentic audio (001.mp3 - Sudais 36.08s)
│   │   └── images/surah/                  ← 114 Surah covers (001-al-fatihah.jpg, etc.)
│   ├── videos/surah/                      ← Verse-level real cinematic drone MP4 footage
│   └── data/                              ← Pre-compiled verse datasets and timing caches
│
├── next.config.mjs                        ← High-DPI 4K deviceSizes & asset configurations
└── tailwind.config.ts                     ← Design tokens, custom colors, and typography
```

---

## 🎙️ Recitation & Audio Synchronization Architecture

### 1. Reciter: Sheikh Abdur Rahman As-Sudais
- All 114 Surahs are recited by **Sheikh Abdur Rahman As-Sudais**.
- Surah audio is sourced from `/assets/audio/surah/001.mp3` for Surah 1 and `https://server11.mp3quran.net/sds/{surah}.mp3` for Surahs 2–114.
- Exact durations in seconds for every Surah are cataloged in `src/lib/data/surahDurations.ts` (e.g., Surah 1 = 36 seconds).

### 2. Prelude & Opening Sequence: Isti'adhah & Bismillah
- **Surah 1 (Al-Fatihah)**:
  - **0.00s (Initial load / paused state)**: Displays the canonical **Isti'adhah** text:
    - **Arabic:** أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيۡطَٰنِ ٱلرَّجِيمِ
    - **Tamil:** விரட்டப்பட்ட ஷைத்தானை விட்டும் அல்லாஹ்விடம் நான் பாதுகாப்புத் தேடுகிறேன்.
    - **English:** I seek refuge in Allah from Satan the accursed.
  - **0.25s – 3.65s**: **Bismillah** (بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ) recited by Sheikh Sudais (0.28s – 2.75s) with live word-by-word highlight.
  - **3.65s+**: **Ayah 1** (ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ) begins in exact acoustic sync with spoken audio.
  - **Audio Integrity Constraint**: The audio file is strictly **never spliced or edited** with external voices. Isti'adhah text is integrated seamlessly into the visual timeline.
  - **Chevron Navigation**: Users can freely navigate using `<` (Previous) and `>` (Next) to view Isti'adhah, Bismillah, and individual Ayahs.

### 3. Bismillah Rules across Surahs 1–114
- **Surah 9 (At-Tawbah)**: Strictly **NO Bismillah** (Ayah 1 starts immediately at 0.00s per Islamic tradition).
- **All other Surahs (1–8, 10–114)**: Sheikh Sudais recites Bismillah at the beginning; Bismillah is preserved and never cut.

---

### 1. Header Navigation & Control Order (`ImmersiveHeader.tsx`)
The top-right header controls maintain a strict, accessible layout:
```
[ YouTube Music ] [ Quran Voice ] [ தமிழ் / EN ] [ Video / Image ] [ Layout / Menu ]
```
- **YouTube Music**: Direct link to the active playlist/track on YouTube Music.
- **Quran Voice Selector**:
  - **Click Action**: Opens/closes the compact glassmorphism `ReciterPickerModal`.
  - **Audio Non-Interference**: Tapping this icon **NEVER** pauses, stops, or restarts audio. Playback continues uninterrupted if playing; paused state remains paused if paused.
  - **Avatar Indicator**: Displays a 36-44px circular portrait of the currently selected reciter with fallback to `ImamQuranIcon`. When Quran audio is actively playing, displays a pulsating emerald ring.
  - **Accessible Tooltip**: `"Choose Quran Reciter (Current: {reciter.displayName})"`.
- **Language Switcher**: Toggles between English (`EN`) and Tamil (`தமிழ்`), saved in `localStorage`.
- **Visual Mode**: Toggles between real cinematic video and high-resolution concept artwork.
- **Layout/Menu**: Opens the Topic & Surah selection modal (`TopicPickerModal.tsx`).

### 2. Reciter Selection Engine (`quranReciters.ts`, `ReciterPickerModal.tsx`)
- **Canonical Reciters**: Sourced authentically from `surahquran.com` (e.g. Sheikh Abdul Rahman Al-Sudais [default], Sheikh Mishary Rashid Alafasy, Sheikh Maher Al-Muaiqly, Sheikh Saad Al-Ghamdi, Sheikh Abdul Basit, Sheikh Yasser Al-Dosari, etc.).
- **Data Model**: Includes verified official photos (`https://surahquran.com/img/quraa/en-*.png`), MP3 audio servers (`https://server*.mp3quran.net/...`), Riwayah style descriptions, and origin country.
- **Audio Transition**: When a user selects a new reciter:
  - Current Surah and current Ayah are fully preserved.
  - Audio switches seamlessly to the new reciter's URL without reloading the page or resetting UI.
  - If audio was playing, playback continues at the current Ayah position. If audio was paused, the track is cued without autoplay.
- **Word Timing Fallback**: For reciters without word-level acoustic timestamp data, `hasWordTiming` evaluates to `false`, activating the graceful full-Ayah golden glow highlight.
- **Persistence**: The active reciter selection is stored in `localStorage` under `huda-selected-reciter` and hydrated on application load.

### 3. Compact Player Bar (`CompactBayanPlayer.tsx`)
- **Active Ayah Badge**: Displays **strictly gray text** format:
  ```
  Ayat 1/7
  ```
  *(Never displays "Prelude • ..." or colored pills; always clean gray text `Ayat X/Y`)*.
- **Audio Progress Track**:
  - **Yellow progress fill**: Dynamically fills as audio plays.
  - **Dark unfilled track**: Clean contrast against background.
  - **Small white dot markers**: Fixed markers placed along the track indicating verse positions.
  - **NO Large Scrubber Thumb**: The circular draggable scrubber knob is removed completely for a clean, minimal look.
  - **Seeking**: The progress bar remains fully clickable and seekable across desktop and touch screens.

### 2. Center Verse Display (`CenterVerseDisplay.tsx`)
- **Arabic Calligraphy**: Centered Uthmani script with subtle drop-shadow and glow.
- **Active Word Highlighting**: The currently recited word illuminates in golden amber (`text-amber-300`) with an amber underline indicator.
- **Ayah Marker**: Canonical Arabic numeral enclosed in a subtle gold ring (e.g. ١).
- **Translation**: Tamil or English translation directly below Arabic text with generous vertical breathing room to prevent overlap with the bottom player card.
- **Language Switcher**: Header button toggles between English (`EN`) and Tamil (`தமிழ்`), saved in `localStorage`.

### 3. Cinematic Real Footage Backgrounds (`SurahCinematicBackground.tsx`)
- High-definition real-footage drone videos (nature, landscapes, deserts, celestial skies) mapped per verse in `surahVerseVideos.ts`.
- Soft crossfade transition when switching between verses.
- Instant fallback to static 16:9 8K artwork (`public/assets/images/surah/`) when video is loading or when Image Mode is active.

---

## ⚙️ Environment Variables

```env
# Data source (default: seed)
NEXT_PUBLIC_DATA_SOURCE=seed

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Quran covers: ON by default
NEXT_PUBLIC_QURAN_IMAGES=1

# Supabase (optional — for persistent cloud DB)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# YouTube Data API (optional — for live playlist metadata)
YOUTUBE_API_KEY=
```

---

## 🛠️ Maintenance & Troubleshooting

### ⚠️ Dev Server & Build Cache Conflict
- **Symptom**: The browser displays only the background image, and all UI elements (Header, Verses, Player) disappear. The browser console shows 404 errors for `/_next/static/chunks/...`.
- **Cause**: Running `npm run build` while `next dev` is running overwrites `.next/` with production bundles, corrupting the active development server's chunk registry.
- **Solution**:
  ```bash
  # 1. Kill old node / next processes on port 3000
  lsof -ti:3000 | xargs kill -9

  # 2. Clear corrupted Next.js cache
  rm -rf .next

  # 3. Restart clean dev server
  npm run dev
  ```
  Then hard-refresh the browser (`Cmd + Shift + R`).

---

## 🚀 Quick Commands

```bash
# Start development server
npm run dev

# Run TypeScript type check
npm run typecheck

# Run production build
npm run build
```
