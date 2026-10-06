# HuDa Web Quran 🕌🎧

An immersive Holy Quran listening & reading web app, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS** and **Supabase**. Inspired by `https://tamilfm.co/v/auto`.

**Live:** [huda-web-quran.vercel.app](https://huda-web-quran.vercel.app) — Vercel auto-deploys every push to `main`.

---

## ✨ Features

### 🎧 Listen
- **All 114 Surahs and 30 Juz**, with Next/Previous navigation and continue-listening.
- **51 reciters**, switchable mid-recitation — playback carries on from the same ayah.
- **Word Sync for 9 reciters** (Sudais, Alafasy, Dosari, Abdul Basit, Minshawi, Hussary, Shuraim, Shatri, Tunaiji): the recited word is highlighted in gold, driven by Quran.com (QDC) word timings paired with the matching quranicaudio.com files. Other reciters play as **Audio Only**.
- **Juz with any reciter** via everyayah.com per-ayah clips (Maher keeps his full-Juz recordings). Juz boundaries follow the **Indo-Pak** division.
- **Isti'adhah & Bismillah preludes:** Surah 1 opens with the Isti'adhah, then the reciter's own Bismillah; Surahs 2–114 (except 9) open with the Bismillah — never doubled.
- Playback speed (0.75×–2×) and keyboard shortcuts:

  | Key | Action |
  | :--- | :--- |
  | `Space` | Play / Pause |
  | `→` / `←` | Next / Previous ayah |
  | `Shift` + `→` / `←` | Next / Previous Surah or Juz |
  | `M` | Mute |

### 📖 Read
- **Mushaf reading view** with a page picker, Sajdah markers, last-read position and bookmarks.
- **Tajweed colours** using Quran.com's QPC V4 COLRv1 page fonts (colours live inside the glyphs). The colour legend auto-hides after a few seconds.
- Arabic text in KFGQPC Hafs (`text_qpc_hafs`).
- **Translations in 10 languages:** English, Tamil, Urdu, Malayalam, Hindi, Indonesian, Bengali, Turkish, French and Malay (all from alquran.cloud — English and Tamil load with the verses; the other 8 are prebuilt in `public/data/quran-translations/` and fetched per Surah when picked). The first visit picks the language from the browser, then the location or time zone; a manual choice is remembered.

### 🎬 Visuals
- Cinematic background videos for Surahs and Juz, with verse-themed artwork as the fallback.
- All media (artwork, videos, prelude audio, reciter portraits) is served from **Cloudflare R2**.

### 💬 Community & more
- Anonymous view counts, likes and comments per Surah/Juz (Supabase RPCs), with a key-protected moderation page at `/admin/comments`.
- Installable **PWA** with an in-app install guide; mobile-first with safe-area support.

---

## 🛠️ Tech Stack

| Area | Tools |
| :--- | :--- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Framer Motion |
| Data | Static Quran data in `src/lib/data`; Supabase (Postgres + RPCs) for views, likes and comments |
| Media | Cloudflare R2 (`src/lib/media.ts` → `mediaUrl()`) |
| Audio sources | quranicaudio.com, mp3quran.net, everyayah.com |
| Hosting | Vercel |

---

## 🚀 Getting Started

```bash
npm install
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

### Environment variables (`.env.local`)

| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | R2 public base URL. If unset, media falls back to local `/public` paths. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Only for the R2 upload tool |

Never commit `.env*` files.

---

## 🧰 Project Scripts

- `scripts/tools/upload-to-r2.mjs` — idempotent media upload to R2 (dry-run by default; `--execute` to upload, `--category=images|videos|audio`).
- `scripts/qa/` — acoustic word-sync QA: verifies and repairs timings; mismatched reciter × Surah pairs fall back to Audio Only.
- `scripts/generation/` — artwork and video generation scripts.

---

## 📄 Documentation

- [HANDOFF.md](./HANDOFF.md) — current status, open work, services & accounts, and the architectural rules that must not be broken.
