import type { CSSProperties } from "react";

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

/**
 * A word with a trailing waqf sign: padding over the sign's ink (its widest
 * mark + a hair) and data-waqf (the length of the word before the sign, for
 * fitWaqfWords). Undefined for any other word.
 */
export function waqfProps(word: string): { style: CSSProperties; "data-waqf": number } | undefined {
  const m = TRAILING.exec(word);
  if (!m) return undefined;
  let em = 0;
  for (const ch of m[0]) em = Math.max(em, MARK_EM[ch] ?? 0);
  if (em <= 0) return undefined;
  return { style: { paddingInlineEnd: `${(em + 0.02).toFixed(2)}em` }, "data-waqf": m.index };
}

/**
 * WebKit gives the space before the sign its full width and lays it out on
 * the word's start (right) side, a second gap before the word (Chromium
 * shapes it to nothing). Measure the room between the box's start and the
 * word's own text, and pull the box in by it. Once per word, after the font
 * has loaded (the result is in em, so auto-fit resizing keeps it).
 */
export function fitWaqfWords(root: ParentNode | null) {
  if (!root || typeof document === "undefined" || !document.fonts) return;
  root.querySelectorAll<HTMLElement>("[data-waqf]:not([data-waqf-fit])").forEach((el) => {
    const text = el.firstChild;
    const n = Number(el.dataset.waqf);
    if (!(text instanceof Text) || !(n > 0) || n > text.length) return;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, n);
    const word = range.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    // Not with the fallback font: its space is another width.
    if (!word.width || !size || !document.fonts.check(`${size}px ${cs.fontFamily}`, text.data)) return;
    const extra = box.right - parseFloat(cs.paddingRight) - word.right;
    if (extra > 0.5) el.style.marginInlineStart = `${(-extra / size).toFixed(3)}em`;
    el.dataset.waqfFit = "";
  });
}

/** Run fitWaqfWords again once a web font finishes loading. */
export function onFontsLoaded(cb: () => void): () => void {
  if (typeof document === "undefined" || !document.fonts) return () => {};
  document.fonts.addEventListener("loadingdone", cb);
  return () => document.fonts.removeEventListener("loadingdone", cb);
}
