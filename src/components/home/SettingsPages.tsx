"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/Icon";
import { SELECTED, SELECTED_BADGE, SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { cn } from "@/lib/utils";
import { UI_LANGS, t, useUiLang } from "@/lib/uiLang";
import { TRANSLATIONS, translationInfo, type TranslationLang } from "@/lib/data/translations";
import type { QuranScript } from "@/lib/data/quranGlyphs";
import { WaqfLegend } from "./WaqfLegend";
import { OPEN_PRAYER_TIMES_EVENT, OPEN_RECITERS_EVENT } from "@/lib/settingsEvents";
import { READER_SCALES, SCRIPT_CHOICES } from "./ImmersiveHeader";

/*
 * Settings (⚙ in the content browser): every preference in one place. The
 * values and setters are the home's own (ImmersiveHomeClient), so a change
 * here is the same as one from the header's controls. Reciter and prayer
 * times open their own sheets (the full pickers) through window events,
 * once Settings has closed (`onLeave`).
 */

export interface HomeSettings {
  translationLang: TranslationLang;
  onChooseTranslation: (lang: TranslationLang) => void;
  showMeaning: boolean;
  onToggleMeaning: () => void;
  textSize: { value: number; onChange: (v: number) => void; initial: number };
  showTajweed: boolean;
  onToggleTajweed: () => void;
  script: QuranScript;
  /** Unset while IndoPak is turned off for the site. */
  onChooseScript?: (s: QuranScript) => void;
  visualMode: "video" | "image";
  onToggleVisualMode: () => void;
  reciterName: string;
}

const HomeSettingsContext = createContext<HomeSettings | null>(null);
export function HomeSettingsProvider({ value, children }: { value: HomeSettings; children: ReactNode }) {
  return <HomeSettingsContext.Provider value={value}>{children}</HomeSettingsContext.Provider>;
}
export const useHomeSettings = () => useContext(HomeSettingsContext);

/** The Settings pages besides the list itself. */
export type SettingsPage = "language" | "translation" | "textSize" | "quran";
export const SETTINGS_PAGES: SettingsPage[] = ["language", "translation", "textSize", "quran"];
export const SETTINGS_PAGE_TITLE: Record<SettingsPage, string> = {
  language: "App language",
  translation: "Translation",
  textSize: "Text size",
  quran: "Quran script",
};

const ROW =
  "flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left hover:bg-white/10 transition-colors cursor-pointer active:scale-[0.99]";
const GROUP = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";
const SCROLL = "no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-2.5 text-sand-100";

function Row({ label, value, onClick, valueLang }: { label: string; value?: string; onClick: () => void; valueLang?: string }) {
  return (
    <button type="button" onClick={onClick} className={ROW}>
      <span className="text-sm font-semibold text-white">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-sm text-sand-200/80">
        {value && (
          <span lang={valueLang} dir={valueLang === "ur" ? "rtl" : undefined} className="truncate">
            {value}
          </span>
        )}
        <ChevronRightIcon className="h-4 w-4 shrink-0" />
      </span>
    </button>
  );
}

function Switch({ on, label, sub, onToggle, disabled }: { on: boolean; label: string; sub?: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      className={cn("flex w-full items-center justify-between gap-3 py-1 text-left", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-white">{label}</span>
        {sub && <span className="text-[11px] text-sand-200/70">{sub}</span>}
      </span>
      <span aria-hidden="true" className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-amber-400/90" : "bg-white/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

// The place shown in the time pill (TimeLocationWidget saves it).
function savedPlace(): string {
  try {
    const p = JSON.parse(localStorage.getItem("huda-place") ?? "null") as { city?: string } | null;
    return p?.city ?? "";
  } catch {
    return "";
  }
}

/** Settings: one row per preference. */
export function SettingsList({ onOpen, onLeave }: { onOpen: (page: SettingsPage) => void; onLeave: (event: string) => void }) {
  const lang = useUiLang();
  const s = useHomeSettings();
  const ui = UI_LANGS.find((l) => l.id === lang);
  const [place, setPlace] = useState("");
  useEffect(() => setPlace(savedPlace()), []);
  const tajweedOn = Boolean(s?.showTajweed && s.script !== "indopak");
  const scriptLabel = s ? t(lang, SCRIPT_CHOICES.find((c) => c.id === s.script)?.label ?? "Uthmani") : "";
  return (
    <div className={SCROLL}>
      <Row label={t(lang, "App language")} value={ui?.label} valueLang={ui?.id} onClick={() => onOpen("language")} />
      {s && (
        <>
          <Row
            label={t(lang, "Translation")}
            value={s.showMeaning ? translationInfo(s.translationLang).label : t(lang, "Off")}
            valueLang={s.showMeaning ? s.translationLang : undefined}
            onClick={() => onOpen("translation")}
          />
          <Row label={t(lang, "Text size")} value={`${Math.round(s.textSize.value * 100)}%`} onClick={() => onOpen("textSize")} />
          <Row
            label={t(lang, "Quran script")}
            value={`${scriptLabel}${tajweedOn ? ` · ${t(lang, "Tajweed")}` : ""}`}
            onClick={() => onOpen("quran")}
          />
          <Row label={t(lang, "Reciter")} value={s.reciterName} onClick={() => onLeave(OPEN_RECITERS_EVENT)} />
          <Row
            label={t(lang, "Prayer times & location")}
            value={place}
            onClick={() => onLeave(OPEN_PRAYER_TIMES_EVENT)}
          />
          <div className={GROUP}>
            <p className="mb-2 text-sm font-semibold text-white">{t(lang, "Background")}</p>
            <div role="radiogroup" aria-label={t(lang, "Background")} className={TAB_TRACK}>
              {(["video", "image"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={s.visualMode === m}
                  onClick={() => s.visualMode !== m && s.onToggleVisualMode()}
                  className={cn(TAB, s.visualMode === m ? SELECTED_TAB : UNSELECTED_TAB)}
                >
                  {t(lang, m === "video" ? "Video" : "Image")}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Settings › Translation: on / off, and the ayah-meaning language. */
export function TranslationPage() {
  const lang = useUiLang();
  const s = useHomeSettings();
  if (!s) return null;
  // Picking a language shows the meaning in it (as the header's sheet does).
  const choose = (id: TranslationLang) => {
    if (s.translationLang !== id) s.onChooseTranslation(id);
    if (!s.showMeaning) s.onToggleMeaning();
  };
  return (
    <div className={SCROLL}>
      <div className={GROUP}>
        <Switch on={s.showMeaning} label={t(lang, "Show translation")} onToggle={s.onToggleMeaning} />
      </div>
      <div role="radiogroup" aria-label={t(lang, "Translation language")} className="space-y-1.5">
        {TRANSLATIONS.map((c) => {
          const selected = c.id === s.translationLang;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(c.id)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors",
                selected
                  ? s.showMeaning
                    ? SELECTED
                    : "bg-white/[0.04] border-dashed border-white/25 text-sand-100/70"
                  : "bg-white/[0.04] border-white/5 text-sand-100 hover:bg-white/[0.08] hover:border-white/15",
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                {/* A circle with the language's own first letter. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-base font-bold text-sand-50",
                    c.id === "ta" && "font-tamil",
                  )}
                  style={c.font && c.id !== "ta" ? { fontFamily: c.font } : undefined}
                >
                  {[...c.label][0]}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn("truncate text-sm font-bold", c.id === "ta" && "font-tamil")} style={c.font && c.id !== "ta" ? { fontFamily: c.font } : undefined}>
                    {c.label}
                  </span>
                  <span className="truncate text-xs text-sand-200/60">{c.hint}</span>
                </span>
              </span>
              {selected && (
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full", s.showMeaning ? SELECTED_BADGE : "border border-white/25 text-sand-300/60")}>
                  <CheckIcon className="text-sm" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Settings › Text size: the reading mode's text, A− … A+. */
export function TextSizePage() {
  const lang = useUiLang();
  const s = useHomeSettings();
  if (!s) return null;
  const { value, onChange, initial } = s.textSize;
  const i = Math.max(0, READER_SCALES.indexOf(value));
  const step = (d: number) => {
    const next = READER_SCALES[Math.min(READER_SCALES.length - 1, Math.max(0, i + d))];
    if (next !== value) onChange(next);
  };
  const btn =
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 font-semibold text-white transition-all active:scale-90 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none";
  return (
    <div className={SCROLL}>
      <div className={GROUP}>
        <p className="mb-3 text-[11px] text-sand-200/70">{t(lang, "For the whole Surah in reading mode.")}</p>
        <div className="flex items-center gap-3">
          <button type="button" className={`${btn} text-sm`} onClick={() => step(-1)} disabled={i === 0} aria-label={t(lang, "Smaller text")}>
            A−
          </button>
          <div className="flex flex-1 items-center justify-between gap-1" role="radiogroup" aria-label={t(lang, "Text size")}>
            {READER_SCALES.map((v, k) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={k === i}
                aria-label={`${Math.round(v * 100)}%`}
                onClick={() => onChange(v)}
                className="flex h-8 flex-1 items-center justify-center"
              >
                <span className={cn("block rounded-full transition-all", k === i ? "h-3 w-3 bg-amber-300" : k < i ? "h-2 w-2 bg-white/70" : "h-2 w-2 bg-white/25")} />
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`${btn} text-lg`}
            onClick={() => step(1)}
            disabled={i === READER_SCALES.length - 1}
            aria-label={t(lang, "Larger text")}
          >
            A+
          </button>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-sand-200/70">
          <span className="tabular-nums">{Math.round(value * 100)}%</span>
          {value !== initial && (
            <button type="button" onClick={() => onChange(initial)} className="font-semibold text-amber-300 hover:text-amber-200">
              {t(lang, "Reset")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Settings › Quran script: Uthmani / IndoPak and the Tajweed colours. */
export function QuranTextPage() {
  const lang = useUiLang();
  const s = useHomeSettings();
  if (!s) return null;
  const indoPak = s.script === "indopak";
  return (
    <div className={SCROLL}>
      {s.onChooseScript && (
        <div className={GROUP}>
          <p className="mb-2 text-sm font-semibold text-white">{t(lang, "Script")}</p>
          <div role="radiogroup" aria-label={t(lang, "Quran script")} className={TAB_TRACK}>
            {SCRIPT_CHOICES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={s.script === c.id}
                onClick={() => s.onChooseScript?.(c.id)}
                className={cn(TAB, s.script === c.id ? SELECTED_TAB : UNSELECTED_TAB)}
              >
                {t(lang, c.label)}
              </button>
            ))}
          </div>
          {/* IndoPak: a key to the waqf (stop) signs in the text. */}
          {indoPak && <WaqfLegend lang={lang} />}
        </div>
      )}
      {/* Tajweed colours exist for the Uthmani script only: no switch in IndoPak */}
      {!indoPak && (
        <div className={GROUP}>
          <Switch on={s.showTajweed} label={t(lang, "Tajweed colours")} onToggle={s.onToggleTajweed} />
        </div>
      )}
    </div>
  );
}
