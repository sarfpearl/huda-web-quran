"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { useUiLang, isRtl } from "@/lib/uiLang";
import { tourT } from "@/lib/i18n/tour";
import { afterSplash, afterStage, finishStage } from "@/lib/onboarding";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { threadPath } from "@/lib/feedbackSwing";
import { OPEN_TOUR_EVENT, TOUR_DONE_KEY, TOUR_STEPS, type TourStep } from "@/lib/tour/steps";
import { LanternArt } from "@/components/feedback/FeedbackLantern";

/*
 * First-visit tour: once per browser, right after the onboarding prompts
 * (lib/onboarding: splash → location → install guide → tour) and before the
 * content browser slides in. A gold thread hangs from a small brass rosette at
 * the top of the screen; at its end the feedback lantern's fanoos (the same
 * lantern and thread) travels from control to control, the rest of the screen
 * dimmed, with one short line about each. Skip on every step; Settings › App
 * tour shows it again. The steps are data (lib/tour/steps); a control that
 * isn't on screen is left out.
 */

// Lets the home screen settle (pills, player) after the last prompt closes.
const START_DELAY_MS = 900;
const EDGE = 16; // from the screen's edges
const CARD_MAX = 340;
// The lantern (LanternArt): its width, and how tall it hangs from its hook.
const LANTERN_W = 34;
const LANTERN_H = 58;
// Lantern ↔ control and lantern ↔ card.
const NEAR = 6;
const CARD_GAP = 10;
// The lantern's travel along the thread: a spring, a little under-damped so
// it settles with a small sway (stiffness 1/s², damping 1/s).
const SPRING_K = 55;
const SPRING_C = 10.5;
// How far it leans against its motion (rad per px/s), and at most.
const TILT_PER_SPEED = 0.0011;
const TILT_MAX = 0.45;

type Rect = { x: number; y: number; w: number; h: number; r: string };
type Point = { x: number; y: number };

function isDone() {
  try {
    return localStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return false;
  }
}
function markDone() {
  try {
    localStorage.setItem(TOUR_DONE_KEY, "1");
  } catch {
    /* private mode: shown again next visit */
  }
}

/** The step's control as it is on screen, or null when it isn't shown. */
function findTarget(name: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    // A `display: contents` wrapper has no box: its first child is the control.
    const node = getComputedStyle(el).display === "contents" ? (el.firstElementChild as HTMLElement | null) : el;
    if (!node) continue;
    const r = node.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
    if (node.checkVisibility && !node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    if (node.closest("[aria-hidden=true], [inert]")) continue;
    return node;
  }
  return null;
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  // Half past the screen's edge (the feedback lantern): only the part on screen.
  const x = Math.max(0, r.left);
  const w = Math.min(innerWidth, r.right) - x;
  return { x, y: r.top, w, h: r.height, r: getComputedStyle(el).borderRadius || "9999px" };
}

const present = (s: TourStep) => !s.target || Boolean(findTarget(s.target));

export function FirstVisitTour() {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [card, setCard] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ w: 0, h: 0 });
  const [anchor, setAnchor] = useState<Point | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<SVGPathElement>(null);
  const lanternRef = useRef<HTMLDivElement>(null);
  /** Where the lantern's hook is going (this step) — read by the frame loop. */
  const goal = useRef<Point | null>(null);
  const open = steps !== null;
  useDialogFocus(open, dialogRef);

  const start = useCallback(() => {
    const list = TOUR_STEPS.filter(present);
    setIndex(0);
    setSteps(list);
  }, []);

  // First visit: after the onboarding prompts. Otherwise the stage passes at once.
  useEffect(() => {
    const viaSearch = window.location.hash === "#search" || window.location.hash === "#browse";
    if (isDone() || viaSearch) {
      finishStage("tour");
      return;
    }
    let cancelled = false;
    let timer = 0;
    Promise.all([afterSplash(), afterStage("location"), afterStage("install")]).then(() => {
      if (!cancelled) timer = window.setTimeout(start, START_DELAY_MS);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [start]);

  // Settings › App tour.
  useEffect(() => {
    window.addEventListener(OPEN_TOUR_EVENT, start);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, start);
  }, [start]);

  const close = useCallback(() => {
    markDone();
    setSteps(null);
    setRect(null);
    setAnchor(null);
    goal.current = null;
    finishStage("tour");
  }, []);

  const step = steps?.[index];
  const last = steps ? index === steps.length - 1 : false;

  // Follow the control: layout shifts, rotation, the keyboard, resize.
  useLayoutEffect(() => {
    if (!step) return;
    const measure = () => {
      setView((v) => (v.w === innerWidth && v.h === innerHeight ? v : { w: innerWidth, h: innerHeight }));
      const el = step.target ? findTarget(step.target) : null;
      setRect(el ? rectOf(el) : null);
      const c = cardRef.current;
      if (c) setCard((p) => (p.w === c.offsetWidth && p.h === c.offsetHeight ? p : { w: c.offsetWidth, h: c.offsetHeight }));
      const a = anchorRef.current?.getBoundingClientRect();
      if (a) {
        const next = { x: a.left + a.width / 2, y: a.bottom - 3 };
        setAnchor((p) => (p && p.x === next.x && p.y === next.y ? p : next));
      }
    };
    measure();
    const id = window.setInterval(measure, 400);
    addEventListener("resize", measure);
    visualViewport?.addEventListener("resize", measure);
    return () => {
      window.clearInterval(id);
      removeEventListener("resize", measure);
      visualViewport?.removeEventListener("resize", measure);
    };
  }, [step, lang]);

  // A control that has gone since the tour began is stepped over.
  const go = useCallback(
    (dir: 1 | -1) => {
      if (!steps) return;
      let i = index + dir;
      while (i > 0 && i < steps.length - 1 && !present(steps[i])) i += dir;
      if (i < 0) return;
      if (i >= steps.length) return close();
      setIndex(i);
    },
    [steps, index, close]
  );

  useEffect(() => {
    if (!open) return;
    primaryRef.current?.focus({ preventScroll: true });
  }, [open, index]);

  // The lantern travels along its thread, drawn straight to the DOM every
  // frame (no React renders): it starts at the rosette, so on the first step
  // it comes down the thread; each step it glides to the next control, leaning
  // against the move and settling with a small sway.
  useEffect(() => {
    if (!open || !anchor) return;
    const cur = { x: anchor.x, y: anchor.y };
    const vel = { x: 0, y: 0 };
    let frame = 0;
    let last = performance.now();
    const t0 = last;
    const draw = (tilt: number) => {
      threadRef.current?.setAttribute("d", threadPath(anchor.x, anchor.y, cur.x, cur.y, 0.35, vel.x * 0.004));
      if (lanternRef.current) lanternRef.current.style.transform = `translate(${cur.x - LANTERN_W / 2}px, ${cur.y}px) rotate(${tilt}rad)`;
    };
    const tick = (now: number) => {
      const dt = Math.min(1 / 30, Math.max(1 / 240, (now - last) / 1000));
      last = now;
      const g = goal.current;
      if (g) {
        if (reduce) {
          cur.x = g.x;
          cur.y = g.y;
          vel.x = vel.y = 0;
        } else {
          vel.x += (SPRING_K * (g.x - cur.x) - SPRING_C * vel.x) * dt;
          vel.y += (SPRING_K * (g.y - cur.y) - SPRING_C * vel.y) * dt;
          cur.x += vel.x * dt;
          cur.y += vel.y * dt;
        }
      }
      const sway = reduce ? 0 : 0.06 * Math.sin(((now - t0) / 1000) * 2.1);
      const tilt = reduce ? 0 : Math.max(-TILT_MAX, Math.min(TILT_MAX, vel.x * TILT_PER_SPEED)) + sway;
      draw(tilt);
      frame = requestAnimationFrame(tick);
    };
    // Drawn once now too: frames don't run in a background tab.
    draw(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, anchor, reduce]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const forward = (e.key === "ArrowRight") !== isRtl(lang);
      go(forward ? 1 : -1);
    }
  };

  if (!open || !step || typeof document === "undefined") return null;

  // Where the light, the lantern and the card go: the lantern just under a
  // control in the top half of the screen (the card under it), just over one
  // in the bottom half (the card over it); in the middle for the first and
  // last cards.
  const vw = view.w || innerWidth;
  const vh = view.h || innerHeight;
  const cardW = Math.min(CARD_MAX, vw - EDGE * 2);
  const cardH = card.h || 190;
  let cardX = (vw - cardW) / 2;
  let cardY: number;
  let hook: Point;
  if (rect) {
    const cx = rect.x + rect.w / 2;
    const below = rect.y + rect.h / 2 < vh / 2;
    const hx = Math.max(EDGE + LANTERN_W / 2, Math.min(vw - EDGE - LANTERN_W / 2, cx));
    const hy = below ? rect.y + rect.h + NEAR : rect.y - NEAR - LANTERN_H;
    hook = { x: hx, y: hy };
    cardY = below ? hy + LANTERN_H + CARD_GAP : hy - CARD_GAP - cardH;
    cardY = Math.max(EDGE, Math.min(vh - cardH - EDGE, cardY));
    cardX = Math.max(EDGE, Math.min(vw - cardW - EDGE, cx - cardW / 2));
  } else {
    cardY = Math.max(EDGE + LANTERN_H + CARD_GAP + 40, (vh - cardH) / 2 + 30);
    hook = { x: vw / 2, y: cardY - CARD_GAP - LANTERN_H };
  }
  goal.current = hook;
  // The pool of light: on the control, else round the lantern and its card.
  const tx = rect ? rect.x + rect.w / 2 : vw / 2;
  const ty = rect ? rect.y + rect.h / 2 : cardY + cardH / 2 - 20;
  const rx = rect ? Math.max(rect.w * 0.95, 46) + 26 : cardW * 0.9;
  const ry = rect ? Math.max(rect.h * 0.95, 40) + 26 : cardH * 1.25;
  const total = steps!.length;
  const titleId = "huda-tour-title";
  const textId = "huda-tour-text";

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={textId}
      dir={isRtl(lang) ? "rtl" : "ltr"}
      onKeyDown={onKeyDown}
      className="huda-tour fixed inset-0 z-[300] select-none outline-none"
      style={
        {
          "--tx": `${tx}px`,
          "--ty": `${ty}px`,
          "--rx": `${rx}px`,
          "--ry": `${ry}px`,
        } as React.CSSProperties
      }
    >
      <style>{TOUR_CSS}</style>
      {/* The night around the lantern's light; taps on it do nothing. */}
      <div className="huda-tour-veil absolute inset-0" aria-hidden="true" />
      {rect && (
        <div
          className="huda-tour-halo pointer-events-none absolute"
          aria-hidden="true"
          style={{ left: rect.x - 5, top: rect.y - 5, width: rect.w + 10, height: rect.h + 10, borderRadius: `calc(${rect.r} + 5px)` }}
        />
      )}

      {/* The rosette the thread hangs from, the thread, and the lantern at its end. */}
      <div
        ref={anchorRef}
        className="pointer-events-none absolute left-1/2 top-[max(env(safe-area-inset-top),0px)] -translate-x-1/2"
        aria-hidden="true"
      >
        <Rosette />
      </div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <path ref={threadRef} fill="none" stroke="#e3c06d" strokeWidth={1} strokeLinecap="round" opacity={0.9} />
      </svg>
      <div
        ref={lanternRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: LANTERN_W, transformOrigin: `${LANTERN_W / 2}px 0`, transform: anchor ? `translate(${anchor.x - LANTERN_W / 2}px, ${anchor.y}px)` : undefined }}
        aria-hidden="true"
      >
        <LanternArt glow />
      </div>

      <div
        ref={cardRef}
        className="huda-tour-card absolute"
        style={{ width: cardW, transform: `translate3d(${cardX}px, ${cardY}px, 0)` }}
      >
        <div className="relative overflow-hidden rounded-[22px] border border-amber-200/25 bg-[#0d0b08]/[0.92] px-5 pb-4 pt-4 text-sand-50 shadow-[0_24px_60px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,236,190,0.08)] backdrop-blur-xl">
          {/* Eight-point star (khatam), very faint, in the corner. */}
          <svg
            className="pointer-events-none absolute -right-7 -top-7 h-28 w-28 text-amber-200/[0.07]"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="22" y="22" width="56" height="56" />
              <rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" />
              <circle cx="50" cy="50" r="15" />
            </g>
          </svg>

          <div aria-live="polite" className="relative">
            <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-200/60">
              {tourT(lang, "{n} of {total}", { n: index + 1, total })}
            </p>
            <h2 id={titleId} className="text-[17px] font-semibold leading-snug text-amber-100">
              {tourT(lang, step.title)}
            </h2>
            <p id={textId} className="mt-1.5 text-[13.5px] leading-relaxed text-sand-100/85">
              {tourT(lang, step.text)}
            </p>
          </div>

          {/* Beads (a tasbih), one per step: the lit one is here. */}
          <div className="relative mt-3.5 flex items-center gap-[5px]" aria-hidden="true">
            {steps!.map((_, i) => (
              <span
                key={i}
                className={`huda-tour-bead h-[5px] rounded-full ${
                  i === index ? "w-4 bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.8)]" : i < index ? "w-[5px] bg-amber-200/50" : "w-[5px] bg-white/15"
                }`}
              />
            ))}
          </div>

          <div className="relative mt-3.5 flex items-center gap-2">
            {!last && (
              <button
                type="button"
                onClick={close}
                aria-label={tourT(lang, "Skip the tour")}
                className="-ms-2 rounded-full px-2.5 py-2 text-[13px] font-medium text-sand-200/70 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 cursor-pointer"
              >
                {tourT(lang, "Skip")}
              </button>
            )}
            <span className="flex-1" />
            {index > 0 && !last && (
              <button
                type="button"
                onClick={() => go(-1)}
                className="rounded-full border border-white/15 px-3.5 py-2 text-[13px] font-medium text-sand-100 transition-colors hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 cursor-pointer"
              >
                {tourT(lang, "Back")}
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={() => (last ? close() : go(1))}
              className="rounded-full bg-amber-300 px-5 py-2 text-[13px] font-semibold text-[#1a1206] shadow-[0_4px_18px_rgba(252,211,77,0.35)] transition-transform hover:bg-amber-200 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 cursor-pointer"
            >
              {tourT(lang, last ? "OK" : index === 0 ? "Begin" : "Next")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** The brass rosette (an eight-point star on a ring) the thread is tied to. */
function Rosette() {
  return (
    <svg width="18" height="18" viewBox="0 0 22 22" className="block overflow-visible">
      <defs>
        <linearGradient id="huda-tour-brass" x1="0" x2="1">
          <stop offset="0%" stopColor="#a9792c" />
          <stop offset="50%" stopColor="#f0cf7a" />
          <stop offset="100%" stopColor="#a9792c" />
        </linearGradient>
      </defs>
      <circle cx="11" cy="11" r="10" fill="#f5b84a" opacity="0.18" style={{ filter: "blur(3px)" }} />
      <g fill="#1c140a" stroke="url(#huda-tour-brass)" strokeWidth="1.2" strokeLinejoin="round">
        <rect x="5.2" y="5.2" width="11.6" height="11.6" />
        <rect x="5.2" y="5.2" width="11.6" height="11.6" transform="rotate(45 11 11)" />
      </g>
      <circle cx="11" cy="11" r="2.3" fill="url(#huda-tour-brass)" />
    </svg>
  );
}

const TOUR_CSS = `
@property --tx { syntax: "<length>"; inherits: true; initial-value: 50vw; }
@property --ty { syntax: "<length>"; inherits: true; initial-value: 40vh; }
@property --rx { syntax: "<length>"; inherits: true; initial-value: 60vmax; }
@property --ry { syntax: "<length>"; inherits: true; initial-value: 60vmax; }
.huda-tour {
  transition: --tx 0.75s cubic-bezier(0.32, 0.72, 0, 1), --ty 0.75s cubic-bezier(0.32, 0.72, 0, 1),
    --rx 0.75s cubic-bezier(0.32, 0.72, 0, 1), --ry 0.75s cubic-bezier(0.32, 0.72, 0, 1);
  animation: huda-tour-in 0.6s ease-out both;
}
.huda-tour-veil {
  background: radial-gradient(var(--rx) var(--ry) at var(--tx) var(--ty),
    rgba(255, 214, 140, 0.10) 0%, rgba(255, 190, 100, 0.05) 42%, rgba(9, 6, 3, 0.62) 72%, rgba(4, 3, 2, 0.86) 100%);
}
.huda-tour-halo {
  box-shadow: 0 0 0 1px rgba(253, 230, 138, 0.55), 0 0 22px 4px rgba(251, 191, 36, 0.32);
  transition: left 0.75s cubic-bezier(0.32, 0.72, 0, 1), top 0.75s cubic-bezier(0.32, 0.72, 0, 1),
    width 0.75s cubic-bezier(0.32, 0.72, 0, 1), height 0.75s cubic-bezier(0.32, 0.72, 0, 1);
  animation: huda-tour-breathe 2.8s ease-in-out infinite;
}
.huda-tour-card { left: 0; top: 0; transition: transform 0.75s cubic-bezier(0.32, 0.72, 0, 1); }
.huda-tour-bead { transition: width 0.4s ease, background-color 0.4s ease; }
@keyframes huda-tour-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes huda-tour-breathe { 0%, 100% { box-shadow: 0 0 0 1px rgba(253, 230, 138, 0.5), 0 0 18px 3px rgba(251, 191, 36, 0.26); }
  50% { box-shadow: 0 0 0 1px rgba(253, 230, 138, 0.75), 0 0 28px 7px rgba(251, 191, 36, 0.4); } }
@media (prefers-reduced-motion: reduce) {
  .huda-tour, .huda-tour-halo, .huda-tour-card, .huda-tour-bead { transition: none; }
  .huda-tour-halo { animation: none; }
}
`;
