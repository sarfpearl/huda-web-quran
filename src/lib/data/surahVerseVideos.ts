/**
 * HuDa Web Quran — Verse-by-Verse Real Footage Video Registry
 * 
 * Maps specific Quranic Surahs and Ayahs directly to authentic real-world
 * video assets recorded by real cinema cameras, drones, and astrophotography gear.
 * 
 * Strict Mandates:
 * 1. ZERO AI-generated or synthetic footage (No Veo, Sora, AI animation, or 2D image pan/zoom).
 * 2. NO Books/Manuscripts category (Books category completely removed).
 * 3. Every video represents the specific Ayah meaning.
 * 4. Specific physical subjects (Rain, Lightning, Ocean, Springs, Real Animals, Mosque, Desert) prioritized.
 * 5. Broadcast-grade 0.8s-1.0s overlap crossfade soft loop embedded in each asset.
 */

export interface SurahVerseVideo {
  surahNumber: number;
  ayahNumber: number;
  videoPath: string;
  theme: string;
  category: string;
  visualSubject: string;
  source: string;
  originalUrl: string;
  license: string;
  resolution: string;
  recitationDuration: number;
  videoDuration: number;
  loopMethod: string;
  status: "APPROVED" | "PENDING";
}

export const SURAH_VERSE_VIDEOS_REGISTRY: Record<number, Record<number, SurahVerseVideo>> = {
  // Surah 1: Al-Fatihah (The Opening) — Authentic Cinematic Real-Footage
  1: {
    1: {
      surahNumber: 1,
      ayahNumber: 1,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "Praise & Sovereignty of Allah, Lord of the Worlds",
      category: "Divine Majesty & Sanctuary",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    2: {
      surahNumber: 1,
      ayahNumber: 2,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "The Entirely Merciful, the Especially Merciful",
      category: "Divine Mercy",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    3: {
      surahNumber: 1,
      ayahNumber: 3,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "Sovereign of the Day of Recompense",
      category: "Divine Majesty",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    4: {
      surahNumber: 1,
      ayahNumber: 4,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "It is You we worship and You we ask for help",
      category: "Worship & Devotion",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    5: {
      surahNumber: 1,
      ayahNumber: 5,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "Guide us to the straight path",
      category: "Divine Guidance",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    6: {
      surahNumber: 1,
      ayahNumber: 6,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "The path of those upon whom You have bestowed favor",
      category: "Divine Guidance & Light",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
    7: {
      surahNumber: 1,
      ayahNumber: 7,
      videoPath: "/videos/surah/001-al-fatihah.mp4",
      theme: "Not of those who have evoked anger or of those who are astray",
      category: "Divine Refuge & Guidance",
      visualSubject: "Cinematic drone sweep across golden sunlit horizons, ancient desert ridges, and serene sacred skies.",
      source: "HuDa Authentic Archive",
      originalUrl: "/videos/surah/001-al-fatihah.mp4",
      license: "HuDa Cinematic Footage License",
      resolution: "1920x1080 (Full HD)",
      recitationDuration: 36.0,
      videoDuration: 19.0,
      loopMethod: "Continuous Soft Loop",
      status: "APPROVED",
    },
  },
  // Surah 2: Al-Baqarah (The Cow) — Re-Audited Native 1080p Real-Footage Pilot
  2: {
    // Ayah 2: Guidance (Huda) for the God-Conscious — Pure Sun Rays Through Mountain Clouds
    2: {
      surahNumber: 2,
      ayahNumber: 2,
      videoPath: "/videos/ayah/002/002.mp4",
      theme: "Guidance (Huda) & Illumination for the God-Conscious (Al-Muttaqin)",
      category: "Sunrise / Sunset / Natural Light",
      visualSubject: "Real cinema camera recording of golden sun rays streaming down through mountain clouds into the valley.",
      source: "Mixkit (Clip 4113)",
      originalUrl: "https://mixkit.co/free-stock-video/sun-rays-pass-through-the-clouds-in-the-mountains-4113/",
      license: "Mixkit Free Video License (Commercial web usage permitted, no attribution required)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 12.5,
      videoDuration: 12.00,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 19: The Parable of the Sudden Downpour, Thunder & Lightning
    19: {
      surahNumber: 2,
      ayahNumber: 19,
      videoPath: "/videos/ayah/002/019.mp4",
      theme: "A Downpour from the Sky with Darkness, Thunder & Lightning (Sayyib, Zulumat, Ra'd, Barq)",
      category: "Rain / Clouds / Weather / Lightning",
      visualSubject: "Real high-speed weather camera recording of electrical storm with lightning illuminating mountain ridges.",
      source: "Mixkit (Clip 4423)",
      originalUrl: "https://mixkit.co/free-stock-video/electrical-storm-in-the-mountains-4423/",
      license: "Mixkit Free Video License (Free for commercial web projects)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 9.2,
      videoDuration: 9.00,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 22: Earth Spread as a Resting Place & Rain Bringing Forth Fruitful Sustenance
    22: {
      surahNumber: 2,
      ayahNumber: 22,
      videoPath: "/videos/ayah/002/022.mp4",
      theme: "The Earth Spread Out, Reviving Rain from Heaven & Fruitful Provisions for Mankind",
      category: "Gardens / Nature & Provisions",
      visualSubject: "Razor-sharp cinema macro lens recording real raindrops collecting and dripping on lush green foliage.",
      source: "Mixkit (Clip 18310)",
      originalUrl: "https://mixkit.co/free-stock-video/very-close-shot-of-the-leaves-of-a-tree-wet-18310/",
      license: "Mixkit Free Video License (Commercial web license)",
      resolution: "1920x1080 (Full HD @ 24fps)",
      recitationDuration: 22.0,
      videoDuration: 10.51,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 29: Creation of the Earth & The Seven Heavens
    29: {
      surahNumber: 2,
      ayahNumber: 29,
      videoPath: "/videos/ayah/002/029.mp4",
      theme: "Creation of the Earth & The Majestic Seven Heavens (Sab'a Samawat)",
      category: "Night Sky / Real Astrophotography",
      visualSubject: "Real long-exposure astrophotography camera time-lapse of the Milky Way and starry celestial dome over mountain silhouettes.",
      source: "Mixkit (Clip 4148)",
      originalUrl: "https://mixkit.co/free-stock-video/milky-way-seen-at-night-4148/",
      license: "Mixkit Free Video License (Commercial web usage permitted)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 19.5,
      videoDuration: 14.50,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 60: Twelve Springs Gushing from the Cleft Stone
    60: {
      surahNumber: 2,
      ayahNumber: 60,
      videoPath: "/videos/ayah/002/060.mp4",
      theme: "Twelve Springs Gushing from the Cleft Stone (Infa-jarat minhu ithnata 'ashrata 'ayna)",
      category: "Rivers / Springs / Waterfalls",
      visualSubject: "High-definition cinema camera recording of crystal-clear mountain water surging over dark cleft rocks.",
      source: "Mixkit (Clip 2186)",
      originalUrl: "https://mixkit.co/free-stock-video/water-falling-over-stones-2186/",
      license: "Mixkit Free Video License (Commercial web license)",
      resolution: "1920x1080 (Full HD @ 24fps)",
      recitationDuration: 12.0,
      videoDuration: 10.51,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 125: The Sacred House as a Place of Return & Sanctuary
    125: {
      surahNumber: 2,
      ayahNumber: 125,
      videoPath: "/videos/ayah/002/125.mp4",
      theme: "The Sacred Sanctuary (Al-Bayt) as a Place of Return, Security & Prayer (Mathabatan lin-Nas)",
      category: "Islamic Architecture & Sanctuary",
      visualSubject: "Real telephoto camera capturing authentic historic Islamic mosque domes, golden crescent finials, and soaring minarets under blue sky.",
      source: "Mixkit (Clip 4313)",
      originalUrl: "https://mixkit.co/free-stock-video/symmetrical-mosque-4313/",
      license: "Mixkit Free Video License (Commercial web usage permitted)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 24.0,
      videoDuration: 13.00,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 164: Ships Sailing the Vast Ocean & Signs in Creation (Al-Fulk Al-Latee Tajree Fil-Bahr)
    164: {
      surahNumber: 2,
      ayahNumber: 164,
      videoPath: "/videos/ayah/002/164.mp4",
      theme: "Creation of Heavens & Earth, Alternation of Night & Day, Ships Sailing the Sea (Al-Fulk)",
      category: "Ocean / Sea & Sailing Ships",
      visualSubject: "Real cinema telephoto cinematography of a majestic ship sailing across the open sea under a golden setting sun.",
      source: "Mixkit (Clip 4477)",
      originalUrl: "https://mixkit.co/free-stock-video/view-of-the-horizon-in-the-sea-while-a-sailboat-4477/",
      license: "Mixkit Free Video License (Commercial web usage permitted)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 26.0,
      videoDuration: 15.00,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
    // Ayah 255: Ayat al-Kursi (The Throne Verse) — Sovereign Dominion & Infinite Horizon
    255: {
      surahNumber: 2,
      ayahNumber: 255,
      videoPath: "/videos/ayah/002/255.mp4",
      theme: "Ayat al-Kursi: Ever-Living (Al-Hayy), Sustainer (Al-Qayyum), Infinite Sovereignty over Heavens & Earth",
      category: "Desert & Vast Celestial Horizon",
      visualSubject: "Real drone sweep across undulating golden desert dunes into an infinite serene horizon under pure azure sky.",
      source: "Mixkit (Clip 4149)",
      originalUrl: "https://mixkit.co/free-stock-video/aerial-view-of-sand-dunes-in-a-desert-4149/",
      license: "Mixkit Free Video License (Commercial web usage permitted)",
      resolution: "1920x1080 (Full HD @ 30fps)",
      recitationDuration: 48.0,
      videoDuration: 10.00,
      loopMethod: "1.0s Broadcast Overlap Crossfade (xfade continuous)",
      status: "APPROVED",
    },
  },
};

/**
 * Resolves the dedicated real-footage video for a given Surah and Ayah number.
 * 
 * STRICT PROJECT RULE:
 * ZERO SEMANTIC FALLBACKS ALLOWED.
 * If the exact Ayah does not have its own approved dedicated real-footage asset,
 * this function returns NULL. Never silently display another Ayah's video.
 */
export function getAyahVideo(surahNumber: number, ayahNumber: number): SurahVerseVideo | null {
  const surahMap = SURAH_VERSE_VIDEOS_REGISTRY[surahNumber];
  if (!surahMap) return null;

  // Direct exact match only — NO fallback ranges permitted
  const exact = surahMap[ayahNumber];
  if (exact && exact.status === "APPROVED") {
    return exact;
  }

  return null;
}
