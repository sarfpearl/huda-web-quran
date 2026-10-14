"use client";

import { useEffect, useState } from "react";
import { TAJWEED_LEGEND } from "@/lib/data/quranGlyphs";

type Run = [text: string, colour: number | null];
type Ayah = { a: number; w: Run[][] };

const SIZES = [28, 34, 42];

export function IndoPakTajweedPreview() {
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [coloured, setColoured] = useState(true);
  const [size, setSize] = useState(1);

  useEffect(() => {
    fetch("/data/quran-indopak-tajweed/2.json")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAyahs, () => setFailed(true));
  }, []);

  return (
    <div data-no-splash className="fixed inset-0 overflow-y-auto bg-black px-4 pb-16 pt-6 text-sand-50 select-text">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-lg font-semibold">IndoPak Tajweed · prototype</h1>
        <p className="mt-1 text-sm text-sand-300/80">
          Al-Baqarah 1–20 · Uthmani Tajweed rules carried onto the IndoPak text. Check the letters still join and
          the colours sit on the right letters.
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

        <div dir="rtl" lang="ar" className="font-arabic quran-indopak mt-8 space-y-6" style={{ fontSize: SIZES[size], lineHeight: 2.1 }}>
          {ayahs?.map(({ a, w }) => (
            <p key={a}>
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
          ))}
        </div>
      </div>
    </div>
  );
}
