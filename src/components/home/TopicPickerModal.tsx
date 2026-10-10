"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { BayanWithRelations } from "@/types/bayan";
import { AndroidIcon, AppleIcon, CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FavouriteIcon, SearchIcon, SearchIcon02 } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useBackToClose } from "@/lib/useBackToClose";
import { useOnlyOneSheet } from "@/lib/useOnlyOneSheet";
import { PLAYER_GLASS, useIsMobile, useKeyboardInset } from "@/components/ui/ActionSheet";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  QURAN_JUZ,
  QURAN_TRACKS,
  QURAN_SURAHS,
  SURAH_TRACKS,
  quranThumbUrl,
  getSurahTracksForReciter,
  resolveActiveReciter,
} from "@/lib/data/service";
import { getJuzAyahPairs } from "@/lib/data/quran";
import { MUSHAF_PAGE_COUNT, mushafPageOf } from "@/lib/data/mushafPages";
import { searchSurahs } from "@/lib/data/surahSearch";
import { ABOUT } from "@/lib/data/about";
import { ContentListCard } from "./ContentListCard";
import { compactCount } from "./QuranEngagement";
import { getSupabaseRpcClient } from "@/lib/supabase/rpc";
import { getSessionId } from "@/lib/audio/session";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { UI_LANGS, surahNameIn, t, useSetUiLang, useUiLang, word } from "@/lib/uiLang";

type ModalTab = "surah" | "quran";

interface TopicPickerModalProps {
  surahTracks?: BayanWithRelations[];
  /** Play a Juz in the currently-selected reciter's voice (per-ayah). */
  onSelectJuz?: (juzId: number) => void;
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
// The top and right edges reach the panel's corner in the first quarter, so the
// shape is pinned top-right and opens out leftward and down from there.
const morphInset = (v: string) => `calc(var(${v}, 0px) * (1 - var(--reveal, 1)))`;
const morphInsetFast = (v: string) => `calc(var(${v}, 0px) * (1 - min(1, var(--reveal, 1) * 4)))`;
const morphRadius = "calc(var(--r0, 24px) + (var(--r1, 28px) - var(--r0, 24px)) * var(--reveal, 1))";
const MORPH_CLIP = `inset(${morphInsetFast("--it")} ${morphInsetFast("--ir")} ${morphInset("--ib")} ${morphInset("--il")} round ${morphRadius})`;
const MORPH_RING: React.CSSProperties = {
  top: morphInsetFast("--it"),
  right: morphInsetFast("--ir"),
  bottom: morphInset("--ib"),
  left: morphInset("--il"),
  borderRadius: morphRadius,
  border: "1px solid rgba(255, 255, 255, 0.22)",
  background: "rgba(0, 0, 0, 0.12)",
  opacity: "calc((1 - var(--reveal, 1)) / 0.2)",
};

/** Puts the content browser's top-right corner on its header button's. */
function pinToTrigger(el: HTMLElement, r: DOMRect) {
  el.style.top = `${r.top}px`;
  el.style.right = `${document.documentElement.clientWidth - r.right}px`;
}

export function TopicPickerModal({
  surahTracks,
  onSelectJuz,
  triggerClassName,
  openRequest = 0,
  variant = "browser",
}: TopicPickerModalProps) {
  const isFavourites = variant === "favourites";
  const player = useAudioPlayer();
  const lang = useUiLang();
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
  const isMobile = useIsMobile();
  // Phone sheet with a search box: sit on top of the on-screen keyboard.
  const kb = useKeyboardInset(isOpen && isMobile);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // Keyboard / screen reader: focus moves into the panel and stays there until
  // it closes (then back to the button); Escape closes it.
  const titleId = useId();
  useDialogFocus(isOpen, panelRef, triggerRef);
  useBackToClose(isOpen, () => setIsOpen(false));
  useOnlyOneSheet(isOpen, () => setIsOpen(false));
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      // A sheet opened over the panel closes first (it handles its own Escape).
      if (ev.key === "Escape" && !document.querySelector("[data-action-sheet]")) setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);
  // Header trigger: the panel's top-right corner is the button's top-right
  // corner on every screen (the header centres its buttons, so its padding
  // alone doesn't give it), kept there as the window resizes.
  useEffect(() => {
    if (!isOpen || isFavourites) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const pin = () => {
      const el = panelRef.current;
      const btn = triggerRef.current;
      if (el && btn) pinToTrigger(el, btn.getBoundingClientRect());
    };
    // Again once the header buttons' size transition has settled.
    const onResize = () => {
      pin();
      clearTimeout(settle);
      settle = setTimeout(pin, 400);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(settle);
    };
  }, [isOpen, isFavourites]);
  // Stable, so it runs when the panel mounts — not on every re-render (the
  // player's clock re-renders this), which would put the clip back once open.
  const setPanelRef = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    const btn = triggerRef.current;
    if (!el || !btn || isMobile) return;
    el.style.clipPath = MORPH_CLIP;
    const r = btn.getBoundingClientRect();
    if (!isFavourites) pinToTrigger(el, r);
    const inset = (v: number) => `${Math.max(0, v)}px`;
    el.style.setProperty("--it", inset(r.top - el.offsetTop));
    el.style.setProperty("--ir", inset(el.offsetLeft + el.offsetWidth - r.right));
    el.style.setProperty("--ib", inset(el.offsetTop + el.offsetHeight - r.bottom));
    el.style.setProperty("--il", inset(r.left - el.offsetLeft));
    el.style.setProperty("--r0", `${r.width / 2}px`);
    el.style.setProperty("--r1", getComputedStyle(el).borderTopLeftRadius);
  }, [isFavourites, isMobile]);

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
    const timer = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[aria-current="true"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 750);
    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // Listener counts per Surah / Juz for the list (one request per tab, while
  // the browser is open). Stays null — icons only — without Supabase.
  const [viewCounts, setViewCounts] = useState<Record<"surah" | "juz", Record<string, number> | null>>({
    surah: null,
    juz: null,
  });
  const countKinds: Array<"surah" | "juz"> =
    isFavourites ? ["surah", "juz"] : activeTab === "surah" ? ["surah"] : ["juz"];
  const countKindsKey = countKinds.join(",");
  useEffect(() => {
    if (!isOpen || !countKindsKey) return;
    const supabase = getSupabaseRpcClient();
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
    const supabase = getSupabaseRpcClient();
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

  const filteredJuz = QURAN_JUZ.filter((j) => {
    if (!q) return true;
    return (
      j.title.toLowerCase().includes(q) ||
      String(j.id).includes(q) ||
      `juz ${j.id}`.includes(q) ||
      `para ${j.id}`.includes(q) ||
      `${word("juz", "ta")} ${j.id}`.includes(q) ||
      `${word("juz", lang)} ${j.id}`.toLowerCase().includes(q) ||
      // A page no. (1–604): the Juz that page is in.
      (/^\d+$/.test(q) && +q >= 1 && +q <= MUSHAF_PAGE_COUNT && +q >= JUZ_PAGES[j.id - 1][0] && +q <= JUZ_PAGES[j.id - 1][1])
    );
  });

  const filteredSurah = searchSurahs(QURAN_SURAHS, searchQuery);

  const renderSurahCard = (s: (typeof QURAN_SURAHS)[number]) => {
    const isTrackCurrent = player.current?.id === `quran-surah-${s.number}`;
    const surahImg = quranThumbUrl("surah", s.number);
    return (
      <ContentListCard
        key={`surah-${s.number}`}
        number={s.number.toString().padStart(2, "0")}
        imageSrc={surahImg}
        title={surahNameIn(s.number, lang)}
        secondaryLabel={s.arabicName}
        isArabicLabel={true}
        subtitle={`${s.verses} ${word("verses", lang)} · ${word(s.revelation === "Medinan" ? "medinan" : "meccan", lang)}`}
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
    const juzImg = quranThumbUrl("juz", j.id);
    return (
      <ContentListCard
        key={`juz-${j.id}`}
        number={j.id.toString().padStart(2, "0")}
        imageSrc={juzImg}
        title={j.title}
        secondaryLabel={`${word("juz", lang)} ${j.id}`}
        isArabicLabel={false}
        subtitle={t(lang, "Page {from} to {to}", { from: JUZ_PAGES[j.id - 1][0], to: JUZ_PAGES[j.id - 1][1] })}
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
          "pointer-events-auto grid h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-100 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
        }
        data-tooltip={
          isFavourites ? t(lang, "Favourites") : `${word("surah", lang)} & ${word("juz", lang)}`
        }
        aria-label={
          isFavourites
            ? t(lang, "Open Favourites")
            : t(lang, "Open Content Browser")
        }
      >
        {isFavourites ? (
          <FavouriteIcon className={triggerClassName ? "text-base sm:text-lg" : "h-5 w-5"} />
        ) : (
          <SearchIcon02 className="h-5 w-5" />
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
              aria-hidden="true"
            />

            {/* Right Slide-Over Panel */}
            <motion.div
              ref={setPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={
                isMobile && kb.bottom > 0
                  ? { bottom: kb.bottom, height: "auto", maxHeight: Math.round(kb.height * 0.92) }
                  : undefined
              }
              {...(isMobile
                ? {
                    // Phones / tablets: a bottom sheet docked to the bottom edge.
                    initial: { y: "100%" },
                    animate: { y: 0 },
                    exit: { y: "100%" },
                    transition: { type: "spring", damping: 30, stiffness: 320 },
                  }
                : {
                    initial: { "--reveal": 0 } as never,
                    animate: { "--reveal": 1 } as never,
                    exit: { "--reveal": 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } } as never,
                    transition: { duration: 0.75, ease: [0.32, 0.72, 0, 1] },
                    onAnimationStart: () => {
                      const el = panelRef.current;
                      if (el) el.style.clipPath = MORPH_CLIP;
                    },
                    onAnimationComplete: (def: unknown) => {
                      const el = panelRef.current;
                      if (el && (def as Record<string, unknown>)["--reveal"] === 1) el.style.clipPath = "none";
                    },
                  })}
              // Floating card in the player's glass. Top and right match the
              // header's padding (ImmersiveHeader), so the panel's corner is the
              // trigger button's corner and the morph opens from it.
              className={`pointer-events-auto fixed z-50 flex flex-col ${PLAYER_GLASS} outline-none ${isMobile ? "inset-x-2 bottom-0 mx-auto h-[86dvh] max-w-[520px] rounded-t-[28px] border-b-0 px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]" : "top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+var(--header-gap,1rem))] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-2 sm:right-8 md:bottom-4 w-[88vw] max-w-md rounded-[28px] sm:rounded-[40px] p-4 md:p-6"} [&>*:not([data-ring])]:[opacity:calc((var(--reveal,1)-0.4)/0.6)]`}
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
                      aria-label={t(lang, "Back to the list")}
                    >
                      <ChevronRightIcon className="h-4 w-4 rotate-180" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                      {isFavourites
                        ? t(lang, "Your Library")
                        : showAbout
                        ? t(lang, "The story & credits")
                        : t(lang, "Listen & Read")}
                    </span>
                    <h3 id={titleId} className="text-xl font-black text-white tracking-tight">
                      {isFavourites
                        ? t(lang, "Favourites")
                        : showAbout
                        ? t(lang, "About HuDa Web Quran")
                        : t(lang, "Choose a Surah or Juz")}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="tap-44 pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                  aria-label={t(lang, "Close")}
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
                    <div role="tablist" className={cn("my-3", TAB_TRACK)}>
                      {(["surah", "juz"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="tab"
                          aria-selected={favTab === k}
                          onClick={() => setFavTab(k)}
                          className={cn(
                            TAB,
                            favTab === k ? SELECTED_TAB : UNSELECTED_TAB,
                          )}
                        >
                          {word(k, lang)}
                          {favCounts[k] > 0 && <span className="ml-1.5 tabular-nums opacity-70">{favCounts[k]}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 2. Segmented Navigation Tabs (Surah | Juz) */}
                  {!isFavourites && (
                  <div className={cn("my-3", TAB_TRACK)}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("surah")}
                      className={cn(
                        TAB,
                        activeTab === "surah" ? SELECTED_TAB : UNSELECTED_TAB,
                      )}
                    >
                      {word("surah", lang)}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("quran")}
                      className={cn(
                        TAB,
                        activeTab === "quran" ? SELECTED_TAB : UNSELECTED_TAB,
                      )}
                    >
                      {word("juz", lang)}
                    </button>
                  </div>
                  )}

                  {/* 3. Search Input Box */}
                  <div className="relative mb-3">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-200/50 text-base pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        isFavourites
                          ? t(lang, "Search favourites...")
                          : activeTab === "surah"
                          ? t(lang, "Search Surah...")
                          : t(lang, "Search Juz or page no...")
                      }
                      aria-label={
                        isFavourites
                          ? t(lang, "Search favourites")
                          : activeTab === "surah"
                          ? t(lang, "Search Surah")
                          : t(lang, "Search Juz or page number")
                      }
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        "w-full rounded-full bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all",
                      )}
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
                        <p className="px-2 py-8 text-center text-xs text-sand-200/60">
                          {t(lang, "Favourites aren't available right now.")}
                        </p>
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
                        const label = word(favTab, lang);
                        return (
                          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <FavouriteIcon className="text-2xl text-emerald-400/70" />
                            <p className="text-xs text-sand-200/70">
                              {q && favCounts[favTab]
                                ? t(lang, "No matching favourites.")
                                : t(lang, "No {label} favourites yet.", { label })}
                            </p>
                            {!(q && favCounts[favTab]) && (
                              <p className="text-[11px] text-sand-200/65">
                                {t(lang, "Like the {label} you're listening to (♥ beside the cover) to keep it here.", { label })}
                              </p>
                            )}
                          </div>
                        );
                      })())}

                  </div>
                </>
              )}

              {/* 5. Footer: « About HuDa » (the browser only) */}
              {!isFavourites && !showAbout && (
                <button
                  type="button"
                  onClick={() => setView("about")}
                  className={`mt-3 ${isMobile ? "mb-1.5" : ""} flex w-full shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/huda-logo-circle.webp" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-contain" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white">
                      {t(lang, "About HuDa Web Quran")}
                    </span>
                    <span className="block truncate text-[11px] text-sand-200/60">
                      {ABOUT.appUrl || ABOUT.appNote
                        ? t(lang, "The app · credits · feedback")
                        : t(lang, "Credits · feedback")}
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
  const lang = useUiLang();
  const setUiLang = useSetUiLang();
  const contactHref = ABOUT.contact.includes("@") && !ABOUT.contact.startsWith("http") ? `mailto:${ABOUT.contact}` : ABOUT.contact;
  // Copy the contact (✓ for a moment). Clipboard API, else a hidden textarea.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
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
  const copyLabel = t(lang, "Copy");
  const copiedLabel = t(lang, "Copied");
  return (
    <div className="no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-4 text-sand-100">
      {/* Logo left, name right — the pair centred over the intro */}
      <div className="flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/huda-logo-circle.webp" alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-contain" />
        <div className="text-left">
          <p className="text-lg font-black text-white">HuDa Web Quran</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sand-200/60">{ABOUT.tagline}</p>
        </div>
      </div>
      <p className="text-center text-[13px] leading-relaxed text-sand-100/85">{ABOUT.intro}</p>

      {/* App language: every label, each name in its own script */}
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">{t(lang, "App language")}</p>
        <p className="mt-0.5 text-[11px] text-sand-200/70">
          {t(lang, "Ayah meanings are chosen separately, from the translation button.")}
        </p>
        <div role="radiogroup" aria-label={t(lang, "App language")} className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {UI_LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={lang === l.id}
              lang={l.id}
              dir={l.id === "ur" ? "rtl" : undefined}
              onClick={() => setUiLang(l.id)}
              className={cn(TAB, "leading-5", lang === l.id ? SELECTED_TAB : "border-white/10 text-white hover:bg-white/5")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {!ABOUT.appUrl && ABOUT.appNote && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs font-bold text-white">{t(lang, "HuDa Mobile App")}</p>
          <p className="text-[11px] text-sand-200/70">{ABOUT.appNote}</p>
          {ABOUT.appPlatforms.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ABOUT.appPlatforms.map((p) => (
                <span
                  key={p}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-200",
                  )}
                >
                  {p === "iOS" ? <AppleIcon className="text-sm" /> : <AndroidIcon className="text-sm" />}
                  {p} · {t(lang, "Coming soon")}
                </span>
              ))}
            </div>
          )}
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
            <span className="block text-xs font-bold text-white">{t(lang, "HuDa Mobile App")}</span>
            <span className="block text-[11px] text-sand-200/70">{t(lang, "Get the app")}</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 text-emerald-300" />
        </a>
      )}

      {/* Feedback right under the mobile app (owner, 2026-10-09) */}
      {ABOUT.contact && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2">
          <a
            href={contactHref}
            target={contactHref.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="min-w-0 flex-1 rounded-xl px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          >
            <span className="block text-xs font-bold text-white">{t(lang, "Feedback")}</span>
            <span className="block truncate text-[11px] text-sand-200/70">{ABOUT.contact}</span>
          </a>
          <button
            type="button"
            onClick={copyContact}
            aria-label={copied ? copiedLabel : `${copyLabel} ${ABOUT.contact}`}
            title={copied ? copiedLabel : copyLabel}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors cursor-pointer active:scale-95",
              copied
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/10 text-sand-100 hover:bg-white/20 hover:text-white"
            )}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
          </button>
        </div>
      )}

      {ABOUT.maker && (
        // Maker card: thin gold edge, a warm halo behind the logo, and a shine
        // that sweeps across the gold lettering only (masked to the logo).
        <div className="rounded-[22px] bg-gradient-to-br from-[#F6DE9A]/50 via-white/10 to-[#B98532]/40 p-px">
          <div className="relative overflow-hidden rounded-[21px] bg-[#0d0f0e]/80 px-5 pb-5 pt-4 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-24 w-56 rounded-full bg-[#E8C46E]/20 blur-3xl"
            />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#E8C46E]/80">
              {t(lang, "Crafted by")}
            </p>
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
            {ABOUT.makerNote.length > 0 && (
              <div className="relative mt-5 space-y-3 border-t border-white/10 pt-4 text-center">
                {ABOUT.makerNote.map((para) => (
                  <p key={para} className="text-[13px] leading-relaxed text-sand-100/85">
                    {/* **text** → gold; the split leaves those at odd indexes */}
                    {para.split("**").map((part, i) =>
                      i % 2 ? (
                        <strong key={i} className="font-semibold text-[#E8C46E]">
                          {part}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                ))}
              </div>
            )}
            {ABOUT.builtWith.length > 0 && (
              <p className="relative mt-4 text-[11px] text-sand-200/70">
                <span>{t(lang, "Created with AI")}</span> ·{" "}
                {ABOUT.builtWith.map((tool, i) => (
                  <span key={tool}>
                    {i > 0 && " & "}
                    <span className="font-semibold text-[#E8C46E]">{tool}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
          {t(lang, "Sources & credits")}
        </p>
        {ABOUT.credits.map((c) => (
          <div key={c.label}>
            <p className="text-[11px] font-bold text-white">{c.label}</p>
            <p className="text-[11px] text-sand-200/70">{c.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
