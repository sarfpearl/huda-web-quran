"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { t, isRtl, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { FEEDBACK_PEEKED_KEY, FEEDBACK_UI_ATTR } from "@/lib/feedback";
import { haptic } from "@/lib/haptics";
import { createRope, endTilt, layStraight, ropeLength, ropePath, ropeTension, stepRope, type Rope } from "@/lib/feedbackRope";

const FeedbackSheet = dynamic(() => import("./FeedbackSheet"), { ssr: false });

/**
 * What the lantern hangs from (owner, 2026-11-17: on a thread under the
 * search button): the right-most round button of the scene header. Change
 * the anchor here; with none on screen (focus mode) the lantern hides.
 */
function findAnchor(): HTMLElement | null {
  const buttons = document.querySelectorAll<HTMLElement>("[data-scene-header] button");
  let best: HTMLElement | null = null;
  let right = -Infinity;
  for (const b of buttons) {
    const r = b.getBoundingClientRect();
    if (r.width === 0 || r.right <= right) continue;
    best = b;
    right = r.right;
  }
  return best;
}

/** Thread length, from the anchor to the lantern's hook. */
const THREAD_PX = 88;
/** Hidden: pulled aside until the lantern's body centre sits on the edge, about half showing. */
const HIDDEN_PAST_PX = 0;
/** From the hook down the thread's line to the middle of the lantern's body. */
const BODY_PX = 30;
/** Pendulum: one swing there and back (s); the even sway it settles into (rad), and how fast (s). */
const PERIOD_S = 1.9;
const SWAY_RAD = 0.2;
const SETTLE_S = 2.5;
/** Pulled back aside after the time-out, over this long. */
const RETURN_MS = 900;
/** Out and untouched this long → back into hiding (owner: 10–15 s). */
const OUT_MS = 12000;
/** First visit: how long a Surah must have been playing before the one peek. */
const PEEK_AFTER_PLAY_MS = 15000;
const TOAST_MS = 4500;
const LANTERN_W = 34;

type Geometry = { ax: number; ay: number; w: number };

/** Thread length: long enough that "pulled aside" never goes past ~50°. */
const threadLen = (g: Geometry) => Math.max(THREAD_PX, (g.w + HIDDEN_PAST_PX - g.ax) / 0.75 - BODY_PX);
/** Angle from straight down (radians, + = right) at which the lantern's body sits tucked at the edge. */
const hiddenAngle = (g: Geometry) =>
  Math.asin(Math.min(0.75, (g.w + HIDDEN_PAST_PX - g.ax) / (threadLen(g) + BODY_PX)));

/** Something modal is up (a sheet, the install guide, a picker): don't peek over it. */
const dialogOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [data-action-sheet]'));

/**
 * The feedback entry: a small lantern (fanoos) on a soft thread from the
 * search button — a pendulum whose rope bows and wriggles as it swings. At rest it is pulled aside, tucked half behind
 * the right edge. A tap lets it go: it swings across under the button to the
 * left, back to the right, and keeps swaying (never stops) with a "Feedback"
 * bubble; 12 s untouched, it is pulled aside again. A second tap opens the form. On the
 * first visit it swings out once by itself while a Surah plays. After a send
 * the form closes and a thank-you toast shows here.
 */
export function FeedbackLantern({ playing }: { playing: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const threadRef = useRef<SVGPathElement>(null);
  const lanternRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  /** The pendulum's angle now (radians from straight down, + = right). */
  const theta = useRef(Number.NaN);
  /** The rope's points (x, y and last frame's x, y) and the geometry they were laid out for. */
  const rope = useRef<{ pts: Rope; for: Geometry | null }>({ pts: createRope(), for: null });

  const comeOut = useCallback(() => {
    setOut(true);
    // Out means a tap may follow: fetch the form now so it opens at once.
    void import("./FeedbackSheet");
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setOut(false), OUT_MS);
  }, []);
  useEffect(
    () => () => {
      clearTimeout(outTimer.current);
      clearTimeout(toastTimer.current);
    },
    [],
  );

  // Shown only after the first-open steps, so it never sits over them.
  useEffect(() => {
    let live = true;
    void Promise.all([afterSplash(), afterStage("location"), afterStage("install")]).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  // Follow the anchor: the header moves with the safe area, the keyboard and
  // screen size, and hides in focus mode.
  useEffect(() => {
    if (!ready) return;
    const scene = rootRef.current?.parentElement;
    if (!scene) return;
    const measure = () => {
      const a = findAnchor();
      const s = scene.getBoundingClientRect();
      const r = a?.getBoundingClientRect();
      const shown = a && r && r.width > 0 && Number(getComputedStyle(a.closest("[data-scene-header] > *") ?? a).opacity) > 0.2;
      setGeo((g) => {
        if (!shown || !r) return null;
        const next = { ax: Math.round(r.left + r.width / 2 - s.left), ay: Math.round(r.bottom - s.top), w: Math.round(s.width) };
        return g && g.ax === next.ax && g.ay === next.ay && g.w === next.w ? g : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    const tick = setInterval(measure, 1000);
    return () => {
      ro.disconnect();
      clearInterval(tick);
    };
  }, [ready]);

  // The pendulum and its rope, drawn straight to the DOM every frame (no
  // React renders). The lantern's hook follows the pendulum; the rope between
  // the button and the hook is simulated (Verlet), so it lags, bows and
  // wriggles as the hook moves, and hangs nearly straight when still.
  useEffect(() => {
    if (!geo) return;
    const len = threadLen(geo);
    const hookAt = (a: number) => [geo.ax + len * Math.sin(a), geo.ay + len * Math.cos(a)] as const;
    const p = rope.current.pts;
    // The thread is a soft rope, not a rod (owner, 2026-11-17: it bends and
    // wriggles as it swings) — lib/feedbackRope.
    const links = p.length / 4 - 1;
    const lay = (a: number) => {
      layStraight(p, geo.ax, geo.ay, ...hookAt(a));
      rope.current.for = geo;
    };
    /** One rope step with the hook at angle a, swinging at `speed` rad/s. */
    const simulate = (a: number, dt: number, speed = 0) =>
      stepRope(p, geo.ax, geo.ay, ...hookAt(a), ropeLength(len, speed) / links, dt, ropeTension(speed));
    /** How much the rope is moving (0 still – 1 lively): the lantern's own wobble follows it. */
    let wobble = 0;
    const draw = () => {
      threadRef.current?.setAttribute("d", ropePath(p));
      const e = p.length - 4;
      const hx = p[e];
      const hy = p[e + 1];
      if (lanternRef.current) lanternRef.current.style.transform = `translate(${hx - LANTERN_W / 2}px, ${hy}px) rotate(${-endTilt(p, wobble)}rad)`;
      if (bubbleRef.current) bubbleRef.current.style.transform = `translate(${hx - LANTERN_W / 2 - 8}px, ${hy + 20}px) translateX(-100%)`;
    };

    const hidden = hiddenAngle(geo);
    if (Number.isNaN(theta.current)) theta.current = hidden;
    // Reduced motion: no swing — a straight thread, down when out, aside when not.
    if (reduce) {
      theta.current = out ? 0 : hidden;
      lay(theta.current);
      return draw();
    }
    // A new layout (first show, resize): start straight and let it settle.
    if (rope.current.for !== geo) {
      lay(theta.current);
      for (let i = 0; i < 200; i++) simulate(theta.current, 1 / 60);
    }
    // Drawn once now too: frames don't run in a background tab.
    draw();
    const from = theta.current;
    const start = performance.now();
    let last = start;
    let frame = 0;
    const step = (now: number) => {
      const s = (now - start) / 1000;
      const dt = Math.min(1 / 30, (now - last) / 1000) || 1 / 60;
      last = now;
      let still = false;
      const before = theta.current;
      if (out) {
        // Let go from where it is: a wide swing that settles into an even
        // sway, and keeps going.
        const amp = SWAY_RAD + (Math.abs(from) - SWAY_RAD) * Math.exp(-s / SETTLE_S);
        theta.current = (from < 0 ? -1 : 1) * amp * Math.cos((2 * Math.PI * s) / PERIOD_S);
      } else {
        const k = Math.min(1, (s * 1000) / RETURN_MS);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        theta.current = from + (hidden - from) * ease;
        still = k >= 1;
      }
      const moved = simulate(theta.current, dt, (theta.current - before) / dt);
      wobble = Math.min(1, moved / 0.4);
      draw();
      // Pulled aside and the rope has stopped moving: no more frames.
      if (still && moved < 0.02) return;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [geo, out, reduce]);

  // The one peek on the first visit: some way into a recitation.
  useEffect(() => {
    if (!ready || !playing) return;
    try {
      if (localStorage.getItem(FEEDBACK_PEEKED_KEY)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => {
      if (dialogOpen() || document.hidden) return;
      try {
        localStorage.setItem(FEEDBACK_PEEKED_KEY, "1");
      } catch {}
      comeOut();
    }, PEEK_AFTER_PLAY_MS);
    return () => clearTimeout(timer);
  }, [ready, playing, comeOut]);

  const openForm = () => {
    clearTimeout(outTimer.current);
    setOut(false);
    setEverOpened(true);
    setOpen(true);
  };

  const onClick = (e: React.MouseEvent) => {
    haptic();
    // Keyboard / screen reader (detail 0): straight to the form.
    if (out || e.detail === 0) openForm();
    else comeOut();
  };

  const onSent = useCallback(
    (screenshotUploaded: boolean) => {
      setOpen(false);
      setToast(
        screenshotUploaded
          ? t(lang, "Thank you! Your feedback has been sent to our team.")
          : t(lang, "Your message was sent, but the screenshot couldn't be uploaded."),
      );
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
    },
    [lang],
  );

  if (!ready) return null;
  const shown = Boolean(geo) && !open;

  return (
    <div ref={rootRef} data-feedback-lantern="" {...{ [FEEDBACK_UI_ATTR]: "" }} className="pointer-events-none absolute inset-0 z-40">
      {geo && (
        <div className="absolute inset-0 transition-opacity duration-200" style={{ opacity: shown ? 1 : 0 }}>
          <svg className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <path
              ref={threadRef}
              d={`M ${geo.ax} ${geo.ay} L ${geo.ax} ${geo.ay + THREAD_PX}`}
              fill="none"
              stroke="#e3c06d"
              strokeWidth={1}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={out ? 0.9 : 0.6}
            />
          </svg>
          {/* Upright beside the lantern while it swings; tapping it opens the form too. */}
          <div ref={bubbleRef} className="absolute left-0 top-0">
            <AnimatePresence>
              {out && (
                <motion.button
                  key="bubble"
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={openForm}
                  dir={isRtl(lang) ? "rtl" : undefined}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.2, delay: reduce ? 0 : 0.3 }}
                  style={{ transformOrigin: "right center", pointerEvents: shown ? "auto" : "none" }}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl rounded-br-md border border-amber-200/30 bg-black/65 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md cursor-pointer"
                >
                  <ChatDots />
                  {t(lang, "Feedback")}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <button
            ref={lanternRef}
            type="button"
            onClick={onClick}
            aria-label={t(lang, "Open feedback")}
            aria-hidden={!shown || undefined}
            tabIndex={shown ? 0 : -1}
            // Placed by its hook, tilted along the thread; the strip on the
            // left keeps the half-hidden lantern easy to tap.
            className="absolute left-0 top-0 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 before:absolute before:-left-3 before:inset-y-0 before:w-3 before:content-['']"
            style={{
              width: LANTERN_W,
              transformOrigin: `${LANTERN_W / 2}px 0px`,
              pointerEvents: shown ? "auto" : "none",
              opacity: out ? 1 : 0.85,
            }}
          >
            <LanternArt glow={out} />
          </button>
        </div>
      )}

      {/* Sent: a thank-you on the home screen (the form has closed). */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            role="status"
            dir={isRtl(lang) ? "rtl" : undefined}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+5rem)] z-[80] flex justify-center px-4"
          >
            <p className="flex max-w-sm items-center gap-2.5 rounded-2xl border border-emerald-300/30 bg-black/75 px-4 py-2.5 text-sm font-medium text-sand-50 shadow-[0_10px_30px_rgba(0,0,0,0.55)] backdrop-blur-md">
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/25 text-emerald-300">
                ✓
              </span>
              {toast}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {everOpened && (
        <FeedbackSheet
          open={open}
          onClose={() => setOpen(false)}
          onSent={onSent}
          captureRoot={() => rootRef.current?.parentElement ?? null}
        />
      )}
    </div>
  );
}

function ChatDots() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="shrink-0">
      <path d="M2.5 3.5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5v-2.5H2.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5.3" cy="7.5" r=".9" fill="currentColor" />
      <circle cx="8" cy="7.5" r=".9" fill="currentColor" />
      <circle cx="10.7" cy="7.5" r=".9" fill="currentColor" />
    </svg>
  );
}

/** A small brass fanoos: ring, domed cap, arched glass panes, a flame. Hook at the top centre. */
function LanternArt({ glow }: { glow: boolean }) {
  return (
    <svg viewBox="0 0 34 64" width={LANTERN_W} height="64" aria-hidden="true" className="block overflow-visible">
      <defs>
        <radialGradient id="fl-glow" cx="50%" cy="58%" r="60%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#f5b84a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c27a1a" stopOpacity="0.15" />
        </radialGradient>
        <linearGradient id="fl-brass" x1="0" x2="1">
          <stop offset="0%" stopColor="#a9792c" />
          <stop offset="50%" stopColor="#f0cf7a" />
          <stop offset="100%" stopColor="#a9792c" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle cx="17" cy="36" r="17" fill="#f5b84a" opacity={glow ? 0.3 : 0.12} style={{ filter: "blur(5px)" }} />
      {/* Ring on the hook */}
      <circle cx="17" cy="2.6" r="2.2" fill="none" stroke="url(#fl-brass)" strokeWidth="1.4" />
      {/* Dome cap with finial */}
      <path d="M8 16 Q17 3 26 16 Z" fill="url(#fl-brass)" />
      <rect x="6.5" y="15.5" width="21" height="3" rx="1.2" fill="url(#fl-brass)" />
      {/* Glass body */}
      <path d="M8 19 L26 19 L28.5 46 L5.5 46 Z" fill="url(#fl-glow)" stroke="url(#fl-brass)" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Arched panes */}
      <path d="M12 44 V28 Q12 23 14.6 23 Q17 23 17 28 V44" fill="none" stroke="#c9963e" strokeWidth="0.9" opacity="0.85" />
      <path d="M17 44 V28 Q17 23 19.4 23 Q22 23 22 28 V44" fill="none" stroke="#c9963e" strokeWidth="0.9" opacity="0.85" />
      {/* Flame */}
      <path d="M17 40.5 C14.6 37.8 15.4 35 17 32 C18.6 35 19.4 37.8 17 40.5 Z" fill="#fff4cf" opacity={glow ? 1 : 0.8} />
      {/* Base */}
      <rect x="4.5" y="46" width="25" height="3.2" rx="1.4" fill="url(#fl-brass)" />
      <path d="M11 49.2 L23 49.2 L19.5 54 L14.5 54 Z" fill="url(#fl-brass)" />
      <circle cx="17" cy="56.5" r="1.6" fill="#e8c877" />
    </svg>
  );
}
