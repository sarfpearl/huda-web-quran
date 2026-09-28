"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { QURAN_SURAHS } from "@/lib/data/service";
import {
  fetchSurahVerses,
  toArabicNumerals,
  CANONICAL_BISMILLAH,
  type AyahVerse,
} from "@/lib/data/quranVerses";
import {
  fetchSurahGlyphs,
  glyphFontsFor,
  glyphInkPadding,
  glyphStyle,
  isWebKit,
  loadPageFont,
  unloadPageFont,
  type GlyphVerse,
} from "@/lib/data/quranGlyphs";
import { MUSHAF_PAGE_COUNT, MUSHAF_PAGE_STARTS, mushafPageOf } from "@/lib/data/mushafPages";

/** A run of ayahs inside one Surah (a whole Surah, or part of one in a Juz). */
export interface ReadingRange {
  surah: number;
  from: number;
  to: number;
}

type AyahRef = { surah: number; ayah: number };

interface ReadingViewProps {
  /** What is being read, in order: one Surah, or a Juz's ayahs Surah by Surah. */
  ranges: ReadingRange[];
  /** Accessible name ("Al-Baqarah", "Juz 2"). */
  label: string;
  reciterId?: string | null;
  /** Ayah being recited, or null when nothing is. */
  active?: AyahRef | null;
  /** Tap an ayah → recite from it. */
  onSeekAyah?: (surah: number, ayah: number) => void;
  /** Tajweed colours (QPC V4 page fonts), as the main verse view. */
  tajweed?: boolean;
  /** Word being recited in the active ayah (0-based, -1 = none). */
  activeWordIndex?: number;
  /** Tap a word → recite from its start. */
  onSeekWord?: (surah: number, ayah: number, startTime: number) => void;
  /** Mushaf page at the top of the view, as the reader scrolls. */
  onVisiblePageChange?: (page: number) => void;
  /** Bump `n` to scroll to `page` (page steps that can't move the audio). */
  scrollToPage?: { page: number; n: number } | null;
}

const verseCount = (s: number) => QURAN_SURAHS.find((x) => x.number === s)?.verses ?? 0;
const nextRef = ({ surah, ayah }: AyahRef): AyahRef | null =>
  ayah < verseCount(surah) ? { surah, ayah: ayah + 1 } : surah < 114 ? { surah: surah + 1, ayah: 1 } : null;
const prevRef = ({ surah, ayah }: AyahRef): AyahRef | null =>
  ayah > 1 ? { surah, ayah: ayah - 1 } : surah > 1 ? { surah: surah - 1, ayah: verseCount(surah - 1) } : null;
const before = (a: AyahRef, b: AyahRef) => a.surah < b.surah || (a.surah === b.surah && a.ayah < b.ayah);
/** Every ayah from `a` to `b`, inclusive (empty when b is before a). */
function refsBetween(a: AyahRef | null, b: AyahRef | null): AyahRef[] {
  const out: AyahRef[] = [];
  for (let r = a; r && b && !before(b, r); r = nextRef(r)) out.push(r);
  return out;
}
const pageStart = (page: number): AyahRef => {
  const [surah, ayah] = MUSHAF_PAGE_STARTS[page - 1];
  return { surah, ayah };
};
// Al-Fatihah's Bismillah is ayah 1; At-Tawbah has none.
const hasBismillah = (s: number) => s !== 1 && s !== 9;

/** "prev" / "next": the rest of the first / last page, outside what's read. */
type Ctx = "prev" | "cur" | "next";
type Part = { ref: AyahRef; ctx: Ctx; page: number; from: number; to: number; end: boolean };
type Item = { kind: "head"; surah: number; ctx: Ctx; page: number } | { kind: "part"; part: Part };

/**
 * Reading mode (like Quran.com's "Reading · Arabic"), on the home scene: the
 * Surah or Juz as Madinah-Mushaf pages over the background — each page closed
 * by a numbered divider, an ayah split where the page breaks it. Where the
 * Surah / Juz starts or ends part-way down a page, the rest of that page shows
 * dimmed, as in a printed Mushaf. The recited word turns gold (as the main
 * verse view) and is kept in view; the player shrinks to its compact pill.
 */
export function ReadingView({
  ranges,
  label,
  reciterId,
  active = null,
  onSeekAyah,
  tajweed = false,
  activeWordIndex = -1,
  onSeekWord,
  onVisiblePageChange,
  scrollToPage = null,
}: ReadingViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rangesKey = ranges.map((r) => `${r.surah}:${r.from}-${r.to}`).join(",");

  // What's read, plus the ayahs around it that can share its first / last page
  // (one page beyond each end, so an ayah running over a page break is covered;
  // the page filter below keeps only what's really on those pages).
  const plan = useMemo(() => {
    const first: AyahRef = { surah: ranges[0].surah, ayah: ranges[0].from };
    const lastR = ranges[ranges.length - 1];
    const last: AyahRef = { surah: lastR.surah, ayah: lastR.to };
    const cur = ranges.flatMap((r) => refsBetween({ surah: r.surah, ayah: r.from }, { surah: r.surah, ayah: r.to }));
    const p0 = mushafPageOf(first.surah, first.ayah);
    const prevFrom = prevRef(pageStart(p0)); // may run onto p0
    const prev = prevFrom ? refsBetween(prevFrom, prevRef(first)) : [];
    const p1 = mushafPageOf(last.surah, last.ayah);
    const nextTo = p1 + 2 <= MUSHAF_PAGE_COUNT ? prevRef(pageStart(p1 + 2)) : { surah: 114, ayah: 6 };
    const next = refsBetween(nextRef(last), nextTo);
    const all = [
      ...prev.map((ref) => ({ ref, ctx: "prev" as Ctx })),
      ...cur.map((ref) => ({ ref, ctx: "cur" as Ctx })),
      ...next.map((ref) => ({ ref, ctx: "next" as Ctx })),
    ];
    return { all, surahs: [...new Set(all.map((x) => x.ref.surah))] };
  }, [rangesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const surahsKey = plan.surahs.join(",");

  const [verses, setVerses] = useState<Map<number, AyahVerse[]> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setVerses(null);
    setFailed(false);
    scrollRef.current?.scrollTo({ top: 0 });
    Promise.all(plan.surahs.map((s) => fetchSurahVerses(s, reciterId).then((v) => [s, v] as const))).then(
      (entries) => !cancelled && setVerses(new Map(entries)),
      () => !cancelled && setFailed(true)
    );
    return () => {
      cancelled = true;
    };
  }, [surahsKey, reciterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Madinah-Mushaf glyph words, like the main verse view: Tajweed palette when
  // on, plain white when off (WebKit: page fonts only while Tajweed is on, see
  // isWebKit). A word shows as Uthmani text until its page font is in.
  const useGlyphs = glyphFontsFor(tajweed);
  const [glyphs, setGlyphs] = useState<Map<number, GlyphVerse[]> | null>(null);
  useEffect(() => {
    setGlyphs(null);
    if (!useGlyphs) return;
    let cancelled = false;
    // Surah headers' Bismillah is 1:1's glyphs (Mushaf page 1).
    const need = [...new Set([1, ...plan.surahs])];
    Promise.all(need.map((s) => fetchSurahGlyphs(s).then((g) => [s, g] as const))).then((entries) => {
      if (cancelled) return;
      const map = new Map<number, GlyphVerse[]>();
      for (const [s, g] of entries) if (g) map.set(s, g);
      setGlyphs(map);
    });
    return () => {
      cancelled = true;
    };
  }, [surahsKey, useGlyphs]); // eslint-disable-line react-hooks/exhaustive-deps

  // Page fonts. Chromium / Firefox: every page, one by one in reading order.
  // WebKit: a whole Surah of COLR page fonts (Al-Baqarah: 49) crashed iPhone
  // Safari ("A problem repeatedly occurred"), so only the page at the top of
  // the view and the next one are drawn from fonts; pages scrolled away from
  // are unloaded again and read as text until they come back.
  const windowed = useMemo(() => isWebKit(), []);
  const [viewPage, setViewPage] = useState<number | null>(null);
  const [loadedPages, setLoadedPages] = useState<ReadonlySet<number>>(new Set());
  const allPagesKey = useMemo(() => {
    if (!glyphs) return "";
    const pages = new Set<number>();
    for (const { ref, ctx } of plan.all) {
      const g = glyphs.get(ref.surah)?.find((v) => v.a === ref.ayah);
      if (!g) continue;
      // Neighbouring text sits only on the first / last page, which the
      // Surah / Juz itself uses too.
      if (ctx === "cur") {
        g.w.forEach((w) => pages.add(w[1]));
        if (g.e) pages.add(g.e[1]);
      }
    }
    return [...pages].sort((a, b) => a - b).join(",");
  }, [glyphs, plan]);
  const wantedKey = useMemo(() => {
    if (!allPagesKey) return "";
    const all = allPagesKey.split(",").map(Number);
    if (!windowed) return ["1", ...all].join(",");
    const at = viewPage ?? all[0];
    return [1, ...all.filter((p) => p === at || p === at + 1)].join(",");
  }, [allPagesKey, windowed, viewPage]);
  const ownedRef = useRef<Set<number>>(new Set()); // fonts this view loaded (WebKit unloads them)
  useEffect(() => {
    if (!wantedKey) return;
    const wanted = new Set(wantedKey.split(",").map(Number));
    let cancelled = false;
    if (windowed) {
      for (const page of [...ownedRef.current]) {
        if (wanted.has(page)) continue;
        unloadPageFont(page);
        ownedRef.current.delete(page);
      }
    }
    setLoadedPages((prev) => {
      const next = new Set([...prev].filter((p) => wanted.has(p)));
      return next.size === prev.size ? prev : next;
    });
    (async () => {
      for (const page of wanted) {
        if (cancelled) return;
        if (await loadPageFont(page)) {
          if (cancelled) return;
          if (windowed && page !== 1) ownedRef.current.add(page);
          setLoadedPages((prev) => (prev.has(page) ? prev : new Set(prev).add(page)));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wantedKey, windowed]);
  // Leaving reading mode on WebKit: drop its page fonts.
  useEffect(
    () => () => {
      for (const page of ownedRef.current) unloadPageFont(page);
      ownedRef.current.clear();
    },
    []
  );

  const verseOf = (r: AyahRef) => verses?.get(r.surah)?.find((v) => v.ayahNumber === r.ayah) ?? null;
  const glyphOf = (r: AyahRef) => (useGlyphs ? glyphs?.get(r.surah)?.find((v) => v.a === r.ayah) ?? null : null);
  // Waiting on the glyph data (not the fonts) keeps the page layout from
  // jumping once it arrives; without glyphs, pages are per ayah.
  const glyphsPending = useGlyphs && glyphs === null;

  // Pages: split every ayah by its words' pages, then keep only the parts of
  // the neighbouring ayahs that sit on the first / last page.
  const pages = useMemo(() => {
    if (!verses || glyphsPending) return null;
    const items: Item[] = [];
    for (const { ref, ctx } of plan.all) {
      const g = glyphOf(ref);
      const parts: Part[] = [];
      if (g && g.w.length) {
        let start = 0;
        for (let i = 1; i <= g.w.length; i++) {
          if (i === g.w.length || g.w[i][1] !== g.w[start][1]) {
            parts.push({ ref, ctx, page: g.w[start][1], from: start, to: i - 1, end: i === g.w.length });
            start = i;
          }
        }
      } else {
        parts.push({ ref, ctx, page: mushafPageOf(ref.surah, ref.ayah), from: 0, to: Infinity, end: true });
      }
      if (ref.ayah === 1) items.push({ kind: "head", surah: ref.surah, ctx, page: parts[0].page });
      for (const part of parts) items.push({ kind: "part", part });
    }
    const curPages = items.filter((it) => (it.kind === "part" ? it.part.ctx : it.ctx) === "cur").map((it) => (it.kind === "part" ? it.part.page : it.page));
    const firstPage = Math.min(...curPages);
    const lastPage = Math.max(...curPages);
    const kept = items.filter((it) => {
      const ctx = it.kind === "part" ? it.part.ctx : it.ctx;
      const page = it.kind === "part" ? it.part.page : it.page;
      return ctx === "cur" || (ctx === "prev" ? page === firstPage : page === lastPage);
    });
    const blocks: { page: number; items: Item[] }[] = [];
    for (const it of kept) {
      const page = it.kind === "part" ? it.part.page : it.page;
      if (blocks[blocks.length - 1]?.page !== page) blocks.push({ page, items: [] });
      blocks[blocks.length - 1].items.push(it);
    }
    return blocks;
  }, [verses, glyphs, glyphsPending, plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the recited ayah in view.
  const activeKey = active ? `${active.surah}:${active.ayah}` : null;
  useEffect(() => {
    if (!activeKey || !pages) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-key="${activeKey}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeKey, pages]);

  // Page steps that can't move the audio scroll the page into view instead.
  useEffect(() => {
    if (!scrollToPage || !pages) return;
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-page="${scrollToPage.page}"]`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [scrollToPage?.n, pages]); // eslint-disable-line react-hooks/exhaustive-deps

  // A page switching between text and glyphs changes height; keep the page at
  // the top of the view where it was so the reading doesn't jump.
  const anchorRef = useRef<{ page: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const a = anchorRef.current;
    if (!el || !a) return;
    const node = el.querySelector<HTMLElement>(`[data-page="${a.page}"]`);
    if (!node) return;
    const delta = node.getBoundingClientRect().top - a.top;
    if (Math.abs(delta) > 1) el.scrollTop += delta;
    anchorRef.current = { page: a.page, top: node.getBoundingClientRect().top };
  }, [loadedPages]);

  // Page shown in the player strip = the page still visible at the top of the
  // view (reading along in one's own voice, not the audio).
  const pageCbRef = useRef(onVisiblePageChange);
  pageCbRef.current = onVisiblePageChange;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pages?.length) return;
    // Settles ~80ms after scrolling moves (a timer, not rAF: cheap, and it
    // still runs where frames are throttled).
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // A line's worth below the faded top edge.
        const top = el.getBoundingClientRect().top + 40;
        let page = pages[0].page;
        for (const node of el.querySelectorAll<HTMLElement>("[data-page]")) {
          const b = node.getBoundingClientRect();
          if (b.bottom > top) {
            page = Number(node.dataset.page);
            anchorRef.current = { page, top: b.top };
            break;
          }
        }
        pageCbRef.current?.(page);
        setViewPage(page);
      }, 80);
    };
    report();
    el.addEventListener("scroll", report, { passive: true });
    window.addEventListener("resize", report);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", report);
      window.removeEventListener("resize", report);
    };
  }, [pages]);

  // The recited word turns gold with a soft glow, as in the main verse view:
  // glyph words through the font's gold palette (Tajweed colours kept), text
  // words through colour.
  const wordProps = (r: AyahRef, v: AyahVerse | null, i: number, isActive: boolean, live: boolean) => {
    const t = v?.words?.[i];
    const seekable = Boolean(live && onSeekWord && t && t.endTime > t.startTime);
    return {
      "data-word-idx": i,
      "aria-current": isActive ? ("true" as const) : undefined,
      className: `quran-word ${isActive ? "text-amber-300 quran-word-glow" : ""} ${seekable ? "cursor-pointer" : ""}`,
      onClick: seekable
        ? (ev: React.MouseEvent) => {
            ev.stopPropagation();
            if (window.getSelection()?.toString()) return;
            onSeekWord!(r.surah, r.ayah, t!.startTime);
          }
        : undefined,
    };
  };
  const glyphWord = (code: string, page: number, text: string, isActive = false) =>
    loadedPages.has(page) ? (
      <>
        <span aria-hidden="true" style={{ ...glyphStyle(page, tajweed, isActive), ...glyphInkPadding(code, page) }}>
          {code}
        </span>
        <span className="sr-only">{text}</span>
      </>
    ) : (
      text
    );
  const ayahText = (r: AyahRef, v: AyahVerse) =>
    hasBismillah(r.surah) && r.ayah === 1 ? v.textArabic.replace(CANONICAL_BISMILLAH.textArabic, "").trim() : v.textArabic;

  const renderPart = (p: Part, key: string) => {
    const { ref, ctx } = p;
    const v = verseOf(ref);
    const g = glyphOf(ref);
    const live = ctx === "cur";
    const k = `${ref.surah}:${ref.ayah}`;
    const activeIdx = live && k === activeKey ? activeWordIndex : -1;
    let words: React.ReactNode;
    if (g) {
      words = g.w.slice(p.from, p.to + 1).map(([code, page, text], j) => {
        const i = p.from + j;
        return (
          <Fragment key={i}>
            {j > 0 && " "}
            <span {...wordProps(ref, v, i, i === activeIdx, live)}>{glyphWord(code, page, text, i === activeIdx)}</span>
          </Fragment>
        );
      });
    } else if (v?.words?.length) {
      words = v.words.map((w, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span {...wordProps(ref, v, i, i === activeIdx, live)}>{w.word}</span>
        </Fragment>
      ));
    } else {
      words = v ? ayahText(ref, v) : null;
    }
    return (
      <Fragment key={key}>
        <span
          data-key={live ? k : undefined}
          onClick={live && onSeekAyah ? () => onSeekAyah(ref.surah, ref.ayah) : undefined}
          aria-hidden={live ? undefined : true}
          className={live ? (onSeekAyah ? "cursor-pointer" : undefined) : "opacity-35 pointer-events-none select-none"}
        >
          {words}
          {p.end &&
            (g?.e && loadedPages.has(g.e[1]) ? (
              <span aria-label={`Ayah ${ref.ayah}`} className="mx-1.5 select-none" style={glyphStyle(g.e[1], tajweed)}>
                {g.e[0]}
              </span>
            ) : (
              <span
                aria-label={`Ayah ${ref.ayah}`}
                className="font-arabic mx-1.5 align-middle text-[1.1em] text-amber-300 select-none [letter-spacing:0]"
              >
                {toArabicNumerals(ref.ayah)}
              </span>
            ))}
        </span>{" "}
      </Fragment>
    );
  };

  const bismillahGlyphs = glyphs?.get(1)?.find((v) => v.a === 1) ?? null;
  const renderHead = (surah: number, ctx: Ctx, key: string) => {
    const s = QURAN_SURAHS.find((x) => x.number === surah);
    return (
      <div
        key={key}
        aria-hidden={ctx === "cur" ? undefined : true}
        className={`py-4 text-center ${ctx === "cur" ? "" : "opacity-35 select-none"}`}
      >
        <h2 lang="ar" dir="rtl" className="font-arabic text-4xl sm:text-5xl text-amber-300 quran-arabic-shadow">
          {s?.arabicName}
        </h2>
        {hasBismillah(surah) && (
          <p lang="ar" dir="rtl" className="font-arabic mt-4 text-2xl sm:text-3xl text-sand-50/90 quran-arabic-shadow">
            {bismillahGlyphs
              ? bismillahGlyphs.w.map(([code, page, text], i) => (
                  <Fragment key={i}>
                    {i > 0 && " "}
                    <span>{glyphWord(code, page, text)}</span>
                  </Fragment>
                ))
              : CANONICAL_BISMILLAH.textArabic}
          </p>
        )}
      </div>
    );
  };

  // A page's items: Surah headers on their own lines, ayah text flowing between.
  const renderPage = (items: Item[]) => {
    const out: React.ReactNode[] = [];
    let run: Part[] = [];
    const flush = () => {
      if (!run.length) return;
      const parts = run;
      run = [];
      out.push(
        <p
          key={`t${out.length}`}
          lang="ar"
          dir="rtl"
          className="font-arabic text-center text-[1.6rem] sm:text-4xl leading-[2.3] sm:leading-[2.4] text-white quran-arabic-shadow"
        >
          {parts.map((p, i) => renderPart(p, `${p.ref.surah}:${p.ref.ayah}:${p.from}:${i}`))}
        </p>
      );
    };
    for (const it of items) {
      if (it.kind === "part") run.push(it.part);
      else {
        flush();
        out.push(renderHead(it.surah, it.ctx, `h${it.surah}`));
      }
    }
    flush();
    return out;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      aria-label={`Reading ${label}`}
      className="absolute inset-0 z-20 pointer-events-none"
    >
      {/* Scrolls between the header and the compact player; edges fade out */}
      <div
        ref={scrollRef}
        className="no-scrollbar pointer-events-auto absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+5.5rem)] bottom-[calc(var(--vv-bottom,0px)+9.5rem)] overflow-y-auto overscroll-contain select-text [mask-image:linear-gradient(to_bottom,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-8 py-8 min-h-full flex flex-col justify-center">
          {failed ? (
            <p className="py-16 text-center text-sm text-sand-200/70">This couldn&apos;t be loaded right now.</p>
          ) : !pages ? (
            <div className="space-y-4" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
          ) : (
            pages.map((b) => (
              <section key={b.page} data-page={b.page} aria-label={`Page ${b.page}`}>
                {renderPage(b.items)}
                {/* Page divider with its number, as a Mushaf page foot */}
                <div className="my-5 flex items-center gap-3 select-none" aria-hidden="true">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/45" />
                  <span className="rounded-full border border-white/25 bg-black/35 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-sand-100">
                    {b.page}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/45" />
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
