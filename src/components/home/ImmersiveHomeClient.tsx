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
import { CenterVerseDisplay } from "./CenterVerseDisplay";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  isQuranTrack,
  isQuranTrackId,
  isSurahTrackId,
  getSurahByTrackId,
  SURAH_TRACKS,
  QURAN_SURAHS,
  getSurahTracksForReciter,
  quranSurahToTrack,
  getDefaultReciter,
  getReciterById,
  resolveActiveReciter,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "@/lib/data/service";
import { useQuranVerseSync, getVoiceProgressInVerse } from "@/lib/data/quranVerses";
import { SyncQADebugHUD } from "./SyncQADebugHUD";

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
  const [language, setLanguage] = useState<"en" | "ta">("en");
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter>(getDefaultReciter);

  // Memoize surah tracks for the selected reciter
  const surahTracksForCurrentReciter = useMemo(
    () => getSurahTracksForReciter(selectedReciter),
    [selectedReciter]
  );

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      (window as any).__hudaPlaySurah = (surahNum: number) => {
        const tracks = getSurahTracksForReciter(selectedReciter);
        if (tracks[surahNum - 1]) {
          player.playBayan(tracks[surahNum - 1], tracks);
        }
      };
      setTimeout(() => {
        const overs: string[] = [];
        document.querySelectorAll("*").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right > window.innerWidth + 1) {
            const cls = (el.className && typeof el.className === "string") ? el.className.split(" ")[0] : "";
            overs.push(`${el.tagName}.${cls}:r=${Math.round(r.right)}`);
          }
        });
        document.title = `W=${window.innerWidth},S=${document.documentElement.scrollWidth}: ` + overs.slice(0, 6).join(" | ");
      }, 1000);
    }
    try {
      const saved = localStorage.getItem("huda-visual-mode");
      if (saved === "video" || saved === "image") {
        setVisualMode(saved);
      }
      const savedLang = localStorage.getItem("huda-translation-lang");
      if (savedLang === "en" || savedLang === "ta") {
        setLanguage(savedLang);
      }
      const savedReciterId = localStorage.getItem(RECITER_STORAGE_KEY);
      if (savedReciterId) {
        const found = getReciterById(savedReciterId);
        if (found) {
          setSelectedReciter(found);
        }
      }
    } catch {
      /* ignore */
    }
  }, [player, selectedReciter]);

  // Keep selectedReciter in sync if player.current changes to a Surah track with a different reciter
  useEffect(() => {
    if (player.current && isSurahTrackId(player.current.id)) {
      const active = resolveActiveReciter(player.current);
      if (active.id !== selectedReciter.id) {
        setSelectedReciter(active);
        try {
          localStorage.setItem(RECITER_STORAGE_KEY, active.id);
        } catch {
          /* ignore */
        }
      }
    }
  }, [player.current, selectedReciter.id]);

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
    // Default initial landing: Surah 1 (Al-Fatihah) for active reciter
    return (
      surahTracksForCurrentReciter[0] ??
      SURAH_TRACKS[0] ??
      categoryBayans[0] ??
      allBayan[0] ??
      null
    );
  }, [overrideBayan, player, surahTracksForCurrentReciter, categoryBayans, allBayan]);

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

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "en" ? "ta" : "en";
      try {
        localStorage.setItem("huda-translation-lang", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleSeekToVerse = (targetTimeOrIndex: number) => {
    if (typeof targetTimeOrIndex === "number") {
      player.seek(targetTimeOrIndex);
    }
  };

  const handleSelectReciter = (reciter: QuranReciter) => {
    setSelectedReciter(reciter);
    try {
      localStorage.setItem(RECITER_STORAGE_KEY, reciter.id);
    } catch {
      /* ignore */
    }

    const currentSurahNum =
      activeSurah?.number ??
      (activeBayan && isSurahTrackId(activeBayan.id)
        ? parseInt(activeBayan.id.replace("quran-surah-", ""), 10)
        : 1);
    const targetSurah =
      QURAN_SURAHS.find((s) => s.number === currentSurahNum) ?? QURAN_SURAHS[0];
    const newTrack = quranSurahToTrack(targetSurah, reciter);
    const reciterSurahTracks = getSurahTracksForReciter(reciter);

    // Keep current Ayah position
    const seekTime =
      currentSegment?.startTime ?? (player.currentTime > 0 ? player.currentTime : 0);

    setOverrideBayan(newTrack);

    if (player.isPlaying) {
      player.playBayan(newTrack, reciterSurahTracks);
      if (seekTime > 0) {
        setTimeout(() => player.seek(seekTime), 150);
        setTimeout(() => player.seek(seekTime), 500);
      }
    } else {
      player.cueBayan(newTrack, reciterSurahTracks);
      if (seekTime > 0) {
        setTimeout(() => player.seek(seekTime), 150);
        setTimeout(() => player.seek(seekTime), 500);
      }
    }
  };

  const isJuz = Boolean(activeBayan && isQuranTrackId(activeBayan.id));

  const {
    verses,
    segments,
    activeIndex,
    activeSegmentIndex,
    currentSegment,
    currentVerse,
    voiceProgress,
    activeWord,
    activeWordIndex,
    hasWordTiming,
    timingMode,
    timingSource,
    currentVideo,
    showTranslation,
    setShowTranslation,
    handlePrevVerse,
    handleNextVerse,
    jumpToVerse,
  } = useQuranVerseSync({
    surahNumber: isJuz ? 1 : (activeSurah?.number ?? null),
    categorySlug: activeBayan?.category?.slug || activeCategory.slug,
    currentTime: player.currentTime,
    duration: player.duration,
    isPlaying: player.isPlaying,
    onSeekToVerse: handleSeekToVerse,
    isJuz,
    reciter: selectedReciter,
    isPrelude: player.isPrelude,
    preludeType: player.preludeType,
    preludeCurrentTime: player.preludeCurrentTime,
    preludeDuration: player.preludeDuration,
  });

  return (
    <div className="fixed inset-0 z-10 overflow-hidden bg-slate-950 text-sand-50 select-none">
      {/* Edge-to-Edge Dynamic Scene Background (Category or Verse-Aware Surah Video) */}
      <ImmersiveBackground
        categorySlug={activeBayan?.category?.slug || activeCategory.slug}
        activeSurahNumber={activeSurah?.number ?? null}
        ayahNumber={currentVerse?.ayahNumber ?? null}
        videoSrc={currentVideo}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        duration={player.isPrelude ? player.preludeDuration : player.duration}
        isPlaying={player.isPlaying}
        visualMode={visualMode}
      />

      {/* Voice-Primary Audio Synchronization QA Monitor */}
      <SyncQADebugHUD
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        activeSurah={activeSurah}
        currentVerse={currentVerse}
        currentSegment={currentSegment}
        activeVerseIndex={activeIndex}
        totalVerses={verses.length}
        voiceProgress={voiceProgress}
        activeWord={activeWord}
        selectedReciter={selectedReciter}
        timingMode={timingMode}
        timingSource={timingSource}
      />

      {/* Center Quran Verses Stage (Pure Arabic Calligraphy + English/Tamil Translation) */}
      <CenterVerseDisplay
        currentVerse={currentVerse}
        currentSegment={currentSegment}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        isPlaying={player.isPlaying}
        language={language}
        showTranslation={showTranslation}
        onPrevVerse={handlePrevVerse}
        onNextVerse={handleNextVerse}
        hasMultipleVerses={verses.length > 1}
        activeWordIndex={activeWordIndex}
        hasWordTiming={hasWordTiming}
      />

      {/* Floating Top Header with Top-Right Hamburger Menu & Mode Toggle */}
      <ImmersiveHeader
        onShuffle={handleShuffle}
        visualMode={visualMode}
        onToggleVisualMode={handleToggleVisualMode}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        selectedReciter={selectedReciter}
        onSelectReciter={handleSelectReciter}
        isQuranActive={Boolean(activeSurah || (activeBayan && isQuranTrackId(activeBayan.id)))}
      >
        <TopicPickerModal
          categories={categories}
          speakers={speakers}
          allBayan={allBayan}
          surahTracks={surahTracksForCurrentReciter}
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
          {/* Compact Integrated Glassmorphism Player with Ayah Controls */}
          {activeBayan && (
            <CompactBayanPlayer
              bayan={activeBayan}
              categoryList={categoryBayans}
              surahTracks={surahTracksForCurrentReciter}
              onShuffleCategory={handleShuffle}
              activeSurah={activeSurah}
              currentVerse={currentVerse}
              currentSegment={currentSegment}
              segments={segments}
              totalVerses={activeSurah?.verses ?? verses.length}
              activeVerseIndex={activeIndex}
              language={language}
              onToggleLanguage={handleToggleLanguage}
              showTranslation={showTranslation}
              onToggleShowTranslation={() => setShowTranslation((prev) => !prev)}
              onSeekToVerse={jumpToVerse}
            />
          )}
        </div>
      </div>
    </div>
  );
}
