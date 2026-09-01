"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  PLAYBACK_RATES,
  useAudioPlayer,
} from "@/contexts/AudioPlayerContext";
import { PlayerProgress } from "./PlayerProgress";
import { QueuePanel } from "./QueuePanel";
import { CoverArt } from "@/components/ui/CoverArt";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  VolumeIcon,
  MuteIcon,
  QueueIcon,
  ChevronDownIcon,
  YouTubeIcon,
} from "@/components/ui/Icon";
import { youtubeWatchUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { quranPlayerSubtitle } from "@/lib/data/service";

/*
 * The single, persistent player UI. Mounted once in the root layout (below
 * the AudioPlayerProvider) so it never unmounts on navigation. Renders a
 * compact bar on mobile (above the bottom nav) and a full transport bar on
 * desktop, plus an expandable full-screen sheet on mobile and a queue panel.
 */

export function GlobalAudioPlayer() {
  const player = useAudioPlayer();
  const { current, isExpanded, setExpanded } = player;
  const [queueOpen, setQueueOpen] = useState(false);

  // Reserve page space so content / bottom-nav never overlap the player.
  useEffect(() => {
    function apply() {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const navH = desktop ? 0 : 56;
      const playerH = current ? (desktop ? 84 : 68) : 0;
      document.documentElement.style.setProperty(
        "--player-offset",
        `${navH + playerH}px`
      );
    }
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [current]);

  if (!current) return null;

  const isYouTube = current.audioSource === "youtube";
  const quranSubtitle = quranPlayerSubtitle(current.id);
  const isQuran = Boolean(quranSubtitle);
  const subtitleText = quranSubtitle ?? current.speaker.name;

  const Cover = ({ size }: { size: string }) => (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg", size)}>
      {current.coverImageUrl ? (
        <Image src={current.coverImageUrl} alt="" fill className="object-cover" />
      ) : (
        <CoverArt
          seed={current.slug}
          icon={current.category.icon}
          rounded="rounded-lg"
          className="h-full w-full"
        />
      )}
    </div>
  );

  const TransportButton = () =>
    isYouTube ? (
      <Link
        href={youtubeWatchUrl(current.youtubeVideoId ?? "")}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
      >
        <YouTubeIcon className="text-lg" /> YouTube
      </Link>
    ) : (
      <button
        type="button"
        onClick={player.togglePlay}
        className="grid h-12 w-12 place-items-center rounded-full bg-primary-700 text-xl text-sand-50 shadow-soft transition-transform active:scale-95 hover:bg-primary-600"
        aria-label={player.isPlaying ? "Pause" : "Play"}
      >
        {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
    );

  return (
    <>
      {/* ── Compact bar (fixed, above bottom nav on mobile) ── */}
      <div
        className="fixed inset-x-0 z-40 px-2 md:px-0"
        style={{ bottom: "var(--nav-height, 0px)" }}
      >
        <div className="mx-auto max-w-6xl md:px-0">
          <div className="mx-1 mb-1 overflow-hidden rounded-2xl border surface shadow-player md:mx-0 md:mb-0 md:rounded-none md:border-x-0 md:border-b-0">
            {/* thin progress line on mobile compact */}
            <div className="md:hidden">
              <div className="h-1 w-full bg-[rgb(var(--border))]">
                <div
                  className="h-full bg-primary-600"
                  style={{
                    width: `${
                      (player.currentTime /
                        (player.duration || current.durationSeconds || 1)) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 md:px-4 md:py-2.5">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left md:flex-none md:w-64"
                aria-label="Expand player"
              >
                <Cover size="h-11 w-11 md:h-12 md:w-12" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {current.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {subtitleText}
                  </span>
                </span>
              </button>

              {/* Desktop transport + progress */}
              <div className="hidden flex-1 items-center gap-3 md:flex">
                {!isYouTube ? (
                  <button
                    type="button"
                    onClick={player.previous}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary-700"
                    aria-label="Previous"
                  >
                    <PrevIcon className="text-lg" />
                  </button>
                ) : null}
                <TransportButton />
                {!isYouTube ? (
                  <button
                    type="button"
                    onClick={player.next}
                    className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary-700"
                    aria-label="Next"
                  >
                    <NextIcon className="text-lg" />
                  </button>
                ) : null}
                {!isYouTube ? (
                  <PlayerProgress className="flex-1" />
                ) : (
                  <span className="flex-1 text-sm text-muted">
                    This Bayan plays on YouTube.
                  </span>
                )}
              </div>

              {/* Desktop right controls */}
              <div className="hidden items-center gap-1 md:flex">
                {!isYouTube ? <SpeedMenu /> : null}
                {!isYouTube ? <VolumeControl /> : null}
                <button
                  type="button"
                  onClick={() => setQueueOpen(true)}
                  className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary-700"
                  aria-label="Open queue"
                >
                  <QueueIcon className="text-lg" />
                </button>
              </div>

              {/* Mobile transport (compact) */}
              <div className="flex items-center md:hidden">
                <TransportButton />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded mobile sheet ── */}
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex flex-col surface md:hidden"
            role="dialog"
            aria-label="Now playing"
          >
            <div className="flex items-center justify-between p-4">
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="grid h-10 w-10 place-items-center rounded-full surface-muted"
                aria-label="Minimise player"
              >
                <ChevronDownIcon className="text-xl" />
              </button>
              <span className="text-xs font-semibold uppercase tracking-widest text-muted">
                Now Playing
              </span>
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setQueueOpen(true);
                }}
                className="grid h-10 w-10 place-items-center rounded-full surface-muted"
                aria-label="Open queue"
              >
                <QueueIcon className="text-xl" />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-6 px-6 pb-8">
              <div className="mx-auto aspect-square w-full max-w-xs">
                {current.coverImageUrl ? (
                  <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-soft-lg">
                    <Image src={current.coverImageUrl} alt="" fill className="object-cover" />
                  </div>
                ) : (
                  <CoverArt
                    seed={current.slug}
                    icon={current.category.icon}
                    rounded="rounded-3xl"
                    className="h-full w-full shadow-soft-lg"
                  />
                )}
              </div>

              <div className="text-center">
                {isQuran ? (
                  <>
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                      Quran
                    </span>
                    <h2 className="mt-1 text-xl font-bold">{current.title}</h2>
                    <span className="text-sm text-muted">
                      {quranSubtitle}
                    </span>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/category/${current.category.slug}`}
                      onClick={() => setExpanded(false)}
                      className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300"
                    >
                      {current.category.name}
                    </Link>
                    <h2 className="mt-1 text-xl font-bold">{current.title}</h2>
                    <Link
                      href={`/speaker/${current.speaker.slug}`}
                      onClick={() => setExpanded(false)}
                      className="text-sm text-muted"
                    >
                      {current.speaker.name}
                    </Link>
                  </>
                )}
              </div>

              {isYouTube ? (
                <div className="text-center">
                  <Link
                    href={youtubeWatchUrl(current.youtubeVideoId ?? "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 font-semibold text-white"
                  >
                    <YouTubeIcon className="text-xl" /> Watch on YouTube
                  </Link>
                </div>
              ) : (
                <>
                  <PlayerProgress />
                  <div className="flex items-center justify-center gap-6">
                    <button
                      type="button"
                      onClick={player.previous}
                      className="grid h-12 w-12 place-items-center rounded-full text-2xl text-muted"
                      aria-label="Previous"
                    >
                      <PrevIcon />
                    </button>
                    <button
                      type="button"
                      onClick={player.togglePlay}
                      className="grid h-16 w-16 place-items-center rounded-full bg-primary-700 text-3xl text-sand-50 shadow-soft-lg active:scale-95"
                      aria-label={player.isPlaying ? "Pause" : "Play"}
                    >
                      {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button
                      type="button"
                      onClick={player.next}
                      className="grid h-12 w-12 place-items-center rounded-full text-2xl text-muted"
                      aria-label="Next"
                    >
                      <NextIcon />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <SpeedMenu />
                    <VolumeControl wide />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Queue slide-over ── */}
      <AnimatePresence>
        {queueOpen ? (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQueueOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm surface shadow-soft-lg"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            >
              <QueuePanel onClose={() => setQueueOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// ── Speed menu ───────────────────────────────────────────────────────────
function SpeedMenu() {
  const { playbackRate, setPlaybackRate } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 rounded-full border px-3 text-xs font-semibold tabular-nums text-muted hover:border-primary-300 hover:text-primary-700"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Playback speed"
      >
        {playbackRate}×
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute bottom-11 left-0 z-20 w-24 overflow-hidden rounded-xl border surface shadow-soft-lg"
          >
            {PLAYBACK_RATES.map((r) => (
              <button
                key={r}
                role="menuitemradio"
                aria-checked={r === playbackRate}
                onClick={() => {
                  setPlaybackRate(r);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full px-3 py-2 text-left text-sm tabular-nums hover:surface-muted",
                  r === playbackRate && "font-semibold text-primary-600"
                )}
              >
                {r}×
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── Volume control ─────────────────────────────────────────────────────────
function VolumeControl({ wide }: { wide?: boolean }) {
  const { volume, isMuted, setVolume, toggleMute } = useAudioPlayer();
  const shown = isMuted ? 0 : volume;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleMute}
        className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary-700"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted || volume === 0 ? (
          <MuteIcon className="text-lg" />
        ) : (
          <VolumeIcon className="text-lg" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={shown}
        onChange={(e) => setVolume(Number(e.target.value))}
        aria-label="Volume"
        className={cn(
          "player-range h-1.5 cursor-pointer appearance-none rounded-full",
          wide ? "w-40" : "w-24"
        )}
        style={{
          background: `linear-gradient(to right, rgb(var(--ring)) ${
            shown * 100
          }%, rgb(var(--border)) ${shown * 100}%)`,
        }}
      />
    </div>
  );
}
