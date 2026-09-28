"use client";

import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatClock } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Seekable progress bar. Renders a native range input (fully keyboard- and
 * screen-reader-accessible) with a themed filled track.
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
  const pct = max > 0 ? (currentTime / max) * 100 : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showTimes ? (
        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted">
          {formatClock(currentTime)}
        </span>
      ) : null}
      <input
        type="range"
        min={0}
        max={max || 100}
        step={1}
        value={Math.min(currentTime, max || 0)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={`${formatClock(currentTime)} of ${formatClock(max)}`}
        className="player-range h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[rgb(var(--border))]"
        style={{
          background: `linear-gradient(to right, rgb(var(--ring)) ${pct}%, rgb(var(--border)) ${pct}%)`,
        }}
      />
      {showTimes ? (
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted">
          {formatClock(max)}
        </span>
      ) : null}
    </div>
  );
}
