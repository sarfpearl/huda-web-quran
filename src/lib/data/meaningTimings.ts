"use client";

import { useEffect, useState } from "react";
import type { TranslationLang } from "./translations";
import { isMeaningLang, type MeaningLang, type MeaningVoice } from "./meaningAudio";

export type MeaningWordTuple = [word: string, begin: number, end: number];
export type SurahMeaningTimings = Record<string, MeaningWordTuple[]>;

const TIMING_CACHE = new Map<string, Promise<SurahMeaningTimings | null>>();

/**
 * Lazy-fetch per-surah word timings for the active voice and language.
 * Result is cached in memory so each Surah is requested at most once per session.
 */
export async function loadMeaningTimings(
  voice: MeaningVoice,
  lang: TranslationLang,
  surah: number
): Promise<SurahMeaningTimings | null> {
  if (!isMeaningLang(lang) || !surah || surah < 1 || surah > 114) return null;
  const key = `${voice}/${lang}/${surah}`;
  const existing = TIMING_CACHE.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`/data/meaning-timings/${voice}/${lang}/${surah}.json`);
      if (!res.ok) return null;
      return (await res.json()) as SurahMeaningTimings;
    } catch {
      return null;
    }
  })();

  TIMING_CACHE.set(key, promise);
  return promise;
}

/**
 * Word list for an ayah from loaded surah timings, or null when absent.
 */
export function getAyahMeaningTimings(
  timings: SurahMeaningTimings | null,
  ayah: number | undefined
): MeaningWordTuple[] | null {
  if (!timings || !ayah) return null;
  return timings[String(ayah)] ?? null;
}

/**
 * Active word index in the translation.
 * Rule: last word with begin <= currentTime (so zero/short words don't stall).
 * Returns -1 when currentTime is before the first word or words are absent.
 */
export function getActiveMeaningWordIndex(
  words: MeaningWordTuple[] | null | undefined,
  currentTime: number
): number {
  if (!words || words.length === 0) return -1;
  let activeIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (currentTime >= words[i][1]) {
      activeIdx = i;
    } else {
      break;
    }
  }
  return activeIdx;
}

/**
 * Next boundary time in seconds (word begin or end) after currentTime.
 * Used for frame-accurate requestAnimationFrame boundary triggering.
 */
export function getNextMeaningBoundary(
  words: MeaningWordTuple[] | null | undefined,
  currentTime: number
): number | null {
  if (!words || words.length === 0) return null;
  let next = Infinity;
  for (const [, begin, end] of words) {
    if (begin > currentTime && begin < next) next = begin;
    if (end > currentTime && end < next) next = end;
  }
  return Number.isFinite(next) ? next : null;
}

/**
 * React hook to fetch and provide meaning word timings for a given surah & ayah.
 */
export function useMeaningTimings(
  voice: MeaningVoice,
  lang: TranslationLang,
  surah: number | undefined,
  ayah: number | undefined,
  enabled: boolean = true
) {
  const [timings, setTimings] = useState<SurahMeaningTimings | null>(null);

  useEffect(() => {
    if (!enabled || !surah || !isMeaningLang(lang)) {
      setTimings(null);
      return;
    }
    let cancelled = false;
    loadMeaningTimings(voice, lang, surah).then((res) => {
      if (!cancelled) setTimings(res);
    });
    return () => {
      cancelled = true;
    };
  }, [voice, lang, surah, enabled]);

  const words = getAyahMeaningTimings(timings, ayah);
  return { timings, words };
}
