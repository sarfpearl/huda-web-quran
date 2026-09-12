"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  QURAN_RECITERS,
  reciterHasWordTiming,
  type QuranReciter,
} from "@/lib/data/quranReciters";
import { ImamQuranIcon } from "@/components/ui/Icon";

interface ReciterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciter: QuranReciter;
  onSelectReciter: (reciter: QuranReciter) => void;
  isPlayingQuran: boolean;
}

export function ReciterPickerModal({
  isOpen,
  onClose,
  selectedReciter,
  onSelectReciter,
  isPlayingQuran,
}: ReciterPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [syncFilter, setSyncFilter] = useState<"word" | "verse">("word");
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  // On open: jump to the tab that contains the currently selected reciter and
  // clear any stale search so the selected item is guaranteed to be in the list.
  useEffect(() => {
    if (!isOpen) return;
    setSearchQuery("");
    setSyncFilter(reciterHasWordTiming(selectedReciter) ? "word" : "verse");
  }, [isOpen, selectedReciter]);

  // Scroll the selected reciter into view once the list for the active tab renders.
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => {
      selectedItemRef.current?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, syncFilter]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const query = searchQuery.trim().toLowerCase();
  const filteredReciters = QURAN_RECITERS.filter((r) => {
    // Segment filter: Word Sync vs Verse Sync (word-not-sync) reciters
    const wantWordSync = syncFilter === "word";
    if (reciterHasWordTiming(r) !== wantWordSync) return false;
    if (!query) return true;
    return (
      r.name.toLowerCase().includes(query) ||
      r.displayName.toLowerCase().includes(query) ||
      r.arabicName.includes(searchQuery.trim()) ||
      r.country.toLowerCase().includes(query) ||
      r.style.toLowerCase().includes(query)
    );
  });

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Quran Reciter Selection"
      className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:top-14 sm:right-0 sm:w-96 z-50 rounded-3xl bg-slate-950/95 backdrop-blur-2xl border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-4 sm:p-5 pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Teaching-tip pointer arrow up to the reciter avatar button (desktop) */}
      <span className="hidden sm:block absolute -top-1 right-7 h-3.5 w-3.5 rotate-45 rounded-[3px] bg-slate-950/95 border-l border-t border-white/15" />

      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-400">
            <ImamQuranIcon className="text-base" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
              Quran Reciter
            </h3>
            <p className="text-[11px] text-sand-300/70 leading-none mt-0.5">
              Choose Quran Reciter
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
          aria-label="Close reciter selection"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Reciters..."
          className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 pl-9 text-xs text-white placeholder:text-sand-300/40 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
        />
        <svg
          className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sand-300/50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Sync Mode Segment Control */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-black/40 border border-white/10 p-1">
        {([
          { key: "word", label: "Word Sync" },
          { key: "verse", label: "Audio Only" },
        ] as const).map((seg) => {
          const active = syncFilter === seg.key;
          return (
            <button
              key={seg.key}
              type="button"
              onClick={() => setSyncFilter(seg.key)}
              aria-pressed={active}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-all cursor-pointer ${
                active
                  ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "border border-transparent text-sand-300/60 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              {seg.key === "word" ? (
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M4 12h2M9 6v12M14 3v18M19 9v6" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                  <path d="M15.5 9a3.5 3.5 0 0 1 0 6M18 6.5a7 7 0 0 1 0 11" />
                </svg>
              )}
              {seg.label}
            </button>
          );
        })}
      </div>

      {/* Reciter List */}
      <div className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {filteredReciters.length === 0 ? (
          <div className="py-8 text-center text-xs text-sand-300/60">
            {searchQuery.trim()
              ? `No ${syncFilter === "word" ? "Word Sync" : "Audio Only"} reciter found matching "${searchQuery}"`
              : `No ${syncFilter === "word" ? "Word Sync" : "Audio Only"} reciters available`}
          </div>
        ) : (
          filteredReciters.map((reciter) => {
            const isSelected = selectedReciter.id === reciter.id;
            const hasError = imageErrors[reciter.id];

            return (
              <button
                key={reciter.id}
                ref={isSelected ? selectedItemRef : undefined}
                type="button"
                onClick={() => {
                  onSelectReciter(reciter);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-2 sm:p-2.5 rounded-2xl transition-all cursor-pointer text-left border ${
                  isSelected
                    ? "bg-emerald-950/40 border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : "bg-white/[0.04] border-white/5 hover:bg-white/[0.08] hover:border-white/15"
                }`}
              >
                {/* Reciter Photo or Fallback Avatar */}
                <div className="relative h-11 w-11 shrink-0">
                  <div className="h-full w-full overflow-hidden rounded-full border border-white/15 bg-slate-900 shadow-sm">
                    {reciter.photoUrl && !hasError ? (
                      <Image
                        src={reciter.photoUrl}
                        alt={reciter.name}
                        width={44}
                        height={44}
                        unoptimized={true}
                        className="h-full w-full object-cover"
                        onError={() =>
                          setImageErrors((prev) => ({ ...prev, [reciter.id]: true }))
                        }
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center bg-emerald-900/50 text-emerald-300 font-bold text-sm">
                        {reciter.displayName.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Pulsing audio indicator — sibling of the clipped avatar so it
                      is never cropped by the round overflow-hidden mask. */}
                  {isSelected && isPlayingQuran && (
                    <span className="absolute bottom-0.5 right-0.5 z-10 flex h-2 w-2 pointer-events-none">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60 [animation-delay:0.6s]" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-slate-950/80 shadow-[0_0_8px_2px_rgba(16,185,129,0.95)] animate-pulse" />
                    </span>
                  )}
                </div>

                {/* Reciter Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="truncate text-xs sm:text-sm font-semibold text-white">
                      {reciter.name}
                    </h4>
                  </div>
                  <p className="truncate text-[11px] text-sand-300/70 mt-0.5">
                    {reciter.style} · {reciter.country}
                  </p>
                </div>

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <div className="shrink-0 h-6 w-6 rounded-full bg-emerald-500/20 border border-emerald-400/40 grid place-items-center text-emerald-400 shadow-sm">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Footer / Attribution & Reference link */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-sand-300/60">
        <span>Source: surahquran.com</span>
        <a
          href="https://surahquran.com/quran-mp3-english.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-medium transition-colors"
        >
          <span>View All Reciters</span>
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
