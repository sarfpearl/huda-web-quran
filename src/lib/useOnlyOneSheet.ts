"use client";

import { useEffect, useId, useRef } from "react";

const EVENT = "huda-sheet-open";

/**
 * One sheet / panel at a time: when this one opens it tells the others, and
 * it closes itself when another one opens after it (owner's rule — e.g. the
 * prayer times sheet over the auto-opened content browser).
 */
export function useOnlyOneSheet(open: boolean, onClose: () => void) {
  const id = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
    const onOther = (ev: Event) => {
      if ((ev as CustomEvent<string>).detail !== id) close.current();
    };
    window.addEventListener(EVENT, onOther);
    return () => window.removeEventListener(EVENT, onOther);
  }, [open, id]);
}
