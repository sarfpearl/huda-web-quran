"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  getEffectiveWords,
  getVoiceProgressInSegment,
  toArabicNumerals,
  type AyahVerse,
  type RecitationSegment,
} from "@/lib/data/quranVerses";

interface CenterVerseDisplayProps {
  currentVerse: AyahVerse | null;
  currentSegment?: RecitationSegment | null;
  currentTime?: number;
  isPlaying?: boolean;
  language?: "en" | "ta";
  showTranslation?: boolean;
  activeWordIndex?: number;
  hasWordTiming?: boolean;
  /** Whether the selected reciter supports word-level voice sync. When false
   *  (Verse Sync reciters), the verse text and translation are hidden entirely,
   *  since the voice and on-screen letters do not line up word-for-word. */
  reciterWordSync?: boolean;
  /** When a 30 Juz track is playing, hide center verses to focus purely on the 8K artwork */
  isJuz?: boolean;
  /** Before the first play, greet the visitor instead of showing the ayah. */
  showGreeting?: boolean;
}

const GREETING = {
  en: { line: "As-salamu alaykum", meaning: "Peace be upon you" },
  ta: { line: "அஸ்ஸலாமு அலைக்கும்", meaning: "உங்கள் மீது சாந்தி உண்டாவதாக" },
} as const;

function Greeting({ language, style }: { language: "en" | "ta"; style: React.CSSProperties }) {
  const g = GREETING[language];
  // Fit: shrink the whole greeting to the room between the header and the
  // player (short landscape phones, tall players); hide it when there is
  // effectively none.
  const stageRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const body = bodyRef.current;
    if (!stage || !body) return;
    const fit = () => {
      const cs = getComputedStyle(stage);
      const room = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const need = body.offsetHeight;
      setScale(need > 0 ? Math.min(1, Math.max(0, room) / need) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    ro.observe(body);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={stageRef}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-4 sm:px-8 pt-16 sm:pt-20 pb-48 sm:pb-52 md:pb-56"
      style={style}
    >
      <div
        ref={bodyRef}
        className="flex shrink-0 flex-col items-center text-center gap-3 sm:gap-4 select-none animate-in fade-in duration-500"
        style={{ transform: scale < 1 ? `scale(${scale})` : undefined, visibility: scale < 0.25 ? "hidden" : undefined }}
      >
        {/* Leading repeated per breakpoint: sm:/md:/lg:text-* each carry their own
            line-height (1 from 6xl up), which would drop the tails of م / ك into
            the English line below. */}
        <h2
          dir="rtl"
          lang="ar"
          className="font-arabic font-normal text-amber-300 leading-[1.6] sm:leading-[1.6] md:leading-[1.6] lg:leading-[1.6] quran-arabic-shadow [text-shadow:0_0_22px_rgba(251,191,36,0.55),0_1px_3px_rgba(0,0,0,0.9)] text-6xl sm:text-7xl md:text-8xl lg:text-9xl"
        >
          السَّلَامُ عَلَيْكُمْ
        </h2>
        <p
          lang={language}
          className={`${language === "ta" ? "font-tamil" : "font-serif sm:font-sans"} text-white text-2xl sm:text-3xl md:text-4xl tracking-wide quran-translation-shadow`}
        >
          {g.line}
        </p>
        <p
          lang={language}
          className={`${language === "ta" ? "font-tamil" : "font-serif sm:font-sans"} text-sand-50/75 text-base sm:text-lg md:text-xl tracking-wide quran-translation-shadow`}
        >
          {g.meaning}
        </p>
      </div>
    </div>
  );
}

/**
 * Authentic Madinah-mushaf end-of-ayah marker. The Uthmanic Hafs font's own
 * Arabic-Indic digit glyphs ARE the ornamental ayah rosette — rendering the
 * number alone (no U+06DD, RTL, no letter-spacing) encloses it in the ornament.
 * (Adding U+06DD would draw a second empty ornament next to it.)
 */
/** True when a pane's text block is taller than the pane (i.e. it must scroll). */
function overflows(pane: HTMLElement) {
  const cs = getComputedStyle(pane);
  const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  return ((pane.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0) + pad > pane.clientHeight + 2;
}

function AyahOrnament({ n }: { n: number }) {
  return (
    <span
      lang="ar"
      dir="rtl"
      aria-label={`Ayah ${n}`}
      className="font-arabic text-amber-300 select-none align-middle mx-1.5 tracking-normal [letter-spacing:0] text-[1.2em]"
    >
      {toArabicNumerals(n)}
    </span>
  );
}

export function CenterVerseDisplay({
  currentVerse,
  currentSegment,
  currentTime,
  isPlaying = false,
  language = "en",
  showTranslation = true,
  activeWordIndex: propWordIndex,
  hasWordTiming: propHasWordTiming,
  reciterWordSync = true,
  isJuz = false,
  showGreeting = false,
}: CenterVerseDisplayProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reserve exactly the space the floating player and the header occupy (both
  // vary with viewport, safe area and the iOS home-screen status bar), so the
  // verse stage never runs underneath either of them.
  const [bottomInset, setBottomInset] = useState<number | null>(null);
  const [topInset, setTopInset] = useState<number | null>(null);
  useEffect(() => {
    const dock = document.querySelector<HTMLElement>("[data-player-dock]");
    const header = document.querySelector<HTMLElement>("[data-scene-header]");
    if (!dock && !header) return;
    const measure = () => {
      // Measured against the full-screen scene (it can run under Safari's bars).
      if (dock) {
        const scene = dock.parentElement?.getBoundingClientRect();
        const top = dock.getBoundingClientRect().top;
        setBottomInset(Math.max(0, (scene?.bottom ?? window.innerHeight) - top) + 4);
      }
      if (header) {
        const scene = header.parentElement?.getBoundingClientRect();
        // The header's own pb-4 (16px) is the gap below its pills.
        setTopInset(Math.max(0, header.getBoundingClientRect().bottom - (scene?.top ?? 0)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    // border-box: the header grows through its safe-area padding, not content.
    if (dock) ro.observe(dock, { box: "border-box" });
    if (header) ro.observe(header, { box: "border-box" });
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const stageInsets = {
    ...(bottomInset != null ? { paddingBottom: bottomInset } : {}),
    ...(topInset != null ? { paddingTop: topInset } : {}),
  };

  // Fit-to-stage: long ayahs (e.g. 2:102, 2:282) are shrunk until the Arabic
  // and meaning panes fit between the header and the player. With the meaning
  // shown they sit side by side (md+: Arabic right, meaning left) or stacked
  // (mobile: Arabic top, meaning bottom). Each pane scrolls on its own once the
  // text hits its readable floor, and auto-follows the recitation.
  const contentRef = useRef<HTMLDivElement>(null);
  const arabicPaneRef = useRef<HTMLDivElement>(null);
  const meaningPaneRef = useRef<HTMLDivElement>(null);
  const activeItemForFit = currentSegment ?? currentVerse;
  const fitKey = currentSegment
    ? `${currentSegment.id}-${currentSegment.type}`
    : `${currentVerse?.surahNumber}-${currentVerse?.verseKey}`;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const panes = () =>
      [arabicPaneRef.current, meaningPaneRef.current].filter((x): x is HTMLDivElement => !!x);
    const fit = () => {
      // Scale font-size (not CSS zoom — zoom changes don't relayout synchronously
      // in every Chromium build, so measurements would be stale). Each text has
      // a readable floor (data-fit-min, px); past that its pane scrolls instead.
      // Binary-search the largest scale at which `group` fits: short ayahs grow
      // into free space (up to data-fit-max), long ones shrink (to data-fit-min).
      const fitGroup = (texts: HTMLElement[], fits: () => boolean, maxOverride?: number) => {
        if (texts.length === 0) return;
        texts.forEach((t) => (t.style.fontSize = ""));
        const bases = texts.map((t) => parseFloat(getComputedStyle(t).fontSize));
        const mins = texts.map((t, j) => Math.min(bases[j], Number(t.dataset.fitMin) || 0));
        // Growth cap depends on screen size: medium on phones, larger on
        // tablets, full on desktop (data-fit-max-mobile / -tablet / -max).
        const vw = window.innerWidth;
        const capOf = (t: HTMLElement) =>
          Number(
            (vw < 640 ? t.dataset.fitMaxMobile : vw < 1024 ? t.dataset.fitMaxTablet : undefined) ??
              t.dataset.fitMax
          ) || 0;
        const maxs = texts.map((t, j) => {
          const cap = capOf(t);
          // Never grow past the cap; shrink the base down to it on small screens.
          const m = cap > 0 ? cap : bases[j];
          return maxOverride ? Math.max(mins[j], Math.min(m, maxOverride)) : m;
        });
        const apply = (scale: number) =>
          texts.forEach(
            (t, j) => (t.style.fontSize = `${Math.min(maxs[j], Math.max(mins[j], bases[j] * scale))}px`)
          );
        apply(1);
        let lo = 1;
        let hi = 2.4;
        if (!fits()) {
          lo = 0.3;
          hi = 1;
        }
        for (let i = 0; i < 8; i++) {
          const mid = (lo + hi) / 2;
          apply(mid);
          if (fits()) lo = mid;
          else hi = mid;
        }
        apply(lo);
      };
      // Fit by real layout height (offsetHeight of each text block), not
      // scrollHeight — glyph ink, the ayah ornament and the scaled active word
      // add phantom overflow that would block growth.
      const blockH = (pn: HTMLElement) => (pn.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
      const textsIn = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>("[data-fit-text]"));
      // Fit inside the stage minus its faded top/bottom strips (20px + 20px) —
      // the panes carry that as padding, so text that fits is never faded.
      const avail = Math.max(0, content.clientHeight - 40);
      const cs = getComputedStyle(content);
      // Arabic has priority: it is sized first, and the meaning is capped at
      // MEANING_RATIO of the Arabic size (Arabic clearly larger than the meaning).
      const MEANING_RATIO = 0.6;
      const [arPane, mnPane] = [arabicPaneRef.current, meaningPaneRef.current];
      const arPx = () => {
        const h = arPane?.querySelector<HTMLElement>("[data-fit-text]");
        return h ? parseFloat(getComputedStyle(h).fontSize) : 0;
      };
      if (cs.flexDirection.startsWith("row")) {
        // Side by side: each column gets the full height; the meaning column is
        // capped relative to the Arabic.
        if (arPane) fitGroup(textsIn(arPane), () => blockH(arPane) <= avail);
        if (mnPane) fitGroup(textsIn(mnPane), () => blockH(mnPane) <= avail, arPx() * MEANING_RATIO);
      } else {
        // Stacked: Arabic first within most of the height (all of it when the
        // meaning is hidden), then the meaning takes what is left.
        const gap = parseFloat(cs.rowGap) || 0;
        const arBudget = mnPane ? avail * 0.68 : avail;
        if (arPane) fitGroup(textsIn(arPane), () => blockH(arPane) <= arBudget);
        if (mnPane) {
          fitGroup(
            textsIn(mnPane),
            () => (arPane ? blockH(arPane) + gap : 0) + blockH(mnPane) <= avail,
            arPx() * MEANING_RATIO
          );
        }
      }
      // Soft top/bottom fade only on a pane that still needs scrolling.
      for (const pn of panes()) {
        pn.scrollTop = 0;
        const mask =
          overflows(pn)
            ? "linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)"
            : "";
        pn.style.maskImage = mask;
        pn.style.webkitMaskImage = mask;
      }
    };
    fit();
    // Re-fit when the stage resizes or the text changes late (word timings,
    // web fonts). A settled fit yields the same sizes, so this doesn't loop.
    const ro = new ResizeObserver(() => fit());
    ro.observe(content);
    content.querySelectorAll("[data-fit-text]").forEach((t) => ro.observe(t));
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    return () => {
      cancelled = true;
      ro.disconnect();
    };
    // showGreeting: the first item (e.g. the Isti'adhah) can arrive while the
    // greeting is still up, so the stage mounts later with the same fitKey.
  }, [fitKey, showTranslation, language, reciterWordSync, Boolean(activeItemForFit), showGreeting]);

  // Auto-scroll: the Arabic pane keeps the active word in view; the meaning
  // pane tracks recitation progress through the ayah.
  useEffect(() => {
    if (typeof propWordIndex !== "number" || propWordIndex < 0) return;
    const ar = arabicPaneRef.current;
    if (ar && overflows(ar)) {
      const el = ar.querySelector<HTMLElement>(`[data-word-idx="${propWordIndex}"]`);
      if (el) {
        const s = ar.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        if (r.top < s.top + s.height * 0.15 || r.bottom > s.bottom - s.height * 0.25) {
          ar.scrollTo({ top: ar.scrollTop + (r.top - s.top) - s.height * 0.3, behavior: "smooth" });
        }
      }
    }
    const mn = meaningPaneRef.current;
    if (mn && overflows(mn)) {
      const total = ar?.querySelectorAll("[data-word-idx]").length ?? 0;
      const p = total > 1 ? Math.min(1, propWordIndex / (total - 1)) : 0;
      // Hold the meaning at its start for the first 20% of the recitation and
      // reach its end by 90%, so both the opening and closing lines get read.
      const progress = Math.min(1, Math.max(0, (p - 0.2) / 0.7));
      const top = progress * (mn.scrollHeight - mn.clientHeight);
      if (Math.abs(top - mn.scrollTop) > 8) mn.scrollTo({ top, behavior: "smooth" });
    }
  }, [propWordIndex, fitKey]);

  // During 30 Juz playback, display pure 8K artwork without mismatched verse overlay
  // NOTE: a Juz recited per-ayah in a chosen reciter's voice DOES pass a verse
  // here (its current ayah) — so we no longer blanket-hide on isJuz; we render
  // whenever there's an active verse. Maher's full-Juz file passes none.
  if (showGreeting) return <Greeting language={language} style={stageInsets} />;

  const activeItem = currentSegment ?? currentVerse;
  if (!activeItem) return null;

  // Verse Sync reciters: hide the verse text + meaning — the recitation audio
  // does not align word-for-word with the on-screen letters, so showing them
  // would be misleading. Just the immersive background + audio play.
  if (!reciterWordSync) return null;

  const isPrelude = "type" in activeItem && (activeItem.type === "istiadhah" || activeItem.type === "bismillah");
  const ayahNum =
    "ayahNumber" in activeItem && typeof activeItem.ayahNumber === "number" && activeItem.ayahNumber > 0
      ? activeItem.ayahNumber
      : currentVerse && typeof currentVerse.ayahNumber === "number" && currentVerse.ayahNumber > 0
      ? currentVerse.ayahNumber
      : 0;

  const hasTrailingAyahMarker = /[\u0660-\u0669\u06dd\uFD3E\uFD3F]\s*$/.test(activeItem.textArabic || "");
  const showOrnament = !isPrelude && ayahNum > 0 && !hasTrailingAyahMarker;

  // Adaptive font sizing based on Arabic length for perfect screen balance
  const arabicLength = activeItem.textArabic?.length || 0;
  const arabicSizeClass =
    arabicLength < 45
      ? "text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
      : arabicLength < 95
      ? "text-2xl sm:text-3xl md:text-4xl lg:text-5xl"
      : arabicLength < 170
      ? "text-xl sm:text-2xl md:text-3xl lg:text-4xl"
      : "text-lg sm:text-xl md:text-2xl lg:text-3xl";

  const translationSizeClass =
    arabicLength < 70
      ? "text-base sm:text-lg md:text-xl lg:text-2xl"
      : "text-sm sm:text-base md:text-lg lg:text-xl";

  // Full canonical Arabic text words
  const rawWords = (activeItem.textArabic || "").trim().split(/\s+/).filter(Boolean);

  // Voice-primary synchronization derived directly from spoken audio waveform
  const effectiveWords = getEffectiveWords(activeItem);
  const resolvedTiming =
    typeof propHasWordTiming === "boolean"
      ? {
          hasWordTiming: propHasWordTiming,
          activeWordIndex: typeof propWordIndex === "number" ? propWordIndex : -1,
        }
      : getVoiceProgressInSegment(activeItem, typeof currentTime === "number" ? currentTime : 0);

  const { hasWordTiming, activeWordIndex } = resolvedTiming;

  // Guarantee that every word of the canonical Arabic verse is ALWAYS rendered
  const wordsToRender =
    effectiveWords.length > 0
      ? effectiveWords
      : rawWords.map((w) => ({ word: w, startTime: 0, endTime: 0 }));

  const itemKey = fitKey;

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none px-4 sm:px-8 md:px-10 pt-16 sm:pt-20 pb-48 sm:pb-52 md:pb-56"
      style={stageInsets}
    >
      <div
        className={`pointer-events-auto relative w-full h-full min-h-0 mx-auto flex flex-col items-center justify-center select-none group ${
          showTranslation ? "max-w-5xl md:max-w-[min(94vw,1800px)]" : "max-w-5xl"
        }`}
      >
        {/* Verse Container (Permanently visible, never trapped in exit animations).
            Meaning shown → split: md+ side by side (Arabic right, meaning left),
            mobile stacked (Arabic top, meaning bottom). Each pane scrolls alone. */}
        <div
          key={itemKey}
          ref={contentRef}
          // Soft fade on the stage's top/bottom edges (below the header, above the
          // player): only text that actually reaches an edge fades out.
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0, #000 20px, #000 calc(100% - 20px), transparent 100%)",
          }}
          className={`flex flex-col w-full h-full min-h-0 justify-center text-center px-2 animate-in fade-in duration-200 ${
            showTranslation
              ? "items-stretch gap-3 sm:gap-4 md:flex-row-reverse md:items-center md:gap-8 lg:gap-12"
              : "items-center"
          }`}
        >
          <div
            ref={arabicPaneRef}
            className={`flex flex-col min-h-0 max-h-full overflow-y-auto overscroll-contain no-scrollbar ${
              // Stacked (mobile): Arabic keeps its fitted height (≤ 68%) and never
              // shrinks — the meaning pane below takes the rest and scrolls.
              // Padding equals the stage's fade strips (20px top / 20px bottom), so
              // a pane scrolled fully to an edge still shows that line clearly.
              showTranslation
                ? "shrink-0 max-h-[68%] pt-[20px] md:pb-[20px] md:max-h-full md:shrink md:flex-[1.35] md:basis-0 md:min-w-0"
                : "w-full pt-[20px] pb-[20px]"
            }`}
          >
          {/* Leading is repeated at md/lg: md:text-* / lg:text-* carry a fixed px
              line-height that would override sm:leading and not scale with auto-fit. */}
          {/* Word row is block-level flex, not inline-flex: an inline-flex row sits on
              the h2's baseline and hangs below its line box, which reads as overflow
              and blocks auto-fit growth. */}
          {/* Main Quran Arabic Calligraphy (Centred, Bold, Glow/Shadow, Voice-Synchronized) */}
          <h2
            data-fit-text
            data-fit-min={22}
            data-fit-max={84}
            data-fit-max-tablet={56}
            data-fit-max-mobile={44}
            dir="rtl"
            lang="ar"
            className={`font-arabic font-normal text-white text-center leading-[1.9] sm:leading-[2] md:leading-[2] lg:leading-[2] tracking-wide quran-arabic-shadow max-w-4xl ${showTranslation ? "md:max-w-none" : ""} m-auto px-4 sm:px-8 md:px-4 py-2 sm:py-3 ${arabicSizeClass}`}
          >
            {wordsToRender.length > 0 ? (
              <span className="flex flex-wrap justify-center items-center gap-x-3 sm:gap-x-4 gap-y-0">
                {wordsToRender.map((w, idx) => {
                  let wordEl: JSX.Element;
                  // If word-level timing does NOT exist: Fallback highlights the complete active Ayah in amber/gold
                  if (!hasWordTiming) {
                    wordEl = (
                      <span
                        key={`${idx}-${w.word}`}
                        data-word-idx={idx}
                        className="relative inline-block text-amber-300 [text-shadow:0_0_18px_rgba(251,191,36,0.75),0_1px_3px_rgba(0,0,0,0.9)] transition-[color,text-shadow,transform] duration-150"
                      >
                        {w.word}
                      </span>
                    );
                  } else {
                    const isActive = idx === activeWordIndex;
                    const isPast =
                      activeWordIndex !== -1
                        ? idx < activeWordIndex
                        : typeof currentTime === "number" && currentTime >= (w.endTime ?? 0);
                    wordEl = (
                      <span
                        key={`${idx}-${w.word}`}
                        data-word-idx={idx}
                        className={`relative inline-block transition-[color,text-shadow,transform] duration-150 ${
                          isActive
                            ? "text-amber-300 [text-shadow:0_0_18px_rgba(251,191,36,0.85),0_1px_3px_rgba(0,0,0,0.9)] scale-[1.04]"
                            : isPast
                            ? "text-white/95"
                            : "text-white/60"
                        }`}
                      >
                        {w.word}
                      </span>
                    );
                  }
                  // Keep the ayah-end ornament glued to the LAST word so it never
                  // wraps onto a line of its own.
                  if (idx === wordsToRender.length - 1 && showOrnament) {
                    return (
                      <span key={`${idx}-${w.word}-end`} className="inline-flex items-center whitespace-nowrap">
                        {wordEl}
                        <AyahOrnament n={ayahNum} />
                      </span>
                    );
                  }
                  return wordEl;
                })}
              </span>
            ) : (
              <span>
                {activeItem.textArabic}
                {showOrnament && (
                  <AyahOrnament n={ayahNum} />
                )}
              </span>
            )}
          </h2>
          </div>

          {/* English / Tamil Meaning — left column on md+, bottom pane on mobile */}
          {showTranslation && (
            <div
              ref={meaningPaneRef}
              className="flex flex-col min-h-0 max-h-full overflow-y-auto overscroll-contain no-scrollbar pb-[20px] md:pt-[20px] md:flex-1 md:basis-0 md:min-w-0 md:border-r md:border-white/15 md:pr-6 lg:pr-10"
            >
            <p
              data-fit-text
              data-fit-min={13}
              data-fit-max={30}
              data-fit-max-tablet={26}
              data-fit-max-mobile={24}
              lang={language === "ta" ? "ta" : "en"}
              className={`${language === "ta" ? "font-tamil" : "font-serif sm:font-sans"} font-normal text-sand-50 text-center leading-[1.8] sm:leading-[2.1] md:leading-[2.1] lg:leading-[2.1] md:text-left tracking-wide quran-translation-shadow px-4 sm:px-6 md:px-2 max-w-3xl md:max-w-none m-auto transition-opacity duration-300 ${translationSizeClass}`}
            >
              {language === "ta"
                ? activeItem.textTamil || activeItem.textEnglish
                : activeItem.textEnglish}
            </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
