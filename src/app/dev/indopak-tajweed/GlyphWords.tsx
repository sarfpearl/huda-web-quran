"use client";

import { useEffect, useState } from "react";
import { TAJWEED_LEGEND } from "@/lib/data/quranGlyphs";

/**
 * IndoPak Tajweed drawn glyph by glyph (prototype). A browser paints a
 * letter and its marks in one colour (Chromium, WebKitGTK, iPhone Safari
 * measured), so a colour on a mark alone — a madd's small alef, a grey
 * tanween — never shows in text. Here each glyph is its own SVG path in its
 * own colour: the layout (glyph ids, positions — HarfBuzz, at build time,
 * public/data/quran-indopak-tajweed/<surah>.glyphs.json) and the outlines,
 * read in the browser from the self-hosted IndoPak font itself (fontkit), so
 * the font is used as it is, not modified or re-encoded.
 */

export type GlyphWord = { adv: number; g: [gid: number, x: number, y: number, colour: number | null][] };
export type GlyphFile = {
  upem: number;
  ascent: number;
  descent: number;
  font: string;
  ayahs: { a: number; w: GlyphWord[] }[];
};

type FontkitFont = { getGlyph(id: number): { path: { toSVG(): string } } };

let fontPromise: Promise<FontkitFont> | null = null;

/** The IndoPak font, parsed once (the same file the page's text uses). */
function loadFont(file: string): Promise<FontkitFont> {
  fontPromise ??= Promise.all([
    import("fontkit") as Promise<{ create(data: Uint8Array): FontkitFont }>,
    fetch(`/fonts/indopak/${file}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error("font")))),
  ]).then(([fontkit, data]) => fontkit.create(new Uint8Array(data)));
  return fontPromise;
}

/** SVG paths by glyph id for the glyphs a file uses. */
export function useGlyphPaths(file: GlyphFile | null): Map<number, string> | null {
  const [paths, setPaths] = useState<Map<number, string> | null>(null);
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    loadFont(file.font).then((font) => {
      if (cancelled) return;
      const ids = new Set(file.ayahs.flatMap((a) => a.w.flatMap((w) => w.g.map((g) => g[0]))));
      setPaths(new Map([...ids].map((id) => [id, font.getGlyph(id).path.toSVG()])));
    });
    return () => {
      cancelled = true;
    };
  }, [file]);
  return paths;
}

/** One word as SVG, `size` px per em; the real text is its accessible name. */
export function GlyphWordSvg({
  word,
  text,
  file,
  paths,
  size,
  coloured = true,
}: {
  word: GlyphWord;
  text: string;
  file: GlyphFile;
  paths: Map<number, string>;
  size: number;
  coloured?: boolean;
}) {
  const scale = size / file.upem;
  const height = file.ascent + file.descent;
  return (
    <svg
      role="img"
      aria-label={text}
      width={word.adv * scale}
      height={height * scale}
      viewBox={`0 ${-file.ascent} ${word.adv} ${height}`}
      overflow="visible"
      className="inline-block align-middle"
    >
      {word.g.map(([gid, x, y, c], i) => (
        <path
          key={i}
          d={paths.get(gid) ?? ""}
          transform={`translate(${x} ${-y}) scale(1 -1)`}
          fill={coloured && c !== null ? TAJWEED_LEGEND[c]?.color : "#ffffff"}
        />
      ))}
    </svg>
  );
}
