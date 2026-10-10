"use client";

import { ActionSheet } from "@/components/ui/ActionSheet";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { cn } from "@/lib/utils";
import { clock, dayTimes, METHODS, PRAYER_LABELS, type AsrMadhab, type MethodId, type PrayerName, type Waqt } from "@/lib/prayerTimes";

/** A method / Asr chosen here, over the region's default (per browser). */
export interface PrayerPrefs {
  method?: MethodId;
  asr?: AsrMadhab;
}
const PREFS_KEY = "huda:prayer-prefs";

export function readPrayerPrefs(): PrayerPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") as PrayerPrefs;
    return {
      method: METHODS.some((m) => m.id === p.method) ? p.method : undefined,
      asr: p.asr === "shafi" || p.asr === "hanafi" ? p.asr : undefined,
    };
  } catch {
    return {};
  }
}
function savePrayerPrefs(p: PrayerPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

const ROWS: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

/** Today's prayer times where the device is, with the method and Asr madhab. */
export function PrayerTimesSheet({
  open,
  onClose,
  coords,
  place,
  now,
  method,
  asr,
  prefs,
  onPrefs,
  current,
  onLocate,
  locating,
}: {
  open: boolean;
  onClose: () => void;
  coords: { lat: number; lon: number };
  place: string;
  now: Date;
  method: MethodId;
  asr: AsrMadhab;
  prefs: PrayerPrefs;
  onPrefs: (p: PrayerPrefs) => void;
  current: Waqt;
  /** Look up the device's place again now (a tap, so it may prompt). */
  onLocate: () => void;
  locating: "idle" | "busy" | "failed";
}) {
  const today = dayTimes(coords.lat, coords.lon, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), method, asr).times;
  const set = (p: PrayerPrefs) => {
    onPrefs(p);
    savePrayerPrefs(p);
  };
  const date = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const regional = !prefs.method && !prefs.asr;

  return (
    <ActionSheet open={open} onClose={onClose} label="Prayer times">
      <div className="px-5 pt-1 pb-2">
        <h2 className="text-base font-bold text-sand-50">Prayer times{place ? ` · ${place}` : ""}</h2>
        <p className="text-xs text-sand-200/70">{date}</p>
        <button
          type="button"
          onClick={onLocate}
          disabled={locating === "busy"}
          className="tap-44 mt-1 text-xs text-emerald-200 underline underline-offset-2 hover:text-sand-50 disabled:opacity-60"
        >
          {locating === "busy" ? "Finding your location…" : "Update location"}
        </button>
        {locating === "failed" && (
          <p role="status" className="text-[11px] text-sand-200/70">
            Couldn&apos;t get your location. Check that Location is on for this browser in your device settings.
          </p>
        )}
      </div>
      <ul className="px-3 pb-2">
        {ROWS.map((k) => {
          const isNow = k === current.prayer && !current.upcoming;
          return (
            <li
              key={k}
              aria-current={isNow ? "true" : undefined}
              className={cn(
                "flex items-center justify-between rounded-2xl px-3 py-2.5",
                isNow ? "bg-emerald-400/15 text-emerald-200" : "text-sand-100",
                k === "sunrise" && !isNow && "text-sand-200/60",
              )}
            >
              <span className="flex items-baseline gap-2">
                <span className="font-semibold">{PRAYER_LABELS[k].en}</span>
                <span className="font-arabic text-sm opacity-70" lang="ar">
                  {PRAYER_LABELS[k].ar}
                </span>
              </span>
              <span className="tabular-nums font-semibold">{clock(today[k])}</span>
            </li>
          );
        })}
      </ul>
      <div className="space-y-3 border-t border-white/10 px-5 pt-3 pb-5">
        <label className="block text-xs text-sand-200/80">
          <span className="mb-1 block">Calculation method</span>
          <select
            value={method}
            onChange={(e) => set({ ...prefs, method: e.target.value as MethodId })}
            className="h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-sm text-sand-50"
          >
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-sand-200/80">
          <span className="mb-1 block">Asr</span>
          <div role="radiogroup" aria-label="Asr" className={TAB_TRACK}>
            {(["shafi", "hanafi"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={asr === m}
                onClick={() => set({ ...prefs, asr: m })}
                className={cn(TAB, "min-h-11", asr === m ? SELECTED_TAB : UNSELECTED_TAB)}
              >
                {m === "shafi" ? "Shafi'i · Maliki · Hanbali" : "Hanafi"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-sand-200/60">
          Worked out on your device from your location.{" "}
          {regional ? (
            "Method and Asr follow your region."
          ) : (
            <button type="button" onClick={() => set({})} className="tap-44 underline underline-offset-2 hover:text-sand-50">
              Use my region&apos;s defaults
            </button>
          )}
        </p>
      </div>
    </ActionSheet>
  );
}
