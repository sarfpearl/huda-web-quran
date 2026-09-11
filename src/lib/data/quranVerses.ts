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
import { type QuranReciter, getReciterTimingCapability, reciterHasWordTiming, getReciterById } from "./quranReciters";

export interface QuranWordTiming {
  word: string;
  startTime: number; // In seconds relative to audio start
  endTime: number;   // In seconds relative to audio start
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
  video?: AyahVideoSync | null;
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

/**
 * Overlays a reciter's Quran.com (QDC) word-segment timings onto base text
 * verses. Each reciter recites at their own pace, so the timing dataset is
 * loaded per reciter from `/data/quran-timings/<reciterId>/<surah>.json`.
 * Returns a NEW verse array (base text untouched) or null if unavailable.
 */
async function applyReciterTimings(
  baseVerses: AyahVerse[],
  surahNumber: number,
  reciterId: string
): Promise<AyahVerse[] | null> {
  if (typeof fetch === "undefined") return null;
  try {
    const res = await fetch(`/data/quran-timings/${reciterId}/${surahNumber}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    const timings = data?.verseTimings;
    if (!Array.isArray(timings) || timings.length === 0) return null;

    const byAyah = new Map<number, any>();
    timings.forEach((vt: any) => byAyah.set(vt.ayahNumber, vt));

    return baseVerses.map((verse) => {
      const vt = byAyah.get(verse.ayahNumber);
      if (!vt) return verse;

      // Base word text: prefer explicit words, else split the Arabic text.
      let rawArabic = verse.textArabic.trim();
      if (verse.ayahNumber === 1) {
        rawArabic = stripLeadingBismillah(rawArabic, surahNumber);
      }
      const wordsList =
        verse.words && verse.words.length > 0
          ? verse.words.map((w) => w.word)
          : splitArabicWords(rawArabic);

      const segs = vt.segments as { startSec: number; endSec: number }[] | undefined;
      let words = verse.words;
      if (wordsList.length > 0 && segs && segs.length > 0) {
        if (wordsList.length === segs.length) {
          words = wordsList.map((word, i) => ({ word, startTime: segs[i].startSec, endTime: segs[i].endSec }));
        } else {
          // Segment/word count mismatch: distribute proportionally so highlight
          // still tracks the voice across the ayah.
          const n = segs.length;
          words = wordsList.map((word, i) => {
            const si = Math.min(Math.floor((i / wordsList.length) * n), n - 1);
            return { word, startTime: segs[si].startSec, endTime: segs[si].endSec };
          });
        }
      }

      return {
        ...verse,
        textArabic: rawArabic,
        timestampFrom: vt.timestampFromSec,
        timestampTo: vt.timestampToSec,
        words,
      };
    });
  } catch {
    return null;
  }
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

  // 3. Overlay the reciter's Quran.com word-segment timings when available so
  //    highlighting tracks that reciter's exact pace.
  if (reciterHasWordTiming(reciter)) {
    const overlaid = await applyReciterTimings(baseVerses, surahNumber, rid);
    if (overlaid) {
      memoryCache.set(key, overlaid);
      return overlaid;
    }
  }

  // 4. No per-reciter word timing: use base verses (ayah-level glow).
  memoryCache.set(key, baseVerses);
  return baseVerses;
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

  const storageKey = `huda-verses-v5-${surahNumber}`;
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached) as AyahVerse[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache.set(baseKey, parsed);
          return parsed;
        }
      }
    } catch {
      /* ignore storage error */
    }
  }

  if (PRE_SEEDED_SURAHS[surahNumber] && PRE_SEEDED_SURAHS[surahNumber].length > 0) {
    const seeded = PRE_SEEDED_SURAHS[surahNumber];
    memoryCache.set(baseKey, seeded);
    return seeded;
  }

  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    try {
      const localRes = await fetch(`/data/quran-verses/${surahNumber}.json`);
      if (localRes.ok) {
        const localVerses = (await localRes.json()) as AyahVerse[];
        if (Array.isArray(localVerses) && localVerses.length > 0) {
          memoryCache.set(baseKey, localVerses);
          try {
            localStorage.setItem(storageKey, JSON.stringify(localVerses));
          } catch {
            /* ignore storage errors */
          }
          return localVerses;
        }
      }
    } catch {
      /* proceed to remote API if local fetch fails */
    }
  }

  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    try {
      const res = await fetch(
        `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,en.sahih,ta.tamil`
      );
      if (res.ok) {
        const json = await res.json();
        if (json?.data && Array.isArray(json.data) && json.data.length >= 2) {
          const uthmani = json.data[0]?.ayahs || [];
          const english = json.data[1]?.ayahs || [];
          const tamil = json.data[2]?.ayahs || [];

          const verses: AyahVerse[] = uthmani.map((ayah: any, idx: number) => ({
            surahNumber,
            ayahNumber: ayah.numberInSurah,
            textArabic: ayah.text,
            textEnglish: english[idx]?.text || "",
            textTamil: tamil[idx]?.text || "",
            verseKey: `${surahNumber}:${ayah.numberInSurah}`,
          }));

          try {
            const timingRes = await fetch(`/data/quran-timings/${surahNumber}.json`);
            if (timingRes.ok) {
              const timingData = await timingRes.json();
              if (timingData?.verseTimings && Array.isArray(timingData.verseTimings)) {
                verses.forEach((verse, idx) => {
                  const vt = timingData.verseTimings[idx];
                  if (vt) {
                    verse.timestampFrom = vt.timestampFromSec;
                    verse.timestampTo = vt.timestampToSec;

                    let rawArabic = verse.textArabic.trim();
                    if (idx === 0) {
                      rawArabic = stripLeadingBismillah(rawArabic, surahNumber);
                      verse.textArabic = rawArabic;
                    }

                    const wordsList = splitArabicWords(rawArabic);
                    if (wordsList.length > 0 && vt.segments && vt.segments.length > 0) {
                      const n = vt.segments.length;
                      verse.words = wordsList.map((word, wIdx) => {
                        const si =
                          wordsList.length === n
                            ? wIdx
                            : Math.min(Math.floor((wIdx / wordsList.length) * n), n - 1);
                        return { word, startTime: vt.segments[si].startSec, endTime: vt.segments[si].endSec };
                      });
                    }
                  }
                });
              }
            }
          } catch {
            /* ignore timing load error */
          }

          if (verses.length > 0) {
            memoryCache.set(baseKey, verses);
            try {
              localStorage.setItem(storageKey, JSON.stringify(verses));
            } catch {
              /* ignore storage errors */
            }
            return verses;
          }
        }
      }
    } catch {
      /* network or parsing error, proceed to fallback */
    }
  }

  const fallback = getFallbackVerses(surahNumber);
  memoryCache.set(baseKey, fallback);
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
  if (currentTime >= lastWord.endTime && currentTime < toBound + 0.5) {
    return { progress: 1, activeWordIndex: totalWords - 1, activeWord: lastWord, hasWordTiming: true };
  }

  return { progress: 1, activeWordIndex: -1, activeWord: null, hasWordTiming: true };
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
  if (!verses || verses.length === 0) return [];

  const isSudais = !reciter || reciter.id === "sudais";
  // Reciters with paired Quran.com word segments carry their own accurate
  // per-verse timestamps and word timings (overlaid in fetchSurahVerses). Every
  // other reciter falls back to proportional ayah-level glow so that borrowed
  // timings never desync a differently paced voice.
  const hasOwnTiming = reciterHasWordTiming(reciter);

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

    // If prelude audio exists before Ayah 1 (e.g. Isti'adhah), add Isti'adhah only
    if (firstStart >= 3.0) {
      const istWords = hasOwnTiming ? getEffectiveWordsForText(CANONICAL_ISTIADHAH.textArabic, 0, firstStart) : [];
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
        words: hasOwnTiming ? getEffectiveWords(v) : [],
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
          words: getEffectiveWords(v),
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

    const shiftedWords = hasOwnTiming ? getEffectiveWords(v) : [];
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
 * Thematic Quran verses displayed when listening to Islamic Bayan categories.
 */
export const CATEGORY_INSPIRATIONAL_VERSES: Record<string, AyahVerse> = {
  "iman-taqwa": {
    surahNumber: 94,
    ayahNumber: 6,
    textArabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا",
    textEnglish: "Indeed, with hardship will be ease.",
    verseKey: "94:6",
  },
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
  "salah": {
    surahNumber: 20,
    ayahNumber: 14,
    textArabic: "وَأَقِمِ ٱلصَّلَوٰةَ لِذِكْرِىٓ",
    textEnglish: "And establish prayer for My remembrance.",
    verseKey: "20:14",
  },
  "dua": {
    surahNumber: 2,
    ayahNumber: 186,
    textArabic: "وَإِذَا سَأَلَكَ عِبَادِى عَنِّى فَإِنِّى قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ ٱلدَّاعِ إِذَا دَعَانِ",
    textEnglish: "And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the caller when he calls upon Me.",
    verseKey: "2:186",
  },
  "ramadan": {
    surahNumber: 2,
    ayahNumber: 185,
    textArabic: "شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ هُدًۭى لِّلنَّاسِ",
    textEnglish: "The month of Ramadan in which was revealed the Qur'an, a guidance for mankind.",
    verseKey: "2:185",
  },
  "hajj-umrah": {
    surahNumber: 2,
    ayahNumber: 196,
    textArabic: "وَأَتِمُّوا۟ ٱلْحَجَّ وَٱلْعُمْرَةَ لِلَّهِ",
    textEnglish: "And complete the Hajj and 'umrah for Allah.",
    verseKey: "2:196",
  },
  "akhlaq": {
    surahNumber: 68,
    ayahNumber: 4,
    textArabic: "وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍۢ",
    textEnglish: "And indeed, you are of a great moral character.",
    verseKey: "68:4",
  },
  "self-improvement": {
    surahNumber: 13,
    ayahNumber: 11,
    textArabic: "إِنَّ ٱللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا۟ مَا بِأَنفُسِهِمْ",
    textEnglish: "Indeed, Allah will not change the condition of a people until they change what is in themselves.",
    verseKey: "13:11",
  },
  "marriage": {
    surahNumber: 30,
    ayahNumber: 21,
    textArabic: "وَمِنْ ءَايَٰتِهِۦٓ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَٰجًۭا لِّتَسْكُنُوٓا۟ إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةًۭ وَرَحْمَةً",
    textEnglish: "And among His signs is that He created for you mates that you may find tranquility in them; and He placed between you affection and mercy.",
    verseKey: "30:21",
  },
  "family": {
    surahNumber: 25,
    ayahNumber: 74,
    textArabic: "رَبَّنَا هَبْ لَنَا مِنْ أَزْوَٰجِنَا وَذُرِّيَّٰتِنَا قُرَّةَ أَعْيُنٍۢ",
    textEnglish: "Our Lord, grant us from among our spouses and offspring comfort to our eyes.",
    verseKey: "25:74",
  },
  "death-akhirah": {
    surahNumber: 3,
    ayahNumber: 185,
    textArabic: "كُلُّ نَفْسٍۢ ذَآئِقَةُ ٱلْمَوْتِ",
    textEnglish: "Every soul will taste death.",
    verseKey: "3:185",
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
  categorySlug = "iman-taqwa",
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
  const [showTranslation, setShowTranslation] = useState(true);
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
      setVerses(getFallbackVerses(surahNumber));
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
  const segments = useMemo(() => {
    return getRecitationTimeline(surahNumber, verses, isJuz, duration, reciter);
  }, [surahNumber, verses, isJuz, duration, reciter]);

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

