/*
 * How the feedback lantern swings once it is let go (owner, 2026-11-17, with
 * a screen recording of a charm on a string): from the side it drops down and
 * swings across to the left of the search button, back to the right, left
 * again — each swing a little smaller — and keeps a gentle sway until it is
 * tucked away. Pure maths, tested without a browser (tests/feedback).
 */

/** One swing there and back (s). */
export const SWING_PERIOD_S = 2;
/** How quickly the wide first swings die down (s). */
export const SWING_SETTLE_S = 2.2;
/** The sway it settles into and keeps (radians). */
export const SWING_SWAY_RAD = 0.12;

/**
 * The lantern's angle (radians from straight down below the anchor, + =
 * right) `t` seconds after it was let go from angle `from`.
 */
export function swingAngle(t: number, from: number) {
  const side = from < 0 ? -1 : 1;
  const amp = SWING_SWAY_RAD + (Math.abs(from) - SWING_SWAY_RAD) * Math.exp(-t / SWING_SETTLE_S);
  return side * Math.max(0, amp) * Math.cos((2 * Math.PI * t) / SWING_PERIOD_S);
}

/** Most the thread bows behind a moving lantern (px), and how much per rad/s of swing speed. */
export const THREAD_LAG_MAX_PX = 9;
const THREAD_LAG_PX = 7;

/**
 * The thread from the anchor (ax, ay) to the lantern's hook (hx, hy).
 * `curl` (0 – 1): tucked aside it is 1 — the thread leaves the anchor heading
 * down and meets the hook from above, one soft S; let go it eases to 0, a
 * straight line from the button to the lantern. `speed` (rad/s, + = moving
 * right): a moving lantern pulls its thread, so the middle trails behind it
 * in a light bow that turns as the swing turns.
 */
export function threadPath(ax: number, ay: number, hx: number, hy: number, curl = 1, speed = 0) {
  const dx = hx - ax;
  const dy = hy - ay;
  const len = Math.hypot(dx, dy) || 1;
  const drop = Math.max(1, dy);
  const lag = Math.max(-THREAD_LAG_MAX_PX, Math.min(THREAD_LAG_MAX_PX, -speed * THREAD_LAG_PX));
  // Normal to the thread pointing to its right-hand side on screen.
  const nx = dy / len;
  const ny = -dx / len;
  const point = (k: number, cx: number, cy: number) => {
    const sx = ax + dx * k;
    const sy = ay + dy * k;
    return [sx + (cx - sx) * curl + nx * lag, sy + (cy - sy) * curl + ny * lag] as const;
  };
  const [c1x, c1y] = point(1 / 3, ax, ay + drop * 0.5);
  const [c2x, c2y] = point(2 / 3, hx, hy - drop * 0.55);
  const f = (v: number) => v.toFixed(1);
  return `M ${f(ax)} ${f(ay)} C ${f(c1x)} ${f(c1y)}, ${f(c2x)} ${f(c2y)}, ${f(hx)} ${f(hy)}`;
}
