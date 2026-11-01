"use client";

import { useEffect, useRef } from "react";

/**
 * An open popup closes itself after a spell of no interaction (owner,
 * 2026-11-01: a sheet left open and untouched should get out of the way). The
 * timer starts when it opens and is reset by any pointer, key, wheel, touch or
 * scroll activity; when it runs out with no activity, `onClose` fires.
 *
 * Listeners sit on the window in the capture phase, so activity anywhere —
 * inside the popup or on the scene behind it — counts as "still being used".
 */
export function useAutoCloseIdle(open: boolean, onClose: () => void, delayMs = 7000) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => closeRef.current(), delayMs);
    };
    arm();

    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"] as const;
    const opts = { capture: true, passive: true } as const;
    events.forEach((e) => window.addEventListener(e, arm, opts));

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm, opts));
    };
  }, [open, delayMs]);
}
