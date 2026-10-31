/**
 * On-phone audio log, for checks only a real iPhone can do (a call ending,
 * another app's sound). Open any page with `?debug=audio` — it stays on for
 * the tab until `?debug=off` — and a panel lists what the player saw: the
 * audio session's state, pauses, resumes and the play() calls iOS refused.
 * "Copy" puts the whole log on the clipboard to send back. Off by default;
 * nothing is stored or sent anywhere.
 */
const KEY = "huda:debug-audio";
const MAX = 300;

type Line = { t: string; msg: string };
const lines: Line[] = [];
const listeners = new Set<() => void>();
let on: boolean | null = null;

export function audioDebugOn(): boolean {
  if (on !== null) return on;
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("debug");
    if (q === "audio") sessionStorage.setItem(KEY, "1");
    else if (q === "off") sessionStorage.removeItem(KEY);
    on = sessionStorage.getItem(KEY) === "1";
  } catch {
    on = false;
  }
  return on;
}

export function alog(msg: string) {
  if (!audioDebugOn()) return;
  const d = new Date();
  const t = `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, "0")}`;
  lines.push({ t, msg });
  if (lines.length > MAX) lines.shift();
  listeners.forEach((fn) => fn());
}

export function audioDebugLines(): readonly Line[] {
  return lines;
}

export function clearAudioDebug() {
  lines.length = 0;
  listeners.forEach((fn) => fn());
}

export function onAudioDebug(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

// The element's state in a few words: which one, paused, time, src's file.
export function elInfo(name: string, el: HTMLAudioElement | null | undefined) {
  if (!el) return `${name}=none`;
  const src = (el.getAttribute("src") || "").split("/").pop()?.split("?")[0] || "-";
  return `${name}{${el.paused ? "paused" : "playing"} t=${el.currentTime.toFixed(1)} rs=${el.readyState} ${src}}`;
}
