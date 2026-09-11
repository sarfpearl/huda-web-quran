"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { SurahCinematicBackground } from "./SurahCinematicBackground";
import { quranImageUrl } from "@/lib/data/service";

interface ImmersiveBackgroundProps {
  categorySlug: string;
  activeSurahNumber?: number | null;
  ayahNumber?: number | null;
  videoSrc?: string | null;
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  visualMode?: "video" | "image";
}

export function ImmersiveBackground({
  categorySlug,
  activeSurahNumber,
  ayahNumber = null,
  videoSrc = null,
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
          ayahNumber={ayahNumber}
          videoSrc={videoSrc}
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
    "iman-taqwa": "/assets/images/bayan/iman-taqwa.jpg",
    "quran": "/assets/images/bayan/quran.jpg",
    "quran-recitation": "/assets/images/bayan/quran.jpg",
    "salah": "/assets/images/bayan/salah.jpg",
    "ramadan": "/assets/images/bayan/ramadan.jpg",
    "dua": "/assets/images/bayan/dua.jpg",
    "hajj-umrah": "/assets/images/bayan/hajj-umrah.jpg",
    "akhlaq": "/assets/images/bayan/akhlaq.jpg",
    "self-improvement": "/assets/images/bayan/self-improvement.jpg",
    "womens-topics": "/assets/images/bayan/womens-topics.jpg",
    "family": "/assets/images/bayan/family.jpg",
    "marriage": "/assets/images/bayan/marriage.jpg",
    "parenting": "/assets/images/bayan/parenting.jpg",
    "youth": "/assets/images/bayan/youth.jpg",
    "death-akhirah": "/assets/images/bayan/death-akhirah.jpg",
    "islamic-history": "/assets/images/bayan/islamic-history.jpg",
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
