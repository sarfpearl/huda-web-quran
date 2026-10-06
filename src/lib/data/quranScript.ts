import type { QuranScript } from "./quranGlyphs";

/*
 * Which Mushaf script the Arabic is shown in: Uthmani (Madani) or IndoPak.
 * South Asia (India, Pakistan, Bangladesh, Sri Lanka, Nepal) and the South
 * African / Mauritian communities read the IndoPak style; everyone else
 * Uthmani. Until someone picks one, the guess comes from the place (country,
 * once the location is known — PLACE_EVENT in translations.ts), else the
 * device time zone; a script picked by hand is remembered.
 */

/**
 * IndoPak needs the "AlQuran IndoPak by QuranWBW" font, usable only with
 * QuranWBW's written permission (docs/TODO.md). Until it's granted the switch
 * shows in development only, so production stays Uthmani.
 */
export const INDOPAK_ENABLED =
  process.env.NEXT_PUBLIC_INDOPAK === "1" || process.env.NODE_ENV === "development";

export const SCRIPT_STORAGE_KEY = "huda:script";

export const isQuranScript = (v: unknown): v is QuranScript => v === "uthmani" || v === "indopak";

const INDOPAK_COUNTRIES = new Set(["in", "pk", "bd", "lk", "np", "za", "mu"]);

const INDOPAK_TIME_ZONES = new Set([
  "Asia/Kolkata",
  "Asia/Calcutta",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Colombo",
  "Asia/Kathmandu",
  "Africa/Johannesburg",
  "Indian/Mauritius",
]);

/** The script for a country (ISO code, e.g. "pk"), or null when unknown. */
export function placeScript(countryCode?: string | null): QuranScript | null {
  const cc = countryCode?.toLowerCase();
  if (!cc) return null;
  return INDOPAK_COUNTRIES.has(cc) ? "indopak" : "uthmani";
}

/** The first-visit guess before the place is known: the device time zone. */
export function detectScript(): QuranScript {
  try {
    return INDOPAK_TIME_ZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone) ? "indopak" : "uthmani";
  } catch {
    return "uthmani";
  }
}
