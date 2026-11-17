/*
 * The feedback lantern's thread: one smooth curve from the anchor (the search
 * button) to the lantern's hook (owner, 2026-11-17: no little ripples — just
 * one light bend, to the left as it swings left and to the right as it swings
 * right; straight when it hangs still). Pure maths, tested without a browser
 * (tests/feedback).
 */

/** How far the middle of the thread bows out (px) per radian the lantern is swung out. */
export const ROPE_BEND_PX = 14;
/** Most it may bow (px), and the extra bow while the thread is slack on a jump (px per px of slack). */
export const ROPE_MAX_BEND_PX = 12;
const SLACK_BEND = 0.5;

export type RopeCurve = {
  /** SVG path: anchor → hook, one quadratic curve. */
  d: string;
  /** Direction of the thread where it meets the hook (radians from straight down, + = right): the lantern hangs along it. */
  endAngle: number;
  /** How far the middle bows out from the straight line (px, + = to the right of the thread). */
  bend: number;
};

/**
 * The thread from (ax, ay) to the hook (hx, hy) for a lantern swung out by
 * `theta` (radians, + = right), with `slack` px of give (a jump up on the
 * thread). It bows out to the side the lantern is on, by an amount that grows
 * with how far it has swung.
 */
export function ropeCurve(ax: number, ay: number, hx: number, hy: number, theta: number, slack = 0): RopeCurve {
  const dx = hx - ax;
  const dy = hy - ay;
  const len = Math.hypot(dx, dy) || 1;
  const sway = ROPE_BEND_PX * Math.sin(theta);
  const loose = Math.sign(theta || 1) * SLACK_BEND * Math.max(0, slack);
  const bend = Math.max(-ROPE_MAX_BEND_PX, Math.min(ROPE_MAX_BEND_PX, sway + loose));
  // Normal to the thread pointing to its right-hand side on screen (+x when it hangs straight down).
  const nx = dy / len;
  const ny = -dx / len;
  // A quadratic's middle sits halfway to its control point, so the control point is set twice as far out.
  const cx = (ax + hx) / 2 + nx * bend * 2;
  const cy = (ay + hy) / 2 + ny * bend * 2;
  return {
    d: `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`,
    endAngle: Math.atan2(hx - cx, hy - cy),
    bend,
  };
}
