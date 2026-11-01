"use client";

import { useEffect, useRef, useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { QURAN_SURAHS } from "@/lib/data/service";
import { MUSHAF_PAGE_COUNT, MUSHAF_PAGE_STARTS } from "@/lib/data/mushafPages";
import { surahsOnPage } from "@/lib/data/mushafPageSurahs";
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
      // Match any Surah on the page, not only the one it opens on — so a search
      // for a short Surah that shares a page (An-Nas, Al-Falaq…) still finds it.
      (!q ||
        String(p.page).startsWith(q) ||
        surahsOnPage(p.page).some(
          (n) =>
            surahName(n).toLowerCase().includes(q) ||
            surahNameIn(n, "ta").includes(query.trim()) ||
            surahNameIn(n, lang).toLowerCase().includes(q),
        ))
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
          // Every Surah on the page: a page with two or three short Surahs
          // names them all (fit by width, the rest clipped with an ellipsis),
          // so a glance tells how many sit together. The full list is the hover
          // title. A single Surah keeps its opening ayah for context.
          const nums = surahsOnPage(page);
          const names = nums.map((n) => surahNameIn(n, lang));
          const label = nums.length > 1 ? names.join("  ·  ") : `${names[0] ?? surahNameIn(surah, lang)} · ${surah}:${ayah}`;
          const full = nums.length > 1 ? names.join(" · ") : label;
          return (
            <button
              key={page}
              type="button"
              data-page={page}
              onClick={() => pick(page)}
              aria-current={current ? "page" : undefined}
              aria-label={`${word("page", lang)} ${page} — ${full}`}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                current ? SELECTED : cn(UNSELECTED_EDGE, "text-sand-100 hover:bg-white/10")
              )}
            >
              <span className="flex shrink-0 items-center gap-1.5 font-bold tabular-nums">
                {word("page", lang)} {page}
                {nums.length > 1 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                      current ? "bg-white/20 text-white" : "bg-white/10 text-sand-200/70"
                    )}
                  >
                    {nums.length}
                  </span>
                )}
              </span>
              <span
                title={full}
                className={cn("min-w-0 truncate text-xs", current ? "text-white/90" : "text-sand-200/60")}
              >
                {label}
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
