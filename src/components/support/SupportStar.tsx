"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { t, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import {
  OPEN_SUPPORT_EVENT,
  SUPPORT_FIRST_SEEN_KEY,
  SUPPORT_STAR_HIDDEN_KEY,
  supportEnabled,
} from "@/lib/support";

/*
 * The edge star: HuDa's own eight-point star (the splash's loading mark),
 * half tucked behind the left edge of the sky like a star at the horizon.
 * Tap → the "Help keep HuDa free" sheet. It never asks for attention:
 *   - only while nothing plays and the screen has been quiet a while — gone
 *     the moment a recitation starts, in reading mode, or while any sheet is open;
 *   - not in a visitor's first days (production); it comes back after each
 *     visit to the sheet, so giving again is always one tap away;
 *     "Hide the star" in the sheet ends it for good;
 *   - takes no room: a small overlay on the empty edge of the scene.
 */

const QUIET_MS = 6000;
const FIRST_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
/** Fired when the star's storage changes (hidden / opened). */
export const SUPPORT_STAR_CHANGED_EVENT = "huda:support-star-changed";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function starAllowed(): boolean {
  if (!supportEnabled() || read(SUPPORT_STAR_HIDDEN_KEY) === "1") return false;
  const now = Date.now();
  // Previews and local runs show it at once, so the owner can review it.
  if (process.env.NEXT_PUBLIC_VERCEL_ENV !== "production") return true;
  let first = Number(read(SUPPORT_FIRST_SEEN_KEY) ?? 0);
  if (!first) {
    first = now;
    try {
      localStorage.setItem(SUPPORT_FIRST_SEEN_KEY, String(now));
    } catch {
      /* private mode: just wait this visit out */
    }
  }
  return now - first >= FIRST_DAYS_MS;
}

/** The eight-point star: two rounded squares, one turned 45°. */
export function StarMark({ className, strokeWidth = 2.4 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" aria-hidden="true">
      <rect x="15" y="15" width="34" height="34" rx="3.5" stroke="currentColor" strokeWidth={strokeWidth} />
      <rect x="15" y="15" width="34" height="34" rx="3.5" stroke="currentColor" strokeWidth={strokeWidth} transform="rotate(45 32 32)" opacity="0.6" />
      <circle cx="32" cy="32" r="4" fill="currentColor" />
    </svg>
  );
}

export function SupportStar({ playing, suppressed }: { playing: boolean; suppressed: boolean }) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [quiet, setQuiet] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  // After the first-open prompts (splash → location → install guide).
  useEffect(() => {
    let alive = true;
    Promise.all([afterSplash(), afterStage("install")]).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const update = () => setAllowed(starAllowed());
    update();
    window.addEventListener(SUPPORT_STAR_CHANGED_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SUPPORT_STAR_CHANGED_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Quiet = nothing playing for a few seconds. Playing hides it at once.
  useEffect(() => {
    setQuiet(false);
    if (playing || suppressed) return;
    const id = window.setTimeout(() => setQuiet(true), QUIET_MS);
    return () => window.clearTimeout(id);
  }, [playing, suppressed]);

  // Any open sheet or dialog (content browser, prayer times, the tour…) hides it.
  useEffect(() => {
    if (!ready || !allowed) return;
    const check = () => setSheetOpen(!!document.querySelector('[role="dialog"], [aria-modal="true"]'));
    check();
    const id = window.setInterval(check, 700);
    return () => window.clearInterval(id);
  }, [ready, allowed]);

  const shown = ready && allowed && quiet && !playing && !suppressed && !sheetOpen;
  // Unmounted on a timer after it fades (AnimatePresence's exit never finished
  // here, which left the star up during recitation).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (shown) return setMounted(true);
    const id = window.setTimeout(() => setMounted(false), 400);
    return () => window.clearTimeout(id);
  }, [shown]);
  if (!mounted && !shown) return null;

  return (
    <motion.button
      key="support-star"
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT))}
      aria-label={t(lang, "Support HuDa")}
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? undefined : -1}
      title={t(lang, "Support HuDa")}
      className={`group absolute left-0 z-30 flex h-12 items-center outline-none top-[calc(var(--vv-top,0px)+max(30%,140px))] ${shown ? "" : "pointer-events-none"}`}
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: -18 }}
      animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: reduce ? 0 : -18 }}
      transition={shown ? { duration: reduce ? 0.6 : 2.2, ease: [0.22, 1, 0.36, 1] } : { duration: 0.35 }}
    >
      {/* The star sits half behind the edge; hover / keyboard focus draws it out. */}
      <span className="relative -ml-[13px] grid h-12 w-12 place-items-center transition-transform duration-500 ease-out group-hover:translate-x-[16px] group-focus-visible:translate-x-[16px]">
        <motion.span
          className="absolute inset-1.5 rounded-full bg-[radial-gradient(circle,rgba(252,211,77,0.35),transparent_68%)]"
          animate={reduce ? undefined : { opacity: [0.35, 0.9, 0.35], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
        <motion.span
          className="relative block text-amber-300 opacity-60 drop-shadow-[0_0_6px_rgba(252,211,77,0.55)] transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100"
          animate={reduce ? undefined : { rotate: [0, 45] }}
          transition={{ duration: 24, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        >
          <StarMark className="h-[26px] w-[26px]" />
        </motion.span>
      </span>
      {/* Outside the button's box (absolute), so the hidden label is never a tap target. */}
      <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-amber-300/25 bg-black/55 px-3 py-1 text-[12px] font-medium text-amber-100 opacity-0 backdrop-blur-sm transition-all duration-500 -translate-x-1 group-hover:translate-x-3 group-hover:opacity-100 group-focus-visible:translate-x-3 group-focus-visible:opacity-100">
        {t(lang, "Support HuDa")}
      </span>
    </motion.button>
  );
}
