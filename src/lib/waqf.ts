/**
 * IndoPak waqf signs (ۙ ؕ ۚ ۠ …) come after the word over a space, which the
 * IndoPak font shapes to no width: the sign hangs past the word's box into
 * the gap. The gap after it looked narrower than the others, and WebKit,
 * repainting only the box when the highlight moved on, clipped the sign.
 * Each sign cluster gets its own box as wide as its ink, so the word's box
 * holds all of it and every word gap is the same.
 */

/** How far each mark's ink reaches past the end of the word, in em (IndoPak font, measured). */
const MARK_EM: Record<string, number> = {
  "ؔ": 0.33, "ؕ": 0.29, "ؗ": 0.25, "ٚ": 0.42,
  "ۖ": 0.37, "ۗ": 0.26, "ۘ": 0.32, "ۙ": 0.29,
  "ۚ": 0.26, "ۛ": 0.27, "۠": 0.42, "ۥ": 0.4,
  "ۦ": 0.25, "۪": 0.37, "۫": 0.35, "۬": 0.24,
  "": 0.12, "": 0.42, "": 0.42, "": 0.05,
  "": 0.43, "": 0.26,
};

/** A word's trailing sign cluster (space + marks only, no letters). */
const TRAILING = /^(.*?)( [^ء-ي]+)$/u;

/**
 * Splits a word into its text and trailing sign cluster with the cluster's
 * ink width (em; stacked marks overlap, so the widest one), or null.
 */
export function splitWaqf(word: string): [string, string, number] | null {
  const m = TRAILING.exec(word);
  if (!m) return null;
  let em = 0;
  for (const ch of m[2]) em = Math.max(em, MARK_EM[ch] ?? 0);
  return [m[1], m[2], em];
}
