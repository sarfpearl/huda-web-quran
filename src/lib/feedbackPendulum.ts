/*
 * The feedback lantern's swing: a real pendulum, the way a charm on a string
 * behaves (owner, 2026-11-17, after the Hangly demo): weight pulls it back
 * towards straight down, it keeps its momentum, air slows it a little, and a
 * faint breeze keeps a small sway going so it never quite stops while out.
 * Let go, it also jumps on its springy thread (drop).
 * Pure maths, tested without a browser (tests/feedback).
 */

/** One swing there and back, in seconds (sets the pull of gravity). */
export const SWING_PERIOD_S = 2.0;
const OMEGA2 = ((2 * Math.PI) / SWING_PERIOD_S) ** 2;
/** Air: the share of speed lost each second — a wide swing dies down over about three swings, as in the reel. */
export const SWING_DAMPING = 0.7;
/** While out it never sways less than this (radians) — the breeze tops it up. */
export const MIN_SWAY_RAD = 0.06;
/** Fastest it may be flung from a drag (rad/s), and the highest it may swing (radians). */
export const MAX_SPEED = 7;
export const MAX_ANGLE = 1.4;

/**
 * The jump: the thread stretches a little like a spring, so a lantern let go
 * drops, bounces up and down a few times on it and settles (px, px/s).
 * One bounce lasts BOUNCE_PERIOD_S; BOUNCE_DAMPING sets how soon it settles.
 */
export const BOUNCE_PERIOD_S = 0.5;
const BOUNCE_K = ((2 * Math.PI) / BOUNCE_PERIOD_S) ** 2;
export const BOUNCE_DAMPING = 5;
/** Downward speed (px/s) given on a let-go; the most it may stretch (px). */
export const DROP_SPEED = 260;
export const MAX_STRETCH = 22;

/** theta / omega: angle and speed of the swing; stretch / stretchV: the thread's give. */
export type Swing = { theta: number; omega: number; stretch?: number; stretchV?: number };

/** Energy of a swing, as the height (1 − cos) it would reach at rest: compare with a sway's. */
const energy = (s: Swing) => (s.omega * s.omega) / (2 * OMEGA2) + (1 - Math.cos(s.theta));
const swayEnergy = (a: number) => 1 - Math.cos(a);

/**
 * Advances the swing by dt seconds (small steps inside). `breeze`: keep at
 * least MIN_SWAY_RAD going (while out); off, it slowly comes to rest.
 */
export function stepSwing(s: Swing, dt: number, breeze = true): Swing {
  let { theta } = s;
  let omega = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, s.omega));
  let stretch = s.stretch ?? 0;
  let stretchV = s.stretchV ?? 0;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    omega += (-OMEGA2 * Math.sin(theta) - SWING_DAMPING * omega) * h;
    if (breeze && energy({ theta, omega }) < swayEnergy(MIN_SWAY_RAD)) {
      // A gentle push along the way it is already going (from rest: to the left).
      omega += (omega === 0 ? -1 : Math.sign(omega)) * 0.9 * h;
    }
    theta += omega * h;
    stretchV += (-BOUNCE_K * stretch - BOUNCE_DAMPING * stretchV) * h;
    stretch = Math.max(-MAX_STRETCH * 0.7, Math.min(MAX_STRETCH, stretch + stretchV * h));
    // Flung up past the side: a string goes slack there, so it drops back.
    if (Math.abs(theta) > MAX_ANGLE) {
      theta = Math.sign(theta) * MAX_ANGLE;
      omega = -omega * 0.3;
    }
  }
  return { theta, omega: Math.max(-MAX_SPEED, Math.min(MAX_SPEED, omega)), stretch, stretchV };
}

/**
 * The thread's pull for this swing (1 = hanging still): weight along the
 * thread plus what keeps the lantern on its circle. Low at the ends of a wide
 * swing, high through the bottom; a jump upwards on the thread's give takes
 * the weight off it.
 */
export function swingTension(s: Swing) {
  const pull = Math.cos(s.theta) + (s.omega * s.omega) / OMEGA2;
  const rising = Math.max(0, -(s.stretchV ?? 0)) / DROP_SPEED;
  return Math.max(0, pull - 1.2 * rising - ((s.stretch ?? 0) < -1 ? 0.5 : 0));
}

/** Let go: the thread gives and the lantern jumps on it. */
export const drop = (s: Swing, speed = DROP_SPEED): Swing => ({ ...s, stretchV: (s.stretchV ?? 0) + speed });

/** Angle (radians from straight down, + = right) of a point (x, y) seen from the anchor. */
export const angleTo = (ax: number, ay: number, x: number, y: number) => Math.atan2(x - ax, Math.max(1, y - ay));
