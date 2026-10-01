"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import type { BayanWithRelations } from "@/types/bayan";
import { CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FavouriteIcon, SearchIcon, TvMenuIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { PLAYER_GLASS } from "@/components/ui/ActionSheet";
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
import { getJuzAyahPairs } from "@/lib/data/quran";
import { MUSHAF_PAGE_COUNT, mushafPageOf } from "@/lib/data/mushafPages";
import { ABOUT } from "@/lib/data/about";
import { ContentListCard } from "./ContentListCard";
import { compactCount } from "./QuranEngagement";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionId } from "@/lib/audio/session";

type ModalTab = "surah" | "quran" | "bayan";

// Bayan tab is hidden for now — flip to true to bring it back (code kept intact).
const SHOW_BAYAN_TAB = false;

interface TopicPickerModalProps {
  categories: Category[];
  speakers?: Speaker[];
  allBayan?: BayanWithRelations[];
  surahTracks?: BayanWithRelations[];
  activeCategorySlug: string;
  onSelectCategory: (category: Category) => void;
  onSelectSpeaker?: (speaker: Speaker) => void;
  onSelectBayan?: (bayan: BayanWithRelations) => void;
  /** Play a Juz in the currently-selected reciter's voice (per-ayah). */
  onSelectJuz?: (juzId: number) => void;
  onShuffle?: () => void;
  /** Bump to open the browser from outside (the player's Surah / Juz name). */
  openRequest?: number;
  /** Trigger button classes (default: the round header button). */
  triggerClassName?: string;
  /**
   * "browser" (default): the ☰ content browser (Surah | Juz).
   * "favourites": the home ♥ button — only the Surahs / Juz this browser liked.
   */
  variant?: "browser" | "favourites";
}

// Mushaf pages each Juz spans, [first, last] — so the Juz search finds a page no.
const JUZ_PAGES = Array.from({ length: 30 }, (_, i) => {
  const pairs = getJuzAyahPairs(i + 1);
  const [s0, a0] = pairs[0];
  const [s1, a1] = pairs[pairs.length - 1];
  return [mushafPageOf(s0, a0), mushafPageOf(s1, a1)] as const;
});

// The content browser's morph out of its round button (see setPanelRef):
// the shape at --reveal, and a ring tracing its edge that fades out at the end.
const morphInset = (v: string) => `calc(var(${v}, 0px) * (1 - var(--reveal, 1)))`;
const morphRadius = "calc(var(--r0, 24px) + (var(--r1, 28px) - var(--r0, 24px)) * var(--reveal, 1))";
const MORPH_CLIP = `inset(${morphInset("--it")} ${morphInset("--ir")} ${morphInset("--ib")} ${morphInset("--il")} round ${morphRadius})`;
const MORPH_RING: React.CSSProperties = {
  top: morphInset("--it"),
  right: morphInset("--ir"),
  bottom: morphInset("--ib"),
  left: morphInset("--il"),
  borderRadius: morphRadius,
  border: "1px solid rgba(255, 255, 255, 0.22)",
  background: "rgba(0, 0, 0, 0.12)",
  opacity: "calc((1 - var(--reveal, 1)) / 0.2)",
};

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
  onSelectJuz,
  triggerClassName,
  openRequest = 0,
  variant = "browser",
}: TopicPickerModalProps) {
  const isFavourites = variant === "favourites";
  const player = useAudioPlayer();
  const [isOpen, setIsOpen] = useState(false);
  // The browser's list, or its « About HuDa » view (footer link); every open
  // starts on the list.
  const [view, setView] = useState<"list" | "about">("list");
  useEffect(() => {
    if (isOpen) setView("list");
  }, [isOpen]);
  const showAbout = !isFavourites && view === "about";
  const [activeTab, setActiveTab] = useState<ModalTab>("surah");
  const [searchQuery, setSearchQuery] = useState("");
  // The panel is portalled to <body>: the ♥ trigger sits inside the player's
  // blurred frame, which would otherwise trap the fixed panel inside it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The panel morphs out of this round button: its visible shape (a clip-path
  // inset) starts as the button's circle and stretches into the full rounded
  // panel, then the content fades in — reversed on close. --reveal (0 → 1)
  // drives it; --it/--ir/--ib/--il are the button's insets within the panel.
  // A ring (MORPH_RING) traces the shape's edge, as the glass alone barely
  // shows; the clip comes off once open so the panel's shadow isn't cut.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Stable, so it runs when the panel mounts — not on every re-render (the
  // player's clock re-renders this), which would put the clip back once open.
  const setPanelRef = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    const btn = triggerRef.current;
    if (!el || !btn) return;
    el.style.clipPath = MORPH_CLIP;
    const r = btn.getBoundingClientRect();
    const inset = (v: number) => `${Math.max(0, v)}px`;
    el.style.setProperty("--it", inset(r.top - el.offsetTop));
    el.style.setProperty("--ir", inset(el.offsetLeft + el.offsetWidth - r.right));
    el.style.setProperty("--ib", inset(el.offsetTop + el.offsetHeight - r.bottom));
    el.style.setProperty("--il", inset(r.left - el.offsetLeft));
    el.style.setProperty("--r0", `${r.width / 2}px`);
    el.style.setProperty("--r1", getComputedStyle(el).borderTopLeftRadius);
  }, []);

  // Opened from the player's name: show the tab of what's playing.
  useEffect(() => {
    if (!openRequest) return;
    setSearchQuery("");
    if (player.current?.id.startsWith("quran-juz-")) setActiveTab("quran");
    else if (player.current?.id.startsWith("quran-surah-")) setActiveTab("surah");
    setIsOpen(true);
  }, [openRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every open: bring the playing Surah / Juz card to the middle of the list
  // (once the panel has slid in and the list has rendered).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[aria-current="true"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 750);
    return () => clearTimeout(t);
  }, [isOpen, activeTab]);

  // Listener counts per Surah / Juz for the list (one request per tab, while
  // the browser is open). Stays null — icons only — without Supabase.
  const [viewCounts, setViewCounts] = useState<Record<"surah" | "juz", Record<string, number> | null>>({
    surah: null,
    juz: null,
  });
  const countKinds: Array<"surah" | "juz"> =
    isFavourites ? ["surah", "juz"] : activeTab === "surah" ? ["surah"] : activeTab === "quran" ? ["juz"] : [];
  const countKindsKey = countKinds.join(",");
  useEffect(() => {
    if (!isOpen || !countKindsKey) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    for (const kind of countKindsKey.split(",") as Array<"surah" | "juz">) {
      supabase.rpc("get_quran_view_counts", { p_kind: kind }).then(
        ({ data, error }) => {
          if (!cancelled && !error && data) setViewCounts((v) => ({ ...v, [kind]: data as Record<string, number> }));
        },
        () => {}
      );
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, countKindsKey]);

  // Favourites panel: the Surahs / Juz this browser liked (♥ in the player).
  // Re-read every time the panel opens so a new like appears straight away.
  const [favourites, setFavourites] = useState<Array<{ kind: "surah" | "juz"; id: number }> | null>(null);
  const [favouritesFailed, setFavouritesFailed] = useState(false);
  // Surah | Juz segment — opens on the kind being played.
  const [favTab, setFavTab] = useState<"surah" | "juz">("surah");
  useEffect(() => {
    if (!isOpen || !isFavourites) return;
    setFavTab(player.current?.id.startsWith("quran-juz-") ? "juz" : "surah");
  }, [isOpen, isFavourites]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen || !isFavourites) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setFavouritesFailed(true);
      return;
    }
    let cancelled = false;
    setFavouritesFailed(false);
    supabase.rpc("get_my_quran_likes", { p_viewer: getSessionId() }).then(
      ({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) setFavouritesFailed(true);
        else setFavourites(data as Array<{ kind: "surah" | "juz"; id: number }>);
      },
      () => !cancelled && setFavouritesFailed(true)
    );
    return () => {
      cancelled = true;
    };
  }, [isOpen, isFavourites]);
  const favCounts = {
    surah: favourites?.filter((f) => f.kind === "surah").length ?? 0,
    juz: favourites?.filter((f) => f.kind === "juz").length ?? 0,
  };
  const countFor = (kind: "surah" | "juz", id: number) => {
    const map = viewCounts[kind];
    return map ? map[String(id)] ?? 0 : null;
  };

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
      `para ${j.id}`.includes(q) ||
      // A page no. (1–604): the Juz that page is in.
      (/^\d+$/.test(q) && +q >= 1 && +q <= MUSHAF_PAGE_COUNT && +q >= JUZ_PAGES[j.id - 1][0] && +q <= JUZ_PAGES[j.id - 1][1])
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

  const renderSurahCard = (s: (typeof QURAN_SURAHS)[number]) => {
    const isTrackCurrent = player.current?.id === `quran-surah-${s.number}`;
    const surahImg = s.image || s.coverImageUrl || quranImageUrl("surah", s.number);
    return (
      <ContentListCard
        key={`surah-${s.number}`}
        number={s.number.toString().padStart(2, "0")}
        imageSrc={surahImg}
        title={s.name}
        secondaryLabel={s.arabicName}
        isArabicLabel={true}
        subtitle={`${s.verses} Verses · ${s.revelation}`}
        iconName="quran"
        viewCount={countFor("surah", s.number)}
        viewCountText={compactCount(countFor("surah", s.number) ?? 0)}
        isActive={isTrackCurrent}
        isPlaying={isTrackCurrent && player.isPlaying}
        onClick={() => {
          setIsOpen(false);
          const activeReciter = resolveActiveReciter(player.current);
          const activeSurahTracks = surahTracks || getSurahTracksForReciter(activeReciter);
          player.playBayan(activeSurahTracks[s.number - 1], activeSurahTracks);
        }}
      />
    );
  };

  const renderJuzCard = (j: (typeof QURAN_JUZ)[number]) => {
    const isTrackCurrent = player.current?.id === `quran-juz-${j.id}`;
    const juzImg = quranImageUrl("juz", j.id);
    return (
      <ContentListCard
        key={`juz-${j.id}`}
        number={j.id.toString().padStart(2, "0")}
        imageSrc={juzImg}
        title={j.title}
        secondaryLabel={`Juz ${j.id}`}
        isArabicLabel={false}
        subtitle={`Page ${JUZ_PAGES[j.id - 1][0]} to ${JUZ_PAGES[j.id - 1][1]}`}
        iconName="quran"
        viewCount={countFor("juz", j.id)}
        viewCountText={compactCount(countFor("juz", j.id) ?? 0)}
        isActive={isTrackCurrent}
        isPlaying={isTrackCurrent && player.isPlaying}
        onClick={() => {
          if (onSelectJuz) {
            onSelectJuz(j.id);
          } else {
            player.playBayan(QURAN_TRACKS[j.id - 1], QURAN_TRACKS);
          }
          setIsOpen(false);
        }}
      />
    );
  };

  return (
    <>
      {/* Top Right Header Trigger Button (☰ content browser, or ♥ favourites) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ??
          "pointer-events-auto grid h-10 w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-100 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
        }
        data-tooltip={triggerClassName ? (isFavourites ? "Favourites" : "Content Browser") : undefined}
        aria-label={isFavourites ? "Open Favourites" : "Open Content Browser"}
        title={triggerClassName ? undefined : isFavourites ? "Favourites" : "Content Browser"}
      >
        {isFavourites ? (
          <FavouriteIcon className={triggerClassName ? "text-base sm:text-lg" : "h-5 w-5"} />
        ) : (
          <TvMenuIcon className="h-5 w-5" />
        )}
      </button>

      {/* Slide-over panel, every screen size: grows out of the ☰ button and
          shrinks back into it, so the list is seen to live behind that icon. */}
      {mounted && createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              onClick={() => setIsOpen(false)}
              className="pointer-events-auto fixed inset-0 z-50 bg-black/40 cursor-pointer"
            />

            {/* Right Slide-Over Panel */}
            <motion.div
              ref={setPanelRef}
              initial={{ "--reveal": 0 } as never}
              animate={{ "--reveal": 1 } as never}
              exit={{ "--reveal": 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } } as never}
              transition={{ duration: 0.75, ease: [0.32, 0.72, 0, 1] }}
              onAnimationStart={() => {
                const el = panelRef.current;
                if (el) el.style.clipPath = MORPH_CLIP;
              }}
              onAnimationComplete={(def) => {
                const el = panelRef.current;
                if (el && (def as Record<string, unknown>)["--reveal"] === 1) el.style.clipPath = "none";
              }}
              // Floating card in the player's glass, inset from the screen edges
              className={`pointer-events-auto fixed top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 md:top-4 md:bottom-4 md:right-4 z-50 flex w-[88vw] max-w-md flex-col rounded-[28px] sm:rounded-[40px] ${PLAYER_GLASS} p-4 md:p-6 [&>*:not([data-ring])]:[opacity:calc((var(--reveal,1)-0.4)/0.6)]`}
            >
              <span data-ring aria-hidden="true" style={MORPH_RING} className="pointer-events-none absolute" />
              {/* 1. Shared Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex min-w-0 items-center gap-2">
                  {showAbout && (
                    <button
                      type="button"
                      onClick={() => setView("list")}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                      aria-label="Back to the list"
                    >
                      <ChevronRightIcon className="h-4 w-4 rotate-180" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                      {isFavourites ? "Your Library" : showAbout ? "The story & credits" : "Listen & Read"}
                    </span>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {isFavourites ? "Favourites" : showAbout ? "About HuDa" : "Choose a Surah or Juz"}
                    </h3>
                  </div>
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

              {showAbout ? (
                <AboutView />
              ) : (
                <>
                  {/* 2a. Favourites: Surah | Juz */}
                  {isFavourites && (
                    <div role="tablist" className="flex items-center gap-1 rounded-2xl bg-white/5 p-1 border border-white/10 my-3">
                      {(["surah", "juz"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="tab"
                          aria-selected={favTab === k}
                          onClick={() => setFavTab(k)}
                          className={cn(
                            "flex-1 rounded-xl py-1.5 text-center text-xs font-bold transition-all cursor-pointer",
                            favTab === k ? "bg-emerald-600 text-white shadow-md" : "text-sand-200/60 hover:text-white"
                          )}
                        >
                          {k === "surah" ? "Surah" : "Juz"}
                          {favCounts[k] > 0 && <span className="ml-1.5 tabular-nums opacity-70">{favCounts[k]}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 2. Segmented Navigation Tabs (Surah | Juz | Bayan) */}
                  {!isFavourites && (
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
                      Juz
                    </button>


                    {SHOW_BAYAN_TAB && (
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
                    )}
                  </div>
                  )}

                  {/* 3. Search Input Box */}
                  <div className="relative mb-3">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-200/50 text-base pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        isFavourites
                          ? "Search favourites..."
                          : activeTab === "surah"
                          ? "Search Surah..."
                          : activeTab === "quran"
                          ? "Search Juz or page no..."
                          : "Search Bayan categories..."
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                  </div>

                  {/* 4. Scrollable List Content using ContentListCard */}
                  <div ref={listRef} className="no-scrollbar flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                    {/* A. SURAH TAB (114 Surahs) */}
                    {!isFavourites && activeTab === "surah" && filteredSurah.map(renderSurahCard)}

                    {/* B. QURAN TAB (30 Juz) */}
                    {!isFavourites && activeTab === "quran" && filteredJuz.map(renderJuzCard)}


                    {/* FAVOURITES PANEL (liked Surahs & Juz, newest first) */}
                    {isFavourites &&
                      (favouritesFailed ? (
                        <p className="px-2 py-8 text-center text-xs text-sand-200/60">Favourites aren&apos;t available right now.</p>
                      ) : favourites === null ? (
                        <div className="h-16 animate-pulse rounded-2xl bg-white/5" aria-busy="true" />
                      ) : (() => {
                        const cards = favourites
                          .filter((f) => f.kind === favTab)
                          .map((f) => {
                            if (f.kind === "surah") {
                              const sura = filteredSurah.find((x) => x.number === f.id);
                              return sura ? renderSurahCard(sura) : null;
                            }
                            const juz = filteredJuz.find((x) => x.id === f.id);
                            return juz ? renderJuzCard(juz) : null;
                          })
                          .filter(Boolean);
                        if (cards.length) return cards;
                        const label = favTab === "surah" ? "Surah" : "Juz";
                        return (
                          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <FavouriteIcon className="text-2xl text-emerald-400/70" />
                            <p className="text-xs text-sand-200/70">
                              {q && favCounts[favTab] ? "No matching favourites." : `No ${label} favourites yet.`}
                            </p>
                            {!(q && favCounts[favTab]) && (
                              <p className="text-[11px] text-sand-200/50">Like the {label} you&apos;re listening to (♥ beside the cover) to keep it here.</p>
                            )}
                          </div>
                        );
                      })())}

                    {/* D. BAYAN TAB (Categories) */}
                    {!isFavourites && activeTab === "bayan" &&
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
                </>
              )}

              {/* 5. Footer: « About HuDa » (the browser only) */}
              {!isFavourites && !showAbout && (
                <button
                  type="button"
                  onClick={() => setView("about")}
                  className="mt-3 flex w-full shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-left hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/splash-logo.webp" alt="" width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white">About HuDa</span>
                    <span className="block truncate text-[11px] text-sand-200/60">
                      {ABOUT.appUrl || ABOUT.appNote ? "The app · credits · feedback" : "Credits · feedback"}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-sand-200/60" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

/** « About HuDa »: what it is, the app, the maker, credits, feedback. */
function AboutView() {
  const contactHref = ABOUT.contact.includes("@") && !ABOUT.contact.startsWith("http") ? `mailto:${ABOUT.contact}` : ABOUT.contact;
  // Copy the contact (✓ for a moment). Clipboard API, else a hidden textarea.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);
  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText(ABOUT.contact);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = ABOUT.contact;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) return; // nothing copied: no ✓
    }
    setCopied(true);
  };
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-4 text-sand-100">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/splash-logo.webp" alt="" width={56} height={56} className="h-14 w-14 shrink-0 object-contain" />
        <div>
          <p className="text-lg font-black text-white">HuDa</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sand-200/60">{ABOUT.tagline}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-sand-100/85">{ABOUT.intro}</p>

      {!ABOUT.appUrl && ABOUT.appNote && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs font-bold text-white">HuDa is coming to mobile</p>
          <p className="text-[11px] text-sand-200/70">{ABOUT.appNote}</p>
        </div>
      )}

      {ABOUT.appUrl && (
        <a
          href={ABOUT.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 hover:bg-emerald-500/15 transition-colors"
        >
          <span>
            <span className="block text-xs font-bold text-white">HuDa is on mobile too</span>
            <span className="block text-[11px] text-sand-200/70">Get the app</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 text-emerald-300" />
        </a>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Sources &amp; credits</p>
        {ABOUT.credits.map((c) => (
          <div key={c.label}>
            <p className="text-[11px] font-bold text-white">{c.label}</p>
            <p className="text-[11px] text-sand-200/70">{c.value}</p>
          </div>
        ))}
      </div>

      {ABOUT.maker && (
        // Maker card: thin gold edge, a warm halo behind the logo, and a shine
        // that sweeps across the gold lettering only (masked to the logo).
        <div className="rounded-[22px] bg-gradient-to-br from-[#F6DE9A]/50 via-white/10 to-[#B98532]/40 p-px">
          <div className="relative overflow-hidden rounded-[21px] bg-[#0d0f0e]/80 px-5 pb-5 pt-4 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-24 w-56 rounded-full bg-[#E8C46E]/20 blur-3xl"
            />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#E8C46E]/80">Crafted by</p>
            {ABOUT.makerLogo ? (
              // The SVG keeps the Figma frame's side margins (more room right of
              // the lettering than left), so the light feather tail balances.
              <div className="relative mx-auto mt-3 w-full max-w-[296px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ABOUT.makerLogo}
                  alt={ABOUT.maker}
                  width={964}
                  height={220}
                  className="h-auto w-full drop-shadow-[0_4px_18px_rgba(232,196,110,0.35)]"
                />
                <span
                  aria-hidden="true"
                  className="huda-logo-shine pointer-events-none absolute inset-0"
                  style={{ WebkitMaskImage: `url(${ABOUT.makerLogo})`, maskImage: `url(${ABOUT.makerLogo})` }}
                />
              </div>
            ) : (
              <p className="relative mt-2 text-lg font-bold text-white">{ABOUT.maker}</p>
            )}
            {ABOUT.makerNote && (
              <div className="relative mt-5 border-t border-white/10 pt-4 text-center">
                <p className="text-[13px] leading-relaxed text-sand-100/85">{ABOUT.makerNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {ABOUT.contact && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2">
          <a
            href={contactHref}
            target={contactHref.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="min-w-0 flex-1 rounded-xl px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          >
            <span className="block text-xs font-bold text-white">Feedback</span>
            <span className="block truncate text-[11px] text-sand-200/70">{ABOUT.contact}</span>
          </a>
          <button
            type="button"
            onClick={copyContact}
            aria-label={copied ? "Copied" : `Copy ${ABOUT.contact}`}
            title={copied ? "Copied" : "Copy"}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors cursor-pointer active:scale-95",
              copied
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/10 text-sand-100 hover:bg-white/20 hover:text-white"
            )}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
