"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { resolveSurahVideoPath, getSurahVisualData } from "@/lib/data/surahChapters";
import { getAyahVideo } from "@/lib/data/surahVerseVideos";
import { quranImageUrl } from "@/lib/data/quran";

interface SurahCinematicBackgroundProps {
  surahNumber: number;
  ayahNumber?: number | null;
  videoSrc?: string | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
}

export function SurahCinematicBackground({
  surahNumber,
  ayahNumber = null,
  videoSrc: propVideoSrc,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
}: SurahCinematicBackgroundProps) {
  // 1. Resolve active video source:
  //    - propVideoSrc if explicitly given
  //    - Exact Ayah video if available
  //    - Thematic chapter matching active Ayah
  //    - Continuous playback chapter or master video fallback
  const resolvedVideo = useMemo(() => {
    if (propVideoSrc) return propVideoSrc;
    if (ayahNumber) {
      const ayahVid = getAyahVideo(surahNumber, ayahNumber)?.videoPath;
      if (ayahVid) return ayahVid;

      const surahData = getSurahVisualData(surahNumber);
      const chapterForVerse = surahData.chapters.find(
        (c) => ayahNumber >= c.fromVerse && ayahNumber <= c.toVerse
      );
      if (chapterForVerse?.videoPath) return chapterForVerse.videoPath;
    }
    return resolveSurahVideoPath(surahNumber, currentTime, duration) || null;
  }, [propVideoSrc, ayahNumber, surahNumber, currentTime, duration]);

  // Only commit a clip once it has stayed wanted briefly — rapid ayah stepping
  // or a transient ayah value must not start a crossfade per step.
  const [stableVideo, setStableVideo] = useState<string | null>(resolvedVideo);
  useEffect(() => {
    if (resolvedVideo === stableVideo) return;
    const t = setTimeout(() => setStableVideo(resolvedVideo), 350);
    return () => clearTimeout(t);
  }, [resolvedVideo, stableVideo]);

  // Dual-slot video architecture for 100% seamless, flicker-free crossfading
  const [slotA, setSlotA] = useState<{ src: string | null; loaded: boolean }>({
    src: stableVideo,
    loaded: false,
  });
  const [slotB, setSlotB] = useState<{ src: string | null; loaded: boolean }>({
    src: null,
    loaded: false,
  });
  // activeSlot: 0 = Slot A is active, 1 = Slot B is active
  const [activeSlot, setActiveSlot] = useState<0 | 1>(0);

  const videoRefA = useRef<HTMLVideoElement | null>(null);
  const videoRefB = useRef<HTMLVideoElement | null>(null);

  // When stableVideo changes, load it into the idle slot without blanking the active slot
  useEffect(() => {
    if (!stableVideo) return;

    const currentSrc = activeSlot === 0 ? slotA.src : slotB.src;
    if (stableVideo === currentSrc) return;

    // The idle slot may already hold this clip (e.g. stepping back to the
    // previous one). Its src won't change, so `canplay` won't fire again —
    // reuse it directly instead of resetting it to "not loaded" forever.
    const idle = activeSlot === 0 ? slotB : slotA;
    const idleVideo = activeSlot === 0 ? videoRefB.current : videoRefA.current;
    if (idle.src === stableVideo) {
      if (idle.loaded || (idleVideo && idleVideo.readyState >= 3)) {
        if (!idle.loaded) (activeSlot === 0 ? setSlotB : setSlotA)((prev) => ({ ...prev, loaded: true }));
        if (isPlaying && idleVideo) idleVideo.play().catch(() => {});
        setActiveSlot(activeSlot === 0 ? 1 : 0);
      }
      return;
    }

    if (activeSlot === 0) {
      setSlotB({ src: stableVideo, loaded: false });
    } else {
      setSlotA({ src: stableVideo, loaded: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableVideo, activeSlot, slotA.src, slotB.src]);

  // The src we actually want on screen. A slot may only take over if it holds
  // this src — otherwise a hidden, looping slot re-firing `canplay` would flip
  // the background back to the previous clip (visible as flicker).
  const wantedSrcRef = useRef<string | null>(stableVideo);
  wantedSrcRef.current = stableVideo;

  // When idle slot is decoded and ready to play, smoothly crossfade to it
  const handleSlotCanPlay = (slotIndex: 0 | 1) => {
    const slot = slotIndex === 0 ? slotA : slotB;
    const video = slotIndex === 0 ? videoRefA.current : videoRefB.current;
    if (!slot.loaded) {
      (slotIndex === 0 ? setSlotA : setSlotB)((prev) => ({ ...prev, loaded: true }));
    }
    if (activeSlot === slotIndex || slot.src !== wantedSrcRef.current) return;
    if (isPlaying && video) video.play().catch(() => {});
    setActiveSlot(slotIndex);
  };

  // A clip can finish buffering before React attaches onCanPlay (SSR/hydration,
  // cached files) — then the event is missed and the slot stays hidden. Catch
  // up from readyState whenever a slot is waiting.
  useEffect(() => {
    if (slotA.src && !slotA.loaded && (videoRefA.current?.readyState ?? 0) >= 3) handleSlotCanPlay(0);
    if (slotB.src && !slotB.loaded && (videoRefB.current?.readyState ?? 0) >= 3) handleSlotCanPlay(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotA.src, slotA.loaded, slotB.src, slotB.loaded, activeSlot]);

  // Once the incoming clip has faded in, pause the outgoing one so it stops
  // looping (and decoding) underneath.
  useEffect(() => {
    const outgoing = activeSlot === 0 ? videoRefB.current : videoRefA.current;
    if (!outgoing) return;
    const t = setTimeout(() => outgoing.pause(), 750);
    return () => clearTimeout(t);
  }, [activeSlot]);

  // Safety net: the ACTIVE clip must never sit paused while audio plays (a
  // browser/media interruption during a track switch left a frozen black
  // first frame). The outgoing clip is paused on purpose and is ignored.
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const activeSlotRef = useRef(activeSlot);
  activeSlotRef.current = activeSlot;
  const resumeIfActive = (slotIndex: 0 | 1) => {
    const v = slotIndex === 0 ? videoRefA.current : videoRefB.current;
    if (v && isPlayingRef.current && activeSlotRef.current === slotIndex) {
      v.play().catch(() => {});
    }
  };

  // Sync play/pause with master audio player
  useEffect(() => {
    const activeVideo = activeSlot === 0 ? videoRefA.current : videoRefB.current;
    if (!activeVideo) return;

    if (isPlaying) {
      activeVideo.play().catch(() => {});
    } else {
      activeVideo.pause();
    }
  }, [isPlaying, activeSlot]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      {/* 1. Surah artwork backdrop: the clips are large (~20 MB) and stay hidden
          until they can play, so without this the scene is black for seconds on
          first open. The video fades in over it once buffered. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={quranImageUrl("surah", surahNumber)}
        alt=""
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 z-0 h-full w-full object-cover object-center"
      />

      {/* 2. Video Slot A */}
      {slotA.src && (
        <video
          ref={videoRefA}
          src={slotA.src}
          autoPlay={isPlaying}
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => handleSlotCanPlay(0)}
          onPause={() => resumeIfActive(0)}
          className={`absolute inset-0 h-full w-full object-cover object-center ${
            // active: fades in on top · loaded outgoing: stays opaque beneath
            // (no dark dip mid-fade) · still loading: hidden
            activeSlot === 0 && slotA.loaded
              ? "opacity-100 z-[2] transition-opacity duration-700 ease-in-out"
              : slotA.loaded
              ? "opacity-100 z-[1]"
              : "opacity-0 z-[1]"
          }`}
        />
      )}

      {/* 3. Video Slot B */}
      {slotB.src && (
        <video
          ref={videoRefB}
          src={slotB.src}
          autoPlay={isPlaying}
          loop
          muted
          playsInline
          preload="auto"
          onCanPlay={() => handleSlotCanPlay(1)}
          onPause={() => resumeIfActive(1)}
          className={`absolute inset-0 h-full w-full object-cover object-center ${
            // active: fades in on top · loaded outgoing: stays opaque beneath
            // (no dark dip mid-fade) · still loading: hidden
            activeSlot === 1 && slotB.loaded
              ? "opacity-100 z-[2] transition-opacity duration-700 ease-in-out"
              : slotB.loaded
              ? "opacity-100 z-[1]"
              : "opacity-0 z-[1]"
          }`}
        />
      )}

      {/* 4. Atmospheric Contrast Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/15 to-black/45 pointer-events-none" />
    </div>
  );
}
