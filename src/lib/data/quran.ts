import type { BayanWithRelations } from "@/types/bayan";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import { SURAH_METADATA_LIST } from "./surahList";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  QURAN DATA LAYER — VIDEO-FIRST SURAH SYSTEM
 *  The 30 Juz & 114 Surahs of the Holy Qur'an, mapped to playable tracks
 *  that flow through the EXISTING global audio player (AudioPlayerContext).
 *
 *  Audio providers:
 *   - Juz: Internet Archive (Shaykh Maher Al-Muaiqly)
 *   - Surahs: MP3Quran.net (Shaykh Abdur Rahman As-Sudais)
 * ─────────────────────────────────────────────────────────────────────────
 */

const RECITER_BASE =
  "https://dn720304.ca.archive.org/0/items/quran-juz-audio-mp3";

export const TRACK_ID_PREFIX = "quran-juz-";
export const JUZ_TRACK_ID_PREFIX = "quran-juz-";

export function quranImageUrl(
  kind: "surah" | "juz",
  num: number
): string {
  return `/images/quran/${kind}-${num}.jpg?v=8`;
}

/** Public shape consumed by the Quran picker UI. */
export interface QuranJuz {
  id: number;
  title: string;
  subtitle: string;
  label: string;
  audioUrl: string;
}

const audioForJuz = (juz: number) =>
  `${RECITER_BASE}/Para%20${String(juz).padStart(2, "0")}.mp3`;

const JUZ_TITLES: string[] = [
  "Alif Lam Meem",
  "Sayaqul",
  "Tilkal Rusul",
  "Lan Tanaloo",
  "Wal Mohsanat",
  "La Yuhibbullah",
  "Wa Iza Sami'oo",
  "Wa Lau Annana",
  "Qalal Malaou",
  "Wa A'lamoo",
  "Yatazeroon",
  "Wa Mamin Da'abat",
  "Wa Ma Ubrioo",
  "Rubama",
  "Subhanallazi",
  "Qal Alam",
  "Aqtarabo",
  "Qadd Aflaha",
  "Wa Qalallazina",
  "A'man Khalaq",
  "Utlu Ma Oohia",
  "Wa Manyaqnut",
  "Wa Mali",
  "Faman Azlam",
  "Elahe Yuruddo",
  "Ha'a Meem",
  "Qala Fama Khatbukum",
  "Qadd Sami Allah",
  "Tabarakallazi",
  "Amma Yatasa'aloon",
];

export const QURAN_JUZ: QuranJuz[] = JUZ_TITLES.map((title, i) => {
  const num = i + 1;
  return {
    id: num,
    title,
    subtitle: `Juz ${num} of 30`,
    label: `Para ${num}`,
    audioUrl: audioForJuz(num),
  };
});

// ── Synthetic relations so tracks satisfy BayanWithRelations ────────────

const QURAN_CATEGORY: Category = {
  id: "quran-recitation",
  name: "Quran",
  nameTa: "குர்ஆன்",
  slug: "quran-recitation",
  description: "Holy Qur'an recitation by Juz & Surah",
  icon: "book",
  coverImageUrl: null,
  sortOrder: 0,
  isActive: true,
  createdAt: "",
};

const QURAN_RECITER: Speaker = {
  id: "reciter-maher-al-muaiqly",
  name: "Maher Al-Muaiqly",
  slug: "maher-al-muaiqly",
  bio: "Holy Qur'an reciter",
  profileImageUrl: null,
  isActive: true,
  createdAt: "",
};

export function quranJuzToTrack(juz: QuranJuz): BayanWithRelations {
  return {
    id: `${TRACK_ID_PREFIX}${juz.id}`,
    title: juz.title,
    slug: `${TRACK_ID_PREFIX}${juz.id}`,
    description: juz.subtitle,
    speakerId: QURAN_RECITER.id,
    categoryId: QURAN_CATEGORY.id,
    language: "Arabic",
    coverImageUrl: quranImageUrl("juz", juz.id),
    audioSource: "local",
    audioUrl: juz.audioUrl,
    youtubeVideoId: null,
    youtubePlaylistId: null,
    durationSeconds: 900,
    publishedAt: null,
    isFeatured: false,
    isPublished: true,
    playCount: 0,
    createdAt: "",
    updatedAt: "",
    speaker: QURAN_RECITER,
    category: QURAN_CATEGORY,
  };
}

export const QURAN_TRACKS: BayanWithRelations[] = QURAN_JUZ.map(quranJuzToTrack);

export function isQuranTrackId(id: string | undefined | null): boolean {
  return typeof id === "string" && id.startsWith(TRACK_ID_PREFIX);
}

export function getQuranJuzByTrackId(id: string): QuranJuz | undefined {
  if (!isQuranTrackId(id)) return undefined;
  const num = Number(id.slice(TRACK_ID_PREFIX.length));
  return QURAN_JUZ.find((j) => j.id === num);
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  SURAHS — 114 chapters with pure video-first cinematic assets.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const SURAH_TRACK_ID_PREFIX = "quran-surah-";
const SUDAIS_BASE = "https://server11.mp3quran.net/sds";

export const surahAudioUrl = (n: number) =>
  `${SUDAIS_BASE}/${String(n).padStart(3, "0")}.mp3`;

export type RevelationType = "Meccan" | "Medinan";

export interface QuranSurah {
  id: number;
  number: number;
  name: string;
  arabicName: string;
  nameArabic: string;
  verses: number;
  type: RevelationType;
  revelation: RevelationType;
  slug: string;
  theme: string;
  visualConcept: string;
  audioUrl: string;
  audio: string;
  image: string;
  coverImage: string;
  coverImageUrl: string;
}

const SURAH_METADATA_EXTRAS: Record<number, { arabicName: string; verses: number; type: RevelationType }> = {
  1: { arabicName: "الفاتحة", verses: 7, type: "Meccan" },
  2: { arabicName: "البقرة", verses: 286, type: "Medinan" },
  3: { arabicName: "آل عمران", verses: 200, type: "Medinan" },
  4: { arabicName: "النساء", verses: 176, type: "Medinan" },
  5: { arabicName: "المائدة", verses: 120, type: "Medinan" },
  6: { arabicName: "الأنعام", verses: 165, type: "Meccan" },
  7: { arabicName: "الأعراف", verses: 206, type: "Meccan" },
  8: { arabicName: "الأنفال", verses: 75, type: "Medinan" },
  9: { arabicName: "التوبة", verses: 129, type: "Medinan" },
  10: { arabicName: "يونس", verses: 109, type: "Meccan" },
  11: { arabicName: "هود", verses: 123, type: "Meccan" },
  12: { arabicName: "يوسف", verses: 111, type: "Meccan" },
  13: { arabicName: "الرعد", verses: 43, type: "Medinan" },
  14: { arabicName: "إبراهيم", verses: 52, type: "Meccan" },
  15: { arabicName: "الحجر", verses: 99, type: "Meccan" },
  16: { arabicName: "النحل", verses: 128, type: "Meccan" },
  17: { arabicName: "الإسراء", verses: 111, type: "Meccan" },
  18: { arabicName: "الكهف", verses: 110, type: "Meccan" },
  19: { arabicName: "مريم", verses: 98, type: "Meccan" },
  20: { arabicName: "طه", verses: 135, type: "Meccan" },
  21: { arabicName: "الأنبياء", verses: 112, type: "Meccan" },
  22: { arabicName: "الحج", verses: 78, type: "Medinan" },
  23: { arabicName: "المؤمنون", verses: 118, type: "Meccan" },
  24: { arabicName: "النور", verses: 64, type: "Medinan" },
  25: { arabicName: "الفرقان", verses: 77, type: "Meccan" },
  26: { arabicName: "الشعراء", verses: 227, type: "Meccan" },
  27: { arabicName: "النمل", verses: 93, type: "Meccan" },
  28: { arabicName: "القصص", verses: 88, type: "Meccan" },
  29: { arabicName: "العنكبوت", verses: 69, type: "Meccan" },
  30: { arabicName: "الروم", verses: 60, type: "Meccan" },
  31: { arabicName: "لقمان", verses: 34, type: "Meccan" },
  32: { arabicName: "السجدة", verses: 30, type: "Meccan" },
  33: { arabicName: "الأحزاب", verses: 73, type: "Medinan" },
  34: { arabicName: "سبأ", verses: 54, type: "Meccan" },
  35: { arabicName: "فاطر", verses: 45, type: "Meccan" },
  36: { arabicName: "يس", verses: 83, type: "Meccan" },
  37: { arabicName: "الصافات", verses: 182, type: "Meccan" },
  38: { arabicName: "ص", verses: 88, type: "Meccan" },
  39: { arabicName: "الزمر", verses: 75, type: "Meccan" },
  40: { arabicName: "غافر", verses: 85, type: "Meccan" },
  41: { arabicName: "فصلت", verses: 54, type: "Meccan" },
  42: { arabicName: "الشورى", verses: 53, type: "Meccan" },
  43: { arabicName: "الزخرف", verses: 89, type: "Meccan" },
  44: { arabicName: "الدخان", verses: 59, type: "Meccan" },
  45: { arabicName: "الجاثية", verses: 37, type: "Meccan" },
  46: { arabicName: "الأحقاف", verses: 35, type: "Meccan" },
  47: { arabicName: "محمد", verses: 38, type: "Medinan" },
  48: { arabicName: "الفتح", verses: 29, type: "Medinan" },
  49: { arabicName: "الحجرات", verses: 18, type: "Medinan" },
  50: { arabicName: "ق", verses: 45, type: "Meccan" },
  51: { arabicName: "الذاريات", verses: 60, type: "Meccan" },
  52: { arabicName: "الطور", verses: 49, type: "Meccan" },
  53: { arabicName: "النجم", verses: 62, type: "Meccan" },
  54: { arabicName: "القمر", verses: 55, type: "Meccan" },
  55: { arabicName: "الرحمن", verses: 78, type: "Medinan" },
  56: { arabicName: "الواقعة", verses: 96, type: "Meccan" },
  57: { arabicName: "الحديد", verses: 29, type: "Medinan" },
  58: { arabicName: "المجادلة", verses: 22, type: "Medinan" },
  59: { arabicName: "الحشر", verses: 24, type: "Medinan" },
  60: { arabicName: "الممتحنة", verses: 13, type: "Medinan" },
  61: { arabicName: "الصف", verses: 14, type: "Medinan" },
  62: { arabicName: "الجمعة", verses: 11, type: "Medinan" },
  63: { arabicName: "المنافقون", verses: 11, type: "Medinan" },
  64: { arabicName: "التغابن", verses: 18, type: "Medinan" },
  65: { arabicName: "الطلاق", verses: 12, type: "Medinan" },
  66: { arabicName: "التحريم", verses: 12, type: "Medinan" },
  67: { arabicName: "الملك", verses: 30, type: "Meccan" },
  68: { arabicName: "القلم", verses: 52, type: "Meccan" },
  69: { arabicName: "الحاقة", verses: 52, type: "Meccan" },
  70: { arabicName: "المعارج", verses: 44, type: "Meccan" },
  71: { arabicName: "نوح", verses: 28, type: "Meccan" },
  72: { arabicName: "الجن", verses: 28, type: "Meccan" },
  73: { arabicName: "المزمل", verses: 20, type: "Meccan" },
  74: { arabicName: "المدثر", verses: 56, type: "Meccan" },
  75: { arabicName: "القيامة", verses: 40, type: "Meccan" },
  76: { arabicName: "الإنسان", verses: 31, type: "Medinan" },
  77: { arabicName: "المرسلات", verses: 50, type: "Meccan" },
  78: { arabicName: "النبأ", verses: 40, type: "Meccan" },
  79: { arabicName: "النازعات", verses: 46, type: "Meccan" },
  80: { arabicName: "عبس", verses: 42, type: "Meccan" },
  81: { arabicName: "التكوير", verses: 29, type: "Meccan" },
  82: { arabicName: "الإنفطار", verses: 19, type: "Meccan" },
  83: { arabicName: "المطففين", verses: 36, type: "Meccan" },
  84: { arabicName: "الإنشقاق", verses: 25, type: "Meccan" },
  85: { arabicName: "البروج", verses: 22, type: "Meccan" },
  86: { arabicName: "الطارق", verses: 17, type: "Meccan" },
  87: { arabicName: "الأعلى", verses: 19, type: "Meccan" },
  88: { arabicName: "الغاشية", verses: 26, type: "Meccan" },
  89: { arabicName: "الفجر", verses: 30, type: "Meccan" },
  90: { arabicName: "البلد", verses: 20, type: "Meccan" },
  91: { arabicName: "الشمس", verses: 15, type: "Meccan" },
  92: { arabicName: "الليل", verses: 21, type: "Meccan" },
  93: { arabicName: "الضحى", verses: 11, type: "Meccan" },
  94: { arabicName: "الشرح", verses: 8, type: "Meccan" },
  95: { arabicName: "التين", verses: 8, type: "Meccan" },
  96: { arabicName: "العلق", verses: 19, type: "Meccan" },
  97: { arabicName: "القدر", verses: 5, type: "Meccan" },
  98: { arabicName: "البينة", verses: 8, type: "Medinan" },
  99: { arabicName: "الزلزلة", verses: 8, type: "Medinan" },
  100: { arabicName: "العاديات", verses: 11, type: "Meccan" },
  101: { arabicName: "القارعة", verses: 11, type: "Meccan" },
  102: { arabicName: "التكاثر", verses: 8, type: "Meccan" },
  103: { arabicName: "العصر", verses: 3, type: "Meccan" },
  104: { arabicName: "الهمزة", verses: 9, type: "Meccan" },
  105: { arabicName: "الفيل", verses: 5, type: "Meccan" },
  106: { arabicName: "قريش", verses: 4, type: "Meccan" },
  107: { arabicName: "الماعون", verses: 7, type: "Meccan" },
  108: { arabicName: "الكوثر", verses: 3, type: "Meccan" },
  109: { arabicName: "الكافرون", verses: 6, type: "Meccan" },
  110: { arabicName: "النصر", verses: 3, type: "Medinan" },
  111: { arabicName: "المسد", verses: 5, type: "Meccan" },
  112: { arabicName: "الإخلاص", verses: 4, type: "Meccan" },
  113: { arabicName: "الفلق", verses: 5, type: "Meccan" },
  114: { arabicName: "الناس", verses: 6, type: "Meccan" },
};

export const QURAN_SURAHS: QuranSurah[] = SURAH_METADATA_LIST.map((s) => {
  const extra = SURAH_METADATA_EXTRAS[s.num] ?? {
    arabicName: "",
    verses: 0,
    type: "Meccan" as RevelationType,
  };
  const img = quranImageUrl("surah", s.num);
  const audio = surahAudioUrl(s.num);

  return {
    id: s.num,
    number: s.num,
    name: s.name,
    arabicName: extra.arabicName,
    nameArabic: extra.arabicName,
    verses: extra.verses,
    type: extra.type,
    revelation: extra.type,
    slug: s.slug,
    theme: s.theme,
    visualConcept: s.prompt,
    audioUrl: audio,
    audio: audio,
    image: img,
    coverImage: img,
    coverImageUrl: img,
  };
});

const SUDAIS_RECITER: Speaker = {
  id: "reciter-abdur-rahman-as-sudais",
  name: "Abdur Rahman As-Sudais",
  slug: "abdur-rahman-as-sudais",
  bio: "Holy Qur'an reciter",
  profileImageUrl: null,
  isActive: true,
  createdAt: "",
};

export function quranSurahToTrack(surah: QuranSurah): BayanWithRelations {
  return {
    id: `${SURAH_TRACK_ID_PREFIX}${surah.number}`,
    title: surah.name,
    slug: `${SURAH_TRACK_ID_PREFIX}${surah.number}`,
    description: `Surah ${surah.number} • ${surah.verses} Verses`,
    speakerId: SUDAIS_RECITER.id,
    categoryId: QURAN_CATEGORY.id,
    language: "Arabic",
    coverImageUrl: surah.image || quranImageUrl("surah", surah.number),
    audioSource: "local",
    audioUrl: surah.audioUrl,
    youtubeVideoId: null,
    youtubePlaylistId: null,
    durationSeconds: 300,
    publishedAt: null,
    isFeatured: false,
    isPublished: true,
    playCount: 0,
    createdAt: "",
    updatedAt: "",
    speaker: SUDAIS_RECITER,
    category: QURAN_CATEGORY,
  };
}

export const SURAH_TRACKS: BayanWithRelations[] =
  QURAN_SURAHS.map(quranSurahToTrack);

export function isSurahTrackId(id: string | undefined | null): boolean {
  return typeof id === "string" && id.startsWith(SURAH_TRACK_ID_PREFIX);
}

export function getSurahByTrackId(id: string): QuranSurah | undefined {
  if (!isSurahTrackId(id)) return undefined;
  const num = Number(id.slice(SURAH_TRACK_ID_PREFIX.length));
  return QURAN_SURAHS.find((s) => s.number === num);
}

export function getSurahByNumber(num: number): QuranSurah | undefined {
  return QURAN_SURAHS.find((s) => s.number === num);
}

export function getRandomSurahTrack(excludeTrackId?: string): BayanWithRelations {
  const pool = excludeTrackId
    ? SURAH_TRACKS.filter((t) => t.id !== excludeTrackId)
    : SURAH_TRACKS;
  const safePool = pool.length > 0 ? pool : SURAH_TRACKS;
  return safePool[Math.floor(Math.random() * safePool.length)];
}

export function isQuranTrack(id: string | undefined | null): boolean {
  return isQuranTrackId(id) || isSurahTrackId(id);
}

export function quranPlayerSubtitle(id: string): string | undefined {
  const juz = getQuranJuzByTrackId(id);
  if (juz) return `${juz.label} • ${juz.subtitle}`;
  const surah = getSurahByTrackId(id);
  if (surah) return `Surah ${surah.number} • ${surah.verses} Verses`;
  return undefined;
}

export function quranContentLabel(id: string): string | undefined {
  const juz = getQuranJuzByTrackId(id);
  if (juz) return `Quran • Juz ${juz.id}`;
  const surah = getSurahByTrackId(id);
  if (surah) return `Quran • Surah ${surah.number}`;
  return undefined;
}

