"use client";

import { useEffect, useState } from "react";
import {
  getEffectiveWords,
  getVoiceProgressInSegment,
  toArabicNumerals,
  type AyahVerse,
  type RecitationSegment,
} from "@/lib/data/quranVerses";

interface CenterVerseDisplayProps {
  currentVerse: AyahVerse | null;
  currentSegment?: RecitationSegment | null;
  currentTime?: number;
  isPlaying?: boolean;
  language?: "en" | "ta";
  showTranslation?: boolean;
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
  hasMultipleVerses?: boolean;
  activeWordIndex?: number;
  hasWordTiming?: boolean;
  /** Whether the selected reciter supports word-level voice sync. When false
   *  (Verse Sync reciters), the verse text and translation are hidden entirely,
   *  since the voice and on-screen letters do not line up word-for-word. */
  reciterWordSync?: boolean;
}

/**
 * Authentic Madinah-mushaf end-of-ayah marker. The Uthmanic Hafs font's own
 * Arabic-Indic digit glyphs ARE the ornamental ayah rosette — rendering the
 * number alone (no U+06DD, RTL, no letter-spacing) encloses it in the ornament.
 * (Adding U+06DD would draw a second empty ornament next to it.)
 */
function AyahOrnament({ n }: { n: number }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      aria-label={`Ayah ${n}`}
      className="font-arabic text-amber-300 select-none align-middle mx-1.5 tracking-normal [letter-spacing:0] text-[1.2em]"
    >
      {toArabicNumerals(n)}
    </span>
  );
}

export function CenterVerseDisplay({
  currentVerse,
  currentSegment,
  currentTime,
  isPlaying = false,
  language = "en",
  showTranslation = true,
  onPrevVerse,
  onNextVerse,
  hasMultipleVerses = false,
  activeWordIndex: propWordIndex,
  hasWordTiming: propHasWordTiming,
  reciterWordSync = true,
}: CenterVerseDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeItem = currentSegment ?? currentVerse;
  if (!activeItem) return null;

  // Verse Sync reciters: hide the verse text + meaning — the recitation audio
  // does not align word-for-word with the on-screen letters, so showing them
  // would be misleading. Just the immersive background + audio play.
  if (!reciterWordSync) return null;

  const isPrelude = "type" in activeItem && (activeItem.type === "istiadhah" || activeItem.type === "bismillah");
  const ayahNum =
    "ayahNumber" in activeItem && typeof activeItem.ayahNumber === "number" && activeItem.ayahNumber > 0
      ? activeItem.ayahNumber
      : currentVerse && typeof currentVerse.ayahNumber === "number" && currentVerse.ayahNumber > 0
      ? currentVerse.ayahNumber
      : 0;

  const hasTrailingAyahMarker = /[\u0660-\u0669\u06dd\uFD3E\uFD3F]\s*$/.test(activeItem.textArabic || "");

  // Adaptive font sizing based on Arabic length for perfect screen balance
  const arabicLength = activeItem.textArabic?.length || 0;
  const arabicSizeClass =
    arabicLength < 45
      ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
      : arabicLength < 95
      ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
      : arabicLength < 170
      ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
      : "text-lg sm:text-xl md:text-2xl lg:text-3xl";

  const translationSizeClass =
    arabicLength < 70
      ? "text-base sm:text-lg md:text-xl lg:text-2xl"
      : "text-sm sm:text-base md:text-lg lg:text-xl";

  // Full canonical Arabic text words
  const rawWords = (activeItem.textArabic || "").trim().split(/\s+/).filter(Boolean);

  // Voice-primary synchronization derived directly from spoken audio waveform
  const effectiveWords = getEffectiveWords(activeItem);
  const resolvedTiming =
    typeof propHasWordTiming === "boolean"
      ? {
          hasWordTiming: propHasWordTiming,
          activeWordIndex: typeof propWordIndex === "number" ? propWordIndex : -1,
        }
      : getVoiceProgressInSegment(activeItem, typeof currentTime === "number" ? currentTime : 0);

  const { hasWordTiming, activeWordIndex } = resolvedTiming;

  // Guarantee that every word of the canonical Arabic verse is ALWAYS rendered
  const wordsToRender =
    effectiveWords.length > 0
      ? effectiveWords
      : rawWords.map((w) => ({ word: w, startTime: 0, endTime: 0 }));

  const itemKey = currentSegment
    ? `${currentSegment.id}-${currentSegment.type}`
    : `${currentVerse?.surahNumber}-${currentVerse?.verseKey}`;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-4 sm:px-8 md:px-16 pt-16 sm:pt-20 pb-48 sm:pb-52 md:pb-56">
      <div className="pointer-events-auto relative w-full max-w-5xl mx-auto flex flex-col items-center select-none group">
        {/* Previous Verse Chevron */}
        {hasMultipleVerses && onPrevVerse && (
          <button
            type="button"
            onClick={onPrevVerse}
            aria-label="Previous Ayah"
            className="absolute left-0 sm:-left-6 md:-left-12 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full text-white/70 hover:text-white bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all active:scale-90 cursor-pointer"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {/* Verse Container (Permanently visible, never trapped in exit animations) */}
        <div
          key={itemKey}
          className="flex flex-col items-center text-center w-full px-2 animate-in fade-in duration-200"
        >
          {/* Main Quran Arabic Calligraphy (Centred, Bold, Glow/Shadow, Voice-Synchronized) */}
          <h2
            dir="rtl"
            lang="ar"
            className={`font-arabic font-normal text-white text-center leading-[2.1] sm:leading-[2.4] tracking-wide quran-arabic-shadow max-w-4xl mx-auto px-4 sm:px-8 py-2 sm:py-3 ${arabicSizeClass}`}
          >
            {wordsToRender.length > 0 ? (
              <span className="inline-flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-4 gap-y-1 sm:gap-y-2">
                {wordsToRender.map((w, idx) => {
                  // If word-level timing does NOT exist: Fallback highlights the complete active Ayah in amber/gold
                  if (!hasWordTiming) {
                    return (
                      <span
                        key={`${idx}-${w.word}`}
                        className="relative inline-block text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,0.9)] transition-all duration-150"
                      >
                        {w.word}
                      </span>
                    );
                  }

                  const isActive = idx === activeWordIndex;
                  const isPast =
                    activeWordIndex !== -1
                      ? idx < activeWordIndex
                      : typeof currentTime === "number" && currentTime >= (w.endTime ?? 0);

                  return (
                    <span
                      key={`${idx}-${w.word}`}
                      className={`relative inline-block transition-all duration-150 ${
                        isActive
                          ? "text-amber-300 drop-shadow-[0_0_24px_rgba(251,191,36,1)] scale-[1.04]"
                          : isPast
                          ? "text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]"
                          : "text-white/60 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                      }`}
                    >
                      {w.word}
                    </span>
                  );
                })}
                {/* Canonical Quran Ayah Number / Verse End Marker (Uthmani Typography) */}
                {!isPrelude && ayahNum > 0 && !hasTrailingAyahMarker && (
                  <AyahOrnament n={ayahNum} />
                )}
              </span>
            ) : (
              <span>
                {activeItem.textArabic}
                {!isPrelude && ayahNum > 0 && !hasTrailingAyahMarker && (
                  <AyahOrnament n={ayahNum} />
                )}
              </span>
            )}
          </h2>

          {/* English / Tamil Translation (Directly below Arabic, with generous breathing space) */}
          {showTranslation && (
            <p
              lang={language === "ta" ? "ta" : "en"}
              className={`${language === "ta" ? "font-tamil italic" : "font-serif sm:font-sans"} font-normal text-sand-50 text-center leading-[1.8] sm:leading-[2.1] tracking-wide quran-translation-shadow drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] mt-4 sm:mt-5 md:mt-6 px-4 sm:px-10 max-w-3xl mx-auto transition-opacity duration-300 ${translationSizeClass}`}
            >
              {language === "ta"
                ? activeItem.textTamil || activeItem.textEnglish
                : activeItem.textEnglish}
            </p>
          )}
        </div>

        {/* Next Verse Chevron */}
        {hasMultipleVerses && onNextVerse && (
          <button
            type="button"
            onClick={onNextVerse}
            aria-label="Next Ayah"
            className="absolute right-0 sm:-right-6 md:-right-12 top-1/2 -translate-y-1/2 z-30 p-2 sm:p-3 rounded-full text-white/70 hover:text-white bg-black/30 hover:bg-black/60 backdrop-blur-sm border border-white/10 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-all active:scale-90 cursor-pointer"
          >
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
