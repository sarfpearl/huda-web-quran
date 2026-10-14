import type { QuranScript } from "./quranGlyphs";

/*
 * Which Mushaf script the Arabic is shown in: Uthmani (Madani, the default)
 * or IndoPak, South Asia's style — picked in the Tajweed panel and remembered.
 * IndoPak is drawn with the "AlQuran IndoPak by QuranWBW" font, used with
 * QuranWBW's written permission (globals.css .quran-indopak; About → credits).
 */

export const SCRIPT_STORAGE_KEY = "huda:script";

export const isQuranScript = (v: unknown): v is QuranScript => v === "uthmani" || v === "indopak";
