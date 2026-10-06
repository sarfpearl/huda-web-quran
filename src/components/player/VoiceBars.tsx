"use client";

import { useEffect, useRef } from "react";
import type { RecitationSegment } from "@/lib/data/quranVerses";

/*
 * Four rounded bars that follow the reciter's voice: each recited word lifts
 * them, they hold lower while the word is drawn out (a madd is still voice),
 * and they fold to dots where the timings leave a gap (between ayahs, after
 * the recitation ends) and when paused. The rhythm comes from the word
 * timings, not the audio itself: tapping the audio needs Web Audio (which
 * stops background playback on iOS) or CORS the media host doesn't send.
 * Without timings (a Juz, an audio-only reciter) the bars simply move while
 * playing.
 *
 * Time between the player's coarse `time` updates is interpolated, and the
 * bars are driven straight from a frame loop (no React re-renders).
 */

const BARS = 4;
const WIDTH = 4; // px; a dot is WIDTH × WIDTH
const MAX_H = 26; // px
// Each bar's own pace and share of the height, so they don't move in step.
const SPEED = [7.3, 9.1, 6.2, 8.4];
const PHASE = [0, 1.7, 3.1, 4.6];
const SHARE = [0.7, 1, 0.85, 0.6];
// A word's lift at its start fades (s) down to the held level of the word.
const FADE = 0.45;
const HOLD = 0.4;

/** 0 (silent) · HOLD (a word drawn out) … 1 (a word just began) at time t. */
function voiceAt(t: number, segments: RecitationSegment[]): number {
  const seg = segments.find((s) => t >= s.startTime && t < s.endTime);
  if (!seg) return 0;
  if (seg.audioEnd != null && t > seg.audioEnd) return 0;
  const spans = seg.wordSegments?.length ? seg.wordSegments : seg.words;
  // A prelude (or an ayah without word timings) is voiced throughout.
  if (!spans?.length) return 1;
  const word = spans.find((w) => t >= w.startTime && t < w.endTime);
  if (!word) return 0;
  return HOLD + (1 - HOLD) * Math.exp(-(t - word.startTime) / FADE);
}

export function VoiceBars({
  playing,
  time,
  rate = 1,
  segments,
  className = "",
}: {
  playing: boolean;
  /** The player's current time (s), updated a few times a second. */
  time: number;
  rate?: number;
  /** Word-timed segments of what's playing; empty → moves whenever playing. */
  segments?: RecitationSegment[] | null;
  /** Bar colour, e.g. "bg-amber-300". */
  className?: string;
}) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  // Latest props for the frame loop, plus when `time` last changed.
  const live = useRef({ playing, time, rate, segments, stamp: 0 });
  useEffect(() => {
    live.current = { playing, time, rate, segments, stamp: performance.now() };
  }, [playing, time, rate, segments]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const heights = new Array(BARS).fill(WIDTH);
    let raf = 0;
    const frame = (now: number) => {
      const { playing: on, time: t0, rate: r, segments: segs, stamp } = live.current;
      // Up to half a second past the last update — beyond that, wait for one.
      const t = on ? t0 + Math.min(0.5, ((now - stamp) / 1000) * r) : t0;
      const voice = on ? (segs?.length ? voiceAt(t, segs) : 1) : 0;
      for (let i = 0; i < BARS; i++) {
        const wave = reduce ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin((now / 1000) * SPEED[i] + PHASE[i]));
        const target = Math.max(WIDTH, MAX_H * SHARE[i] * wave * voice);
        // Rise quickly with the voice, settle a little slower into the pause.
        heights[i] += (target - heights[i]) * (target > heights[i] ? 0.35 : 0.18);
        const el = barsRef.current[i];
        if (el) el.style.height = `${heights[i].toFixed(1)}px`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex items-center gap-[3px]" style={{ height: MAX_H }} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className={`block rounded-full ${className}`}
          style={{ width: WIDTH, height: WIDTH }}
        />
      ))}
    </div>
  );
}
