"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookmarkIcon, CloseIcon, SearchIcon, TrashIcon } from "@/components/ui/Icon";
import { PLAYER_GLASS } from "@/components/ui/ActionSheet";
import { cn } from "@/lib/utils";
import { QURAN_SURAHS } from "@/lib/data/service";
import { fetchSurahVerses, toArabicNumerals } from "@/lib/data/quranVerses";
import { bookmarkId, type Bookmark } from "@/lib/lastRead";

interface BookmarksPanelProps {
  bookmarks: Bookmark[];
  /** Tab to open on (the kind being played). */
  defaultKind?: "surah" | "juz";
  onOpenBookmark: (b: Bookmark) => void;
  onRemoveBookmark: (b: Bookmark) => void;
  triggerClassName?: string;
}

/**
 * Bookmarks (the player's 🔖 button): the ayahs bookmarked in reading mode,
 * Surah | Juz, newest first — each with its Surah, ayah and the ayah's text.
 * Tap → read it there. Styled as the Favourites panel (TopicPickerModal).
 */
export function BookmarksPanel({
  bookmarks,
  defaultKind = "surah",
  onOpenBookmark,
  onRemoveBookmark,
  triggerClassName,
}: BookmarksPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<"surah" | "juz">(defaultKind);
  const [query, setQuery] = useState("");
  // Portalled to <body>: the trigger sits inside the player's blurred frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const open = () => {
    setTab(defaultKind);
    setQuery("");
    setIsOpen(true);
  };

  // Each bookmarked ayah's Arabic text, loaded while the panel is open.
  const [texts, setTexts] = useState<Record<string, string>>({});
  const surahsKey = [...new Set(bookmarks.map((b) => b.surah))].sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!isOpen || !surahsKey) return;
    let cancelled = false;
    for (const s of surahsKey.split(",").map(Number)) {
      fetchSurahVerses(s).then(
        (verses) => {
          if (cancelled) return;
          setTexts((prev) => {
            const next = { ...prev };
            for (const v of verses) next[`${s}:${v.ayahNumber}`] = v.textArabic;
            return next;
          });
        },
        () => {}
      );
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, surahsKey]);

  const counts = {
    surah: bookmarks.filter((b) => b.kind === "surah").length,
    juz: bookmarks.filter((b) => b.kind === "juz").length,
  };
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookmarks
      .filter((b) => b.kind === tab)
      .filter((b) => {
        if (!q) return true;
        const s = QURAN_SURAHS.find((x) => x.number === b.surah);
        return [s?.name, s?.arabicName, `${b.surah}:${b.ayah}`, b.juz ? `juz ${b.juz}` : ""]
          .filter(Boolean)
          .some((t) => t!.toLowerCase().includes(q));
      });
  }, [bookmarks, tab, query]);

  const renderCard = (b: Bookmark) => {
    const s = QURAN_SURAHS.find((x) => x.number === b.surah);
    const text = texts[`${b.surah}:${b.ayah}`];
    return (
      <div
        key={bookmarkId(b)}
        className="group flex items-stretch gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:border-emerald-400/40 hover:bg-white/10"
      >
        <button
          type="button"
          onClick={() => {
            onOpenBookmark(b);
            setIsOpen(false);
          }}
          className="flex min-w-0 flex-1 items-start gap-3 text-left cursor-pointer"
        >
          {/* Ayah number on a ribbon */}
          <span className="relative grid h-11 w-9 shrink-0 place-items-start justify-center pt-1.5 text-amber-300">
            <BookmarkIcon filled className="absolute inset-0 h-full w-full" />
            <span className="relative text-[10px] font-bold tabular-nums text-black/80">{b.ayah}</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span className="truncate text-sm font-bold text-white">{s?.name ?? `Surah ${b.surah}`}</span>
              {s?.arabicName && (
                <span lang="ar" dir="rtl" className="shrink-0 font-arabic text-xs text-emerald-300">
                  {s.arabicName}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[11px] text-sand-200/70">
              {b.kind === "juz" && `Juz ${b.juz} · `}Surah {b.surah} · Ayah {b.ayah}
            </span>
            <span
              lang="ar"
              dir="rtl"
              className="mt-1.5 line-clamp-2 block text-right font-arabic text-base leading-[1.9] text-sand-50/90"
            >
              {text ?? <span className="inline-block h-4 w-3/4 animate-pulse rounded bg-white/10 align-middle" />}
              {text && <span className="mx-1 text-amber-300">{toArabicNumerals(b.ayah)}</span>}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onRemoveBookmark(b)}
          aria-label={`Remove bookmark ${b.surah}:${b.ayah}`}
          title="Remove bookmark"
          className="grid h-8 w-8 shrink-0 place-items-center self-center rounded-full text-sand-200/60 hover:bg-white/10 hover:text-red-300 transition-colors cursor-pointer"
        >
          <TrashIcon className="text-base" />
        </button>
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={triggerClassName}
        data-tooltip="Bookmarks"
        aria-label="Open Bookmarks"
      >
        <BookmarkIcon className="text-base sm:text-lg" />
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsOpen(false)}
                  className="pointer-events-auto fixed inset-0 z-50 bg-black/40 cursor-pointer"
                />
                <motion.div
                  initial={{ x: "calc(100% + 1rem)" }}
                  animate={{ x: 0 }}
                  exit={{ x: "calc(100% + 1rem)" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  role="dialog"
                  aria-label="Bookmarks"
                  className={`pointer-events-auto fixed top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-3 md:top-4 md:bottom-4 md:right-4 z-50 flex w-[88vw] max-w-md flex-col rounded-[28px] sm:rounded-[40px] ${PLAYER_GLASS} p-4 md:p-6`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">Your Library</span>
                      <h3 className="text-xl font-black text-white tracking-tight">Bookmarks</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                      aria-label="Close"
                    >
                      <CloseIcon className="text-lg" />
                    </button>
                  </div>

                  {/* Surah | Juz */}
                  <div role="tablist" className="flex items-center gap-1 rounded-2xl bg-white/5 p-1 border border-white/10 my-3">
                    {(["surah", "juz"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="tab"
                        aria-selected={tab === k}
                        onClick={() => setTab(k)}
                        className={cn(
                          "flex-1 rounded-xl py-1.5 text-center text-xs font-bold transition-all cursor-pointer",
                          tab === k ? "bg-emerald-600 text-white shadow-md" : "text-sand-200/60 hover:text-white"
                        )}
                      >
                        {k === "surah" ? "Surah" : "Juz"}
                        {counts[k] > 0 && <span className="ml-1.5 tabular-nums opacity-70">{counts[k]}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="relative mb-3">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-200/50 text-base pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search bookmarks..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full rounded-2xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all"
                    />
                  </div>

                  <div className="no-scrollbar flex-1 overflow-y-auto space-y-2 pr-1 pt-1">
                    {shown.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                        <BookmarkIcon className="text-2xl text-emerald-400/70" />
                        <p className="text-xs text-sand-200/70">
                          {query ? "No matching bookmarks." : `No ${tab === "surah" ? "Surah" : "Juz"} bookmarks yet.`}
                        </p>
                        {!query && (
                          <p className="text-[11px] text-sand-200/50">
                            In reading mode, tap the bookmark beside « Page » to keep the ayah you&apos;re on here.
                          </p>
                        )}
                      </div>
                    ) : (
                      shown.map(renderCard)
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
