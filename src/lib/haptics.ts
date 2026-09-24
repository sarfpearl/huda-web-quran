/**
 * Light haptic tick for player controls.
 *
 * - Android / Chrome: navigator.vibrate.
 * - iOS Safari (18+): no vibrate API, but toggling a native `<input switch>`
 *   via its label plays the system haptic — we keep one hidden and click it.
 * - Desktop: no-op.
 *
 * Call from inside a user-gesture handler (click / input) so iOS honours it.
 */
let iosSwitchLabel: HTMLLabelElement | null = null;

function getIosSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (iosSwitchLabel?.isConnected) return iosSwitchLabel;
  const label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-9999px;";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  iosSwitchLabel = label;
  return label;
}

export function haptic(durationMs = 10) {
  if (typeof navigator === "undefined") return;
  try {
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate(durationMs);
      return;
    }
  } catch {
    /* fall through */
  }
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) getIosSwitch()?.click();
}
