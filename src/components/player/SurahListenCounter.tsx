"use client";

import { useEffect, useRef } from "react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionId } from "@/lib/audio/session";
import { quranContentOf } from "@/components/home/QuranEngagement";

/*
 * Counts real listening time per Surah / Juz for the public View count. Only time
 * where audio is playing AND its position actually advances is counted
 * (paused, buffering, or a sleeping device add nothing). Reports go to the
 * add_quran_listen RPC under the anonymous browser id, and live heartbeats
 * (quran_heartbeat) feed the live count. Never throws — a
 * failure here must not affect playback.
 */

const TICK_MS = 5_000;
const FLUSH_MS = 30_000;
const MAX_GAP_MS = 75_000; // hidden tabs tick ~1/min; longer = asleep
const HEARTBEAT_MS = 25_000; // server counts a heartbeat as "live" for 60s

export function SurahListenCounter() {
  const player = useAudioPlayer();
  const stateRef = useRef({ key: null as string | null, playing: false, clock: "" });
  const lastRef = useRef<{ at: number; key: string | null; playing: boolean; clock: string } | null>(null);
  // Pending listening ms per content key ("surah:36", "juz:30").
  const pendingRef = useRef<Map<string, number>>(new Map());
  const lastFlushRef = useRef(Date.now());
  const sampleRef = useRef<() => void>(() => {});
  const liveRef = useRef<{ at: number; key: string } | null>(null);

  const content = quranContentOf(player.current?.id);
  const key = content ? `${content.kind}:${content.id}` : null;
  stateRef.current = {
    key,
    playing: player.isPlaying && key !== null,
    clock: `${player.ayahSequence?.index ?? ""}|${Math.floor((player.isPrelude ? player.preludeCurrentTime : player.currentTime) * 2)}`,
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const flush = () => {
      lastFlushRef.current = Date.now();
      const viewer = getSessionId();
      for (const [k, ms] of pendingRef.current) {
        const secs = Math.floor(ms / 1000);
        if (secs < 1) continue;
        pendingRef.current.set(k, ms - secs * 1000);
        const [kind, ref] = k.split(":");
        void supabase
          .rpc("add_quran_listen", { p_viewer: viewer, p_kind: kind, p_ref: Number(ref), p_seconds: secs })
          .then(() => {}, () => {});
      }
    };

    const sample = () => {
      try {
        const now = Date.now();
        const cur = stateRef.current;
        const last = lastRef.current;
        if (last && last.playing && last.key !== null && cur.clock !== last.clock) {
          const dt = now - last.at;
          if (dt > 0 && dt <= MAX_GAP_MS) {
            pendingRef.current.set(last.key, (pendingRef.current.get(last.key) ?? 0) + dt);
          }
        }
        const advancing = Boolean(last && last.playing && cur.playing && cur.clock !== last.clock);
        lastRef.current = { at: now, ...cur };
        if (now - lastFlushRef.current >= FLUSH_MS) flush();

        // Live presence: heartbeat while really playing; leave as soon as it stops.
        const live = liveRef.current;
        if (cur.playing && cur.key !== null && (advancing || live)) {
          if (!live || live.key !== cur.key || now - live.at >= HEARTBEAT_MS) {
            liveRef.current = { at: now, key: cur.key };
            const [kind, ref] = cur.key.split(":");
            void supabase
              .rpc("quran_heartbeat", { p_viewer: getSessionId(), p_kind: kind, p_ref: Number(ref) })
              .then(() => {}, () => {});
          }
        } else if (live && !cur.playing) {
          liveRef.current = null;
          void supabase.rpc("quran_leave", { p_viewer: getSessionId() }).then(() => {}, () => {});
        }
      } catch {
        /* never affect playback */
      }
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        sample();
        flush();
      }
    };

    const t = window.setInterval(sample, TICK_MS);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    sampleRef.current = sample;
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, []);

  // Sample on play/pause/track change so each stretch is credited to the right content.
  useEffect(() => {
    sampleRef.current();
  }, [player.isPlaying, key]);

  return null;
}
