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

type Run = [text: string, colour: number | null];
type Ayah = { a: number; w: Run[][] };

const SIZES = [28, 34, 42];

export function IndoPakTajweedPreview() {
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [uthmani, setUthmani] = useState<Map<number, GlyphVerse> | null>(null);
  const [failed, setFailed] = useState(false);
  const [coloured, setColoured] = useState(true);
  const [size, setSize] = useState(1);

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

        {failed && <p className="mt-8 text-red-300">Couldn&apos;t load the prototype data.</p>}
        {!ayahs && !failed && <p className="mt-8 text-sand-300/70">Loading…</p>}

        {ayahs && (
          <div className="mt-8 hidden grid-cols-2 gap-6 text-xs uppercase tracking-wider text-sand-300/60 md:grid">
            <span>Uthmani · QPC V4 (app)</span>
            <span>IndoPak · prototype</span>
          </div>
        )}

        <div className="mt-2 divide-y divide-white/10">
          {ayahs?.map(({ a, w }) => {
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
                      <span key={wi}>
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
