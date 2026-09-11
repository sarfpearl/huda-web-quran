"use client";

import { useState, useEffect } from "react";
import type { AyahVerse, QuranWordTiming, RecitationSegment } from "@/lib/data/quranVerses";
import type { QuranSurah } from "@/lib/data/quran";

interface SyncQADebugHUDProps {
  currentTime: number;
  activeSurah?: QuranSurah | null;
  currentVerse?: AyahVerse | null;
  currentSegment?: RecitationSegment | null;
  activeVerseIndex: number;
  totalVerses: number;
  voiceProgress: number;
  activeWord: QuranWordTiming | null;
  selectedReciter?: { displayName: string };
  timingMode?: "EXACT_WORD_TIMING" | "AYAH_LEVEL_FALLBACK";
  timingSource?: string;
}

export function SyncQADebugHUD({
  currentTime,
  activeSurah,
  currentVerse,
  currentSegment,
  activeVerseIndex,
  totalVerses,
  voiceProgress,
  activeWord,
  selectedReciter,
  timingMode = "AYAH_LEVEL_FALLBACK",
  timingSource,
}: SyncQADebugHUDProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsOpen(true);
    }
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isExact = timingMode === "EXACT_WORD_TIMING";

  return (
    <aside
      aria-label="Audio Synchronization QA Monitor"
      className="fixed top-20 right-4 z-50 pointer-events-auto select-none font-mono transition-all"
    >
      {/* Minimized Toggle Button */}
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-semibold shadow-lg hover:bg-black transition-all cursor-pointer"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>SYNC QA HUD</span>
        </button>
      ) : (
        <div className="w-84 rounded-2xl bg-black/90 backdrop-blur-xl border border-amber-400/50 p-4 text-xs text-sand-100 shadow-[0_12px_40px_rgba(0,0,0,0.85)]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isExact ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              <span className="font-bold tracking-wider text-amber-300">VOICE SYNC QA HUD</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Minimize HUD"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Metric Rows */}
          <div className="space-y-2 text-[11px] leading-relaxed">
            <div className="flex items-center justify-between">
              <span className="text-white/60">Reciter:</span>
              <span className="font-semibold text-emerald-300 truncate max-w-[170px]" title={selectedReciter?.displayName ?? "Sheikh Abdul Rahman Al-Sudais"}>
                {selectedReciter?.displayName ?? "Sheikh Abdul Rahman Al-Sudais"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Timing Mode:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                isExact
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/40"
              }`}>
                {isExact ? "Exact Acoustic Word" : "Ayah-Level Fallback"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Audio currentTime:</span>
              <span className="font-bold text-amber-300 text-sm">{(currentTime ?? 0).toFixed(3)}s</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Active Surah:</span>
              <span className="font-semibold text-sand-100">
                {activeSurah ? `${activeSurah.number}. ${activeSurah.name}` : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Segment Type:</span>
              <span className={`font-bold uppercase ${
                currentSegment?.type === "istiadhah"
                  ? "text-cyan-300"
                  : currentSegment?.type === "bismillah"
                  ? "text-amber-300"
                  : "text-emerald-300"
              }`}>
                {currentSegment ? currentSegment.type : "AYAH"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Active Item:</span>
              <span className="font-bold text-amber-300">
                {currentSegment?.type === "istiadhah"
                  ? "Isti'adhah (Section: ISTI'ADHAH)"
                  : currentSegment?.type === "bismillah"
                  ? "Bismillah (Section: BISMILLAH)"
                  : currentVerse
                  ? `${currentVerse.verseKey} (${activeVerseIndex + 1}/${totalVerses})`
                  : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Segment Timing:</span>
              <span className="text-sand-300">
                {typeof currentSegment?.startTime === "number" && typeof currentSegment?.endTime === "number"
                  ? `${currentSegment.startTime.toFixed(2)}s – ${currentSegment.endTime.toFixed(2)}s`
                  : typeof currentVerse?.timestampFrom === "number" && typeof currentVerse?.timestampTo === "number"
                  ? `${currentVerse.timestampFrom.toFixed(2)}s – ${currentVerse.timestampTo.toFixed(2)}s`
                  : "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <span className="text-white/60">Active Arabic Word:</span>
              <span
                dir="rtl"
                className={`font-arabic text-base font-bold transition-colors ${
                  isExact && activeWord ? "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.9)]" : "text-white/40"
                }`}
              >
                {isExact && activeWord ? activeWord.word : "— (Ayah-Level Mode) —"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Word Window:</span>
              <span className="text-sand-300">
                {isExact && typeof activeWord?.startTime === "number" && typeof activeWord?.endTime === "number"
                  ? `${activeWord.startTime.toFixed(2)}s – ${activeWord.endTime.toFixed(2)}s`
                  : "N/A (Ayah-Level Highlight)"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/60">Ayah Progress:</span>
              <span className="font-bold text-amber-400">{(((voiceProgress || 0) * 100) || 0).toFixed(1)}%</span>
            </div>

            {/* Live Visual Progress Bar in HUD */}
            <div className="pt-2">
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.95)] transition-[width] duration-100 ease-linear"
                  style={{ width: `${Math.min(Math.max((voiceProgress || 0) * 100, 0), 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-white/40">
                <span>0% (Verse Start)</span>
                <span>100% (Verse End)</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 text-[9px] text-center tracking-wide">
              {timingSource ? (
                <span className={isExact ? "text-emerald-400 font-semibold" : "text-amber-400/90 font-semibold"}>
                  SOURCE: {timingSource.toUpperCase()}
                </span>
              ) : isExact ? (
                <span className="text-emerald-400 font-semibold">
                  SOURCE: SPEECH WAVEFORM ACOUSTIC ALIGNMENT (SUDAIS 001.MP3)
                </span>
              ) : (
                <span className="text-amber-400/90 font-semibold">
                  SOURCE: AYAH-LEVEL BOUNDARY SYNC (WORD TIMING UNVERIFIED FOR THIS RECITER)
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
