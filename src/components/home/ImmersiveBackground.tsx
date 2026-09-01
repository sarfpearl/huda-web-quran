"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { SurahCinematicBackground } from "./SurahCinematicBackground";
import { quranImageUrl } from "@/lib/data/service";

interface ImmersiveBackgroundProps {
  categorySlug: string;
  activeSurahNumber?: number | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  visualMode?: "video" | "image";
}

export function ImmersiveBackground({
  categorySlug,
  activeSurahNumber,
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  visualMode = "video",
}: ImmersiveBackgroundProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. If a Surah is active and in VIDEO mode: render cinematic video background
  if (activeSurahNumber && visualMode === "video") {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        <SurahCinematicBackground
          surahNumber={activeSurahNumber}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
        />
      </div>
    );
  }

  // 2. If a Surah is active and in IMAGE mode: render crisp static HD artwork
  if (activeSurahNumber && visualMode === "image") {
    const surahImageSrc = quranImageUrl("surah", activeSurahNumber);
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`surah-img-${activeSurahNumber}`}
            initial={mounted ? { opacity: 0, scale: 1.02 } : false}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/45 pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={categorySlug}
          initial={mounted ? { opacity: 0, scale: 1.04 } : false}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
          className="absolute inset-0 h-full w-full"
        >
          <SceneElements categorySlug={categorySlug} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SceneElements({ categorySlug }: { categorySlug: string }) {
  const sceneImages: Record<string, string> = {
    "iman-taqwa": "/images/scenes/iman-taqwa.jpg",
    "quran": "/images/scenes/quran.jpg",
    "quran-recitation": "/images/scenes/quran.jpg",
    "salah": "/images/scenes/salah.jpg",
    "ramadan": "/images/scenes/ramadan.jpg",
    "dua": "/images/scenes/dua.jpg",
    "hajj-umrah": "/images/scenes/hajj-umrah.jpg",
    "akhlaq": "/images/scenes/akhlaq.jpg",
    "self-improvement": "/images/scenes/self-improvement.jpg",
    "womens-topics": "/images/scenes/womens-topics.jpg",
    "family": "/images/scenes/family.jpg",
    "marriage": "/images/scenes/marriage.jpg",
    "parenting": "/images/scenes/parenting.jpg",
    "youth": "/images/scenes/youth.jpg",
    "death-akhirah": "/images/scenes/death-akhirah.jpg",
    "islamic-history": "/images/scenes/islamic-history.jpg",
  };

  const imageSrc = sceneImages[categorySlug];

  if (imageSrc) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          className="object-cover object-center"
        />
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-[#02130e] via-[#05261d] to-[#010906]">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:32px_32px]" />
    </div>
  );
}
