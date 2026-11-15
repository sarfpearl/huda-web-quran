"use client";

/**
 * Record: setup (ayah range, frame shape, quality) → recording (the canvas
 * shown full screen, a small timer + Stop that are not in the video) →
 * preview with trim → Share / Download, and "Continue as Part 2" after the
 * 10-minute limit. Loaded only when the Record button is first tapped.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { haptic } from "@/lib/haptics";
import { t, type UiLang } from "@/lib/uiLang";
import { SURAH_METADATA_LIST } from "@/lib/data/surahList";
import { useBackToClose } from "@/lib/useBackToClose";
import { clearRecordings } from "@/lib/record/chunkSink";
import { extFor, prepareSession, VIDEO_BPS, webmOnly, type Quality, type Session, type Shape } from "@/lib/record/recorder";

/** Longest single video; past it the recording stops at the ayah's end and offers Part 2. */
export const MAX_SECONDS = 600;
const WHATSAPP_STATUS = 90;
const REELS = 180;

export interface RecordStudioProps {
  surah: number;
  /** "Ya-Sin" in the UI language. */
  surahTitle: string;
  verseCount: number;
  /** The ayah on screen. */
  currentAyah: number;
  /** Plays the Surah from this ayah (1-based). */
  startAt: (ayah: number) => void;
  language: UiLang;
  onClose: () => void;
}

type Phase =
  | { kind: "setup" }
  | { kind: "starting" }
  | { kind: "recording" }
  | { kind: "saving" }
  | { kind: "preview"; file: File; url: string; duration: number; nextFrom: number | null; part: number }
  | { kind: "error"; message: string };

const fmt = (s: number) => {
  const v = Math.max(0, Math.round(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
};

const isPhone = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(pointer: coarse)").matches &&
  Math.min(window.screen.width, window.screen.height) < 600;

const BTN =
  "rounded-full px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
const PRIMARY = `${BTN} bg-amber-400 text-slate-950 hover:bg-amber-300`;
const SECONDARY = `${BTN} bg-white/10 text-sand-100 hover:bg-white/20`;
const CHIP = "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border";
const chip = (on: boolean) =>
  `${CHIP} ${on ? "bg-amber-400/90 text-slate-950 border-amber-300" : "bg-white/5 text-sand-200 border-white/15 hover:bg-white/10"}`;

export default function RecordStudio(props: RecordStudioProps) {
  const { surah, surahTitle, verseCount, currentAyah, startAt, language, onClose } = props;
  const player = useAudioPlayer();
  const phone = useMemo(isPhone, []);
  const [from, setFrom] = useState(() => (verseCount <= 20 ? 1 : Math.min(currentAyah, verseCount)));
  const [to, setTo] = useState(() => (verseCount <= 20 ? verseCount : Math.min(verseCount, currentAyah + 9)));
  const [shape, setShape] = useState<Shape>("9:16");
  const [quality, setQuality] = useState<Quality>("1080");
  const [phase, setPhase] = useState<Phase>({ kind: "setup" });
  const [elapsed, setElapsed] = useState(0);
  const sessionRef = useRef<Session | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const partRef = useRef(1);
  const startAyahRef = useRef(from);
  const rangeRef = useRef({ from, to });
  const limitRef = useRef(false);
  const stoppingRef = useRef(false);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);

  // The Surah being recorded (the page moves on to the next one at its end).
  const recRef = useRef({ surah, title: surahTitle });
  const meta = SURAH_METADATA_LIST[recRef.current.surah - 1];
  const title = useCallback(() => `${recRef.current.title} · ${recRef.current.surah}`, []);

  // The player's latest state for the watchers below.
  const snapshot = () => ({
    ayah: currentAyah,
    surah,
    playing: player.isPlaying,
    prelude: player.isPrelude,
    preludeTime: player.preludeCurrentTime,
    // Between an ayah and its meaning clip the player is briefly not playing
    // (longer while the clip loads): not the end.
    busy: player.isLoading || player.meaningClip !== null,
  });
  const live = useRef(snapshot());
  live.current = snapshot();

  const fileName = (part: number, withPart: boolean, type: string) =>
    `HuDa-${meta?.slug ?? `surah-${recRef.current.surah}`}-${rangeRef.current.from}-${rangeRef.current.to}${withPart ? `-Part${part}` : ""}.${extFor(type)}`;

  const finishRef = useRef<(nextFrom: number | null) => Promise<void>>(async () => {});
  const finish = useCallback(
    async (nextFrom: number | null) => {
      const s = sessionRef.current;
      if (!s || stoppingRef.current) return;
      stoppingRef.current = true;
      setPhase({ kind: "saving" });
      player.pause();
      try {
        const raw = await s.stop();
        const duration = s.elapsed();
        const part = partRef.current;
        const named = new File([raw], fileName(part, part > 1 || nextFrom !== null, raw.type), { type: raw.type });
        setPhase({ kind: "preview", file: named, url: URL.createObjectURL(named), duration, nextFrom, part });
      } catch (e) {
        setPhase({ kind: "error", message: String(e) });
      } finally {
        sessionRef.current = null;
        stoppingRef.current = false;
        void wakeRef.current?.release().catch(() => {});
        wakeRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [player],
  );

  const begin = (start: number) => {
    haptic();
    recRef.current = { surah, title: surahTitle };
    startAyahRef.current = start;
    limitRef.current = false;
    setElapsed(0);
    setPhase({ kind: "starting" });
    player.pause();
    // Synchronously inside the tap: the audio tap (iOS starts Web Audio only
    // from a gesture) and the first play().
    const ready = prepareSession({ shape: phone ? "9:16" : shape, quality, fileName: `rec-${Date.now()}.bin`, title });
    startAt(start);
    void (async () => {
      try {
        await clearRecordings();
        const s = await ready;
        sessionRef.current = s;
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
        nav.wakeLock?.request("screen").then((w) => (wakeRef.current = w), () => {});
        stageRef.current?.replaceChildren(s.composer.canvas);
        setPhase({ kind: "recording" });
      } catch (e) {
        setPhase({ kind: "error", message: String(e) });
      }
    })();
  };

  finishRef.current = finish;

  // Recording: starts writing once the recitation sounds; stops past the
  // range, at the Surah's end, or (after 10 minutes) at the next ayah.
  useEffect(() => {
    const finish = (n: number | null) => finishRef.current(n);
    if (phase.kind !== "recording") return;
    let started = false;
    let quietSince = 0;
    let lastAyah = live.current.ayah;
    const tick = setInterval(() => {
      const s = sessionRef.current;
      if (!s) return;
      const l = live.current;
      if (!started) {
        // Not before the seek to the first ayah has landed.
        if ((l.playing && l.ayah === startAyahRef.current) || (l.prelude && l.preludeTime > 0)) {
          s.start();
          started = true;
          lastAyah = l.ayah;
        }
        return;
      }
      const secs = s.elapsed();
      setElapsed(secs);
      const { to: end } = rangeRef.current;
      if (l.surah !== recRef.current.surah || l.ayah > end || l.ayah < lastAyah) {
        void finish(null);
        return;
      }
      if (secs >= MAX_SECONDS) limitRef.current = true;
      if (l.ayah !== lastAyah) {
        lastAyah = l.ayah;
        if (limitRef.current) {
          void finish(l.ayah <= end ? l.ayah : null);
          return;
        }
      }
      // The Surah ended and the player stopped by itself.
      if (!l.playing && !l.prelude && !l.busy) {
        quietSince ||= performance.now();
        if (performance.now() - quietSince > 6000) void finish(null);
      } else quietSince = 0;
    }, 100);
    return () => clearInterval(tick);
    // Everything else it reads is in refs: a re-render must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind]);

  // Leaving mid-recording (Back, closing): keep nothing.
  const cancel = useCallback(() => {
    const s = sessionRef.current;
    sessionRef.current = null;
    player.pause();
    void s?.cancel();
    void wakeRef.current?.release().catch(() => {});
    onClose();
  }, [player, onClose]);

  const close = useCallback(() => {
    if (phase.kind === "preview") URL.revokeObjectURL(phase.url);
    void clearRecordings();
    onClose();
  }, [phase, onClose]);

  useBackToClose(true, phase.kind === "recording" ? () => void finish(null) : phase.kind === "starting" ? cancel : close);

  useEffect(() => () => void sessionRef.current?.cancel(), []);

  const continuePart = (start: number) => {
    if (phase.kind === "preview") URL.revokeObjectURL(phase.url);
    partRef.current += 1;
    rangeRef.current = { ...rangeRef.current };
    begin(start);
  };

  const L = (s: string, v?: Record<string, string | number>) => t(language, s, v);

  if (phase.kind === "setup") {
    const options = Array.from({ length: verseCount }, (_, i) => i + 1);
    const mbPerMin = (VIDEO_BPS[quality] + 128_000) * 60 / 8 / 1e6;
    return (
      <Sheet onClose={close} title={L("Record video")} subtitle={`${surahTitle} · ${surah}`}>
        <div className="flex flex-col gap-4 text-sm text-sand-100">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-300/80">{L("Ayahs")}</div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-sand-300/80">{L("From")}</span>
                <select
                  value={from}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFrom(v);
                    if (to < v) setTo(v);
                  }}
                  className="rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-white"
                >
                  {options.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sand-300/80">{L("To")}</span>
                <select value={to} onChange={(e) => setTo(Number(e.target.value))} className="rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-white">
                  {options.filter((n) => n >= from).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-1.5 text-xs text-sand-300/70">
              {L("Records in real time, with the recitation and meaning audio as you have them on. Over 10 minutes it continues as Part 2.")}
            </p>
          </div>
          {!phone && (
            <div>
              <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-300/80">{L("Size")}</div>
              <div className="flex flex-wrap gap-2">
                {([
                  ["9:16", L("Phone 9:16 · Status, Reels")],
                  ["1:1", L("Square 1:1 · Posts")],
                  ["16:9", L("Wide 16:9 · YouTube")],
                ] as [Shape, string][]).map(([s, label]) => (
                  <button key={s} type="button" onClick={() => setShape(s)} className={chip(shape === s)} aria-pressed={shape === s}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-sand-300/80">{L("Quality")}</div>
            <div className="flex flex-wrap items-center gap-2">
              {(["1080", "720"] as Quality[]).map((q) => (
                <button key={q} type="button" onClick={() => setQuality(q)} className={chip(quality === q)} aria-pressed={quality === q}>
                  {q === "1080" ? L("1080p · sharper") : L("720p · smaller file")}
                </button>
              ))}
              <span className="text-xs text-sand-300/70">{L("up to ≈ {mb} MB per minute", { mb: Math.round(mbPerMin) })}</span>
            </div>
          </div>
          {webmOnly() && (
            <p className="rounded-lg bg-amber-400/10 border border-amber-300/20 px-3 py-2 text-xs text-amber-100">
              {L("This browser records WebM. HuDa turns it into MP4 when you share, if the browser can; otherwise the WebM file is shared.")}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className={SECONDARY} onClick={close}>{L("Cancel")}</button>
            <button
              type="button"
              className={PRIMARY}
              onClick={() => {
                rangeRef.current = { from, to };
                partRef.current = 1;
                begin(from);
              }}
            >
              <span className="inline-flex items-center gap-2"><Dot /> {L("Start recording")}</span>
            </button>
          </div>
        </div>
      </Sheet>
    );
  }

  if (phase.kind === "error") {
    return (
      <Sheet onClose={close} title={L("Record video")}>
        <p className="text-sm text-sand-100">{L("Recording didn't work in this browser.")}</p>
        <p className="mt-1 text-xs text-sand-300/60 break-all">{phase.message}</p>
        <div className="mt-4 flex justify-end">
          <button type="button" className={SECONDARY} onClick={close}>{L("Close")}</button>
        </div>
      </Sheet>
    );
  }

  if (phase.kind === "preview") {
    return (
      <Preview
        key={phase.url}
        phase={phase}
        language={language}
        rangeEnd={rangeRef.current.to}
        onClose={close}
        onContinue={continuePart}
      />
    );
  }

  // starting / recording / saving: the frame as it is recorded, full screen.
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center" role="dialog" aria-label={L("Recording")}>
      <div
        ref={stageRef}
        className="h-full w-full flex items-center justify-center [&>canvas]:max-h-full [&>canvas]:max-w-full [&>canvas]:h-auto [&>canvas]:w-auto [&>canvas]:object-contain"
        style={{ aspectRatio: undefined }}
      />
      <div className="absolute top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        {phase.kind === "recording" && elapsed > 0 ? (
          <>
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
            <span className="tabular-nums">{fmt(elapsed)}</span>
            <span className="text-white/50 tabular-nums">/ {fmt(MAX_SECONDS)}</span>
            {limitRef.current && <span className="text-amber-300">{L("finishing ayah…")}</span>}
          </>
        ) : (
          <span className="text-white/80">{phase.kind === "saving" ? L("Saving…") : L("Getting ready…")}</span>
        )}
        <button
          type="button"
          onClick={() => (phase.kind === "recording" ? void finish(null) : cancel())}
          disabled={phase.kind === "saving"}
          aria-label={L("Stop recording")}
          className="ml-1 grid h-7 w-7 place-items-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 cursor-pointer"
        >
          <span className="h-2.5 w-2.5 rounded-[2px] bg-red-500" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Dot() {
  return <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-hidden />;
}

function Sheet({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-slate-950/95 border border-white/10 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight leading-tight">{title}</h3>
            {subtitle && <p className="text-[11px] text-sand-300/70 leading-none mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 hover:text-white hover:bg-white/20 cursor-pointer">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The finished recording: watch it, set the trim handles, share. */
function Preview({
  phase,
  language,
  rangeEnd,
  onClose,
  onContinue,
}: {
  phase: Extract<Phase, { kind: "preview" }>;
  language: UiLang;
  rangeEnd: number;
  onClose: () => void;
  onContinue: (from: number) => void;
}) {
  const L = (s: string, v?: Record<string, string | number>) => t(language, s, v);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  // MediaRecorder files often report no duration until read through: the
  // recorder's own clock is the fallback.
  const [duration, setDuration] = useState(phase.duration);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(phase.duration);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const [ready, setReady] = useState<{ key: string; file: File; webm: boolean } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const key = `${start.toFixed(2)}-${end.toFixed(2)}`;
  const trimmed = start > 0.05 || end < duration - 0.05;
  const sizeMb = (phase.file.size / 1e6) * ((end - start) / Math.max(duration, 0.1));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) {
        setDuration(v.duration);
        setEnd((e) => (e >= phase.duration - 0.05 || e > v.duration ? v.duration : e));
      }
    };
    const onTime = () => {
      setNow(v.currentTime);
      if (v.currentTime >= endRef.current && !v.paused) {
        v.pause();
        v.currentTime = startRef.current;
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("timeupdate", onTime);
    };
  }, [phase.duration]);
  const startRef = useRef(start);
  const endRef = useRef(end);
  startRef.current = start;
  endRef.current = end;

  const drag = (which: "start" | "end") => (e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const r = track.getBoundingClientRect();
      const tSec = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)) * duration;
      if (which === "start") {
        const v = Math.min(tSec, endRef.current - 1);
        setStart(Math.max(0, v));
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, v);
      } else {
        const v = Math.max(tSec, startRef.current + 1);
        setEnd(Math.min(duration, v));
        if (videoRef.current) videoRef.current.currentTime = Math.min(duration, v);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const nudge = (which: "start" | "end", by: number) => {
    if (which === "start") setStart((s) => Math.max(0, Math.min(s + by, endRef.current - 1)));
    else setEnd((x) => Math.min(duration, Math.max(x + by, startRef.current + 1)));
  };

  const prepare = async () => {
    if (ready?.key === key) return ready;
    setBusy(0);
    setMsg(null);
    try {
      const { exportClip } = await import("@/lib/record/trim");
      const res = await exportClip(phase.file, { start, end, name: phase.file.name, onProgress: (p) => setBusy(p) });
      const r = { key, file: res.file, webm: res.webm };
      setReady(r);
      return r;
    } catch (e) {
      // No cut possible: the untrimmed recording, said so.
      console.warn("[record] export", e);
      setMsg(trimmed ? L("Couldn't trim in this browser — the full recording is used.") : null);
      const r = { key, file: phase.file, webm: phase.file.type.includes("webm") };
      setReady(r);
      return r;
    } finally {
      setBusy(null);
    }
  };

  const download = (file: File) => {
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const share = async () => {
    haptic();
    const fresh = ready?.key !== key;
    const r = await prepare();
    const data: ShareData = { files: [r.file], title: r.file.name, text: "www.hudaguidance.com" };
    if (typeof navigator.share !== "function" || !navigator.canShare?.(data)) {
      download(r.file);
      setMsg(L("Saved to your downloads."));
      return;
    }
    try {
      await navigator.share(data);
    } catch (e) {
      // The file took a moment to prepare and the browser no longer counts
      // the tap: one more tap shares it at once.
      if ((e as Error)?.name === "NotAllowedError" && fresh) setMsg(L("Ready — tap Share again."));
    }
  };

  const pct = (s: number) => `${(s / Math.max(duration, 0.1)) * 100}%`;
  const len = end - start;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center overflow-y-auto" role="dialog" aria-modal="true" aria-label={L("Preview")}>
      <div className="w-full max-w-3xl flex flex-col gap-3 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] min-h-full">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{L("Preview")}{phase.part > 1 || phase.nextFrom ? ` · ${L("Part {n}", { n: phase.part })}` : ""}</h3>
          <button type="button" onClick={onClose} className={SECONDARY}>{L("Discard")}</button>
        </div>
        <video ref={videoRef} src={phase.url} controls playsInline className="w-full flex-1 min-h-0 max-h-[55vh] rounded-2xl bg-black object-contain" />

        {/* Trim: start / end handles over the timeline */}
        <div className="select-none">
          <div className="flex items-center justify-between text-xs text-sand-300/80 mb-1.5 tabular-nums">
            <span>{L("Trim")}: {fmt(start)} – {fmt(end)}</span>
            <span>{fmt(len)} · ≈ {sizeMb < 10 ? sizeMb.toFixed(1) : Math.round(sizeMb)} MB</span>
          </div>
          <div ref={trackRef} className="relative h-12 rounded-xl bg-white/10 touch-none">
            <div className="absolute inset-y-0 bg-amber-400/25 border-y-2 border-amber-300" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
            <div className="absolute inset-y-0 w-0.5 bg-white/80 pointer-events-none" style={{ left: pct(now) }} />
            {(["start", "end"] as const).map((w) => (
              <div
                key={w}
                role="slider"
                tabIndex={0}
                aria-label={w === "start" ? L("Trim start") : L("Trim end")}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(w === "start" ? start : end)}
                aria-valuetext={fmt(w === "start" ? start : end)}
                onPointerDown={drag(w)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") nudge(w, -1);
                  if (e.key === "ArrowRight") nudge(w, 1);
                }}
                className="absolute inset-y-0 -ml-3 w-6 grid place-items-center cursor-ew-resize"
                style={{ left: pct(w === "start" ? start : end) }}
              >
                <span className="h-full w-3 rounded-md bg-amber-300 shadow" />
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-sand-300/70">{L("Hints")}:</span>
            <button type="button" className={chip(Math.abs(len - WHATSAPP_STATUS) < 1)} onClick={() => setEnd(Math.min(duration, start + WHATSAPP_STATUS))}>
              {L("WhatsApp Status ≈ 90 s")}
            </button>
            <button type="button" className={chip(Math.abs(len - REELS) < 1)} onClick={() => setEnd(Math.min(duration, start + REELS))}>
              {L("Reels up to ~3 min")}
            </button>
            {trimmed && (
              <button type="button" className={chip(false)} onClick={() => { setStart(0); setEnd(duration); }}>
                {L("Reset")}
              </button>
            )}
          </div>
        </div>

        {msg && <p className="text-xs text-amber-200">{msg}</p>}
        {ready?.key === key && ready.webm && (
          <p className="text-xs text-sand-300/70">{L("This browser can only make WebM. WhatsApp may not take it; share from Chrome or Safari for MP4.")}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {phase.nextFrom !== null && phase.nextFrom <= rangeEnd && (
            <span className="basis-full text-right text-xs text-sand-300/70">
              {L("10 minutes reached. Share or download this part first, then continue from ayah {n}.", { n: phase.nextFrom })}
            </span>
          )}
          {phase.nextFrom !== null && phase.nextFrom <= rangeEnd && (
            <button type="button" className={SECONDARY} onClick={() => onContinue(phase.nextFrom!)}>
              {L("Continue as Part {n}", { n: phase.part + 1 })}
            </button>
          )}
          <button
            type="button"
            className={SECONDARY}
            disabled={busy !== null}
            onClick={async () => {
              const r = await prepare();
              download(r.file);
            }}
          >
            {L("Download")}
          </button>
          <button type="button" className={PRIMARY} disabled={busy !== null} onClick={share}>
            {busy !== null ? `${L("Preparing…")} ${Math.round(busy * 100)}%` : L("Share")}
          </button>
        </div>
      </div>
    </div>
  );
}
