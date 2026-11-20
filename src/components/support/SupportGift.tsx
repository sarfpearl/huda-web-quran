"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { t, useUiLang } from "@/lib/uiLang";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { OPEN_SUPPORT_EVENT, supportEnabled } from "@/lib/support";

/*
 * The gift tab: a small golden gift, wrapped with a ribbon, on a tab at the
 * left edge of the scene, with "Support HuDa" written beside it — so it reads
 * at once as "give HuDa a gift", not as a decoration. Tap → the sheet.
 *   - always in the same place on the home scene, also after someone has
 *     given (giving again is one tap away);
 *   - while a recitation plays it folds to the gift alone and keeps still;
 *   - hidden in reading mode and under any open sheet; takes no layout room.
 * Every few seconds the lid lifts a little and three sparks rise out of it.
 */

/** The gift: box, lid, ribbon and bow. `lid` / `sparks` are animated by the tab. */
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

/** The animated gift inside the tab. */
function LivingGift({ still }: { still: boolean }) {
  const lift = still ? undefined : { y: [0, 0, -2.6, -2.6, 0], rotate: [0, 0, -5, -5, 0] };
  const loop = { duration: 7, times: [0, 0.62, 0.7, 0.86, 0.95], repeat: Infinity, ease: "easeInOut" as const };
  return (
    <svg viewBox="0 0 32 32" className="h-[22px] w-[22px] overflow-visible" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6.5" y="14.5" width="19" height="13" rx="2" />
      <path d="M16 14.5v13" />
      {/* Sparks rising out of the opened box */}
      {!still &&
        [-5, 0, 5].map((dx, i) => (
          <motion.circle
            key={dx}
            cx={16 + dx}
            cy="12"
            r="1.1"
            fill="currentColor"
            stroke="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 1, 0], y: [0, 0, -6, -13], x: [0, 0, dx * 0.3, dx * 0.7] }}
            transition={{ duration: 7, times: [0, 0.68 + i * 0.02, 0.78 + i * 0.02, 0.98], repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      <motion.g animate={lift} transition={loop} style={{ transformOrigin: "6px 14px" }}>
        <rect x="4.5" y="10" width="23" height="4.5" rx="1.5" />
        <path d="M16 10v4.5" />
        <path d="M16 10c-1.6-3.6-6.6-5-7.4-2.4C8 9.6 12.4 10 16 10zM16 10c1.6-3.6 6.6-5 7.4-2.4C24 9.6 19.6 10 16 10z" />
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

  // After the first-open prompts (splash → location → install guide).
  useEffect(() => {
    let alive = true;
    setEnabled(supportEnabled());
    Promise.all([afterSplash(), afterStage("install")]).then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Any open sheet or dialog (content browser, prayer times, the tour…) hides it.
  useEffect(() => {
    if (!ready || !enabled) return;
    const check = () => setSheetOpen(!!document.querySelector('[role="dialog"], [aria-modal="true"]'));
    check();
    const id = window.setInterval(check, 700);
    return () => window.clearInterval(id);
  }, [ready, enabled]);

  const shown = ready && enabled && !suppressed && !sheetOpen;
  const still = !!reduce || playing;
  if (!ready || !enabled) return null;

  return (
    <motion.button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT))}
      aria-label={t(lang, "Support HuDa")}
      aria-hidden={shown ? undefined : true}
      tabIndex={shown ? undefined : -1}
      dir="ltr"
      className={`group absolute left-0 z-30 flex h-11 items-center overflow-hidden rounded-r-full border border-l-0 border-amber-300/40 bg-[linear-gradient(100deg,rgba(120,83,9,0.55),rgba(10,20,16,0.78)_70%)] py-1 pl-2 pr-1 text-amber-100 shadow-[0_6px_24px_rgba(0,0,0,0.45),0_0_22px_rgba(252,211,77,0.18)] outline-none backdrop-blur-md transition-[padding,opacity] duration-500 focus-visible:ring-2 focus-visible:ring-amber-300/70 active:scale-[0.97] top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+5.5rem)] ${shown ? "" : "pointer-events-none"} ${playing ? "opacity-70" : ""}`}
      initial={{ opacity: 0, x: reduce ? 0 : -60 }}
      animate={{ opacity: shown ? 1 : 0, x: shown || reduce ? 0 : -60 }}
      transition={{ duration: shown ? 0.9 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* A slow sheen across the tab while idle */}
      {!still && (
        <motion.span
          className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-amber-100/20 to-transparent"
          animate={{ x: ["0%", "0%", "420%"] }}
          transition={{ duration: 7, times: [0, 0.6, 0.8], repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        />
      )}
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-[#3a2604] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_14px_rgba(252,211,77,0.45)]">
        <LivingGift still={still} />
      </span>
      <span
        className={`relative grid transition-[grid-template-columns,opacity] duration-500 ${playing ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"}`}
        dir="auto"
      >
        <span className="min-w-0 overflow-hidden">
          <span className="block max-w-[12rem] truncate whitespace-nowrap pl-2.5 pr-3 text-[13px] font-semibold leading-none tracking-[0.01em]">
            {t(lang, "Support HuDa")}
          </span>
        </span>
      </span>
    </motion.button>
  );
}
