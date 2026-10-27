"use client";

import { useCallback, useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";
import type { TranslationLang } from "./translations";
import manifest from "./meaningAudioManifest.json";
import stops from "./meaningStops.json";

/*
 * Meaning audio: after each ayah, a voice reads its meaning — the translation
 * text shown beside it, word for word. One clip per ayah, per voice and
 * language, generated once with Gemini TTS
 * (scripts/generation/build-meaning-audio.mjs) and served from R2:
 *   /audio/meaning/v<version>/<voice>/<lang>/<SSS><AAA>.mp3
 * meaningAudioManifest.json lists the Surahs whose clips are uploaded; the
 * script updates it. Nothing listed → the option stays hidden.
 */

export type MeaningVoice = "cruz" | "lora";
export type MeaningLang = Extract<TranslationLang, "en" | "ta">;

export const MEANING_VOICES: { id: MeaningVoice; label: string }[] = [
  { id: "cruz", label: "Male" },
  { id: "lora", label: "Female" },
];

export const isMeaningLang = (lang: TranslationLang): lang is MeaningLang => lang === "en" || lang === "ta";

type Manifest = { version: number; surahs: Record<MeaningVoice, Record<MeaningLang, number[]>> };
const MANIFEST = manifest as Manifest;
const READY = new Map<string, Set<number>>();
for (const [voice, langs] of Object.entries(MANIFEST.surahs)) {
  for (const [lang, surahs] of Object.entries(langs)) READY.set(`${voice}/${lang}`, new Set(surahs));
}

/** Any clips uploaded at all (else the option isn't shown). */
export const MEANING_AUDIO_PUBLISHED = [...READY.values()].some((s) => s.size > 0);

/** Whether a Surah's meaning clips exist in this voice and language. */
export function hasMeaningAudio(voice: MeaningVoice, lang: TranslationLang, surah: number): boolean {
  return isMeaningLang(lang) && Boolean(READY.get(`${voice}/${lang}`)?.has(surah));
}

const pad3 = (n: number) => String(n).padStart(3, "0");

/** The meaning clip of one ayah, or null when it isn't uploaded. */
export function meaningAudioUrl(voice: MeaningVoice, lang: TranslationLang, surah: number, ayah: number): string | null {
  if (!hasMeaningAudio(voice, lang, surah)) return null;
  return mediaUrl(`/audio/meaning/v${MANIFEST.version}/${voice}/${lang}/${pad3(surah)}${pad3(ayah)}.mp3`);
}

/**
 * Where a reciter's voice of each ayah of a Surah really ends — [after 1,
 * after 2, …] in seconds on the recording, measured on it by
 * scripts/generation/build-meaning-stops.mjs — or null (not measured).
 */
export function meaningStopsFor(reciterId: string, surah: number): number[] | null {
  return (stops as Record<string, Record<string, number[]>>)[reciterId]?.[String(surah)] ?? null;
}

// ── The listener's choice ──────────────────────────────────────────────────

export interface MeaningAudioPrefs {
  on: boolean;
  voice: MeaningVoice;
}

const PREFS_KEY = "huda:meaning-audio";
const DEFAULT_PREFS: MeaningAudioPrefs = { on: false, voice: "cruz" };

function readPrefs(): MeaningAudioPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<MeaningAudioPrefs> | null;
    return {
      on: p?.on === true,
      voice: MEANING_VOICES.some((v) => v.id === p?.voice) ? (p!.voice as MeaningVoice) : DEFAULT_PREFS.voice,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Meaning audio on / off and the voice, kept in localStorage. */
export function useMeaningAudioPrefs() {
  const [prefs, setPrefs] = useState<MeaningAudioPrefs>(DEFAULT_PREFS);
  useEffect(() => setPrefs(readPrefs()), []);
  const update = useCallback((patch: Partial<MeaningAudioPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return [prefs, update] as const;
}
