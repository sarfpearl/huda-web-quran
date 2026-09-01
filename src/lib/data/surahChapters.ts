/**
 * Huda Bayan — Verse-Aware Surah Chapters & Thematic Visual Mapping
 * 
 * Each of the 114 Surahs contains thematic chapters derived from the meaning
 * and progression of its verses, mapping to cinematic video journeys.
 */

export interface SurahChapter {
  id: number;
  fromVerse: number;
  toVerse: number;
  theme: string;
  mood: string;
  visualConcept: string;
  videoPath: string;
  /** Estimated relative percentage of Surah duration (0.0 to 1.0) */
  timeRange: [number, number];
}

export interface SurahVisualData {
  surahNumber: number;
  name: string;
  arabicName: string;
  verses: number;
  revelation: "Meccan" | "Medinan";
  slug: string;
  masterVideoPath: string;
  isMultiChapter: boolean;
  chapters: SurahChapter[];
}

export const SURAH_CHAPTERS_REGISTRY: Record<number, SurahVisualData> = {
  1: {
    surahNumber: 1,
    name: "Al-Fatihah",
    arabicName: "الفاتحة",
    verses: 7,
    revelation: "Meccan",
    slug: "al-fatihah",
    masterVideoPath: "/videos/surah/001-al-fatihah.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 3,
        theme: "Divine Praise, Mercy, and Sovereign Lordship",
        mood: "peaceful, luminous, awe-inspiring",
        visualConcept: "Dark peaceful landscape beginning to receive soft golden dawn light, opening up to majestic mountain ranges and flowing morning mist.",
        videoPath: "/videos/surah/001-al-fatihah.mp4",
        timeRange: [0, 0.45],
      },
      {
        id: 2,
        fromVerse: 4,
        toVerse: 5,
        theme: "Solemn Worship and Reliance on the Master of Judgment",
        mood: "majestic, profound, deep cosmos",
        visualConcept: "Deep celestial twilight horizon, cosmic expanse transitioning to a steady clear horizon of devotion.",
        videoPath: "/videos/surah/001-al-fatihah.mp4",
        timeRange: [0.45, 0.7],
      },
      {
        id: 3,
        fromVerse: 6,
        toVerse: 7,
        theme: "The Straight Path of Divine Favor and Guidance",
        mood: "radiant, serene, illuminated",
        visualConcept: "A single luminous illuminated path extending through serene valleys toward a glowing radiant horizon.",
        videoPath: "/videos/surah/001-al-fatihah.mp4",
        timeRange: [0.7, 1.0],
      },
    ],
  },
  2: {
    surahNumber: 2,
    name: "Al-Baqarah",
    arabicName: "البقرة",
    verses: 286,
    revelation: "Medinan",
    slug: "al-baqarah",
    masterVideoPath: "/videos/surah/002-al-baqarah/01-guidance.mp4",
    isMultiChapter: true,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 39,
        theme: "Guidance, Creation, Light and Divine Trust",
        mood: "transcendent, expansive, contemplative",
        visualConcept: "Atmospheric desert sunrise with luminous guidance path, drifting clouds over vast earth and mountains.",
        videoPath: "/videos/surah/002-al-baqarah/01-guidance.mp4",
        timeRange: [0, 0.35],
      },
      {
        id: 2,
        fromVerse: 40,
        toVerse: 162,
        theme: "Historical Covenant, Water from the Rock and Trials",
        mood: "historical, reflective, atmospheric",
        visualConcept: "Flowing desert springs, ancient rugged canyon formations under changing skies.",
        videoPath: "/videos/surah/002-al-baqarah/02-covenant.mp4",
        timeRange: [0.35, 0.7],
      },
      {
        id: 3,
        fromVerse: 163,
        toVerse: 286,
        theme: "Ayat al-Kursi, Divine Throne, and Final Supplication",
        mood: "majestic, serene, cosmic peace",
        visualConcept: "Deep celestial heavens with starry nebulas, descending warm rain over fertile lands and tranquil night horizon.",
        videoPath: "/videos/surah/002-al-baqarah/03-throne-and-peace.mp4",
        timeRange: [0.7, 1.0],
      },
    ],
  },
  18: {
    surahNumber: 18,
    name: "Al-Kahf",
    arabicName: "الكهف",
    verses: 110,
    revelation: "Meccan",
    slug: "al-kahf",
    masterVideoPath: "/videos/surah/018-al-kahf/01-cave-and-light.mp4",
    isMultiChapter: true,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 31,
        theme: "Companions of the Cave, Divine Protection and Slumber",
        mood: "mystical, peaceful, sheltered",
        visualConcept: "Natural stone archway with sun rays piercing through mist, ancient timeless mountain shelter.",
        videoPath: "/videos/surah/018-al-kahf/01-cave-and-light.mp4",
        timeRange: [0, 0.4],
      },
      {
        id: 2,
        fromVerse: 32,
        toVerse: 59,
        theme: "The Parable of Two Gardens and Transience of Wealth",
        mood: "lush, vibrant, contemplative",
        visualConcept: "Lush green oasis with flowing crystal stream, transitioning to windswept golden dunes.",
        videoPath: "/videos/surah/018-al-kahf/02-gardens.mp4",
        timeRange: [0.4, 0.75],
      },
      {
        id: 3,
        fromVerse: 60,
        toVerse: 110,
        theme: "Musa, Khidr, Dhul-Qarnayn and the Ocean of Knowledge",
        mood: "vast, exploratory, triumphant",
        visualConcept: "Meeting point of two seas, soaring mountain passes between two peaks and radiant sunset horizon.",
        videoPath: "/videos/surah/018-al-kahf/03-ocean-and-barrier.mp4",
        timeRange: [0.75, 1.0],
      },
    ],
  },
  36: {
    surahNumber: 36,
    name: "Ya-Sin",
    arabicName: "يس",
    verses: 83,
    revelation: "Meccan",
    slug: "ya-sin",
    masterVideoPath: "/videos/surah/036-ya-sin.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 32,
        theme: "The Heart of Quran, Revelation and Signs of Life",
        mood: "profound, resonant, luminous",
        visualConcept: "Star-lit night transitioning to illuminated spring valleys and awakening landscapes.",
        videoPath: "/videos/surah/036-ya-sin.mp4",
        timeRange: [0, 0.5],
      },
      {
        id: 2,
        fromVerse: 33,
        toVerse: 83,
        theme: "Sun and Moon in Orbit, Ships on the Seas, and Resurrection",
        mood: "cosmic, magnificent, peaceful",
        visualConcept: "Sun and crescent moon gliding through twilight sky, ocean waves glistening under moonlight.",
        videoPath: "/videos/surah/036-ya-sin.mp4",
        timeRange: [0.5, 1.0],
      },
    ],
  },
  55: {
    surahNumber: 55,
    name: "Ar-Rahman",
    arabicName: "الرحمن",
    verses: 78,
    revelation: "Medinan",
    slug: "ar-rahman",
    masterVideoPath: "/videos/surah/055-ar-rahman.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 30,
        theme: "Creation of Cosmos, Sun, Moon, Balance, and Earth",
        mood: "majestic, abundant, rhythmic",
        visualConcept: "Celestial balance of sun and moon, towering green mountains and fertile blossoming plains.",
        videoPath: "/videos/surah/055-ar-rahman.mp4",
        timeRange: [0, 0.45],
      },
      {
        id: 2,
        fromVerse: 31,
        toVerse: 78,
        theme: "Two Seas Meeting, Pearls, and the Gardens of Paradise",
        mood: "divine bounty, emerald greenery, flowing waters",
        visualConcept: "Convergence of two ocean currents with unseen barrier, cascading crystal waterfalls in lush paradise gardens.",
        videoPath: "/videos/surah/055-ar-rahman.mp4",
        timeRange: [0.45, 1.0],
      },
    ],
  },
  67: {
    surahNumber: 67,
    name: "Al-Mulk",
    arabicName: "الملك",
    verses: 30,
    revelation: "Meccan",
    slug: "al-mulk",
    masterVideoPath: "/videos/surah/067-al-mulk.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 15,
        theme: "Sovereignty of the Seven Heavens, Lamps in the Sky and Subservient Earth",
        mood: "astronomical, deep cosmic stillness",
        visualConcept: "Layered celestial atmosphere with glowing stars, camera sweeping across the curvature of earth.",
        videoPath: "/videos/surah/067-al-mulk.mp4",
        timeRange: [0, 0.55],
      },
      {
        id: 2,
        fromVerse: 16,
        toVerse: 30,
        theme: "Birds Gliding in Flight, Flowing Water and Divine Provision",
        mood: "contemplative, serene, flowing",
        visualConcept: "Wide open sky with gentle currents, crystal fresh water emerging from deep earth at dusk.",
        videoPath: "/videos/surah/067-al-mulk.mp4",
        timeRange: [0.55, 1.0],
      },
    ],
  },
  85: {
    surahNumber: 85,
    name: "Al-Buruj",
    arabicName: "البروج",
    verses: 22,
    revelation: "Meccan",
    slug: "al-buruj",
    masterVideoPath: "/videos/surah/085-al-buruj.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 22,
        theme: "The Sky with its Great Constellations, Preservation and Divine Power",
        mood: "awe-inspiring, timeless, resolute",
        visualConcept: "Deep twilight sky featuring prominent celestial constellations over tranquil dark mountain silhouettes.",
        videoPath: "/videos/surah/085-al-buruj.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
  91: {
    surahNumber: 91,
    name: "Ash-Shams",
    arabicName: "الشمس",
    verses: 15,
    revelation: "Meccan",
    slug: "ash-shams",
    masterVideoPath: "/videos/surah/091-ash-shams.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 15,
        theme: "The Sun and its Splendor, Moon, Day, Night and Purification of Soul",
        mood: "dramatic light shift, dawn to golden dusk",
        visualConcept: "Radiant golden sun rising over dunes, smoothly transitioning to silver moonlight and reflective horizons.",
        videoPath: "/videos/surah/091-ash-shams.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
  103: {
    surahNumber: 103,
    name: "Al-Asr",
    arabicName: "العصر",
    verses: 3,
    revelation: "Meccan",
    slug: "al-asr",
    masterVideoPath: "/videos/surah/103-al-asr.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 3,
        theme: "By Time, The Passage of Fleeting Hours, Faith, Truth and Patience",
        mood: "contemplative, warm amber twilight",
        visualConcept: "Dramatic amber sunset with shifting shadows across ancient desert, settling into enduring calm warmth.",
        videoPath: "/videos/surah/103-al-asr.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
  112: {
    surahNumber: 112,
    name: "Al-Ikhlas",
    arabicName: "الإخلاص",
    verses: 4,
    revelation: "Meccan",
    slug: "al-ikhlas",
    masterVideoPath: "/videos/surah/112-al-ikhlas.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 4,
        theme: "Absolute Divine Oneness, The Eternal, Unparalleled Sanctuary",
        mood: "pure, minimal, transcendent, stillness",
        visualConcept: "Immense, calm stillness of the deep sky with a single radiant, unblemished light illuminating tranquil mountain summits.",
        videoPath: "/videos/surah/112-al-ikhlas.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
  113: {
    surahNumber: 113,
    name: "Al-Falaq",
    arabicName: "الفلق",
    verses: 5,
    revelation: "Meccan",
    slug: "al-falaq",
    masterVideoPath: "/videos/surah/113-al-falaq.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 5,
        theme: "Seeking Refuge with the Lord of the Daybreak against Darkness",
        mood: "transformative, dark to vibrant dawn",
        visualConcept: "Dramatic breaking of dawn across a dark misty mountain ridge, darkness parting as cool crisp morning light dispels shadows.",
        videoPath: "/videos/surah/113-al-falaq.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
  114: {
    surahNumber: 114,
    name: "An-Nas",
    arabicName: "الناس",
    verses: 6,
    revelation: "Meccan",
    slug: "an-nas",
    masterVideoPath: "/videos/surah/114-an-nas.mp4",
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 6,
        theme: "Seeking Sanctuary with the Lord, King and True God of Humankind",
        mood: "peaceful sanctuary, protective aura",
        visualConcept: "Warm protective light surrounding a tranquil valley, clear peaceful night sky with gentle evening breeze through olive trees.",
        videoPath: "/videos/surah/114-an-nas.mp4",
        timeRange: [0, 1.0],
      },
    ],
  },
};

/**
 * Returns visual chapter metadata for a given Surah number (1-114).
 * Falls back to single default master path if not specifically multi-chaptered.
 */
export function getSurahVisualData(surahNum: number): SurahVisualData {
  if (SURAH_CHAPTERS_REGISTRY[surahNum]) {
    return SURAH_CHAPTERS_REGISTRY[surahNum];
  }
  const pad = String(surahNum).padStart(3, "0");
  const defaultPath = `/videos/surah/${pad}-surah.mp4`;
  return {
    surahNumber: surahNum,
    name: `Surah ${surahNum}`,
    arabicName: "",
    verses: 0,
    revelation: "Meccan",
    slug: `surah-${surahNum}`,
    masterVideoPath: defaultPath,
    isMultiChapter: false,
    chapters: [
      {
        id: 1,
        fromVerse: 1,
        toVerse: 999,
        theme: "Spiritual Reflection and Contemplation",
        mood: "serene, atmospheric",
        visualConcept: "Cinematic atmospheric Islamic landscape with soft lighting.",
        videoPath: defaultPath,
        timeRange: [0, 1.0],
      },
    ],
  };
}

/**
 * Resolves the currently active video path based on playback progress.
 */
export function resolveSurahVideoPath(
  surahNum: number,
  currentTime: number,
  totalDuration: number
): string {
  const data = getSurahVisualData(surahNum);
  if (!data.isMultiChapter || data.chapters.length <= 1 || totalDuration <= 0) {
    return data.masterVideoPath;
  }
  const progress = Math.min(Math.max(currentTime / totalDuration, 0), 1);
  const activeChapter = data.chapters.find(
    (c) => progress >= c.timeRange[0] && progress < c.timeRange[1]
  );
  return activeChapter?.videoPath ?? data.chapters[0].videoPath;
}
