"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  isSurahTrackId,
  isQuranTrackId,
  type QuranReciter,
  getDefaultReciter,
} from "@/lib/data/service";
import {
  YouTubeMusicIcon,
  ImamQuranIcon,
  VideoCameraIcon,
  ImageIcon,
} from "@/components/ui/Icon";
import { TimeLocationWidget } from "@/components/navigation/TimeLocationWidget";
import { youtubeMusicPlaylistUrl, youtubeMusicUrl } from "@/lib/youtube";
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
  children,
}: ImmersiveHeaderProps) {
  const player = useAudioPlayer();
  const bayan = player.current;
  const [isReciterSelectorOpen, setIsReciterSelectorOpen] = useState(false);
  const [headerAvatarError, setHeaderAvatarError] = useState(false);

  useEffect(() => {
    setHeaderAvatarError(false);
  }, [selectedReciter.id]);

  const targetYtMusicUrl = bayan?.youtubePlaylistId
    ? youtubeMusicPlaylistUrl(bayan.youtubePlaylistId)
    : bayan?.youtubeVideoId
    ? youtubeMusicUrl(bayan.youtubeVideoId)
    : "https://music.youtube.com/playlist?list=PLFRt54vRoHJs";

  const isPlayingQuran =
    (isQuranActive || (bayan ? isSurahTrackId(bayan.id) : false)) && player.isPlaying;

  const handleToggleReciterSelector = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsReciterSelectorOpen((prev) => !prev);
  };

  return (
    <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between w-full max-w-[100vw] px-2 sm:px-8 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 pointer-events-none box-border">
      {/* Top Left Time & Location */}
      <TimeLocationWidget />

      {/* Top Right Header Controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* YouTube Music Connection Button */}
        <a
          href={targetYtMusicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
          title="Open in YouTube Music"
          aria-label="Open in YouTube Music"
        >
          <YouTubeMusicIcon className="text-lg sm:text-2xl" />
        </a>

        {/* Quran Voice / Reciter Selector Control (Immediately next to YouTube Music) */}
        <div className="relative">
          <button
            type="button"
            onClick={handleToggleReciterSelector}
            className={`pointer-events-auto relative grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer overflow-hidden ${
              isPlayingQuran ? "ring-2 ring-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : ""
            }`}
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

            {isPlayingQuran && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
            )}
          </button>

          {/* Compact Glassmorphism Reciter Selection Popover */}
          <ReciterPickerModal
            isOpen={isReciterSelectorOpen}
            onClose={() => setIsReciterSelectorOpen(false)}
            selectedReciter={selectedReciter}
            onSelectReciter={(reciter) => {
              onSelectReciter?.(reciter);
            }}
            isPlayingQuran={isPlayingQuran}
          />
        </div>

        {/* Language Switcher (Next to YouTube Music) */}
        {onToggleLanguage && (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="pointer-events-auto flex items-center justify-center h-9 px-2 sm:h-11 sm:px-3.5 shrink-0 rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-xs sm:text-sm font-semibold tracking-wide transition-all active:scale-90 cursor-pointer text-amber-300 hover:text-white hover:bg-black/20 hover:border-white/30"
            title={
              language === "ta"
                ? "தற்போது: தமிழ் (Click to switch to English)"
                : "Current: English (தமிழ் மொழிபெயர்ப்புக்கு மாற்றவும்)"
            }
            aria-label="Toggle Quran translation language between English and Tamil"
          >
            <span>{language === "ta" ? "தமிழ்" : "EN"}</span>
          </button>
        )}

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
              <VideoCameraIcon className="text-base sm:text-xl text-emerald-400" />
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
