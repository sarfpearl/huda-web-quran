"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { t, isRtl, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { FEEDBACK_PEEKED_KEY, FEEDBACK_UI_ATTR } from "@/lib/feedback";
import { haptic } from "@/lib/haptics";
import { createRope, endTilt, layStraight, ropeLength, ropePath, ropeTension, stepRope, type Rope } from "@/lib/feedbackRope";
import { MAX_SPEED, angleTo, drop, stepSwing, type Swing } from "@/lib/feedbackPendulum";

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
/** Pulled back aside after the time-out, over this long. */
const RETURN_MS = 900;
/** A press that moves less than this (px) is a tap; more is a grab-and-swing. */
const DRAG_START_PX = 6;
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
 * The feedback entry: a small lantern (fanoos) on a thread from the search
 * button, behaving like a charm on a string (lib/feedbackPendulum,
 * lib/feedbackRope). At rest it is pulled aside, half behind the right edge.
 * A tap lets it go: it falls, swings across under the button and back, and
 * keeps swaying (never quite stops) with a "Feedback" bubble. It can be
 * grabbed, swung and let go. 12 s untouched, it is pulled aside again. A tap
 * while it is out opens the form. On the first visit it is let go once by
 * itself while a Surah plays. After a send
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
  /** The swing now: angle (radians from straight down, + = right) and speed (rad/s). */
  const swing = useRef<Swing>({ theta: Number.NaN, omega: 0 });
  /** aside: tucked at the edge · free: swinging · drag: held by a finger · back: being pulled aside. */
  const mode = useRef<"aside" | "free" | "drag" | "back">("aside");
  const backFrom = useRef({ theta: 0, at: 0 });
  const press = useRef<{ id: number; x: number; y: number; moved: boolean; theta: number; at: number } | null>(null);
  /** Starts the frame loop if it isn't running (set by the motion effect). */
  const kick = useRef<() => void>(() => {});
  /** The rope's points (x, y and last frame's x, y) and the geometry they were laid out for. */
  const rope = useRef<{ pts: Rope; for: Geometry | null }>({ pts: createRope(), for: null });

  const goAside = useCallback(() => {
    clearTimeout(outTimer.current);
    setOut(false);
    if (mode.current === "aside") return;
    mode.current = "back";
    backFrom.current = { theta: swing.current.theta, at: performance.now() };
    kick.current();
  }, []);
  /** Untouched this long → pulled aside again. */
  const armTimer = useCallback(() => {
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(goAside, OUT_MS);
  }, [goAside]);
  /** Let go: from aside it falls and swings; already out, it keeps its swing. */
  const comeOut = useCallback(() => {
    setOut(true);
    // Out means a tap may follow: fetch the form now so it opens at once.
    void import("./FeedbackSheet");
    if (mode.current === "aside" || mode.current === "back") {
      // Let go from the side: it falls, jumps on its thread and swings.
      swing.current = drop(swing.current);
      mode.current = "free";
    } else if (mode.current !== "drag") mode.current = "free";
    armTimer();
    kick.current();
  }, [armTimer]);
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

  // The swing and its rope, drawn straight to the DOM every frame (no React
  // renders). The pendulum moves the lantern's hook; the rope between the
  // button and the hook is simulated, so it flexes a little in fast motion.
  useEffect(() => {
    if (!geo) return;
    const len = threadLen(geo);
    /** The hook at angle a, the thread stretched by `give` px. */
    const hookAt = (a: number, give = 0) => [geo.ax + (len + give) * Math.sin(a), geo.ay + (len + give) * Math.cos(a)] as const;
    const p = rope.current.pts;
    const links = p.length / 4 - 1;
    const simulate = (a: number, dt: number, speed: number, give: number) =>
      // The rope keeps its own length: when the lantern jumps up on the
      // thread's give, the rope goes slack and curls (as in the owner's
      // reference reel); dropping, it pulls straight again.
      stepRope(p, geo.ax, geo.ay, ...hookAt(a, give), ropeLength(len, speed) / links, dt, ropeTension(speed) * (give < -1 ? 0.15 : 1));
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
    const sw = swing.current;
    if (Number.isNaN(sw.theta)) sw.theta = hidden;
    if (mode.current === "aside") sw.theta = hidden;
    // A new layout (first show, resize): start straight.
    if (rope.current.for !== geo) {
      layStraight(p, geo.ax, geo.ay, ...hookAt(sw.theta));
      rope.current.for = geo;
    }
    // Reduced motion: no swing — straight down when out, aside when not.
    if (reduce) {
      const place = () => {
        sw.theta = mode.current === "aside" || mode.current === "back" ? hidden : 0;
        sw.omega = 0;
        sw.stretch = sw.stretchV = 0;
        if (mode.current === "back") mode.current = "aside";
        layStraight(p, geo.ax, geo.ay, ...hookAt(sw.theta));
        draw();
      };
      kick.current = place;
      place();
      return;
    }
    // Drawn once now too: frames don't run in a background tab.
    draw();
    let frame = 0;
    let last = 0;
    const step = (now: number) => {
      const dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60;
      last = now;
      const before = sw.theta;
      if (mode.current === "free") {
        Object.assign(sw, stepSwing(sw, dt));
      } else if (mode.current === "back") {
        const k = Math.min(1, (now - backFrom.current.at) / RETURN_MS);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        sw.theta = backFrom.current.theta + (hidden - backFrom.current.theta) * ease;
        sw.omega = (sw.theta - before) / dt;
        if (k >= 1) {
          mode.current = "aside";
          sw.omega = 0;
        }
      } else if (mode.current === "aside") {
        sw.theta = hidden;
        sw.omega = 0;
      }
      // (drag: the pointer handlers set the angle and speed.)
      if (mode.current !== "free" && (sw.stretch || sw.stretchV)) {
        // Not swinging freely: the thread's give still settles.
        const { stretch, stretchV } = stepSwing({ theta: 0, omega: 0, stretch: sw.stretch, stretchV: sw.stretchV }, dt, false);
        sw.stretch = Math.abs(stretch ?? 0) < 0.05 && Math.abs(stretchV ?? 0) < 0.5 ? 0 : stretch;
        sw.stretchV = sw.stretch === 0 ? 0 : stretchV;
      }
      const moved = simulate(sw.theta, dt, sw.omega, sw.stretch ?? 0) + Math.abs(sw.stretchV ?? 0) * dt;
      wobble = Math.min(1, moved / 0.4);
      draw();
      // Tucked aside and the rope still: no more frames until the next kick.
      if (mode.current === "aside" && moved < 0.02) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(step);
    };
    kick.current = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(step);
    };
    kick.current();
    return () => {
      cancelAnimationFrame(frame);
      frame = 0;
      kick.current = () => {};
    };
  }, [geo, reduce]);

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
    // Hidden while the form is up; back tucked aside after it.
    mode.current = "aside";
    swing.current.omega = 0;
    kick.current();
    setEverOpened(true);
    setOpen(true);
  };

  /** Where a pointer is, as an angle from the anchor. */
  const pointerAngle = (e: React.PointerEvent) => {
    const scene = rootRef.current?.parentElement?.getBoundingClientRect();
    if (!scene || !geo) return swing.current.theta;
    return Math.max(-1.3, Math.min(1.3, angleTo(geo.ax, geo.ay, e.clientX - scene.left, e.clientY - scene.top)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    try {
      // Keep getting the moves while the finger leaves the small lantern.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, theta: swing.current.theta, at: performance.now() };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId || reduce) return;
    if (!pr.moved) {
      if (Math.hypot(e.clientX - pr.x, e.clientY - pr.y) < DRAG_START_PX) return;
      // Grabbed: it follows the finger, held on its thread.
      pr.moved = true;
      mode.current = "drag";
      clearTimeout(outTimer.current);
      setOut(true);
      void import("./FeedbackSheet");
    }
    const now = performance.now();
    const a = pointerAngle(e);
    const dt = Math.max(0.008, (now - pr.at) / 1000);
    const sw = swing.current;
    // Speed from the finger, smoothed so a last jitter doesn't decide the fling.
    sw.omega = sw.omega * 0.5 + ((a - pr.theta) / dt) * 0.5;
    sw.theta = a;
    pr.theta = a;
    pr.at = now;
    kick.current();
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    press.current = null;
    if (pr.moved) {
      // Let go: it carries on with the speed it was given.
      const sw = swing.current;
      if (performance.now() - pr.at > 80) sw.omega = 0;
      sw.omega = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, sw.omega));
      Object.assign(sw, drop(sw, 140));
      mode.current = "free";
      armTimer();
      kick.current();
      return;
    }
    haptic();
    if (out) openForm();
    else comeOut();
  };
  const onPointerCancel = () => {
    if (press.current?.moved) {
      mode.current = "free";
      armTimer();
      kick.current();
    }
    press.current = null;
  };
  // Keyboard / screen reader (detail 0): straight to the form. Pointer taps are handled above.
  const onClick = (e: React.MouseEvent) => {
    if (e.detail === 0) openForm();
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
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            aria-label={t(lang, "Open feedback")}
            aria-hidden={!shown || undefined}
            tabIndex={shown ? 0 : -1}
            // Placed by its hook, tilted along the thread; the strip on the
            // left keeps the half-hidden lantern easy to tap. touch-none: a
            // drag swings it instead of scrolling the page.
            className="absolute left-0 top-0 block touch-none select-none cursor-grab active:cursor-grabbing rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 before:absolute before:-left-3 before:inset-y-0 before:w-3 before:content-['']"
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
