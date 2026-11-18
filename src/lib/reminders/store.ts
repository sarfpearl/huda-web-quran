/*
 * Quran-reading reminders (Settings › Reminders): the times this browser
 * wants a notification at, kept in localStorage `huda-reminders` so the page
 * works offline and the optional login can later sync them as they are:
 *
 *   { v: 1, times: [{ id, time: "06:30", on: true }], updatedAt: 1731650000000,
 *     synced?: { endpoint, lang, tz, key } }
 *
 * The server (Supabase `save_reading_reminders`) gets the whole list each time
 * it changes, with the push subscription, time zone and app language; the
 * sender then fires each time in the browser's own time zone. Pure functions
 * here; the browser side (permission, push) is in ./push.ts.
 */

export const REMINDERS_KEY = "huda-reminders";
export const MAX_REMINDERS = 10;
export const DEFAULT_REMINDER_TIME = "06:30";

export interface ReminderTime {
  id: string;
  /** Local time, 24-hour "HH:MM". */
  time: string;
  on: boolean;
}

export interface ReminderState {
  v: 1;
  times: ReminderTime[];
  updatedAt: number;
  /** What the server last accepted (to re-save only on a change). */
  synced?: { endpoint: string; lang: string; tz: string; key: string };
}

export const EMPTY_REMINDERS: ReminderState = { v: 1, times: [], updatedAt: 0 };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isReminderTime = (v: unknown): v is string => typeof v === "string" && TIME_RE.test(v);

/** A stored value back to a valid state (anything broken is dropped). */
export function parseReminders(raw: string | null): ReminderState {
  if (!raw) return EMPTY_REMINDERS;
  try {
    const o = JSON.parse(raw) as Partial<ReminderState>;
    const times = (Array.isArray(o.times) ? o.times : [])
      .filter((r): r is ReminderTime => !!r && typeof r.id === "string" && isReminderTime(r.time))
      .map((r) => ({ id: r.id, time: r.time, on: r.on !== false }))
      .slice(0, MAX_REMINDERS);
    const s = o.synced;
    return {
      v: 1,
      times,
      updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : 0,
      synced: s && typeof s.endpoint === "string" && typeof s.key === "string" ? s : undefined,
    };
  } catch {
    return EMPTY_REMINDERS;
  }
}

/** Earliest first; one entry per time (the first one wins). */
export function sortReminders(times: ReminderTime[]): ReminderTime[] {
  const seen = new Set<string>();
  return [...times]
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((r) => (seen.has(r.time) ? false : (seen.add(r.time), true)));
}

/** A time not in the list yet: the default, else an hour after the last. */
export function nextReminderTime(times: ReminderTime[]): string {
  const used = new Set(times.map((r) => r.time));
  if (!used.has(DEFAULT_REMINDER_TIME)) return DEFAULT_REMINDER_TIME;
  const last = sortReminders(times).at(-1)?.time ?? DEFAULT_REMINDER_TIME;
  let m = (Number(last.slice(0, 2)) * 60 + Number(last.slice(3)) + 60) % 1440;
  for (let i = 0; i < 1440; i++, m = (m + 1) % 1440) {
    const t = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    if (!used.has(t)) return t;
  }
  return DEFAULT_REMINDER_TIME;
}

/** The list as the server takes it (p_times), and a key to spot a change. */
export function serverTimes(times: ReminderTime[]): { time: string; on: boolean }[] {
  return sortReminders(times).map((r) => ({ time: r.time, on: r.on }));
}
export const syncKey = (times: ReminderTime[]) => JSON.stringify(serverTimes(times));

/** "06:30" as a 12-hour time in the UI language ("6:30 AM"). */
export function formatReminderTime(time: string, locale: string): string {
  const [h, m] = time.split(":").map(Number);
  try {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit", hour12: true })
      .format(new Date(2000, 0, 1, h, m))
      .replace(/\b([ap])\.?m\.?(?=\s|$)/i, (_, x: string) => `${x.toUpperCase()}M`);
  } catch {
    return time;
  }
}
