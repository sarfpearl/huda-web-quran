# HuDa Web Quran 🕌🎧

An immersive, state-of-the-art Holy Quran & Islamic Audio web application built with **Next.js 14 (App Router)**, **TypeScript**, and **Tailwind CSS**. Inspired by `https://tamilfm.co/v/auto`.

---

## ✨ Features

- 📖 **Verse-Based 8K Quran Artwork (Surahs 1–114)**: Each Surah features custom 16:9 photorealistic visual storytelling based on specific Quranic Ayat and theological themes (`src/lib/data/quran-artwork.ts`).
- 🎬 **Dual Visual Experience (Video Mode & Image Mode)**: Edge-to-edge cinematic video scenes powered by Google Veo with persistent user preference toggle and smooth static artwork fallback.
- 🎨 **Glassmorphic Audio Player**: Dark glass player card with circular cover art, animated equalizer, progress slider, and transport controls.
- ⏭️ **Sequential Quran Surah Navigation**: Seamless Next/Previous cycling through all 114 Surahs with tracks starting reliably at `0:00`.
- 🎛️ **Mac-Style Right Control Center**: Slide-out drawer with 4 dedicated tabs (*Categories*, *Surahs 1–114*, *Juz 1–30*, *Speakers*) and instant live search.
- 🕌 **16 Atmospheric Islamic Categories**: High-definition scene backgrounds for *Iman & Taqwa*, *Qur'an*, *Salah*, *Dua*, *Ramadan*, *Hajj & Umrah*, etc.
- 🖥️ **Mac Retina XDR Display Sharpness**: Uncompressed 4K render pipeline (`-webkit-optimize-contrast`, `unoptimized={true}`) eliminating blurriness on high-DPI displays.
- 📱 **Mobile & Desktop Responsive**: Full touch targets, safe-area padding, PWA manifest, and keyboard shortcuts.

---

## 📄 Documentation Files

- [HANDOFF.md](./HANDOFF.md) — Comprehensive technical architecture, directory structure, data models, and roadmap.
- [YOUTUBE_MUSIC_GUIDE.md](./YOUTUBE_MUSIC_GUIDE.md) — Detailed guide on YouTube Music integration, playlist embedding, API setup, and licensing considerations.

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run TypeScript type check
npm run typecheck

# 3. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to experience the app.

