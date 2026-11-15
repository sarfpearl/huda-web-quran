"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { t, isRtl, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { FEEDBACK_PEEKED_KEY, FEEDBACK_UI_ATTR } from "@/lib/feedback";
import { haptic } from "@/lib/haptics";

const FeedbackSheet = dynamic(() => import("./FeedbackSheet"), { ssr: false });

/**
 * Where the lantern hangs: the right edge, just under the header row and the
 * home pills — clear of the player dock even on short phones. Change it here
 * (the sponsor entry may take another edge).
 */
export const FEEDBACK_LANTERN_SPOT: CSSProperties = {
  right: 0,
  top: "calc(max(env(safe-area-inset-top), var(--vv-top, 0px)) + 7.5rem)",
};

/** How long the lantern stays out before it slips back to the edge. */
const OUT_MS = 8000;
/** First visit: how long a Surah must have been playing before the one full peek. */
const PEEK_AFTER_PLAY_MS = 15000;
/** At rest only this much of the lantern shows at the edge, faint. */
const REST_SHOWN_PX = 20;
const LANTERN_W = 34;

/** Something modal is up (a sheet, the install guide, a picker): don't peek over it. */
const dialogOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"], [data-action-sheet]'));

/**
 * The feedback entry: a small lantern (fanoos) hanging at the screen edge,
 * very faint. On the first visit it swings in fully once while a Surah plays,
 * with a "Feedback" speech bubble, then slips back. First tap brings it out;
 * a second tap opens the feedback form (keyboard: one press opens it).
 */
export function FeedbackLantern({ playing }: { playing: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [out, setOut] = useState(false);
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const outTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const comeOut = useCallback((ms = OUT_MS) => {
    setOut(true);
    // Out means a tap may follow: fetch the form now so it opens at once.
    void import("./FeedbackSheet");
    clearTimeout(outTimer.current);
    outTimer.current = setTimeout(() => setOut(false), ms);
  }, []);
  useEffect(() => () => clearTimeout(outTimer.current), []);

  // Shown only after the first-open steps, so it never sits over them.
  useEffect(() => {
    let live = true;
    void Promise.all([afterSplash(), afterStage("location"), afterStage("install")]).then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  // The one full peek on the first visit: some way into a recitation.
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
      comeOut(5000);
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

  if (!ready) return null;
  const label = t(lang, "Feedback");

  return (
    <>
      <div
        ref={rootRef}
        data-feedback-lantern=""
        {...{ [FEEDBACK_UI_ATTR]: "" }}
        className="pointer-events-none absolute z-40"
        style={FEEDBACK_LANTERN_SPOT}
      >
        <motion.button
          type="button"
          onClick={onClick}
          aria-label={t(lang, "Open feedback")}
          aria-hidden={open || undefined}
          tabIndex={open ? -1 : 0}
          className="pointer-events-auto relative flex items-start gap-1 pr-1.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded-l-2xl before:absolute before:-left-3 before:inset-y-0 before:w-3 before:content-['']"
          initial={false}
          animate={{
            x: out ? 0 : LANTERN_W + 6 - REST_SHOWN_PX,
            opacity: open ? 0 : out ? 1 : 0.6,
          }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", damping: 18, stiffness: 140 }}
        >
          <AnimatePresence>
            {out && (
              <motion.span
                key="bubble"
                dir={isRtl(lang) ? "rtl" : undefined}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.2, delay: reduce ? 0 : 0.15 }}
                style={{ transformOrigin: "right center" }}
                className="relative mt-5 flex items-center gap-1.5 whitespace-nowrap rounded-2xl rounded-br-md border border-amber-200/30 bg-black/65 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-[0_6px_20px_rgba(0,0,0,0.5)] backdrop-blur-md"
              >
                <ChatDots />
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          <motion.span
            className="block"
            style={{ transformOrigin: "50% 0%" }}
            animate={out && !reduce ? { rotate: [0, 9, -6, 3.5, -1.5, 0] } : { rotate: 0 }}
            transition={{ duration: 2.4, ease: "easeInOut" }}
          >
            <LanternArt glow={out} />
          </motion.span>
        </motion.button>
      </div>
      {everOpened && (
        <FeedbackSheet open={open} onClose={() => setOpen(false)} captureRoot={() => rootRef.current?.parentElement ?? null} />
      )}
    </>
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

/** A small brass fanoos on a cord: domed cap, arched glass panes, a flame. */
function LanternArt({ glow }: { glow: boolean }) {
  return (
    <svg viewBox="0 0 34 74" width={LANTERN_W} height="74" aria-hidden="true" className="block overflow-visible">
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
      <circle cx="17" cy="46" r="17" fill="#f5b84a" opacity={glow ? 0.28 : 0.12} style={{ filter: "blur(5px)" }} />
      {/* Cord + ring */}
      <line x1="17" y1="0" x2="17" y2="11" stroke="#e8c877" strokeWidth="1" opacity="0.8" />
      <circle cx="17" cy="13" r="2.2" fill="none" stroke="url(#fl-brass)" strokeWidth="1.4" />
      {/* Dome cap with finial */}
      <path d="M8 26 Q17 13 26 26 Z" fill="url(#fl-brass)" />
      <rect x="6.5" y="25.5" width="21" height="3" rx="1.2" fill="url(#fl-brass)" />
      {/* Glass body */}
      <path d="M8 29 L26 29 L28.5 56 L5.5 56 Z" fill="url(#fl-glow)" stroke="url(#fl-brass)" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Arched panes */}
      <path d="M12 54 V38 Q12 33 14.6 33 Q17 33 17 38 V54" fill="none" stroke="#c9963e" strokeWidth="0.9" opacity="0.85" />
      <path d="M17 54 V38 Q17 33 19.4 33 Q22 33 22 38 V54" fill="none" stroke="#c9963e" strokeWidth="0.9" opacity="0.85" />
      {/* Flame */}
      <path d="M17 50.5 C14.6 47.8 15.4 45 17 42 C18.6 45 19.4 47.8 17 50.5 Z" fill="#fff4cf" opacity={glow ? 1 : 0.8} />
      {/* Base */}
      <rect x="4.5" y="56" width="25" height="3.2" rx="1.4" fill="url(#fl-brass)" />
      <path d="M11 59.2 L23 59.2 L19.5 64 L14.5 64 Z" fill="url(#fl-brass)" />
      <circle cx="17" cy="66.5" r="1.6" fill="#e8c877" />
    </svg>
  );
}
