"use client";

import { useEffect, useState } from "react";
import {
  TAJWEED_LEGEND,
  fetchSurahGlyphs,
  glyphInkPadding,
  glyphStyle,
  loadPageFont,
  type GlyphVerse,
} from "@/lib/data/quranGlyphs";
import { GlyphWordSvg, useGlyphPaths, type GlyphFile } from "./GlyphWords";

type Run = [text: string, colour: number | null];
/** `nl`: words drawn with the font's `liga` off — a colour changes inside
 *  one of its ligatures there (a glyph is painted in one colour). */
type Ayah = { a: number; w: Run[][]; nl?: number[] };

const NO_LIGA = { fontFeatureSettings: '"liga" 0' } as const;

const SIZES = [28, 34, 42];

// Browser check (one screenshot on a device): the same cases as
// scripts/qa/indopak-tajweed-webkit.py. Chromium and WebKitGTK 2.52.6 give
// the "expected" column; the marks row is what decides the next step.
const T = "#3b82f6";
const CHECKS: { html: string; liga: boolean; expect: string }[] = [
  { html: `لِّلۡمُتَّقِ<b>يۡ</b>نَ`, liga: true, expect: "liga on: ي and ن blue (ligature)" },
  { html: `لِّلۡمُتَّقِ<b>يۡ</b>نَ`, liga: false, expect: "liga off: ي blue, ن white" },
  { html: `اشۡتَ<b>ر</b>َوُا`, liga: true, expect: "liga on: no blue (ligature)" },
  { html: `اشۡتَ<b>ر</b>َوُا`, liga: false, expect: "liga off: ر blue" },
  { html: `<i>ا</i><b>للّٰ</b>هُ`, liga: false, expect: "Allah: ا grey, both ل blue, ه white" },
  { html: `غِشَاوَة<b>ٌ</b>`, liga: true, expect: "mark: tanween blue? (Chromium / WebKitGTK: no)" },
  { html: `ذ<b>ٰ</b>لِكَ`, liga: true, expect: "mark: small alef blue? (Chromium / WebKitGTK: no)" },
  { html: `اِلَّا<b>ۤ</b>`, liga: true, expect: "mark: maddah blue? (Chromium / WebKitGTK: no)" },
];

// Glyph-drawn marks (rows 9–11): the words of the mark rows, drawn glyph by glyph.
const GLYPH_CHECKS: { a: number; w: number; expect: string }[] = [
  { a: 7, w: 9, expect: "glyphs: tanween grey" },
  { a: 2, w: 1, expect: "glyphs: small alef pink" },
  { a: 9, w: 7, expect: "glyphs: maddah pink-red" },
];

function BrowserCheck({ glyphs, paths, texts }: { glyphs: GlyphFile | null; paths: Map<number, string> | null; texts: Ayah[] | null }) {
  const [ua, setUa] = useState("");
  useEffect(() => setUa(navigator.userAgent), []);
  return (
    <section className="mt-6 rounded-xl border border-white/15 p-3">
      <h2 className="text-sm font-semibold">Browser check — screenshot this box</h2>
      <p className="mt-1 break-all text-[11px] text-sand-300/70">{ua}</p>
      <style>{`.bc b{font-weight:normal;color:${T}} .bc i{font-style:normal;color:#999}`}</style>
      <ol className="mt-2 grid gap-x-4 sm:grid-cols-2">
        {CHECKS.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-3 border-t border-white/10 py-1">
            <span className="text-xs text-sand-300/90">
              {i + 1}. {c.expect}
            </span>
            <span
              dir="rtl"
              lang="ar"
              className="bc font-arabic quran-indopak shrink-0 text-white"
              style={{ fontSize: 44, lineHeight: 1.6, ...(c.liga ? {} : NO_LIGA) }}
              dangerouslySetInnerHTML={{ __html: c.html }}
            />
          </li>
        ))}
        {GLYPH_CHECKS.map((c, i) => {
          const word = glyphs?.ayahs.find((x) => x.a === c.a)?.w[c.w - 1];
          const text = texts?.find((x) => x.a === c.a)?.w[c.w - 1].map(([t]) => t).join("") ?? "";
          return (
            <li key={`g${i}`} className="flex items-center justify-between gap-3 border-t border-white/10 py-1">
              <span className="text-xs text-sand-300/90">
                {CHECKS.length + i + 1}. {c.expect}
              </span>
              <span dir="rtl" className="shrink-0 py-1">
                {word && glyphs && paths ? (
                  <GlyphWordSvg word={word} text={text} file={glyphs} paths={paths} size={44} />
                ) : (
                  <span className="text-xs text-sand-300/60">Loading…</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function IndoPakTajweedPreview() {
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [uthmani, setUthmani] = useState<Map<number, GlyphVerse> | null>(null);
  const [failed, setFailed] = useState(false);
  const [coloured, setColoured] = useState(true);
  const [size, setSize] = useState(1);
  const [glyphs, setGlyphs] = useState<GlyphFile | null>(null);
  const paths = useGlyphPaths(glyphs);

  useEffect(() => {
    fetch("/data/quran-indopak-tajweed/2.glyphs.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setGlyphs, () => {});
  }, []);

  useEffect(() => {
    fetch("/data/quran-indopak-tajweed/2.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAyahs, () => setFailed(true));
  }, []);

  // The app's Uthmani Tajweed: QPC V4 page fonts, the pages these ayahs are on.
  useEffect(() => {
    if (!ayahs) return;
    let cancelled = false;
    const wanted = new Set(ayahs.map((x) => x.a));
    fetchSurahGlyphs(2).then(async (verses) => {
      if (!verses || cancelled) return;
      const shown = verses.filter((v) => wanted.has(v.a));
      const pages = new Set(shown.flatMap((v) => [...v.w.map((w) => w[1]), ...(v.e ? [v.e[1]] : [])]));
      await Promise.all([...pages].map((p) => loadPageFont(p)));
      if (!cancelled) setUthmani(new Map(shown.map((v) => [v.a, v])));
    });
    return () => {
      cancelled = true;
    };
  }, [ayahs]);

  return (
    <div data-no-splash className="fixed inset-0 overflow-y-auto bg-black px-4 pb-16 pt-6 text-sand-50 select-text">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-lg font-semibold">IndoPak Tajweed · prototype</h1>
        <p className="mt-1 text-sm text-sand-300/80">
          Al-Baqarah 1–20 · the Uthmani (QPC V4) Tajweed colours carried onto the IndoPak text. Each ayah: the app&apos;s
          Uthmani Tajweed beside the IndoPak — check the letters still join and the colours match.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setColoured((v) => !v)}
            className="rounded-full border border-white/20 px-3 py-1.5 hover:bg-white/10"
          >
            {coloured ? "Colours on" : "Colours off"}
          </button>
          {SIZES.map((px, i) => (
            <button
              key={px}
              type="button"
              onClick={() => setSize(i)}
              className={`rounded-full border px-3 py-1.5 ${i === size ? "border-amber-400/80 text-amber-300" : "border-white/20 hover:bg-white/10"}`}
            >
              {px}px
            </button>
          ))}
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-sand-300/90 sm:grid-cols-4">
          {TAJWEED_LEGEND.map((l) => (
            <li key={l.en} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
              {l.en}
            </li>
          ))}
        </ul>

        <BrowserCheck glyphs={glyphs} paths={paths} texts={ayahs} />

        {failed && <p className="mt-8 text-red-300">Couldn&apos;t load the prototype data.</p>}
        {!ayahs && !failed && <p className="mt-8 text-sand-300/70">Loading…</p>}

        {ayahs && (
          <div className="mt-8 hidden grid-cols-2 gap-6 text-xs uppercase tracking-wider text-sand-300/60 md:grid">
            <span>Uthmani · QPC V4 (app)</span>
            <span>IndoPak · text (top) · glyphs, SVG (below)</span>
          </div>
        )}

        <div className="mt-2 divide-y divide-white/10">
          {ayahs?.map(({ a, w, nl }) => {
            const u = uthmani?.get(a);
            return (
              <div key={a} className="grid gap-x-6 gap-y-2 py-5 md:grid-cols-2">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sand-300/50 md:hidden">Uthmani · QPC V4</span>
                  <p dir="rtl" lang="ar" style={{ fontSize: SIZES[size], lineHeight: 2.1 }}>
                    {!u ? (
                      <span className="font-sans text-sm text-sand-300/60">Loading…</span>
                    ) : (
                      <>
                        {u.w.map(([code, page], wi) => (
                          <span key={wi}>
                            <span style={{ ...glyphStyle(page, coloured), ...glyphInkPadding(code, page) }}>{code}</span>{" "}
                          </span>
                        ))}
                        {u.e && <span style={glyphStyle(u.e[1], coloured)}>{u.e[0]}</span>}
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sand-300/50 md:hidden">IndoPak · prototype</span>
                  <p dir="rtl" lang="ar" className="font-arabic quran-indopak" style={{ fontSize: SIZES[size], lineHeight: 2.1 }}>
                    {w.map((runs, wi) => (
                      <span key={wi} style={coloured && nl?.includes(wi) ? NO_LIGA : undefined}>
                        {runs.map(([text, c], ri) =>
                          coloured && c !== null ? (
                            <span key={ri} style={{ color: TAJWEED_LEGEND[c]?.color }}>
                              {text}
                            </span>
                          ) : (
                            text
                          )
                        )}{" "}
                      </span>
                    ))}
                    <span className="font-sans text-base text-sand-300/60"> ({a})</span>
                  </p>
                  <span className="text-[11px] uppercase tracking-wider text-sand-300/50">IndoPak · glyphs (SVG)</span>
                  <p dir="rtl" lang="ar" className="flex flex-wrap items-center gap-x-[0.3em] gap-y-1" style={{ fontSize: SIZES[size] }}>
                    {glyphs && paths
                      ? glyphs.ayahs
                          .find((x) => x.a === a)
                          ?.w.map((gw, wi) => (
                            <GlyphWordSvg
                              key={wi}
                              word={gw}
                              text={w[wi].map(([t]) => t).join("")}
                              file={glyphs}
                              paths={paths}
                              size={SIZES[size]}
                              coloured={coloured}
                            />
                          ))
                      : <span className="font-sans text-sm text-sand-300/60">Loading…</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
