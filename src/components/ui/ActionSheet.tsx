"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

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
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={label}
            {...(keepAttr ? { [keepAttr]: "" } : {})}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-h-[88dvh] w-full max-w-[520px] flex-col rounded-t-[28px] border-b-0 text-sand-50",
              PLAYER_GLASS,
              className,
            )}
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
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
