import type { Bayan } from "@/types/bayan";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  SEED / DEMO DATA
 *  This is temporary demonstration content used until Supabase is connected.
 *  Speaker names are FICTIONAL placeholders and are NOT real Islamic scholars.
 *  Local audio uses royalty-free sample tracks purely so playback is testable.
 *  Everything here is clearly marked demo and is never presented as authentic.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** High-quality live Islamic Bayan and Qur'an audio streams (Mishari Rashid Alafasy). */
const LIVE_AUDIO = [
  "https://server8.mp3quran.net/afs/001.mp3",
  "https://server8.mp3quran.net/afs/055.mp3",
  "https://server8.mp3quran.net/afs/036.mp3",
  "https://server8.mp3quran.net/afs/067.mp3",
  "https://server8.mp3quran.net/afs/018.mp3",
];

export const seedCategories: Category[] = [
  { name: "Iman & Taqwa", nameTa: "ஈமான் & தக்வா", slug: "iman-taqwa", description: "Strengthening faith and God-consciousness.", icon: "heart", sortOrder: 1, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Qur'an", nameTa: "குர்ஆன்", slug: "quran", description: "Reflections, tafsir and the guidance of the Qur'an.", icon: "book", sortOrder: 2, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Salah", nameTa: "தொழுகை", slug: "salah", description: "The prayer — its meaning, method and importance.", icon: "moon", sortOrder: 3, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Dua", nameTa: "துஆ", slug: "dua", description: "Supplication and connecting with Allah.", icon: "hands", sortOrder: 4, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Akhlaq", nameTa: "நற்பண்புகள்", slug: "akhlaq", description: "Character, manners and noble conduct.", icon: "sparkle", sortOrder: 5, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Family", nameTa: "குடும்பம்", slug: "family", description: "Building a righteous and loving household.", icon: "home", sortOrder: 6, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Marriage", nameTa: "திருமணம்", slug: "marriage", description: "Rights, harmony and the Sunnah of marriage.", icon: "rings", sortOrder: 7, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Parenting", nameTa: "பெற்றோர்", slug: "parenting", description: "Raising children upon faith and good values.", icon: "child", sortOrder: 8, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Youth", nameTa: "இளைஞர்கள்", slug: "youth", description: "Guidance and motivation for young Muslims.", icon: "star", sortOrder: 9, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Ramadan", nameTa: "ரமளான்", slug: "ramadan", description: "Fasting, worship and the blessed month.", icon: "lantern", sortOrder: 10, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Hajj & Umrah", nameTa: "ஹஜ் & உம்ரா", slug: "hajj-umrah", description: "The pilgrimage — rites, meaning and preparation.", icon: "kaaba", sortOrder: 11, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Death & Akhirah", nameTa: "மரணம் & மறுமை", slug: "death-akhirah", description: "Remembering the hereafter and preparing for it.", icon: "path", sortOrder: 12, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Islamic History", nameTa: "இஸ்லாமிய வரலாறு", slug: "islamic-history", description: "The Seerah, companions and lessons from the past.", icon: "scroll", sortOrder: 13, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Self Improvement", nameTa: "சுய முன்னேற்றம்", slug: "self-improvement", description: "Purifying the heart and bettering yourself.", icon: "growth", sortOrder: 14, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "Women's Topics", nameTa: "பெண்கள் தலைப்புகள்", slug: "womens-topics", description: "Guidance and reminders for Muslim women.", icon: "flower", sortOrder: 15, youtubePlaylistId: "PLFRt54vRoHJs" },
  { name: "General Bayan", nameTa: "பொது பயான்", slug: "general-bayan", description: "Reminders and talks across many themes.", icon: "mic", sortOrder: 16, youtubePlaylistId: "PLFRt54vRoHJs" },
].map((c, i) => ({
  id: `cat-${(i + 1).toString().padStart(2, "0")}`,
  coverImageUrl: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...c,
}));

export const seedSpeakers: Speaker[] = [
  {
    name: "Sheikh Abdullah",
    slug: "sheikh-abdullah-demo",
    bio: "A Tamil-speaking teacher who delivers reminders on faith, character and daily practice.",
  },
  {
    name: "Ustadh Yusuf",
    slug: "ustadh-yusuf-demo",
    bio: "Focused on the Qur'an and the prayer, with talks aimed at youth and families.",
  },
  {
    name: "Moulavi Ibrahim",
    slug: "moulavi-ibrahim-demo",
    bio: "Covering seerah, history and the hereafter.",
  },
  {
    name: "Ustadha Aisha",
    slug: "ustadha-aisha-demo",
    bio: "Addressing family life, parenting and topics for Muslim women.",
  },
].map((s, i) => ({
  id: `spk-${(i + 1).toString().padStart(2, "0")}`,
  profileImageUrl: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...s,
}));

const catId = (slug: string) => seedCategories.find((c) => c.slug === slug)!.id;
const spkId = (slug: string) => seedSpeakers.find((s) => s.slug === slug)!.id;

type SeedBayanInput = {
  title: string;
  slug: string;
  description: string;
  speaker: string;
  category: string;
  durationSeconds: number;
  audioSource: "local" | "youtube";
  audioIndex?: number;
  audioUrl?: string;
  youtubeVideoId?: string;
  youtubePlaylistId?: string;
  isFeatured?: boolean;
  playCount: number;
  publishedAt: string;
};

const rawBayan: SeedBayanInput[] = [
  {
    title: "Imanai Valarkkum Vazhi",
    slug: "imanai-valarkkum-vazhi",
    description:
      "A heartfelt reminder on the ways we can nurture and grow our iman in everyday life — through remembrance, sincerity and good company.",
    speaker: "sheikh-abdullah-demo",
    category: "iman-taqwa",
    durationSeconds: 2520,
    audioSource: "local",
    audioIndex: 0,
    isFeatured: true,
    playCount: 4820,
    publishedAt: "2026-07-20T09:00:00.000Z",
  },
  {
    title: "Salahin Mukkiyathuvam",
    slug: "salahin-mukkiyathuvam",
    description:
      "Why the five daily prayers are the pillar of a believer's life, and how to bring focus and khushu' into every salah.",
    speaker: "ustadh-yusuf-demo",
    category: "salah",
    durationSeconds: 1980,
    audioSource: "local",
    audioIndex: 1,
    isFeatured: true,
    playCount: 3910,
    publishedAt: "2026-07-14T09:00:00.000Z",
  },
  {
    title: "Allahvin Meedhu Nambikkai",
    slug: "allahvin-meedhu-nambikkai",
    description:
      "Placing complete trust (tawakkul) in Allah while striving with our means — finding peace in His decree.",
    speaker: "sheikh-abdullah-demo",
    category: "iman-taqwa",
    durationSeconds: 2160,
    audioSource: "youtube",
    youtubeVideoId: "ysz5S6PUM-U",
    isFeatured: true,
    playCount: 3120,
    publishedAt: "2026-07-08T09:00:00.000Z",
  },
  {
    title: "Pettrorgalai Mathippom",
    slug: "pettrorgalai-mathippom",
    description:
      "Honouring parents — their immense rights in Islam and practical ways to show kindness and gratitude to them.",
    speaker: "ustadha-aisha-demo",
    category: "family",
    durationSeconds: 2340,
    audioSource: "local",
    audioIndex: 2,
    isFeatured: true,
    playCount: 2760,
    publishedAt: "2026-06-30T09:00:00.000Z",
  },
  {
    title: "Quranai Puriyum Vidham",
    slug: "quranai-puriyum-vidham",
    description:
      "How to build a living relationship with the Qur'an — reciting, understanding and acting upon its guidance.",
    speaker: "ustadh-yusuf-demo",
    category: "quran",
    durationSeconds: 2880,
    audioSource: "local",
    audioIndex: 3,
    isFeatured: true,
    playCount: 2510,
    publishedAt: "2026-06-22T09:00:00.000Z",
  },
  {
    title: "Duavin Aatral",
    slug: "duavin-aatral",
    description:
      "The power of supplication — the manners of dua, the best times to call upon Allah, and why no dua is ever wasted.",
    speaker: "sheikh-abdullah-demo",
    category: "dua",
    durationSeconds: 1740,
    audioSource: "youtube",
    youtubeVideoId: "aqz-KE-bpKQ",
    isFeatured: true,
    playCount: 2280,
    publishedAt: "2026-06-15T09:00:00.000Z",
  },
  {
    title: "Nallozhukkam Enum Azhagu",
    slug: "nallozhukkam-enum-azhagu",
    description:
      "Good character as the heaviest deed on the scale — lessons in gentleness, honesty and patience from the Sunnah.",
    speaker: "moulavi-ibrahim-demo",
    category: "akhlaq",
    durationSeconds: 2040,
    audioSource: "local",
    audioIndex: 0,
    playCount: 1980,
    publishedAt: "2026-06-05T09:00:00.000Z",
  },
  {
    title: "Marana Ninaivu",
    slug: "marana-ninaivu",
    description:
      "Remembering death as a means of softening the heart and living each day with purpose and preparation for the akhirah.",
    speaker: "moulavi-ibrahim-demo",
    category: "death-akhirah",
    durationSeconds: 2700,
    audioSource: "local",
    audioIndex: 1,
    playCount: 1840,
    publishedAt: "2026-05-28T09:00:00.000Z",
  },
  {
    title: "Ramalan Maadhathin Barakat",
    slug: "ramalan-maadhathin-barakat",
    description:
      "Making the most of the blessed month — fasting with intention, night prayer, and renewing the soul.",
    speaker: "ustadh-yusuf-demo",
    category: "ramadan",
    durationSeconds: 2220,
    audioSource: "youtube",
    youtubeVideoId: "e-ORhEE9VVg",
    youtubePlaylistId: "PLFRt54vRoHJs",
    playCount: 1610,
    publishedAt: "2026-05-20T09:00:00.000Z",
  },
  {
    title: "Ilaignarukkana Vazhikaatudhal",
    slug: "ilaignarukkana-vazhikaatudhal",
    description:
      "A motivating talk for the youth — staying steadfast, guarding the heart and using your energy for good.",
    speaker: "sheikh-abdullah-demo",
    category: "youth",
    durationSeconds: 1860,
    audioSource: "local",
    audioIndex: 2,
    playCount: 1440,
    publishedAt: "2026-05-12T09:00:00.000Z",
  },
  {
    title: "Kudumba Vaazhkaiyin Azhagu",
    slug: "kudumba-vaazhkaiyin-azhagu",
    description:
      "Building a home filled with mercy — the rights of spouses and raising children upon faith.",
    speaker: "ustadha-aisha-demo",
    category: "marriage",
    durationSeconds: 2460,
    audioSource: "local",
    audioIndex: 3,
    playCount: 1290,
    publishedAt: "2026-05-04T09:00:00.000Z",
  },
  {
    title: "Nabigalin Varalaru",
    slug: "nabigalin-varalaru",
    description:
      "Lessons from the Seerah — glimpses from the life of the Prophet ﷺ and what they teach us today.",
    speaker: "moulavi-ibrahim-demo",
    category: "islamic-history",
    durationSeconds: 3120,
    audioSource: "local",
    audioIndex: 0,
    playCount: 1120,
    publishedAt: "2026-04-26T09:00:00.000Z",
  },
];

export const seedBayan: Bayan[] = rawBayan.map((b, i) => ({
  id: `bay-${(i + 1).toString().padStart(3, "0")}`,
  title: b.title,
  slug: b.slug,
  description: b.description,
  speakerId: spkId(b.speaker),
  categoryId: catId(b.category),
  language: "Tamil",
  coverImageUrl: null,
  audioSource: b.audioSource,
  audioUrl: b.audioUrl || LIVE_AUDIO[i % LIVE_AUDIO.length],
  youtubeVideoId: b.audioSource === "youtube" ? b.youtubeVideoId ?? null : null,
  youtubePlaylistId: b.youtubePlaylistId ?? null,
  durationSeconds: b.durationSeconds,
  publishedAt: b.publishedAt,
  isFeatured: b.isFeatured ?? false,
  isPublished: true,
  playCount: b.playCount,
  createdAt: b.publishedAt,
  updatedAt: b.publishedAt,
}));
