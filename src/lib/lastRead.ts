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
  try {
    localStorage.setItem(KEY, JSON.stringify({ surah, ayah, at: Date.now() }));
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
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list));
    localStorage.removeItem(OLD_BOOKMARK_KEY);
  } catch {
    /* storage unavailable */
  }
}
