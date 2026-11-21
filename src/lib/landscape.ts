/**
 * "Phone landscape" layout: the short side-rail player, centred ayah, auto-
 * hiding chrome. Used by the `phoneland:` Tailwind variant (tailwind.config.ts)
 * and by every JS check (`landscapeQuery()`), so they always agree.
 *
 * Who gets it, when turned sideways:
 *  - a phone (short and wide: height ≤ 500px);
 *  - a tablet (iPad 1180×820, iPad Pro 1366×1024, Android tablets), width
 *    ≤ 1400px. A tablet is known two ways: touch is the main pointer, or the
 *    device says it is one — the `huda-tablet` class that TABLET_INIT_SCRIPT
 *    puts on <html> before paint (iPadOS Safari calls itself a Mac but has
 *    touch points; Safari's Responsive Design Mode "iPad" sizes send an iPad
 *    user agent but keep the Mac's mouse pointer).
 *  A desktop or laptop with a mouse keeps the desktop layout.
 *
 * Keep the splash rule in globals.css (`.huda-splash-row`) in sync.
 */
const PHONE = "(orientation: landscape) and (max-height: 500px)";
export const TABLET_LANDSCAPE = "(orientation: landscape) and (max-width: 1400px)";
export const PHONE_LANDSCAPE = `${PHONE}, (orientation: landscape) and (pointer: coarse) and (max-width: 1400px)`;
export const TABLET_CLASS = "huda-tablet";

/** Inline <head> script: marks a tablet device with the `huda-tablet` class. */
export const TABLET_INIT_SCRIPT = `(function(){try{var u=navigator.userAgent||"";if(/iPad|Tablet|PlayBook|Silk/.test(u)||(/Android/.test(u)&&!/Mobile/.test(u))||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1))document.documentElement.classList.add("${TABLET_CLASS}")}catch(e){}})();`;

/** The media query for this device (a tablet: any landscape up to 1400px wide). */
export function landscapeQuery(): string {
  if (typeof document !== "undefined" && document.documentElement.classList.contains(TABLET_CLASS))
    return `${PHONE_LANDSCAPE}, ${TABLET_LANDSCAPE}`;
  return PHONE_LANDSCAPE;
}
