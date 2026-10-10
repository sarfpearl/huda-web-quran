"use client";

import { createContext, useContext } from "react";
import { SURAH_NAMES } from "@/lib/data/surahNames";
import { SURAH_METADATA_LIST } from "@/lib/data/surahList";

/**
 * The app's own labels: Tamil when the ayah meaning is Tamil, else English.
 * Every visible label follows it — never half English, half Tamil.
 */
export type UiLang = "en" | "ta";

export const UiLangContext = createContext<UiLang>("en");
export const useUiLang = () => useContext(UiLangContext);

/** Pick the label for the language: `tr(lang, "Page", "பக்கம்")`. */
export const tr = (lang: UiLang, en: string, ta: string) => (lang === "ta" ? ta : en);

/** A Surah's name in the UI language ("Ya-Sin" / "யாஸீன்"). */
export function surahNameIn(n: number, lang: UiLang): string {
  if (lang === "ta") return SURAH_NAMES[n - 1]?.[2] ?? `சூரா ${n}`;
  return SURAH_METADATA_LIST[n - 1]?.name ?? `Surah ${n}`;
}

/** The shared words, so each one is spelt the same everywhere. */
export const WORDS = {
  surah: { en: "Surah", ta: "சூரா" },
  juz: { en: "Juz", ta: "ஜுஸ்உ" },
  ayah: { en: "Ayah", ta: "ஆயத்" },
  page: { en: "Page", ta: "பக்கம்" },
  verses: { en: "Verses", ta: "வசனங்கள்" },
  meccan: { en: "Meccan", ta: "மக்கீ" },
  medinan: { en: "Medinan", ta: "மதனீ" },
  bookmark: { en: "Bookmark", ta: "புக்மார்க்" },
  reciter: { en: "Reciter", ta: "காரி" },
} as const;
export const word = (k: keyof typeof WORDS, lang: UiLang) => WORDS[k][lang];
