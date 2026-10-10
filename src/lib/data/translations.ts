"use client";

import { useEffect, useState } from "react";

/*
 * The ayah-meaning languages. English and Tamil ship inside the verse files
 * (textEnglish / textTamil); the rest are fetched per Surah from
 * public/data/quran-translations/<lang>/<surah>.json (written by
 * scripts/generation/build-quran-translations.mjs — keep EDITIONS there in
 * step with `edition` here) only when someone picks that language.
 */

export type TranslationLang = "en" | "ta" | "ur" | "ml" | "hi" | "id" | "bn" | "tr" | "fr" | "ms";

export interface TranslationInfo {
  id: TranslationLang;
  /** The language in its own script. */
  label: string;
  /** Language in English · translator. */
  hint: string;
  /** alquran.cloud edition, or "qurancom:<id>" for Quran.com's API. */
  edition: string;
  dir: "ltr" | "rtl";
  /** Font stack for the meaning text (fonts loaded in globals.css). */
  font?: string;
}

export const TRANSLATIONS: TranslationInfo[] = [
  { id: "en", label: "English", hint: "Saheeh International", edition: "en.sahih", dir: "ltr" },
  { id: "ta", label: "தமிழ்", hint: "Tamil · Jan Trust", edition: "ta.tamil", dir: "ltr", font: "'HuDa Tamil', var(--font-tamil)" },
  { id: "ur", label: "اردو", hint: "Urdu · Fateh Muhammad Jalandhry", edition: "ur.jalandhry", dir: "rtl", font: "var(--font-urdu), serif" },
  { id: "ml", label: "മലയാളം", hint: "Malayalam · Abdul Hameed & Parappoor", edition: "ml.abdulhameed", dir: "ltr", font: "var(--font-malayalam), sans-serif" },
  { id: "hi", label: "हिन्दी", hint: "Hindi · Azizul Haque al-Umari", edition: "qurancom:122", dir: "ltr", font: "var(--font-devanagari), sans-serif" },
  { id: "id", label: "Bahasa Indonesia", hint: "Indonesian · Ministry of Religious Affairs", edition: "id.indonesian", dir: "ltr" },
  { id: "bn", label: "বাংলা", hint: "Bengali · Muhiuddin Khan", edition: "bn.bengali", dir: "ltr", font: "var(--font-bengali), sans-serif" },
  { id: "tr", label: "Türkçe", hint: "Turkish · Diyanet İşleri", edition: "tr.diyanet", dir: "ltr" },
  { id: "fr", label: "Français", hint: "French · Muhammad Hamidullah", edition: "fr.hamidullah", dir: "ltr" },
  { id: "ms", label: "Bahasa Melayu", hint: "Malay · Abdullah Muhammad Basmeih", edition: "ms.basmeih", dir: "ltr" },
];

export const translationInfo = (lang: TranslationLang) => TRANSLATIONS.find((t) => t.id === lang) ?? TRANSLATIONS[0];

export const isTranslationLang = (v: unknown): v is TranslationLang =>
  typeof v === "string" && TRANSLATIONS.some((t) => t.id === v);

/** Languages whose meaning lives in the verse files themselves. */
export const isBuiltInLang = (lang: TranslationLang) => lang === "en" || lang === "ta";

/*
 * The first-visit language, until someone picks one (then theirs is kept):
 *   1. a non-English browser language we have (e.g. "id-ID" → Indonesian);
 *   2. where they are — the country, or the state in India (TimeLocationWidget
 *      reports it once the location permission is granted);
 *   3. the device time zone (needs no permission);
 *   4. English.
 * Steps 2–3 matter because many people keep their browser in English.
 */

/** A non-English language from the browser's list that we have, else null. */
export function browserTranslationLang(): TranslationLang | null {
  const prefs = typeof navigator === "undefined" ? [] : navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of prefs) {
    const base = tag?.toLowerCase().split("-")[0];
    if (base !== "en" && isTranslationLang(base)) return base;
  }
  return null;
}

// Countries reading one of our languages; India goes by state below.
const COUNTRY_LANG: Record<string, TranslationLang> = {
  pk: "ur",
  bd: "bn",
  id: "id",
  my: "ms",
  bn: "ms",
  tr: "tr",
  lk: "ta", // Sri Lanka's Muslims are mostly Tamil-speaking
  fr: "fr",
  // French-speaking West & Central Africa
  sn: "fr", ci: "fr", ml: "fr", gn: "fr", ne: "fr", bf: "fr", tg: "fr", bj: "fr", cm: "fr", ga: "fr", cd: "fr", td: "fr",
};

// Indian states by ISO 3166-2 code (old and new codes where they changed);
// states not listed stay English.
const INDIA_STATE_LANG: Record<string, TranslationLang> = {
  "IN-KL": "ml", "IN-LD": "ml",
  "IN-TN": "ta", "IN-PY": "ta",
  "IN-WB": "bn", "IN-TR": "bn",
  "IN-UP": "hi", "IN-BR": "hi", "IN-MP": "hi", "IN-RJ": "hi", "IN-DL": "hi", "IN-HR": "hi",
  "IN-UT": "hi", "IN-UK": "hi", "IN-JH": "hi", "IN-CT": "hi", "IN-CG": "hi", "IN-HP": "hi", "IN-CH": "hi",
  "IN-JK": "ur", "IN-TG": "ur", "IN-TS": "ur",
};

/** The language for a place: ISO country code ("in") and, in India, state code ("IN-KL"). */
export function placeTranslationLang(countryCode?: string | null, stateCode?: string | null): TranslationLang | null {
  const cc = countryCode?.toLowerCase();
  if (!cc) return null;
  if (cc === "in") return (stateCode && INDIA_STATE_LANG[stateCode.toUpperCase()]) || null;
  return COUNTRY_LANG[cc] ?? null;
}

// Time zones that point to one language (India's spans many: none).
const TIME_ZONE_LANG: Record<string, TranslationLang> = {
  "Asia/Karachi": "ur",
  "Asia/Dhaka": "bn",
  "Asia/Jakarta": "id", "Asia/Pontianak": "id", "Asia/Makassar": "id", "Asia/Jayapura": "id",
  "Asia/Kuala_Lumpur": "ms", "Asia/Kuching": "ms", "Asia/Brunei": "ms",
  "Europe/Istanbul": "tr",
  "Asia/Colombo": "ta",
  "Europe/Paris": "fr",
  "Africa/Dakar": "fr", "Africa/Abidjan": "fr", "Africa/Bamako": "fr", "Africa/Conakry": "fr", "Africa/Niamey": "fr",
  "Africa/Ouagadougou": "fr", "Africa/Lome": "fr", "Africa/Porto-Novo": "fr", "Africa/Douala": "fr",
  "Africa/Libreville": "fr", "Africa/Kinshasa": "fr", "Africa/Ndjamena": "fr",
};

export function timeZoneTranslationLang(): TranslationLang | null {
  try {
    return TIME_ZONE_LANG[Intl.DateTimeFormat().resolvedOptions().timeZone] ?? null;
  } catch {
    return null;
  }
}

/** The first-visit language before the location is known (steps 1, 3, 4). */
export function detectTranslationLang(): TranslationLang {
  return browserTranslationLang() ?? timeZoneTranslationLang() ?? "en";
}

/** TimeLocationWidget → ImmersiveHomeClient: where the visitor is. */
export const PLACE_EVENT = "huda:place";
export interface PlaceDetail {
  countryCode?: string;
  stateCode?: string;
}

// Isti'adhah is not an ayah, so no edition has it: the common rendering in
// each language. (The Bismillah prelude uses each edition's own 1:1.)
const ISTIADHAH: Partial<Record<TranslationLang, string>> = {
  ur: "میں اللہ کی پناہ مانگتا ہوں شیطان مردود سے۔",
  ml: "ശപിക്കപ്പെട്ട പിശാചിൽ നിന്ന് ഞാൻ അല്ലാഹുവിനോട് കാവൽ തേടുന്നു.",
  hi: "मैं धुत्कारे हुए शैतान से अल्लाह की पनाह माँगता हूँ।",
  id: "Aku berlindung kepada Allah dari godaan setan yang terkutuk.",
  bn: "আমি বিতাড়িত শয়তান থেকে আল্লাহর আশ্রয় প্রার্থনা করছি।",
  tr: "Kovulmuş şeytandan Allah'a sığınırım.",
  fr: "Je cherche refuge auprès d'Allah contre Satan le lapidé.",
  ms: "Aku berlindung kepada Allah daripada syaitan yang direjam.",
};

// One request per language × Surah, shared by every caller.
const cache = new Map<string, Promise<string[] | null>>();
function loadSurah(lang: TranslationLang, surah: number): Promise<string[] | null> {
  const key = `${lang}/${surah}`;
  let p = cache.get(key);
  if (!p) {
    p = fetch(`/data/quran-translations/${key}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<string[]>) : null))
      .catch(() => null);
    // A failed fetch is retried next time instead of being remembered.
    p.then((v) => v ?? cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

/** What's on screen, for picking its meaning. */
export type MeaningTarget =
  | { kind: "ayah"; surah: number; ayah: number }
  | { kind: "istiadhah" }
  | { kind: "bismillah" }
  | null;

/**
 * The meaning of `target` in an extra (non built-in) language: undefined while
 * loading (and for English / Tamil), null when it can't be had (offline, file
 * missing) — the caller then shows English.
 */
export function useExtraMeaning(lang: TranslationLang, target: MeaningTarget): string | null | undefined {
  const kind = target?.kind ?? null;
  const surah = target?.kind === "ayah" ? target.surah : kind === "bismillah" ? 1 : 0;
  const ayah = target?.kind === "ayah" ? target.ayah : kind === "bismillah" ? 1 : 0;
  const key = isBuiltInLang(lang) || !kind ? null : `${lang}:${kind}:${surah}:${ayah}`;
  const [found, setFound] = useState<{ key: string; text: string | null } | null>(null);

  useEffect(() => {
    if (!key) return;
    if (kind === "istiadhah") {
      setFound({ key, text: ISTIADHAH[lang] ?? null });
      return;
    }
    let live = true;
    loadSurah(lang, surah).then((ayahs) => {
      if (live) setFound({ key, text: ayahs?.[ayah - 1] ?? null });
    });
    return () => {
      live = false;
    };
  }, [key, kind, lang, surah, ayah]);

  return key && found?.key === key ? found.text : undefined;
}
