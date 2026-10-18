"use client";

import { useState } from "react";
import { WAQF_LEGEND, type WaqfGroup } from "@/lib/data/quranGlyphs";
import { cn } from "@/lib/utils";
import { t, useUiLang, type UiLang } from "@/lib/uiLang";

/*
 * The IndoPak waqf (stop) signs, filtered by group — Stop / Pause / Continue
 * (the way reciters' charts group them). The three group chips act as a filter:
 * the selected one shows only its signs below. Each sign is drawn large in its
 * full Arabic-letter form inside a coloured disc, centred, with its meaning in
 * the UI language. Used by the Tajweed panel (ImmersiveHeader) and the Script
 * settings page, IndoPak only.
 */
const GROUPS: { id: WaqfGroup; title: string; disc: string; dot: string; chip: string }[] = [
  {
    id: "stop",
    title: "Stop",
    disc: "bg-rose-950/70 border-rose-400/40 text-rose-50",
    dot: "bg-rose-400",
    chip: "border-rose-400/60 bg-rose-500/15 text-white",
  },
  {
    id: "pause",
    title: "Pause",
    disc: "bg-amber-900/60 border-amber-400/40 text-amber-50",
    dot: "bg-amber-400",
    chip: "border-amber-400/60 bg-amber-500/15 text-white",
  },
  {
    id: "continue",
    title: "Continue",
    disc: "bg-emerald-900/60 border-emerald-400/40 text-emerald-50",
    dot: "bg-emerald-400",
    chip: "border-emerald-400/60 bg-emerald-500/15 text-white",
  },
];

export function WaqfLegend({ lang: langProp }: { lang?: UiLang } = {}) {
  const uiLang = useUiLang();
  const lang = langProp ?? uiLang;
  const [sel, setSel] = useState<WaqfGroup>("stop");
  return (
    <div className="mt-2 border-t border-white/10 pt-3">
      {/* Group filter chips */}
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSel(g.id)}
            aria-pressed={sel === g.id}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer",
              sel === g.id ? g.chip : "border-white/15 text-sand-100 hover:bg-white/5",
            )}
          >
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", g.dot)} />
            {t(lang, g.title)}
          </button>
        ))}
      </div>

      {/* The selected group's signs */}
      <ul className="grid gap-2">
        {WAQF_LEGEND.filter((r) => r.group === sel).map((r) => {
          const g = GROUPS.find((x) => x.id === sel)!;
          return (
            <li key={r.mark} className="flex items-center gap-3 text-[13px] text-sand-100/90">
              <span
                lang="ar"
                dir="rtl"
                aria-hidden="true"
                className={cn(
                  "font-arabic grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border leading-none",
                  g.disc,
                  [...r.mark].length > 1 ? "text-xl" : "text-3xl",
                )}
              >
                {/* Arabic sits high on its line box; nudge down to optically
                    centre the glyph in the disc. */}
                <span className="block translate-y-[0.16em] leading-none">{r.mark}</span>
              </span>
              <span>{t(lang, r.en)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
