/*
 * The browser side of the reading reminders: can this browser get Web Push,
 * the notification permission (asked only when the user turns a reminder on),
 * the push subscription from /sw.js, and saving the list to Supabase.
 */

import { getSupabaseRpcClient } from "@/lib/supabase/rpc";
import { UI_LANG_KEY, isUiLang } from "@/lib/uiLang";
import { REMINDERS_KEY, parseReminders, serverTimes, syncKey, type ReminderState } from "./store";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/**
 * "ok": Web Push works here (installed app anywhere; Android / desktop
 * browsers). "install": iPhone / iPad Safari, which has push only once HuDa is
 * on the Home Screen. "unsupported": an old or in-app browser.
 */
export type PushSupport = "ok" | "install" | "unsupported";

function isIos() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const has = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isStandalone()) return "install";
  return has ? "ok" : "unsupported";
}

export function loadReminders(): ReminderState {
  try {
    return parseReminders(localStorage.getItem(REMINDERS_KEY));
  } catch {
    return parseReminders(null);
  }
}

export function storeReminders(state: ReminderState) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(state));
  } catch {
    /* storage blocked */
  }
}

function currentLang(): string {
  try {
    const v = localStorage.getItem(UI_LANG_KEY);
    return isUiLang(v) ? v : "en";
  } catch {
    return "en";
  }
}

const currentTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const bin = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  // ServiceWorker.tsx registers /sw.js in production only (stale chunks in dev).
  if (!existing && process.env.NODE_ENV !== "production") return null;
  if (!existing) await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

export type ReminderError = "denied" | "unconfigured" | "failed" | "offline";

/** Asks for permission when needed (only call from a tap) and subscribes. */
export async function enablePush(): Promise<PushSubscription | ReminderError> {
  if (!VAPID_PUBLIC_KEY || !getSupabaseRpcClient()) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") {
    const answer = await Notification.requestPermission();
    if (answer !== "granted") return "denied";
  }
  try {
    const reg = await registration();
    if (!reg) return "failed";
    return (
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
    );
  } catch {
    return "failed";
  }
}

async function existingSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "ok" || Notification.permission !== "granted") return null;
  try {
    return (await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Saves the list to Supabase for this subscription (an empty list removes
 * the browser there and unsubscribes). Returns the state with `synced` set.
 */
export async function saveToServer(state: ReminderState, sub: PushSubscription): Promise<ReminderState | ReminderError> {
  const rpc = getSupabaseRpcClient();
  if (!rpc) return "unconfigured";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  const json = sub.toJSON();
  const lang = currentLang();
  const tz = currentTz();
  const { data, error } = await rpc.rpc("save_reading_reminders", {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh ?? null,
    p_auth: json.keys?.auth ?? null,
    p_time_zone: tz,
    p_lang: lang,
    p_times: serverTimes(state.times),
  });
  if (error || !(data as { ok?: boolean } | null)?.ok) return "failed";
  if (!state.times.length) {
    await sub.unsubscribe().catch(() => {});
    return { ...state, synced: undefined };
  }
  return { ...state, synced: { endpoint: sub.endpoint, lang, tz, key: syncKey(state.times) } };
}

/**
 * On open and when leaving the page: re-saves the list if the app language,
 * time zone, push endpoint or the list itself changed since the last save
 * (e.g. the language was switched, or the phone moved to another zone).
 * Never asks for permission.
 */
export async function resyncReminders(): Promise<void> {
  const state = loadReminders();
  if (!state.times.length && !state.synced) return;
  const sub = await existingSubscription();
  if (!sub) return;
  const s = state.synced;
  if (s && s.endpoint === sub.endpoint && s.lang === currentLang() && s.tz === currentTz() && s.key === syncKey(state.times)) return;
  const next = await saveToServer(state, sub);
  if (typeof next !== "string") storeReminders(next);
}

/** Saves the list locally, then to the server when push is on here. */
export async function applyReminders(state: ReminderState, sub?: PushSubscription | null): Promise<ReminderState | ReminderError> {
  storeReminders(state);
  const s = sub ?? (await existingSubscription());
  if (!s) return state.times.some((r) => r.on) ? "failed" : state;
  const next = await saveToServer(state, s);
  if (typeof next !== "string") storeReminders(next);
  return next;
}
