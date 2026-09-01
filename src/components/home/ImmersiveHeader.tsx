"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { TimeLocationWidget } from "@/components/navigation/TimeLocationWidget";
import {
  YouTubeMusicIcon,
  VideoCameraIcon,
  ImageIcon,
} from "@/components/ui/Icon";
import {
  youtubeMusicUrl,
  youtubeMusicPlaylistUrl,
  youtubeMusicSearchUrl,
} from "@/lib/youtube";

interface ImmersiveHeaderProps {
  onShuffle?: () => void;
  visualMode?: "video" | "image";
  onToggleVisualMode?: () => void;
  children?: React.ReactNode;
}

export function ImmersiveHeader({
  onShuffle,
  visualMode = "video",
  onToggleVisualMode,
  children,
}: ImmersiveHeaderProps) {
  const player = useAudioPlayer();
  const bayan = player.current;

  const targetYtMusicUrl = bayan?.youtubePlaylistId
    ? youtubeMusicPlaylistUrl(bayan.youtubePlaylistId)
    : bayan?.youtubeVideoId
    ? youtubeMusicUrl(bayan.youtubeVideoId)
    : "https://music.youtube.com/playlist?list=PLFRt54vRoHJs";

  return (
    <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-8 pb-4 pointer-events-none">
      {/* Top Left Time & Location */}
      <TimeLocationWidget />

      {/* Top Right Header Controls */}
      <div className="flex items-center gap-2">
        {/* YouTube Music Connection Button */}
        <a
          href={targetYtMusicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
          title="Open in YouTube Music"
          aria-label="Open in YouTube Music"
        >
          <YouTubeMusicIcon className="text-xl sm:text-2xl" />
        </a>

        {/* Video Mode / Image Mode Toggle Button */}
        {onToggleVisualMode && (
          <button
            type="button"
            onClick={onToggleVisualMode}
            className="pointer-events-auto grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-300 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
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
              <VideoCameraIcon className="text-lg sm:text-xl text-emerald-400" />
            ) : (
              <ImageIcon className="text-lg sm:text-xl text-sand-200" />
            )}
          </button>
        )}

        {/* Category Picker Menu (Menu.svg) */}
        {children}
      </div>
    </header>
  );
}
