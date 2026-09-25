"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";

/*
 * One shared tooltip for every button (or `[data-tooltip]` element) inside
 * `container`, labelled from its `data-tooltip` or `aria-label`. Rendered in a portal on <body> so
 * the player's overflow-hidden glass shell can't clip it. Shows on mouse /
 * pen hover and on keyboard focus; never on touch.
 */

interface Tip {
  text: string;
  x: number;
  y: number;
}

export function HoverTooltips({ container }: { container: RefObject<HTMLElement> }) {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    let current: HTMLElement | null = null;
    let stashedTitle: string | null = null;

    const hide = () => {
      if (current && stashedTitle !== null) current.setAttribute("title", stashedTitle);
      current = null;
      stashedTitle = null;
      setTip(null);
    };

    const show = (el: HTMLElement) => {
      if (el === current) return;
      hide();
      const text = el.dataset.tooltip || el.getAttribute("aria-label");
      if (!text || el.closest('[aria-hidden="true"]')) return;
      current = el;
      // Suppress the native title tooltip while ours is showing.
      stashedTitle = el.getAttribute("title");
      if (stashedTitle !== null) el.removeAttribute("title");
      const r = el.getBoundingClientRect();
      setTip({ text, x: r.left + r.width / 2, y: r.top });
    };

    const buttonFrom = (target: EventTarget | null) =>
      target instanceof Element ? (target.closest("button, [data-tooltip]") as HTMLElement | null) : null;

    const onOver = (e: PointerEvent) => {
      // Mouse / pen only — a tap on touch screens never shows a tooltip.
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      const b = buttonFrom(e.target);
      if (b && root.contains(b)) show(b);
      else hide();
    };
    const onLeave = () => hide();
    const onFocus = (e: FocusEvent) => {
      const b = buttonFrom(e.target);
      if (b && b.matches(":focus-visible")) show(b);
    };
    const onPress = () => hide();

    root.addEventListener("pointerover", onOver);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("focusin", onFocus);
    root.addEventListener("focusout", onLeave);
    root.addEventListener("pointerdown", onPress);
    window.addEventListener("scroll", hide, true);
    return () => {
      hide();
      root.removeEventListener("pointerover", onOver);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("focusout", onLeave);
      root.removeEventListener("pointerdown", onPress);
      window.removeEventListener("scroll", hide, true);
    };
  }, [container]);

  if (!tip || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-black/85 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md animate-fade-in"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      {tip.text}
    </div>,
    document.body
  );
}
