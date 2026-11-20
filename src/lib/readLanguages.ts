import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import localNames from "@/lib/data/surahNamesLocal.json";
import meaningManifest from "@/lib/data/meaningAudioManifest.json";
import { QURAN_SURAHS } from "@/lib/data/quran";
import { SURAH_NAMES } from "@/lib/data/surahNames";

/*
 * The per-language Surah reading pages (/surah/<n>/read/<lang>), built at
 * deploy time. Server-only: reads the repo's files.
 *
 * The languages are the app's meaning languages in src/lib/data/translations.ts.
 * That module is "use client", so a server component can't read its exports —
 * its TRANSLATIONS list is read from the source here instead. A language added
 * there gets pages as soon as its text exists (en/ta in quran-verses, the rest
 * in public/data/quran-translations/<lang>/); words below in READ_COPY make
 * its titles native, else they're English.
 */

export interface ReadLanguage {
  id: string;
  /** The language in its own script. */
  label: string;
  /** "Language · translator" (translations.ts `hint`). */
  hint: string;
  dir: "ltr" | "rtl";
  /** CSS font stack for the meaning text, if the script needs one. */
  font?: string;
}

const ROOT = process.cwd();

function parseTranslations(): ReadLanguage[] {
  const src = readFileSync(path.join(ROOT, "src/lib/data/translations.ts"), "utf8");
  const body = src.match(/export const TRANSLATIONS[^=]*=\s*\[([\s\S]*?)\n\];/)?.[1] ?? "";
  const list: ReadLanguage[] = [];
  for (const obj of body.match(/\{[^{}]*\}/g) ?? []) {
    const f: Record<string, string> = {};
    for (const m of obj.matchAll(/(\w+):\s*"((?:[^"\\]|\\.)*)"/g)) f[m[1]] = m[2];
    if (!f.id || !f.label) continue;
    list.push({ id: f.id, label: f.label, hint: f.hint ?? "", dir: f.dir === "rtl" ? "rtl" : "ltr", font: f.font });
  }
  // A broken parse must fail the build, not quietly drop pages.
  if (!list.some((l) => l.id === "en") || !list.some((l) => l.id === "ta") || list.length < 3) {
    throw new Error("readLanguages: could not read TRANSLATIONS from src/lib/data/translations.ts");
  }
  return list;
}

const BUILT_IN = new Set(["en", "ta"]);
const extraDir = (lang: string) => path.join(ROOT, "public", "data", "quran-translations", lang);

/** Languages with a reading page: in translations.ts and with their text in the repo. */
export const READ_LANGUAGES: ReadLanguage[] = parseTranslations().filter(
  (l) => BUILT_IN.has(l.id) || existsSync(path.join(extraDir(l.id), "1.json")),
);

export const readLanguage = (id: string) => READ_LANGUAGES.find((l) => l.id === id);

/** Translator credit: the part of `hint` after "Language · " (English's hint is the translator alone). */
export const translatorOf = (l: ReadLanguage) => l.hint.split(" · ").slice(-1)[0];

/*
 * Meaning audio, from the same manifest the app's hasMeaningAudio() reads
 * (meaningAudio.ts is "use client" too): a Surah has audio in a language once
 * its clips are uploaded in any voice — so Hindi lights up when its clips land.
 */
type Manifest = { surahs: Record<string, Record<string, number[]>> };
export function hasMeaningAudioAnyVoice(lang: string, surah: number): boolean {
  return Object.values((meaningManifest as Manifest).surahs).some((langs) => langs[lang]?.includes(surah));
}

export interface ReadAyah {
  ayah: number;
  arabic: string;
  meaning: string;
}

/** A Surah's Arabic text with one language's meaning. */
export async function readSurahInLanguage(surah: number, lang: string): Promise<ReadAyah[]> {
  const rows = JSON.parse(
    await readFile(path.join(ROOT, "public", "data", "quran-verses", `${surah}.json`), "utf8"),
  ) as { ayahNumber: number; textArabic: string; textEnglish: string; textTamil: string }[];
  if (BUILT_IN.has(lang)) {
    return rows.map((r) => ({ ayah: r.ayahNumber, arabic: r.textArabic, meaning: lang === "ta" ? r.textTamil : r.textEnglish }));
  }
  const meanings = JSON.parse(await readFile(path.join(extraDir(lang), `${surah}.json`), "utf8")) as string[];
  if (meanings.length !== rows.length) throw new Error(`${lang}/${surah}.json: ${meanings.length} of ${rows.length} ayahs`);
  return rows.map((r, i) => ({ ayah: r.ayahNumber, arabic: r.textArabic, meaning: meanings[i] }));
}

// ── Words in each language ────────────────────────────────────────────────

interface ReadCopy {
  /** "Surah Ya-Sin" in the language (word order differs: Turkish "Yâsîn Suresi"). */
  surah: (name: string) => string;
  arabic: string;
  /** "Malayalam translation". */
  translation: string;
  /** "Malayalam audio". */
  audio: string;
  verses: string;
  listen: string;
  listenInApp: string;
  meccan: string;
  medinan: string;
  /** Description: Surah phrase, Arabic name, number, verse count, translator, audio?. */
  description: (p: { surah: string; arabicName: string; n: number; verses: number; translator: string; audio: boolean }) => string;
  translationBy: string;
}

const READ_COPY: Record<string, ReadCopy> = {
  en: {
    surah: (x) => `Surah ${x}`,
    arabic: "Arabic",
    translation: "English Translation",
    audio: "English Audio",
    verses: "verses",
    listen: "Listen",
    listenInApp: "Listen in HuDa",
    meccan: "Meccan",
    medinan: "Medinan",
    translationBy: "Translation",
    description: (p) =>
      `Read ${p.surah} (${p.arabicName}), Surah ${p.n}, ${p.verses} verses, in Arabic with the English translation by ${p.translator}${p.audio ? " — and listen to the recitation with English meaning audio" : ""} on HuDa Guidance.`,
  },
  ta: {
    surah: (x) => `சூரா ${x}`,
    arabic: "அரபு",
    translation: "தமிழ் மொழிபெயர்ப்பு",
    audio: "தமிழ் ஒலி",
    verses: "வசனங்கள்",
    listen: "கேளுங்கள்",
    listenInApp: "HuDa-வில் கேளுங்கள்",
    meccan: "மக்கீ",
    medinan: "மதனீ",
    translationBy: "மொழிபெயர்ப்பு",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — அத்தியாயம் ${p.n}, ${p.verses} வசனங்கள். அரபு மூலத்துடன் தமிழ் மொழிபெயர்ப்பு (${p.translator}) படியுங்கள்${p.audio ? "; ஒவ்வொரு வசனத்தின் தமிழ் பொருளையும் ஒலியாகக் கேளுங்கள்" : ""} — HuDa Guidance.`,
  },
  ur: {
    surah: (x) => `سورہ ${x}`,
    arabic: "عربی",
    translation: "اردو ترجمہ",
    audio: "اردو آڈیو",
    verses: "آیات",
    listen: "سنیں",
    listenInApp: "HuDa میں سنیں",
    meccan: "مکی",
    medinan: "مدنی",
    translationBy: "ترجمہ",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — سورت نمبر ${p.n}، ${p.verses} آیات۔ عربی متن کے ساتھ اردو ترجمہ (${p.translator}) پڑھیں${p.audio ? " اور اردو ترجمہ سنیں" : ""} — HuDa Guidance۔`,
  },
  ml: {
    surah: (x) => `സൂറ ${x}`,
    arabic: "അറബി",
    translation: "മലയാളം പരിഭാഷ",
    audio: "മലയാളം ഓഡിയോ",
    verses: "ആയത്തുകൾ",
    listen: "കേൾക്കുക",
    listenInApp: "HuDa-യിൽ കേൾക്കുക",
    meccan: "മക്കി",
    medinan: "മദനി",
    translationBy: "പരിഭാഷ",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — അദ്ധ്യായം ${p.n}, ${p.verses} ആയത്തുകൾ. അറബി മൂലവും മലയാളം പരിഭാഷയും (${p.translator}) വായിക്കുക${p.audio ? ", മലയാളം അർത്ഥം കേൾക്കുക" : ""} — HuDa Guidance.`,
  },
  hi: {
    surah: (x) => `सूरह ${x}`,
    arabic: "अरबी",
    translation: "हिंदी अनुवाद",
    audio: "हिंदी ऑडियो",
    verses: "आयतें",
    listen: "सुनें",
    listenInApp: "HuDa में सुनें",
    meccan: "मक्की",
    medinan: "मदनी",
    translationBy: "अनुवाद",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — सूरह ${p.n}, ${p.verses} आयतें। अरबी मूल पाठ के साथ हिंदी अनुवाद (${p.translator}) पढ़ें${p.audio ? " और हर आयत का हिंदी अर्थ सुनें" : ""} — HuDa Guidance।`,
  },
  id: {
    surah: (x) => `Surah ${x}`,
    arabic: "Arab",
    translation: "Terjemahan Bahasa Indonesia",
    audio: "Audio Bahasa Indonesia",
    verses: "ayat",
    listen: "Dengarkan",
    listenInApp: "Dengarkan di HuDa",
    meccan: "Makkiyah",
    medinan: "Madaniyah",
    translationBy: "Terjemahan",
    description: (p) =>
      `Baca ${p.surah} (${p.arabicName}), surah ke-${p.n}, ${p.verses} ayat, dalam bahasa Arab dengan terjemahan Bahasa Indonesia (${p.translator})${p.audio ? " dan dengarkan audio terjemahannya" : ""} di HuDa Guidance.`,
  },
  bn: {
    surah: (x) => `সূরা ${x}`,
    arabic: "আরবি",
    translation: "বাংলা অনুবাদ",
    audio: "বাংলা অডিও",
    verses: "আয়াত",
    listen: "শুনুন",
    listenInApp: "HuDa-তে শুনুন",
    meccan: "মাক্কী",
    medinan: "মাদানী",
    translationBy: "অনুবাদ",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — সূরা নং ${p.n}, ${p.verses} আয়াত। আরবি মূল পাঠসহ বাংলা অনুবাদ (${p.translator}) পড়ুন${p.audio ? " এবং বাংলা অর্থ শুনুন" : ""} — HuDa Guidance।`,
  },
  tr: {
    surah: (x) => `${x} Suresi`,
    arabic: "Arapça",
    translation: "Türkçe Meali",
    audio: "Türkçe Sesli Meal",
    verses: "ayet",
    listen: "Dinle",
    listenInApp: "HuDa'da dinle",
    meccan: "Mekkî",
    medinan: "Medenî",
    translationBy: "Meal",
    description: (p) =>
      `${p.surah} (${p.arabicName}) — ${p.n}. sure, ${p.verses} ayet. Arapça metni ve Türkçe meali (${p.translator}) okuyun${p.audio ? ", Türkçe sesli meali dinleyin" : ""} — HuDa Guidance.`,
  },
  fr: {
    surah: (x) => `Sourate ${x}`,
    arabic: "arabe",
    translation: "traduction française",
    audio: "audio en français",
    verses: "versets",
    listen: "Écouter",
    listenInApp: "Écouter dans HuDa",
    meccan: "mecquoise",
    medinan: "médinoise",
    translationBy: "Traduction",
    description: (p) =>
      `Lisez la ${p.surah} (${p.arabicName}), sourate ${p.n}, ${p.verses} versets, en arabe avec la traduction française de ${p.translator}${p.audio ? " et écoutez sa traduction audio" : ""} sur HuDa Guidance.`,
  },
  ms: {
    surah: (x) => `Surah ${x}`,
    arabic: "Arab",
    translation: "Terjemahan Bahasa Melayu",
    audio: "Audio Bahasa Melayu",
    verses: "ayat",
    listen: "Dengar",
    listenInApp: "Dengar di HuDa",
    meccan: "Makkiyyah",
    medinan: "Madaniyyah",
    translationBy: "Terjemahan",
    description: (p) =>
      `Baca ${p.surah} (${p.arabicName}), surah ke-${p.n}, ${p.verses} ayat, dalam bahasa Arab dengan terjemahan Bahasa Melayu (${p.translator})${p.audio ? " dan dengar audio terjemahannya" : ""} di HuDa Guidance.`,
  },
};

/** A language without its own words above: English words, its own label for the language. */
function fallbackCopy(l: ReadLanguage): ReadCopy {
  const en = READ_COPY.en;
  const lang = l.hint.split(" · ")[0] || l.label;
  return {
    ...en,
    translation: `${lang} Translation`,
    audio: `${lang} Audio`,
    description: (p) =>
      `Read ${p.surah} (${p.arabicName}), Surah ${p.n}, ${p.verses} verses, in Arabic with the ${lang} translation by ${p.translator}${p.audio ? ` and ${lang} meaning audio` : ""} on HuDa Guidance.`,
  };
}

export const readCopy = (l: ReadLanguage): ReadCopy => READ_COPY[l.id] ?? fallbackCopy(l);

type LocalNames = Record<string, { name?: string[]; meaning?: string[] }>;

/** The Surah's name and the meaning of the name in a language (meaning omitted when it just repeats the name). */
export function surahNameIn(lang: string, n: number): { name: string; meaning?: string } {
  const s = QURAN_SURAHS[n - 1];
  const [, meaningEn, tamil] = SURAH_NAMES[n - 1];
  if (lang === "en") return { name: s.name, meaning: meaningEn };
  if (lang === "ta") return { name: tamil };
  const local = (localNames as LocalNames)[lang];
  const name = local?.name?.[n - 1] ?? s.name;
  const meaning = local?.meaning?.[n - 1];
  const bare = (t: string) => t.replace(/[ً-ٰٟۖ-ۭ\s\-'’]/g, "").toLowerCase();
  return { name, meaning: meaning && bare(meaning) !== bare(name) && bare(meaning) !== bare(s.name) ? meaning : undefined };
}

/** Open Graph locale per language. */
export const OG_LOCALE: Record<string, string> = {
  en: "en_US", ta: "ta_IN", ur: "ur_PK", ml: "ml_IN", hi: "hi_IN", id: "id_ID", bn: "bn_BD", tr: "tr_TR", fr: "fr_FR", ms: "ms_MY",
};

/** hreflang: every language version of a Surah's reading page, x-default = the Arabic/Tamil/English page. */
export function readAlternateLanguages(n: number, absolute: (p: string) => string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of READ_LANGUAGES) out[l.id] = absolute(`/surah/${n}/read/${l.id}`);
  out["x-default"] = absolute(`/surah/${n}/read`);
  return out;
}
