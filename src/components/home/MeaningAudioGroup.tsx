"use client";

import { cn } from "@/lib/utils";
import { t, useUiLang } from "@/lib/uiLang";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { MEANING_VOICES, type MeaningVoice } from "@/lib/data/meaningAudio";

/*
 * "Read the meaning aloud" + Ayah + meaning / Meaning only + Male / Female: in Settings › Translation and in
 * the header's translation sheet (the same preferences).
 */

export interface MeaningAudioSettings {
  on: boolean;
  voice: MeaningVoice;
  only: boolean;
  onToggle: () => void;
  onChooseVoice: (v: MeaningVoice) => void;
  onChooseOnly: (only: boolean) => void;
}

const GROUP = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";

export function Switch({ on, label, sub, onToggle, disabled }: { on: boolean; label: string; sub?: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onToggle}
      className={cn("flex w-full items-center justify-between gap-3 py-1 text-left", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-white">{label}</span>
        {sub && <span className="text-[11px] text-sand-200/70">{sub}</span>}
      </span>
      <span aria-hidden="true" className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-amber-400/90" : "bg-white/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

/** Meaning audio: on / off, and a male or female voice. */
export function MeaningAudioGroup({
  on,
  voice,
  only,
  onToggle,
  onChooseVoice,
  onChooseOnly,
  supported,
  className,
}: MeaningAudioSettings & { supported: boolean; className?: string }) {
  const lang = useUiLang();
  return (
    <div className={cn(GROUP, className)}>
      <Switch
        on={on && supported}
        label={t(lang, "Read the meaning aloud")}
        sub={t(lang, !supported ? "English and Tamil only, for now." : on && only ? "One ayah's meaning after another, without the recitation." : "After each ayah, in the voice you choose.")}
        onToggle={onToggle}
        disabled={!supported}
      />
      {on && supported && (
        <div role="radiogroup" aria-label={t(lang, "Read the meaning aloud")} className={cn(TAB_TRACK, "mt-3")}>
          {[false, true].map((o) => (
            <button
              key={String(o)}
              type="button"
              role="radio"
              aria-checked={only === o}
              onClick={() => only !== o && onChooseOnly(o)}
              className={cn(TAB, only === o ? SELECTED_TAB : UNSELECTED_TAB)}
            >
              {t(lang, o ? "Meaning only" : "Ayah + meaning")}
            </button>
          ))}
        </div>
      )}
      {on && supported && (
        <div role="radiogroup" aria-label={t(lang, "Voice")} className={cn(TAB_TRACK, "mt-3")}>
          {MEANING_VOICES.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={voice === v.id}
              onClick={() => voice !== v.id && onChooseVoice(v.id)}
              className={cn(TAB, voice === v.id ? SELECTED_TAB : UNSELECTED_TAB)}
            >
              {t(lang, v.label)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

