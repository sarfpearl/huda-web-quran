"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, innermost last: only the top one traps Tab (a sheet opened over
// the content browser, say).
const stack: HTMLElement[] = [];

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.closest("[inert], [aria-hidden='true']") && el.getClientRects().length > 0,
  );
}

/**
 * Keyboard / screen-reader focus for a dialog or sheet: on open, focus moves to
 * the dialog itself (not its first field, which would pop the phone keyboard);
 * Tab and Shift+Tab stay inside it; on close, focus goes back to whatever had
 * it before (usually the button that opened it) — or to `returnTo` when it
 * opened by itself (nothing had focus). The element gets tabIndex -1.
 */
export function useDialogFocus(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  returnTo?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const had = document.activeElement as HTMLElement | null;
    const before = had && had !== document.body ? had : returnTo?.current ?? null;
    let node: HTMLElement | null = null;
    // The dialog may mount a frame later (AnimatePresence, portals).
    const raf = requestAnimationFrame(() => {
      node = ref.current;
      if (!node) return;
      stack.push(node);
      if (!node.hasAttribute("tabindex")) node.tabIndex = -1;
      if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });
    });

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Tab" || !node || stack[stack.length - 1] !== node) return;
      const items = focusables(node);
      if (!items.length) {
        ev.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !node.contains(active)) {
        ev.preventDefault();
        (ev.shiftKey ? last : first).focus();
      } else if (ev.shiftKey && (active === first || active === node)) {
        ev.preventDefault();
        last.focus();
      } else if (!ev.shiftKey && active === last) {
        ev.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      const i = node ? stack.lastIndexOf(node) : -1;
      if (i >= 0) stack.splice(i, 1);
      // Back to the opener, unless focus already moved somewhere on purpose.
      const active = document.activeElement;
      const lost = !active || active === document.body || (node !== null && node.contains(active)) || !document.contains(active);
      if (lost && before && before !== document.body && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, [open, ref, returnTo]);
}
