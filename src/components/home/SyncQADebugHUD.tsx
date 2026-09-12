"use client";

import { useState, useEffect, useRef } from "react";
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
  /** Controlled open state (so only one header popover is open at a time). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open,
  onOpenChange,
}: SyncQADebugHUDProps) {
  // Controlled if `open`/`onOpenChange` are provided; else self-managed.
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;
  const setOpen = (v: boolean) => (onOpenChange ? onOpenChange(v) : setInternalOpen(v));
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click (e.g. clicking EN, the background, anywhere else).
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isExact = timingMode === "EXACT_WORD_TIMING";

  // QA HUD: inline pill in the header with a teaching-tip popover.
  return (
    <div ref={containerRef} className="relative shrink-0 font-mono">
      {/* QA pill — styled to match the EN language button, with a QA/activity icon */}
      <button
        type="button"
        onClick={() => setOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Voice Sync QA Monitor"
        title="Voice Sync QA HUD"
        className="pointer-events-auto flex items-center gap-1 justify-center h-9 px-2.5 sm:h-11 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer text-amber-300 hover:text-white hover:bg-black/20 hover:border-white/30"
      >
        {/* Activity / pulse-line icon (QA monitor) */}
        <svg className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h3l2.5-7 5 14 2.5-7H21" />
        </svg>
        <span>QA</span>
      </button>

      {isOpen && (
        <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-3 z-50 pointer-events-auto select-none">
          {/* Teaching-tip pointer arrow (desktop only — mobile popover is centered) */}
          <span className="hidden sm:block absolute -top-[7px] right-6 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-slate-950 border-l border-t border-white/15" />
          <div className="relative w-full sm:w-[26rem] max-w-[calc(100vw-1.5rem)] rounded-3xl bg-slate-950/95 backdrop-blur-2xl border border-white/15 p-4 sm:p-5 text-xs text-sand-100 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
          {/* Header — desktop dismisses via outside-click/arrow; mobile gets a close button */}
          <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isExact ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              <span className="font-bold tracking-wider text-amber-300">VOICE SYNC QA HUD</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close QA monitor"
              className="sm:hidden grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      )}
    </div>
  );
}
