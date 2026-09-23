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
  getQuranJuzByTrackId,
  SURAH_TRACKS,
  QURAN_SURAHS,
  QURAN_TRACKS,
  getSurahTracksForReciter,
  quranSurahToTrack,
  quranJuzToTrackForReciter,
  buildJuzAyahUrls,
  getJuzAyahPairs,
  getDefaultReciter,
  getReciterById,
  reciterHasWordTiming,
  resolveActiveReciter,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "@/lib/data/service";
import { useQuranVerseSync, getVoiceProgressInVerse, fetchSurahVerses, type AyahVerse } from "@/lib/data/quranVerses";
import { SyncQADebugHUD } from "./SyncQADebugHUD";

interface ImmersiveHomeClientProps {
  categories: Category[];
  allBayan: BayanWithRelations[];
  speakers?: Speaker[];
}

/**
 * The Surah each Juz begins in (many Juz start mid-surah). Only Maher has a
 * dedicated 30-Juz recording; when the listener picks another reciter for a
 * Juz we continue in that reciter's voice from the Juz's starting Surah,
 * rather than resetting to Al-Fatihah.
 */
const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

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

  // Load persisted preferences ONCE on mount. This must NOT depend on
  // `selectedReciter`: re-running it re-applies the saved reciter from
  // localStorage, which fights the track-sync effect below (that forces the
  // Juz reciter) and produces an infinite setSelectedReciter render loop —
  // the reciter avatar was remounting thousands of times/sec on Juz tracks.
  useEffect(() => {
    setMounted(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose the debug play helper with the current reciter. Separate from the
  // mount-init effect so it can track `selectedReciter` without ever calling
  // setSelectedReciter (which would re-introduce the loop above).
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__hudaPlaySurah = (surahNum: number) => {
      const tracks = getSurahTracksForReciter(selectedReciter);
      if (tracks[surahNum - 1]) {
        player.playBayan(tracks[surahNum - 1], tracks);
      }
    };
  }, [player, selectedReciter]);

  // Keep selectedReciter in sync if player.current changes to a Surah track with a different reciter, or a Quran Juz track
  useEffect(() => {
    if (player.current && (isSurahTrackId(player.current.id) || isQuranTrackId(player.current.id))) {
      const active = resolveActiveReciter(player.current);
      if (active.id !== selectedReciter.id) {
        setSelectedReciter(active);
        // Only persist Surah reciter preference (do not overwrite saved Surah reciter with Juz reciter)
        if (isSurahTrackId(player.current.id)) {
          try {
            localStorage.setItem(RECITER_STORAGE_KEY, active.id);
          } catch {
            /* ignore */
          }
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
  // Current ayah's text + translation while a Juz plays per-ayah (word-sync reciter).
  const [juzAyahVerse, setJuzAyahVerse] = useState<AyahVerse | null>(null);

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

  // Resolve active Juz metadata if activeBayan is a Quran Juz track
  const activeJuz = useMemo(() => {
    if (activeBayan && isQuranTrackId(activeBayan.id)) {
      return getQuranJuzByTrackId(activeBayan.id) ?? null;
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
    if (reciter.id === selectedReciter.id) return;

    const isPlayingJuz = Boolean(activeBayan && isQuranTrackId(activeBayan.id));

    setSelectedReciter(reciter);
    try {
      localStorage.setItem(RECITER_STORAGE_KEY, reciter.id);
    } catch {
      /* ignore */
    }

    // ── Changing reciter while a JUZ is playing ──────────────────────────
    if (isPlayingJuz && activeJuz) {
      // Maher has the authentic dedicated full-Juz recording — restore it.
      if (reciter.id === "maher") {
        const juzTrack = QURAN_TRACKS[activeJuz.id - 1];
        if (juzTrack) {
          if (player.isPlaying) player.playBayan(juzTrack, QURAN_TRACKS);
          else player.cueBayan(juzTrack, QURAN_TRACKS);
          return;
        }
      }
      // Other reciters: stream the Juz's EXACT ayahs in their voice, chained
      // ayah-by-ayah from everyayah.com — same Juz, different reciter. If a
      // per-ayah sequence is already playing, resume at the SAME ayah in the new
      // voice instead of restarting from the first ayah.
      const ayahUrls = buildJuzAyahUrls(activeJuz.id, reciter.id);
      if (ayahUrls && ayahUrls.length > 0) {
        const resumeIndex = player.ayahSequence?.index ?? 0;
        const startUrl = ayahUrls[Math.min(resumeIndex, ayahUrls.length - 1)] ?? ayahUrls[0];
        const displayTrack = quranJuzToTrackForReciter(activeJuz, reciter, startUrl);
        player.playAyahSequence(displayTrack, ayahUrls, resumeIndex);
        return;
      }
      // Reciter has no per-ayah audio → fall through to whole-surah playback
      // starting at this Juz's first Surah.
    }

    // Which Surah to (re)start from in the new reciter's voice:
    //  - Playing a Juz (no per-ayah audio for this reciter) → the Juz's own
    //    starting Surah, instead of jumping to Al-Fatihah.
    //  - Playing a Surah → the same Surah (keep the listener's place).
    const currentSurahNum = isPlayingJuz
      ? (activeJuz ? (JUZ_START_SURAH[activeJuz.id] ?? 1) : 1)
      : (activeSurah?.number ??
        (activeBayan && isSurahTrackId(activeBayan.id)
          ? parseInt(activeBayan.id.replace("quran-surah-", ""), 10)
          : 1));
    const targetSurah =
      QURAN_SURAHS.find((s) => s.number === currentSurahNum) ?? QURAN_SURAHS[0];
    const newTrack = quranSurahToTrack(targetSurah, reciter);
    const reciterSurahTracks = getSurahTracksForReciter(reciter);

    // Coming from a Juz we start the Surah from the top; within Surahs we keep
    // the listener's position only when both reciters share word-sync pacing.
    const isSamePacing = reciterHasWordTiming(selectedReciter) && reciterHasWordTiming(reciter);
    const seekTime = isPlayingJuz || !isSamePacing
      ? 0
      : (currentSegment?.startTime ?? (player.currentTime > 0 ? player.currentTime : 0));

    setOverrideBayan(newTrack);

    if (player.isPlaying) {
      player.playBayan(newTrack, reciterSurahTracks);
      if (seekTime > 0) {
        setTimeout(() => player.seek(seekTime), 250);
      }
    } else {
      player.cueBayan(newTrack, reciterSurahTracks);
      if (seekTime > 0) {
        setTimeout(() => player.seek(seekTime), 250);
      }
    }
  };

  const isJuz = Boolean(activeBayan && isQuranTrackId(activeBayan.id));

  // Load the current ayah's text + translation while a Juz plays per-ayah, so
  // the center display shows the Arabic + meaning (word-sync reciters only —
  // the CenterVerseDisplay itself is gated to reciterWordSync).
  const ayahSeqIndex = player.ayahSequence?.index ?? -1;
  useEffect(() => {
    if (ayahSeqIndex < 0 || !activeJuz) {
      setJuzAyahVerse(null);
      return;
    }
    const pair = getJuzAyahPairs(activeJuz.id)[ayahSeqIndex];
    if (!pair) {
      setJuzAyahVerse(null);
      return;
    }
    const [surah, ayah] = pair;
    let cancelled = false;
    fetchSurahVerses(surah, selectedReciter.id)
      .then((verses) => {
        if (!cancelled) setJuzAyahVerse(verses.find((v) => v.ayahNumber === ayah) ?? null);
      })
      .catch(() => {
        if (!cancelled) setJuzAyahVerse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ayahSeqIndex, activeJuz, selectedReciter.id]);

  // Word-by-word highlight for the per-ayah Juz. The QDC word timings are
  // Surah-relative; the everyayah ayah audio starts at 0 and may differ in
  // length, so we make the timings ayah-relative and scale them to the loaded
  // ayah's duration, then pick the active word from the ayah-relative time.
  const juzWordSync = useMemo(() => {
    if (!isJuz || !juzAyahVerse || !reciterHasWordTiming(selectedReciter)) {
      return { hasWordTiming: false, activeWordIndex: -1 };
    }
    const words = juzAyahVerse.words;
    if (
      !words ||
      words.length === 0 ||
      !words.some((w) => (w.startTime ?? 0) > 0 || (w.endTime ?? 0) > 0)
    ) {
      return { hasWordTiming: false, activeWordIndex: -1 };
    }
    const ayahStart = juzAyahVerse.timestampFrom ?? words[0].startTime ?? 0;
    const ayahEnd =
      juzAyahVerse.timestampTo ?? words[words.length - 1].endTime ?? ayahStart;
    const qdcDur = ayahEnd - ayahStart;
    const eaDur = player.duration > 0 ? player.duration : qdcDur;
    const scale = qdcDur > 0 ? eaDur / qdcDur : 1;
    const t = player.currentTime;
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      const s = ((words[i].startTime ?? 0) - ayahStart) * scale;
      const e = ((words[i].endTime ?? 0) - ayahStart) * scale;
      if (t >= s && t < e) {
        idx = i;
        break;
      }
      if (t >= e) idx = i;
    }
    return { hasWordTiming: true, activeWordIndex: idx };
  }, [isJuz, juzAyahVerse, selectedReciter, player.currentTime, player.duration]);

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
    surahNumber: isJuz ? null : (activeSurah?.number ?? null),
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
        activeJuzNumber={activeJuz?.id ?? null}
        ayahNumber={currentVerse?.ayahNumber ?? null}
        videoSrc={currentVideo}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        duration={player.isPrelude ? player.preludeDuration : player.duration}
        isPlaying={player.isPlaying}
        visualMode={visualMode}
      />

      {/* Center Quran Verses Stage (Pure Arabic Calligraphy + English/Tamil Translation) */}
      <CenterVerseDisplay
        currentVerse={isJuz ? juzAyahVerse : currentVerse}
        currentSegment={isJuz ? null : currentSegment}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        isPlaying={player.isPlaying}
        language={language}
        showTranslation={showTranslation}
        onPrevVerse={handlePrevVerse}
        onNextVerse={handleNextVerse}
        hasMultipleVerses={verses.length > 1}
        activeWordIndex={isJuz ? juzWordSync.activeWordIndex : activeWordIndex}
        hasWordTiming={isJuz ? juzWordSync.hasWordTiming : hasWordTiming}
        reciterWordSync={reciterHasWordTiming(selectedReciter)}
        isJuz={isJuz}
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
        isJuz={isJuz}
        qaHud={
          !isJuz && (
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
          )
        }
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
        <div className="pointer-events-auto w-full max-w-[680px] flex justify-center">
          {/* Compact Integrated Glassmorphism Player with Ayah Controls */}
          {activeBayan && (
            <CompactBayanPlayer
              bayan={activeBayan}
              categoryList={categoryBayans}
              surahTracks={surahTracksForCurrentReciter}
              onShuffleCategory={handleShuffle}
              activeSurah={activeSurah}
              currentVerse={isJuz ? null : currentVerse}
              currentSegment={isJuz ? null : currentSegment}
              segments={isJuz ? [] : segments}
              totalVerses={isJuz ? 1 : (activeSurah?.verses ?? verses.length)}
              activeVerseIndex={isJuz ? 0 : activeIndex}
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
