"use client";

import { useState, useEffect, isValidElement, cloneElement, type ReactElement } from "react";
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
} from "@/components/ui/Icon";
import { TimeLocationWidget } from "@/components/navigation/TimeLocationWidget";
import { ReciterPickerModal } from "./ReciterPickerModal";

interface ImmersiveHeaderProps {
  onShuffle?: () => void;
  visualMode?: "video" | "image";
  onToggleVisualMode?: () => void;
  language?: "en" | "ta";
  onToggleLanguage?: () => void;
  selectedReciter?: QuranReciter;
  onSelectReciter?: (reciter: QuranReciter) => void;
  isQuranActive?: boolean;
  /** Optional leading control rendered before the language toggle (e.g. QA HUD). */
  qaHud?: React.ReactNode;
  children?: React.ReactNode;
}

export function ImmersiveHeader({
  onShuffle,
  visualMode = "video",
  onToggleVisualMode,
  language = "en",
  onToggleLanguage,
  selectedReciter = getDefaultReciter(),
  onSelectReciter,
  isQuranActive = true,
  qaHud,
  children,
}: ImmersiveHeaderProps) {
  const player = useAudioPlayer();
  const bayan = player.current;
  // Only one header popover open at a time.
  const [activePopover, setActivePopover] = useState<"reciter" | "qa" | null>(null);
  const isReciterSelectorOpen = activePopover === "reciter";
  const [headerAvatarError, setHeaderAvatarError] = useState(false);

  useEffect(() => {
    setHeaderAvatarError(false);
  }, [selectedReciter.id]);

  const isPlayingQuran =
    (isQuranActive || (bayan ? isSurahTrackId(bayan.id) : false)) && player.isPlaying;

  // Translation language toggle is only meaningful for Word Sync reciters, since
  // Audio Only reciters show no verse text / meaning on screen.
  const showLanguageToggle = reciterHasWordTiming(selectedReciter);

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
    <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between w-full max-w-[100vw] px-2 sm:px-8 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 pointer-events-none box-border">
      {/* Top Left Time & Location */}
      <TimeLocationWidget />

      {/* Top Right Header Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* QA HUD pill (leading, before the language toggle) */}
        {qaHudControlled}

        {/* Language Switcher (First — only for Word Sync reciters that show text) */}
        {onToggleLanguage && showLanguageToggle && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="pointer-events-auto flex items-center gap-1 justify-center h-9 px-2.5 sm:h-11 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer text-amber-300 hover:text-white hover:bg-black/20 hover:border-white/30"
            title={
              language === "ta"
                ? "தற்போது: தமிழ் (Click to switch to English)"
                : "Current: English (தமிழ் மொழிபெயர்ப்புக்கு மாற்றவும்)"
            }
            aria-label="Toggle Quran translation language between English and Tamil"
          >
            {/* Globe / translate icon */}
            <svg className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
            </svg>
            <span className={`text-[10px] sm:text-xs ${language === "ta" ? "font-tamil" : ""}`}>{language === "ta" ? "தமிழ்" : "EN"}</span>
          </button>
        )}

        {/* Quran Voice / Reciter Selector Control */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleReciterSelector}
            className="pointer-events-auto relative grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer overflow-hidden"
            title={`Choose Quran Reciter (Current: ${selectedReciter.displayName})`}
            aria-label={`Choose Quran Reciter (Current: ${selectedReciter.displayName})`}
            aria-expanded={isReciterSelectorOpen}
            aria-haspopup="dialog"
          >
            {selectedReciter.photoUrl && !headerAvatarError ? (
              <div className="relative h-full w-full p-0.5 rounded-full overflow-hidden">
                <Image
                  src={selectedReciter.photoUrl}
                  alt={selectedReciter.name}
                  width={44}
                  height={44}
                  unoptimized={true}
                  className="h-full w-full rounded-full object-cover"
                  onError={() => setHeaderAvatarError(true)}
                />
              </div>
            ) : (
              <ImamQuranIcon className="text-lg sm:text-2xl" />
            )}
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
          />
        </div>

        {/* Video Mode / Image Mode Toggle Button */}
        {onToggleVisualMode && (
          <button
            type="button"
            onClick={onToggleVisualMode}
            className="pointer-events-auto grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-300 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
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
              <VideoCameraIcon className="text-base sm:text-xl text-sand-200" />
            ) : (
              <ImageIcon className="text-base sm:text-xl text-sand-200" />
            )}
          </button>
        )}

        {/* Category Picker Menu (Menu.svg) */}
        {children}
      </div>
    </header>
  );
}
