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

/**
 * The thread from the anchor (ax, ay) to the lantern's hook (hx, hy): it
 * leaves the anchor heading down and meets the hook from above, so it hangs
 * straight when the lantern is right below and takes one soft bend when it is
 * swung or tucked to a side.
 */
export function threadPath(ax: number, ay: number, hx: number, hy: number) {
  const drop = Math.max(1, hy - ay);
  return `M ${ax.toFixed(1)} ${ay.toFixed(1)} C ${ax.toFixed(1)} ${(ay + drop * 0.5).toFixed(1)}, ${hx.toFixed(1)} ${(hy - drop * 0.55).toFixed(1)}, ${hx.toFixed(1)} ${hy.toFixed(1)}`;
}
