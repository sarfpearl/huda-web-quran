/*
 * Optional login, Phase 2 (docs/LOGIN_STRATEGY.md §4–5): the last read, the
 * bookmark and the settings follow a signed-in reader to every device, kept
 * in public.user_sync (supabase/migrations/20261122120000_user_sync.sql).
 *
 * This browser stays the first copy: reading never waits for the network.
 * A sync reads the account's row, keeps the newer of each item and writes
 * back what the account lacks:
 *   - last read: the newer `at`;
 *   - bookmarks: the list that changed last (`huda:bookmarks-at`);
 *   - settings: per key, the newer change. Changes are noticed by comparing
 *     with what the last sync saw (SNAPSHOT_KEY), so the setters stay as
 *     they are. Before this browser ever synced, the account's value wins.
 * Settings brought from another device are applied by reloading the page
 * once, right after signing in or opening the page — never mid-session.
 *
 * Runs on sign-in, page open, return to the page, network back, a little
 * after a reading change, and once a minute if a setting changed here.
 * The Supabase client stays out of guests' pages (lib/auth/hint).
 */

import { useSyncExternalStore } from "react";
import { client, getAccount, loginEnabled, onAccountChange } from "./account";
import {
  READING_CHANGED_EVENT,
  READING_SYNCED_EVENT,
  clearReading,
  loadBookmarks,
  loadBookmarksAt,
  loadLastRead,
  writeBookmarks,
  writeLastRead,
  type Bookmark,
  type LastRead,
} from "@/lib/lastRead";

/**
 * The settings that follow the account (localStorage keys). Not here, on
 * purpose: place (privacy), volume, install / peek flags, the analytics id,
 * reminders (each browser has its own push subscription).
 */
const SYNCED_SETTINGS = [
  "huda-ui-lang",
  "huda-translation-lang",
  "huda:show-meaning",
  "huda:meaning-audio",
  "huda:script",
  "huda:tajweed2",
  "huda-selected-reciter",
  "huda-player:end-mode",
  "huda-theme",
  "huda-scene-dim",
  "huda:prayer-prefs",
  "huda-comment-name",
  "huda-tour-done",
] as const;
/** Kept apart for phones and for larger screens: a phone's size suits no desktop. */
const PER_SCREEN = "huda:reader-scale-v2";

/** What the last sync saw: { [account key]: { v, at } }. */
const SNAPSHOT_KEY = "huda:sync-snapshot";
/** sessionStorage: settings were applied by a reload in this tab already. */
const RELOADED_KEY = "huda:sync-reloaded";

type Setting = { v: string | null; at: number };
type Settings = Record<string, Setting>;

export type SyncState = "off" | "syncing" | "synced" | "offline";

let state: SyncState = "off";
const listeners = new Set<() => void>();
function setState(next: SyncState) {
  if (state === next) return;
  state = next;
  for (const f of listeners) f();
}
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => void listeners.delete(f);
};
const getState = () => state;
const getOff = (): SyncState => "off";
/** The sync state for the Account page. */
export const useSyncState = () => useSyncExternalStore(subscribe, getState, getOff);

// --- local copies -----------------------------------------------------------

function screenKey(): string {
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  return `${PER_SCREEN}@${wide ? "wide" : "phone"}`;
}

/** account key → localStorage key, for this screen. */
function settingKeys(): [string, string][] {
  return [...SYNCED_SETTINGS.map((k) => [k, k] as [string, string]), [screenKey(), PER_SCREEN]];
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, v);
  } catch {
    /* storage unavailable */
  }
}
function loadSnapshot(): Settings | null {
  try {
    const s = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? "null");
    return s && typeof s === "object" ? (s as Settings) : null;
  } catch {
    return null;
  }
}
const saveSnapshot = (s: Settings) => write(SNAPSHOT_KEY, JSON.stringify(s));

/** A setting changed here since the last sync (no network). */
function settingsChangedHere(): boolean {
  const snap = loadSnapshot();
  if (!snap) return false;
  return settingKeys().some(([acc, local]) => (snap[acc]?.v ?? null) !== read(local));
}

// --- merge ------------------------------------------------------------------

const sameRead = (a: LastRead | null, b: LastRead | null) =>
  a === b || (!!a && !!b && a.surah === b.surah && a.ayah === b.ayah && a.at === b.at);
const newerRead = (a: LastRead | null, b: LastRead | null) => (!a ? b : !b ? a : b.at > a.at ? b : a);

function parseRead(v: unknown): LastRead | null {
  const r = v as Partial<LastRead> | null;
  return r && Number.isInteger(r.surah) && Number.isInteger(r.ayah) && r.surah! >= 1 && r.surah! <= 114 && r.ayah! >= 1
    ? { surah: r.surah!, ayah: r.ayah!, at: Number(r.at) || 0 }
    : null;
}

function parseBookmarks(v: unknown): Bookmark[] {
  return Array.isArray(v)
    ? (v as Bookmark[]).filter(
        (b) =>
          b &&
          (b.kind === "surah" || (b.kind === "juz" && Number.isInteger(b.juz))) &&
          Number.isInteger(b.surah) &&
          Number.isInteger(b.ayah),
      )
    : [];
}

function parseSettings(v: unknown): Settings {
  const out: Settings = {};
  if (v && typeof v === "object") {
    for (const [k, s] of Object.entries(v as Record<string, Partial<Setting>>)) {
      if (s && (typeof s.v === "string" || s.v === null)) out[k] = { v: s.v, at: Number(s.at) || 0 };
    }
  }
  return out;
}

/** Per setting: whose value stays, and whether this browser took any from the account. */
function mergeSettings(remote: Settings, snap: Settings | null, now: number) {
  const merged: Settings = { ...remote };
  let pulled = false;
  let push = false;
  for (const [acc, localKey] of settingKeys()) {
    const local = read(localKey);
    const r = remote[acc];
    const before = snap?.[acc];
    const changedHere = snap ? (before?.v ?? null) !== local : false;
    if (!r) {
      // The account has never had it: this browser's value starts it.
      if (local !== null) {
        merged[acc] = { v: local, at: now };
        push = true;
      }
    } else if (changedHere) {
      // Changed here since the last sync: newer than anything that sync saw,
      // so it stays even if the account changed too.
      merged[acc] = { v: local, at: now };
      push = true;
    } else if (r.v !== local) {
      write(localKey, r.v);
      pulled = true;
    }
  }
  return { merged, pulled, push };
}

// --- sync -------------------------------------------------------------------

let userId: string | null = null;
let syncing = false;
let again = false;
/** The first sync after sign-in or page open may reload to apply settings. */
let mayReload = false;

async function sync() {
  if (!userId) return;
  if (syncing) {
    again = true;
    return;
  }
  syncing = true;
  const me = userId;
  setState("syncing");
  try {
    const supabase = await client();
    if (!supabase) throw new Error("unconfigured");
    const { data, error } = await supabase
      .from("user_sync")
      .select("last_read, bookmarks, bookmarks_at, settings")
      .eq("user_id", me)
      .maybeSingle();
    if (error) throw error;
    if (userId !== me) return;

    const now = Date.now();
    const remote = {
      lastRead: parseRead(data?.last_read),
      bookmarks: parseBookmarks(data?.bookmarks),
      at: Number(data?.bookmarks_at) || 0,
      settings: parseSettings(data?.settings),
    };
    const local = { lastRead: loadLastRead(), bookmarks: loadBookmarks(), at: loadBookmarksAt() };

    const lastRead = newerRead(local.lastRead, remote.lastRead);
    const remoteList = remote.at > local.at;
    let readingPulled = false;
    if (lastRead && !sameRead(lastRead, local.lastRead)) {
      writeLastRead(lastRead);
      readingPulled = true;
    }
    if (remoteList) {
      writeBookmarks(remote.bookmarks, remote.at);
      readingPulled = true;
    }
    if (readingPulled) window.dispatchEvent(new Event(READING_SYNCED_EVENT));

    const settings = mergeSettings(remote.settings, loadSnapshot(), now);

    if (!data || !sameRead(lastRead, remote.lastRead) || local.at > remote.at || settings.push) {
      const { error: upsertError } = await supabase.from("user_sync").upsert({
        user_id: me,
        last_read: lastRead,
        bookmarks: remoteList ? remote.bookmarks : local.bookmarks,
        bookmarks_at: Math.max(local.at, remote.at),
        settings: settings.merged,
        updated_at: new Date(now).toISOString(),
      });
      if (upsertError) throw upsertError;
    }
    saveSnapshot(settings.merged);
    setState("synced");

    const reload = mayReload && settings.pulled;
    mayReload = false;
    if (reload) {
      // Once per tab, so a setting that will not stick can never loop.
      let done = false;
      try {
        done = sessionStorage.getItem(RELOADED_KEY) === "1";
        sessionStorage.setItem(RELOADED_KEY, "1");
      } catch {
        done = true;
      }
      if (!done) window.location.reload();
    }
  } catch {
    setState("offline");
  } finally {
    syncing = false;
    if (again) {
      again = false;
      void sync();
    }
  }
}

// A reading change goes out a little later (the last read changes every ayah).
const PUSH_DELAY_MS = 10_000;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePush() {
  if (!userId || pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void sync();
  }, PUSH_DELAY_MS);
}
function flush() {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
    void sync();
  } else if (userId && settingsChangedHere()) void sync();
}

// Back to the page: fetch what another device saved (not too often).
const PULL_GAP_MS = 30_000;
let lastPull = 0;
function pull() {
  if (!userId || Date.now() - lastPull < PULL_GAP_MS) return;
  lastPull = Date.now();
  void sync();
}

function onAccount(id: string | null) {
  if (id === userId) return;
  userId = id;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  if (!id) {
    // The next account on this browser starts fresh (its values win at first).
    write(SNAPSHOT_KEY, null);
    setState("off");
    return;
  }
  mayReload = true;
  lastPull = Date.now();
  void sync();
}

let started = false;

/** Starts syncing for whoever is (or becomes) signed in on this page. */
export function startSync() {
  if (started || typeof window === "undefined" || !loginEnabled()) return;
  started = true;
  void getAccount().then((a) => onAccount(a?.id ?? null));
  void onAccountChange((a) => {
    // Supabase calls inside its own callback would wait on its lock: run after.
    setTimeout(() => onAccount(a?.id ?? null), 0);
  });
  window.addEventListener(READING_CHANGED_EVENT, schedulePush);
  window.addEventListener("online", pull);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
    else pull();
  });
  // Settings have no change event: look once a minute (no network unless changed).
  window.setInterval(() => {
    if (document.visibilityState === "visible" && userId && settingsChangedHere()) void sync();
  }, 60_000);
}

/** Before signing out: send what is still waiting. */
export async function flushBeforeSignOut() {
  if (!userId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  await sync();
}

/** After signing out with "Remove from this device": this browser forgets the reading. */
export function forgetThisDevice() {
  clearReading();
}
