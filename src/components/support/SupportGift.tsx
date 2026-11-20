"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { isRtl, t, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { haptic } from "@/lib/haptics";
import { OPEN_SUPPORT_EVENT, supportEnabled } from "@/lib/support";

/*
 * The support entry: a small wrapped gift — emerald box, gold ribbon and bow,
 * HuDa's eight-point star stamped on it — tucked half behind the left edge,
 * just under the header. The feedback lantern's quiet partner on the other side.
 *   - At rest only half of it shows, floating a little.
 *   - A tap lets it out: it slides in with a sway, the lid lifts, a warm light
 *     and a few sparks rise, and "Support HuDa" appears beside it. A second tap
 *     opens the sheet. Untouched for 12 s it tucks itself back.
 *   - Once a visit, after a quiet spell with nothing playing, it comes out by
 *     itself for a few seconds and goes back. Never while a recitation plays.
 *   - Always in the same place (also after someone has given). Hidden only in
 *     reading mode and under an open sheet.
 */

/** Out and untouched this long → back to its place. */
const OUT_MS = 12000;
/** Its own peek: after this much quiet (nothing playing, no sheet) in a visit… */
const PEEK_AFTER_MS = 25000;
/** …it stays out this long, then tucks back. */
const PEEK_MS = 6000;
const W = 40;
/** Tucked: this much of it sits past the left edge. */
const TUCK_X = -W / 2 - 2;
/** Out: where it rests, clear of the edge. */
const OUT_X = 10;

const dialogOpen = () => Boolean(document.querySelector('[role="dialog"], [aria-modal="true"], [data-action-sheet]'));

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

export function SupportGift({ playing, suppressed }: { playing: boolean; suppressed: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [out, setOut] = useState(false);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const peeked = useRef(false);
  const sway = useAnimationControls();

  useEffect(() => {
    let alive = true;
    setEnabled(supportEnabled());
    Promise.all([afterSplash(), afterStage("location"), afterStage("install")]).then(() => alive && setReady(true));
    return () => {
      alive = false;
      clearTimeout(outTimer.current);
    };
  }, []);

  // An open sheet or dialog hides it (and sends it back to its place).
  useEffect(() => {
    if (!ready || !enabled) return;
    const check = () => setSheetOpen(dialogOpen());
    check();
    const id = window.setInterval(check, 600);
    return () => window.clearInterval(id);
  }, [ready, enabled]);

  const comeOut = useCallback((forMs = OUT_MS) => {
    setOut(true);
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setOut(false), forMs);
  }, []);

  // Back to its place when something else takes the screen.
  useEffect(() => {
    if (playing || suppressed || sheetOpen) {
      clearTimeout(outTimer.current);
      setOut(false);
    }
  }, [playing, suppressed, sheetOpen]);

  // Its one peek a visit, after a quiet spell.
  useEffect(() => {
    if (!ready || !enabled || playing || suppressed || sheetOpen || peeked.current || reduce) return;
    const id = setTimeout(() => {
      if (dialogOpen() || document.hidden) return;
      peeked.current = true;
      comeOut(PEEK_MS);
    }, PEEK_AFTER_MS);
    return () => clearTimeout(id);
  }, [ready, enabled, playing, suppressed, sheetOpen, reduce, comeOut]);

  // The sway as it comes out: a few swings that die away, like a lantern let go.
  useEffect(() => {
    if (reduce) return;
    if (out) void sway.start({ rotate: [0, 14, -9, 5, -2.5, 0], transition: { duration: 1.8, ease: "easeOut" } });
    else void sway.start({ rotate: [0, -6, 0], transition: { duration: 0.7, ease: "easeOut" } });
  }, [out, reduce, sway]);

  if (!ready || !enabled) return null;
  const shown = !suppressed && !sheetOpen;
  const still = !!reduce || playing;

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
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={t(lang, "Support HuDa")}
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? 0 : -1}
      className="absolute left-0 z-30 block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+5.25rem)] after:absolute after:-left-2 after:inset-y-0 after:w-6 after:content-['']"
      style={{ width: W, pointerEvents: shown ? "auto" : "none" }}
      initial={{ opacity: 0, x: TUCK_X - 14 }}
      animate={{ opacity: shown ? (out ? 1 : playing ? 0.55 : 0.85) : 0, x: out ? OUT_X : TUCK_X }}
      transition={out ? { type: "spring", stiffness: 140, damping: 14 } : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* At rest: a slow float, so it feels placed in the scene, not stuck on it */}
      <motion.span
        className="block"
        animate={still || out ? { y: 0 } : { y: [0, -2.5, 0] }}
        transition={{ duration: 5.5, repeat: still || out ? 0 : Infinity, ease: "easeInOut" }}
      >
        <motion.span className="block" animate={sway} style={{ transformOrigin: "50% 15%" }}>
          <GiftArt open={out} still={still} />
        </motion.span>
      </motion.span>

      <AnimatePresence>
        {out && (
          <motion.span
            key="bubble"
            dir={isRtl(lang) ? "rtl" : undefined}
            initial={{ opacity: 0, scale: 0.85, x: -4 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -4 }}
            transition={{ duration: 0.22, delay: reduce ? 0 : 0.45 }}
            style={{ transformOrigin: "left center" }}
            className="pointer-events-none absolute left-full top-[18px] ml-2 whitespace-nowrap rounded-2xl rounded-bl-md border border-amber-200/30 bg-black/65 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            {t(lang, "Support HuDa")}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
