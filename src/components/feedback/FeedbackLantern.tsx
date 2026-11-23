"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { t, isRtl, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { FEEDBACK_PEEKED_KEY, FEEDBACK_UI_ATTR } from "@/lib/feedback";
import { haptic } from "@/lib/haptics";
import { swingAngle, threadPath } from "@/lib/feedbackSwing";
import { CheckIcon, MessageIcon } from "@/components/ui/Icon";
import { EDGE_OUT_EVENT, OPEN_FEEDBACK_EVENT } from "@/lib/settingsEvents";

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

/** How far below the anchor the lantern's hook hangs. */
const DROP_PX = 64;
/** Hidden: the centre this far past the edge, so about half of it shows. */
const HIDDEN_PAST_PX = 4;
/** Tucked back to the side after the time-out, over this long. */
const BACK_MS = 900;
/** The lantern leans this much of the way along its swing (it lags its thread a little). */
const LEAN = 0.5;
/** Out and untouched this long → back into hiding (owner: 10–15 s). */
const OUT_MS = 12000;
/** First visit: how long a Surah must have been playing before the one peek. */
const PEEK_AFTER_PLAY_MS = 15000;
const TOAST_MS = 4500;
const LANTERN_W = 34;

type Geometry = { ax: number; ay: number; w: number };

/** Something modal is up (a sheet, the install guide, a picker): don't peek over it. */
const dialogOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [data-action-sheet]'));

/**
 * The feedback entry: a small lantern (fanoos) hanging on a thread from the
 * search button, tucked half behind the right edge. A tap lets it go: it
 * drops and swings across to the left of the button, back to the right and
 * so on (lib/feedbackSwing), with a "Feedback" bubble, until it goes back
 * (12 s untouched); a second tap opens the form. On the
 * first visit it swings out once by itself while a Surah plays. After a send
 * the form closes and a thank-you toast shows here.
 */
export function FeedbackLantern({ playing, hidden = false }: { playing: boolean; hidden?: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);

  // Only one of the gift / the feedback lantern out at a time (owner,
  // 2026-11-23): say when this one comes out; when the other does, this one
  // goes back to its place at the edge (still there, just not out).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(EDGE_OUT_EVENT, { detail: { who: "feedback", out } }));
  }, [out]);
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ who: string; out: boolean }>).detail;
      if (!d || d.who === "feedback") return;
      if (d.out) setOut(false);
    };
    window.addEventListener(EDGE_OUT_EVENT, on);
    return () => window.removeEventListener(EDGE_OUT_EVENT, on);
  }, []);
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
  const artRef = useRef<HTMLSpanElement>(null);
  /** The swing's angle now (radians from straight down below the anchor, + = right). */
  const theta = useRef(Number.NaN);
  /** 0 – 1: how much the lantern leans with its swing (none tucked aside, so half of it shows). */
  const lean = useRef(0);

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

  // The swing, drawn straight to the DOM every frame (no React renders). The
  // hook moves on a circle round the anchor; tucked aside it sits half past
  // the right edge.
  useEffect(() => {
    if (!geo) return;
    const dx = geo.w + HIDDEN_PAST_PX - geo.ax;
    const len = Math.hypot(dx, DROP_PX);
    const hidden = Math.atan2(dx, DROP_PX);
    /** Swing speed (rad/s), smoothed, for the thread's trailing bow. */
    let speed = 0;
    const place = (a: number) => {
      const hx = geo.ax + len * Math.sin(a);
      const hy = geo.ay + len * Math.cos(a);
      // Tucked: the soft S. Let go: it eases straight and trails the swing a little.
      threadRef.current?.setAttribute("d", threadPath(geo.ax, geo.ay, hx, hy, 1 - lean.current, speed));
      if (lanternRef.current) lanternRef.current.style.transform = `translate(${hx - LANTERN_W / 2}px, ${hy}px)`;
      if (artRef.current) artRef.current.style.transform = `rotate(${-a * LEAN * lean.current}rad)`;
    };
    if (Number.isNaN(theta.current)) theta.current = hidden;
    // Reduced motion: no swing — straight down when out, aside when not.
    if (reduce) {
      theta.current = out ? 0 : hidden;
      lean.current = 0;
      place(theta.current);
      return;
    }
    const from = theta.current;
    const leanFrom = lean.current;
    // Drawn once now too: frames don't run in a background tab.
    place(from);
    const start = performance.now();
    let frame = 0;
    let last = start;
    const step = (now: number) => {
      const s = (now - start) / 1000;
      const dt = Math.max(1 / 240, (now - last) / 1000);
      last = now;
      const before = theta.current;
      // The lean eases in as it is let go and out as it is tucked away.
      // The thread unbends over the first part of the drop, quick but not at once.
      lean.current = out ? Math.min(1, leanFrom + s / 0.6) : Math.max(0, leanFrom - (s * 1000) / BACK_MS);
      if (out) {
        theta.current = swingAngle(s, from);
      } else {
        const k = Math.min(1, (s * 1000) / BACK_MS);
        const ease = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        theta.current = from + (hidden - from) * ease;
        if (k >= 1) {
          speed = 0;
          return place(theta.current);
        }
      }
      speed += ((theta.current - before) / dt - speed) * Math.min(1, dt * 12);
      place(theta.current);
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

  // Settings › Send feedback: the same form, without the lantern's drop.
  const openFormRef = useRef(openForm);
  openFormRef.current = openForm;
  useEffect(() => {
    const open = () => openFormRef.current();
    window.addEventListener(OPEN_FEEDBACK_EVENT, open);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, open);
  }, []);

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
    <div ref={rootRef} data-feedback-lantern="" {...{ [FEEDBACK_UI_ATTR]: "" }} className={`${hidden ? "hidden " : ""}pointer-events-none absolute inset-0 z-40`}>
      {geo && (
        <motion.svg
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          initial={false}
          animate={{ opacity: shown ? (out ? 0.9 : 0.55) : 0 }}
        >
          <path
            ref={threadRef}
            d={`M ${geo.ax} ${geo.ay} L ${geo.ax} ${geo.ay + DROP_PX}`}
            fill="none"
            stroke="#e3c06d"
            strokeWidth={1}
            strokeLinecap="round"
          />
        </motion.svg>
      )}

      {geo && (
        <button
          ref={lanternRef}
          type="button"
          onClick={onClick}
          aria-label={t(lang, "Open feedback")}
          data-tour="feedback"
          aria-hidden={!shown || undefined}
          tabIndex={shown ? 0 : -1}
          // Placed by its hook (each frame, above); the extra strip on the
          // left keeps the half-hidden lantern easy to tap.
          className="absolute left-0 top-0 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 before:absolute before:-left-3 before:inset-y-0 before:w-3 before:content-['']"
          style={{ width: LANTERN_W, pointerEvents: shown ? "auto" : "none", opacity: shown ? (out ? 1 : 0.8) : 0, transition: "opacity 0.25s" }}
        >
          <AnimatePresence>
            {out && (
              <motion.span
                key="bubble"
                dir={isRtl(lang) ? "rtl" : undefined}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2, delay: reduce ? 0 : 0.25 }}
                style={{ transformOrigin: "right center" }}
                className="absolute right-full top-6 mr-2 flex items-center gap-1.5 whitespace-nowrap rounded-2xl rounded-br-md border border-amber-200/30 bg-black/65 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
              >
                <ChatDots />
                {t(lang, "Feedback")}
              </motion.span>
            )}
          </AnimatePresence>
          <span ref={artRef} className="block" style={{ transformOrigin: "50% 0%" }}>
            <LanternArt glow={out} />
          </span>
        </button>
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
                <CheckIcon className="h-4 w-4" />
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
    <MessageIcon className="shrink-0" />
  );
}

/** A small brass fanoos: ring, domed cap, arched glass panes, a flame. Hook at the top centre. */
export function LanternArt({ glow }: { glow: boolean }) {
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
