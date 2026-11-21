/**
 * "Phone landscape" layout: the short side-rail player, centred ayah, auto-
 * hiding chrome. Used by the `phoneland:` Tailwind variant (tailwind.config.ts)
 * and by every `matchMedia` check, so they always agree.
 *
 * Two cases:
 *  - a phone turned sideways (short and wide: height ≤ 500px);
 *  - a tablet turned sideways (iPad 1180×820, iPad Pro 1366×1024, Android
 *    tablets): touch is the main pointer and the screen is no wider than
 *    1400px. A desktop or laptop with a mouse/trackpad reports
 *    `pointer: fine`, so it keeps the desktop layout.
 *
 * Keep the splash rule in globals.css (`.huda-splash-row`) in sync.
 */
export const PHONE_LANDSCAPE =
  "(orientation: landscape) and (max-height: 500px), (orientation: landscape) and (pointer: coarse) and (max-width: 1400px)";
