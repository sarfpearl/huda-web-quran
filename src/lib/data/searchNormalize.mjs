/*
 * Search-text normalizers, shared by the index builder
 * (scripts/generation/build-search-index.mjs) and the runtime search engine
 * (src/lib/data/verseSearch.ts) so the index and the query are folded the same
 * way. Plain ESM with no imports — usable from Node and the browser bundle.
 */

/** Latin: lowercase, drop accents, keep letters/digits/space, collapse runs. */
export function normLatin(t) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Arabic: strip harakāt / Quranic marks / tatweel, unify alif, ى→ي. */
export function normArabic(t) {
  return (t || "")
    .normalize("NFC")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Indic / Tamil / other scripts: keep the letters, drop punctuation and the
 * Arabic-style marks, collapse spacing. Lowercasing is a no-op for these but
 * harmless for any Latin mixed in.
 */
export function normIndic(t) {
  return (t || "")
    .toLowerCase()
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[.,;:!?()[\]{}"'“”‘’\-—–/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Latin tokens (length ≥ 2) of a normalized Latin string. */
export function latinTokens(norm) {
  return norm.split(" ").filter((w) => w.length >= 2);
}
