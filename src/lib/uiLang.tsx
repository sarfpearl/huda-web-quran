"use client";

import { createContext, useContext } from "react";
import { SURAH_NAMES } from "@/lib/data/surahNames";
import { SURAH_METADATA_LIST } from "@/lib/data/surahList";
import common from "@/lib/i18n/common";
import home from "@/lib/i18n/home";
import player from "@/lib/i18n/player";
import pickers from "@/lib/i18n/pickers";
import prayer from "@/lib/i18n/prayer";

/**
 * The app's own labels: English by default, any of these when picked (About
 * page) — separate from the ayah-meaning language. Every visible label
 * follows it: never half English, half another language.
 */
export const UI_LANGS = [
  { id: "en", label: "English", locale: "en-GB" },
  { id: "ta", label: "தமிழ்", locale: "ta-IN" },
  { id: "ur", label: "اردو", locale: "ur-PK" },
  { id: "ml", label: "മലയാളം", locale: "ml-IN" },
  { id: "hi", label: "हिन्दी", locale: "hi-IN" },
  { id: "id", label: "Bahasa Indonesia", locale: "id-ID" },
  { id: "bn", label: "বাংলা", locale: "bn-BD" },
  { id: "tr", label: "Türkçe", locale: "tr-TR" },
  { id: "fr", label: "Français", locale: "fr-FR" },
  { id: "ms", label: "Bahasa Melayu", locale: "ms-MY" },
] as const;
export type UiLang = (typeof UI_LANGS)[number]["id"];
export const isUiLang = (v: unknown): v is UiLang => UI_LANGS.some((l) => l.id === v);
/** Intl locale for dates in the UI language. */
export const uiLocale = (lang: UiLang) => UI_LANGS.find((l) => l.id === lang)?.locale ?? "en-GB";
/** Written right to left (Urdu): text direction for its labels. */
export const isRtl = (lang: UiLang) => lang === "ur";

/** Where the picked app language is kept (localStorage). */
export const UI_LANG_KEY = "huda-ui-lang";

export const UiLangContext = createContext<UiLang>("en");
export const useUiLang = () => useContext(UiLangContext);
/** Sets the app language (About page); a no-op outside the home client. */
export const SetUiLangContext = createContext<(l: UiLang) => void>(() => {});
export const useSetUiLang = () => useContext(SetUiLangContext);

/** Translations of one area: English text (the key) → each other language. */
export type Strings = Record<string, Partial<Record<Exclude<UiLang, "en">, string>>>;
const DICT: Strings = { ...common, ...home, ...player, ...pickers, ...prayer };

/**
 * The label in the UI language: `t(lang, "Page {n}", { n: 4 })`. The key is
 * the English text; `{name}` placeholders are filled from `vars`. A missing
 * translation shows the English.
 */
export function t(lang: UiLang, key: string, vars?: Record<string, string | number>): string {
  const s = lang === "en" ? key : DICT[key]?.[lang] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/** A Surah's name in the UI language ("Ya-Sin" / "யாஸீன்" / "يس"). */
export function surahNameIn(n: number, lang: UiLang): string {
  if (lang === "ta") return SURAH_NAMES[n - 1]?.[2] ?? `சூரா ${n}`;
  // Urdu: the Arabic name, without the leading "سورة".
  if (lang === "ur") {
    const ar = SURAH_NAMES[n - 1]?.[0];
    if (ar) return ar.split(" ").slice(1).join(" ") || ar;
  }
  return SURAH_METADATA_LIST[n - 1]?.name ?? `Surah ${n}`;
}

/** The shared words, so each one is spelt the same everywhere (common.ts). */
const WORDS = {
  surah: "Surah",
  juz: "Juz",
  ayah: "Ayah",
  page: "Page",
  verses: "Verses",
  meccan: "Meccan",
  medinan: "Medinan",
  bookmark: "Bookmark",
  reciter: "Reciter",
} as const;
export const word = (k: keyof typeof WORDS, lang: UiLang) => t(lang, WORDS[k]);
