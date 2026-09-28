import { isWebKit } from "@/lib/data/quranGlyphs";

/**
 * iOS Safari: glass panels (backdrop-filter — the header pills, the player
 * frame and card) can keep a backdrop captured before the scene painted and
 * show as dark, flat panels until something repaints them (a screenshot, or
 * opening the Tajweed popover). Toggling the panels' own filter does not
 * help; adding a new backdrop-filter element to the scene does — WebKit then
 * recaptures every backdrop in it. So a 1px, near-invisible probe is added
 * for two frames. Called as the scene (image / video) settles. No-op outside
 * WebKit.
 */
export function refreshBackdrops() {
  if (typeof document === "undefined" || !isWebKit()) return;
  const scene = document.querySelector<HTMLElement>("[data-scene-header]")?.parentElement ?? document.body;
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:absolute;left:0;top:0;width:1px;height:1px;pointer-events:none;opacity:0.01;" +
    "-webkit-backdrop-filter:blur(1px);backdrop-filter:blur(1px)";
  scene.appendChild(probe);
  requestAnimationFrame(() => requestAnimationFrame(() => probe.remove()));
}
