"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BayanWithRelations } from "@/types/bayan";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { CoverArt } from "@/components/ui/CoverArt";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  HeartIcon,
  PlaylistAddIcon,
  ShareIcon,
  ShuffleIcon,
  RepeatIcon,
  EqualizerIcon,
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
} from "@/lib/data/service";

interface CompactBayanPlayerProps {
  bayan: BayanWithRelations;
  categoryList?: BayanWithRelations[];
  onShuffleCategory?: () => void;
}

export function CompactBayanPlayer({
  bayan,
  categoryList,
  onShuffleCategory,
}: CompactBayanPlayerProps) {
  const player = useAudioPlayer();
  const isCurrentTrack = player.current?.id === bayan.id;
  const isPlaying = isCurrentTrack && player.isPlaying;
  const isLoading = isCurrentTrack && player.isLoading;
  const errorMsg = isCurrentTrack ? player.error : null;
  const isQuran = isQuranTrack(bayan.id);
  const surah = isSurahTrackId(bayan.id) ? getSurahByTrackId(bayan.id) : undefined;

  const [coverSrc, setCoverSrc] = useState<string | null>(bayan.coverImageUrl ?? null);

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
        : quranContentLabel(bayan.id) ?? bayan.category.name)
    : bayan.category.name;
  const currentTime = isCurrentTrack ? player.currentTime : 0;
  const totalDuration = isCurrentTrack && player.duration > 0
    ? player.duration
    : bayan.durationSeconds;

  const handlePlayToggle = () => {
    if (isCurrentTrack) {
      player.togglePlay();
    } else {
      const contextList = isSurahTrackId(bayan.id)
        ? SURAH_TRACKS
        : isQuranTrackId(bayan.id)
        ? QURAN_TRACKS
        : categoryList;
      player.playBayan(bayan, contextList);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (isCurrentTrack) {
      player.seek(val);
    } else {
      const contextList = isSurahTrackId(bayan.id)
        ? SURAH_TRACKS
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
      playRandomFrom(SURAH_TRACKS);
    } else if (isQuranTrackId(bayan.id)) {
      playRandomFrom(QURAN_TRACKS);
    } else {
      onShuffleCategory?.();
    }
  };

  return (
    <div className="relative w-[94dvw] sm:w-[80dvw] max-w-[680px] rounded-[40px] overflow-hidden bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] px-6 py-5 sm:px-10 sm:py-6 transition-all select-none">
      {/* iOS Liquid Glass surface — single unified glass (Glass.svg tint + inner-shadow rim) */}
      {/* Upper Section — Artwork + Track Info + Action Buttons */}
      <div className="relative flex items-center justify-between gap-4 sm:gap-5">
        {/* Cover Artwork */}
        <div className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-emerald-950 to-slate-900 shadow-md border border-emerald-500/30">
          {coverSrc ? (
            <Image
              src={coverSrc}
              alt={bayan.title}
              fill
              unoptimized={true}
              priority
              className="object-cover [image-rendering:-webkit-optimize-contrast] contrast-[1.06] saturate-[1.04]"
              onError={() => setCoverSrc("/images/scenes/quran.jpg")}
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
          {errorMsg && (
            <span className="truncate text-[11px] font-medium text-red-400 mt-1" role="alert">
              {errorMsg}
            </span>
          )}
        </div>

        {/* Right Vertical Action Stack */}
        <div className="flex flex-col gap-2.5 shrink-0">
          <button
            type="button"
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-black/40 text-emerald-400 border border-white/10 hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
            aria-label="Favorite"
          >
            <HeartIcon className="text-xs sm:text-sm" />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-black/40 text-sand-300 border border-white/10 hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
            aria-label="Add to Queue"
          >
            <PlaylistAddIcon className="text-xs sm:text-sm" />
          </button>
          <button
            type="button"
            className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-black/40 text-sand-300 border border-white/10 hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
            aria-label="Share"
          >
            <ShareIcon className="text-xs sm:text-sm" />
          </button>
        </div>
      </div>

      {/* Lower Section — Audio Progress Slider & Time Labels */}
      <div className="mt-5 px-1">
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalDuration || 1}
            step={1}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Progress"
            className="neomorph-range h-2.5 w-full cursor-pointer appearance-none rounded-full"
            style={{
              background: `linear-gradient(to right, #10b981 ${
                (currentTime / (totalDuration || 1)) * 100
              }%, rgba(0,0,0,0.4) ${
                (currentTime / (totalDuration || 1)) * 100
              }%)`,
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs font-mono font-medium text-sand-300/60">
          <span>{formatClock(currentTime)}</span>
          <span>{formatClock(totalDuration)}</span>
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="mt-4 flex items-center justify-center gap-1.5 sm:justify-between sm:gap-0 px-1 sm:px-2">
        <button
          type="button"
          onClick={handleShuffle}
          title={
            isSurahTrackId(bayan.id)
              ? "Play a random Surah"
              : isQuranTrackId(bayan.id)
              ? "Play a random Juz"
              : "Random Category / Shuffle"
          }
          className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-sand-300/50 hover:bg-black/60 hover:text-emerald-400 active:scale-90 transition-all cursor-pointer"
          aria-label={
            isSurahTrackId(bayan.id)
              ? "Shuffle Surah"
              : isQuranTrackId(bayan.id)
              ? "Shuffle Juz"
              : "Shuffle Category"
          }
        >
          <ShuffleIcon className="text-sm" />
        </button>

        <button
          type="button"
          className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-sand-300/50 hover:bg-black/60 hover:text-white transition-all active:scale-90 cursor-pointer"
          aria-label="Repeat"
        >
          <RepeatIcon className="text-sm" />
        </button>

        {/* Center Primary Transport Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={player.previous}
            className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
            aria-label="Previous"
          >
            <PrevIcon className="text-sm" />
          </button>

          {/* Glowing Emerald Play Button */}
          <button
            type="button"
            onClick={handlePlayToggle}
            className="grid h-14 w-14 sm:h-15 sm:w-15 shrink-0 place-items-center rounded-full bg-emerald-500 text-slate-950 shadow-[0_6px_25px_rgba(16,185,129,0.45)] border border-emerald-300/50 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : isPlaying ? (
              <PauseIcon className="text-lg" />
            ) : (
              <PlayIcon className="text-lg ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={player.next}
            className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/40 text-sand-100 border border-white/10 hover:text-white hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
            aria-label="Next"
          >
            <NextIcon className="text-sm" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            const rates = [1, 1.25, 1.5, 2];
            const nextIdx = (rates.indexOf(player.playbackRate) + 1) % rates.length;
            player.setPlaybackRate?.(rates[nextIdx]);
          }}
          className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-sand-300/50 hover:bg-black/60 hover:text-white transition-all active:scale-90 cursor-pointer"
          aria-label="Speed"
        >
          <EqualizerIcon className="text-sm" />
        </button>

        <button
          type="button"
          onClick={() => {
            const rates = [1, 1.25, 1.5, 2];
            const nextIdx = (rates.indexOf(player.playbackRate) + 1) % rates.length;
            player.setPlaybackRate?.(rates[nextIdx]);
          }}
          aria-label="Playback Speed"
          className="grid h-8 w-8 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full bg-black/40 border border-white/10 text-[10px] font-bold text-emerald-400 hover:bg-black/60 active:scale-90 transition-all cursor-pointer"
        >
          {player.playbackRate}x
        </button>
      </div>
    </div>
  );
}
