/**
 * "Phone landscape" layout: the short side-rail player, centred ayah, auto-
 * hiding chrome. Used by the `phoneland:` Tailwind variant (tailwind.config.ts)
 * and by every JS check (`landscapeQuery()`), so they always agree.
 *
 * Who gets it: a phone turned sideways (short and wide: height ≤ 500px).
 * A tablet sideways (iPad 1180×820 …) keeps the desktop layout — player at
 * the bottom, ⤢ in the header to hide everything (owner, 2026-11-22: the
 * side rail looked odd on a big screen). The splash keeps its side-by-side
 * row on tablets too (globals.css `.huda-splash-row`).
 */
const PHONE = "(orientation: landscape) and (max-height: 500px)";
export const PHONE_LANDSCAPE = PHONE;

/** The media query for the phone-landscape layout (kept a function: every
 *  JS check goes through it, so they agree with the `phoneland:` variant). */
export function landscapeQuery(): string {
  return PHONE_LANDSCAPE;
}
