"use client";

/*
 * MOTION QA COPY — not used by the live app.
 * Reviewed on /motion-qa next to the original (src/components/player/GlobalAudioPlayer.tsx), which is unchanged.
 * Once approved, this replaces the original; until then nothing imports it
 * outside the QA page.
 */

import { useEffect, useState, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import {
  PLAYBACK_RATES,
  useAudioPlayer,
} from "@/contexts/AudioPlayerContext";
import { PlayerProgressQA as PlayerProgress } from "./PlayerProgressQA";
import { QueuePanel } from "@/components/player/QueuePanel";
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
  CategoryIcon,
} from "@/components/ui/Icon";
import { youtubeWatchUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { quranPlayerSubtitle } from "@/lib/data/service";

/*
 * The single, persistent player UI. Mounted once in the root layout (below
 * the AudioPlayerProvider) so it never unmounts on navigation. Renders a
 * compact bar on mobile (above the bottom nav) and a full transport bar on
 * desktop, plus an expandable full-screen sheet on mobile and a queue panel.
 *
 * Mobile expand / collapse is one shape: the bar's surface morphs into the
 * sheet (shared layoutId), the cover and play button fly to their new slots,
 * and everything else swaps with a short blur. The sheet drags down to close.
 */

const MOBILE = "(max-width: 767px)";

// Near-critically damped (ζ ≈ 0.92): a tiny settle, no bounce.
const MORPH = { type: "spring", stiffness: 380, damping: 36 } as const;

// Content swap inside the morphing surface: exit fast, enter after a beat, so
// old and new text never overlap.
const swap = {
  initial: { opacity: 0, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { delay: 0.09, duration: 0.2, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    filter: "blur(6px)",
    transition: { duration: 0.1, ease: "easeIn" },
  },
} as const;

// Track change: the new artwork fades in on top, the old one is held
// underneath until it is covered, so the cover never dips to the surface.
const artSwap = {
  initial: { opacity: 0, zIndex: 1 },
  animate: { opacity: 1, zIndex: 1, transition: { duration: 0.24, ease: "easeOut" } },
  exit: { opacity: 1, zIndex: 0, transition: { duration: 0, delay: 0.24 } },
} as const;

// Drag-to-dismiss: on release, project where the sheet would coast to
// (offset + velocity × 0.2 s, as UIKit sheets do). Past the threshold it
// closes; otherwise it springs back from wherever the finger left it. A quick
// short flick and a slow long drag both close; a slow short drag does not.
const DISMISS_OFFSET = 140;
const DISMISS_PROJECTION_S = 0.2;

export function GlobalAudioPlayerQA() {
  const player = useAudioPlayer();
  const { current, isExpanded, setExpanded } = player;
  const [queueOpen, setQueueOpen] = useState(false);
  const dragControls = useDragControls();

  // The sheet only exists on mobile; on desktop isExpanded has no visual effect.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const sheetOpen = isExpanded && isMobile;

  // Lock the page behind the open sheet, so a swipe on the sheet never scrolls
  // it (and pull-to-refresh / rubber-banding can't start underneath).
  useEffect(() => {
    if (!sheetOpen) return;
    const root = document.documentElement;
    const prev = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior };
    root.style.overflow = "hidden";
    root.style.overscrollBehavior = "none";
    return () => {
      root.style.overflow = prev.overflow;
      root.style.overscrollBehavior = prev.overscroll;
    };
  }, [sheetOpen]);

  // While collapsing, the bar's surface is the shape shrinking back, so it
  // must sit above the exiting sheet until that exit completes.
  const [raised, setRaised] = useState(false);
  const [prevSheetOpen, setPrevSheetOpen] = useState(sheetOpen);
  if (prevSheetOpen !== sheetOpen) {
    setPrevSheetOpen(sheetOpen);
    if (!sheetOpen) setRaised(true);
  }

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
  const shared = (id: string) => (isMobile ? `player-${id}` : undefined);

  // Called as functions (not <Cover />) so the elements keep their identity
  // across re-renders; a remount would restart their layout animation.
  // CoverArt's category icon has a fixed size, so the 44px cover scaled up
  // mid-collapse would show it huge: `fadeIcon` holds it back until the cover
  // has nearly landed. The gradient artwork still flies the whole way.
  const renderCover = (className: string, radius: number, layoutId?: string, fadeIcon = false) => (
    <motion.div
      layoutId={layoutId}
      transition={{ layout: MORPH }}
      className={cn("relative shrink-0 overflow-hidden", className)}
      style={{ borderRadius: radius }}
    >
      {/* The artwork is keyed by track inside the shared wrapper, so a track
          change crossfades without breaking the layoutId morph. */}
      <AnimatePresence initial={false}>
        <motion.div key={current.id} {...artSwap} className="absolute inset-0">
          {current.coverImageUrl ? (
            <Image src={current.coverImageUrl} alt="" fill className="object-cover" />
          ) : (
            <>
              <CoverArt seed={current.slug} rounded="rounded-none" className="h-full w-full" />
              {current.category.icon ? (
                // Same icon treatment as CoverArt's own
                <motion.div
                  className="absolute inset-0 grid place-items-center"
                  initial={fadeIcon ? { opacity: 0 } : false}
                  animate={{ opacity: 1, transition: { delay: 0.2, duration: 0.18 } }}
                >
                  <CategoryIcon
                    name={current.category.icon}
                    className="text-4xl text-gold-300/80"
                    strokeWidth={1.2}
                  />
                </motion.div>
              ) : null}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );

  const renderTransport = (layoutId?: string) =>
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
      <motion.button
        layoutId={layoutId}
        transition={{ layout: MORPH }}
        type="button"
        onClick={player.togglePlay}
        whileTap={{ scale: 0.95 }}
        className="grid h-14 w-14 place-items-center rounded-full bg-primary-700 text-2xl text-sand-50 shadow-soft hover:bg-primary-600"
        style={{ borderRadius: 9999 }}
        aria-label={player.isPlaying ? "Pause" : "Play"}
      >
        {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
      </motion.button>
    );

  function onSheetDragEnd(_: unknown, info: PanInfo) {
    const projected = info.offset.y + Math.max(0, info.velocity.y) * DISMISS_PROJECTION_S;
    if (projected > DISMISS_OFFSET) {
      setExpanded(false);
    }
  }
  const startDrag = (e: PointerEvent) => dragControls.start(e);

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="global-player">
        {/* ── Compact bar (fixed, above bottom nav on mobile) ── */}
        <div
          className={cn("fixed inset-x-0 px-2 md:px-0", raised ? "z-[60]" : "z-40")}
          style={{ bottom: "var(--nav-height, 0px)" }}
        >
          <div className="mx-auto max-w-6xl md:px-0">
            <AnimatePresence initial={false}>
              {!sheetOpen ? (
                <div key="bar" className="relative mx-1 mb-1 md:mx-0 md:mb-0">
                  {/* The surface is its own layer so it can morph without
                      stretching the text laid out on top of it. */}
                  <motion.div
                    layoutId={shared("surface")}
                    transition={{ layout: MORPH }}
                    aria-hidden
                    className="absolute inset-0 border surface shadow-player md:!rounded-none md:border-x-0 md:border-b-0"
                    style={{ borderRadius: 20 }}
                  />

                  <div className="relative">
                    {/* thin progress line on mobile compact */}
                    <motion.div {...swap} className="overflow-hidden rounded-t-2xl md:hidden">
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
                    </motion.div>

                    <div className="flex items-center gap-3 p-2 md:px-4 md:py-2.5">
                      <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left md:flex-none md:w-64"
                        aria-label="Expand player"
                      >
                        {renderCover("h-11 w-11 md:h-12 md:w-12", 8, shared("cover"), raised)}
                        <motion.span {...swap} className="relative min-w-0 flex-1">
                          {/* Track change: same blur swap; popLayout takes the
                              old title out of flow so the new one never jumps. */}
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.span key={current.id} {...swap} className="block">
                              <span className="block truncate text-sm font-semibold">
                                {current.title}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {subtitleText}
                              </span>
                            </motion.span>
                          </AnimatePresence>
                        </motion.span>
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
                        {renderTransport()}
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
                        {renderTransport(shared("play"))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Expanded mobile sheet ── */}
        <AnimatePresence onExitComplete={() => setRaised(false)}>
          {sheetOpen ? (
            <motion.div
              key="sheet"
              className="fixed inset-0 z-50 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Now playing"
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 1 }}
              dragTransition={{ bounceStiffness: 420, bounceDamping: 40 }}
              onDragEnd={onSheetDragEnd}
            >
              {/* Content lives inside the morphing surface (clipped by it) and is
                  scale-corrected by `layout`, so nothing shows outside the shape
                  while it grows. */}
              <motion.div
                layoutId={shared("surface")}
                transition={{ layout: MORPH }}
                className="absolute inset-0 overflow-hidden surface"
                style={{ borderRadius: 0 }}
              >
                {/* Safe areas: viewport-fit=cover puts the sheet under the notch /
                    Dynamic Island and the home indicator, so pad all four sides. */}
                <motion.div
                  layout
                  transition={{ layout: MORPH }}
                  className="flex h-full flex-col pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)]"
                >
                  {/* Header doubles as the drag handle */}
                  <motion.div
                    {...swap}
                    onPointerDown={startDrag}
                    className="touch-none px-4 pb-4 pt-2"
                  >
                    <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[rgb(var(--border))]" aria-hidden />
                    <div className="flex items-center justify-between">
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
                  </motion.div>

                  {/* The artwork takes whatever height is left (square, ≤ 20rem), so
                      the controls always fit — down to an iPhone SE. Short landscape
                      screens switch to two columns. */}
                  <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 px-6 pb-6 [@media(orientation:landscape)_and_(max-height:500px)]:flex-row [@media(orientation:landscape)_and_(max-height:500px)]:items-center [@media(orientation:landscape)_and_(max-height:500px)]:gap-8 [@media(orientation:landscape)_and_(max-height:500px)]:pb-3">
                    {/* The artwork is also a drag handle — the biggest target */}
                    <div
                      onPointerDown={startDrag}
                      className="flex min-h-[88px] flex-1 touch-none items-center justify-center [container-type:size] [@media(orientation:landscape)_and_(max-height:500px)]:h-full [@media(orientation:landscape)_and_(max-height:500px)]:w-2/5 [@media(orientation:landscape)_and_(max-height:500px)]:flex-none"
                    >
                      {renderCover("h-[min(100cqmin,20rem)] w-[min(100cqmin,20rem)] shadow-soft-lg", 28, shared("cover"))}
                    </div>

                    <div className="flex flex-col gap-5 [@media(orientation:landscape)_and_(max-height:500px)]:min-w-0 [@media(orientation:landscape)_and_(max-height:500px)]:flex-1 [@media(orientation:landscape)_and_(max-height:500px)]:gap-3">
                      <motion.div {...swap} className="relative text-center">
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.div key={current.id} {...swap}>
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
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>

                      {isYouTube ? (
                        <motion.div {...swap} className="text-center">
                          <Link
                            href={youtubeWatchUrl(current.youtubeVideoId ?? "")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-12 items-center gap-2 rounded-full bg-red-600 px-6 font-semibold text-white"
                          >
                            <YouTubeIcon className="text-xl" /> Watch on YouTube
                          </Link>
                        </motion.div>
                      ) : (
                        <>
                          <motion.div {...swap}>
                            <PlayerProgress />
                          </motion.div>
                          <div className="flex items-center justify-center gap-6">
                            <motion.button
                              {...swap}
                              type="button"
                              onClick={player.previous}
                              className="grid h-12 w-12 place-items-center rounded-full text-2xl text-muted"
                              aria-label="Previous"
                            >
                              <PrevIcon />
                            </motion.button>
                            <motion.button
                              layoutId={shared("play")}
                              transition={{ layout: MORPH }}
                              type="button"
                              onClick={player.togglePlay}
                              whileTap={{ scale: 0.95 }}
                              className="grid h-16 w-16 place-items-center rounded-full bg-primary-700 text-3xl text-sand-50 shadow-soft-lg"
                              style={{ borderRadius: 9999 }}
                              aria-label={player.isPlaying ? "Pause" : "Play"}
                            >
                              {player.isPlaying ? <PauseIcon /> : <PlayIcon />}
                            </motion.button>
                            <motion.button
                              {...swap}
                              type="button"
                              onClick={player.next}
                              className="grid h-12 w-12 place-items-center rounded-full text-2xl text-muted"
                              aria-label="Next"
                            >
                              <NextIcon />
                            </motion.button>
                          </div>
                          <motion.div {...swap} className="flex items-center justify-between">
                            <SpeedMenu />
                            <VolumeControl wide />
                          </motion.div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
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
      </LayoutGroup>
    </MotionConfig>
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
