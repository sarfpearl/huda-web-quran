import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes, type CalculationParameters } from "adhan";

/*
 * Prayer (waqt) times for the header pill (TimeLocationWidget), computed on
 * the device with adhan-js from the visitor's location. The method and the
 * Asr madhab follow the region by default (owner's choice), and can be
 * changed in the prayer-times sheet (remembered per browser).
 */

export type MethodId =
  | "Karachi"
  | "MuslimWorldLeague"
  | "UmmAlQura"
  | "Egyptian"
  | "Dubai"
  | "Kuwait"
  | "Qatar"
  | "Singapore"
  | "Turkey"
  | "Tehran"
  | "NorthAmerica"
  | "MoonsightingCommittee";
export type AsrMadhab = "shafi" | "hanafi";

export const METHODS: { id: MethodId; label: string }[] = [
  { id: "Karachi", label: "Karachi (Univ. of Islamic Sciences)" },
  { id: "MuslimWorldLeague", label: "Muslim World League" },
  { id: "UmmAlQura", label: "Umm al-Qura, Makkah" },
  { id: "Egyptian", label: "Egyptian General Authority" },
  { id: "Dubai", label: "Dubai" },
  { id: "Kuwait", label: "Kuwait" },
  { id: "Qatar", label: "Qatar" },
  { id: "Singapore", label: "Singapore / JAKIM / Kemenag" },
  { id: "Turkey", label: "Diyanet (Turkey)" },
  { id: "Tehran", label: "Tehran" },
  { id: "NorthAmerica", label: "ISNA (North America)" },
  { id: "MoonsightingCommittee", label: "Moonsighting Committee" },
];

// Country (ISO 3166-1, lower case) → method. Anything else: Muslim World League.
const COUNTRY_METHOD: Record<string, MethodId> = {
  in: "Karachi", pk: "Karachi", bd: "Karachi", af: "Karachi", np: "Karachi", lk: "Karachi", mv: "Karachi",
  sa: "UmmAlQura", ye: "UmmAlQura",
  ae: "Dubai", om: "Dubai", bh: "Dubai",
  kw: "Kuwait", qa: "Qatar",
  eg: "Egyptian", sd: "Egyptian", ly: "Egyptian", sy: "Egyptian", iq: "Egyptian", lb: "Egyptian", jo: "Egyptian", ps: "Egyptian",
  my: "Singapore", sg: "Singapore", id: "Singapore", bn: "Singapore",
  tr: "Turkey", ir: "Tehran",
  us: "NorthAmerica", ca: "NorthAmerica",
  gb: "MoonsightingCommittee",
};

// Asr by region: Hanafi where most Muslims follow it; Shafi'i (the standard
// shadow = length) elsewhere. India goes by state: Kerala, Puducherry and
// Lakshadweep → Shafi'i; Tamil Nadu and the rest of India → Hanafi (owner's
// choice: most people there follow Hanafi).
const HANAFI_COUNTRIES = new Set(["pk", "bd", "af", "np", "tr", "uz", "kz", "tj", "kg", "tm", "az", "ba", "al", "xk", "mk"]);
const SHAFII_INDIA_STATES = new Set(["IN-KL", "IN-PY", "IN-LD"]);

export function regionDefaults(countryCode?: string | null, stateCode?: string | null): { method: MethodId; asr: AsrMadhab } {
  const cc = countryCode?.toLowerCase() ?? "";
  const method = COUNTRY_METHOD[cc] ?? "MuslimWorldLeague";
  const asr: AsrMadhab =
    cc === "in" ? (stateCode && SHAFII_INDIA_STATES.has(stateCode.toUpperCase()) ? "shafi" : "hanafi") : HANAFI_COUNTRIES.has(cc) ? "hanafi" : "shafi";
  return { method, asr };
}

export type PrayerName = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
/** English (the UI-string key: t(lang, PRAYER_LABELS[k].en)) and Arabic names. */
export const PRAYER_LABELS: Record<PrayerName, { en: string; ar: string }> = {
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
};
const ORDER: PrayerName[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

function params(method: MethodId, asr: AsrMadhab): CalculationParameters {
  const p = CalculationMethod[method]();
  p.madhab = asr === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  // Far north / south (summer) the twilight angles may never be reached:
  // Fajr / Isha then come from the angle's share of the night — the rule
  // AlAdhan and PrayTimes use, so times match other Muslim apps. Has no
  // effect where the angles are reached (all of India, the Gulf, Malaysia…).
  p.highLatitudeRule = HighLatitudeRule.TwilightAngle;
  return p;
}

export interface DayTimes {
  date: Date;
  times: Record<PrayerName, Date>;
}

export function dayTimes(lat: number, lon: number, day: Date, method: MethodId, asr: AsrMadhab): DayTimes {
  const t = new PrayerTimes(new Coordinates(lat, lon), day, params(method, asr));
  return { date: day, times: { fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha } };
}

/**
 * The waqt `now` falls in: its prayer and when it starts and ends. Fajr ends
 * at sunrise; Isha runs to the next Fajr (so after midnight it is still the
 * previous day's Isha). Between sunrise and Dhuhr no obligatory prayer is
 * due: `prayer` is Dhuhr with `upcoming` set (it starts at `start`).
 */
export interface Waqt {
  prayer: PrayerName;
  start: Date;
  end: Date;
  upcoming: boolean;
}

const valid = (t: Record<PrayerName, Date>) => ORDER.every((k) => !Number.isNaN(t[k].getTime()));

/** Null where the sun doesn't rise or set that day (polar summer / winter). */
export function currentWaqt(lat: number, lon: number, now: Date, method: MethodId, asr: AsrMadhab): Waqt | null {
  const day = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
  const today = dayTimes(lat, lon, day(0), method, asr).times;
  if (!valid(today)) return null;
  if (now < today.fajr) {
    const yesterday = dayTimes(lat, lon, day(-1), method, asr).times;
    if (!valid(yesterday)) return null;
    return { prayer: "isha", start: yesterday.isha, end: today.fajr, upcoming: false };
  }
  if (now >= today.isha) {
    const tomorrow = dayTimes(lat, lon, day(1), method, asr).times;
    if (!valid(tomorrow)) return null;
    return { prayer: "isha", start: today.isha, end: tomorrow.fajr, upcoming: false };
  }
  if (now >= today.sunrise && now < today.dhuhr) return { prayer: "dhuhr", start: today.dhuhr, end: today.asr, upcoming: true };
  let i = ORDER.length - 1;
  while (i > 0 && now < today[ORDER[i]]) i--;
  const prayer = ORDER[i];
  const next = prayer === "fajr" ? today.sunrise : today[ORDER[i + 1]];
  return { prayer, start: today[prayer], end: next, upcoming: false };
}

/** "3:42 PM" in the device's time zone (the location is the device's). */
export const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
