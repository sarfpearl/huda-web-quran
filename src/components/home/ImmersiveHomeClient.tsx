"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import type { BayanWithRelations } from "@/types/bayan";
import { ImmersiveBackground } from "./ImmersiveBackground";
import { ImmersiveHeader } from "./ImmersiveHeader";
import { CompactBayanPlayer } from "./CompactBayanPlayer";
import { TopicPickerModal } from "./TopicPickerModal";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  isQuranTrack,
  isSurahTrackId,
  getSurahByTrackId,
  SURAH_TRACKS,
} from "@/lib/data/service";

interface ImmersiveHomeClientProps {
  categories: Category[];
  allBayan: BayanWithRelations[];
  speakers?: Speaker[];
}

export function ImmersiveHomeClient({
  categories,
  allBayan,
  speakers = [],
}: ImmersiveHomeClientProps) {
  const player = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  const [visualMode, setVisualMode] = useState<"video" | "image">("video");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("huda-visual-mode");
      if (saved === "video" || saved === "image") {
        setVisualMode(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Initial category: default to 'quran' or 'iman-taqwa'
  const defaultCategory =
    categories.find((c) => c.slug === "quran" || c.slug === "quran-recitation") ??
    categories.find((c) => c.slug === "iman-taqwa") ??
    categories[0] ?? {
      id: "iman-taqwa",
      name: "Iman & Taqwa",
      slug: "iman-taqwa",
      nameTa: "ஈமான் & தக்வா",
      description: "Strengthen your faith, devotion, and mindfulness of Allah.",
      icon: "heart",
      coverImageUrl: null,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

  const [activeCategory, setActiveCategory] = useState<Category>(
    () => defaultCategory
  );

  const [overrideBayan, setOverrideBayan] = useState<BayanWithRelations | null>(null);

  // Filter Bayans belonging to current active category
  const categoryBayans = useMemo(() => {
    const list = allBayan.filter((b) => b.categoryId === activeCategory.id);
    return list.length > 0 ? list : allBayan;
  }, [allBayan, activeCategory.id]);

  // Selected track (defaults to Surah 1: Al-Fatihah, or active player track / category track)
  const activeBayan = useMemo(() => {
    if (player.current) {
      return player.current;
    }
    if (overrideBayan) return overrideBayan;
    // Default initial landing: Surah 1 (Al-Fatihah)
    return SURAH_TRACKS[0] ?? categoryBayans[0] ?? allBayan[0] ?? null;
  }, [overrideBayan, player, categoryBayans, allBayan]);

  // Resolve active Surah metadata if activeBayan is a Surah track
  const activeSurah = useMemo(() => {
    if (activeBayan && isSurahTrackId(activeBayan.id)) {
      return getSurahByTrackId(activeBayan.id) ?? null;
    }
    return null;
  }, [activeBayan]);

  const handleSelectCategory = (category: Category) => {
    setOverrideBayan(null);
    setActiveCategory(category);
    const newCategoryBayans = allBayan.filter((b) => b.categoryId === category.id);
    const targetBayan = newCategoryBayans[0] ?? allBayan[0];

    // If audio is currently playing, smoothly transition audio to new category's top track
    if (player.isPlaying && targetBayan) {
      player.playBayan(targetBayan, newCategoryBayans);
    }
  };

  const handleSelectSpeaker = (speaker: Speaker) => {
    const speakerBayans = allBayan.filter((b) => b.speakerId === speaker.id);
    if (speakerBayans.length > 0) {
      const targetBayan = speakerBayans[0];
      setOverrideBayan(targetBayan);
      setActiveCategory(targetBayan.category);
      if (player.isPlaying) {
        player.playBayan(targetBayan, speakerBayans);
      }
    }
  };

  const handleSelectBayan = (bayan: BayanWithRelations) => {
    setOverrideBayan(bayan);
    setActiveCategory(bayan.category);
    player.playBayan(bayan, allBayan);
  };

  const handleShuffle = () => {
    if (categories.length === 0) return;
    const randomIndex = Math.floor(Math.random() * categories.length);
    const randomCat = categories[randomIndex];
    handleSelectCategory(randomCat);
  };

  const handleToggleVisualMode = () => {
    setVisualMode((prev) => {
      const next = prev === "video" ? "image" : "video";
      try {
        localStorage.setItem("huda-visual-mode", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-slate-950 text-sand-50 select-none">
      {/* Edge-to-Edge Dynamic Scene Background (Category or Verse-Aware Surah Video) */}
      <ImmersiveBackground
        categorySlug={activeBayan?.category?.slug || activeCategory.slug}
        activeSurahNumber={activeSurah?.number ?? null}
        currentTime={player.currentTime}
        duration={player.duration}
        isPlaying={player.isPlaying}
        visualMode={visualMode}
      />

      {/* Bismillah Calligraphy — Top Center */}
      <p className="pointer-events-none absolute top-[5.5rem] sm:top-5 left-1/2 -translate-x-1/2 z-30 w-full px-6 sm:px-24 text-center font-arabic text-2xl sm:text-3xl md:text-4xl font-extrabold text-amber-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>

      {/* Floating Top Header with Top-Right Hamburger Menu & Mode Toggle */}
      <ImmersiveHeader
        onShuffle={handleShuffle}
        visualMode={visualMode}
        onToggleVisualMode={handleToggleVisualMode}
      >
        <TopicPickerModal
          categories={categories}
          speakers={speakers}
          allBayan={allBayan}
          activeCategorySlug={activeCategory.slug}
          onSelectCategory={handleSelectCategory}
          onSelectSpeaker={handleSelectSpeaker}
          onSelectBayan={handleSelectBayan}
          onShuffle={handleShuffle}
        />
      </ImmersiveHeader>

      {/* Bottom Floating Player */}
      <div className="absolute bottom-4 sm:bottom-6 inset-x-0 z-40 flex flex-col items-center px-4 pointer-events-none">
        <div className="pointer-events-auto">
          {/* Compact Integrated Glassmorphism Player */}
          {activeBayan && (
            <CompactBayanPlayer
              bayan={activeBayan}
              categoryList={categoryBayans}
              onShuffleCategory={handleShuffle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
