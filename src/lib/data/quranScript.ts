import type { QuranScript } from "./quranGlyphs";

/*
 * Which Mushaf script the Arabic is shown in: Uthmani (Madani, the default)
 * or IndoPak, South Asia's style — picked in the Tajweed panel and remembered.
 * IndoPak is drawn with the "AlQuran IndoPak by QuranWBW" font, used with
 * QuranWBW's written permission (globals.css .quran-indopak; About → credits).
 */

export const SCRIPT_STORAGE_KEY = "huda:script";

export const isQuranScript = (v: unknown): v is QuranScript => v === "uthmani" || v === "indopak";

/** Under the script picker (and a toast on a change): the app's pages are
 *  the Madinah Mushaf's 604, so a printed copy (an IndoPak 15/16-line one
 *  especially) turns the page at other ayat — the numbers are the same
 *  (owner's family, 2026-11-28: 17:48 in print, the app's page at 17:50). */
export const PAGES_NOTE =
  "Ayah numbers are the same in every Mushaf. Pages follow the Madinah Mushaf (604 pages), so a printed copy may turn the page a few ayat earlier or later.";
