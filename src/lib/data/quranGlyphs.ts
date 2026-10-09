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

/**
 * WebKit: Safari, and every iOS / iPadOS browser (CriOS / FxiOS / EdgiOS are
 * WebKit too). A real iPhone crashed its web content process ("A problem
 * repeatedly occurred") with the page fonts loaded on every visit; the iOS
 * Simulator renders them fine, so the cause is device-side. On WebKit the page
 * fonts therefore load only while Tajweed is switched on (Tajweed off keeps
 * the Uthmani text font), and Tajweed isn't remembered between visits, so a
 * crash reloads into the safe text view instead of looping.
 * Client-only: false during server rendering.
 */
export function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS reports a Mac UA; touch points tell it apart.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const webkit = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Android/.test(ua);
  return ios || webkit;
}

/** Whether to draw the ayah with the page fonts (see isWebKit). */
export function glyphFontsFor(tajweed: boolean): boolean {
  return typeof FontFace !== "undefined" && (tajweed || !isWebKit());
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

/**
 * The Rub el Hizb mark (۞) opening a quarter's first word is its own glyph
 * in that word's code (“ﲱ ﲲ” = ۞ + the word), drawn as a star before the
 * ayah: left out, glyph and text alike.
 */
function withoutHizbMark(v: GlyphVerse): GlyphVerse {
  const first = v.w[0];
  if (!first || !first[2].startsWith("\u06DE")) return v;
  const [code, page, text] = first;
  // The mark's glyph comes first, mostly space-separated (4 words run it on).
  const rest = code.includes(" ") ? code.slice(code.indexOf(" ") + 1) : code.slice(1);
  const word: GlyphWord = [rest, page, text.replace(/^\u06DE\s*/, "")];
  return { ...v, w: [word, ...v.w.slice(1)] };
}

/**
 * The Sajdah mark (۩) ending an ayah of prostration is its word's last glyph
 * (all 15): left out, glyph and text — the app draws its own Sajdah icon.
 */
function withoutSajdahMark(v: GlyphVerse): GlyphVerse {
  const last = v.w[v.w.length - 1];
  if (!last || !last[2].includes("\u06E9")) return v;
  const [code, page, text] = last;
  const word: GlyphWord = [code.slice(0, -1).trimEnd(), page, text.replace(/\s*\u06E9/, "")];
  return { ...v, w: [...v.w.slice(0, -1), word] };
}

const surahCache = new Map<number, Promise<GlyphVerse[] | null>>();

/** Glyph words of every ayah of a surah, or null when unavailable. */
export function fetchSurahGlyphs(surahNumber: number): Promise<GlyphVerse[] | null> {
  let p = surahCache.get(surahNumber);
  if (!p) {
    p = fetch(`/data/quran-glyphs/${surahNumber}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<GlyphVerse[]>) : null))
      .then((v) => v && v.map((x) => withoutSajdahMark(withoutHizbMark(x))))
      .catch(() => null);
    p.then((v) => v === null && surahCache.delete(surahNumber));
    surahCache.set(surahNumber, p);
  }
  return p;
}

/**
 * IndoPak script (South Asia's Mushaf style): the same verses and word
 * positions as the glyph data, each word's text swapped for its IndoPak text
 * (public/data/quran-indopak, scripts/generation/fetch-indopak-words.mjs).
 * Drawn as text only — there are no IndoPak page fonts, so no Tajweed colours.
 * The ۞ / ۩ marks come off the text as they do off the glyphs.
 */
const indoPakCache = new Map<number, Promise<GlyphVerse[] | null>>();
const plainIndoPak = (t: string) => t.replace(/^\u06DE\s*/, "").replace(/\s*\u06E9/, "").trim();
export function fetchSurahIndoPak(surahNumber: number): Promise<GlyphVerse[] | null> {
  let p = indoPakCache.get(surahNumber);
  if (!p) {
    const words = fetch(`/data/quran-indopak/${surahNumber}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<{ a: number; w: string[] }[]>) : null))
      .catch(() => null);
    p = Promise.all([fetchSurahGlyphs(surahNumber), words]).then(([glyphs, ip]) => {
      if (!glyphs || !ip) return null;
      const byAyah = new Map(ip.map((v) => [v.a, v.w]));
      return glyphs.map((v) => {
        const texts = byAyah.get(v.a);
        if (!texts || texts.length !== v.w.length) return v;
        return { ...v, w: v.w.map(([code, page], i): GlyphWord => [code, page, plainIndoPak(texts[i])]) };
      });
    });
    p.then((v) => v === null && indoPakCache.delete(surahNumber));
    indoPakCache.set(surahNumber, p);
  }
  return p;
}

/** The verse words for a script: glyph data with Uthmani or IndoPak text. */
export const fetchSurahWords = (surahNumber: number, script: QuranScript) =>
  script === "indopak" ? fetchSurahIndoPak(surahNumber) : fetchSurahGlyphs(surahNumber);

/**
 * The Isti'adhah isn't an ayah, but its words are the Mushaf's own: أَعُوذُ
 * from 2:67 and بِٱللَّهِ مِنَ ٱلشَّيۡطَٰنِ ٱلرَّجِيمِ from 16:98 — so it draws in
 * the same page fonts (and Tajweed colours) as the ayahs. No ayah ornament.
 */
export async function fetchIstiadhahWords(
  fetchWords: (surahNumber: number) => Promise<GlyphVerse[] | null>
): Promise<GlyphVerse | null> {
  const [s2, s16] = await Promise.all([fetchWords(2), fetchWords(16)]);
  const a3udhu = s2?.find((v) => v.a === 67)?.w[14];
  const rest = s16?.find((v) => v.a === 98)?.w.slice(4, 8);
  return a3udhu && rest?.length === 4 ? { a: 0, w: [a3udhu, ...rest] } : null;
}

/** The Mushaf script the Arabic is shown in. */
export type QuranScript = "uthmani" | "indopak";

const fontCache = new Map<number, Promise<boolean>>();
const fontFaces = new Map<number, FontFace>();
/**
 * Pages loaded for keeps (the main verse view): unloadPageFont leaves them. The
 * fonts are shared, so reading mode unloading a page the main view was still
 * drawing turned its glyph codes into plain Arabic ligatures (U+FC41… are
 * real presentation forms) after switching between the two.
 */
const keptPages = new Set<number>();
const palettesRegistered = new Set<number>();
let paletteSheet: HTMLStyleElement | null = null;

/**
 * Load one page font (once) and register its dark palette. Resolves false on
 * failure. `temporary` (WebKit reading mode): the caller may unloadPageFont it
 * again; otherwise the page is kept.
 */
export function loadPageFont(page: number, temporary = false): Promise<boolean> {
  if (!temporary) keptPages.add(page);
  let p = fontCache.get(page);
  if (!p) {
    p = (async () => {
      try {
        // ?v: bump when the font files change (v2: stray box layers removed by
        // scripts/generation/strip_qpc_v4_boxes.py) so cached copies refresh.
        const face = new FontFace(fontFamily(page), `url(/fonts/qpc-v4/p${page}.woff2?v=2) format("woff2")`, {
          display: "block",
        });
        await face.load();
        document.fonts.add(face);
        fontFaces.set(page, face);
        // A page unloaded and loaded again keeps its palettes.
        if (palettesRegistered.has(page)) return true;
        palettesRegistered.add(page);
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

/**
 * Whether a page font is in the document right now. Checked when drawing: a
 * glyph code without its font shows as the wrong Arabic letters, so the
 * Uthmani text is drawn instead.
 */
export function pageFontReady(page: number): boolean {
  const face = fontFaces.get(page);
  return Boolean(face && face.status === "loaded" && document.fonts.has(face));
}

/**
 * Drop a page font again (WebKit reading mode keeps only the pages on screen:
 * a whole Surah of page fonts crashed iPhone Safari). A later loadPageFont
 * brings it back. Kept pages (loaded without `temporary`) stay.
 */
export function unloadPageFont(page: number): void {
  if (keptPages.has(page)) return;
  const face = fontFaces.get(page);
  if (face) {
    document.fonts.delete(face);
    fontFaces.delete(page);
  }
  fontCache.delete(page);
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
