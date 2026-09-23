"use client";

import { useEffect, useRef, useState } from "react";
import { getJuzVideoPath } from "@/lib/data/quranJuzVideos";

interface JuzCinematicBackgroundProps {
  juzNumber: number;
  isPlaying?: boolean;
}

export function JuzCinematicBackground({
  juzNumber,
  isPlaying = false,
}: JuzCinematicBackgroundProps) {
  const videoSrc = getJuzVideoPath(juzNumber);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setVideoLoaded(false);
    setHasError(false);
  }, [videoSrc]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasError) return;

    if (isPlaying) {
      video.play().catch(() => {
        /* autoplay handled */
      });
    } else {
      video.pause();
    }
  }, [isPlaying, hasError, videoLoaded]);

  if (!videoSrc || hasError) {
    return null;
  }

  return (
    // NOTE: no opaque background here — the identical bespoke Juz artwork is rendered
    // directly behind this layer (see ImmersiveBackground). Keeping this layer transparent
    // lets that still fill the ~8ms decode gap at every loop seek, so the loop wrap no
    // longer flashes black.
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay={isPlaying}
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoLoaded(true)}
        onError={() => setHasError(true)}
        className={`h-full w-full object-cover object-center transition-opacity duration-700 ease-in-out ${
          videoLoaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Atmospheric Contrast Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/15 to-black/45 pointer-events-none" />
    </div>
  );
}
