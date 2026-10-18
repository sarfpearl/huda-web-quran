/*
 * Offline Quran verse search for the content browser's Verse tab. No AI: a
 * verse-reference parser plus a typo-forgiving keyword search over the prebuilt
 * index (public/data/search-index.json, built by
 * scripts/generation/build-search-index.mjs). The query is folded by the same
 * normalizers as the index (searchNormalize.mjs) so spelling and diacritics
 * don't matter.
 */
import { QURAN_SURAHS } from "@/lib/data/service";
import { normLatin, normArabic, normIndic } from "./searchNormalize.mjs";

/** [key "2:255", display Arabic, normalized search blob]. */
type IndexEntry = [string, string, string];

export interface VerseHit {
  surah: number;
  ayah: number;
  key: string;
  /** Original Arabic text, for the result row. */
  arabic: string;
}

const versesOf = (surah: number) => QURAN_SURAHS[surah - 1]?.verses ?? 0;

// ---- Index loading (fetched once, memoized) --------------------------------

let indexPromise: Promise<IndexEntry[]> | null = null;

export function loadSearchIndex(): Promise<IndexEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch("/data/search-index.json")
      .then((r) => (r.ok ? (r.json() as Promise<IndexEntry[]>) : Promise.reject(new Error("index"))))
      .catch((e) => {
        indexPromise = null; // let a later search retry
        throw e;
      });
  }
  return indexPromise;
}

// ---- Verse-reference parsing ------------------------------------------------

/**
 * "2:255", "2 255", "quran 2:255", "surah 2 verse 255" (and the Tamil/Arabic
 * words for Surah/Ayah) → {surah, ayah}, validated against the Surah's length.
 */
export function parseVerseRef(query: string): { surah: number; ayah: number } | null {
  const q = query.trim();
  // Strip leading words like quran / surah / سورة / சூரா and verse / ayah / آية / ஆயத்.
  const nums = q.match(/\d+/g);
  if (!nums || nums.length < 2) {
    // "2:255" without spaces still matched above; a bare "2" is not a ref.
    return null;
  }
  // Only treat as a reference when the text is essentially "<words> N <sep> N".
  if (!/^[^\d]*\d+\s*[:：.\s]\s*\d+\s*$/.test(q) && !/verse|ayah|ayat|surah|sura|quran|سورة|اية|آية|சூரா|ஆயத்|வசனம்/i.test(q)) {
    return null;
  }
  const surah = Number(nums[0]);
  const ayah = Number(nums[1]);
  if (surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= versesOf(surah)) {
    return { surah, ayah };
  }
  return null;
}

// ---- Fuzzy keyword search ---------------------------------------------------

/** Levenshtein distance, capped: returns > max as soon as it's exceeded. */
function editDistance(a: string, b: string, max: number): number {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  let prev = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[lb];
}

/** How far a token may be off and still match (short words stay strict). */
const slack = (len: number) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

/** A query token matches a verse's token set exactly, by prefix, or fuzzily. */
function tokenMatches(qt: string, tokens: string[]): "exact" | "fuzzy" | null {
  for (const t of tokens) if (t === qt) return "exact";
  const max = slack(qt.length);
  for (const t of tokens) {
    // Substring/prefix for longer query words (e.g. "forgive" in "forgiveness").
    if (qt.length >= 4 && (t.startsWith(qt) || t.includes(qt))) return "exact";
    if (max > 0 && editDistance(qt, t, max) <= max) return "fuzzy";
  }
  return null;
}

/** Normalize a query word for the script it's written in. */
function normQueryWord(w: string): string {
  if (/[؀-ۿ]/.test(w)) return normArabic(w);
  if (/[^\u0000-ɏ]/.test(w)) return normIndic(w); // Tamil/Indic/other
  return normLatin(w);
}

const toHit = (e: IndexEntry): VerseHit => {
  const [surah, ayah] = e[0].split(":").map(Number);
  return { surah, ayah, key: e[0], arabic: e[1] };
};

export interface SearchOpts {
  limit?: number;
  /** OR semantics: a verse matching ANY term counts (for topic chips). */
  anyTerm?: boolean;
}

/**
 * Ranked verse hits. Query is split into words; by default every word must
 * match (AND); with `anyTerm`, any word matching is enough (topic chips).
 */
export function searchVerses(index: IndexEntry[], query: string, opts: SearchOpts = {}): VerseHit[] {
  const { limit = 40, anyTerm = false } = opts;
  const qWords = query
    .trim()
    .split(/\s+/)
    .map(normQueryWord)
    .filter((w) => w.length >= 2);
  if (qWords.length === 0) return [];

  const scored: { e: IndexEntry; score: number }[] = [];
  for (const e of index) {
    const tokens = e[2].split(" ");
    let exact = 0;
    let hits = 0;
    for (const qw of qWords) {
      const m = tokenMatches(qw, tokens);
      if (m) {
        hits++;
        if (m === "exact") exact++;
      }
    }
    const ok = anyTerm ? hits > 0 : hits === qWords.length;
    if (ok) scored.push({ e, score: exact * 10 + hits });
  }

  // Best matches first; ties keep Mushaf order (index is already in order).
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => toHit(s.e));
}
