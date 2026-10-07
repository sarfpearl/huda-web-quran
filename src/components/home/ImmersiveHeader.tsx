"use client";

import { useState, useEffect, useRef, isValidElement, cloneElement, type ReactElement } from "react";
import Image from "next/image";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  isSurahTrackId,
  isQuranTrackId,
  type QuranReciter,
  getDefaultReciter,
  reciterHasWordTiming,
  reciterHasWordTimingFor,
} from "@/lib/data/service";
import {
  ImamQuranIcon,
  VideoCameraIcon,
  ImageIcon,
  TranslateIcon,
} from "@/components/ui/Icon";
import { TimeLocationWidget } from "@/components/navigation/TimeLocationWidget";
import { HoverTooltips } from "@/components/player/HoverTooltips";
import { TRANSLATIONS, translationInfo, type TranslationLang } from "@/lib/data/translations";
import { ReciterPickerModal } from "./ReciterPickerModal";
import { TAJWEED_LEGEND } from "@/lib/data/quranGlyphs";

/** How long the Tajweed panel stays open untouched before hiding itself. */
const TAJWEED_AUTO_HIDE_MS = 4000;
import { ActionSheet } from "@/components/ui/ActionSheet";
import { CheckIcon } from "@/components/ui/Icon";
import { SELECTED, SELECTED_BADGE, SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import type { QuranScript } from "@/lib/data/quranGlyphs";

/** Reading mode's text sizes, × the base size. */
export const READER_SCALES = [0.8, 0.9, 1, 1.15, 1.25, 1.4, 1.6, 1.8];

/** The starting size: 125% on a phone / tablet (owner), 100% on a desktop. */
export function defaultReaderScale(): number {
  if (typeof window === "undefined") return 1;
  return window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches ? 1.25 : 1;
}

interface ImmersiveHeaderProps {
  visualMode?: "video" | "image";
  onToggleVisualMode?: () => void;
  language?: "en" | "ta";
  /** The ayah-meaning language and its picker (Off is `showMeaning`). */
  translationLang?: TranslationLang;
  onChooseTranslation?: (lang: TranslationLang) => void;
  /** Ayah meaning (translation) visibility + toggle */
  showMeaning?: boolean;
  onToggleMeaning?: () => void;
  /** Reading mode's text size (× base) + setter + the device's default (Reset); shows the Aa control. */
  textSize?: { value: number; onChange: (v: number) => void; initial: number };
  /** Tajweed colouring of the verse text + toggle */
  showTajweed?: boolean;
  onToggleTajweed?: () => void;
  /** Mushaf script and its picker (shown in the Tajweed panel when enabled). */
  script?: QuranScript;
  onChooseScript?: (script: QuranScript) => void;
  selectedReciter?: QuranReciter;
  onSelectReciter?: (reciter: QuranReciter) => void;
  isQuranActive?: boolean;
  /** Whether currently playing a 30 Juz track */
  isJuz?: boolean;
  /** Optional leading control rendered before the language toggle (e.g. QA HUD). */
  qaHud?: React.ReactNode;
  /** Control rendered right after the image/video toggle (Comments). */
  afterVisualToggle?: React.ReactNode;
  children?: React.ReactNode;
}

export function ImmersiveHeader({
  visualMode = "video",
  onToggleVisualMode,
  language = "en",
  translationLang = language,
  onChooseTranslation,
  showMeaning = true,
  onToggleMeaning,
  textSize,
  showTajweed = false,
  onToggleTajweed,
  script = "uthmani",
  onChooseScript,
  selectedReciter = getDefaultReciter(),
  onSelectReciter,
  isQuranActive = true,
  isJuz = false,
  qaHud,
  afterVisualToggle,
  children,
}: ImmersiveHeaderProps) {
  const player = useAudioPlayer();
  const bayan = player.current;
  // Only one header popover open at a time.
  const [activePopover, setActivePopover] = useState<"reciter" | "qa" | "tajweed" | null>(null);
  // The Tajweed panel closes on any press outside it, or Escape.
  const tajweedRef = useRef<HTMLDivElement>(null);
  // Hover tooltips under the round header buttons (those with data-tooltip).
  const controlsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activePopover !== "tajweed") return;
    const onDown = (ev: PointerEvent) => {
      if (!tajweedRef.current?.contains(ev.target as Node)) setActivePopover(null);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && setActivePopover(null);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [activePopover]);
  // It also hides itself a few seconds after opening — held while the pointer
  // is over it or a keyboard user is inside it; flipping the switch restarts the clock.
  const [tajweedHeld, setTajweedHeld] = useState(false);
  useEffect(() => {
    if (activePopover !== "tajweed" || tajweedHeld) return;
    const t = window.setTimeout(() => setActivePopover(null), TAJWEED_AUTO_HIDE_MS);
    return () => window.clearTimeout(t);
  }, [activePopover, tajweedHeld, showTajweed]);
  const isReciterSelectorOpen = activePopover === "reciter";
  const [translationSheetOpen, setTranslationSheetOpen] = useState(false);
  // The sheet's language search; cleared whenever the sheet closes.
  const [langQuery, setLangQuery] = useState("");
  useEffect(() => {
    if (!translationSheetOpen) setLangQuery("");
  }, [translationSheetOpen]);
  const q = langQuery.trim().toLowerCase();
  const langChoices = q ? TRANSLATIONS.filter((c) => `${c.label} ${c.hint}`.toLowerCase().includes(q)) : TRANSLATIONS;
  const [textSizeSheetOpen, setTextSizeSheetOpen] = useState(false);
  // Picking a language shows the meaning in it (the title bar switch turns it off).
  const chooseTranslation = (id: TranslationLang) => {
    if (translationLang !== id) onChooseTranslation?.(id);
    if (!showMeaning) onToggleMeaning?.();
  };

  const current = translationInfo(translationLang);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);
  const reciterTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHeaderAvatarError(false);
  }, [selectedReciter.id]);

  const isPlayingQuran =
    (isQuranActive || (bayan ? isSurahTrackId(bayan.id) : false)) && player.isPlaying;

  // Translation language toggle is meaningful for Word Sync reciters whenever
  // verse text is on screen — that's every Surah, and now also a Juz played
  // per-ayah in a Word Sync reciter's voice (player.ayahSequence is set then).
  // A Surah whose streamed recording doesn't match the reciter's timings plays
  // audio-only (no verse text), so no toggle there either.
  const surahOnAir = bayan && isSurahTrackId(bayan.id) ? Number(bayan.id.replace(/\D+/g, "")) : null;
  const showLanguageToggle = isJuz
    ? reciterHasWordTiming(selectedReciter) && Boolean(player.ayahSequence)
    : reciterHasWordTimingFor(selectedReciter, surahOnAir);

  const handleToggleReciterSelector = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActivePopover((prev) => (prev === "reciter" ? null : "reciter"));
  };

  // Inject controlled open state into the QA HUD so it closes when another
  // header popover (reciter) opens, and vice versa.
  const qaHudControlled =
    qaHud && isValidElement(qaHud)
      ? cloneElement(qaHud as ReactElement<{ open?: boolean; onOpenChange?: (v: boolean) => void }>, {
          open: activePopover === "qa",
          onOpenChange: (v: boolean) => setActivePopover(v ? "qa" : null),
        })
      : qaHud;

  return (
    <header data-scene-header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between gap-1 min-[360px]:gap-1.5 w-full max-w-[100vw] px-2 sm:px-8 pt-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+var(--header-gap,1rem))] pb-4 pointer-events-none box-border">
      {/* Top Left Time & Location */}
      <TimeLocationWidget />

      {/* Top Right Header Controls */}
      <div ref={controlsRef} className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 shrink-0">
        <HoverTooltips container={controlsRef} placement="bottom" selector="[data-tooltip]" />
        {/* QA HUD pill (leading, before the language toggle) */}
        {qaHudControlled}

        {/* Ayah translation: opens a sheet to pick Off or a language
            (only when verse text is on screen) */}
        {onToggleMeaning && showLanguageToggle && (
          <button
            type="button"
            onClick={() => setTranslationSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label={
              showMeaning
                ? `Translation: ${current.hint.split(" · ")[0]} — change`
                : "Translation: off — choose a language"
            }
            data-tooltip={language === "ta" ? "மொழிபெயர்ப்பு" : "Translation"}
            className={`tap-44 pointer-events-auto flex items-center gap-1 justify-center h-9 min-[360px]:h-10 min-[400px]:h-11 sm:h-12 px-2.5 min-[400px]:px-3 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer hover:text-white hover:bg-black/20 hover:border-white/30 ${
              showMeaning ? "text-amber-300" : "text-white/60"
            }`}
          >
            {/* Translate icon; dimmed (not slashed) when the translation is hidden */}
            <TranslateIcon className="h-5 w-5" />
            <span
              className={`hidden sm:inline text-[10px] sm:text-xs ${showMeaning && current.id === "ta" ? "font-tamil" : ""}`}
              style={showMeaning && current.font && current.id !== "ta" ? { fontFamily: current.font } : undefined}
            >
              {!showMeaning ? "Translation" : current.label}
            </span>
          </button>
        )}
        <ActionSheet
          open={translationSheetOpen}
          onClose={() => setTranslationSheetOpen(false)}
          label="Choose the translation language"
        >
          {/* Laid out like the reciter picker: title bar, search, list of cards */}
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white">Translation</h3>
              <p className="mt-0.5 text-[11px] leading-none text-sand-300/70">Choose the meaning language</p>
            </div>
            <div className="flex items-center gap-2.5">
            {/* On / Off (Off = Arabic only); picking a language turns it on */}
            <button
              type="button"
              role="switch"
              aria-checked={showMeaning}
              aria-label={showMeaning ? "Translation on — turn off (Arabic only)" : "Translation off — turn on"}
              onClick={() => onToggleMeaning?.()}
              className="tap-44 flex items-center gap-2 rounded-full py-1 pl-2.5 pr-1 text-[11px] font-medium text-sand-200 transition-colors hover:bg-white/5 cursor-pointer"
            >
              {showMeaning ? "On" : "Off"}
              <span
                className={`relative h-5 w-9 rounded-full border transition-colors ${
                  showMeaning ? "border-amber-200/50 bg-amber-300/30" : "border-white/15 bg-white/10"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all ${
                    showMeaning ? "left-[18px] bg-amber-200" : "left-[2px] bg-sand-300"
                  }`}
                />
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTranslationSheetOpen(false)}
              aria-label="Close translation languages"
              className="tap-44 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 transition-all hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            </div>
          </div>
          <div className="relative mb-3">
            <input
              type="text"
              value={langQuery}
              onChange={(e) => setLangQuery(e.target.value)}
              placeholder="Search languages..."
              aria-label="Search languages"
              className="w-full rounded-full bg-black/40 border border-white/10 px-3 py-2 pl-9 text-xs text-white placeholder:text-sand-300/40 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            />
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sand-300/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="min-h-0 space-y-1.5 overflow-y-auto no-scrollbar" role="radiogroup" aria-label="Translation language">
            {langChoices.length === 0 && (
              <p className="py-6 text-center text-xs text-sand-300/60">No language found for “{langQuery.trim()}”</p>
            )}
            {langChoices.map((c) => {
              // The language stays marked while off, so it's clear which one turns on.
              const selected = translationLang === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    chooseTranslation(c.id);
                    setTranslationSheetOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                    selected ? SELECTED : "bg-white/[0.04] border-white/5 text-sand-100 hover:bg-white/[0.08] hover:border-white/15"
                  }`}
                >
                  <span className="flex flex-col">
                    <span
                      className={`text-sm font-bold ${c.id === "ta" ? "font-tamil" : ""}`}
                      style={c.font && c.id !== "ta" ? { fontFamily: c.font } : undefined}
                    >
                      {c.label}
                    </span>
                    <span className={`text-xs ${selected ? "text-sand-100/75" : "text-sand-200/60"}`}>{c.hint}</span>
                  </span>
                  {selected && (
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${SELECTED_BADGE}`}>
                      <CheckIcon className="text-sm" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </ActionSheet>

        {/* Reading mode: text size (A− / A+), in the translation button's place */}
        {textSize && (
          <button
            type="button"
            onClick={() => setTextSizeSheetOpen(true)}
            aria-haspopup="dialog"
            aria-label={`Text size: ${Math.round(textSize.value * 100)}% — change`}
            title="Text size"
            className="pointer-events-auto flex items-center justify-center h-9 min-[360px]:h-10 min-[400px]:h-11 sm:h-12 px-3 min-[400px]:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white transition-all active:scale-90 cursor-pointer hover:bg-black/20 hover:border-white/30"
          >
            <span aria-hidden="true" className="font-semibold leading-none">
              <span className="text-[0.8rem]">A</span>
              <span className="text-[1.1rem]">A</span>
            </span>
          </button>
        )}
        {textSize && (
          <ActionSheet open={textSizeSheetOpen} onClose={() => setTextSizeSheetOpen(false)} label="Text size">
            <h3 className="pb-4 text-lg font-black text-white tracking-tight">Text size</h3>
            {(() => {
              const i = Math.max(0, READER_SCALES.indexOf(textSize.value));
              const step = (d: number) => {
                const next = READER_SCALES[Math.min(READER_SCALES.length - 1, Math.max(0, i + d))];
                if (next !== textSize.value) textSize.onChange(next);
              };
              const btn =
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 font-semibold text-white transition-all active:scale-90 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none";
              return (
                <div className="flex items-center gap-3">
                  <button type="button" className={`${btn} text-sm`} onClick={() => step(-1)} disabled={i === 0} aria-label="Smaller text">
                    A−
                  </button>
                  <div className="flex flex-1 items-center justify-between gap-1" role="radiogroup" aria-label="Text size">
                    {READER_SCALES.map((v, k) => (
                      <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={k === i}
                        aria-label={`${Math.round(v * 100)}%`}
                        onClick={() => textSize.onChange(v)}
                        className="flex h-8 flex-1 items-center justify-center"
                      >
                        <span
                          className={`block rounded-full transition-all ${k === i ? "h-3 w-3 bg-amber-300" : k < i ? "h-2 w-2 bg-white/70" : "h-2 w-2 bg-white/25"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${btn} text-lg`}
                    onClick={() => step(1)}
                    disabled={i === READER_SCALES.length - 1}
                    aria-label="Larger text"
                  >
                    A+
                  </button>
                </div>
              );
            })()}
            <div className="mt-4 flex items-center justify-between text-xs text-sand-200/70">
              <span className="tabular-nums">{Math.round(textSize.value * 100)}%</span>
              {textSize.value !== textSize.initial && (
                <button type="button" onClick={() => textSize.onChange(textSize.initial)} className="font-semibold text-amber-300 hover:text-amber-200">
                  Reset
                </button>
              )}
            </div>
          </ActionSheet>
        )}

        {/* Tajweed: opens a panel with the on/off switch and the colour legend
            (only when verse text is on screen). The panel is positioned against
            the header, so it stays on screen on narrow phones. */}
        {onToggleTajweed && showLanguageToggle && (
          <div
            ref={tajweedRef}
            onPointerEnter={(e) => e.pointerType === "mouse" && setTajweedHeld(true)}
            onPointerLeave={() => setTajweedHeld(false)}
            onFocus={(e) => e.target.matches(":focus-visible") && setTajweedHeld(true)}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setTajweedHeld(false)}
          >
            <button
              type="button"
              onClick={() => setActivePopover((prev) => (prev === "tajweed" ? null : "tajweed"))}
              aria-expanded={activePopover === "tajweed"}
              aria-haspopup="dialog"
              aria-label={language === "ta" ? "தஜ்வீத்" : "Tajweed"}
              data-tooltip={language === "ta" ? "தஜ்வீத் வண்ணங்கள்" : "Tajweed colours"}
              className={`tap-44 pointer-events-auto flex items-center gap-1 justify-center h-9 min-[360px]:h-10 min-[400px]:h-11 sm:h-12 px-2.5 min-[400px]:px-3 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer hover:text-white hover:bg-black/20 hover:border-white/30 ${
                showTajweed ? "text-amber-300" : "text-white/60"
              }`}
            >
              <TajweedIcon on={showTajweed} className="h-5 w-5" />
              <span className={`hidden sm:inline text-[10px] sm:text-xs ${language === "ta" ? "font-tamil" : ""}`}>
                {language === "ta" ? "தஜ்வீத்" : "Tajweed"}
              </span>
            </button>
            {activePopover === "tajweed" && (
              <div
                role="dialog"
                aria-label={language === "ta" ? "தஜ்வீத் வண்ணங்கள்" : "Tajweed colours"}
                className="pointer-events-auto absolute right-2 sm:right-8 top-[calc(100%-0.5rem)] z-50 w-[min(18rem,calc(100vw-1rem))] rounded-2xl bg-black/70 backdrop-blur-xl border border-white/15 shadow-2xl p-3 text-sand-50 animate-in fade-in duration-150"
              >
                {/* Mushaf script: Uthmani (Madani) or IndoPak */}
                {onChooseScript && (
                  <div className="mb-2 border-b border-white/10 px-1 pb-3">
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-sand-300/70">Script</p>
                    <div role="radiogroup" aria-label="Quran script" className={TAB_TRACK}>
                      {SCRIPT_CHOICES.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          role="radio"
                          aria-checked={script === c.id}
                          onClick={() => onChooseScript(c.id)}
                          className={`${TAB} ${script === c.id ? SELECTED_TAB : UNSELECTED_TAB}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTajweed && script !== "indopak"}
                  aria-disabled={script === "indopak"}
                  onClick={script === "indopak" ? undefined : onToggleTajweed}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 ${
                    script === "indopak" ? "cursor-not-allowed opacity-50" : "hover:bg-white/5 cursor-pointer"
                  }`}
                >
                  <span className="flex flex-col text-left">
                    <span className={`text-sm font-semibold ${language === "ta" ? "font-tamil" : ""}`}>
                      {language === "ta" ? "தஜ்வீத் வண்ணங்கள்" : "Tajweed colours"}
                    </span>
                    {script === "indopak" && <span className="text-[11px] text-sand-300/70">Uthmani script only</span>}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showTajweed && script !== "indopak" ? "bg-amber-400/90" : "bg-white/20"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${showTajweed && script !== "indopak" ? "left-[1.375rem]" : "left-0.5"}`}
                    />
                  </span>
                </button>
                <ul className={`mt-1 grid gap-1.5 px-2 pb-1 pt-2 border-t border-white/10 ${showTajweed && script !== "indopak" ? "" : "opacity-50"}`}>
                  {TAJWEED_LEGEND.map((r) => (
                    <li key={r.color} className="flex items-center gap-2.5 text-xs text-sand-100/90">
                      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className={language === "ta" ? "font-tamil" : ""}>{language === "ta" ? r.ta : r.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Quran Voice / Reciter Selector Control */}
        <div className="relative">
          <button
            ref={reciterTriggerRef}
            type="button"
            onClick={handleToggleReciterSelector}
            className="pointer-events-auto relative grid h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer overflow-hidden"
            data-tooltip={`Reciter · ${selectedReciter.displayName}`}
            aria-label={`Choose Quran Reciter (Current: ${selectedReciter.displayName})`}
            aria-expanded={isReciterSelectorOpen}
            aria-haspopup="dialog"
          >
            <div className="relative h-full w-full p-0.5 rounded-full overflow-hidden">
              <div className="absolute inset-0 grid place-items-center text-sand-200">
                <ImamQuranIcon className="text-2xl" />
              </div>
              {selectedReciter.photoUrl && !headerAvatarError && (
                <Image
                  key={selectedReciter.id}
                  src={selectedReciter.photoUrl}
                  alt={selectedReciter.name}
                  width={44}
                  height={44}
                  unoptimized={true}
                  className="absolute inset-0 h-full w-full rounded-full object-cover"
                  onError={() => setHeaderAvatarError(true)}
                />
              )}
            </div>
          </button>

          {/* Playing indicator — sibling of the button so the button's
              overflow-hidden (which clips the round avatar) does not clip it. */}
          {isPlayingQuran && (
            <span className="absolute top-0.5 right-0.5 z-10 flex h-2 w-2 pointer-events-none">
              {/* Rippling double ping */}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-60 [animation-delay:0.6s]" />
              {/* Glowing pulsing core with crisp white edge */}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 ring-[1.5px] ring-slate-950/80 shadow-[0_0_8px_2px_rgba(16,185,129,0.95)] animate-pulse" />
            </span>
          )}

          {/* Compact Glassmorphism Reciter Selection Popover */}
          <ReciterPickerModal
            isOpen={isReciterSelectorOpen}
            onClose={() => setActivePopover((prev) => (prev === "reciter" ? null : prev))}
            selectedReciter={selectedReciter}
            onSelectReciter={(reciter) => {
              onSelectReciter?.(reciter);
            }}
            isPlayingQuran={isPlayingQuran}
            isJuz={isJuz}
            triggerRef={reciterTriggerRef}
          />
        </div>

        {/* Video Mode / Image Mode Toggle Button */}
        {onToggleVisualMode && (
          <button
            type="button"
            onClick={onToggleVisualMode}
            className="tap-44 pointer-events-auto grid h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-300 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
            title={
              visualMode === "video"
                ? "Video Mode Active (Click to switch to Image Mode)"
                : "Image Mode Active (Click to switch to Video Mode)"
            }
            aria-label={
              visualMode === "video"
                ? "Switch to Image Mode"
                : "Switch to Video Mode"
            }
          >
            {visualMode === "video" ? (
              <VideoCameraIcon className="h-5 w-5 text-sand-200" />
            ) : (
              <ImageIcon className="h-5 w-5 text-sand-200" />
            )}
          </button>
        )}

        {/* Comments (next to the image/video toggle) */}
        {afterVisualToggle}

        {/* Category Picker Menu (Menu.svg) */}
        {children}
      </div>
    </header>
  );
}

/** Three rule-coloured dots (Tajweed on) or muted outlines (off). */
function TajweedIcon({ on, className }: { on: boolean; className?: string }) {
  const dots: [number, number, string][] = [
    [7, 8, "#ff8e3b"],
    [17, 8, "#3c84d5"],
    [12, 16.5, "#26b55d"],
  ];
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      {dots.map(([cx, cy, c]) => (
        <circle
          key={c}
          cx={cx}
          cy={cy}
          r={3.6}
          fill={on ? c : "none"}
          stroke={on ? "none" : "currentColor"}
          strokeWidth={1.8}
        />
      ))}
    </svg>
  );
}

const SCRIPT_CHOICES: { id: QuranScript; label: string }[] = [
  { id: "uthmani", label: "Uthmani" },
  { id: "indopak", label: "IndoPak" },
];
