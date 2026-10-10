"use client";

import { useEffect, useRef, useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { QURAN_SURAHS } from "@/lib/data/service";
import { MUSHAF_PAGE_COUNT, MUSHAF_PAGE_STARTS } from "@/lib/data/mushafPages";
import { cn } from "@/lib/utils";
import { SELECTED, UNSELECTED_EDGE } from "@/components/ui/selection";
import { surahNameIn, t, useUiLang, word } from "@/lib/uiLang";

interface MushafPagePickerProps {
  open: boolean;
  currentPage: number;
  onPick: (page: number) => void;
  onClose: () => void;
  /** Pages that can be chosen (a Juz: its own). Default: all 604. */
  range?: [number, number];
}

const surahName = (n: number) => QURAN_SURAHS.find((s) => s.number === n)?.name ?? `Surah ${n}`;

/**
 * Reading mode → tap « Page N »: every Madinah-Mushaf page (1–604) with the
 * Surah : ayah it opens on, opened scrolled to the current page. A number
 * typed in the box jumps straight to that page.
 */
export function MushafPagePicker({ open, currentPage, onPick, onClose, range = [1, MUSHAF_PAGE_COUNT] }: MushafPagePickerProps) {
  const lang = useUiLang();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    // After the sheet mounts: bring the current page to the middle.
    const timer = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-page="${currentPage}"]`)
        ?.scrollIntoView({ block: "center" });
    }, 50);
    return () => clearTimeout(timer);
  }, [open, currentPage]);

  const typed = parseInt(query, 10);
  const typedValid = Number.isFinite(typed) && typed >= range[0] && typed <= range[1];
  const q = query.trim().toLowerCase();
  const pages = MUSHAF_PAGE_STARTS.map(([surah, ayah], i) => ({ page: i + 1, surah, ayah })).filter(
    (p) =>
      p.page >= range[0] &&
      p.page <= range[1] &&
      (!q ||
        String(p.page).startsWith(q) ||
        surahName(p.surah).toLowerCase().includes(q) ||
        surahNameIn(p.surah, "ta").includes(query.trim()))
  );

  const pick = (page: number) => {
    onPick(page);
    onClose();
  };

  return (
    <ActionSheet open={open} onClose={onClose} label={t(lang, "Choose a Mushaf page")} className="h-[70dvh]">
      <div className="flex items-baseline justify-between pb-3">
        <h3 className="text-lg font-black text-white tracking-tight">
          {t(lang, "Go to page")}
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400">
          {word("page", lang)} {currentPage} / {range[1]}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typedValid) pick(typed);
        }}
        className="mb-3"
      >
        <input
          type="search"
          inputMode="numeric"
          enterKeyHint="go"
          placeholder={t(lang, "Page number or Surah…")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            "w-full rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all",
          )}
        />
      </form>
      <div ref={listRef} className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 space-y-1">
        {pages.map(({ page, surah, ayah }) => {
          const current = page === currentPage;
          return (
            <button
              key={page}
              type="button"
              data-page={page}
              onClick={() => pick(page)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                current ? SELECTED : cn(UNSELECTED_EDGE, "text-sand-100 hover:bg-white/10")
              )}
            >
              <span className="font-bold tabular-nums">
                {word("page", lang)} {page}
              </span>
              <span className={cn("truncate text-xs", current ? "text-white/90" : "text-sand-200/60")}>
                {surahNameIn(surah, lang)} · {surah}:{ayah}
              </span>
            </button>
          );
        })}
        {pages.length === 0 && (
          <p className="py-8 text-center text-xs text-sand-200/60">
            {t(lang, "No matching page.")}
          </p>
        )}
      </div>
    </ActionSheet>
  );
}
