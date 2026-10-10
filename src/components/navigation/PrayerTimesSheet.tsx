"use client";

import { ActionSheet } from "@/components/ui/ActionSheet";
import { CheckCircleIcon, HourglassIcon, MosqueLocationIcon } from "@/components/ui/Icon";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { cn } from "@/lib/utils";
import { useUiLang } from "@/lib/uiLang";
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

// The sheet's own words; prayer names come from PRAYER_LABELS, and the method
// names (organisations) stay as they are.
const T = {
  title: { en: "Prayer times", ta: "தொழுகை நேரங்கள்" },
  finding: { en: "Finding your location...", ta: "உங்கள் இருப்பிடத்தைத் தேடுகிறது..." },
  updated: { en: "Location Updated", ta: "இருப்பிடம் புதுப்பிக்கப்பட்டது" },
  update: { en: "Update location", ta: "இருப்பிடத்தைப் புதுப்பி" },
  unnamed: {
    en: "Couldn't look up the place name. Check your connection and try again.",
    ta: "இடத்தின் பெயரைக் கண்டறிய முடியவில்லை. இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயலவும்.",
  },
  failed: {
    en: "Couldn't get your location. Check that Location is on for this browser in your device settings.",
    ta: "உங்கள் இருப்பிடத்தைப் பெற முடியவில்லை. சாதன அமைப்புகளில் இந்த உலாவிக்கு இருப்பிடம் இயக்கத்தில் உள்ளதா எனச் சரிபார்க்கவும்.",
  },
  method: { en: "Calculation method", ta: "கணக்கீட்டு முறை" },
  shafi: { en: "Shafi'i · Maliki · Hanbali", ta: "ஷாஃபிஈ · மாலிகீ · ஹன்பலீ" },
  hanafi: { en: "Hanafi", ta: "ஹனஃபீ" },
  device: { en: "Worked out on your device from your location.", ta: "உங்கள் இருப்பிடத்தைக் கொண்டு உங்கள் சாதனத்திலேயே கணக்கிடப்பட்டது." },
  regional: { en: "Method and Asr follow your region.", ta: "முறையும் அஸரும் உங்கள் பகுதியின்படி." },
  defaults: { en: "Use my region's defaults", ta: "என் பகுதியின் இயல்புநிலையைப் பயன்படுத்து" },
} as const;

const ROWS: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

// The select's own arrow, drawn so it sits inside the pill's rounded end.
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f3eee4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

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
  locating: "idle" | "busy" | "done" | "failed" | "unnamed";
}) {
  const today = dayTimes(coords.lat, coords.lon, new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12), method, asr).times;
  const set = (p: PrayerPrefs) => {
    onPrefs(p);
    savePrayerPrefs(p);
  };
  const lang = useUiLang();
  const ta = lang === "ta";
  const date = now.toLocaleDateString(ta ? "ta-IN" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  const regional = !prefs.method && !prefs.asr;

  return (
    <ActionSheet open={open} onClose={onClose} label={T.title[lang]}>
      <div className={cn("px-5 pt-1 pb-2", ta && "font-tamil")}>
        <h2 className="text-base font-bold text-sand-50">
          {T.title[lang]}
          {place ? ` · ${place}` : ""}
        </h2>
        <p className="text-xs text-sand-200/70">{date}</p>
        {/* Figma 679:19923: one pill, its icon and text following the state. */}
        <button
          type="button"
          onClick={onLocate}
          disabled={locating === "busy"}
          aria-live="polite"
          className="tap-44 mt-2 inline-flex items-center gap-2.5 rounded-full border border-white px-3 py-2 text-xs text-white transition-colors hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent"
        >
          {locating === "busy" ? (
            <HourglassIcon className="shrink-0" />
          ) : locating === "done" ? (
            <CheckCircleIcon className="shrink-0" />
          ) : (
            <MosqueLocationIcon className="shrink-0" />
          )}
          {/* Tamil runs longer: it may wrap rather than run off a phone. */}
          <span className={ta ? "text-left" : "whitespace-nowrap"}>
            {locating === "busy"
              ? T.finding[lang]
              : locating === "done"
                ? `${T.updated[lang]}${place ? ` - “${place}”` : ""}`
                : T.update[lang]}
          </span>
        </button>
        {locating === "unnamed" && (
          <p role="status" className="mt-1.5 text-[11px] text-sand-200/70">
            {T.unnamed[lang]}
          </p>
        )}
        {locating === "failed" && (
          <p role="status" className="mt-1.5 text-[11px] text-sand-200/70">
            {T.failed[lang]}
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
                <span className={cn("font-semibold", ta && "font-tamil")}>{PRAYER_LABELS[k][lang]}</span>
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
          <span className={cn("mb-1 block", ta && "font-tamil")}>{T.method[lang]}</span>
          <select
            value={method}
            onChange={(e) => set({ ...prefs, method: e.target.value as MethodId })}
            className="h-11 w-full appearance-none rounded-full border border-white/15 bg-black/40 bg-[length:16px] bg-[position:right_1.25rem_center] bg-no-repeat pl-5 pr-12 text-sm text-sand-50"
            style={{ backgroundImage: CHEVRON }}
          >
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-sand-200/80">
          <span className={cn("mb-1 block", ta && "font-tamil")}>{PRAYER_LABELS.asr[lang]}</span>
          <div role="radiogroup" aria-label={PRAYER_LABELS.asr[lang]} className={TAB_TRACK}>
            {(["shafi", "hanafi"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={asr === m}
                onClick={() => set({ ...prefs, asr: m })}
                className={cn(TAB, "min-h-11", ta && "font-tamil", asr === m ? SELECTED_TAB : UNSELECTED_TAB)}
              >
                {T[m][lang]}
              </button>
            ))}
          </div>
        </div>
        <p className={cn("text-[11px] leading-relaxed text-sand-200/60", ta && "font-tamil")}>
          {T.device[lang]}{" "}
          {regional ? (
            T.regional[lang]
          ) : (
            <button type="button" onClick={() => set({})} className="tap-44 underline underline-offset-2 hover:text-sand-50">
              {T.defaults[lang]}
            </button>
          )}
        </p>
      </div>
    </ActionSheet>
  );
}
