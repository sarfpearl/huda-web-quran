/**
 * HuDa Web Quran — Canonical Surah Prelude & Reciter Trimming Configuration
 * 
 * Rules:
 * 1. Surah 1 (Al-Fatihah) plays our own dedicated audio reciting:
 *    "أَعُوذُ بِٱللَّهِ مِنَ ٱلشَّيْطَٰنِ ٱلرَّجِيمِ" (Isti'adhah) -> "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" (Bismillah)
 * 2. All other Surahs (2 to 114, except Surah 9) play our own dedicated audio reciting:
 *    "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ" (Bismillah only)
 * 3. Surah 9 (At-Tawbah) has NO Bismillah per Islamic tradition; begins directly at Ayah 1.
 * 4. Reciter streams are trimmed to start directly at Ayah 1, preventing repetition of Bismillah/Isti'adhah.
 * 5. While the prelude audio is playing, the audio counter remains at 00:00. Count starts only when Ayat 1 begins.
 * 6. Audio Only reciters (no word-level timing) skip the prelude entirely and play the raw source stream as-is.
 */

import { reciterHasWordTiming, type QuranReciter } from "./quranReciters";

export const PRELUDE_AUDIO = {
  fatihah: {
    // Isti'adhah ONLY. The reciter's own audio recites the Bismillah, so the
    // prelude must not also contain one (that caused a doubled Bismillah).
    url: "/audio/prelude/istiadhah-only-prelude.mp3",
    duration: 6.57,
    istiadhahEndTime: 6.50,
  },
  bismillah: {
    url: "/audio/prelude/bismillah-prelude.mp3",
    duration: 6.00,
  },
} as const;

export interface SurahPreludeConfig {
  hasPrelude: boolean;
  type: "fatihah" | "bismillah" | "none";
  url: string | null;
  duration: number;
}

const NO_PRELUDE: SurahPreludeConfig = {
  hasPrelude: false,
  type: "none",
  url: null,
  duration: 0,
};

export function getSurahPreludeConfig(
  surahNumber: number,
  reciter?: QuranReciter | null
): SurahPreludeConfig {
  // Audio Only reciters (no word-level timing) play the raw source stream exactly
  // as it comes from the source — no Isti'adhah/Bismillah prelude is prepended and
  // nothing is trimmed. The reciter's own recitation is shown as-is.
  if (reciter && !reciterHasWordTiming(reciter)) {
    return NO_PRELUDE;
  }
  if (surahNumber === 1) {
    return {
      hasPrelude: true,
      type: "fatihah",
      url: PRELUDE_AUDIO.fatihah.url,
      duration: PRELUDE_AUDIO.fatihah.duration,
    };
  }
  // Surah 9 (At-Tawbah) does NOT have Bismillah
  if (surahNumber === 9) {
    return {
      hasPrelude: false,
      type: "none",
      url: null,
      duration: 0,
    };
  }
  // Surahs 2 to 114:
  // With voice trim removed, reciters naturally recite Bismillah at the start of their audio stream from 0.00s.
  // No artificial prelude is prepended to prevent duplicate Bismillah recitation.
  return {
    hasPrelude: false,
    type: "none",
    url: null,
    duration: 0,
  };
}

/**
 * Returns the timestamp (in seconds) where Ayah 1 starts in the reciter's raw audio file.
 * NOTE: Voice trimming is removed for ALL Surahs (1 to 114). Returns 0 unconditionally
 * so every reciter stream plays naturally from 0.00s without any voice cutting or trimming.
 */
export function getReciterAyah1TrimOffset(_surahNumber: number, _reciterId?: string | null): number {
  return 0;
}

