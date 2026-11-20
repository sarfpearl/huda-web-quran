"use client";

import { useEffect, useState } from "react";

/*
 * The ayah-meaning languages. English and Tamil ship inside the verse files
 * (textEnglish / textTamil); the rest are fetched per Surah from
 * public/data/quran-translations/<lang>/<surah>.json (written by
 * scripts/generation/build-quran-translations.mjs — keep EDITIONS there in
 * step with `edition` here) only when someone picks that language.
 */

export type TranslationLang =
  | "en" | "ta" | "ur" | "ml" | "hi" | "id" | "bn" | "tr" | "fr" | "ms"
  // Indian languages
  | "kn" | "te" | "gu" | "mr" | "as" | "ne" | "sd"
  // Big world languages
  | "es" | "zh" | "ru" | "pt" | "de" | "fa" | "ja" | "ko" | "it" | "nl"
  // Muslim-majority regions
  | "sw" | "ha" | "so" | "yo" | "am" | "ps" | "ku" | "uz" | "kk" | "tg" | "az" | "bs" | "sq" | "tt" | "ug" | "dv" | "si" | "th" | "vi" | "tl";

export interface TranslationInfo {
  id: TranslationLang;
  /** The language in its own script. */
  label: string;
  /** Language in English · translator. */
  hint: string;
  /** alquran.cloud edition, "qurancom:<id>" for Quran.com's API, or "quranenc:<key>" for QuranEnc.com's. */
  edition: string;
  dir: "ltr" | "rtl";
  /** Font stack for the meaning text (fonts in src/app/fonts.ts); none = the app's own. */
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
  // Indian languages
  { id: "kn", label: "ಕನ್ನಡ", hint: "Kannada · Muhammad Hamza Battur", edition: "quranenc:kannada_hamza", dir: "ltr", font: "var(--font-kannada), sans-serif" },
  { id: "te", label: "తెలుగు", hint: "Telugu · Abdur-Rahim ibn Muhammad", edition: "quranenc:telugu_muhammad", dir: "ltr", font: "var(--font-telugu), sans-serif" },
  { id: "gu", label: "ગુજરાતી", hint: "Gujarati · Rabila Al-Umry", edition: "quranenc:gujarati_omari", dir: "ltr", font: "var(--font-gujarati), sans-serif" },
  { id: "mr", label: "मराठी", hint: "Marathi · Muhammad Shafi'i Ansari", edition: "qurancom:226", dir: "ltr", font: "var(--font-devanagari), sans-serif" },
  { id: "as", label: "অসমীয়া", hint: "Assamese · Rafeequl Islam Habibur-Rahman", edition: "quranenc:assamese_rafeeq", dir: "ltr", font: "var(--font-bengali), sans-serif" },
  { id: "ne", label: "नेपाली", hint: "Nepali · Ahl Al-Hadith Central Society of Nepal", edition: "qurancom:108", dir: "ltr", font: "var(--font-devanagari), sans-serif" },
  { id: "sd", label: "سنڌي", hint: "Sindhi · Taj Mehmood Amroti", edition: "sd.amroti", dir: "rtl", font: "var(--font-naskh), serif" },
  // Big world languages
  { id: "es", label: "Español", hint: "Spanish · Isa Garcia", edition: "quranenc:spanish_garcia", dir: "ltr" },
  { id: "zh", label: "简体中文", hint: "Chinese (Simplified) · Ma Jian", edition: "qurancom:56", dir: "ltr" },
  { id: "ru", label: "Русский", hint: "Russian · Elmir Kuliev", edition: "ru.kuliev", dir: "ltr" },
  { id: "pt", label: "Português", hint: "Portuguese · Helmi Nasr", edition: "quranenc:portuguese_nasr", dir: "ltr" },
  { id: "de", label: "Deutsch", hint: "German · Bubenheim & Elyas", edition: "quranenc:german_bubenheim", dir: "ltr" },
  { id: "fa", label: "فارسی", hint: "Persian · Mohammad Mahdi Fooladvand", edition: "fa.fooladvand", dir: "rtl", font: "var(--font-naskh), serif" },
  { id: "ja", label: "日本語", hint: "Japanese · Saeed Sato", edition: "quranenc:japanese_saeedsato", dir: "ltr" },
  { id: "ko", label: "한국어", hint: "Korean · Hamed Choi", edition: "qurancom:219", dir: "ltr" },
  { id: "it", label: "Italiano", hint: "Italian · Hamza Roberto Piccardo", edition: "it.piccardo", dir: "ltr" },
  { id: "nl", label: "Nederlands", hint: "Dutch · Sofian S. Siregar", edition: "nl.siregar", dir: "ltr" },
  // Muslim-majority regions
  { id: "sw", label: "Kiswahili", hint: "Swahili · Ali Muhsin Al-Barwani", edition: "sw.barwani", dir: "ltr" },
  { id: "ha", label: "Hausa", hint: "Hausa · Abubakar Mahmoud Gumi", edition: "ha.gumi", dir: "ltr" },
  { id: "so", label: "Soomaali", hint: "Somali · Mahmud Muhammad Abduh", edition: "so.abduh", dir: "ltr" },
  { id: "yo", label: "Yorùbá", hint: "Yoruba · Abu Rahimah Mikael Aykyuni", edition: "quranenc:yoruba_mikail", dir: "ltr", font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "am", label: "አማርኛ", hint: "Amharic · Muhammad Sadiq & Muhammad Sani Habib", edition: "quranenc:amharic_sadiq", dir: "ltr", font: "var(--font-ethiopic), sans-serif" },
  { id: "ps", label: "پښتو", hint: "Pashto · Zakaria Abulsalam", edition: "qurancom:118", dir: "rtl", font: "var(--font-naskh), serif" },
  { id: "ku", label: "کوردی", hint: "Kurdish (Sorani) · Muhammad Saleh Bamoki", edition: "quranenc:kurdish_bamoki", dir: "rtl", font: "var(--font-naskh), serif" },
  { id: "uz", label: "Oʻzbekcha", hint: "Uzbek · Muhammad Sodiq Muhammad Yusuf", edition: "qurancom:55", dir: "ltr" },
  { id: "kk", label: "Қазақша", hint: "Kazakh · Khalifa Altay", edition: "qurancom:222", dir: "ltr" },
  { id: "tg", label: "Тоҷикӣ", hint: "Tajik · Rowwad Translation Center", edition: "quranenc:tajik_arifi", dir: "ltr" },
  { id: "az", label: "Azərbaycanca", hint: "Azerbaijani · Alikhan Musayev", edition: "az.musayev", dir: "ltr" },
  { id: "bs", label: "Bosanski", hint: "Bosnian · Besim Korkut", edition: "bs.korkut", dir: "ltr" },
  { id: "sq", label: "Shqip", hint: "Albanian · Sherif Ahmeti", edition: "sq.ahmeti", dir: "ltr" },
  { id: "tt", label: "Татарча", hint: "Tatar · Yakub Ibn Nugman", edition: "tt.nugman", dir: "ltr" },
  { id: "ug", label: "ئۇيغۇرچە", hint: "Uyghur · Muhammad Saleh", edition: "ug.saleh", dir: "rtl", font: "var(--font-naskh), serif" },
  { id: "dv", label: "ދިވެހި", hint: "Divehi · Office of the President of Maldives", edition: "qurancom:86", dir: "rtl", font: "var(--font-thaana), var(--font-naskh), sans-serif" },
  { id: "si", label: "සිංහල", hint: "Sinhala · Rowwad Translation Center", edition: "quranenc:sinhalese_mahir", dir: "ltr", font: "var(--font-sinhala), sans-serif" },
  { id: "th", label: "ไทย", hint: "Thai · King Fahd Quran Complex", edition: "th.thai", dir: "ltr" },
  { id: "vi", label: "Tiếng Việt", hint: "Vietnamese · Rowwad Translation Center", edition: "quranenc:vietnamese_rwwad", dir: "ltr", font: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "tl", label: "Tagalog", hint: "Tagalog (Filipino) · Rowwad Translation Center", edition: "quranenc:tagalog_rwwad", dir: "ltr" },
];

export const translationInfo = (lang: TranslationLang) => TRANSLATIONS.find((t) => t.id === lang) ?? TRANSLATIONS[0];

/** The language search: native name, English name or translator (`q` lower-cased). */
export const matchesTranslation = (c: TranslationInfo, q: string) => `${c.label} ${c.hint}`.toLowerCase().includes(q);

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
  np: "ne",
  ir: "fa", af: "fa",
  cn: "zh", sg: "zh",
  ru: "ru", jp: "ja", kr: "ko", it: "it", nl: "nl", be: "nl", de: "de", at: "de", ch: "de",
  es: "es", mx: "es", ar: "es", co: "es", pe: "es", cl: "es", ve: "es",
  br: "pt", pt: "pt", ao: "pt", mz: "pt",
  ke: "sw", tz: "sw", so: "so", dj: "so", et: "am",
  uz: "uz", kz: "kk", tj: "tg", az: "az", ba: "bs", al: "sq", xk: "sq", mv: "dv",
  th: "th", vn: "vi", ph: "tl",
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
  "Asia/Kathmandu": "ne", "Asia/Tehran": "fa", "Asia/Kabul": "fa", "Asia/Shanghai": "zh",
  "Asia/Tokyo": "ja", "Asia/Seoul": "ko", "Europe/Moscow": "ru", "Europe/Berlin": "de", "Europe/Vienna": "de",
  "Europe/Rome": "it", "Europe/Amsterdam": "nl", "Europe/Madrid": "es", "America/Mexico_City": "es",
  "America/Sao_Paulo": "pt", "Europe/Lisbon": "pt", "Africa/Nairobi": "sw", "Africa/Dar_es_Salaam": "sw",
  "Africa/Mogadishu": "so", "Africa/Addis_Ababa": "am", "Asia/Tashkent": "uz", "Asia/Samarkand": "uz",
  "Asia/Almaty": "kk", "Asia/Dushanbe": "tg", "Asia/Baku": "az", "Europe/Sarajevo": "bs", "Europe/Tirane": "sq",
  "Indian/Maldives": "dv", "Asia/Bangkok": "th", "Asia/Ho_Chi_Minh": "vi", "Asia/Manila": "tl",
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
  // Languages not listed here show the English line.
  mr: "मी धिक्कारलेल्या सैतानापासून अल्लाहचा आश्रय मागतो.",
  ne: "म धिक्कारिएको शैतानबाट अल्लाहको शरण माग्छु।",
  es: "Me refugio en Allah de Satanás, el maldito.",
  pt: "Refugio-me em Allah contra Satã, o maldito.",
  de: "Ich suche Zuflucht bei Allah vor dem verfluchten Satan.",
  it: "Mi rifugio in Allah contro Satana il lapidato.",
  nl: "Ik zoek mijn toevlucht bij Allah tegen de vervloekte satan.",
  ru: "Прибегаю к защите Аллаха от проклятого сатаны.",
  fa: "به خدا پناه می‌برم از شیطان رانده‌شده.",
  zh: "我求真主保护我，免遭被驱逐的恶魔的伤害。",
  sw: "Najikinga kwa Allah kutokana na Shetani aliyelaaniwa.",
  bs: "Utječem se Allahu od prokletog šejtana.",
  sq: "Mbështetem te Allahu nga shejtani i mallkuar.",
  az: "Qovulmuş şeytandan Allaha sığınıram.",
  uz: "Quvilgan shaytondan Allohning panohiga qochaman.",
  vi: "Tôi cầu xin Allah che chở tránh khỏi Shaytan bị trục xuất.",
  tl: "Nagpapakupkop ako kay Allah laban sa isinumpang si Satanas.",
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
    // Warm the neighbouring Surahs so moving on doesn't wait on the network.
    if (surah < 114) void loadSurah(lang, surah + 1);
    if (surah > 1) void loadSurah(lang, surah - 1);
    return () => {
      live = false;
    };
  }, [key, kind, lang, surah, ayah]);

  return key && found?.key === key ? found.text : undefined;
}
