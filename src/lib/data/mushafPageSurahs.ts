import { MUSHAF_PAGE_COUNT, mushafPageOf } from "./mushafPages";
import { QURAN_SURAHS } from "./quran";

/**
 * Every Surah that appears on each Madinah-Mushaf page (index = page - 1).
 *
 * The page-start table only names the Surah a page OPENS on; a short Surah can
 * begin and end mid-page, so pages 582 / 601–604 carry two or three Surahs.
 * A Surah sits on page P when P is within [its first ayah's page, its last
 * ayah's page], built once from the ayah counts.
 */
const PAGE_SURAHS: number[][] = (() => {
  const pages: number[][] = Array.from({ length: MUSHAF_PAGE_COUNT }, () => []);
  for (const s of QURAN_SURAHS) {
    const start = mushafPageOf(s.number, 1);
    const end = mushafPageOf(s.number, Math.max(1, s.verses));
    for (let p = start; p <= end; p++) pages[p - 1].push(s.number);
  }
  return pages;
})();

/** The Surah numbers on a Mushaf page, in order (1-based page). */
export function surahsOnPage(page: number): number[] {
  return PAGE_SURAHS[page - 1] ?? [];
}
