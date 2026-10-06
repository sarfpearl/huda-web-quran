import {
  QURAN_SURAHS,
  SURAH_TRACKS,
  SURAH_TRACK_ID_PREFIX,
  QURAN_JUZ,
  QURAN_TRACKS,
  type QuranSurah,
  type QuranJuz,
  type RevelationType,
  isSurahTrackId,
  isQuranTrackId,
  isQuranTrack,
  getSurahByTrackId,
  getQuranJuzByTrackId,
  getSurahTracksForReciter,
  getRandomSurahTrack,
  quranSurahToTrack,
  quranJuzToTrackForReciter,
  buildJuzAyahUrls,
  buildJuzPreludes,
  getJuzAyahPairs,
  quranPlayerSubtitle,
  quranContentLabel,
  quranImageUrl,
  quranThumbUrl,
  surahAudioUrl,
} from "./quran";
export {
  QURAN_RECITERS,
  getDefaultReciter,
  getReciterById,
  resolveActiveReciter,
  reciterHasWordTiming,
  reciterHasWordTimingFor,
  wordSyncUnavailableReason,
  reciterHasSurah,
  reciterIsUnavailable,
  buildReciterSurahUrl,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "./quranReciters";
export {
  PRELUDE_AUDIO,
  getSurahPreludeConfig,
  getReciterAyah1TrimOffset,
  type SurahPreludeConfig,
} from "./surahTrimming";
export { mediaUrl } from "../media";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  DATA SERVICE
 *
 *  The single UI-facing import point for Quran data: Surahs, Juz, reciters,
 *  preludes and media URLs. Everything is static data bundled with the app.
 * ─────────────────────────────────────────────────────────────────────────
 */

// ── Quran & Surah Services (Single Source of Truth) ────────────────────────

export {
  QURAN_SURAHS,
  SURAH_TRACKS,
  SURAH_TRACK_ID_PREFIX,
  QURAN_JUZ,
  QURAN_TRACKS,
  isSurahTrackId,
  isQuranTrackId,
  isQuranTrack,
  getSurahByTrackId,
  getQuranJuzByTrackId,
  getRandomSurahTrack,
  getSurahTracksForReciter,
  quranSurahToTrack,
  quranJuzToTrackForReciter,
  buildJuzAyahUrls,
  buildJuzPreludes,
  getJuzAyahPairs,
  quranPlayerSubtitle,
  quranContentLabel,
  quranImageUrl,
  quranThumbUrl,
  surahAudioUrl,
};
export {
  QURAN_ARTWORK_CONCEPTS,
  getSurahArtwork,
  type SurahArtworkConcept,
} from "./quran-artwork";
export type { QuranSurah, QuranJuz, RevelationType };
