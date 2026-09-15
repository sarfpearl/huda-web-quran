"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { quranImageUrl } from "@/lib/data/service";
import { resolveSurahVideoPath } from "@/lib/data/surahChapters";
import { getAyahVideo } from "@/lib/data/surahVerseVideos";

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
  const surahImageSrc = quranImageUrl("surah", surahNumber);

  // 1. Resolve active video source:
  //    - propVideoSrc if explicitly given
  //    - Exact Ayah video if available
  //    - Surah chapter or master video fallback (guarantees continuous footage without dropping to null)
  const resolvedVideo = useMemo(() => {
    if (propVideoSrc) return propVideoSrc;
    if (ayahNumber) {
      const ayahVid = getAyahVideo(surahNumber, ayahNumber)?.videoPath;
      if (ayahVid) return ayahVid;
    }
    return resolveSurahVideoPath(surahNumber, currentTime, duration) || null;
  }, [propVideoSrc, ayahNumber, surahNumber, currentTime, duration]);

  // Dual-slot video architecture for 100% seamless, flicker-free crossfading
  const [slotA, setSlotA] = useState<{ src: string | null; loaded: boolean }>({
    src: resolvedVideo,
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

  // When resolvedVideo changes, load it into the idle slot without blanking the active slot
  useEffect(() => {
    if (!resolvedVideo) return;

    const currentSrc = activeSlot === 0 ? slotA.src : slotB.src;
    if (resolvedVideo === currentSrc) return;

    if (activeSlot === 0) {
      setSlotB({ src: resolvedVideo, loaded: false });
    } else {
      setSlotA({ src: resolvedVideo, loaded: false });
    }
  }, [resolvedVideo, activeSlot, slotA.src, slotB.src]);

  // When idle slot is decoded and ready to play, smoothly crossfade to it
  const handleSlotCanPlay = (slotIndex: 0 | 1) => {
    if (slotIndex === 0) {
      setSlotA((prev) => ({ ...prev, loaded: true }));
      if (activeSlot === 1) {
        if (isPlaying && videoRefA.current) {
          videoRefA.current.play().catch(() => {});
        }
        setActiveSlot(0);
      }
    } else {
      setSlotB((prev) => ({ ...prev, loaded: true }));
      if (activeSlot === 0) {
        if (isPlaying && videoRefB.current) {
          videoRefB.current.play().catch(() => {});
        }
        setActiveSlot(1);
      }
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
      {/* 1. Base HD Surah Artwork Layer (Persistent backdrop, zero layout pop) */}
      <AnimatePresence initial={false}>
        <motion.div
          key={`surah-bg-${surahNumber}`}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="absolute inset-0 h-full w-full"
        >
          <Image
            src={surahImageSrc}
            alt=""
            fill
            priority
            unoptimized={true}
            className="object-cover object-center [image-rendering:-webkit-optimize-contrast] contrast-[1.06] saturate-[1.04]"
          />
        </motion.div>
      </AnimatePresence>

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
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
            activeSlot === 0 && slotA.loaded ? "opacity-100 z-[2]" : "opacity-0 z-[1]"
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
          className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
            activeSlot === 1 && slotB.loaded ? "opacity-100 z-[2]" : "opacity-0 z-[1]"
          }`}
        />
      )}

      {/* 4. Atmospheric Contrast Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/15 to-black/45 pointer-events-none" />
    </div>
  );
}
