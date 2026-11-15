/**
 * Record: the player's own <audio> elements (recitation A/B, prelude, meaning
 * — AudioPlayerContext renders them into the page) routed through Web Audio,
 * so the recording hears exactly what the listener hears.
 *
 * - createMediaElementSource is once per element and for good: after the
 *   first recording the elements keep playing through this graph (to the
 *   speakers as before) until the page is reloaded.
 * - Web Audio only hears CORS-loaded media (silence otherwise), so each
 *   element is switched to crossOrigin="anonymous" and every src it is given
 *   from then on goes through corsUrl(). getAttribute("src") / .src still
 *   answer the URL the player set, which its own checks compare against.
 */

import { corsUrl } from "./corsMedia";

type Tap = {
  ctx: AudioContext;
  /** What the recorder takes: everything the elements play. */
  dest: MediaStreamAudioDestinationNode;
  els: Set<HTMLMediaElement>;
};

let tap: Tap | null = null;
const original = new WeakMap<HTMLMediaElement, string>();
const srcDesc = typeof HTMLMediaElement !== "undefined" ? Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src") : undefined;

/** Loads `url` CORS-clean and remembers what the player asked for. */
function assign(el: HTMLMediaElement, url: string) {
  const real = corsUrl(url);
  if (real !== url) original.set(el, url);
  else original.delete(el);
  if (el.crossOrigin !== "anonymous") el.crossOrigin = "anonymous";
  srcDesc?.set?.call(el, real);
}

function patch(el: HTMLMediaElement) {
  const getAttr = el.getAttribute.bind(el);
  const setAttr = el.setAttribute.bind(el);
  const removeAttr = el.removeAttribute.bind(el);
  Object.defineProperty(el, "src", {
    configurable: true,
    get: () => original.get(el) ?? srcDesc?.get?.call(el),
    set: (v: string) => assign(el, String(v)),
  });
  el.getAttribute = (name: string) => (name === "src" && original.has(el) ? original.get(el)! : getAttr(name));
  el.setAttribute = (name: string, value: string) => (name === "src" ? assign(el, value) : setAttr(name, value));
  el.removeAttribute = (name: string) => {
    if (name === "src") original.delete(el);
    removeAttr(name);
  };
}

/**
 * The tap, set up on first use (call inside a tap: iOS only starts an
 * AudioContext from a user gesture). Elements already holding a non-CORS
 * file are reloaded CORS-clean (paused, from the start — the recorder seeks
 * to the first ayah right after).
 */
export function ensureAudioTap(): Tap {
  if (!tap) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    tap = { ctx, dest: ctx.createMediaStreamDestination(), els: new Set() };
    // A call or Siri interrupts the context: back on once the page is in use.
    const wake = () => {
      if (tap && tap.ctx.state !== "running" && tap.ctx.state !== "closed") void tap.ctx.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", wake);
    document.addEventListener("pointerdown", wake, true);
  }
  const { ctx, dest, els } = tap;
  void ctx.resume().catch(() => {});
  document.querySelectorAll("audio").forEach((el) => {
    if (els.has(el)) return;
    els.add(el);
    const had = el.getAttribute("src");
    patch(el);
    if (had && !had.startsWith("data:") && (el.crossOrigin !== "anonymous" || corsUrl(had) !== had)) {
      el.pause();
      assign(el, had);
    } else if (el.crossOrigin !== "anonymous") {
      el.crossOrigin = "anonymous";
    }
    const node = ctx.createMediaElementSource(el);
    node.connect(ctx.destination);
    node.connect(dest);
  });
  return tap;
}
