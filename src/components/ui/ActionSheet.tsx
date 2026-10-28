"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useBackToClose } from "@/lib/useBackToClose";
import { useOnlyOneSheet } from "@/lib/useOnlyOneSheet";

/** Same glass as the player card, so sheets read as part of it. */
export const PLAYER_GLASS =
  "bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]";

/**
 * True on phones and tablets, where panels become bottom sheets: anything
 * below the lg breakpoint, plus touch-first screens up to iPad Pro landscape.
 */
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px), (pointer: coarse) and (max-width: 1366px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return mobile;
}

/**
 * Room the on-screen keyboard takes at the bottom of the layout viewport, and
 * the visible height. iOS leaves fixed elements behind the keyboard, so a sheet
 * with a text field lifts itself by this much.
 */
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState({ bottom: 0, height: 0 });
  useEffect(() => {
    const vv = window.visualViewport;
    if (!active || !vv) return;
    const update = () => {
      const bottom = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      // Lifts on phone virtual keyboards (> 150px) as well as iPad floating shortcut bars (~55px)
      setInset({ bottom: bottom > 20 ? bottom : 0, height: vv.height });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [active]);
  return inset;
}

/**
 * While a sheet is open, only its own scrolling lists move under a finger.
 * Elsewhere (header, scrim, a list at its end) iOS would pan the whole visual
 * viewport — with the keyboard up that drags the sheet and the scene behind it.
 */
function useSheetTouchLock(active: boolean, sheetRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    let startX = 0;
    let startY = 0;
    const onStart = (ev: TouchEvent) => {
      startX = ev.touches[0]?.clientX ?? 0;
      startY = ev.touches[0]?.clientY ?? 0;
    };
    const onMove = (ev: TouchEvent) => {
      if (ev.touches.length > 1) return;
      const target = ev.target as HTMLElement | null;
      if (target?.closest("input, textarea")) return;
      const dx = (ev.touches[0]?.clientX ?? 0) - startX;
      const dy = (ev.touches[0]?.clientY ?? 0) - startY;
      const sideways = Math.abs(dx) > Math.abs(dy);
      for (let el = target; el && el !== sheetRef.current?.parentElement; el = el.parentElement) {
        const { overflowX: ox, overflowY: oy } = getComputedStyle(el);
        if (sideways) {
          if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return;
          continue;
        }
        if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
          const atTop = el.scrollTop <= 0;
          const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
          if ((dy > 0 && atTop) || (dy < 0 && atEnd)) break;
          return; // the list scrolls itself
        }
      }
      if (ev.cancelable) ev.preventDefault();
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
    };
  }, [active, sheetRef]);
}

/**
 * Phone / tablet action sheet: slides up from the bottom over a dimmed scene, closes on
 * a scrim tap, Escape, or a swipe down on its handle. Portalled to <body> so a
 * transformed ancestor can't pin it to the wrong box.
 */
export function ActionSheet({
  open,
  onClose,
  children,
  className,
  labelledBy,
  label,
  keepAttr,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  label?: string;
  /** Extra data-* attribute to put on the sheet (e.g. an outside-press guard). */
  keepAttr?: string;
}) {
  const drag = useDragControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  useDialogFocus(open, sheetRef);
  useBackToClose(open, onClose);
  useOnlyOneSheet(open, onClose);
  const kb = useKeyboardInset(open);
  useSheetTouchLock(open, sheetRef);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 90 || info.velocity.y > 500) onClose();
  };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-scrim"
            className="fixed inset-0 z-[70] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            data-action-sheet=""
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={label}
            {...(keepAttr ? { [keepAttr]: "" } : {})}
            className={cn(
              // Docked to the bottom edge (no outer gap), round on top only; the
              // content pads itself clear of the home indicator.
              "fixed inset-x-2 bottom-0 z-[71] mx-auto flex max-h-[86dvh] max-w-[520px] flex-col overflow-hidden rounded-t-[28px] border-b-0 text-sand-50 outline-none",
              PLAYER_GLASS,
              className,
            )}
            // Keyboard up: sit on top of it and fit the visible area.
            style={
              kb.bottom > 0
                ? { bottom: kb.bottom, maxHeight: Math.round(kb.height * 0.92), height: "auto" }
                : undefined
            }
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {/* Handle: drag down to close */}
            <div
              className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
              onPointerDown={(ev) => drag.start(ev)}
              aria-hidden="true"
            >
              <span className="h-1 w-10 rounded-full bg-white/30" />
            </div>
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col px-4",
                // Every sheet keeps a gap at its bottom, above the home indicator
                // (a scrolling list included: it ends above the gap).
                kb.bottom > 0 ? "pb-3" : "pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.5rem))]",
              )}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
