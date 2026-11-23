"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { isRtl, t, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { haptic } from "@/lib/haptics";
import { swingAngle, threadPath } from "@/lib/feedbackSwing";
import { OPEN_SUPPORT_EVENT, SUPPORT_PEEKED_KEY, supportEnabled } from "@/lib/support";

/*
 * The support entry, the feedback lantern's quiet partner on the left: a
 * small wrapped gift (emerald box, gold ribbon and bow, HuDa's eight-point
 * star on its sides) hanging on a gold thread from the time pill, tucked half
 * behind the left edge.
 *   - It always rests there, also after someone has given.
 *   - A tap lets it go: it drops and swings like the lantern, the lid lifts
 *     and lets out a little light, and "Support HuDa" shows beside it. A
 *     second tap opens the sheet. A tap anywhere else, or 12 s untouched,
 *     sends it back.
 *   - Only on the very first visit it swings out once by itself, then never
 *     again. It doesn't move while a recitation plays.
 *   - Stays in place over open menus and panels, like the lantern; hidden
 *     only in reading mode and focus mode (no pill).
 */

/** What it hangs from: the time pill at the top left. */
function findAnchor(): HTMLElement | null {
  const el = document.querySelector<HTMLElement>('[data-scene-header] [data-tour="prayer"] > *');
  return el && el.getBoundingClientRect().width > 0 ? el : null;
}

/** How far below the anchor the gift's bow hangs. */
const DROP_PX = 58;
/** Tucked: its centre this far past the left edge, so about half of it shows. */
const HIDDEN_PAST_PX = 2;
const BACK_MS = 900;
const LEAN = 0.5;
/** Out and untouched this long → back to its place. */
const OUT_MS = 12000;
/** First visit: how long after the first-open steps before its one swing out… */
const PEEK_AFTER_MS = 4000;
/** …and how long it stays out. */
const PEEK_MS = 6000;
const W = 40;

type Geometry = { ax: number; ay: number };

const dialogOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [data-action-sheet]'));

/** The gift as a plain icon (sheet buttons, Settings row). */
export function GiftMark({ className, strokeWidth = 1.8 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="14.5" width="19" height="13" rx="2" />
      <rect x="4.5" y="10" width="23" height="4.5" rx="1.5" />
      <path d="M16 10v17.5" />
      <path d="M16 10c-1.6-3.6-6.6-5-7.4-2.4C8 9.6 12.4 10 16 10zM16 10c1.6-3.6 6.6-5 7.4-2.4C24 9.6 19.6 10 16 10z" />
    </svg>
  );
}

/** HuDa's eight-point star, small, for the box's side. */
function Stamp({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#e9c873" strokeWidth="0.7" opacity="0.7">
      <rect x="-2.6" y="-2.6" width="5.2" height="5.2" rx="0.5" />
      <rect x="-2.6" y="-2.6" width="5.2" height="5.2" rx="0.5" transform="rotate(45)" />
    </g>
  );
}

/** The wrapped gift. `open` lifts the lid and lets the light out. */
function GiftArt({ open, still }: { open: boolean; still: boolean }) {
  return (
    <svg viewBox="0 0 40 46" width={W} height="46" aria-hidden="true" className="block overflow-visible">
      <defs>
        <linearGradient id="sg-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#12664c" />
          <stop offset="100%" stopColor="#08362a" />
        </linearGradient>
        <linearGradient id="sg-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a7a5c" />
          <stop offset="100%" stopColor="#0d4a39" />
        </linearGradient>
        <linearGradient id="sg-gold" x1="0" x2="1">
          <stop offset="0%" stopColor="#a9792c" />
          <stop offset="50%" stopColor="#f3d27e" />
          <stop offset="100%" stopColor="#a9792c" />
        </linearGradient>
        <radialGradient id="sg-light" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor="#fff1c4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f5b84a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo */}
      <circle cx="20" cy="30" r="17" fill="#f5b84a" style={{ filter: "blur(6px)" }} opacity={open ? 0.28 : 0.1} />

      {/* Light out of the opened box, and sparks */}
      <motion.path
        d="M6 21 L34 21 L27 2 L13 2 Z"
        fill="url(#sg-light)"
        initial={false}
        animate={{ opacity: open ? 0.75 : 0, scaleY: open ? 1 : 0.3 }}
        transition={{ duration: 0.6, delay: open ? 0.35 : 0 }}
        style={{ transformOrigin: "20px 21px" }}
      />
      {open &&
        !still &&
        [-6, 0, 6].map((dx, i) => (
          <motion.circle
            key={dx}
            cx={20 + dx}
            cy="18"
            r="1"
            fill="#fff4cf"
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: [0, 1, 0], y: [0, -10, -20], x: [0, dx * 0.25, dx * 0.6] }}
            transition={{ duration: 2.2, delay: 0.5 + i * 0.35, repeat: Infinity, repeatDelay: 1.2, ease: "easeOut" }}
          />
        ))}

      {/* Box */}
      <rect x="6" y="20" width="28" height="22" rx="2.6" fill="url(#sg-box)" stroke="url(#sg-gold)" strokeWidth="1.1" />
      <Stamp x={12.5} y={31} />
      <Stamp x={27.5} y={31} />
      <rect x="18.2" y="20" width="3.6" height="22" fill="url(#sg-gold)" />

      {/* Lid, bow and ribbon tails: lifts and tilts when it opens */}
      <motion.g
        initial={false}
        animate={open ? { y: -5.5, rotate: -9 } : { y: 0, rotate: 0 }}
        transition={open ? { type: "spring", stiffness: 260, damping: 11, delay: 0.25 } : { duration: 0.35 }}
        style={{ transformOrigin: "7px 20px" }}
      >
        <rect x="4" y="14" width="32" height="7" rx="2" fill="url(#sg-lid)" stroke="url(#sg-gold)" strokeWidth="1.1" />
        <rect x="18.2" y="14" width="3.6" height="7" fill="url(#sg-gold)" />
        <motion.g
          animate={still ? undefined : { rotate: [-3, 3, -3] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "20px 14px" }}
        >
          <path d="M20 14 C16 6.5 9.5 7 10.5 11 C11.2 13.4 15.5 14 20 14 Z" fill="url(#sg-gold)" />
          <path d="M20 14 C24 6.5 30.5 7 29.5 11 C28.8 13.4 24.5 14 20 14 Z" fill="url(#sg-gold)" />
          <path d="M19 14.5 L15.5 19.5 M21 14.5 L24.5 19.5" stroke="#d9b25a" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="20" cy="13.6" r="1.9" fill="#f3d27e" stroke="#a9792c" strokeWidth="0.6" />
        </motion.g>
      </motion.g>
    </svg>
  );
}

export function SupportGift({ playing, suppressed, hidden = false }: { playing: boolean; suppressed: boolean; hidden?: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [geo, setGeo] = useState<Geometry | null>(null);
  const [out, setOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const threadRef = useRef<SVGPathElement>(null);
  const giftRef = useRef<HTMLButtonElement>(null);
  const artRef = useRef<HTMLSpanElement>(null);
  const theta = useRef(Number.NaN);
  const lean = useRef(0);

  useEffect(() => {
    let alive = true;
    setEnabled(supportEnabled());
    Promise.all([afterSplash(), afterStage("location"), afterStage("install")]).then(() => alive && setReady(true));
    return () => {
      alive = false;
      clearTimeout(outTimer.current);
    };
  }, []);

  const comeOut = useCallback((forMs = OUT_MS) => {
    setOut(true);
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setOut(false), forMs);
  }, []);

  // Follow the time pill (it moves with the safe area and hides in focus mode).
  useEffect(() => {
    if (!ready || !enabled) return;
    const scene = rootRef.current?.parentElement;
    if (!scene) return;
    const measure = () => {
      const a = findAnchor();
      const s = scene.getBoundingClientRect();
      const r = a?.getBoundingClientRect();
      const shown = a && r && Number(getComputedStyle(a).opacity) > 0.2;
      setGeo((g) => {
        if (!shown || !r) return null;
        const next = { ax: Math.round(r.left - s.left + Math.min(26, r.width / 2)), ay: Math.round(r.bottom - s.top) };
        return g && g.ax === next.ax && g.ay === next.ay ? g : next;
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scene);
    const tick = setInterval(measure, 700);
    return () => {
      ro.disconnect();
      clearInterval(tick);
    };
  }, [ready, enabled]);

  // Out and the visitor taps anything else (play, search, a menu…): it goes
  // straight back to its place. A menu's dimmed backdrop can also sit over
  // the gift (the Surah panel on a computer): a tap on the gift's spot then
  // closes the menu as usual and lets the gift out, so it never seems dead.
  const outRef = useRef(false);
  outRef.current = out;
  useEffect(() => {
    if (!geo) return;
    const onDown = (e: PointerEvent) => {
      const el = giftRef.current;
      if (!el || el.contains(e.target as Node)) return;
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= Math.max(0, r.left) - 6 && e.clientX <= r.right + 12 && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside) comeOut();
      else if (outRef.current) {
        clearTimeout(outTimer.current);
        setOut(false);
      }
    };
    window.addEventListener("pointerdown", onDown, true);
    return () => window.removeEventListener("pointerdown", onDown, true);
  }, [geo, comeOut]);

  // Back to its place when something else takes the screen.
  useEffect(() => {
    if (playing || suppressed) {
      clearTimeout(outTimer.current);
      setOut(false);
    }
  }, [playing, suppressed]);

  // The very first visit: one swing out by itself, never again.
  useEffect(() => {
    if (!ready || !enabled || !geo || playing || suppressed) return;
    try {
      if (localStorage.getItem(SUPPORT_PEEKED_KEY)) return;
    } catch {
      return;
    }
    const id = setTimeout(() => {
      if (dialogOpen() || document.hidden) return;
      try {
        localStorage.setItem(SUPPORT_PEEKED_KEY, "1");
      } catch {}
      comeOut(PEEK_MS);
    }, PEEK_AFTER_MS);
    return () => clearTimeout(id);
  }, [ready, enabled, geo, playing, suppressed, comeOut]);

  // The swing, drawn straight to the DOM each frame — the lantern's maths,
  // mirrored: tucked, its hook sits half past the left edge.
  useEffect(() => {
    if (!geo) return;
    const dx = -HIDDEN_PAST_PX - geo.ax;
    const len = Math.hypot(dx, DROP_PX);
    const hidden = Math.atan2(dx, DROP_PX);
    let speed = 0;
    const place = (a: number) => {
      const hx = geo.ax + len * Math.sin(a);
      const hy = geo.ay + len * Math.cos(a);
      threadRef.current?.setAttribute("d", threadPath(geo.ax, geo.ay, hx, hy, 1 - lean.current, speed));
      if (giftRef.current) giftRef.current.style.transform = `translate(${hx - W / 2}px, ${hy - 4}px)`;
      if (artRef.current) artRef.current.style.transform = `rotate(${-a * LEAN * lean.current}rad)`;
    };
    if (Number.isNaN(theta.current)) theta.current = hidden;
    if (reduce) {
      theta.current = out ? 0 : hidden;
      lean.current = 0;
      place(theta.current);
      return;
    }
    const from = theta.current;
    const leanFrom = lean.current;
    place(from);
    const start = performance.now();
    let frame = 0;
    let last = start;
    const step = (now: number) => {
      const sec = (now - start) / 1000;
      const dt = Math.max(1 / 240, (now - last) / 1000);
      last = now;
      const before = theta.current;
      lean.current = out ? Math.min(1, leanFrom + sec / 0.6) : Math.max(0, leanFrom - (sec * 1000) / BACK_MS);
      if (out) {
        theta.current = swingAngle(sec, from);
      } else {
        const k = Math.min(1, (sec * 1000) / BACK_MS);
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

  if (!ready || !enabled) return null;
  // Like the lantern it stays in place over open menus and panels; a tap
  // lets it out, and its sheet closes whatever else is open.
  const shown = Boolean(geo) && !suppressed;

  const onClick = (e: React.MouseEvent) => {
    haptic();
    // Out, or keyboard / screen reader (detail 0): straight to the sheet.
    if (out || e.detail === 0) {
      clearTimeout(outTimer.current);
      setOut(false);
      window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT));
    } else comeOut();
  };

  return (
    <div ref={rootRef} className={`${hidden ? "hidden " : ""}pointer-events-none absolute inset-0 z-40`}>
      {geo && (
        <motion.svg
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          initial={false}
          animate={{ opacity: shown ? (out ? 0.9 : 0.5) : 0 }}
        >
          <path ref={threadRef} d={`M ${geo.ax} ${geo.ay} L ${geo.ax} ${geo.ay + DROP_PX}`} fill="none" stroke="#e3c06d" strokeWidth={1} strokeLinecap="round" />
        </motion.svg>
      )}
      {geo && (
        <button
          ref={giftRef}
          type="button"
          onClick={onClick}
          aria-label={t(lang, "Support HuDa")}
          aria-hidden={!shown || undefined}
          tabIndex={shown ? 0 : -1}
          // Placed by its hook each frame; the strip on the right keeps the
          // half-hidden gift easy to tap.
          className="absolute left-0 top-0 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 after:absolute after:-right-3 after:inset-y-0 after:w-3 after:content-['']"
          style={{ width: W, pointerEvents: shown ? "auto" : "none", opacity: shown ? (out ? 1 : 0.8) : 0, transition: "opacity 0.25s" }}
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
                style={{ transformOrigin: "left center" }}
                className="pointer-events-none absolute left-full top-5 ml-2 whitespace-nowrap rounded-2xl rounded-bl-md border border-amber-200/30 bg-black/65 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
              >
                {t(lang, "Support HuDa")}
              </motion.span>
            )}
          </AnimatePresence>
          <span ref={artRef} className="block" style={{ transformOrigin: "50% 0%" }}>
            <GiftArt open={out} still={!!reduce || playing} />
          </span>
        </button>
      )}
    </div>
  );
}
