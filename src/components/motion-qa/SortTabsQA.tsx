"use client";

/*
 * MOTION QA COPY — not used by the live app.
 * Reviewed on /motion-qa next to the original (src/components/ui/SortTabs.tsx), which is unchanged.
 * Once approved, this replaces the original; until then nothing imports it
 * outside the QA page.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import type { BayanSort } from "@/types/bayan";
import { cn } from "@/lib/utils";

const OPTIONS: { value: BayanSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "duration", label: "Duration" },
];

// Liquid indicator: the edge moving first rides a fast spring, the trailing edge a
// slower one, so the pill stretches toward the new tab and settles back to size.
// Both are near-critically damped (ζ ≈ 0.83 / 0.92), so there is no visible bounce.
const LEAD = { type: "spring", stiffness: 520, damping: 38 } as const;
const TRAIL = { type: "spring", stiffness: 170, damping: 24 } as const;

const TAB = "rounded-full px-3.5 py-1.5 text-sm font-medium";

export function SortTabsQA({ current }: { current: BayanSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  // Optimistic: the indicator moves on click, not after the server round-trip.
  const [active, setActive] = useState(current);
  useEffect(() => setActive(current), [current]);
  const activeIndex = Math.max(0, OPTIONS.findIndex((o) => o.value === active));

  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;

  // Indicator edges in px from the list's padding edge.
  const left = useMotionValue(0);
  const right = useMotionValue(0);
  const listWidth = useMotionValue(0);
  const width = useTransform([left, right], ([l, r]: number[]) => Math.max(0, r - l));
  // The white label layer is clipped to the indicator, so text inverts exactly where the pill is.
  const clipPath = useTransform(
    [left, right, listWidth],
    ([l, r, w]: number[]) => `inset(0px ${w - r}px 0px ${l}px round 9999px)`
  );

  // Until measured (SSR, first paint) the active tab keeps its own static background.
  const [measured, setMeasured] = useState(false);

  function place(index: number, animated: boolean) {
    const tab = tabRefs.current[index];
    const list = listRef.current;
    if (!tab || !list) return;
    const l = tab.offsetLeft;
    const r = l + tab.offsetWidth;
    listWidth.set(list.clientWidth);
    if (!animated || reduceMotion) {
      left.jump(l);
      right.jump(r);
      return;
    }
    const movingRight = l > left.get();
    animate(left, l, movingRight ? TRAIL : LEAD);
    animate(right, r, movingRight ? LEAD : TRAIL);
  }

  useLayoutEffect(() => {
    place(activeIndex, measured);
    if (!measured) setMeasured(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  // Font swaps and viewport changes resize the tabs; snap the indicator, never animate it.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => place(indexRef.current, false));
    ro.observe(list);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function select(value: BayanSort) {
    setActive(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value === "latest") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Sort"
      className="relative inline-flex items-center gap-1 rounded-full border surface-muted p-1"
    >
      {measured && (
        <motion.span
          aria-hidden
          className="absolute inset-y-1 left-0 rounded-full bg-primary-700"
          style={{ x: left, width }}
        />
      )}
      {OPTIONS.map((o, i) => {
        const isActive = o.value === active;
        return (
          <button
            key={o.value}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            aria-selected={isActive}
            onClick={() => select(o.value)}
            className={cn(
              TAB,
              "relative transition-colors",
              isActive && !measured
                ? "bg-primary-700 text-sand-50"
                : "text-muted hover:text-primary-700 dark:hover:text-primary-200"
            )}
          >
            {o.label}
          </button>
        );
      })}
      {measured && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center gap-1 p-1"
          style={{ clipPath }}
        >
          {OPTIONS.map((o) => (
            <span key={o.value} className={cn(TAB, "text-sand-50")}>
              {o.label}
            </span>
          ))}
        </motion.div>
      )}
    </div>
  );
}
