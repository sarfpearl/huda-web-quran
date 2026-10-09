"use client";

import { useEffect, useRef } from "react";

// Open dialogs, innermost last: Back closes only the top one (a sheet opened
// over the content browser, say).
const stack: symbol[] = [];
// Entries to drop after dialogs closed by themselves (×, scrim, a choice),
// batched so two closing together take one history.go().
let pendingPops = 0;
// popstate events caused by our own history.go(), not the visitor's Back.
let ownPops = 0;

function flushPops() {
  if (!pendingPops) return;
  const n = pendingPops;
  pendingPops = 0;
  ownPops++;
  window.history.go(-n);
}

if (typeof window !== "undefined") {
  // Registered once, before any dialog's listener; cleared after the event so
  // every dialog sees ownPops > 0 for it.
  window.addEventListener("popstate", () => {
    if (ownPops) queueMicrotask(() => (ownPops = Math.max(0, ownPops - 1)));
  });
}

/**
 * Back (Android's button, a browser's back, iOS's edge swipe) closes the open
 * dialog instead of leaving the site: opening pushes a same-URL history entry,
 * Back pops it and calls `onClose`; closing any other way drops that entry
 * again (only once the visitor has interacted with the page). Same URL, so the Next.js router just restores the current page. (The
 * address can move on under an open dialog as it follows the playing ayah —
 * the home re-applies it on popstate.)
 */
export function useBackToClose(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    // A dialog that opens by itself (the first-visit location prompt) gets no
    // history entry: Chrome marks one pushed without user activation skippable,
    // so Back would jump over it and leave the site anyway.
    if (!navigator.userActivation?.hasBeenActive) return;
    const id = Symbol("dialog");
    stack.push(id);
    window.history.pushState({ hudaDialog: true }, "");
    let popped = false;

    const onPop = () => {
      if (ownPops || stack[stack.length - 1] !== id) return;
      popped = true;
      stack.pop();
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (popped) return;
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      pendingPops++;
      queueMicrotask(flushPops);
    };
  }, [open]);
}
