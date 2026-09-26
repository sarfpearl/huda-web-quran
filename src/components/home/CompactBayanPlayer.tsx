"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { BayanWithRelations } from "@/types/bayan";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { CoverArt } from "@/components/ui/CoverArt";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  PlaylistAddIcon,
  ShareIcon,
  ShuffleIcon,
  RepeatIcon,
  EqualizerIcon,
  ChevronDownIcon,
  VolumeIcon,
  MuteIcon,
} from "@/components/ui/Icon";
import { formatClock } from "@/lib/utils";
import {
  isQuranTrack,
  isQuranTrackId,
  isSurahTrackId,
  getSurahByTrackId,
  quranContentLabel,
  QURAN_TRACKS,
  SURAH_TRACKS,
  quranImageUrl,
  getSurahTracksForReciter,
  resolveActiveReciter,
  reciterHasWordTiming,
} from "@/lib/data/service";
import {
  getVoiceProgressInVerse,
  type AyahVerse,
  type RecitationSegment,
} from "@/lib/data/quranVerses";
import type { QuranSurah } from "@/lib/data/quran";
import { haptic } from "@/lib/haptics";
import { SURAH_DURATIONS } from "@/lib/data/surahDurations";
import { HoverTooltips } from "@/components/player/HoverTooltips";

interface CompactBayanPlayerProps {
  bayan: BayanWithRelations;
  categoryList?: BayanWithRelations[];
  surahTracks?: BayanWithRelations[];
  onShuffleCategory?: () => void;
  activeSurah?: QuranSurah | null;
  currentVerse?: AyahVerse | null;
  currentSegment?: RecitationSegment | null;
  segments?: RecitationSegment[];
  totalVerses?: number;
  activeVerseIndex?: number;
  language?: "en" | "ta";
  onToggleLanguage?: () => void;
  showTranslation?: boolean;
  onToggleShowTranslation?: () => void;
  onSeekToVerse?: (verseIndex: number, totalVerses: number) => void;
  /** Rendered at the top of the right-hand action stack (view count). */
  viewSlot?: React.ReactNode;
  /** Ayah step controls (« ») — shown between track prev/next when provided */
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
  /** What |< / >| step through — used for their tooltips. */
  trackKind?: "Surah" | "Juz" | null;
  /** Estimated Juz clock for per-ayah Juz playback (seconds). */
  juzTiming?: { elapsed: number; total: number } | null;
  /** Override |< / >| (e.g. a per-ayah Juz steps to the previous / next Juz). */
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
}

export function CompactBayanPlayer({
  bayan,
  categoryList,
  surahTracks,
  onShuffleCategory,
  activeSurah,
  currentVerse,
  currentSegment,
  segments,
  totalVerses = 1,
  activeVerseIndex = 0,
  language = "en",
  onToggleLanguage,
  showTranslation = true,
  onToggleShowTranslation,
  onSeekToVerse,
  viewSlot,
  onPrevVerse,
  onNextVerse,
  trackKind = null,
  juzTiming = null,
  onPrevTrack,
  onNextTrack,
}: CompactBayanPlayerProps) {
  const prevTrackLabel = trackKind ? `Previous ${trackKind}` : "Previous";
  const nextTrackLabel = trackKind ? `Next ${trackKind}` : "Next";
  const player = useAudioPlayer();
  const isCurrentTrack = player.current?.id === bayan.id;
  const isPlaying = isCurrentTrack && player.isPlaying;
  const isLoading = isCurrentTrack && player.isLoading;
  const errorMsg = isCurrentTrack ? player.error : null;
  const isQuran = isQuranTrack(bayan.id) || Boolean(activeSurah) || bayan.category?.slug === "quran" || bayan.category?.slug === "quran-recitation";
  const surah = activeSurah ?? (isSurahTrackId(bayan.id) ? getSurahByTrackId(bayan.id) : undefined);

  const [coverSrc, setCoverSrc] = useState<string | null>(bayan.coverImageUrl ?? null);

  // Collapsed = compact pill (cover + transport). Remembered per viewer on
  // larger screens; phones always open on the full player (see below).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (window.matchMedia(SMALL_SCREEN).matches) return;
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);
  // Both views stay mounted at their natural size and crossfade; only the empty
  // glass shell resizes (CSS transition to the measured size of the active view),
  // so nothing reflows mid-animation.
  const fullRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const compactRef = useRef<HTMLDivElement>(null);
  const [shellSize, setShellSize] = useState<{ w: number; h: number } | null>(null);
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const active = collapsed ? compactRef.current : fullRef.current;
    const inactive = collapsed ? fullRef.current : compactRef.current;
    if (!active) return;
    active.inert = false;
    if (inactive) inactive.inert = true;
    const measure = () => setShellSize({ w: active.offsetWidth, h: active.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(active);
    return () => ro.disconnect();
  }, [collapsed]);

  // Shared cover: on switch, a copy of the artwork flies along a curve from the
  // full player's cover to the compact play button (and back).
  const fullCoverRef = useRef<HTMLDivElement>(null);
  const compactCoverRef = useRef<HTMLButtonElement>(null);
  const [flight, setFlight] = useState<{ from: DOMRect; to: DOMRect; fromRadius: number; toRadius: number; expand: boolean; id: number } | null>(null);

  const toggleCollapsed = (next: boolean, remember = true) => {
    if (next === collapsed) return;
    // A manual switch overrides any pending auto-restore (see below).
    if (remember) autoCollapsedRef.current = false;
    haptic();
    const src = next ? fullCoverRef.current : compactCoverRef.current;
    const dst = next ? compactCoverRef.current : fullCoverRef.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (src && dst && !reduceMotion) {
      // Both views stay mounted (untransformed), so the destination rect is final already.
      const radius = (el: Element) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      setFlight({
        from: src.getBoundingClientRect(),
        to: dst.getBoundingClientRect(),
        fromRadius: radius(src),
        toRadius: radius(dst),
        expand: !next,
        id: Date.now(),
      });
    }
    setAnimate(true);
    setCollapsed(next);
    if (!remember) return;
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {}
  };

  // Small screens: turning the translation on shrinks the full player to the
  // compact pill so the meaning has room; turning it off brings it back (only
  // if it was the auto-collapse). Not remembered — the saved choice stays.
  const autoCollapsedRef = useRef(false);
  const prevTranslationRef = useRef(showTranslation);
  useEffect(() => {
    const was = prevTranslationRef.current;
    prevTranslationRef.current = showTranslation;
    if (was === showTranslation) return;
    const small = window.matchMedia(SMALL_SCREEN).matches;
    if (showTranslation && small && !collapsed) {
      toggleCollapsed(true, false);
      autoCollapsedRef.current = true;
    } else if (!showTranslation && autoCollapsedRef.current) {
      autoCollapsedRef.current = false;
      if (collapsed) toggleCollapsed(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTranslation]);

  // Every screen size: the full player shows until playback starts, then it
  // shrinks to the compact pill so the ayah has the screen. Not remembered,
  // and a manual expand stays until the next play.
  const wasPlayingRef = useRef(isPlaying);
  useEffect(() => {
    const was = wasPlayingRef.current;
    wasPlayingRef.current = isPlaying;
    if (!isPlaying || was || collapsed) return;
    toggleCollapsed(true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    setCoverSrc(bayan.coverImageUrl ?? null);
  }, [bayan.id, bayan.coverImageUrl]);

  // Preload adjacent and sample Surah images to ensure instantaneous transition without flash
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (surah) {
      const preloadNumbers = [
        surah.number === 114 ? 1 : surah.number + 1,
        surah.number === 1 ? 114 : surah.number - 1,
        Math.floor(Math.random() * 114) + 1,
        Math.floor(Math.random() * 114) + 1,
      ];
      preloadNumbers.forEach((n) => {
        const img = new window.Image();
        img.src = quranImageUrl("surah", n);
      });
    }
  }, [surah]);

  // Player subtitle: NOW PLAYING · title · category.
  //   Bayan  → category name (e.g. "Iman & Taqwa")
  //   Surah  → "Quran • Surah 1 · 7 Verses · Meccan"
  //   Quran  → Para/Juz info
  const categoryLine = isQuran
    ? (surah
        ? `Quran • Surah ${surah.number} · ${surah.verses} Verses · ${surah.revelation}`
        : quranContentLabel(bayan.id, bayan.speaker?.name) ?? bayan.category.name)
    : bayan.category.name;
  const currentSurah = activeSurah ?? (isSurahTrackId(bayan.id) ? getSurahByTrackId(bayan.id) : undefined);
  const currentTime = isCurrentTrack ? player.currentTime : 0;
  const totalDuration = isCurrentTrack && player.duration > 0
    ? player.duration
    : (bayan.durationSeconds || (currentSurah ? SURAH_DURATIONS[currentSurah.number] : 300));

  // Per-ayah Juz: the progress bar spans the whole Juz (ayah index + intra-ayah
  // fraction) instead of resetting every ayah, and shows "Ayah X / Y".
  const ayahSeq = isCurrentTrack ? player.ayahSequence : null;
  const isAyahSeq = Boolean(ayahSeq && isQuranTrackId(bayan.id));

  // Ayat pill position; « is off on the first ayah (and the Isti'adhah /
  // Bismillah before it), » is off on the last.
  const surahAyah =
    currentSegment?.type === "ayah" && currentSegment.ayahNumber
      ? currentSegment.ayahNumber
      : currentVerse?.ayahNumber && currentVerse.ayahNumber > 0 ? currentVerse.ayahNumber : 1;
  const surahAyahTotal = activeSurah?.verses || totalVerses || 1;
  const inPrelude = isAyahSeq && ayahSeq
    ? Boolean(ayahSeq.preType)
    : currentSegment?.type === "istiadhah" || currentSegment?.type === "bismillah";
  const atFirstAyah = inPrelude || (isAyahSeq && ayahSeq ? ayahSeq.index <= 0 : surahAyah <= 1);
  const atLastAyah = !inPrelude && (isAyahSeq && ayahSeq ? ayahSeq.index >= ayahSeq.total - 1 : surahAyah >= surahAyahTotal);
  const ayahFraction = totalDuration > 0 ? Math.min(currentTime / totalDuration, 1) : 0;
  const juzProgressPct = isAyahSeq && ayahSeq
    ? juzTiming && juzTiming.total > 0
      ? Math.min(100, (juzTiming.elapsed / juzTiming.total) * 100)
      : ((ayahSeq.index + ayahFraction) / ayahSeq.total) * 100
    : (totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0);

  const barPct = Math.min(Math.max(juzProgressPct, 0), 100);

  const handlePlayToggle = () => {
    if (isCurrentTrack) {
      player.togglePlay();
    } else {
      const activeSurahTracks = surahTracks || getSurahTracksForReciter(resolveActiveReciter(bayan));
      const contextList = isSurahTrackId(bayan.id)
        ? activeSurahTracks
        : isQuranTrackId(bayan.id)
        ? QURAN_TRACKS
        : categoryList;
      player.playBayan(bayan, contextList);
    }
  };

  // Haptic tick each time a scrub crosses into a different ayah.
  const lastScrubAyahRef = useRef<number | null>(null);
  const ayahAtTime = (t: number) =>
    segments?.find((sg) => sg.type === "ayah" && t >= sg.startTime && t < sg.endTime)?.ayahNumber ?? null;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => seekToTime(Number(e.target.value));

  const seekToTime = (val: number) => {
    const ayah = ayahAtTime(val);
    if (ayah != null && ayah !== lastScrubAyahRef.current) {
      if (lastScrubAyahRef.current != null) haptic(8);
      lastScrubAyahRef.current = ayah;
    }
    if (isCurrentTrack) {
      player.seek(val);
    } else {
      const activeSurahTracks = surahTracks || getSurahTracksForReciter(resolveActiveReciter(bayan));
      const contextList = isSurahTrackId(bayan.id)
        ? activeSurahTracks
        : isQuranTrackId(bayan.id)
        ? QURAN_TRACKS
        : categoryList;
      player.playBayan(bayan, contextList);
      setTimeout(() => player.seek(val), 100);
    }
  };

  // Shuffle is context-aware:
  //   • Surah playing → jump to a DIFFERENT random Surah (excluding current)
  //   • Juz playing   → jump to a DIFFERENT random Juz (excluding current)
  //   • otherwise      → shuffle the Bayan category (existing behaviour)
  const playRandomFrom = (tracks: BayanWithRelations[]) => {
    if (tracks.length === 0) return;
    const pool =
      tracks.length > 1 ? tracks.filter((t) => t.id !== bayan.id) : tracks;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    player.playBayan(pick, tracks);
  };

  const handleShuffle = () => {
    if (isSurahTrackId(bayan.id)) {
      playRandomFrom(surahTracks || getSurahTracksForReciter(resolveActiveReciter(bayan)));
    } else if (isQuranTrackId(bayan.id)) {
      playRandomFrom(QURAN_TRACKS);
    } else {
      onShuffleCategory?.();
    }
  };

  // Ring scrubber: drag around the cover's ring to seek (tap the cover to play / pause).
  //   Per-ayah Juz → the ring steps through ayāt; otherwise it seeks in time.
  const ringRef = useRef<HTMLDivElement>(null);
  const scrubRef = useRef<{ x: number; y: number; active: boolean; last: number } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragPct, setDragPct] = useState<number | null>(null);

  const seekToFraction = (f: number) => {
    if (isAyahSeq && ayahSeq) {
      const idx = Math.min(ayahSeq.total - 1, Math.floor(f * ayahSeq.total));
      if (idx !== ayahSeq.index) {
        haptic(8);
        player.jumpToAyah(idx);
      }
    } else {
      seekToTime(f * (totalDuration || 1));
    }
  };

  const fractionAt = (e: React.PointerEvent) => {
    const r = ringRef.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    // 0 at 12 o'clock, clockwise.
    let f = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
    // Don't wrap across 12 o'clock mid-drag — pin to the ends instead.
    const last = scrubRef.current?.last;
    if (last != null && Math.abs(f - last) > 0.5) f = last > 0.5 ? 1 : 0;
    return f;
  };

  const startScrub = (e: React.PointerEvent) => {
    const st = scrubRef.current!;
    st.active = true;
    ringRef.current!.setPointerCapture(e.pointerId);
    lastScrubAyahRef.current = ayahAtTime(currentTime);
    st.last = ringPct / 100;
    const f = fractionAt(e);
    st.last = f;
    setDragPct(f * 100);
    seekToFraction(f);
  };

  const onRingPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const r = ringRef.current!.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    scrubRef.current = { x: e.clientX, y: e.clientY, active: false, last: ringPct / 100 };
    suppressClickRef.current = false;
    // Pressing on the ring band scrubs straight away; on the cover it waits for a drag.
    if (dist > r.width * 0.36) startScrub(e);
  };

  const onRingPointerMove = (e: React.PointerEvent) => {
    const st = scrubRef.current;
    if (!st) return;
    if (!st.active) {
      if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return;
      startScrub(e);
      return;
    }
    const f = fractionAt(e);
    st.last = f;
    setDragPct(f * 100);
    seekToFraction(f);
  };

  const endScrub = () => {
    if (scrubRef.current?.active) suppressClickRef.current = true;
    scrubRef.current = null;
    setDragPct(null);
  };

  const onRingKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handlePlayToggle();
      return;
    }
    const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    if (isAyahSeq && ayahSeq) player.jumpToAyah(ayahSeq.index + dir);
    else seekToTime(Math.min(Math.max(currentTime + dir * 5, 0), totalDuration || 0));
  };

  const ringPct = dragPct ?? Math.min(Math.max(juzProgressPct, 0), 100);
  const thumbAngle = (ringPct / 100) * 2 * Math.PI;
  // Compact pill hugs its controls, spaced like the full card's transport row.
  const compactView = (
      <div
        ref={compactRef}
        aria-hidden={!collapsed}
        className={`${viewBase} ${collapsed ? viewShown : viewHidden} flex w-max max-w-[calc(100vw-2rem)] justify-center items-center gap-2 sm:gap-3 p-2 px-3 sm:px-4`}
      >
        <VolumeControl buttonClassName={compactBtn} active={collapsed} />

        <button
          type="button"
          onClick={() => { haptic(); (onPrevTrack ?? player.previous)(); }}
          className={compactBtn}
          aria-label={prevTrackLabel}
          title={prevTrackLabel}
        >
          <PrevIcon className="text-lg" />
        </button>


        {/* Cover = play button, ringed by the seek bar — tap to play / pause, drag the ring to seek */}
        <div
          ref={ringRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ringPct)}
          aria-valuetext={
            isAyahSeq && ayahSeq
              ? `Ayah ${ayahSeq.index + 1} of ${ayahSeq.total}`
              : `${formatClock(currentTime)} of ${formatClock(totalDuration)}`
          }
          onKeyDown={onRingKeyDown}
          onPointerDown={onRingPointerDown}
          onPointerMove={onRingPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          className="group relative h-16 w-16 shrink-0 rounded-full touch-none cursor-grab active:cursor-grabbing shadow-[0_0_24px_rgba(16,185,129,0.35)] outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (suppressClickRef.current) {
                suppressClickRef.current = false;
                return;
              }
              haptic();
              handlePlayToggle();
            }}
            ref={compactCoverRef}
            className={`${flight ? "invisible" : ""} absolute inset-[5px] sm:inset-[6px] overflow-hidden rounded-full bg-gradient-to-br from-emerald-950 to-slate-900 cursor-pointer active:scale-95 transition-transform`}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={bayan.title}
          >
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt=""
                fill
                unoptimized={true}
                draggable={false}
                className="object-cover pointer-events-none"
                onError={() => setCoverSrc("/assets/images/bayan/quran.jpg")}
              />
            ) : (
              <CoverArt seed={bayan.slug} icon={bayan.category.icon} rounded="rounded-full" className="h-full w-full" />
            )}
            <span className="absolute inset-0 grid place-items-center bg-black/20 text-emerald-400 [filter:drop-shadow(0_1px_3px_rgba(0,0,0,0.9))]">
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              ) : isPlaying ? (
                <PauseIcon className="text-2xl" />
              ) : (
                <PlayIcon className="text-2xl ml-0.5" />
              )}
            </span>
          </button>
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />
            <circle
              cx="18"
              cy="18"
              r="16.5"
              fill="none"
              stroke={isQuran ? "#fbbf24" : "#f5f5f4"}
              strokeWidth="2.2"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${ringPct} 100`}
              transform="rotate(-90 18 18)"
              className={dragPct == null ? "transition-[stroke-dasharray] duration-150 ease-linear" : ""}
            />
            {/* Thumb — grows while dragging */}
            <circle
              cx={18 + 16.5 * Math.sin(thumbAngle)}
              cy={18 - 16.5 * Math.cos(thumbAngle)}
              r={dragPct == null ? 2.2 : 3.2}
              fill={isQuran ? "#fde68a" : "#ffffff"}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.6"
              className="transition-[r] duration-150"
            />
          </svg>
        </div>



        <button
          type="button"
          onClick={() => { haptic(); (onNextTrack ?? player.next)(); }}
          className={compactBtn}
          aria-label={nextTrackLabel}
          title={nextTrackLabel}
        >
          <NextIcon className="text-lg" />
        </button>

        <button
          type="button"
          onClick={() => toggleCollapsed(false)}
          className={compactBtn}
          aria-label="Expand player"
          title="Expand player"
        >
          <ChevronDownIcon className="text-xl rotate-180" />
        </button>
      </div>
  );

  const fullView = (
    <div
      ref={fullRef}
      aria-hidden={collapsed}
      className={`${viewBase} ${collapsed ? viewHidden : viewShown} w-[calc(100vw-2rem)] sm:w-[80dvw] max-w-[680px] px-4 py-4 sm:px-6 sm:py-6`}
    >
      {/* iOS Liquid Glass surface — single unified glass (Glass.svg tint + inner-shadow rim) */}
      {/* Upper Section — Artwork + Track Info + Action Buttons */}
      <div className="relative flex items-start justify-between gap-3 sm:gap-5">
        {/* Cover Artwork */}
        <div
          ref={fullCoverRef}
          className={`${flight ? "invisible" : ""} relative w-[clamp(5.5rem,20vw,8rem)] aspect-[5/7] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 to-slate-900 shadow-[0_6px_18px_rgba(0,0,0,0.55)]`}
        >
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={bayan.title}
              fill
              unoptimized={true}
              priority
              className="object-cover [image-rendering:-webkit-optimize-contrast] contrast-[1.06] saturate-[1.04]"
              onError={() => setCoverSrc("/assets/images/bayan/quran.jpg")}
            />
          ) : (
            <CoverArt
              seed={bayan.slug}
              icon={bayan.category.icon}
              rounded="rounded-full"
              className="h-full w-full"
            />
          )}

          {/* Equalizer overlay when playing audio */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
              <div className="flex items-end gap-0.5">
                <span className="h-4 w-0.5 animate-[equalizer_0.6s_ease-in-out_infinite] bg-emerald-400" />
                <span className="h-6 w-0.5 animate-[equalizer_0.8s_ease-in-out_infinite] bg-emerald-400" />
                <span className="h-3.5 w-0.5 animate-[equalizer_0.5s_ease-in-out_infinite] bg-emerald-400" />
              </div>
            </div>
          )}
        </div>

        {/* Track Info — NOW PLAYING · Title · Arabic Name · Reciter/Speaker · Category */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-[10px] sm:text-xs font-semibold text-sand-300/50 uppercase tracking-widest">
            Now Playing
          </span>
          <div className="flex items-baseline gap-2 mt-1 min-w-0">
            <h3 className="truncate font-sans text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
              {bayan.title}
            </h3>
            {surah?.arabicName && (
              <span
                lang="ar"
                dir="rtl"
                className="font-arabic text-base sm:text-lg font-bold text-emerald-300 shrink-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
              >
                {surah.arabicName}
              </span>
            )}
          </div>
          <p className="truncate text-xs sm:text-sm font-medium text-emerald-400 mt-0.5">
            {categoryLine}
          </p>
          {/* Active Ayah pill — every Surah (any reciter) and every per-ayah Juz */}
          {(isAyahSeq && ayahSeq) || (isSurahTrackId(bayan.id) && (currentSegment || currentVerse)) ? (
            <div className="mt-2 inline-flex h-9 items-center gap-1.5 w-fit rounded-full bg-black/40 border border-white/15 text-xs sm:text-sm select-none">
              {onPrevVerse ? (
                <button
                  type="button"
                  onClick={() => { haptic(); onPrevVerse(); }}
                  disabled={atFirstAyah}
                  className={pillStepBtn}
                  aria-label="Previous Ayah"
                  title="Previous Ayah"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
                  </svg>
                </button>
              ) : (
                <span className="w-3" />
              )}
              <span className="px-1 text-sand-300/80 font-normal tabular-nums whitespace-nowrap">
                {isAyahSeq && ayahSeq ? (
                  ayahSeq.preType === "istiadhah" ? (
                    "Isti'adhah"
                  ) : ayahSeq.preType === "bismillah" ? (
                    "Bismillah"
                  ) : (
                    <>Ayat {ayahSeq.index + 1}/{ayahSeq.total}</>
                  )
                ) : currentSegment?.type === "istiadhah" ? (
                  "Isti'adhah"
                ) : currentSegment?.type === "bismillah" ? (
                  "Bismillah"
                ) : (
                  <>Ayat {surahAyah}/{surahAyahTotal}</>
                )}
              </span>
              {onNextVerse ? (
                <button
                  type="button"
                  onClick={() => { haptic(); onNextVerse(); }}
                  disabled={atLastAyah}
                  className={pillStepBtn}
                  aria-label="Next Ayah"
                  title="Next Ayah"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
                  </svg>
                </button>
              ) : (
                <span className="w-3" />
              )}
            </div>
          ) : null}
          {errorMsg && (
            <span className="truncate text-[11px] font-medium text-red-400 mt-1" role="alert">
              {errorMsg}
            </span>
          )}
        </div>

        {/* Right Vertical Action Stack */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* 1. View count of the Surah / Juz playing (replaced the ♥ button) */}
          {viewSlot}

          {/* 2. Shuffle Button (Moved from bottom left per red arrow) */}
          <button
            type="button"
            data-tooltip="Shuffle"
            onClick={handleShuffle}
            title={
              isSurahTrackId(bayan.id)
                ? "Play a random Surah"
                : isQuranTrackId(bayan.id)
                ? "Play a random Juz"
                : "Random Category / Shuffle"
            }
            className="grid h-9 w-9 place-items-center rounded-full bg-black/40 text-sand-300 border border-white/10 hover:bg-black/60 hover:text-emerald-400 active:scale-90 transition-all cursor-pointer"
            aria-label={
              isSurahTrackId(bayan.id)
                ? "Shuffle Surah"
                : isQuranTrackId(bayan.id)
                ? "Shuffle Juz"
                : "Shuffle Category"
            }
          >
            <ShuffleIcon className="text-xs sm:text-sm" />
          </button>

          {/* 3. Playback Speed Button (Moved from bottom right per red arrow) */}
          <button
            type="button"
            onClick={() => {
              const rates = [1, 1.25, 1.5, 2];
              const nextIdx = (rates.indexOf(player.playbackRate) + 1) % rates.length;
              player.setPlaybackRate?.(rates[nextIdx]);
            }}
            aria-label="Playback Speed"
            data-tooltip={`Playback speed · ${player.playbackRate}x`}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/40 border border-white/10 text-[11px] font-bold text-emerald-400 hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
          >
            {player.playbackRate}x
          </button>
        </div>
      </div>

      {/* Lower Section — Audio Progress Slider with Embedded Ayah Dots & Time Labels */}
      <div className="mt-4 px-1">
        <div className="group relative flex items-center h-5">
          {/* Track · played fill · knob (Quran = gold, Bayan = emerald). The native
              thumb is hidden; the knob below mirrors the same progress. */}
          <div className="absolute inset-x-0 h-2 rounded-full bg-white/20 ring-1 ring-inset ring-white/10 overflow-hidden pointer-events-none">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${isQuran ? "bg-amber-400" : "bg-emerald-500"} transition-[width] duration-100 ease-linear`}
              style={{ width: `${barPct}%` }}
            />
          </div>
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-black/85 ${
              isQuran ? "bg-amber-400" : "bg-emerald-500"
            } shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-[left,transform] duration-100 ease-linear group-active:scale-110`}
            style={{ left: `${barPct}%` }}
          />

          {/* Interactive Range Input with Voice-Matched Golden Thumb for Quran */}
          <input
            type="range"
            min={0}
            max={isAyahSeq && ayahSeq ? ayahSeq.total - 1 : (totalDuration || 1)}
            step={1}
            value={isAyahSeq && ayahSeq ? ayahSeq.index : currentTime}
            onChange={
              isAyahSeq
                ? (e) => {
                    haptic(8);
                    player.jumpToAyah(Number(e.target.value));
                  }
                : handleSeek
            }
            onPointerDown={() => {
              lastScrubAyahRef.current = ayahAtTime(currentTime);
            }}
            aria-label="Progress"
            className="quran-range relative z-20 h-5 w-full cursor-pointer appearance-none bg-transparent"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono font-medium text-sand-300/60">
          {isAyahSeq && juzTiming ? (
            <>
              <span>{formatClock(juzTiming.elapsed)}</span>
              <span>{formatClock(juzTiming.total)}</span>
            </>
          ) : isAyahSeq && ayahSeq ? (
            <>
              <span>Ayah {ayahSeq.index + 1}</span>
              <span>{ayahSeq.total} āyāt</span>
            </>
          ) : (
            <>
              <span>{formatClock(currentTime)}</span>
              <span>{formatClock(totalDuration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Bottom Transport Controls Bar — spread edge to edge below 900px (like the
          compact pill), centred on larger screens */}
      <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
        <VolumeControl active={!collapsed} />

        <button
          type="button"
          onClick={() => { haptic(); (onPrevTrack ?? player.previous)(); }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
          aria-label={prevTrackLabel}
          title={prevTrackLabel}
        >
          <PrevIcon className="text-lg" />
        </button>

        {/* Glowing Emerald Play Button */}
        <button
          type="button"
          onClick={() => { haptic(); handlePlayToggle(); }}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_6px_25px_rgba(16,185,129,0.45)] border border-emerald-300/50 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
          ) : isPlaying ? (
            <PauseIcon className="text-2xl" />
          ) : (
            <PlayIcon className="text-2xl ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => { haptic(); (onNextTrack ?? player.next)(); }}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
          aria-label={nextTrackLabel}
          title={nextTrackLabel}
        >
          <NextIcon className="text-lg" />
        </button>

        <button
          type="button"
          onClick={() => toggleCollapsed(true)}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
          aria-label="Minimize player"
          title="Minimize player"
        >
          <ChevronDownIcon className="text-xl" />
        </button>
      </div>
    </div>
  );

  // Pill radius = half its height; full card keeps its class corners.
  const radius = collapsed && shellSize ? (shellSize.h + 2) / 2 : undefined;
  return (
    <div
      ref={shellRef}
      className={`relative overflow-hidden rounded-[28px] sm:rounded-[40px] bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] select-none motion-reduce:transition-none ${
        animate ? "transition-[width,height,border-radius] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" : ""
      } ${shellSize ? "" : "invisible"}`}
      style={{
        width: shellSize ? shellSize.w + 2 : undefined,
        height: shellSize ? shellSize.h + 2 : undefined,
        borderRadius: radius,
      }}
    >
      {fullView}
      {compactView}
      {/* Hover / focus tooltips for every control (portal — not clipped) */}
      <HoverTooltips container={shellRef} />
      {flight &&
        createPortal(
          <CoverFlight key={flight.id} {...flight} src={coverSrc} onDone={() => setFlight(null)} />,
          document.body,
        )}
    </div>
  );
}

/** Volume button — tap opens a small slider (with mute) above it. The popover
 *  is portalled to <body> so the player shell's overflow clipping can't cut it. */
function VolumeControl({
  buttonClassName = volumeBtn,
  active = true,
}: {
  buttonClassName?: string;
  active?: boolean;
}) {
  const { volume, isMuted, setVolume, toggleMute } = useAudioPlayer();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const silent = isMuted || volume === 0;
  const level = isMuted ? 0 : volume;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const popW = popRef.current?.offsetWidth ?? 170;
      const left = Math.min(Math.max(8, r.left), window.innerWidth - popW - 8);
      setPos({ left, bottom: window.innerHeight - r.top + 8 });
    };
    place();
    const close = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close when this view is hidden (player switched between full / compact).
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const popover = (
    <div
      ref={popRef}
      style={{ left: pos?.left ?? -9999, bottom: pos?.bottom ?? 0 }}
      className={`fixed z-[60] flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15 px-2 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] origin-bottom-left transition-[opacity,transform] duration-200 ease-out ${
        open && pos ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        onClick={() => { haptic(); toggleMute(); }}
        className="grid h-7 w-7 place-items-center rounded-full text-sand-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label={isMuted ? "Unmute" : "Mute"}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {silent ? <MuteIcon className="text-sm" /> : <VolumeIcon className="text-sm" />}
      </button>
      <div className="relative flex items-center h-4 w-28">
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/15 overflow-hidden pointer-events-none">
          <div className="h-full bg-emerald-400" style={{ width: `${level * 100}%` }} />
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={level}
          tabIndex={open ? 0 : -1}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Volume level"
          className="neomorph-range relative z-10 h-1.5 w-full cursor-pointer appearance-none bg-transparent"
        />
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => { haptic(); setOpen((o) => !o); }}
        className={`${buttonClassName} ${open ? "!text-emerald-400" : ""}`}
        aria-label="Volume"
        aria-expanded={open}
        title={silent ? "Muted" : `Volume ${Math.round(volume * 100)}%`}
      >
        {silent ? <MuteIcon className="text-xl" /> : <VolumeIcon className="text-xl" />}
      </button>
      {mounted && createPortal(popover, document.body)}
    </>
  );
}

const volumeBtn =
  "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer";

/** A corner radius capped at half the short side (rounded-full reports 9999px). */
function radiusOf(r: DOMRect, radius: number) {
  return Math.min(radius, Math.min(r.width, r.height) / 2);
}

/** The flying cover copy. Sits at the destination rect and animates in from the
 *  source on three layers (X, Y, scale) with separate easings, so the path curves:
 *    collapse → sideways first, then drops into the play button;
 *    expand   → lifts off the pill first, then drifts across to the artwork slot. */
function CoverFlight({
  from,
  to,
  fromRadius,
  toRadius,
  src,
  expand,
  onDone,
}: {
  from: DOMRect;
  to: DOMRect;
  fromRadius: number;
  toRadius: number;
  src: string | null;
  expand: boolean;
  onDone: () => void;
}) {
  const xRef = useRef<HTMLDivElement>(null);
  const yRef = useRef<HTMLDivElement>(null);
  const sRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const duration = expand ? 620 : 560;
    const fast = "cubic-bezier(0.2, 0.75, 0.3, 1)"; // leads the motion
    const slow = "cubic-bezier(0.55, 0, 0.3, 1)"; // follows
    const anims = [
      xRef.current!.animate(
        [{ transform: `translateX(${dx}px)` }, { transform: "translateX(0)" }],
        { duration, easing: expand ? slow : fast },
      ),
      yRef.current!.animate(
        [{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }],
        { duration, easing: expand ? fast : slow },
      ),
      // The full cover is a rounded rectangle, the compact one a circle — morph
      // size and corners together.
      sRef.current!.animate(
        [
          { width: `${from.width}px`, height: `${from.height}px`, borderRadius: `${radiusOf(from, fromRadius)}px` },
          { width: `${to.width}px`, height: `${to.height}px`, borderRadius: `${radiusOf(to, toRadius)}px` },
        ],
        { duration, easing: "cubic-bezier(0.4, 0, 0.2, 1)" },
      ),
    ];
    let cancelled = false;
    Promise.all(anims.map((an) => an.finished))
      .then(() => !cancelled && onDone())
      .catch(() => undefined);
    return () => {
      cancelled = true;
      anims.forEach((an) => an.cancel());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={xRef}
      aria-hidden="true"
      className="pointer-events-none fixed z-[70] will-change-transform"
      style={{ left: to.left, top: to.top, width: to.width, height: to.height }}
    >
      <div ref={yRef} className="relative h-full w-full will-change-transform">
        <div
          ref={sRef}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-gradient-to-br from-emerald-950 to-slate-900 shadow-[0_12px_30px_rgba(0,0,0,0.6)]"
          style={{ width: to.width, height: to.height, borderRadius: radiusOf(to, toRadius) }}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
          )}
        </div>
      </div>
    </div>
  );
}

const COLLAPSED_KEY = "huda:player-collapsed";
const SMALL_SCREEN = "(max-width: 767px)";

// Views sit bottom-centred inside the shell so it can resize around them.
const viewBase =
  "absolute bottom-0 left-1/2 -translate-x-1/2 transition-[opacity,transform,filter] motion-reduce:transition-none";
const viewShown = "opacity-100 blur-0 duration-300 delay-150 ease-out";
const viewHidden = "pointer-events-none opacity-0 blur-[2px] duration-200 ease-in";

const compactBtn =
  "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer";

/** « » ayah steps inside the Ayat pill — full pill height (36px). */
const pillStepBtn =
  "grid h-full w-9 shrink-0 place-items-center rounded-full text-sand-100 hover:text-white hover:bg-white/10 active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none";
