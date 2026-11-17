/*
 * The feedback lantern's thread as a soft rope (Verlet): a row of points
 * joined by links of a fixed length, the first pinned to the anchor (the
 * search button), the last to the lantern's hook. Moving the hook makes the
 * rope lag and sag; left alone it hangs straight. Pure maths,
 * so it can be tested without a browser (tests/feedback).
 */

export const ROPE_POINTS = 10;
/*
 * How a thread under a swinging weight behaves (owner's reference reel,
 * 2026-11-17): its pull (tension, 1 = hanging still) is high as the weight
 * sweeps through the bottom and low at the ends of a swing, where it is up
 * high and stops for a moment. Taut, the thread is straight; slack, it sags
 * into one soft curve. `looseness` (0 taut – 1 slack) comes from that pull.
 */
/** Tension at or below which the thread is fully slack, and above which it is taut. */
const SLACK_BELOW = 0.82;
const TAUT_ABOVE = 1.0;
export const ropeLooseness = (tension: number) =>
  Math.max(0, Math.min(1, (TAUT_ABOVE - tension) / (TAUT_ABOVE - SLACK_BELOW)));
/** Rope length over the straight distance: exact when taut, a little longer slack, so it can sag. */
export const ROPE_SLACK = 1.08;
export const ropeLength = (len: number, loose: number) => len * (1 + (ROPE_SLACK - 1) * loose);
/**
 * Pull towards the straight line (each second, the fraction of the way): the
 * weight holding the thread straight. Strong when taut, faint when slack.
 */
export const ROPE_PULL_TAUT = 9;
export const ROPE_PULL_SLACK = 0.4;
export const ropePull = (loose: number) => ROPE_PULL_TAUT + (ROPE_PULL_SLACK - ROPE_PULL_TAUT) * loose;
/** The thread's own weight (px/s²) and damping per frame: soft and smooth, one curve, no ripples. */
export const ROPE_GRAVITY = 600;
export const ROPE_DAMPING = 0.95;
/** Link passes per step: fewer = stretchier, more = stiffer. */
const ITERATIONS = 18;

/** x, y and last step's x, y for each point. */
export type Rope = Float64Array;
export const createRope = (n = ROPE_POINTS): Rope => new Float64Array(n * 4);
const count = (p: Rope) => p.length / 4;

/** Lays the rope straight from (ax, ay) to (hx, hy), at rest. */
export function layStraight(p: Rope, ax: number, ay: number, hx: number, hy: number) {
  const n = count(p);
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1);
    p[i * 4] = p[i * 4 + 2] = ax + (hx - ax) * k;
    p[i * 4 + 1] = p[i * 4 + 3] = ay + (hy - ay) * k;
  }
}

/**
 * One step of dt seconds with the ends pinned at (ax, ay) and (hx, hy); each
 * link `link` px long, drawn towards straight by `pull` (ropePull). Returns the largest movement of a free point (px), so
 * the caller can stop once it is still.
 */
export function stepRope(
  p: Rope,
  ax: number,
  ay: number,
  hx: number,
  hy: number,
  link: number,
  dt: number,
  pull = ROPE_PULL_TAUT,
) {
  const n = count(p);
  let moved = 0;
  for (let i = 1; i < n - 1; i++) {
    const o = i * 4;
    const vx = (p[o] - p[o + 2]) * ROPE_DAMPING;
    const vy = (p[o + 1] - p[o + 3]) * ROPE_DAMPING;
    p[o + 2] = p[o];
    p[o + 3] = p[o + 1];
    p[o] += vx;
    p[o + 1] += vy + ROPE_GRAVITY * dt * dt;
    moved = Math.max(moved, Math.abs(vx) + Math.abs(vy));
  }
  p[0] = p[2] = ax;
  p[1] = p[3] = ay;
  const e = (n - 1) * 4;
  p[e] = p[e + 2] = hx;
  p[e + 1] = p[e + 3] = hy;
  const k = Math.min(1, pull * dt);
  for (let i = 1; i < n - 1; i++) {
    const o = i * 4;
    const f = i / (n - 1);
    p[o] += (ax + (hx - ax) * f - p[o]) * k;
    p[o + 1] += (ay + (hy - ay) * f - p[o + 1]) * k;
  }
  for (let it = 0; it < ITERATIONS; it++) {
    for (let i = 0; i < n - 1; i++) {
      const o = i * 4;
      const q = o + 4;
      const dx = p[q] - p[o];
      const dy = p[q + 1] - p[o + 1];
      const d = Math.hypot(dx, dy) || 1;
      const diff = (d - link) / d;
      // Pinned ends don't move; a free point takes its share.
      const wa = i === 0 ? 0 : i + 1 === n - 1 ? 1 : 0.5;
      const wb = i + 1 === n - 1 ? 0 : i === 0 ? 1 : 0.5;
      p[o] += dx * diff * wa;
      p[o + 1] += dy * diff * wa;
      p[q] -= dx * diff * wb;
      p[q + 1] -= dy * diff * wb;
    }
  }
  return moved;
}

/** SVG path: a smooth curve through the points. */
export function ropePath(p: Rope) {
  const n = count(p);
  let d = `M ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  for (let i = 1; i < n - 1; i++) {
    const o = i * 4;
    d += ` Q ${p[o].toFixed(1)} ${p[o + 1].toFixed(1)} ${((p[o] + p[o + 4]) / 2).toFixed(1)} ${((p[o + 1] + p[o + 5]) / 2).toFixed(1)}`;
  }
  const e = (n - 1) * 4;
  return `${d} L ${p[e].toFixed(1)} ${p[e + 1].toFixed(1)}`;
}

/**
 * How the lantern hangs (radians from straight down, + = right): along the
 * line from the anchor, swung a little further by the rope's last link, at
 * most MAX_WOBBLE either way. `wobble` (0–1): how much of that to show —
 * none when still, so a resting lantern hangs in line with its thread.
 */
const MAX_WOBBLE = 0.35;
export function endTilt(p: Rope, wobble = 1) {
  const e = p.length - 4;
  const chord = Math.atan2(p[e] - p[0], p[e + 1] - p[1]);
  const last = Math.atan2(p[e] - p[e - 4], p[e + 1] - p[e - 3]);
  return chord + wobble * Math.max(-MAX_WOBBLE, Math.min(MAX_WOBBLE, 0.9 * (last - chord)));
}

/** How far the rope bows away from the straight line between its ends (px, largest). */
export function ropeBend(p: Rope) {
  const e = p.length - 4;
  const dx = p[e] - p[0];
  const dy = p[e + 1] - p[1];
  const L = Math.hypot(dx, dy) || 1;
  let max = 0;
  for (let o = 4; o < e; o += 4) max = Math.max(max, Math.abs((dx * (p[1] - p[o + 1]) - (p[0] - p[o]) * dy) / L));
  return max;
}
