"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import type { BayanWithRelations } from "@/types/bayan";
import { CloseIcon, SearchIcon, TvMenuIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  QURAN_JUZ,
  QURAN_TRACKS,
  QURAN_SURAHS,
  SURAH_TRACKS,
  quranImageUrl,
  getSurahTracksForReciter,
  resolveActiveReciter,
} from "@/lib/data/service";
import { ContentListCard } from "./ContentListCard";

type ModalTab = "surah" | "quran" | "bayan";

interface TopicPickerModalProps {
  categories: Category[];
  speakers?: Speaker[];
  allBayan?: BayanWithRelations[];
  surahTracks?: BayanWithRelations[];
  activeCategorySlug: string;
  onSelectCategory: (category: Category) => void;
  onSelectSpeaker?: (speaker: Speaker) => void;
  onSelectBayan?: (bayan: BayanWithRelations) => void;
  onShuffle?: () => void;
}

const SCENE_THUMBNAILS: Record<string, string> = {
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

export function TopicPickerModal({
  categories,
  activeCategorySlug,
  surahTracks,
  onSelectCategory,
}: TopicPickerModalProps) {
  const player = useAudioPlayer();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>("surah");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();

  const filteredCategories = categories.filter((c) => {
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.nameTa && c.nameTa.toLowerCase().includes(q)) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const filteredJuz = QURAN_JUZ.filter((j) => {
    if (!q) return true;
    return (
      j.title.toLowerCase().includes(q) ||
      String(j.id).includes(q) ||
      `juz ${j.id}`.includes(q) ||
      `para ${j.id}`.includes(q)
    );
  });

  const filteredSurah = QURAN_SURAHS.filter((s) => {
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.arabicName.includes(searchQuery.trim()) ||
      String(s.number).includes(q) ||
      s.theme.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Top Right Header Menu SVG Icon Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="pointer-events-auto grid h-9 w-9 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-100 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
        aria-label="Open Content Browser"
        title="Content Browser"
      >
        <TvMenuIcon className="text-base sm:text-xl" />
      </button>

      {/* Mac Control Center Style Right Slide-Over Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="pointer-events-auto fixed inset-0 z-50 bg-black/70 backdrop-blur-sm cursor-pointer"
            />

            {/* Right Slide-Over Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="pointer-events-auto fixed inset-y-0 right-0 z-50 flex h-full w-[88vw] max-w-md flex-col bg-[#0c1015]/95 border-l border-white/15 p-4 md:p-6 shadow-2xl backdrop-blur-2xl"
            >
              {/* 1. Shared Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                    Islamic Atmospheres
                  </span>
                  <h3 className="text-xl font-black text-white tracking-tight">
                    Pick your category
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                  aria-label="Close"
                >
                  <CloseIcon className="text-lg" />
                </button>
              </div>

              {/* 2. Segmented Navigation Tabs (Surah | Quran | Bayan) */}
              <div className="flex items-center gap-1 rounded-2xl bg-white/5 p-1 border border-white/10 my-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("surah")}
                  className={cn(
                    "flex-1 rounded-xl py-1.5 text-center text-xs font-bold transition-all",
                    activeTab === "surah"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-sand-200/60 hover:text-white"
                  )}
                >
                  Surah
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("quran")}
                  className={cn(
                    "flex-1 rounded-xl py-1.5 text-center text-xs font-bold transition-all",
                    activeTab === "quran"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-sand-200/60 hover:text-white"
                  )}
                >
                  Quran
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("bayan")}
                  className={cn(
                    "flex-1 rounded-xl py-1.5 text-center text-xs font-bold transition-all",
                    activeTab === "bayan"
                      ? "bg-emerald-600 text-white shadow-md"
                      : "text-sand-200/60 hover:text-white"
                  )}
                >
                  Bayan
                </button>
              </div>

              {/* 3. Search Input Box */}
              <div className="relative mb-3">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-200/50 text-base pointer-events-none" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "surah"
                      ? "Search Surah..."
                      : activeTab === "quran"
                      ? "Search Juz / Para..."
                      : "Search Bayan categories..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                />
              </div>

              {/* 4. Scrollable List Content using ContentListCard */}
              <div className="no-scrollbar flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                {/* A. SURAH TAB (114 Surahs) */}
                {activeTab === "surah" &&
                  filteredSurah.map((s) => {
                    const isTrackCurrent = player.current?.id === `quran-surah-${s.number}`;
                    const surahImg = s.image || s.coverImageUrl || quranImageUrl("surah", s.number);
                    return (
                      <ContentListCard
                        key={s.number}
                        number={s.number.toString().padStart(2, "0")}
                        imageSrc={surahImg}
                        title={s.name}
                        secondaryLabel={s.arabicName}
                        isArabicLabel={true}
                        subtitle={`${s.verses} Verses · ${s.revelation}`}
                        iconName="book"
                        isActive={isTrackCurrent}
                        isPlaying={isTrackCurrent && player.isPlaying}
                        onClick={() => {
                          const activeReciter = resolveActiveReciter(player.current);
                          const activeSurahTracks = surahTracks || getSurahTracksForReciter(activeReciter);
                          player.playBayan(activeSurahTracks[s.number - 1], activeSurahTracks);
                          setIsOpen(false);
                        }}
                      />
                    );
                  })}

                {/* B. QURAN TAB (30 Juz) */}
                {activeTab === "quran" &&
                  filteredJuz.map((j) => {
                    const isTrackCurrent = player.current?.id === `quran-juz-${j.id}`;
                    const juzImg = quranImageUrl("juz", j.id);
                    return (
                      <ContentListCard
                        key={j.id}
                        number={j.id.toString().padStart(2, "0")}
                        imageSrc={juzImg}
                        title={j.title}
                        secondaryLabel={j.label}
                        isArabicLabel={false}
                        subtitle={j.subtitle}
                        iconName="book"
                        isActive={isTrackCurrent}
                        isPlaying={isTrackCurrent && player.isPlaying}
                        onClick={() => {
                          player.playBayan(QURAN_TRACKS[j.id - 1], QURAN_TRACKS);
                          setIsOpen(false);
                        }}
                      />
                    );
                  })}

                {/* C. BAYAN TAB (Categories) */}
                {activeTab === "bayan" &&
                  filteredCategories.map((c, index) => {
                    const isCatActive = c.slug === activeCategorySlug;
                    const thumb = SCENE_THUMBNAILS[c.slug] || "/assets/images/bayan/iman-taqwa.jpg";
                    return (
                      <ContentListCard
                        key={c.id}
                        number={(index + 1).toString().padStart(2, "0")}
                        imageSrc={thumb}
                        title={c.name}
                        secondaryLabel={c.nameTa}
                        isArabicLabel={false}
                        subtitle={c.description}
                        iconName={c.icon}
                        isActive={isCatActive}
                        isPlaying={false}
                        onClick={() => {
                          onSelectCategory(c);
                          setIsOpen(false);
                        }}
                      />
                    );
                  })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
