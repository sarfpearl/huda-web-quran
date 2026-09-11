"use client";

import { useEffect, useRef, useState } from "react";
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // 1. Resolve verse-level real footage ONLY (Zero fallbacks to legacy AI or unrelated videos)
  const resolvedVideo = typeof propVideoSrc !== "undefined"
    ? propVideoSrc
    : ayahNumber
    ? getAyahVideo(surahNumber, ayahNumber)?.videoPath || null
    : null;
  const videoSrc = resolvedVideo;

  // Reset states when video source changes
  useEffect(() => {
    setVideoError(false);
    setVideoReady(false);
  }, [videoSrc]);

  // Sync video play/pause state with master audio player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoError) return;

    if (isPlaying) {
      video.play().catch(() => {
        /* autoplay policies handled silently */
      });
    } else {
      video.pause();
    }
  }, [isPlaying, videoError, videoSrc]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-slate-950">
      {/* 1. Base HD Surah Artwork Layer (Always present as instant poster/fallback) */}
      <AnimatePresence mode="popLayout" initial={false}>
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

      {/* 2. Seamless Cinematic Real-Footage Video Layer with Soft Crossfade */}
      {!videoError && videoSrc && (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={videoSrc}
            initial={{ opacity: 0 }}
            animate={{ opacity: videoReady ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full"
          >
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
              className="h-full w-full object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
      )}

      {/* 3. Atmospheric Contrast Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/45 pointer-events-none" />
    </div>
  );
}
