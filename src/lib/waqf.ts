/**
 * IndoPak waqf signs (ۙ ؕ ۚ ۠ …) come after the word over a space, which the
 * IndoPak font shapes to no width: the sign hangs past the word's box into
 * the gap. The gap after it looked narrower than the others, and WebKit,
 * repainting only the box when the highlight moved on, clipped the sign.
 * The word's box is padded out over the sign's ink, so it holds all of it
 * and the gap after it is the same as after any word. (The sign stays in the
 * word's text run: shaped on its own, WebKit drew it over the next word.)
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
const TRAILING = / [^\u0621-\u064A]+$/u;

/** Padding over a word's trailing waqf sign (its widest mark + a hair), or undefined. */
export function waqfPad(word: string): React.CSSProperties | undefined {
  const m = TRAILING.exec(word);
  if (!m) return undefined;
  let em = 0;
  for (const ch of m[0]) em = Math.max(em, MARK_EM[ch] ?? 0);
  return em > 0 ? { paddingInlineEnd: `${(em + 0.02).toFixed(2)}em` } : undefined;
}
