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
} from "@/lib/data/service";
import {
  ImamQuranIcon,
  VideoCameraIcon,
  ImageIcon,
  TranslateIcon,
} from "@/components/ui/Icon";
import { TimeLocationWidget } from "@/components/navigation/TimeLocationWidget";
import { ReciterPickerModal } from "./ReciterPickerModal";
import { TAJWEED_LEGEND } from "@/lib/data/quranGlyphs";

interface ImmersiveHeaderProps {
  onShuffle?: () => void;
  visualMode?: "video" | "image";
  onToggleVisualMode?: () => void;
  language?: "en" | "ta";
  onToggleLanguage?: () => void;
  /** Ayah meaning (translation) visibility + toggle */
  showMeaning?: boolean;
  onToggleMeaning?: () => void;
  /** Tajweed colouring of the verse text + toggle */
  showTajweed?: boolean;
  onToggleTajweed?: () => void;
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
  onShuffle,
  visualMode = "video",
  onToggleVisualMode,
  language = "en",
  onToggleLanguage,
  showMeaning = true,
  onToggleMeaning,
  showTajweed = false,
  onToggleTajweed,
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
  const isReciterSelectorOpen = activePopover === "reciter";
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
  const showLanguageToggle =
    reciterHasWordTiming(selectedReciter) && (!isJuz || Boolean(player.ayahSequence));

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
    <header data-scene-header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between gap-1.5 w-full max-w-[100vw] px-2 sm:px-8 pt-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+var(--header-gap,1rem))] pb-4 pointer-events-none box-border">
      {/* Top Left Time & Location */}
      <TimeLocationWidget />

      {/* Top Right Header Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* QA HUD pill (leading, before the language toggle) */}
        {qaHudControlled}

        {/* Language Switcher (First — only for Word Sync reciters that show text) */}
        {/* Hidden while the translation is off — there's nothing to switch */}
        {onToggleLanguage && showLanguageToggle && showMeaning && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="pointer-events-auto flex items-center gap-1 justify-center h-10 min-[400px]:h-11 sm:h-12 px-2.5 min-[400px]:px-3 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer text-amber-300 hover:text-white hover:bg-black/20 hover:border-white/30"
            title={
              language === "ta"
                ? "தற்போது: தமிழ் (Click to switch to English)"
                : "Current: English (தமிழ் மொழிபெயர்ப்புக்கு மாற்றவும்)"
            }
            aria-label="Toggle Quran translation language between English and Tamil"
          >
            {/* Globe / translate icon */}
            <svg className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
            </svg>
            <span className={`text-[10px] sm:text-xs ${language === "ta" ? "font-tamil" : ""}`}>{language === "ta" ? "தமிழ்" : "EN"}</span>
          </button>
        )}

        {/* Ayah translation show/hide (only when verse text is on screen) */}
        {onToggleMeaning && showLanguageToggle && (
          <button
            type="button"
            onClick={onToggleMeaning}
            aria-pressed={showMeaning}
            aria-label={showMeaning ? "Hide translation" : "Show translation"}
            title={
              language === "ta"
                ? showMeaning ? "மொழிபெயர்ப்பை மறை" : "மொழிபெயர்ப்பைக் காட்டு"
                : showMeaning ? "Hide translation of the meaning" : "Show translation of the meaning"
            }
            className={`pointer-events-auto flex items-center gap-1 justify-center h-10 min-[400px]:h-11 sm:h-12 px-2.5 min-[400px]:px-3 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer hover:text-white hover:bg-black/20 hover:border-white/30 ${
              showMeaning ? "text-amber-300" : "text-white/60"
            }`}
          >
            {/* Translate icon; slashed when the translation is hidden */}
            <TranslateIcon slashed={!showMeaning} className="h-[1.15rem] w-[1.15rem]" />
            <span className={`hidden sm:inline text-[10px] sm:text-xs ${language === "ta" ? "font-tamil" : ""}`}>
              {language === "ta" ? "மொழிபெயர்ப்பு" : "Translation"}
            </span>
          </button>
        )}

        {/* Tajweed: opens a panel with the on/off switch and the colour legend
            (only when verse text is on screen). The panel is positioned against
            the header, so it stays on screen on narrow phones. */}
        {onToggleTajweed && showLanguageToggle && (
          <div ref={tajweedRef}>
            <button
              type="button"
              onClick={() => setActivePopover((prev) => (prev === "tajweed" ? null : "tajweed"))}
              aria-expanded={activePopover === "tajweed"}
              aria-haspopup="dialog"
              aria-label={language === "ta" ? "தஜ்வீத்" : "Tajweed"}
              title={language === "ta" ? "தஜ்வீத் வண்ணங்கள்" : "Tajweed colours"}
              className={`pointer-events-auto flex items-center gap-1 justify-center h-10 min-[400px]:h-11 sm:h-12 px-2.5 min-[400px]:px-3 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer hover:text-white hover:bg-black/20 hover:border-white/30 ${
                showTajweed ? "text-amber-300" : "text-white/60"
              }`}
            >
              <TajweedIcon on={showTajweed} className="h-[1.15rem] w-[1.15rem]" />
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
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTajweed}
                  onClick={onToggleTajweed}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-white/5 cursor-pointer"
                >
                  <span className={`text-sm font-semibold ${language === "ta" ? "font-tamil" : ""}`}>
                    {language === "ta" ? "தஜ்வீத் வண்ணங்கள்" : "Tajweed colours"}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showTajweed ? "bg-amber-400/90" : "bg-white/20"}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${showTajweed ? "left-[1.375rem]" : "left-0.5"}`}
                    />
                  </span>
                </button>
                <ul className={`mt-1 grid gap-1.5 px-2 pb-1 pt-2 border-t border-white/10 ${showTajweed ? "" : "opacity-50"}`}>
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
            className="pointer-events-auto relative grid h-10 w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer overflow-hidden"
            title={`Choose Quran Reciter (Current: ${selectedReciter.displayName})`}
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
            className="pointer-events-auto grid h-10 w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-300 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
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
              <VideoCameraIcon className="text-xl text-sand-200" />
            ) : (
              <ImageIcon className="text-xl text-sand-200" />
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
