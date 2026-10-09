/**
 * HuDa Web Quran — Verse Data Engine
 * 
 * Provides verse-by-verse Arabic calligraphy text & English translation
 * for all 114 Surahs, with instant pre-bundled datasets, local caching,
 * and live recitation audio synchronization.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { QURAN_ARTWORK_CONCEPTS } from "./quran-artwork";
import { getAyahVideo } from "./surahVerseVideos";
import { fetchSurahGlyphs } from "./quranGlyphs";
import { type QuranReciter, getReciterTimingCapability, reciterHasWordTiming, reciterHasWordTimingFor, reciterEmbedsOwnBismillah, getReciterById } from "./quranReciters";

export interface QuranWordTiming {
  word: string;
  startTime: number; // In seconds relative to audio start
  endTime: number;   // In seconds relative to audio start
}

/**
 * Raw QDC audio segment in recitation order. `wordIndex` is the 1-based position
 * of the word in the canonical word list. A word recited more than once appears
 * here as several segments sharing the same `wordIndex`, so the live highlight
 * can follow the voice back onto a repeated word (something the flat per-word
 * `words[]` array cannot express).
 */
export interface WordSegment {
  wordIndex: number;
  startTime: number;
  endTime: number;
  /**
   * The source had no segment of its own for this word: it lies inside the
   * measured voice segment of its neighbour (QDC merged several words into one
   * segment), and that segment's span is shared among the words it covers by
   * their letter counts. Measured bounds, estimated split.
   */
  estimated?: boolean;
}

/**
 * A prelude the reciter's own audio recites before ayah 1 (not our prelude
 * clip): its bounds in that audio, measured from the recording (see
 * scripts/qa/repair-timings.cjs). No per-word timing — shown as a phrase.
 */
export interface EmbeddedPrelude {
  type: "istiadhah" | "bismillah";
  startTime: number;
  endTime: number;
}

export type RecitationSegmentType = "istiadhah" | "bismillah" | "ayah";

export interface AyahWordSync {
  id: string;
  arabic: string;
  startTime: number;
  endTime: number;
}

export interface AyahVideoSync {
  source: string;
  startTime?: number;
  endTime?: number;
}

export interface AyahSync {
  id: string;
  type: RecitationSegmentType;
  surah: number;
  ayah: number;
  startTime: number;
  endTime: number;
  textArabic: string;
  textEnglish: string;
  textTamil?: string;
  verseKey?: string;
  words?: AyahWordSync[];
  video?: AyahVideoSync | null;
}

export interface QuranSyncState {
  currentAyah: AyahSync | null;
  currentWord: AyahWordSync | null;
  activeWordIndex: number;
  hasWordTiming: boolean;
  currentVideo: string | null;
  activeAyahIndex: number;
  totalAyahs: number;
  voiceProgress: number;
}

export interface RecitationSegment {
  id: string; // e.g. "prelude-istiadhah", "prelude-bismillah", "ayah-1:1"
  type: RecitationSegmentType;
  startTime: number; // In seconds relative to audio start
  endTime: number;   // In seconds relative to audio start
  textArabic: string;
  textEnglish: string;
  textTamil?: string;
  surahNumber?: number;
  ayahNumber?: number;
  verseKey?: string;
  words?: QuranWordTiming[];
  wordSegments?: WordSegment[];
  video?: AyahVideoSync | null;
  /** The real audio's end (s): no word is recited — or highlighted — after it. */
  audioEnd?: number;
}

export const CANONICAL_ISTIADHAH = {
  textArabic: "أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَٰنِ ٱلرَّجِيمِ",
  textEnglish: "I seek refuge in Allah from the accursed Satan.",
  textTamil: "விரட்டப்பட்ட ஷைத்தானை விட்டும் அல்லாஹ்விடம் நான் பாதுகாப்புத் தேடுகிறேன்.",
  wordsList: ["أَعُوذُ", "بِٱللَّهِ", "مِنَ", "ٱلشَّيْطَٰنِ", "ٱلرَّجِيمِ"],
};

export const CANONICAL_BISMILLAH = {
  textArabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
  textEnglish: "In the name of Allah, the Most Gracious, the Most Merciful.",
  textTamil: "அளவற்ற அருளாளனும், நிகரற்ற அன்புடையோனுமாகிய அல்லாஹ்வின் திருப்பெயரால் (துவங்குகிறேன்).",
  wordsList: ["بِسْمِ", "ٱللَّهِ", "ٱلرَّحْمَٰنِ", "ٱلرَّحِيمِ"],
};

export const FATIHAH_PRELUDE_SEGMENTS: RecitationSegment[] = [
  {
    id: "prelude-istiadhah",
    type: "istiadhah",
    startTime: 0,
    endTime: 6.60,
    textArabic: CANONICAL_ISTIADHAH.textArabic,
    textEnglish: CANONICAL_ISTIADHAH.textEnglish,
    textTamil: CANONICAL_ISTIADHAH.textTamil,
    words: [
      { word: "أَعُوذُ", startTime: 0.50, endTime: 1.55 },
      { word: "بِٱللَّهِ", startTime: 1.55, endTime: 2.80 },
      { word: "مِنَ", startTime: 2.80, endTime: 3.25 },
      { word: "ٱلشَّيْطَٰنِ", startTime: 3.25, endTime: 4.30 },
      { word: "ٱلرَّجِيمِ", startTime: 4.30, endTime: 6.45 },
    ],
  },
  {
    id: "prelude-bismillah",
    type: "bismillah",
    startTime: 6.60,
    endTime: 12.60,
    textArabic: CANONICAL_BISMILLAH.textArabic,
    textEnglish: CANONICAL_BISMILLAH.textEnglish,
    textTamil: CANONICAL_BISMILLAH.textTamil,
    words: [
      { word: "بِسْمِ", startTime: 6.65, endTime: 7.45 },
      { word: "ٱللَّهِ", startTime: 7.45, endTime: 8.40 },
      { word: "ٱلرَّحْمَٰنِ", startTime: 8.40, endTime: 9.55 },
      { word: "ٱلرَّحِيمِ", startTime: 9.55, endTime: 12.35 },
    ],
  },
];

export const BISMILLAH_PRELUDE_SEGMENTS: RecitationSegment[] = [
  {
    id: "prelude-bismillah",
    type: "bismillah",
    startTime: 0,
    endTime: 6.00,
    textArabic: CANONICAL_BISMILLAH.textArabic,
    textEnglish: CANONICAL_BISMILLAH.textEnglish,
    textTamil: CANONICAL_BISMILLAH.textTamil,
    words: [
      { word: "بِسْمِ", startTime: 0.05, endTime: 0.85 },
      { word: "ٱللَّهِ", startTime: 0.85, endTime: 1.80 },
      { word: "ٱلرَّحْمَٰنِ", startTime: 1.80, endTime: 2.95 },
      { word: "ٱلرَّحِيمِ", startTime: 2.95, endTime: 5.75 },
    ],
  },
];

export interface AyahVerse {
  surahNumber: number;
  ayahNumber: number;
  textArabic: string;
  textEnglish: string;
  textTamil?: string;
  verseKey: string;
  timestampFrom?: number; // In seconds
  timestampTo?: number;   // In seconds
  words?: QuranWordTiming[];
  wordSegments?: WordSegment[];
  /**
   * The reciter has timing for this ayah's position in the audio but no usable
   * WORD timing (no segments, or segments too sparse / out of order to trust):
   * the ayah shows without a recited word instead of a made-up one.
   */
  noWordTiming?: string;
  /** Ayah 1 only: preludes recited in the reciter's own audio before it. */
  embeddedPrelude?: EmbeddedPrelude[];
  /**
   * The timing dataset's own ayah window in the Surah audio (seconds), before
   * any boundary refinement. everyayah.com's per-ayah clips are cut at exactly
   * this window (measured: ≤1.3% length difference at p95 for most reciters),
   * so it maps a Juz clip's time onto the Surah-time word segments.
   */
  datasetWindow?: { from: number; to: number };
}

/** Pre-seeded instant verses for zero-latency initial render & offline reliability */
const PRE_SEEDED_SURAHS: Record<number, AyahVerse[]> = {
  // Surah 1: Al-Fatihah (Complete canonical 7 Ayahs with exact acoustic word boundaries for untrimmed audio)
  1: [
    {
      surahNumber: 1,
      ayahNumber: 1,
      textArabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      textEnglish: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      textTamil: "அளவற்ற அருளாளன், நிகரற்ற அன்பாளன், அல்லாஹ்வின் பெயரால்! (தொடங்குகிறேன்).",
      verseKey: "1:1",
      timestampFrom: 0.0,
      timestampTo: 3.08,
      words: [
        { word: "بِسْمِ", startTime: 0.0, endTime: 0.65 },
        { word: "ٱللَّهِ", startTime: 0.65, endTime: 1.13 },
        { word: "ٱلرَّحْمَٰنِ", startTime: 1.13, endTime: 1.86 },
        { word: "ٱلرَّحِيمِ", startTime: 1.86, endTime: 2.725 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 2,
      textArabic: "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
      textEnglish: "[All] praise is [due] to Allah, Lord of the worlds -",
      textTamil: "அனைத்துப்புகழும், அகிலங்கள் எல்லாவற்றையும் படைத்து வளர்த்துப் பரிபக்குவப்படுத்தும் (நாயனான) அல்லாஹ்வுக்கே ஆகும்.",
      verseKey: "1:2",
      timestampFrom: 3.08,
      timestampTo: 7.57,
      words: [
        { word: "ٱلْحَمْدُ", startTime: 3.08, endTime: 4.05 },
        { word: "لِلَّهِ", startTime: 4.05, endTime: 4.92 },
        { word: "رَبِّ", startTime: 4.92, endTime: 5.51 },
        { word: "ٱلْعَٰلَمِينَ", startTime: 5.51, endTime: 7.165 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 3,
      textArabic: "ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      textEnglish: "The Entirely Merciful, the Especially Merciful,",
      textTamil: "(அவன்) அளவற்ற அருளாளன், நிகரற்ற அன்புடையோன்.",
      verseKey: "1:3",
      timestampFrom: 7.57,
      timestampTo: 10.68,
      words: [
        { word: "ٱلرَّحْمَٰنِ", startTime: 7.57, endTime: 8.65 },
        { word: "ٱلرَّحِيمِ", startTime: 8.65, endTime: 10.305 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 4,
      textArabic: "مَٰلِكِ يَوْمِ ٱلدِّينِ",
      textEnglish: "Sovereign of the Day of Recompense.",
      textTamil: "(அவனே நியாயத்) தீர்ப்பு நாளின் அதிபதி(யும் ஆவான்).",
      verseKey: "1:4",
      timestampFrom: 10.68,
      timestampTo: 14.13,
      words: [
        { word: "مَٰلِكِ", startTime: 10.68, endTime: 11.38 },
        { word: "يَوْمِ", startTime: 11.38, endTime: 12.1 },
        { word: "ٱلدِّينِ", startTime: 12.1, endTime: 13.565 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 5,
      textArabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
      textEnglish: "It is You we worship and You we ask for help.",
      textTamil: "(இறைவா!) உன்னையே நாங்கள் வணங்குகிறோம், உன்னிடமே நாங்கள் உதவியும் தேடுகிறோம்.",
      verseKey: "1:5",
      timestampFrom: 14.13,
      timestampTo: 19.07,
      words: [
        { word: "إِيَّاكَ", startTime: 14.13, endTime: 15.09 },
        { word: "نَعْبُدُ", startTime: 15.09, endTime: 15.84 },
        { word: "وَإِيَّاكَ", startTime: 15.84, endTime: 16.96 },
        { word: "نَسْتَعِينُ", startTime: 16.96, endTime: 18.575 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 6,
      textArabic: "ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ",
      textEnglish: "Guide us to the straight path -",
      textTamil: "நீ எங்களை நேர் வழியில் நடத்துவாயாக!",
      verseKey: "1:6",
      timestampFrom: 19.07,
      timestampTo: 23.28,
      words: [
        { word: "ٱهْدِنَا", startTime: 19.07, endTime: 19.55 },
        { word: "ٱلصِّرَٰطَ", startTime: 19.55, endTime: 20.72 },
        { word: "ٱلْمُسْتَقِيمَ", startTime: 20.72, endTime: 22.825 },
      ],
    },
    {
      surahNumber: 1,
      ayahNumber: 7,
      textArabic: "صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ",
      textEnglish: "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.",
      textTamil: "(அது) நீ எவர்களுக்கு அருள் புரிந்தாயோ அவ்வழி, (அது) உன் கோபத்துக்கு ஆளானோர் வழியுமல்ல, நெறி தவறியோர் வழியுமல்ல.",
      verseKey: "1:7",
      timestampFrom: 23.28,
      timestampTo: 34.93,
      words: [
        { word: "صِرَٰطَ", startTime: 23.28, endTime: 24.2 },
        { word: "ٱلَّذِينَ", startTime: 24.2, endTime: 25.24 },
        { word: "أَنْعَمْتَ", startTime: 25.24, endTime: 26.14 },
        { word: "عَلَيْهِمْ", startTime: 26.14, endTime: 27.2 },
        { word: "غَيْرِ", startTime: 27.2, endTime: 27.85 },
        { word: "ٱلْمَغْضُوبِ", startTime: 27.85, endTime: 28.89 },
        { word: "عَلَيْهِمْ", startTime: 28.89, endTime: 30.0 },
        { word: "وَلَا", startTime: 30.0, endTime: 30.33 },
        { word: "ٱلضَّآلِّينَ", startTime: 30.33, endTime: 34.715 },
      ],
    },
  ],



  // Surah 108 (Exact Voice Waveform Acoustic Timings)
  108: [
    {
      surahNumber: 108,
      ayahNumber: 1,
      textArabic: "إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ",
      textEnglish: "Indeed, We have granted you, [O Muhammad], al-Kawthar.",
      textTamil: "(நபியே!) நிச்சயமாக நாம் உமக்கு கவ்ஸர் (என்ற தடாகத்தை) கொடுத்திருக்கின்றோம்.",
      verseKey: "108:1",
      timestampFrom: 0,
      timestampTo: 4.81,
      words: [
        { word: "إِنَّآ", startTime: 0, endTime: 1.98 },
        { word: "أَعْطَيْنَٰكَ", startTime: 1.98, endTime: 3.52 },
        { word: "ٱلْكَوْثَرَ", startTime: 3.52, endTime: 4.705 },
      ],
    },
    {
      surahNumber: 108,
      ayahNumber: 2,
      textArabic: "فَصَلِّ لِرَبِّكَ وَٱنْحَرْ",
      textEnglish: "So pray to your Lord and sacrifice [to Him alone].",
      textTamil: "எனவே, உம் இறைவனுக்கு நீர் தொழுது, குர்பானியும் கொடுப்பீராக.",
      verseKey: "108:2",
      timestampFrom: 4.81,
      timestampTo: 8.05,
      words: [
        { word: "فَصَلِّ", startTime: 4.81, endTime: 5.85 },
        { word: "لِرَبِّكَ", startTime: 5.85, endTime: 6.96 },
        { word: "وَٱنْحَرْ", startTime: 6.96, endTime: 7.915 },
      ],
    },
    {
      surahNumber: 108,
      ayahNumber: 3,
      textArabic: "إِنَّ شَانِئَكَ هُوَ ٱلْأَبْتَرُ",
      textEnglish: "Indeed, your enemy is the one cut off.",
      textTamil: "நிச்சயமாக உம்முடைய பகைவன் (எவனோ) அவன்தான் சந்ததியற்றவன்.",
      verseKey: "108:3",
      timestampFrom: 8.05,
      timestampTo: 13.22,
      words: [
        { word: "إِنَّ", startTime: 8.05, endTime: 9.13 },
        { word: "شَانِئَكَ", startTime: 9.13, endTime: 10.66 },
        { word: "هُوَ", startTime: 10.66, endTime: 11.15 },
        { word: "ٱلْأَبْتَرُ", startTime: 11.15, endTime: 13.065 },
      ],
    },
  ],

  // Surah 112 (Exact Voice Waveform Acoustic Timings)
  112: [
    {
      surahNumber: 112,
      ayahNumber: 1,
      textArabic: "قُلْ هُوَ ٱللَّهُ أَحَدٌ",
      textEnglish: "Say, \"He is Allah, [who is] One,",
      textTamil: "(நபியே!) நீர் கூறுவீராக: அல்லாஹ் அவன் ஒருவனே.",
      verseKey: "112:1",
      timestampFrom: 0,
      timestampTo: 2.95,
      words: [
        { word: "قُلْ", startTime: 0, endTime: 0.35 },
        { word: "هُوَ", startTime: 0.35, endTime: 0.86 },
        { word: "ٱللَّهُ", startTime: 0.86, endTime: 1.88 },
        { word: "أَحَدٌ", startTime: 1.88, endTime: 2.845 },
      ],
    },
    {
      surahNumber: 112,
      ayahNumber: 2,
      textArabic: "ٱللَّهُ ٱلصَّمَدُ",
      textEnglish: "Allah, the Eternal Refuge.",
      textTamil: "அல்லாஹ் (எவரிடத்தும்) தேவையற்றவன்.",
      verseKey: "112:2",
      timestampFrom: 2.95,
      timestampTo: 5.51,
      words: [
        { word: "ٱللَّهُ", startTime: 2.95, endTime: 4.24 },
        { word: "ٱلصَّمَدُ", startTime: 4.24, endTime: 5.375 },
      ],
    },
    {
      surahNumber: 112,
      ayahNumber: 3,
      textArabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
      textEnglish: "He neither begets nor is born,",
      textTamil: "அவன் (எவரையும்) பெறவுமில்லை (எவராலும்) பெறப்படவுமில்லை.",
      verseKey: "112:3",
      timestampFrom: 5.51,
      timestampTo: 8.28,
      words: [
        { word: "لَمْ", startTime: 5.51, endTime: 5.92 },
        { word: "يَلِدْ", startTime: 5.92, endTime: 6.72 },
        { word: "وَلَمْ", startTime: 6.72, endTime: 7.24 },
        { word: "يُولَدْ", startTime: 7.24, endTime: 8.175 },
      ],
    },
    {
      surahNumber: 112,
      ayahNumber: 4,
      textArabic: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ",
      textEnglish: "Nor is there to Him any equivalent.\"",
      textTamil: "அன்றியும், அவனுக்கு நிகராக எவரும் இல்லை.",
      verseKey: "112:4",
      timestampFrom: 8.28,
      timestampTo: 12.85,
      words: [
        { word: "وَلَمْ", startTime: 8.28, endTime: 8.87 },
        { word: "يَكُن", startTime: 8.87, endTime: 9.45 },
        { word: "لَّهُۥ", startTime: 9.45, endTime: 10.48 },
        { word: "كُفُوًا", startTime: 10.48, endTime: 11.55 },
        { word: "أَحَدٌۢ", startTime: 11.55, endTime: 12.595 },
      ],
    },
  ],

  // Surah 113 (Exact Voice Waveform Acoustic Timings)
  113: [
    {
      surahNumber: 113,
      ayahNumber: 1,
      textArabic: "قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ",
      textEnglish: "Say, \"I seek refuge in the Lord of daybreak",
      textTamil: "(நபியே!) நீர் சொல்வீராக: அதிகாலையின் இறைவனிடத்தில் நான் காவல் தேடுகிறேன்.",
      verseKey: "113:1",
      timestampFrom: 0,
      timestampTo: 3.19,
      words: [
        { word: "قُلْ", startTime: 0, endTime: 0.54 },
        { word: "أَعُوذُ", startTime: 0.54, endTime: 1.37 },
        { word: "بِرَبِّ", startTime: 1.37, endTime: 2.34 },
        { word: "ٱلْفَلَقِ", startTime: 2.34, endTime: 3.085 },
      ],
    },
    {
      surahNumber: 113,
      ayahNumber: 2,
      textArabic: "مِن شَرِّ مَا خَلَقَ",
      textEnglish: "From the evil of that which He created",
      textTamil: "அவன் படைத்தவற்றின் தீங்கை விட்டும்-",
      verseKey: "113:2",
      timestampFrom: 3.19,
      timestampTo: 6.04,
      words: [
        { word: "مِن", startTime: 3.19, endTime: 3.87 },
        { word: "شَرِّ", startTime: 3.87, endTime: 4.54 },
        { word: "مَا", startTime: 4.54, endTime: 4.88 },
        { word: "خَلَقَ", startTime: 4.88, endTime: 5.805 },
      ],
    },
    {
      surahNumber: 113,
      ayahNumber: 3,
      textArabic: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
      textEnglish: "And from the evil of darkness when it settles",
      textTamil: "இருள் பரவும் போது ஏற்படும் இரவின் தீங்கை விட்டும்-",
      verseKey: "113:3",
      timestampFrom: 6.04,
      timestampTo: 10.43,
      words: [
        { word: "وَمِن", startTime: 6.04, endTime: 7 },
        { word: "شَرِّ", startTime: 7, endTime: 7.64 },
        { word: "غَاسِقٍ", startTime: 7.64, endTime: 8.9 },
        { word: "إِذَا", startTime: 8.9, endTime: 9.47 },
        { word: "وَقَبَ", startTime: 9.47, endTime: 10.325 },
      ],
    },
    {
      surahNumber: 113,
      ayahNumber: 4,
      textArabic: "وَمِن شَرِّ ٱلنَّفَّٰثَٰتِ فِى ٱلْعُقَدِ",
      textEnglish: "And from the evil of the blowers in knots",
      textTamil: "இன்னும், முடிச்சுகளில் (மந்திரித்து) ஊதும் பெண்களின் தீங்கை விட்டும்,",
      verseKey: "113:4",
      timestampFrom: 10.43,
      timestampTo: 15.58,
      words: [
        { word: "وَمِن", startTime: 10.43, endTime: 11.58 },
        { word: "شَرِّ", startTime: 11.58, endTime: 12.31 },
        { word: "ٱلنَّفَّٰثَٰتِ", startTime: 12.31, endTime: 14.28 },
        { word: "فِى", startTime: 14.28, endTime: 14.46 },
        { word: "ٱلْعُقَدِ", startTime: 14.46, endTime: 15.475 },
      ],
    },
    {
      surahNumber: 113,
      ayahNumber: 5,
      textArabic: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
      textEnglish: "And from the evil of an envier when he envies.\"",
      textTamil: "பொறாமைக்காரன் பொறாமை கொள்ளும் போதுண்டாகும் தீங்கை விட்டும் (காவல் தேடுகிறேன்).",
      verseKey: "113:5",
      timestampFrom: 15.58,
      timestampTo: 21.43,
      words: [
        { word: "وَمِن", startTime: 15.58, endTime: 16.76 },
        { word: "شَرِّ", startTime: 16.76, endTime: 17.49 },
        { word: "حَاسِدٍ", startTime: 17.49, endTime: 19.08 },
        { word: "إِذَا", startTime: 19.08, endTime: 19.87 },
        { word: "حَسَدَ", startTime: 19.87, endTime: 20.795 },
      ],
    },
  ],

  // Surah 114 (Exact Voice Waveform Acoustic Timings)
  114: [
    {
      surahNumber: 114,
      ayahNumber: 1,
      textArabic: "قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ",
      textEnglish: "Say, \"I seek refuge in the Lord of mankind,",
      textTamil: "(நபியே!) நீர் கூறுவீராக: மனிதர்களின் இறைவனிடத்தில் நான் காவல் தேடுகிறேன்.",
      verseKey: "114:1",
      timestampFrom: 0,
      timestampTo: 3.45,
      words: [
        { word: "قُلْ", startTime: 0, endTime: 0.27 },
        { word: "أَعُوذُ", startTime: 0.27, endTime: 1.26 },
        { word: "بِرَبِّ", startTime: 1.26, endTime: 2.25 },
        { word: "ٱلنَّاسِ", startTime: 2.25, endTime: 3.345 },
      ],
    },
    {
      surahNumber: 114,
      ayahNumber: 2,
      textArabic: "مَلِكِ ٱلنَّاسِ",
      textEnglish: "The Sovereign of mankind.",
      textTamil: "(அவனே) மனிதர்களின் அரசன்;",
      verseKey: "114:2",
      timestampFrom: 3.45,
      timestampTo: 5.51,
      words: [
        { word: "مَلِكِ", startTime: 3.45, endTime: 4.1 },
        { word: "ٱلنَّاسِ", startTime: 4.1, endTime: 5.415 },
      ],
    },
    {
      surahNumber: 114,
      ayahNumber: 3,
      textArabic: "إِلَٰهِ ٱلنَّاسِ",
      textEnglish: "The God of mankind,",
      textTamil: "(அவனே) மனிதர்களின் நாயன்.",
      verseKey: "114:3",
      timestampFrom: 5.51,
      timestampTo: 8.85,
      words: [
        { word: "إِلَٰهِ", startTime: 5.51, endTime: 6.4 },
        { word: "ٱلنَّاسِ", startTime: 6.4, endTime: 8.695 },
      ],
    },
    {
      surahNumber: 114,
      ayahNumber: 4,
      textArabic: "مِن شَرِّ ٱلْوَسْوَاسِ ٱلْخَنَّاسِ",
      textEnglish: "From the evil of the retreating whisperer -",
      textTamil: "பதுங்கியிருந்து வீண் சந்தேகங்களை உண்டாக்குபவனின் தீங்கை விட்டும் (இறைவனிடத்தில் நான் காவல் தேடுகிறேன்).",
      verseKey: "114:4",
      timestampFrom: 8.85,
      timestampTo: 14.94,
      words: [
        { word: "مِن", startTime: 8.85, endTime: 10.04 },
        { word: "شَرِّ", startTime: 10.04, endTime: 10.75 },
        { word: "ٱلْوَسْوَاسِ", startTime: 10.75, endTime: 12.08 },
        { word: "ٱلْخَنَّاسِ", startTime: 12.08, endTime: 14.775 },
      ],
    },
    {
      surahNumber: 114,
      ayahNumber: 5,
      textArabic: "ٱلَّذِى يُوَسْوِسُ فِى صُدُورِ ٱلنَّاسِ",
      textEnglish: "Who whispers [evil] into the breasts of mankind -",
      textTamil: "அவன் மனிதர்களின் இதயங்களில் வீண் சந்தேகங்களை உண்டாக்குகிறான்.",
      verseKey: "114:5",
      timestampFrom: 14.94,
      timestampTo: 20.19,
      words: [
        { word: "ٱلَّذِى", startTime: 14.94, endTime: 16.15 },
        { word: "يُوَسْوِسُ", startTime: 16.15, endTime: 17.18 },
        { word: "فِى", startTime: 17.18, endTime: 17.59 },
        { word: "صُدُورِ", startTime: 17.59, endTime: 18.51 },
        { word: "ٱلنَّاسِ", startTime: 18.51, endTime: 20.085 },
      ],
    },
    {
      surahNumber: 114,
      ayahNumber: 6,
      textArabic: "مِنَ ٱلْجِنَّةِ وَٱلنَّاسِ",
      textEnglish: "From among the jinn and mankind.\"",
      textTamil: "(இத்தகையோர்) ஜின்களிலும், மனிதர்களிலும் இருக்கின்றனர்.",
      verseKey: "114:6",
      timestampFrom: 20.19,
      timestampTo: 26.17,
      words: [
        { word: "مِنَ", startTime: 20.19, endTime: 20.61 },
        { word: "ٱلْجِنَّةِ", startTime: 20.61, endTime: 22.42 },
        { word: "وَٱلنَّاسِ", startTime: 22.42, endTime: 25.935 },
      ],
    },
  ],
};

/** In-memory cache for dynamic API results, keyed by `surah::reciterId`. */
const memoryCache = new Map<string, AyahVerse[]>();
/**
 * Stand-in verse lists (a lone Bismillah) returned when every source failed.
 * Never cached: a failed fetch (many at once while scrolling fast) otherwise
 * stuck the Surah as "Bismillah, then blank ayahs" until a reload.
 */
const fallbackLists = new WeakSet<AyahVerse[]>();
export function isFallbackVerses(verses: AyahVerse[] | null | undefined): boolean {
  return Boolean(verses && fallbackLists.has(verses));
}

const cacheKey = (surahNumber: number, reciterId: string) => `${surahNumber}::${reciterId}`;

/** Waqf (pause) diacritic marks that are not spoken words. */
const WAQF_MARKS = /^[ۖ-ۭؕ-ؚۚۗۘۙۛۜ۟۠ۢۤ]+$/;
/**
 * Reduces Arabic text to a bare consonant skeleton: strips every combining mark
 * (harakat, shadda, sukun, superscript alef, Quranic annotation signs) and the
 * tatweel, and folds alef variants to a plain alef. Uthmani sources spell the
 * Bismillah with subtly different code points, so a skeleton comparison is the
 * only reliable way to detect it.
 */
function arabicSkeleton(text: string): string {
  return text
    .normalize("NFC")
    .replace(/\p{Mn}/gu, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, "\u0627")
    .replace(/\s+/g, "");
}

const BISMILLAH_SKELETON = arabicSkeleton("\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650");

/**
 * Removes a leading Bismillah from ayah 1 of surahs 2-114 (surah 1 counts it as
 * its own ayah; surah 9 has none). Matches on the consonant skeleton so it works
 * across Uthmani code-point variants. Returns the text unchanged when no
 * Bismillah prefix is present.
 */
function stripLeadingBismillah(textArabic: string, surahNumber: number): string {
  if (surahNumber === 1 || surahNumber === 9) return textArabic;
  const words = textArabic.trim().split(/\s+/);
  if (words.length <= 4) return textArabic;
  if (arabicSkeleton(words.slice(0, 4).join("")) === BISMILLAH_SKELETON) {
    return words.slice(4).join(" ").trim();
  }
  return textArabic;
}

/** Splits an ayah's Uthmani text into spoken words (drops standalone waqf marks). */
function splitArabicWords(textArabic: string): string[] {
  return textArabic
    .trim()
    .split(/\s+/)
    .filter((w) => !WAQF_MARKS.test(w) && w.replace(/[ً-ٰٟۖ-ۭ]/g, "").length > 0);
}

/** Raw QDC segment as cached in /data/quran-timings/<reciter>/<surah>.json. */
interface RawSegment {
  wordIndex?: number;
  startSec: number;
  endSec: number;
}

/**
 * Minimum share of an ayah's words that must have their own voice segment, and
 * minimum share of segment-to-segment steps that move to the same or next word,
 * for its word timing to be trusted. Below either, the source segments are too
 * sparse or scrambled (e.g. Tunaiji 13:1 «1,13,13,13,8,5,5,1,…») and filling
 * them in would be guessing — the ayah shows without a recited word instead.
 */
const MIN_WORD_COVERAGE = 0.5;
const MIN_SEQUENTIAL_STEPS = 0.6;

/**
 * A run of 1–3 segments whose word positions fit neither side (QDC typos such
 * as «31,32,33,34,118,36» or «3,4,5,51,42,12») while the segments around it
 * continue each other's sequence: the run was recited in between, so it is
 * renumbered into the gap it sits in (measured span, inferred label →
 * estimated). A genuine repeat continues from its NEW position, so it stays.
 */
function relabelOutliers(segs: WordSegment[]): WordSegment[] {
  const out = segs.map((s) => ({ ...s }));
  // A leading run before the sequence starts (e.g. 45:10 «13,14,2,3,…»).
  for (let L = 1; L <= 3 && L < out.length; L++) {
    const b = out[L].wordIndex;
    if (b >= 1 && b <= L + 1 && out.slice(0, L).every((x) => x.wordIndex > b + 1)) {
      for (let i = 0; i < L; i++) out[i] = { ...out[i], wordIndex: b > 1 ? Math.min(i + 1, b - 1) : 1, estimated: true };
      break;
    }
  }
  for (let k = 1; k < out.length - 1; k++) {
    const a = out[k - 1].wordIndex;
    for (let L = 1; L <= 3 && k + L < out.length; L++) {
      const b = out[k + L].wordIndex;
      const run = out.slice(k, k + L);
      const fitsGap = b - a >= 1 && b - a <= L + 6;
      // (A repeat never qualifies: it steps back, so what follows it isn't b > a.)
      const offSide = run.every((x) => x.wordIndex < a - 1 || x.wordIndex > b + 1);
      if (!fitsGap || !offSide) continue;
      const missing = b - a - 1;
      run.forEach((x, i) => {
        out[k + i] = { ...x, wordIndex: missing > 0 ? a + 1 + Math.min(i, missing - 1) : a, estimated: true };
      });
      k += L - 1;
      break;
    }
  }
  return out;
}

/** Letters of a word (for sharing a merged segment among its words). */
const letterWeight = (w: string | undefined) => Math.max(1, (w ?? "").replace(/[ً-ٰٟۖ-ۭـ\s]/g, "").length);

/**
 * Cleans one ayah's raw QDC segments into recitation-order word segments over
 * word positions 1..wordCount, or explains why its word timing can't be used.
 *  - 0-based indexes (one Alafasy ayah) are shifted to 1-based;
 *  - empty / inverted segments are dropped, overlaps trimmed to the next start;
 *  - a segment followed by a jump over n words, or a first / last segment that
 *    isn't word 1 / the last word, covered those words too (QDC merges words
 *    into one segment): its measured span is shared among them (estimated).
 */
export function sanitizeWordSegments(
  raw: RawSegment[] | undefined,
  wordsText: string[],
  ayahWindow?: { from: number; to: number }
): { segments: WordSegment[] } | { reason: string } {
  const G = wordsText.length;
  if (!raw || raw.length === 0) return { reason: "no word segments in source" };
  if (G === 0) return { reason: "no words" };
  const idx = raw.map((s) => (typeof s.wordIndex === "number" ? s.wordIndex : NaN));
  if (idx.some((i) => !Number.isInteger(i))) return { reason: "segments without word positions" };
  const zeroBased = Math.min(...idx) === 0 && Math.max(...idx) === G - 1;
  let segs: WordSegment[] = raw
    .map((s, k) => ({ wordIndex: idx[k] + (zeroBased ? 1 : 0), startTime: s.startSec, endTime: s.endSec }))
    .filter((s) => s.wordIndex >= 1 && s.wordIndex <= G && s.endTime > s.startTime);
  if (segs.length === 0) return { reason: "no valid word segments" };
  // Segments displaced from their own ayah (Alafasy 6:93 starts 22s early):
  // a data error the acoustic repair re-places; unrepaired, don't trust them.
  if (ayahWindow && ayahWindow.to > ayahWindow.from) {
    const inside = segs.filter((s) => s.startTime >= ayahWindow.from - 0.5 && s.startTime < ayahWindow.to + 0.5).length;
    if (inside / segs.length < 0.8) return { reason: "word segments displaced from the ayah" };
  }
  for (let k = 0; k + 1 < segs.length; k++) {
    if (segs[k].endTime > segs[k + 1].startTime && segs[k + 1].startTime > segs[k].startTime) {
      segs[k] = { ...segs[k], endTime: segs[k + 1].startTime };
    }
  }
  segs = segs.filter((s, k) => k === 0 || s.startTime >= segs[k - 1].startTime);
  segs = relabelOutliers(segs);

  const covered = new Set(segs.map((s) => s.wordIndex)).size / G;
  let steps = 0;
  for (let k = 1; k < segs.length; k++) {
    const d = segs[k].wordIndex - segs[k - 1].wordIndex;
    if (d === 0 || d === 1) steps++;
  }
  const sequential = segs.length > 1 ? steps / (segs.length - 1) : 1;
  if (G > 1 && covered < MIN_WORD_COVERAGE) return { reason: "too few word segments (under half the words)" };
  if (segs.length >= 4 && sequential < MIN_SEQUENTIAL_STEPS) {
    return { reason: "word segments out of recitation order" };
  }

  // Share a measured span among consecutive word positions [from..to].
  const share = (s: WordSegment, from: number, to: number): WordSegment[] => {
    const ws = [];
    for (let w = from; w <= to; w++) ws.push(letterWeight(wordsText[w - 1]));
    const total = ws.reduce((a, b) => a + b, 0);
    const out: WordSegment[] = [];
    let t = s.startTime;
    for (let w = from; w <= to; w++) {
      const end = w === to ? s.endTime : t + ((s.endTime - s.startTime) * ws[w - from]) / total;
      out.push({ wordIndex: w, startTime: t, endTime: end, ...(w === s.wordIndex ? {} : { estimated: true }) });
      t = end;
    }
    return out;
  };
  const out: WordSegment[] = [];
  for (let k = 0; k < segs.length; k++) {
    const s = segs[k];
    const next = segs[k + 1];
    let from = s.wordIndex;
    let to = s.wordIndex;
    // Leading words before the first segment's word were recited in it.
    if (k === 0 && s.wordIndex > 1) from = 1;
    // A forward jump over words: this segment also covered the skipped ones.
    if (next && next.wordIndex > s.wordIndex + 1) to = next.wordIndex - 1;
    // Trailing words after the last segment's word.
    if (!next && s.wordIndex < G) to = G;
    out.push(...(from === to ? [s] : share(s, from, to)));
  }
  return { segments: out };
}

/**
 * Overlays a reciter's Quran.com (QDC) word-segment timings onto base text
 * verses. Each reciter recites at their own pace, so the timing dataset is
 * loaded per reciter from `/data/quran-timings/<reciterId>/<surah>.json`.
 * Returns a NEW verse array (base text untouched), null if this reciter has
 * no usable timing for the Surah, or undefined if it couldn't be loaded right
 * now (network) — worth trying again.
 *
 * Only this reciter's own timing is ever used: an ayah whose word segments are
 * missing or unusable gets `noWordTiming` (ayah shown, no recited word) — never
 * another reciter's words or an even split of the ayah.
 */
async function applyReciterTimings(
  baseVerses: AyahVerse[],
  surahNumber: number,
  reciterId: string
): Promise<AyahVerse[] | null | undefined> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`/data/quran-timings/${reciterId}/${surahNumber}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const timings = data?.verseTimings;
    if (!Array.isArray(timings) || timings.length === 0) return null;

    const byAyah = new Map<number, any>();
    timings.forEach((vt: any) => byAyah.set(vt.ayahNumber, vt));
    const glyphs = await fetchGlyphWordTexts(surahNumber);

    const out = baseVerses.map((verse) => {
      const vt = byAyah.get(verse.ayahNumber);
      if (!vt) return { ...verse, words: undefined, wordSegments: undefined, noWordTiming: "no timing for this ayah" };

      let rawArabic = verse.textArabic.trim();
      if (verse.ayahNumber === 1) rawArabic = stripLeadingBismillah(rawArabic, surahNumber);
      // Word positions are Quran.com's (the glyph words): the timings address
      // them. The Tanzil text split is the fallback when glyph data is missing.
      const textWords = splitArabicWords(rawArabic);
      const wordsList = glyphs?.get(verse.ayahNumber) ?? textWords;

      const from = typeof vt.timestampFromSec === "number" ? vt.timestampFromSec : 0;
      const to = typeof vt.timestampToSec === "number" ? vt.timestampToSec : from;
      // `misaligned`: the acoustic check found this ayah's word boundaries off
      // the recording (scripts/qa/repair-timings.cjs) — keep it, no highlight.
      const clean: ReturnType<typeof sanitizeWordSegments> =
        typeof vt.misaligned === "string" ? { reason: vt.misaligned } : sanitizeWordSegments(vt.segments, wordsList, { from, to });
      const base = {
        ...verse,
        textArabic: rawArabic,
        timestampFrom: from,
        timestampTo: to,
        datasetWindow: { from, to },
        ...(verse.ayahNumber === 1 && Array.isArray(data.embeddedPrelude) ? { embeddedPrelude: data.embeddedPrelude as EmbeddedPrelude[] } : {}),
      };
      if ("reason" in clean) {
        return { ...base, words: undefined, wordSegments: undefined, noWordTiming: clean.reason };
      }
      const segs = clean.segments;
      // Each word's first recitation (repeats keep their own raw segments for
      // the live highlight); every position 1..n has one after sanitising.
      const first = new Map<number, WordSegment>();
      for (const s of segs) if (!first.has(s.wordIndex)) first.set(s.wordIndex, s);
      const displayWords = textWords.length === wordsList.length ? textWords : wordsList;
      if (wordsList.some((_, i) => !first.has(i + 1))) {
        return { ...base, words: undefined, wordSegments: undefined, noWordTiming: "word segments leave words unplaced" };
      }
      const words = wordsList.map((_, i) => {
        const s = first.get(i + 1)!;
        return { word: displayWords[i], startTime: s.startTime, endTime: s.endTime };
      });
      return { ...base, words, wordSegments: segs, noWordTiming: undefined };
    });
    // The ayah begins with its voice. Alafasy's dataset often opens an ayah's
    // window after its first word (65ms typically, up to ~2.4s) while the
    // previous ayah's last word has already ended: that first word belongs to
    // this ayah, so its window starts there — never over the previous ayah's
    // voice, and never by more than 3s (larger = displaced data).
    for (let i = 0; i < out.length; i++) {
      const v = out[i];
      const first = v.wordSegments?.[0];
      if (!first || typeof v.timestampFrom !== "number" || first.startTime >= v.timestampFrom) continue;
      const prev = out[i - 1];
      const prevVoiceEnd = prev?.wordSegments?.length
        ? Math.max(...prev.wordSegments.map((x) => x.endTime))
        : prev?.timestampFrom ?? 0;
      // Starts at the first word, or where the previous ayah's voice ends when
      // the two touch (a few frames of overlap in the source).
      const start = Math.max(first.startTime, prevVoiceEnd);
      if (start - first.startTime <= 0.3 && start < v.timestampFrom && v.timestampFrom - start <= 3) {
        out[i] = { ...v, timestampFrom: start };
      }
    }
    // Two consecutive ayahs whose word timings overlap by more than a second
    // contradict each other (one voice can't recite both), and the recording
    // can't tell which is right: neither gets a word highlight.
    for (let i = 0; i + 1 < out.length; i++) {
      const a = out[i].wordSegments, b = out[i + 1].wordSegments;
      if (!a?.length || !b?.length) continue;
      const aEnd = Math.max(...a.map((x) => x.endTime));
      const overlap = aEnd - b[0].startTime;
      if (overlap > 1) {
        const secs = overlap.toFixed(1);
        out[i] = { ...out[i], words: undefined, wordSegments: undefined, noWordTiming: `word timings overlap the next ayah by ${secs}s` };
        out[i + 1] = { ...out[i + 1], words: undefined, wordSegments: undefined, noWordTiming: `word timings overlap the previous ayah by ${secs}s` };
      }
    }
    return out;
  } catch {
    return undefined;
  }
}

/** Quran.com word texts per ayah (the positions the timings address), or null. */
async function fetchGlyphWordTexts(surahNumber: number): Promise<Map<number, string[]> | null> {
  const verses = await fetchSurahGlyphs(surahNumber);
  return verses ? new Map(verses.map((v) => [v.a, v.w.map((w) => w[2])])) : null;
}

/**
 * Returns instant fallback verses for any Surah number (1-114)
 * before API fetch completes.
 */
export function getFallbackVerses(surahNumber: number): AyahVerse[] {
  if (PRE_SEEDED_SURAHS[surahNumber]) {
    return PRE_SEEDED_SURAHS[surahNumber];
  }

  // Surah 9 (At-Tawbah) strictly starts with Ayah 1 (Bara'atun min Allah), NO Bismillah
  if (surahNumber === 9) {
    return [
      {
        surahNumber: 9,
        ayahNumber: 1,
        textArabic: "بَرَاءَةٌ مِّنَ ٱللَّهِ وَرَسُولِهِ إِلَى ٱلَّذِينَ عَٰهَدتُّم مِّنَ ٱلْمُشْرِكِينَ",
        textEnglish: "Freedom from [all] obligations is declared from Allah and His Messenger to the polytheists with whom you made a treaty.",
        textTamil: "இணைவைப்பாளர்களில் நீங்கள் யாருடன் உடன்படிக்கை செய்திருந்தீர்களோ, அவர்களுக்கு அல்லாஹ்விடமிருந்தும் அவனுடைய தூதரிடமிருந்தும் இது ஓர் இறுதியான அறிவிப்பாகும்.",
        verseKey: "9:1",
      },
    ];
  }

  // Look up artwork concept for thematic verse reference
  const concept = QURAN_ARTWORK_CONCEPTS.find(
    (c) => c.surahNumber === surahNumber
  );

  if (concept) {
    return [
      {
        surahNumber,
        ayahNumber: 1,
        textArabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
        textEnglish: `${concept.name} • ${concept.core}`,
        textTamil: `${concept.name} • ${concept.core}`,
        verseKey: `${surahNumber}:1`,
      },
    ];
  }

  return [
    {
      surahNumber,
      ayahNumber: 1,
      textArabic: "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      textEnglish: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
      textTamil: "அளவற்ற அருளாளனும், நிகரற்ற அன்புடையோனுமாகிய அல்லாஹ்வின் திருப்பெயரால் (துவங்குகிறேன்).",
      verseKey: `${surahNumber}:1`,
    },
  ];
}

/**
 * Fetch full verse-by-verse data for a Surah from public Quran API
 * with transparent in-memory and localStorage caching.
 */
/** Synchronous peek at already-fetched verses for a surah + reciter (or null). */
export function peekSurahVerses(surahNumber: number, reciterId?: string | null): AyahVerse[] | null {
  return memoryCache.get(cacheKey(surahNumber, getReciterById(reciterId).id)) ?? null;
}

export async function fetchSurahVerses(
  surahNumber: number,
  reciterId?: string | null
): Promise<AyahVerse[]> {
  const reciter = getReciterById(reciterId);
  const rid = reciter.id;
  const key = cacheKey(surahNumber, rid);

  // 1. Final (reciter-resolved) in-memory cache
  if (memoryCache.has(key)) {
    return memoryCache.get(key)!;
  }

  // 2. Load reciter-independent base text verses (own cache).
  const baseVerses = await loadBaseVerses(surahNumber);
  if (fallbackLists.has(baseVerses)) return baseVerses;

  // 3. Overlay the reciter's Quran.com word-segment timings when available so
  //    highlighting tracks that reciter's exact pace.
  let retryLater = false;
  if (reciterHasWordTiming(reciter)) {
    const overlaid = await applyReciterTimings(baseVerses, surahNumber, rid);
    if (overlaid) {
      memoryCache.set(key, overlaid);
      return overlaid;
    }
    retryLater = overlaid === undefined;
  }

  // 4. No per-reciter word timing: use base verses (ayah-level glow). Not
  //    cached when the timings failed to load (network blip, server restart):
  //    that pinned the Surah to the whole-ayah glow for the session; the next
  //    fetch (the next ayah) tries the timings again.
  if (!retryLater) memoryCache.set(key, baseVerses);
  return baseVerses;
}

let legacyCachesDropped = false;
/**
 * Verse lists once cached in localStorage (huda-verses-v1…v6) carried the
 * default reciter's word timings, which a word-sync reciter's missing segments
 * then fell back on. The text now ships as local files: remove them once.
 */
function dropLegacyVerseCaches() {
  if (legacyCachesDropped || typeof localStorage === "undefined") return;
  legacyCachesDropped = true;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && /^huda-verses-v\d+-/.test(k)) localStorage.removeItem(k);
    }
  } catch {
    /* storage unavailable */
  }
}

let apiQueue: Promise<unknown> = Promise.resolve();
/**
 * GET a JSON URL from the public Quran API, strictly one request at a time and
 * retrying a 429 / network failure with backoff (up to 3 tries).
 */
function queuedApiFetch(url: string): Promise<any> {
  const run = async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) return await res.json();
        if (res.status !== 429 && res.status < 500) return null;
      } catch {
        /* CORS-less 429s surface as network errors: back off and retry */
      }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
    return null;
  };
  const p = apiQueue.then(run, run);
  apiQueue = p.catch(() => undefined);
  return p;
}

/**
 * Loads reciter-independent verse TEXT (Arabic/English/Tamil) for a Surah, with
 * default ayah-level timings baked in as a fallback. Cached by surah number.
 */
async function loadBaseVerses(surahNumber: number): Promise<AyahVerse[]> {
  const baseKey = cacheKey(surahNumber, "__base__");
  if (memoryCache.has(baseKey)) {
    return memoryCache.get(baseKey)!;
  }

  if (PRE_SEEDED_SURAHS[surahNumber] && PRE_SEEDED_SURAHS[surahNumber].length > 0) {
    const seeded = PRE_SEEDED_SURAHS[surahNumber];
    memoryCache.set(baseKey, seeded);
    return seeded;
  }

  // Every Surah's text ships in /data/quran-verses/<n>.json (generated by
  // scripts/generation/build-quran-verses.mjs), so normal use never leaves the
  // site. One retry: a burst of requests (fast scrolling) can drop one.
  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    dropLegacyVerseCaches();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const localRes = await fetch(`/data/quran-verses/${surahNumber}.json`);
        if (!localRes.ok) break;
        const localVerses = (await localRes.json()) as AyahVerse[];
        if (Array.isArray(localVerses) && localVerses.length > 0) {
          memoryCache.set(baseKey, localVerses);
          return localVerses;
        }
        break;
      } catch {
        /* retry, then the remote API */
      }
    }
  }

  // Last resort (a missing local file): the same editions from the public API,
  // one request at a time with backoff — it answers bursts with 429 and no
  // CORS header. Text only: no other reciter's timings are attached.
  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    try {
      const json = await queuedApiFetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ta.tamil`
      );
      if (json?.data && Array.isArray(json.data) && json.data.length >= 2) {
        const uthmani = json.data[0]?.ayahs || [];
        const english = json.data[1]?.ayahs || [];
        const tamil = json.data[2]?.ayahs || [];
        const verses: AyahVerse[] = uthmani.map((ayah: any, idx: number) => ({
          surahNumber,
          ayahNumber: ayah.numberInSurah,
          textArabic: idx === 0 ? stripLeadingBismillah(String(ayah.text).trim(), surahNumber) : ayah.text,
          textEnglish: english[idx]?.text || "",
          textTamil: tamil[idx]?.text || "",
          verseKey: `${surahNumber}:${ayah.numberInSurah}`,
        }));
        if (verses.length > 0) {
          memoryCache.set(baseKey, verses);
          return verses;
        }
      }
    } catch {
      /* network or parsing error, proceed to fallback */
    }
  }

  const fallback = [...getFallbackVerses(surahNumber)];
  fallbackLists.add(fallback);
  return fallback;
}

/**
 * Generates syllable-weighted word timings for arbitrary Arabic text across [startTime, endTime].
 */
export function getEffectiveWordsForText(
  textArabic: string,
  startTime: number,
  endTime: number
): QuranWordTiming[] {
  if (!textArabic || endTime <= startTime) return [];
  const rawWords = textArabic.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [];

  const totalDur = endTime - startTime;
  const weights = rawWords.map((w, idx) => {
    const len = w.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "").length;
    return Math.max(len, 2) + (idx === rawWords.length - 1 ? 2.5 : 0);
  });
  const sumWeight = weights.reduce((a, b) => a + b, 0);

  let currentStart = startTime;
  return rawWords.map((word, idx) => {
    const duration = (weights[idx] / sumWeight) * totalDur;
    const start = currentStart;
    const end = start + duration;
    currentStart = end;
    return { word, startTime: start, endTime: end };
  });
}

/**
 * Returns word-level timestamps for a verse or recitation segment.
 * If explicit word timestamps exist (e.g. Surah 1 & 2), uses them directly.
 * Otherwise, dynamically generates syllable-weighted word timings within the segment boundaries.
 */
export function getEffectiveWords(verse: AyahVerse | RecitationSegment | AyahSync | null | undefined): QuranWordTiming[] {
  if (!verse) return [];
  if (verse.words && verse.words.length > 0) {
    return verse.words.map((w) => ({
      word: "word" in w ? (w as QuranWordTiming).word : (w as AyahWordSync).arabic,
      startTime: w.startTime,
      endTime: w.endTime,
    }));
  }
  const tFrom = "timestampFrom" in verse ? verse.timestampFrom : "startTime" in verse ? verse.startTime : undefined;
  const tTo = "timestampTo" in verse ? verse.timestampTo : "endTime" in verse ? verse.endTime : undefined;
  if (typeof tFrom !== "number" || typeof tTo !== "number" || tTo <= tFrom) {
    return [];
  }
  return getEffectiveWordsForText(verse.textArabic, tFrom, tTo);
}

/**
 * Derives the voice recitation progress (0 to 1) and active word index
 * directly from the spoken Arabic audio waveform timestamps.
 * 
 * Strict rule: Exact word-level timing is ONLY evaluated when isExactWordTimingAllowed is true.
 * For all other reciters/recordings, it returns hasWordTiming: false, activeWord: null, activeWordIndex: -1.
 */
/** Seconds the last word stays lit after its ayah ends (a pause follows). */
const LAST_WORD_HOLD = 0.5;

export function getVoiceProgressInSegment(
  segment: RecitationSegment | AyahVerse | AyahSync | null | undefined,
  currentTime: number,
  isExactWordTimingAllowed: boolean = false
): {
  progress: number;
  activeWordIndex: number;
  activeWord: QuranWordTiming | null;
  hasWordTiming: boolean;
} {
  if (!segment) return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: false };
  // The audio has ended: nothing is being recited.
  const audioEnd = "audioEnd" in segment ? segment.audioEnd : undefined;
  if (typeof audioEnd === "number" && currentTime >= audioEnd) {
    return { progress: 1, activeWordIndex: -1, activeWord: null, hasWordTiming: isExactWordTimingAllowed };
  }

  const tFrom = "timestampFrom" in segment ? segment.timestampFrom : "startTime" in segment ? segment.startTime : undefined;
  const tTo = "timestampTo" in segment ? segment.timestampTo : "endTime" in segment ? segment.endTime : undefined;

  // If exact word timing is disallowed for current reciter/audio, calculate Ayah-level progress only!
  if (!isExactWordTimingAllowed) {
    if (typeof tFrom === "number" && typeof tTo === "number") {
      const vDur = tTo - tFrom;
      if (vDur <= 0) return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: false };
      const raw = (currentTime - tFrom) / vDur;
      return {
        progress: Math.min(Math.max(raw, 0), 1),
        activeWordIndex: -1,
        activeWord: null,
        hasWordTiming: false,
      };
    }
    return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: false };
  }

  // Explicit word timestamps check
  const hasExplicitWordTimings = Boolean(
    segment.words &&
      segment.words.length > 0 &&
      segment.words.some((w) => w.startTime > 0 || w.endTime > 0)
  );

  const words = getEffectiveWords(segment);

  if (!words || words.length === 0 || !hasExplicitWordTimings) {
    if (typeof tFrom === "number" && typeof tTo === "number") {
      const vDur = tTo - tFrom;
      if (vDur <= 0) return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: false };
      const raw = (currentTime - tFrom) / vDur;
      return {
        progress: Math.min(Math.max(raw, 0), 1),
        activeWordIndex: -1,
        activeWord: null,
        hasWordTiming: false,
      };
    }
    return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: false };
  }

  const totalWords = words.length;
  const firstWord = words[0];
  const lastWord = words[totalWords - 1];

  // Preferred path: drive the active word straight from the raw QDC segments (in
  // recitation order). This follows the voice exactly — when a reciter repeats a
  // word, the highlight jumps back onto that word for the repeat instead of
  // holding the next one. Falls back to the flat words[] scan when unavailable.
  const rawSegs = "wordSegments" in segment ? (segment.wordSegments as WordSegment[] | undefined) : undefined;
  if (rawSegs && rawSegs.length > 0) {
    const clampIdx = (wi: number) => Math.min(Math.max(wi - 1, 0), totalWords - 1);
    if (currentTime < rawSegs[0].startTime) {
      return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: true };
    }
    for (let i = 0; i < rawSegs.length; i++) {
      const s = rawSegs[i];
      const next = rawSegs[i + 1];
      // Inside this segment's voice, or in the pause before the next segment
      // begins (hold the current word so the highlight doesn't flicker).
      if (
        (currentTime >= s.startTime && currentTime < s.endTime) ||
        (next && currentTime >= s.endTime && currentTime < next.startTime)
      ) {
        const idx = clampIdx(s.wordIndex);
        return { progress: (idx + 1) / totalWords, activeWordIndex: idx, activeWord: words[idx] ?? null, hasWordTiming: true };
      }
    }
    // After the last segment: hold the final word while still within the verse.
    const lastSeg = rawSegs[rawSegs.length - 1];
    const toBound = typeof tTo === "number" ? tTo : lastSeg.endTime;
    if (currentTime >= lastSeg.endTime && currentTime < toBound + LAST_WORD_HOLD) {
      const idx = clampIdx(lastSeg.wordIndex);
      return { progress: 1, activeWordIndex: idx, activeWord: words[idx] ?? null, hasWordTiming: true };
    }
    return { progress: 1, activeWordIndex: -1, activeWord: null, hasWordTiming: true };
  }

  // Before first word voice begins
  if (currentTime < firstWord.startTime) {
    return { progress: 0, activeWordIndex: -1, activeWord: null, hasWordTiming: true };
  }

  // Check each word boundary
  for (let i = 0; i < totalWords; i++) {
    const w = words[i];
    const nextW = words[i + 1];

    if (currentTime >= w.startTime && currentTime < w.endTime) {
      // Voice is actively reciting word i
      const wordDur = w.endTime - w.startTime;
      const wordProg = wordDur > 0 ? (currentTime - w.startTime) / wordDur : 0;
      const progress = (i + wordProg) / totalWords;
      return { progress, activeWordIndex: i, activeWord: w, hasWordTiming: true };
    }

    // Voice pause between word i and word i + 1: hold word i so highlight advances naturally without flickering
    if (nextW && currentTime >= w.endTime && currentTime < nextW.startTime) {
      const progress = (i + 1) / totalWords;
      return { progress, activeWordIndex: i, activeWord: w, hasWordTiming: true };
    }
  }

  // After last word voice finishes: if still within verse bounds, keep last word active
  const toBound = typeof tTo === "number" ? tTo : lastWord.endTime;
  if (currentTime >= lastWord.endTime && currentTime < toBound + LAST_WORD_HOLD) {
    return { progress: 1, activeWordIndex: totalWords - 1, activeWord: lastWord, hasWordTiming: true };
  }

  return { progress: 1, activeWordIndex: -1, activeWord: null, hasWordTiming: true };
}

/**
 * How far an everyayah clip may differ in length from the dataset's ayah window
 * and still be the same recording cut at the same points. Measured over random
 * ayahs (scripts/qa/juz-clips.cjs): clips of the same cut sit within ~1–5%;
 * a larger difference is another edit or take (e.g. many Dosari clips, Shuraim
 * 78:40: 14.3s vs 4.5s) and mapping the timings onto it would light the wrong
 * words, so such an ayah plays without a word highlight.
 */
export const JUZ_CLIP_TOLERANCE = 0.05;

/**
 * The Surah-time window a per-ayah clip of this ayah covers (the dataset's
 * ayah window), when the ayah has word timing to map; else null.
 */
export function ayahClipWindow(verse: AyahVerse | null | undefined): { start: number; end: number } | null {
  if (!verse || verse.noWordTiming || !verse.wordSegments?.length) return null;
  const w = verse.datasetWindow;
  if (!w || !(w.to > w.from)) return null;
  return { start: w.from, end: w.to };
}

/**
 * Word sync for an ayah played on its own (a per-ayah Juz clip from
 * everyayah.com): clip time 0 = the dataset's ayah start, clip end = its end,
 * so clip time maps straight onto the ayah's raw recitation-order word
 * segments — a repeated word lights up again just as in Surah mode. No word
 * sync when the ayah has no word timing or the clip is another cut (length off
 * by more than JUZ_CLIP_TOLERANCE).
 */
export function getAyahClipWordSync(
  verse: AyahVerse | null | undefined,
  clipTime: number,
  clipDuration: number
): { hasWordTiming: boolean; activeWordIndex: number } {
  const win = ayahClipWindow(verse);
  if (!verse || !win) return { hasWordTiming: false, activeWordIndex: -1 };
  const winDur = win.end - win.start;
  const dur = clipDuration > 0 ? clipDuration : winDur;
  if (Math.abs(dur / winDur - 1) > JUZ_CLIP_TOLERANCE) return { hasWordTiming: false, activeWordIndex: -1 };
  const t = win.start + clipTime * (winDur / dur);
  const r = getVoiceProgressInSegment({ ...verse, timestampFrom: win.start, timestampTo: win.end }, t, true);
  return { hasWordTiming: r.hasWordTiming, activeWordIndex: r.activeWordIndex };
}

/** Clip time (seconds) at which a Surah-time moment of the ayah falls — for tap-to-seek. */
export function ayahClipTimeOf(verse: AyahVerse | null | undefined, surahTime: number, clipDuration: number): number | null {
  const win = ayahClipWindow(verse);
  if (!win) return null;
  const winDur = win.end - win.start;
  const dur = clipDuration > 0 ? clipDuration : winDur;
  if (Math.abs(dur / winDur - 1) > JUZ_CLIP_TOLERANCE) return null;
  return Math.min(dur, Math.max(0, (surahTime - win.start) * (dur / winDur)));
}

/**
 * The first moment after `t` at which the highlighted word can change: the
 * next start or end of a word segment, or the end of the ayah / segment.
 * Null when nothing in it changes after `t`. Fed to the player's
 * setTimeBoundary so a word lights up on the frame its voice starts.
 */
export function nextWordBoundary(
  segment: RecitationSegment | AyahVerse | null | undefined,
  t: number
): number | null {
  if (!segment) return null;
  let next = Infinity;
  const consider = (x: number | undefined) => {
    if (typeof x === "number" && x > t && x < next) next = x;
  };
  for (const w of segment.wordSegments ?? []) {
    consider(w.startTime);
    consider(w.endTime);
  }
  if (!segment.wordSegments?.length)
    for (const w of segment.words ?? []) {
      consider(w.startTime);
      consider(w.endTime);
    }
  const end = "timestampTo" in segment ? segment.timestampTo : "endTime" in segment ? segment.endTime : undefined;
  consider(end);
  // The held last word goes out LAST_WORD_HOLD after the end.
  if (typeof end === "number") consider(end + LAST_WORD_HOLD);
  return Number.isFinite(next) ? next : null;
}

/**
 * nextWordBoundary over a whole timeline: when nothing in the active segment
 * changes after `t` (a pause between two ayahs — e.g. Dosari's timings leave
 * gaps), the next change is the next segment's start.
 */
export function nextTimelineBoundary(
  segments: RecitationSegment[],
  segment: RecitationSegment | null | undefined,
  t: number
): number | null {
  const inSegment = nextWordBoundary(segment, t);
  const nextStart = segments.find((s) => s.startTime > t)?.startTime ?? null;
  if (inSegment === null) return nextStart;
  return nextStart === null ? inSegment : Math.min(inSegment, nextStart);
}

/** Backward-compatible alias for getVoiceProgressInSegment */
export const getVoiceProgressInVerse = getVoiceProgressInSegment;

/**
 * Converts a positive integer to Eastern Arabic numerals (e.g. 1 -> ١, 2 -> ٢, 114 -> ١١٤)
 */
export function toArabicNumerals(num: number): string {
  const arabicDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(Math.max(1, Math.floor(num)))
    .split("")
    .map((d) => arabicDigits[Number(d)] ?? d)
    .join("");
}

/**
 * Reconstructs the complete RecitationSegment timeline for audio playback.
 * 
 * Hierarchy: Actual Audio Waveform -> RecitationSegment -> Arabic Text -> Word Highlight -> Yellow Line
 * 
 * 1. Juz tracks: Starts with Isti'adhah (1.10s-4.40s), then Bismillah (4.70s-9.20s), then Ayahs.
 * 2. Surah 1: Starts with Bismillah (0.00s-3.08s / 0.28s-2.65s), then Ayah 1 (3.08s+ / 3.65s+).
 * 3. Surah 9 (At-Tawbah): Strictly NO Bismillah. Ayah 1 starts at 0.00s.
 * 4. Other Surahs: If prelude audio exists before Ayah 1, renders Bismillah with audio timing.
 */
export function getRecitationTimeline(
  surahNumber: number | null,
  verses: AyahVerse[],
  isJuz: boolean = false,
  totalDuration: number = 0,
  reciter?: QuranReciter | null
): RecitationSegment[] {
  const segments = buildRecitationTimeline(surahNumber, verses, isJuz, totalDuration, reciter);
  if (isJuz) return segments;
  return finalizeTimeline(segments, totalDuration, reciterHasWordTimingFor(reciter, surahNumber));
}

/**
 * Word-sync timelines come from measured timestamps, so two guards apply:
 *  - consecutive windows never overlap — an ayah (or prelude) ends where the
 *    next one's voice begins, so the earlier one can't hold the screen over it;
 *  - nothing plays past the real audio: once the file's length is known, any
 *    ayah / word that would start after it is dropped and the last is clipped,
 *    so no word is highlighted after the audio has ended.
 */
function finalizeTimeline(segments: RecitationSegment[], totalDuration: number, measured: boolean): RecitationSegment[] {
  if (!measured) return segments;
  let out = segments.map((sg, i) => {
    const next = segments[i + 1];
    return next && sg.endTime > next.startTime && next.startTime > sg.startTime ? { ...sg, endTime: next.startTime } : sg;
  });
  if (totalDuration > 0) {
    out = out
      .filter((sg) => sg.startTime < totalDuration)
      .map((sg) =>
        sg.endTime <= totalDuration && !(sg.words ?? []).some((w) => w.endTime > totalDuration)
          ? { ...sg, audioEnd: totalDuration }
          : {
              ...sg,
              audioEnd: totalDuration,
              endTime: Math.min(sg.endTime, totalDuration),
              words: (sg.words ?? [])
                .filter((w) => w.startTime < totalDuration)
                .map((w) => (w.endTime > totalDuration ? { ...w, endTime: totalDuration } : w)),
              wordSegments: sg.wordSegments
                ?.filter((w) => w.startTime < totalDuration)
                .map((w) => (w.endTime > totalDuration ? { ...w, endTime: totalDuration } : w)),
            }
      );
  }
  return out;
}

/** An ayah's measured words for the timeline (none when it has no word timing). */
const measuredWords = (v: AyahVerse): QuranWordTiming[] => (v.noWordTiming ? [] : v.words ?? []);

/** Timeline segments of preludes recited in the reciter's own audio. */
function embeddedPreludeSegments(preludes: EmbeddedPrelude[]): RecitationSegment[] {
  return preludes.map((p) => {
    const c = p.type === "istiadhah" ? CANONICAL_ISTIADHAH : CANONICAL_BISMILLAH;
    return {
      id: `prelude-${p.type}`,
      type: p.type,
      startTime: p.startTime,
      endTime: p.endTime,
      textArabic: c.textArabic,
      textEnglish: c.textEnglish,
      textTamil: c.textTamil,
      // Measured phrase bounds only — no per-word timing is claimed.
      words: [],
    };
  });
}

function buildRecitationTimeline(
  surahNumber: number | null,
  verses: AyahVerse[],
  isJuz: boolean,
  totalDuration: number,
  reciter: QuranReciter | null | undefined
): RecitationSegment[] {
  if (!verses || verses.length === 0) return [];

  const isSudais = !reciter || reciter.id === "sudais";
  // Reciters with paired Quran.com word segments carry their own accurate
  // per-verse timestamps and word timings (overlaid in fetchSurahVerses) —
  // unless the Surah's streamed recording doesn't match them. Every other case
  // falls back to proportional ayah-level glow so that borrowed timings never
  // desync a differently paced voice.
  const hasOwnTiming = reciterHasWordTimingFor(reciter, surahNumber);

  // 1. JUZ TRACKS (e.g. Para 01.mp3)
  if (isJuz) {
    const istiadhahWords: QuranWordTiming[] = isSudais ? [
      { word: "أَعُوذُ", startTime: 1.10, endTime: 1.95 },
      { word: "بِٱللَّهِ", startTime: 1.95, endTime: 2.65 },
      { word: "مِنَ", startTime: 2.65, endTime: 2.95 },
      { word: "ٱلشَّيْطَٰنِ", startTime: 2.95, endTime: 3.75 },
      { word: "ٱلرَّجِيمِ", startTime: 3.75, endTime: 4.40 },
    ] : [];
    const bismillahWords: QuranWordTiming[] = isSudais ? [
      { word: "بِسْمِ", startTime: 4.70, endTime: 5.60 },
      { word: "ٱللَّهِ", startTime: 5.60, endTime: 6.45 },
      { word: "ٱلرَّحْمَٰنِ", startTime: 6.45, endTime: 7.75 },
      { word: "ٱلرَّحِيمِ", startTime: 7.75, endTime: 9.20 },
    ] : [];

    const segments: RecitationSegment[] = [
      {
        id: "prelude-istiadhah",
        type: "istiadhah",
        startTime: 0,
        endTime: 4.55,
        textArabic: CANONICAL_ISTIADHAH.textArabic,
        textEnglish: CANONICAL_ISTIADHAH.textEnglish,
        textTamil: CANONICAL_ISTIADHAH.textTamil,
        words: istiadhahWords,
      },
      {
        id: "prelude-bismillah",
        type: "bismillah",
        startTime: 4.55,
        endTime: 9.25,
        textArabic: CANONICAL_BISMILLAH.textArabic,
        textEnglish: CANONICAL_BISMILLAH.textEnglish,
        textTamil: CANONICAL_BISMILLAH.textTamil,
        words: bismillahWords,
      },
    ];

    const baseAyahOffset = 9.25;
    // If verses[0] is Bismillah, skip it because prelude already recited Bismillah
    const isFirstBismillah = verses[0]?.textArabic.trim() === CANONICAL_BISMILLAH.textArabic.trim();
    const startIndex = isFirstBismillah ? 1 : 0;

    for (let i = startIndex; i < verses.length; i++) {
      const v = verses[i];
      const ayahIdx = i - startIndex;
      const start = baseAyahOffset + ayahIdx * 15;
      const end = start + 15;

      segments.push({
        id: `ayah-${v.surahNumber}:${v.ayahNumber}`,
        type: "ayah",
        startTime: start,
        endTime: end,
        textArabic: v.textArabic,
        textEnglish: v.textEnglish,
        textTamil: v.textTamil,
        surahNumber: v.surahNumber,
        ayahNumber: v.ayahNumber,
        verseKey: v.verseKey,
        words: isSudais ? getEffectiveWordsForText(v.textArabic, start, end) : [],
      });
    }
    return segments;
  }

  // 2. SURAH 9 (AT-TAWBAH) STRICT EXCEPTION:
  // Must NEVER have Bismillah!
  if (surahNumber === 9) {
    const firstVerse = verses[0];
    const firstStart = typeof firstVerse?.timestampFrom === "number" ? firstVerse.timestampFrom : 0;
    const segments: RecitationSegment[] = [];

    // Isti'adhah recited in the reciter's own audio before Ayah 1 (never a
    // Bismillah here): its measured bounds, else [0 → Ayah 1 voice].
    const own9 = hasOwnTiming ? firstVerse?.embeddedPrelude?.filter((p) => p.type === "istiadhah") : undefined;
    if (own9 && own9.length > 0) {
      segments.push(...embeddedPreludeSegments(own9));
    } else if (hasOwnTiming && firstStart >= 3.0) {
      const istWords: QuranWordTiming[] = [];
      segments.push({
        id: "prelude-istiadhah",
        type: "istiadhah",
        startTime: 0,
        endTime: firstStart,
        textArabic: CANONICAL_ISTIADHAH.textArabic,
        textEnglish: CANONICAL_ISTIADHAH.textEnglish,
        textTamil: CANONICAL_ISTIADHAH.textTamil,
        words: istWords,
      });
    }

    const hasTimestamps = hasOwnTiming && verses.some((v) => typeof v.timestampFrom === "number" && v.timestampFrom > 0);
    const preludeEnd = segments.length > 0 ? segments[segments.length - 1].endTime : 0;
    const availableDur = totalDuration > preludeEnd ? totalDuration - preludeEnd : verses.length * 15;
    const totalWeight = verses.reduce((sum, v) => sum + Math.max((v.textArabic || "").length, 10), 0);
    let currentStart = preludeEnd;

    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      let start: number;
      let end: number;

      if (hasTimestamps && typeof v.timestampFrom === "number") {
        start = v.timestampFrom;
        end = v.timestampTo ?? (start + 15);
      } else {
        const weight = Math.max((v.textArabic || "").length, 10);
        const dur = (weight / totalWeight) * availableDur;
        start = currentStart;
        end = currentStart + dur;
        currentStart = end;
      }

      const vVideo = getAyahVideo(9, v.ayahNumber);
      segments.push({
        id: `ayah-9:${v.ayahNumber}`,
        type: "ayah",
        startTime: start,
        endTime: end,
        textArabic: v.textArabic,
        textEnglish: v.textEnglish,
        textTamil: v.textTamil,
        surahNumber: 9,
        ayahNumber: v.ayahNumber,
        verseKey: v.verseKey,
        words: hasOwnTiming ? measuredWords(v) : [],
        wordSegments: hasOwnTiming && !v.noWordTiming ? v.wordSegments : undefined,
        video: vVideo ? { source: vVideo.videoPath } : null,
      });
    }
    return segments;
  }

  // 3. SURAH 1 (AL-FATIHAH):
  // With voice trim removed, reciter stream starts at 0.00s with Ayah 1 (Bismillah).
  if (surahNumber === 1) {
    const ayahVerses = verses;

    if (hasOwnTiming) {
      const segments: RecitationSegment[] = [];
      for (let i = 0; i < ayahVerses.length; i++) {
        const v = ayahVerses[i];
        const ayahNum = v.ayahNumber ?? (i + 1);
        const start = typeof v.timestampFrom === "number" ? v.timestampFrom : (segments[segments.length - 1]?.endTime ?? 0);
        const end = typeof v.timestampTo === "number" ? v.timestampTo : (start + 10);
        const vVideo = getAyahVideo(1, ayahNum);
        segments.push({
          id: `ayah-1:${ayahNum}`,
          type: "ayah",
          startTime: start,
          endTime: end,
          textArabic: v.textArabic,
          textEnglish: v.textEnglish,
          textTamil: v.textTamil,
          surahNumber: 1,
          ayahNumber: ayahNum,
          verseKey: `1:${ayahNum}`,
          words: measuredWords(v),
          wordSegments: v.noWordTiming ? undefined : v.wordSegments,
          video: vVideo ? { source: vVideo.videoPath } : null,
        });
      }
      return segments;
    }

    // Any other reciter on Surah 1 (no paired word timing):
    const effDur = totalDuration > 0 ? totalDuration : 35;
    const totalWeight = ayahVerses.reduce((sum, v) => sum + Math.max((v.textArabic || "").length, 10), 0);
    const segments: RecitationSegment[] = [];
    let curStart = 0;
    for (let idx = 0; idx < ayahVerses.length; idx++) {
      const v = ayahVerses[idx];
      const weight = Math.max((v.textArabic || "").length, 10);
      const dur = (weight / totalWeight) * effDur;
      const start = curStart;
      const end = curStart + dur;
      curStart = end;
      const ayahNum = v.ayahNumber ?? (idx + 1);
      const vVideo = getAyahVideo(1, ayahNum);
      segments.push({
        id: `ayah-1:${ayahNum}`,
        type: "ayah" as const,
        startTime: start,
        endTime: end,
        textArabic: v.textArabic,
        textEnglish: v.textEnglish,
        textTamil: v.textTamil,
        surahNumber: 1,
        ayahNumber: ayahNum,
        verseKey: `1:${ayahNum}`,
        words: [],
        video: vVideo ? { source: vVideo.videoPath } : null,
      });
    }
    return segments;
  }

  // 4. SURAHS 2 TO 114:
  // Prelude was already played during isPrelude on our dedicated audio element.
  // Reciter stream has been trimmed to start at Ayah 1 (at 0.00s).
  // All Ayahs start directly from 0.00s!
  const hasTimestamps = hasOwnTiming && verses.some((v) => typeof v.timestampFrom === "number" && v.timestampFrom >= 0);
  const availableDur = totalDuration > 0 ? totalDuration : verses.length * 15;
  const totalWeight = verses.reduce((sum, v) => sum + Math.max((v.textArabic || "").length, 10), 0);
  let currentStart = 0;
  const segments: RecitationSegment[] = [];

  // Reciters that recite their OWN Bismillah before Ayah 1 (Dosari, surahs 2-78)
  // stream it as part of their audio. Surface it as a Bismillah segment synced to
  // that voice so word-sync opens with the Bismillah just like every other reciter
  // (whose Bismillah comes from our dedicated prelude clip instead). Its bounds are
  // [0 → Ayah 1 voice onset] read straight from the reciter's QDC timing.
  // Some of these recordings open with the Isti'adhah AND the Bismillah (e.g.
  // Dosari at a Juz start): the measured bounds of each (embeddedPrelude, from
  // the recording) become separate segments, so the Bismillah never shows
  // while the Isti'adhah is recited.
  const ownPrelude = hasOwnTiming ? verses[0]?.embeddedPrelude : undefined;
  if (reciterEmbedsOwnBismillah(reciter, surahNumber ?? 0)) {
    if (ownPrelude && ownPrelude.length > 0) {
      segments.push(...embeddedPreludeSegments(ownPrelude));
    } else {
      const v1Start = verses[0]?.timestampFrom;
      const bismillahEnd = typeof v1Start === "number" && v1Start > 1 ? v1Start : 6.0;
      segments.push(...embeddedPreludeSegments([{ type: "bismillah", startTime: 0, endTime: bismillahEnd }]));
    }
  }

  for (let i = 0; i < verses.length; i++) {
    const v = verses[i];
    let start: number;
    let end: number;

    if (hasTimestamps && typeof v.timestampFrom === "number") {
      start = v.timestampFrom;
      end = v.timestampTo ?? (start + 15);
    } else {
      const weight = Math.max((v.textArabic || "").length, 10);
      const dur = (weight / totalWeight) * availableDur;
      start = currentStart;
      end = currentStart + dur;
      currentStart = end;
    }

    const shiftedWords = hasOwnTiming ? measuredWords(v) : [];
    const vVideo = surahNumber && v.ayahNumber ? getAyahVideo(surahNumber, v.ayahNumber) : null;

    segments.push({
      id: `ayah-${v.surahNumber}:${v.ayahNumber}`,
      type: "ayah",
      startTime: start,
      endTime: end,
      textArabic: v.textArabic,
      textEnglish: v.textEnglish,
      textTamil: v.textTamil,
      surahNumber: v.surahNumber,
      ayahNumber: v.ayahNumber,
      verseKey: v.verseKey,
      words: shiftedWords,
      wordSegments: hasOwnTiming && !v.noWordTiming ? v.wordSegments : undefined,
      video: vVideo ? { source: vVideo.videoPath } : null,
    });
  }
  return segments;
}

/**
 * Resolves the currently reciting segment based on audio currentTime.
 */
export function getActiveRecitationSegment(
  segments: RecitationSegment[],
  currentTime: number,
  duration: number
): { segment: RecitationSegment | null; segmentIndex: number } {
  if (!segments || segments.length === 0) {
    return { segment: null, segmentIndex: -1 };
  }
  if (segments.length === 1) {
    return { segment: segments[0], segmentIndex: 0 };
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const to = seg.endTime;

    if (currentTime >= seg.startTime && currentTime < to) {
      return { segment: seg, segmentIndex: i };
    }

    // Between segment i and i + 1: hold current segment until next voice onset
    if (nextSeg && currentTime >= to && currentTime < nextSeg.startTime) {
      return { segment: seg, segmentIndex: i };
    }
  }

  if (currentTime < segments[0].startTime) {
    return { segment: segments[0], segmentIndex: 0 };
  }

  return { segment: segments[segments.length - 1], segmentIndex: segments.length - 1 };
}

/**
 * Calculates active verse index based on recitation time and total duration.
 * Spoken audio waveform timestamps act as the PRIMARY / MASTER timeline.
 */
export function getActiveVerseIndex(
  verses: AyahVerse[],
  currentTime: number,
  duration: number
): number {
  if (!verses || verses.length === 0) return 0;
  if (verses.length === 1) return 0;
  if (currentTime <= 0) return 0;

  // 1. If verses have explicit recitation timestamps, find the exact matching verse
  const hasTimestamps = verses.some((v) => typeof v.timestampFrom === "number");
  if (hasTimestamps) {
    for (let i = 0; i < verses.length; i++) {
      const v = verses[i];
      if (typeof v.timestampFrom === "number") {
        const nextVerse = verses[i + 1];
        const to =
          typeof v.timestampTo === "number"
            ? v.timestampTo
            : (nextVerse?.timestampFrom ?? (v.timestampFrom + 20));

        // Active while inside verse
        if (currentTime >= v.timestampFrom && currentTime < to) {
          return i;
        }

        // Active while in pause before next verse starts:
        // Hold current verse until the exact second the next verse voice begins!
        if (nextVerse && typeof nextVerse.timestampFrom === "number") {
          if (currentTime >= to && currentTime < nextVerse.timestampFrom) {
            return i;
          }
        }
      }
    }

    // If before first timestamp
    const firstWithTime = verses.find((v) => typeof v.timestampFrom === "number");
    if (firstWithTime && typeof firstWithTime.timestampFrom === "number" && currentTime < firstWithTime.timestampFrom) {
      return 0;
    }

    // If within a reasonable window after a known verse timestamp
    for (let i = verses.length - 1; i >= 0; i--) {
      const v = verses[i];
      if (typeof v.timestampFrom === "number" && currentTime >= v.timestampFrom) {
        const expectedDuration = typeof v.timestampTo === "number" ? (v.timestampTo - v.timestampFrom) : 20;
        if (currentTime - v.timestampFrom <= expectedDuration + 15) {
          return i;
        }
        break;
      }
    }
  }

  // 2. Fallback to duration ratio
  if (duration <= 0) return 0;
  const progress = Math.min(Math.max(currentTime / duration, 0), 0.999);
  const calculatedIndex = Math.floor(progress * verses.length);
  return Math.min(calculatedIndex, verses.length - 1);
}

/**
 * Fallback verse shown when a Quran track has no ayah-level text loaded yet.
 */
export const CATEGORY_INSPIRATIONAL_VERSES: Record<string, AyahVerse> = {
  "quran": {
    surahNumber: 2,
    ayahNumber: 2,
    textArabic: "ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًۭى لِّلْمُتَّقِينَ",
    textEnglish: "This is the Book about which there is no doubt, a guidance for those conscious of Allah.",
    verseKey: "2:2",
  },
  "quran-recitation": {
    surahNumber: 73,
    ayahNumber: 4,
    textArabic: "وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا",
    textEnglish: "And recite the Qur'an with measured recitation.",
    verseKey: "73:4",
  },
};

export function getCategoryVerse(categorySlug: string): AyahVerse {
  return (
    CATEGORY_INSPIRATIONAL_VERSES[categorySlug] ?? {
      surahNumber: 94,
      ayahNumber: 6,
      textArabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
      textEnglish: "Indeed, with hardship will be ease.",
      textTamil: "நிச்சயமாக கஷ்டத்துடன் இலகுவும் இருக்கிறது.",
      verseKey: "94:6",
    }
  );
}

export interface UseQuranVerseSyncProps {
  surahNumber: number | null;
  categorySlug?: string;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  isJuz?: boolean;
  onSeekToVerse?: (verseIndex: number, totalVerses: number) => void;
  reciter?: QuranReciter | null;
  isPrelude?: boolean;
  preludeType?: "fatihah" | "bismillah" | "none" | null;
  preludeCurrentTime?: number;
  preludeDuration?: number;
}

export function useQuranVerseSync({
  surahNumber,
  categorySlug = "quran-recitation",
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  isJuz = false,
  onSeekToVerse,
  reciter,
  isPrelude = false,
  preludeType = null,
  preludeCurrentTime = 0,
  preludeDuration = 0,
}: UseQuranVerseSyncProps) {
  const [verses, setVerses] = useState<AyahVerse[]>(() => {
    if (surahNumber) {
      return getFallbackVerses(surahNumber);
    }
    return [getCategoryVerse(categorySlug)];
  });

  const [manualIndex, setManualIndex] = useState<number | null>(null);
  // Ayah meaning starts OFF on every page load (Arabic only); the header
  // toggle turns it on for the session.
  const [showTranslation, setShowTranslation] = useState(false);
  const manualTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevTimeRef = useRef<number>(currentTime);

  // Strictly determine timing capability for the selected reciter
  const timingCap = useMemo(() => {
    return getReciterTimingCapability(reciter, surahNumber);
  }, [reciter, surahNumber]);

  // Fetch full verses when surahNumber changes
  useEffect(() => {
    let cancelled = false;
    setManualIndex(null);

    if (surahNumber) {
      // Only replace verses with fallback if switching to a DIFFERENT surah.
      // When merely switching reciters for the current surah, preserve current verses
      // to eliminate visual flashing/flickering.
      setVerses((prev) => {
        if (prev.length > 0 && prev[0]?.surahNumber === surahNumber) {
          return prev;
        }
        return getFallbackVerses(surahNumber);
      });
      fetchSurahVerses(surahNumber, reciter?.id).then((data) => {
        if (!cancelled && data.length > 0) {
          setVerses(data);
        }
      });
    } else {
      setVerses([getCategoryVerse(categorySlug)]);
    }

    return () => {
      cancelled = true;
    };
  }, [surahNumber, categorySlug, reciter?.id]);

  // Construct master recitation segments timeline strictly aligned with the active reciter
  // Use this reciter's cached timings synchronously when available, so a
  // reciter switch never renders one frame of the new audio time against the
  // previous reciter's timeline (which flashed a wrong ayah).
  const cachedVerses = surahNumber ? peekSurahVerses(surahNumber, reciter?.id) : null;
  const timelineVerses = cachedVerses ?? verses;
  const segments = useMemo(() => {
    return getRecitationTimeline(surahNumber, timelineVerses, isJuz, duration, reciter);
  }, [surahNumber, timelineVerses, isJuz, duration, reciter]);

  // Prelude segment timeline when prelude is active
  const preludeSegments = useMemo<RecitationSegment[]>(() => {
    if (!isPrelude) return [];
    if (preludeType === "fatihah") return FATIHAH_PRELUDE_SEGMENTS;
    if (preludeType === "bismillah") return BISMILLAH_PRELUDE_SEGMENTS;
    return [];
  }, [isPrelude, preludeType]);

  const activePreludeSegment = useMemo(() => {
    if (!isPrelude || preludeSegments.length === 0) return null;
    return getActiveRecitationSegment(preludeSegments, preludeCurrentTime, preludeDuration).segment;
  }, [isPrelude, preludeSegments, preludeCurrentTime, preludeDuration]);

  // Audio position is the single authoritative clock — resolve active segment
  const { segment: activeSegment, segmentIndex: calculatedSegmentIndex } = useMemo(() => {
    if (isPrelude) {
      return { segment: activePreludeSegment, segmentIndex: 0 };
    }
    return getActiveRecitationSegment(segments, currentTime, duration);
  }, [isPrelude, activePreludeSegment, segments, currentTime, duration]);

  const activeSegmentIndex = isPrelude ? 0 : (calculatedSegmentIndex >= 0 ? calculatedSegmentIndex : 0);
  const currentSegment = isPrelude
    ? activePreludeSegment || preludeSegments[0] || null
    : segments[activeSegmentIndex] || activeSegment || segments[0] || null;

  // Derives spoken voice progress and active word directly from spoken audio timestamps
  const { progress: voiceProgress, activeWordIndex, activeWord, hasWordTiming } = useMemo(() => {
    if (isPrelude) {
      return getVoiceProgressInSegment(currentSegment, preludeCurrentTime, true);
    }
    return getVoiceProgressInSegment(currentSegment, currentTime, timingCap.hasWordTiming);
  }, [isPrelude, currentSegment, preludeCurrentTime, currentTime, timingCap.hasWordTiming]);

  // Canonical AyahSync shape
  const currentAyahSync = useMemo<AyahSync | null>(() => {
    if (!currentSegment) return null;
    const words: AyahWordSync[] = (currentSegment.words || []).map((w, idx) => ({
      id: `${currentSegment.id}-w${idx}`,
      arabic: w.word,
      startTime: w.startTime,
      endTime: w.endTime,
    }));
    return {
      id: currentSegment.id,
      type: currentSegment.type,
      surah: currentSegment.surahNumber || surahNumber || 1,
      ayah: currentSegment.ayahNumber || 1,
      startTime: currentSegment.startTime,
      endTime: currentSegment.endTime,
      textArabic: currentSegment.textArabic,
      textEnglish: currentSegment.textEnglish,
      textTamil: currentSegment.textTamil,
      verseKey: currentSegment.verseKey,
      words,
      video: currentSegment.video,
    };
  }, [currentSegment, surahNumber]);

  // Backward-compatible AyahVerse shape mapped from current segment
  const currentVerse = useMemo<AyahVerse>(() => {
    if (!currentSegment) return verses[0] || getCategoryVerse(categorySlug);
    if (currentSegment.type === "istiadhah") {
      return {
        surahNumber: surahNumber || 1,
        ayahNumber: 0,
        verseKey: "prelude-istiadhah",
        textArabic: currentSegment.textArabic,
        textEnglish: currentSegment.textEnglish,
        textTamil: currentSegment.textTamil,
        timestampFrom: currentSegment.startTime,
        timestampTo: currentSegment.endTime,
        words: currentSegment.words,
      };
    }
    if (currentSegment.type === "bismillah") {
      return {
        surahNumber: surahNumber || 1,
        ayahNumber: 0,
        verseKey: "prelude-bismillah",
        textArabic: currentSegment.textArabic,
        textEnglish: currentSegment.textEnglish,
        textTamil: currentSegment.textTamil,
        timestampFrom: currentSegment.startTime,
        timestampTo: currentSegment.endTime,
        words: currentSegment.words,
      };
    }
    const matched = verses.find(
      (v) => v.surahNumber === currentSegment.surahNumber && v.ayahNumber === currentSegment.ayahNumber
    );
    return matched || {
      surahNumber: currentSegment.surahNumber || surahNumber || 1,
      ayahNumber: currentSegment.ayahNumber || 1,
      verseKey: currentSegment.verseKey || `${surahNumber || 1}:1`,
      textArabic: currentSegment.textArabic,
      textEnglish: currentSegment.textEnglish,
      textTamil: currentSegment.textTamil,
      timestampFrom: currentSegment.startTime,
      timestampTo: currentSegment.endTime,
      words: currentSegment.words,
    };
  }, [currentSegment, verses, surahNumber, categorySlug]);

  // Backward-compatible active index (for dot track calculation)
  const activeIndex = useMemo(() => {
    if (isPrelude || !currentSegment || currentSegment.type !== "ayah") return 0;
    const idx = verses.findIndex(
      (v) => v.surahNumber === currentSegment.surahNumber && v.ayahNumber === currentSegment.ayahNumber
    );
    return idx >= 0 ? idx : 0;
  }, [isPrelude, currentSegment, verses]);

  // Ayah navigation: seeks audio directly to the target segment startTime
  const handlePrevVerse = () => {
    if (segments.length <= 1) return;
    const nextIdx = activeSegmentIndex > 0 ? activeSegmentIndex - 1 : segments.length - 1;
    const targetSeg = segments[nextIdx];
    if (onSeekToVerse && targetSeg && typeof targetSeg.startTime === "number") {
      onSeekToVerse(targetSeg.startTime, duration || 1);
    }
  };

  const handleNextVerse = () => {
    if (segments.length <= 1) return;
    const nextIdx = activeSegmentIndex < segments.length - 1 ? activeSegmentIndex + 1 : 0;
    const targetSeg = segments[nextIdx];
    if (onSeekToVerse && targetSeg && typeof targetSeg.startTime === "number") {
      onSeekToVerse(targetSeg.startTime, duration || 1);
    }
  };

  const jumpToVerse = (index: number) => {
    if (index >= 0 && index < segments.length) {
      const targetSeg = segments[index];
      if (onSeekToVerse && targetSeg && typeof targetSeg.startTime === "number") {
        onSeekToVerse(targetSeg.startTime, duration || 1);
      }
    }
  };

  return {
    verses,
    segments,
    activeIndex,
    activeSegmentIndex,
    currentSegment,
    currentVerse,
    currentAyah: currentAyahSync,
    voiceProgress,
    activeWord,
    activeWordIndex,
    hasWordTiming,
    timingMode: timingCap.mode,
    timingSource: timingCap.sourceDescription,
    currentVideo: currentSegment?.video?.source ?? null,
    showTranslation,
    setShowTranslation,
    handlePrevVerse,
    handleNextVerse,
    jumpToVerse,
  };
}

/**
 * Pure runtime canonical resolver:
 * currentAudioTime -> currentAyah -> currentWord -> currentVideo
 */
export function resolveQuranSyncState(
  segments: RecitationSegment[],
  currentAudioTime: number,
  duration: number = 0,
  isExactWordTimingAllowed: boolean = false
): QuranSyncState {
  const { segment: activeSegment, segmentIndex: calculatedIndex } = getActiveRecitationSegment(
    segments,
    currentAudioTime,
    duration
  );
  const activeIndex = calculatedIndex >= 0 ? calculatedIndex : 0;
  const currentAyahSeg = segments[activeIndex] || activeSegment || segments[0] || null;
  const { progress: voiceProgress, activeWordIndex, activeWord, hasWordTiming } = getVoiceProgressInSegment(
    currentAyahSeg,
    currentAudioTime,
    isExactWordTimingAllowed
  );

  const words: AyahWordSync[] = (currentAyahSeg?.words || []).map((w, idx) => ({
    id: `${currentAyahSeg?.id || "ayah"}-w${idx}`,
    arabic: w.word,
    startTime: w.startTime,
    endTime: w.endTime,
  }));

  const currentAyah: AyahSync | null = currentAyahSeg
    ? {
        id: currentAyahSeg.id,
        type: currentAyahSeg.type,
        surah: currentAyahSeg.surahNumber || 1,
        ayah: currentAyahSeg.ayahNumber || 1,
        startTime: currentAyahSeg.startTime,
        endTime: currentAyahSeg.endTime,
        textArabic: currentAyahSeg.textArabic,
        textEnglish: currentAyahSeg.textEnglish,
        textTamil: currentAyahSeg.textTamil,
        verseKey: currentAyahSeg.verseKey,
        words,
        video: currentAyahSeg.video,
      }
    : null;

  const currentWord: AyahWordSync | null =
    activeWordIndex >= 0 && words[activeWordIndex] ? words[activeWordIndex] : null;

  return {
    currentAyah,
    currentWord,
    activeWordIndex,
    hasWordTiming,
    currentVideo: currentAyahSeg?.video?.source ?? null,
    activeAyahIndex: activeIndex,
    totalAyahs: segments.length,
    voiceProgress,
  };
}

