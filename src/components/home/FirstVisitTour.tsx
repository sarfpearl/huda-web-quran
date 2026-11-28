"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import { useUiLang, isRtl } from "@/lib/uiLang";
import { tourT } from "@/lib/i18n/tour";
import { afterSplash, afterStage, finishStage } from "@/lib/onboarding";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { OPEN_TOUR_EVENT, TIP_STEPS, TOUR_DONE_KEY, TOUR_STEPS, TOUR_TIP_EVENT, type TourStep } from "@/lib/tour/steps";
import { LanternArt } from "@/components/feedback/FeedbackLantern";
import { CloseIcon } from "@/components/ui/Icon";

/*
 * First-visit tour: once per browser, right after the onboarding prompts
 * (lib/onboarding: splash → location → install guide → tour) and before the
 * content browser slides in. The feedback lantern's fanoos (the same lantern)
 * glides from control to control, its light on each one and the rest of the
 * screen dimmed, with one short line about each (owner, 2026-11-17: no
 * thread). Skip on every step; Settings › App tour shows it again. The steps
 * are data (lib/tour/steps); a control that isn't on screen is left out.
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
// The lantern's glide: a spring, a little under-damped so
// it settles with a small sway (stiffness 1/s², damping 1/s).
const SPRING_K = 55;
const SPRING_C = 10.5;
// How far it leans against its motion (rad per px/s), and at most.
const TILT_PER_SPEED = 0.0011;
const TILT_MAX = 0.45;
// On the first card it floats down into place from this far above.
const DROP_IN_PX = 28;

// A visitor who came by a deep link (/surah/36/3) hears the recitation first,
// no tour on arrival (owner, 2026-11-28): a small chip offers it once the
// first ayah has ended (or 15 s), on at most two visits, then never again.
const CHIP_KEY = "huda-tour-chip-offers";
const CHIP_MAX_VISITS = 2;
// An ignored chip goes by itself after this.
const CHIP_SHOW_MS = 25000;

function chipOffers() {
  try {
    return Number(localStorage.getItem(CHIP_KEY)) || 0;
  } catch {
    return CHIP_MAX_VISITS;
  }
}
function countChipOffer() {
  try {
    localStorage.setItem(CHIP_KEY, String(chipOffers() + 1));
  } catch {
    /* private mode */
  }
}

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
const tipKey = (name: string) => `huda-tip-${name}`;
function tipSeen(name: string) {
  try {
    return localStorage.getItem(tipKey(name)) === "1";
  } catch {
    return false;
  }
}
function markTipSeen(name: string) {
  try {
    localStorage.setItem(tipKey(name), "1");
  } catch {
    /* private mode: shown again next visit */
  }
}

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

export function FirstVisitTour({
  arrivedByLink = false,
  offerChip = false,
  chipHidden = false,
}: {
  arrivedByLink?: boolean;
  offerChip?: boolean;
  /** ⤢ text only: everything but the ayah is hidden — the invite too. */
  chipHidden?: boolean;
} = {}) {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [card, setCard] = useState({ w: 0, h: 0 });
  const [view, setView] = useState({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const lanternRef = useRef<HTMLDivElement>(null);
  /** Where the lantern's hook is going (this step) — read by the frame loop. */
  const goal = useRef<Point | null>(null);
  /** The lantern's hook now, and its speed (px/s). */
  const motion = useRef<{ cur: Point; vel: Point } | null>(null);
  const open = steps !== null;
  /** A one-off tip (TIP_STEPS) is showing, not the tour: closing it leaves
   *  the tour's own "done" and the onboarding stage alone. */
  const tipRef = useRef(false);
  useDialogFocus(open, dialogRef);

  const start = useCallback(() => {
    tipRef.current = false;
    const list = TOUR_STEPS.filter(present);
    setIndex(0);
    setSteps(list);
  }, []);

  // First visit: after the onboarding prompts. Otherwise the stage passes at once.
  useEffect(() => {
    const viaSearch = window.location.hash === "#search" || window.location.hash === "#browse";
    // By a deep link: nothing over the recitation; the chip below offers it.
    if (isDone() || viaSearch || arrivedByLink) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  // The deep-link chip: once per visit, when the home screen says it's due.
  const [chip, setChip] = useState(false);
  const chipOfferedRef = useRef(false);
  useEffect(() => {
    // Not while ⤢ text only hides the controls (phone landscape goes there
    // by itself): offered once they're back.
    if (!arrivedByLink || !offerChip || chipHidden || chipOfferedRef.current) return;
    chipOfferedRef.current = true;
    if (isDone() || chipOffers() >= CHIP_MAX_VISITS) return;
    // Armed: shown (and counted) once there's a free spot for it, below.
    setChip(true);
  }, [arrivedByLink, offerChip, chipHidden]);
  // Where the invite goes: never over the ayah, the player, the navigation
  // or the edge lantern (owner, 2026-11-28). The crescent belongs in the sky,
  // so up under the navigation first — the right, then by the time — else
  // down beside the player (right, left); on a phone, above the player or
  // under the header. The first free spot wins, measured while shown (the
  // ayah changes, the player grows, the window turns); it moves only when its
  // spot is taken.
  type ChipPos = { side: boolean; x: number; y: number; free: boolean };
  const [chipPos, setChipPos] = useState<ChipPos | null>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<string | null>(null);
  // Glides to a new spot only once it's shown at its first one.
  const [chipSettled, setChipSettled] = useState(false);
  const placed = Boolean(chipPos?.free);
  useEffect(() => {
    if (!placed) return setChipSettled(false);
    const id = window.setTimeout(() => setChipSettled(true), 300);
    return () => window.clearTimeout(id);
  }, [placed]);
  useEffect(() => {
    if (!chip) return setChipPos(null);
    spotRef.current = null;
    // The time it stays counts from when it's first seen.
    let hide = 0;
    const seen = () => {
      if (hide) return;
      countChipOffer();
      hide = window.setTimeout(() => setChip(false), CHIP_SHOW_MS);
    };
    const box = (el: Element | null | undefined, pad = 0) => {
      const r = el?.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0
        ? { l: r.left - pad, t: r.top - pad, r: r.right + pad, b: r.bottom + pad }
        : null;
    };
    type Box = NonNullable<ReturnType<typeof box>>;
    const overlap = (a: Box, o: Box) =>
      Math.max(0, Math.min(a.r, o.r) - Math.max(a.l, o.l)) * Math.max(0, Math.min(a.b, o.b) - Math.max(a.t, o.t));
    // The ayah (and its translation) as drawn: its box is the whole stage,
    // so the drawn pieces — the leaves — are what counts.
    const ayahBox = () => {
      const body = document.querySelector("[data-verse-stage] > div");
      if (!body) return null;
      let u: Box | null = null;
      for (const leaf of body.querySelectorAll("*")) {
        if (leaf.childElementCount) continue;
        const r = leaf.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (leaf instanceof HTMLElement && leaf.checkVisibility && !leaf.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        u = u
          ? { l: Math.min(u.l, r.left), t: Math.min(u.t, r.top), r: Math.max(u.r, r.right), b: Math.max(u.b, r.bottom) }
          : { l: r.left, t: r.top, r: r.right, b: r.bottom };
      }
      return u && { l: u.l - 12, t: u.t - 12, r: u.r + 12, b: u.b + 12 };
    };
    const measure = () => {
      const el = chipRef.current;
      if (!el) return;
      const side = innerWidth >= 768;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = innerWidth;
      const vh = innerHeight;
      const header = box(document.querySelector("[data-scene-header]"));
      const frame = box(document.querySelector("[data-player-frame]"));
      const lastBtn = box(findTarget("account"));
      const time = box(document.querySelector('[data-tour="prayer"] > *'));
      const right = Math.min(vw - EDGE, lastBtn?.r ?? vw - EDGE);
      const left = Math.max(EDGE, time?.l ?? EDGE);
      const gap = vw >= 1200 ? 24 : 16;
      const below = (header?.b ?? EDGE) + gap;
      const feedback = box(findTarget("feedback"), 8);
      const obstacles = [
        ayahBox(),
        frame && { ...frame, t: frame.t - 8 },
        header,
        feedback && { ...feedback, r: vw },
      ].filter(Boolean) as Box[];
      const clampX = (x: number) => Math.max(EDGE, Math.min(vw - EDGE - w, x));
      const clampY = (y: number) => Math.max(EDGE, Math.min(vh - EDGE - h, y));
      const playerBelow = frame && frame.t > vh / 2;
      const spots: [string, number, number][] = side
        ? [
            ["top-right", right - w, below],
            ["top-left", left, below],
            ...(playerBelow
              ? ([
                  ["player-right", right - w, frame!.b - h],
                  ["player-left", left, frame!.b - h],
                ] as [string, number, number][])
              : []),
            ["bottom-right", right - w, vh - EDGE - h],
          ]
        : [
            ["above-player", (vw - w) / 2, (playerBelow ? frame!.t - 12 : vh - EDGE) - h],
            ["under-header", (vw - w) / 2, below],
          ];
      const placed = spots.map(([name, x, y]) => {
        const r = { l: clampX(x), t: clampY(y), r: clampX(x) + w, b: clampY(y) + h };
        return { name, x: r.l, y: r.t, hit: obstacles.reduce((n, o) => n + overlap(r, o), 0) };
      });
      const current = placed.find((p) => p.name === spotRef.current);
      const pick =
        current && current.hit === 0 ? current : placed.find((p) => p.hit === 0) ?? placed.reduce((a, b) => (b.hit < a.hit ? b : a));
      spotRef.current = pick.name;
      // No free spot (a long ayah fills a phone): it waits, out of sight,
      // and fades back once the ayah leaves room.
      const free = pick.hit === 0;
      if (free) seen();
      setChipPos((p) =>
        p && p.side === side && p.x === pick.x && p.y === pick.y && p.free === free ? p : { side, x: pick.x, y: pick.y, free }
      );
    };
    measure();
    // Again once the layout (side or stacked) has rendered at its own size.
    const raf = requestAnimationFrame(measure);
    const id = window.setInterval(measure, 400);
    addEventListener("resize", measure);
    return () => {
      window.clearTimeout(hide);
      window.clearInterval(id);
      cancelAnimationFrame(raf);
      removeEventListener("resize", measure);
    };
  }, [chip, lang]);

  // One-off tips: once per browser, never over the tour, and only once the
  // control is on screen (the action that shows it has only just run).
  useEffect(() => {
    const onTip = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      const tip = TIP_STEPS[name];
      if (!tip || tipSeen(name)) return;
      window.setTimeout(() => {
        if (tip.target && !findTarget(tip.target)) return;
        setSteps((cur) => {
          if (cur) return cur;
          markTipSeen(name);
          tipRef.current = true;
          setIndex(0);
          return [tip];
        });
      }, 350);
    };
    window.addEventListener(TOUR_TIP_EVENT, onTip);
    return () => window.removeEventListener(TOUR_TIP_EVENT, onTip);
  }, []);

  // Settings › App tour.
  useEffect(() => {
    window.addEventListener(OPEN_TOUR_EVENT, start);
    return () => window.removeEventListener(OPEN_TOUR_EVENT, start);
  }, [start]);

  const close = useCallback(() => {
    const wasTip = tipRef.current;
    tipRef.current = false;
    if (!wasTip) markDone();
    setSteps(null);
    setRect(null);
    goal.current = null;
    motion.current = null;
    if (!wasTip) finishStage("tour");
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

  // The lantern's glide, drawn straight to the DOM every frame (no React
  // renders): it floats down into place on the first card, then each step it
  // glides to the next control, leaning against the move and settling with a
  // small sway.
  useEffect(() => {
    const g0 = goal.current;
    if (!open || !g0) return;
    motion.current ??= { cur: { x: g0.x, y: g0.y - DROP_IN_PX }, vel: { x: 0, y: 0 } };
    const { cur, vel } = motion.current;
    let frame = 0;
    let last = performance.now();
    const t0 = last;
    const draw = (tilt: number) => {
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
  }, [open, reduce]);

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

  if (typeof document === "undefined") return null;
  if (!open || !step) {
    if (!chip || chipHidden) return null;
    const pos = chipPos;
    return createPortal(
      <div className="pointer-events-none fixed inset-0 z-[260] overflow-hidden">
        <div
          ref={chipRef}
          role="group"
          aria-label={tourT(lang, "Take a 30-second tour?")}
          dir={isRtl(lang) ? "rtl" : "ltr"}
          className={`huda-invite absolute ${pos?.side ? "huda-invite-side" : "huda-invite-stacked"}${chipSettled ? " huda-invite-glide" : ""}${pos?.free ? "" : " huda-invite-wait"}`}
          style={{ top: pos?.y ?? 0, left: pos?.x ?? 0 }}
        >
          <div className="huda-invite-moon" aria-hidden="true">
            <span className="huda-invite-ripple" />
            <span className="huda-invite-halo" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span key={i} className={`huda-invite-spark huda-invite-spark-${i}`} />
            ))}
            <CrescentArt />
          </div>
          <div className="huda-invite-card pointer-events-auto">
            <span className="huda-invite-accent" aria-hidden="true" />
            <MosqueArt />
            <button
              type="button"
              onClick={() => setChip(false)}
              aria-label={tourT(lang, "Not now")}
              data-tip={tourT(lang, "Not now")}
              className="huda-invite-close absolute end-2 top-2 flex items-center justify-center rounded-full text-sand-50/60 hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
            <p className="huda-invite-title font-semibold text-sand-50">{tourT(lang, "Take a 30-second tour?")}</p>
            <p className="huda-invite-text text-sand-50/70">
              {tourT(lang, "Discover the features that make your Quran reading experience better.")}
            </p>
            <button
              type="button"
              onClick={() => {
                setChip(false);
                start();
              }}
              className="huda-invite-go relative inline-flex items-center gap-1.5 rounded-full font-semibold text-[#2a1a05] cursor-pointer"
            >
              {tourT(lang, "Begin")}
              <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </button>
          </div>
        </div>
        <style>{CHIP_CSS}</style>
      </div>,
      document.body
    );
  }

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

      {/* The lantern, placed every frame by its glide (above). */}
      <div
        ref={lanternRef}
        className="pointer-events-none absolute left-0 top-0"
        style={{ width: LANTERN_W, transformOrigin: `${LANTERN_W / 2}px 0` }}
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
          {/* A soft flower (rounded petals) peeking in from the top-right
              corner; it stays in the corner, clear of the title and text. */}
          <svg
            className="pointer-events-none absolute -right-[46px] -top-[46px] h-[124px] w-[124px] text-amber-200/[0.16]"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            aria-hidden="true"
          >
            <ellipse key="o0" cx="60" cy="30" rx="11" ry="26" transform="rotate(0 60 60)" />
            <ellipse key="o1" cx="60" cy="30" rx="11" ry="26" transform="rotate(45 60 60)" />
            <ellipse key="o2" cx="60" cy="30" rx="11" ry="26" transform="rotate(90 60 60)" />
            <ellipse key="o3" cx="60" cy="30" rx="11" ry="26" transform="rotate(135 60 60)" />
            <ellipse key="o4" cx="60" cy="30" rx="11" ry="26" transform="rotate(180 60 60)" />
            <ellipse key="o5" cx="60" cy="30" rx="11" ry="26" transform="rotate(225 60 60)" />
            <ellipse key="o6" cx="60" cy="30" rx="11" ry="26" transform="rotate(270 60 60)" />
            <ellipse key="o7" cx="60" cy="30" rx="11" ry="26" transform="rotate(315 60 60)" />
            <ellipse key="i0" cx="60" cy="44" rx="6" ry="14" transform="rotate(22.5 60 60)" />
            <ellipse key="i1" cx="60" cy="44" rx="6" ry="14" transform="rotate(67.5 60 60)" />
            <ellipse key="i2" cx="60" cy="44" rx="6" ry="14" transform="rotate(112.5 60 60)" />
            <ellipse key="i3" cx="60" cy="44" rx="6" ry="14" transform="rotate(157.5 60 60)" />
            <ellipse key="i4" cx="60" cy="44" rx="6" ry="14" transform="rotate(202.5 60 60)" />
            <ellipse key="i5" cx="60" cy="44" rx="6" ry="14" transform="rotate(247.5 60 60)" />
            <ellipse key="i6" cx="60" cy="44" rx="6" ry="14" transform="rotate(292.5 60 60)" />
            <ellipse key="i7" cx="60" cy="44" rx="6" ry="14" transform="rotate(337.5 60 60)" />
            <circle cx="60" cy="60" r="7" />
            <circle cx="60" cy="60" r="2.5" fill="currentColor" />
          </svg>

          <div aria-live="polite" className="relative">
            {total > 1 && (
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-amber-200/60">
                {tourT(lang, "{n} of {total}", { n: index + 1, total })}
              </p>
            )}
            <h2 id={titleId} className="text-[17px] font-semibold leading-snug text-amber-100">
              {tourT(lang, step.title)}
            </h2>
            <p id={textId} className="mt-1.5 text-[13.5px] leading-relaxed text-sand-100/85">
              {tourT(lang, step.text)}
            </p>
          </div>

          {/* Beads (a tasbih), one per step: the lit one is here. A one-card
              tip has none, nor a counter. */}
          <div className={`relative mt-3.5 items-center gap-[5px] ${total > 1 ? "flex" : "hidden"}`} aria-hidden="true">
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

/** The invite's crescent (gold, lit from the right). */
function CrescentArt() {
  return (
    <svg viewBox="0 0 48 48" className="huda-invite-crescent relative block h-full w-full overflow-visible">
      <defs>
        <linearGradient id="huda-crescent-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff0c2" />
          <stop offset="55%" stopColor="#f3c869" />
          <stop offset="100%" stopColor="#c98f2c" />
        </linearGradient>
      </defs>
      <path
        d="M30.5 6.5A19 19 0 1 0 41.5 36 15.5 15.5 0 1 1 30.5 6.5Z"
        fill="url(#huda-crescent-gold)"
      />
    </svg>
  );
}

/** A faint mosque on the card's lower corner (decoration). */
function MosqueArt() {
  return (
    <svg viewBox="0 0 72 40" aria-hidden="true" className="huda-invite-mosque pointer-events-none absolute bottom-0 end-2">
      <defs>
        <linearGradient id="huda-mosque-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0cf7a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#f0cf7a" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <g fill="url(#huda-mosque-gold)">
        <rect x="64" y="6" width="3" height="34" rx="1" />
        <path d="M65.5 1 L67 6 H64 Z" />
        <rect x="6" y="18" width="2.4" height="22" rx="1" />
        <path d="M7.2 14 L8.4 18 H6 Z" />
        <path d="M24 40 V28 A12 12 0 0 1 48 28 V40 Z" />
        <path d="M36 15 v-4" stroke="#f0cf7a" strokeOpacity="0.7" strokeWidth="1" />
        <path d="M13 40 V32 A6 6 0 0 1 25 32 V40 Z" />
        <path d="M47 40 V32 A6 6 0 0 1 59 32 V40 Z" />
      </g>
    </svg>
  );
}

const CHIP_CSS = `
.huda-invite { --moon: 56px; --card-w: 320px; display: flex; align-items: flex-start; gap: 14px; }
/* Waiting for room: out of sight, its animations held at their start. */
.huda-invite { transition: opacity 0.6s ease, visibility 0.6s; }
.huda-invite-wait { opacity: 0; visibility: hidden; pointer-events: none; }
.huda-invite-wait, .huda-invite-wait * { animation-play-state: paused !important; }
.huda-invite-glide { transition: opacity 0.6s ease, visibility 0.6s, top 0.9s cubic-bezier(0.22, 1, 0.36, 1), left 0.9s cubic-bezier(0.22, 1, 0.36, 1); }
/* First the crescent rises into the sky, then, 1.5 s on, the card. */
.huda-invite-moon { animation: huda-invite-moon-in 1.2s cubic-bezier(0.22, 1, 0.36, 1) both; }
.huda-invite-side { flex-direction: row; }
.huda-invite-stacked { --moon: 40px; display: block; width: min(var(--card-w), calc(100vw - 32px)); padding-top: calc(var(--moon) - 8px); }
@media (min-width: 768px) and (max-width: 1199px) { .huda-invite { --moon: 44px; --card-w: 280px; gap: 10px; } }
@media (max-width: 767px) { .huda-invite { --card-w: 320px; } }

.huda-invite-moon { position: relative; flex: none; width: var(--moon); height: var(--moon); margin-top: 6px; }
.huda-invite-stacked .huda-invite-moon { position: absolute; top: 0; inset-inline-start: 14px; margin: 0; z-index: 1; }
.huda-invite-crescent { filter: drop-shadow(0 0 6px rgba(245, 190, 90, 0.55)); animation: huda-invite-float 8s ease-in-out 1.2s infinite; }
.huda-invite-halo { position: absolute; inset: -60%; border-radius: 9999px; pointer-events: none;
  background: radial-gradient(closest-side, rgba(245, 190, 90, 0.3), rgba(245, 190, 90, 0.1) 55%, transparent 100%);
  animation: huda-invite-breathe 6s ease-in-out infinite; }
.huda-invite-ripple { position: absolute; inset: 0; border-radius: 9999px; pointer-events: none;
  border: 1.5px solid rgba(240, 207, 122, 0.7); opacity: 0; animation: huda-invite-ripple 6s ease-out 0.3s infinite; }
.huda-invite-spark { position: absolute; width: 4px; height: 4px; border-radius: 9999px; background: #ffe7a6;
  box-shadow: 0 0 8px 1px rgba(246, 217, 138, 0.95); opacity: 0; animation: huda-invite-spark 5s ease-out 1s infinite; }
.huda-invite-spark-0 { left: 6%; top: 72%; animation-delay: 0s; }
.huda-invite-spark-1 { left: 86%; top: 14%; animation-delay: 0.7s; width: 3px; height: 3px; }
.huda-invite-spark-2 { left: 64%; top: 96%; animation-delay: 1.4s; }
.huda-invite-spark-3 { left: -18%; top: 24%; animation-delay: 2.1s; width: 3px; height: 3px; }
.huda-invite-spark-4 { left: 108%; top: 58%; animation-delay: 0.35s; width: 3px; height: 3px; }
.huda-invite-spark-5 { left: 36%; top: -16%; animation-delay: 1.05s; }
.huda-invite-spark-6 { left: -8%; top: 100%; animation-delay: 1.75s; width: 3px; height: 3px; }
.huda-invite-spark-7 { left: 96%; top: 92%; animation-delay: 2.45s; width: 3px; height: 3px; }

.huda-invite-card { position: relative; overflow: hidden; width: min(var(--card-w), calc(100vw - 32px));
  border-radius: 20px; border: 1px solid rgba(240, 207, 122, 0.28);
  background: linear-gradient(155deg, rgba(36, 30, 20, 0.86), rgba(10, 12, 14, 0.9) 60%);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 18px rgba(245, 184, 74, 0.08);
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  padding: 18px 40px 18px 20px;
  transform-origin: 0 20%;
  animation: huda-invite-in 1.1s cubic-bezier(0.22, 1, 0.36, 1) 1.5s both; }
[dir=rtl] .huda-invite-card { padding: 18px 20px 18px 40px; transform-origin: 100% 20%; }
.huda-invite-stacked .huda-invite-card { width: 100%; padding: 16px 38px 14px 16px; transform-origin: 20% 0; }
[dir=rtl].huda-invite-stacked .huda-invite-card { padding: 16px 16px 14px 38px; }
/* The animated accent: a 1.5px gold light along the top edge. */
.huda-invite-accent { position: absolute; left: 0; right: 0; top: 0; height: 1.5px; pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 228, 160, 0.9) 50%, transparent 100%);
  background-size: 40% 100%; background-repeat: no-repeat; animation: huda-invite-sweep 6s ease-in-out 3s infinite; }
.huda-invite-mosque { width: 64px; height: 36px; opacity: 0.55; }
.huda-invite-title { font-size: 16px; line-height: 1.3; }
.huda-invite-text { margin-top: 6px; font-size: 13px; line-height: 1.45; position: relative; }
.huda-invite-go { margin-top: 14px; padding: 7px 16px; font-size: 14px; min-height: 36px;
  background: linear-gradient(180deg, #f6d98a, #e2ad4b); box-shadow: inset 0 0 0 1px rgba(255, 236, 180, 0.45), 0 2px 8px rgba(245, 184, 74, 0.25); }
.huda-invite-go:hover { filter: brightness(1.07); }
.huda-invite-close { width: 30px; height: 30px; }
@media (min-width: 768px) and (max-width: 1199px) {
  .huda-invite-card { padding: 15px 36px 15px 16px; }
  .huda-invite-title { font-size: 15px; }
  .huda-invite-text { font-size: 12px; }
  .huda-invite-go { margin-top: 12px; font-size: 13px; padding: 6px 14px; min-height: 34px; }
  .huda-invite-mosque { width: 54px; height: 30px; }
}
@media (max-width: 767px) {
  .huda-invite-title { font-size: 15px; }
  .huda-invite-text { font-size: 12.5px; margin-top: 4px; }
  /* Touch: a full 40px tap target. */
  .huda-invite-go { margin-top: 10px; min-height: 40px; padding: 8px 18px; }
  .huda-invite-close { width: 36px; height: 36px; top: 4px; inset-inline-end: 4px; }
  .huda-invite-mosque { width: 50px; height: 28px; }
}
/* Short screens (phone landscape): no description, tighter. */
@media (max-height: 480px) {
  .huda-invite { --card-w: 270px; }
  .huda-invite-stacked { --moon: 32px; }
  .huda-invite-text { display: none; }
  .huda-invite-go { margin-top: 8px; min-height: 36px; padding: 6px 14px; }
}
@keyframes huda-invite-in { from { opacity: 0; transform: translateY(8px) scale(0.88); } to { opacity: 1; transform: none; } }
@keyframes huda-invite-moon-in { from { opacity: 0; transform: translateY(14px) scale(0.7); } to { opacity: 1; transform: none; } }
@keyframes huda-invite-float { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
@keyframes huda-invite-breathe { 0%, 100% { opacity: 0.65; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
@keyframes huda-invite-ripple { 0% { opacity: 0.85; transform: scale(0.7); } 45%, 100% { opacity: 0; transform: scale(2.6); } }
@keyframes huda-invite-spark { 0% { opacity: 0; transform: translateY(6px) scale(0.4); } 30% { opacity: 1; transform: translateY(0) scale(1.1); } 100% { opacity: 0; transform: translateY(-18px) scale(0.6); } }
@keyframes huda-invite-sweep { 0% { background-position: -60% 0; } 55%, 100% { background-position: 160% 0; } }
@media (prefers-reduced-motion: reduce) {
  .huda-invite-moon, .huda-invite-crescent, .huda-invite-card, .huda-invite-accent, .huda-invite-halo { animation: none; }
  /* Waiting for room: out of sight, its animations held at their start. */
.huda-invite { transition: opacity 0.6s ease, visibility 0.6s; }
.huda-invite-wait { opacity: 0; visibility: hidden; pointer-events: none; }
.huda-invite-wait, .huda-invite-wait * { animation-play-state: paused !important; }
  .huda-invite-glide { transition: opacity 0.6s ease, visibility 0.6s; }
  .huda-invite-ripple, .huda-invite-spark { display: none; }
}
`;
