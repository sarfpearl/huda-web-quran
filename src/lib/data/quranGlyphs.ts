/**
 * Tajweed mode: King Fahd Complex V4 Tajweed colour fonts (COLRv1), the same
 * rendering Quran.com uses. Every Quran word is ONE glyph (`code`) in the font
 * of its Madinah-Mushaf page (604 fonts, self-hosted in /fonts/qpc-v4/). The
 * Tajweed colours are drawn inside the glyphs — per letter and per mark — so
 * nothing is recoloured in CSS; the font's dark palette (base-palette 1) is
 * selected with @font-palette-values.
 *
 * Data: public/data/quran-glyphs/<surah>.json, built by
 * scripts/generation/fetch-qpc-v4.mjs. Word order is Quran.com's (QDC) word
 * position — the same positions the reciter word timings use, so the active
 * word index addresses its glyph directly.
 */

/** [glyph code, Mushaf page, Uthmani text] */
export type GlyphWord = [code: string, page: number, text: string];

export interface GlyphVerse {
  a: number;
  w: GlyphWord[];
  /** End-of-ayah ornament glyph [code, page]. */
  e?: [code: string, page: number];
}

const fontFamily = (page: number) => `qpc-v4-p${page}`;
const paletteName = (page: number, tajweed: boolean, active = false) =>
  `--huda-${tajweed ? "tj" : "plain"}${active ? "-on" : ""}-p${page}`;

/**
 * Inline style that draws a glyph from its page font: the dark Tajweed palette,
 * or (Tajweed off) all-white text like Quran.com's plain Uthmani mushaf.
 * `active` = the word being recited: its white letters turn gold (Tajweed
 * colours stay as they are).
 */
export function glyphStyle(page: number, tajweed = true, active = false): React.CSSProperties {
  return { fontFamily: `'${fontFamily(page)}'`, fontPalette: paletteName(page, tajweed, active) } as React.CSSProperties;
}

/** Gold of the recited word (Tailwind amber-300, as the ayah ornament). */
const ACTIVE_GOLD = "#fcd34d";

const inkCache = new Map<string, React.CSSProperties>();
let measureCtx: CanvasRenderingContext2D | null = null;

/**
 * Mushaf glyphs are drawn for justified page lines: their ink (a final ن's
 * tail, a raised alif) often runs past the glyph's advance. Laid out word by
 * word that ink would overlap the next word and escape the highlight, so each
 * glyph gets exactly the side padding (in em) its own ink needs. Measured once
 * per glyph with canvas text metrics; the page font must already be loaded.
 */
export function glyphInkPadding(code: string, page: number): React.CSSProperties {
  const key = `${page}:${code}`;
  const hit = inkCache.get(key);
  if (hit) return hit;
  let style: React.CSSProperties = {};
  try {
    measureCtx ??= document.createElement("canvas").getContext("2d");
    if (measureCtx) {
      const size = 100;
      measureCtx.font = `${size}px '${fontFamily(page)}'`;
      measureCtx.direction = "ltr";
      measureCtx.textAlign = "left";
      const m = measureCtx.measureText(code);
      const left = Math.max(0, m.actualBoundingBoxLeft) / size;
      const right = Math.max(0, m.actualBoundingBoxRight - m.width) / size;
      style = {
        ...(left > 0.01 ? { paddingLeft: `${left.toFixed(3)}em` } : {}),
        ...(right > 0.01 ? { paddingRight: `${right.toFixed(3)}em` } : {}),
      };
    }
  } catch {
    /* no canvas: no padding */
  }
  inkCache.set(key, style);
  return style;
}

const surahCache = new Map<number, Promise<GlyphVerse[] | null>>();

/** Glyph words of every ayah of a surah, or null when unavailable. */
export function fetchSurahGlyphs(surahNumber: number): Promise<GlyphVerse[] | null> {
  let p = surahCache.get(surahNumber);
  if (!p) {
    p = fetch(`/data/quran-glyphs/${surahNumber}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<GlyphVerse[]>) : null))
      .catch(() => null);
    p.then((v) => v === null && surahCache.delete(surahNumber));
    surahCache.set(surahNumber, p);
  }
  return p;
}

const fontCache = new Map<number, Promise<boolean>>();
let paletteSheet: HTMLStyleElement | null = null;

/** Load one page font (once) and register its dark palette. Resolves false on failure. */
export function loadPageFont(page: number): Promise<boolean> {
  let p = fontCache.get(page);
  if (!p) {
    p = (async () => {
      try {
        const face = new FontFace(fontFamily(page), `url(/fonts/qpc-v4/p${page}.woff2) format("woff2")`, {
          display: "block",
        });
        await face.load();
        document.fonts.add(face);
        if (!paletteSheet) {
          paletteSheet = document.createElement("style");
          paletteSheet.dataset.qpcPalettes = "";
          document.head.appendChild(paletteSheet);
        }
        // Tajweed: base-palette 1 (the font's dark-mode Tajweed colours).
        // Plain: base-palette 4 (every rule white). Both draw the ayah ornament
        // as a white outline on the scene, with no filled disc: 13 = outline +
        // numeral → white; 10 centre dot, 11 leaves, 12 disc fill → clear.
        // Entries 10–12 are used only by the ornament. (`transparent` is
        // rejected by override-colors in Chromium; rgba(0,0,0,0) works.)
        const ornament = "10 rgba(0, 0, 0, 0), 11 rgba(0, 0, 0, 0), 12 rgba(0, 0, 0, 0), 13 #ffffff";
        // Recited word: the letters' own colours turn gold — entry 0 and 14
        // (both white in the Tajweed palette). In the plain palette every
        // letter entry is white, so 0–9 and 14–15 all go gold (15 carries the
        // hamzat al-wasl ٱ, grey in Tajweed mode as a silent-letter rule).
        const gold = (entries: number[]) => entries.map((i) => `${i} ${ACTIVE_GOLD}`).join(", ");
        const plainGold = gold([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14, 15]);
        const rule = (name: string, base: number, colors: string) =>
          `@font-palette-values ${name} { font-family: '${fontFamily(page)}'; base-palette: ${base}; override-colors: ${colors}; }\n`;
        paletteSheet.append(
          rule(paletteName(page, true), 1, ornament) +
            rule(paletteName(page, false), 4, ornament) +
            rule(paletteName(page, true, true), 1, `${ornament}, ${gold([0, 14])}`) +
            rule(paletteName(page, false, true), 4, `${ornament}, ${plainGold}`)
        );
        return true;
      } catch {
        fontCache.delete(page);
        return false;
      }
    })();
    fontCache.set(page, p);
  }
  return p;
}

/** Legend (Quran.com's grouping), colours = the fonts' dark palette. */
export const TAJWEED_LEGEND: { color: string; en: string; ta: string }[] = [
  { color: "#999999", en: "Silent letter", ta: "உச்சரிக்கப்படாத எழுத்து" },
  { color: "#ffc1e0", en: "Normal madd (2)", ta: "இயல்பான மத் (2)" },
  { color: "#ff8e3b", en: "Separated madd (2/4/6)", ta: "பிரிந்த மத் (2/4/6)" },
  { color: "#ff5e8e", en: "Connected madd (4/5)", ta: "இணைந்த மத் (4/5)" },
  { color: "#e30000", en: "Necessary madd (6)", ta: "கட்டாய மத் (6)" },
  { color: "#26b55d", en: "Ghunnah / Ikhfa'", ta: "குன்னா / இக்ஃபா" },
  { color: "#00deff", en: "Qalqalah (echo)", ta: "கல்கலா (எதிரொலி)" },
  { color: "#3c84d5", en: "Tafkhim (heavy)", ta: "தஃப்கீம் (கனமான)" },
];
