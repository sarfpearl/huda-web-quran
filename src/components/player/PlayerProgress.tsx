"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatClock } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Seekable progress bar. Renders a native range input (fully keyboard- and
 * screen-reader-accessible) with a themed filled track.
 *
 * Pointer scrubbing is direct manipulation: while held, the bar, time label
 * and a bubble above the thumb follow the finger, and the audio seeks once on
 * release (not on every move, which made playback stutter and the thumb snap
 * back to the playhead). Keyboard steps still seek immediately.
 */
export function PlayerProgress({
  showTimes = true,
  className,
}: {
  showTimes?: boolean;
  className?: string;
}) {
  const { currentTime, duration, seek, current } = useAudioPlayer();
  const max = duration || current?.durationSeconds || 0;

  const [scrub, setScrub] = useState<number | null>(null);
  const scrubRef = useRef<number | null>(null);
  const pointerDown = useRef(false);

  const shown = scrub ?? Math.min(currentTime, max || 0);
  const pct = max > 0 ? (shown / max) * 100 : 0;

  function update(value: number) {
    scrubRef.current = value;
    setScrub(value);
  }
  function commit() {
    if (!pointerDown.current) return;
    pointerDown.current = false;
    if (scrubRef.current != null) seek(scrubRef.current);
    scrubRef.current = null;
    setScrub(null);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showTimes ? (
        <span
          className={cn(
            "w-10 shrink-0 text-right text-[11px] tabular-nums",
            scrub != null ? "font-semibold text-primary-700 dark:text-primary-300" : "text-muted"
          )}
        >
          {formatClock(shown)}
        </span>
      ) : null}
      {/* min-w-32 keeps the old floor: a bare range input never shrank below its
          intrinsic ~129px, but inside this wrapper it would collapse to 0 in a
          crowded row (the desktop bar at tablet widths). */}
      <div className="relative flex w-full min-w-32 items-center">
        <input
          type="range"
          min={0}
          max={max || 100}
          step={1}
          value={shown}
          onPointerDown={(e) => {
            // Capture so a release outside the bar still commits the seek.
            e.currentTarget.setPointerCapture(e.pointerId);
            pointerDown.current = true;
            update(Number(e.currentTarget.value));
          }}
          onPointerUp={commit}
          onPointerCancel={commit}
          onLostPointerCapture={commit}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (pointerDown.current) update(v);
            else seek(v);
          }}
          data-scrubbing={scrub != null || undefined}
          aria-label="Seek"
          aria-valuetext={`${formatClock(shown)} of ${formatClock(max)}`}
          className="player-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[rgb(var(--border))]"
          style={{
            background: `linear-gradient(to right, rgb(var(--ring)) ${pct}%, rgb(var(--border)) ${pct}%)`,
          }}
        />
        <AnimatePresence>
          {scrub != null ? (
            <motion.span
              key="bubble"
              aria-hidden
              className="pointer-events-none absolute bottom-full mb-2 rounded-full bg-primary-700 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-sand-50 shadow-soft"
              // Thumb centre: the native thumb (14px) travels 7px in from each end.
              style={{ left: `calc(${pct}% + ${7 - (pct / 100) * 14}px)`, x: "-50%" }}
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
            >
              {formatClock(scrub)}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>
      {showTimes ? (
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted">
          {formatClock(max)}
        </span>
      ) : null}
    </div>
  );
}
