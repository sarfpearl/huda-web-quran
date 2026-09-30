// Teleprompter-style scrolling for the recited text: a pane drifts towards a
// target on a soft spring instead of stepping or snapping, and a new target
// mid-way just bends the motion. Used by the reader and the verse view.

type Follow = { target: () => number; pos: number; set: number; v: number; last: number; raf: number };
const follows = new WeakMap<HTMLElement, Follow>();

/** Stops any follow running on `el` (e.g. the viewer scrolled by hand). */
export function stopFollow(el: HTMLElement) {
  const f = follows.get(el);
  if (f) cancelAnimationFrame(f.raf);
  follows.delete(el);
}

/**
 * Glides `el` towards the scrollTop that `target` returns. `target` is called
 * every frame, so it can re-measure a word as the layout shifts.
 */
export function followScroll(el: HTMLElement, target: () => number) {
  const running = follows.get(el);
  if (running) {
    running.target = target;
    return;
  }
  const max = () => el.scrollHeight - el.clientHeight;
  const clamp = (y: number) => Math.max(0, Math.min(max(), y));
  // A hidden tab runs no frames; far off (a seek, a new Surah): jump there.
  if (document.hidden || Math.abs(clamp(target()) - el.scrollTop) > el.clientHeight) {
    el.scrollTop = clamp(target());
    if (document.hidden) return;
  }
  const f: Follow = { target, pos: el.scrollTop, set: el.scrollTop, v: 0, last: performance.now(), raf: 0 };
  const step = (now: number) => {
    if (follows.get(el) !== f) return;
    const dt = Math.min(0.05, (now - f.last) / 1000);
    f.last = now;
    // Something else moved the view (a page's glyphs loading): move with it.
    if (Math.abs(el.scrollTop - f.set) > 2) f.pos += el.scrollTop - f.set;
    const d = clamp(f.target()) - f.pos;
    // Critically damped spring: keeps ~0.2s behind the target, settles in
    // ~0.8s and never overshoots — the next line rises with the highlight.
    const w = 5.5;
    f.v += (w * w * d - 2 * w * f.v) * dt;
    // A longer glide (back to the recitation) keeps a reading pace — about a
    // screen a second — instead of rushing past the text.
    const vMax = Math.max(400, el.clientHeight);
    f.v = Math.max(-vMax, Math.min(vMax, f.v));
    f.pos = clamp(f.pos + f.v * dt);
    // The fractional position is kept here: Safari rounds scrollTop, and a
    // slow drift built from rounded steps would stall.
    el.scrollTop = f.pos;
    f.set = el.scrollTop;
    if (Math.abs(d) < 0.5 && Math.abs(f.v) < 2) {
      follows.delete(el);
      return;
    }
    f.raf = requestAnimationFrame(step);
  };
  follows.set(el, f);
  f.raf = requestAnimationFrame(step);
}

/**
 * How far (0–1) `word` sits along its line, right to left, against the words
 * sharing that line (lines are centred, so not the column's edges) — times
 * the line height, so the next line starts rising as this one is recited.
 */
export function alongLine(word: HTMLElement, words: Iterable<HTMLElement>) {
  const lineH = parseFloat(getComputedStyle(word).lineHeight) || word.getBoundingClientRect().height;
  const wr = word.getBoundingClientRect();
  let left = wr.left;
  let right = wr.right;
  for (const w of words) {
    const r = w.getBoundingClientRect();
    if (Math.abs(r.top - wr.top) > 4) continue;
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
  }
  if (right - left <= 1) return 0;
  return Math.min(1, Math.max(0, (right - wr.right) / (right - left))) * lineH;
}
