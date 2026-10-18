"use client";

import { WAQF_LEGEND, type WaqfGroup } from "@/lib/data/quranGlyphs";
import { t, useUiLang, type UiLang } from "@/lib/uiLang";

/*
 * The IndoPak waqf (stop) signs, grouped Stop / Pause / Continue with a colour
 * per group (brown-red / amber / green, as reciters' charts show them). Each
 * sign is drawn large in the IndoPak font inside a coloured disc so the mark is
 * clearly legible; the meaning is translated into the UI language. Used by the
 * Tajweed panel (ImmersiveHeader) and the Script settings page, IndoPak only.
 */
const GROUPS: { id: WaqfGroup; title: string; disc: string; dot: string }[] = [
  { id: "stop", title: "Stop", disc: "bg-rose-950/70 border-rose-400/40 text-rose-50", dot: "text-rose-300" },
  { id: "pause", title: "Pause", disc: "bg-amber-900/60 border-amber-400/40 text-amber-50", dot: "text-amber-300" },
  { id: "continue", title: "Continue", disc: "bg-emerald-900/60 border-emerald-400/40 text-emerald-50", dot: "text-emerald-300" },
];

export function WaqfLegend({ lang: langProp }: { lang?: UiLang } = {}) {
  const uiLang = useUiLang();
  const lang = langProp ?? uiLang;
  return (
    <div className="mt-2 grid gap-3 border-t border-white/10 pt-3">
      {GROUPS.map((g) => (
        <div key={g.id}>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-sand-200/70">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full bg-current ${g.dot}`} />
            {t(lang, g.title)}
          </p>
          <ul className="grid gap-2">
            {WAQF_LEGEND.filter((r) => r.group === g.id).map((r) => (
              <li key={r.mark} className="flex items-center gap-3 text-[13px] text-sand-100/90">
                <span
                  lang="ar"
                  dir="rtl"
                  aria-hidden="true"
                  className={`font-arabic grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border ${g.disc} ${[...r.mark].length > 1 ? "text-xl" : "text-3xl"}`}
                >
                  {/* Arabic sits high on its line box; nudge down to optically
                      centre the glyph in the disc. */}
                  <span className="block leading-none translate-y-[0.08em]">{r.mark}</span>
                </span>
                <span>{t(lang, r.en)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
