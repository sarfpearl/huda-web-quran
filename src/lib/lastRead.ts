/**
 * Last read position: the ayah the reader last reached in reading mode (by
 * recitation or by scrolling), remembered per browser. One position, as a
 * Mushaf's ribbon.
 */
export interface LastRead {
  surah: number;
  ayah: number;
  /** Epoch ms of the save. */
  at: number;
}

const KEY = "huda:last-read";

/**
 * Fired (on window) when the reader changes the last read or the bookmarks
 * here, so the optional account sync (lib/account) can send them on.
 */
export const READING_CHANGED_EVENT = "huda:reading-changed";
/** Fired when the account sync wrote newer copies from another device. */
export const READING_SYNCED_EVENT = "huda:reading-synced";

function changed() {
  try {
    window.dispatchEvent(new Event(READING_CHANGED_EVENT));
  } catch {
    /* no window */
  }
}

function load(key: string): LastRead | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v && Number.isInteger(v.surah) && Number.isInteger(v.ayah) && v.surah >= 1 && v.surah <= 114 && v.ayah >= 1
      ? { surah: v.surah, ayah: v.ayah, at: Number(v.at) || 0 }
      : null;
  } catch {
    return null;
  }
}

export const loadLastRead = () => load(KEY);

export function saveLastRead(surah: number, ayah: number) {
  writeLastRead({ surah, ayah, at: Date.now() });
  changed();
}

/** Stores a position as it is (the sync's copy from another device). */
export function writeLastRead(v: LastRead) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Bookmarks: ayahs the reader marks by hand (the bookmark button beside
 * « Page N » in reading mode), newest first. Each remembers whether it was
 * made reading a Surah or a Juz (the bookmarks panel's Surah | Juz), so it
 * reopens the same way.
 */
export interface Bookmark {
  kind: "surah" | "juz";
  /** Juz bookmarks: the Juz being read. */
  juz?: number;
  surah: number;
  ayah: number;
  at: number;
}

const BOOKMARKS_KEY = "huda:bookmarks";
const OLD_BOOKMARK_KEY = "huda:bookmark"; // single bookmark, before the list
// When the list last changed (epoch ms), so a removal syncs too.
const BOOKMARKS_AT_KEY = "huda:bookmarks-at";

export const bookmarkId = (b: Pick<Bookmark, "kind" | "juz" | "surah" | "ayah">) =>
  `${b.kind}${b.kind === "juz" ? b.juz : ""}:${b.surah}:${b.ayah}`;

export function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (raw === null) {
      const old = load(OLD_BOOKMARK_KEY);
      return old ? [{ kind: "surah", surah: old.surah, ayah: old.ayah, at: old.at }] : [];
    }
    const list = JSON.parse(raw);
    return Array.isArray(list)
      ? list.filter(
          (b): b is Bookmark =>
            b &&
            (b.kind === "surah" || (b.kind === "juz" && Number.isInteger(b.juz) && b.juz >= 1 && b.juz <= 30)) &&
            Number.isInteger(b.surah) &&
            b.surah >= 1 &&
            b.surah <= 114 &&
            Number.isInteger(b.ayah) &&
            b.ayah >= 1
        )
      : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(list: Bookmark[]) {
  writeBookmarks(list, Date.now());
  changed();
}

/** Stores a list with the time it changed (the sync's copy from another device). */
export function writeBookmarks(list: Bookmark[], at: number) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    localStorage.setItem(BOOKMARKS_AT_KEY, String(at));
    localStorage.removeItem(OLD_BOOKMARK_KEY);
  } catch {
    /* storage unavailable */
  }
}

/** When the bookmark list last changed here: saved since 2026-11-22, else its newest bookmark. */
export function loadBookmarksAt(): number {
  try {
    const at = Number(localStorage.getItem(BOOKMARKS_AT_KEY));
    if (at > 0) return at;
  } catch {
    /* storage unavailable */
  }
  return loadBookmarks().reduce((m, b) => Math.max(m, Number(b.at) || 0), 0);
}

/** Removes the last read and the bookmarks from this browser (sign-out: "remove from this device"). */
export function clearReading() {
  try {
    for (const k of [KEY, BOOKMARKS_KEY, BOOKMARKS_AT_KEY, OLD_BOOKMARK_KEY]) localStorage.removeItem(k);
    window.dispatchEvent(new Event(READING_SYNCED_EVENT));
  } catch {
    /* storage unavailable */
  }
}
