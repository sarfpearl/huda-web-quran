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
import { audioLevel } from "@/lib/record/audioTap";
import { coolBackground, warmBackground } from "@/lib/record/frameComposer";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { SELECTED } from "@/components/ui/selection";
import { DownloadIcon, PauseIcon, PlayIcon, ShareIcon, StopIcon } from "@/components/ui/Icon";
import { extFor, prepareSession, VIDEO_BPS, webmOnly, type Quality, type Session, type Shape } from "@/lib/record/recorder";

/** Longest single video; past it the recording stops at the ayah's end and offers Part 2. */
export const MAX_SECONDS = 600;

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

// The app's own sheet pieces (LocationAskSheet, PrayerTimesSheet, the Translation sheet).
const BTN = "h-11 rounded-full px-4 text-sm font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer";
const PRIMARY = `${BTN} bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:scale-[0.98]`;
// Start recording: the recording red.
const RECORD = `${BTN} bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]`;
const TEXT_BTN = `${BTN} text-sand-200/80 hover:bg-white/10 hover:text-sand-50`;
const OUTLINE = `${BTN} border border-white/15 bg-white/[0.06] text-sand-50 hover:bg-white/10`;
const CARD = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";
const BAR = "bg-black/60 backdrop-blur-[8px] border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.5)]";
const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f3eee4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
const SELECT =
  "h-11 w-full appearance-none rounded-full border border-white/15 bg-black/40 bg-[length:16px] bg-[position:right_1rem_center] bg-no-repeat pl-4 pr-10 text-sm text-sand-50 cursor-pointer";
const SELECT_SM =
  "h-10 max-w-[60%] shrink-0 appearance-none truncate rounded-full border border-white/15 bg-black/40 bg-[length:14px] bg-[position:right_0.85rem_center] bg-no-repeat pl-3.5 pr-9 text-[13px] text-sand-50 cursor-pointer";
const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${on ? SELECTED : "border border-white/10 bg-white/[0.04] text-sand-100 hover:bg-white/[0.08]"}`;

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
  // Recording has begun writing (the recitation is sounding).
  const [rolling, setRolling] = useState(false);
  // The first seconds of a recording: what happens next.
  const [showGuide, setShowGuide] = useState(false);
  // The recitation didn't start / no sound reaches the recording.
  const [stalled, setStalled] = useState(false);
  const [silent, setSilent] = useState(false);
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
    setRolling(false);
    setStalled(false);
    setSilent(false);
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
    let mutedSince = 0;
    const since = performance.now();
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
          setRolling(true);
          setStalled(false);
          setShowGuide(true);
          setTimeout(() => setShowGuide(false), 7000);
        } else if (performance.now() - since > 8000) setStalled(true);
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
      // Playing, yet nothing reaches the recording (a muted or blocked output).
      if (l.playing && audioLevel() < 0.002) {
        mutedSince ||= performance.now();
        setSilent(performance.now() - mutedSince > 6000);
      } else if (audioLevel() >= 0.002) {
        mutedSince = 0;
        setSilent(false);
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

  // While choosing: the background clip loads, ready for the first frame.
  // (Also before a Part 2.)
  const warming = phase.kind === "setup" || (phase.kind === "preview" && phase.nextFrom !== null);
  useEffect(() => {
    if (!warming) return;
    warmBackground();
    const id = setInterval(warmBackground, 500);
    return () => clearInterval(id);
  }, [warming]);
  useEffect(() => coolBackground, []);

  // Back: the setup sheet handles it itself. The recording takes it over only
  // once rolling — closing the sheet drops its history entry, and Safari
  // delivered that pop to a handler registered in the same moment (it closed
  // the recorder right after Start).
  // One entry from then on through saving and the preview: dropping one and
  // pushing the next together raced the same way.
  useBackToClose(
    phase.kind === "preview" || phase.kind === "saving" || (phase.kind === "recording" && rolling),
    phase.kind === "preview" ? close : phase.kind === "recording" ? () => void finish(null) : () => {},
  );

  // The sheet mounts closed, then opens (its slide-up; a sheet open on mount
  // pushed and dropped its history entry twice in dev).
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setSheetOpen(true), []);

  // Inside the tap: play the first ayah again (a browser that held back the start).
  const retryPlay = () => {
    haptic();
    setStalled(false);
    startAt(startAyahRef.current);
    player.resume();
  };

  useEffect(() => () => void sessionRef.current?.cancel(), []);

  const continuePart = (start: number) => {
    if (phase.kind === "preview") URL.revokeObjectURL(phase.url);
    partRef.current += 1;
    rangeRef.current = { ...rangeRef.current };
    begin(start);
  };

  const L = (s: string, v?: Record<string, string | number>) => t(language, s, v);

  if (phase.kind === "setup" || phase.kind === "error") {
    const options = Array.from({ length: verseCount }, (_, i) => i + 1);
    const mbPerMin = Math.round(((VIDEO_BPS[quality] + 128_000) * 60) / 8 / 1e6);
    const count = to - from + 1;
    return (
      <ActionSheet open={sheetOpen} onClose={close} label={L("Record video")} noAutoClose>
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white">{L("Record video")}</h3>
            <p className="mt-0.5 text-[11px] leading-none text-sand-300/70">{`${surahTitle} · ${L("Surah")} ${surah}`}</p>
          </div>
          <CloseButton onClick={close} label={L("Close")} />
        </div>
        <div className="min-h-0 space-y-2.5 overflow-y-auto no-scrollbar pb-1">
          {phase.kind === "error" && (
            <p role="alert" className="rounded-2xl bg-amber-300/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
              {L("Recording didn't work in this browser.")} <span className="opacity-60 break-all">{phase.message}</span>
            </p>
          )}
          {/* Which ayahs: the video runs from the first to the last, then stops by itself. */}
          <div className={CARD}>
            <p className="mb-2 text-sm font-semibold text-sand-50">{L("Ayahs to record")}</p>
            <div className="flex items-end gap-2">
              <label className="flex-1 text-xs text-sand-200/80">
                <span className="mb-1 block">{L("From ayah")}</span>
                <select
                  value={from}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFrom(v);
                    if (to < v) setTo(v);
                  }}
                  className={SELECT}
                  style={{ backgroundImage: CHEVRON }}
                >
                  {options.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <span className="pb-3 text-sand-300/60" aria-hidden>→</span>
              <label className="flex-1 text-xs text-sand-200/80">
                <span className="mb-1 block">{L("To ayah")}</span>
                <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={SELECT} style={{ backgroundImage: CHEVRON }}>
                  {options.filter((n) => n >= from).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-sand-200/60">
              {count === 1
                ? L("1 ayah (ayah {from}). Recording stops by itself after it.", { from })
                : L("{n} ayahs (ayah {from} to {to}). Recording stops by itself after ayah {to}.", { n: count, from, to })}
            </p>
          </div>
          {/* Size (desktop / tablet: phones always record 9:16) and quality */}
          <div className={`${CARD} space-y-3`}>
            {!phone && (
              <Row label={L("Size")}>
                <select value={shape} onChange={(e) => setShape(e.target.value as Shape)} className={SELECT_SM} style={{ backgroundImage: CHEVRON }}>
                  <option value="9:16">{L("Phone 9:16 · Status, Reels")}</option>
                  <option value="1:1">{L("Square 1:1 · Posts")}</option>
                  <option value="16:9">{L("Wide 16:9 · YouTube")}</option>
                </select>
              </Row>
            )}
            <Row label={L("Quality")} hint={`${L(quality === "1080" ? "Sharper" : "Smaller file")} · ${L("up to ≈ {mb} MB per minute", { mb: mbPerMin })}`}>
              <select value={quality} onChange={(e) => setQuality(e.target.value as Quality)} className={SELECT_SM} style={{ backgroundImage: CHEVRON }}>
                <option value="1080">1080p</option>
                <option value="720">720p</option>
              </select>
            </Row>
          </div>
          <p className="px-1 text-[11px] leading-relaxed text-sand-200/60">
            {L("Records in real time, with the recitation and meaning audio as you have them on. Over 10 minutes it continues as Part 2.")}
          </p>
          <p className="px-1 text-[11px] leading-relaxed text-sand-200/60">
            {L("Tip: WhatsApp Status takes about 90 s, Reels up to about 3 min. You can trim the video in the preview.")}
          </p>
          {webmOnly() && (
            <p className="rounded-2xl bg-amber-300/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
              {L("This browser records WebM. HuDa turns it into MP4 when you share, if the browser can; otherwise the WebM file is shared.")}
            </p>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" className={`flex-1 ${TEXT_BTN}`} onClick={close}>{L("Cancel")}</button>
          <button
            type="button"
            className={`flex-[1.4] ${RECORD}`}
            onClick={() => {
              rangeRef.current = { from, to };
              partRef.current = 1;
              begin(from);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden />
              {L("Start recording")}
            </span>
          </button>
        </div>
      </ActionSheet>
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

  // starting / recording / saving: the frame as it is recorded, full screen,
  // with what is happening above it (none of this is in the video).
  const { from: rFrom, to: rTo } = rangeRef.current;
  const ayahNow = Math.min(Math.max(currentAyah, rFrom), rTo);
  return (
    <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center" role="dialog" aria-modal="true" aria-label={L("Recording")}>
      <div
        ref={stageRef}
        // Room below the frame for the status bar, so it never covers the logo and link.
        className="h-full w-full flex items-center justify-center pb-[calc(env(safe-area-inset-bottom)+4.25rem)] [&>canvas]:max-h-full [&>canvas]:max-w-full [&>canvas]:h-auto [&>canvas]:w-auto [&>canvas]:object-contain"
      />
      {/* Status bar, floating at the bottom: REC + time, which ayah, the sound going in, Stop */}
      <div className={`absolute left-1/2 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] -translate-x-1/2 flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-full px-3 py-1.5 text-xs font-medium text-white ${BAR}`}>
        {rolling ? (
          <>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse" aria-hidden />
            <span className="whitespace-nowrap tabular-nums">
              {fmt(elapsed)}
              <span className="hidden text-white/45 min-[420px]:inline"> / {fmt(MAX_SECONDS)}</span>
            </span>
            <span className="h-4 w-px bg-white/20" aria-hidden />
            <span className="whitespace-nowrap">
              {limitRef.current ? L("finishing ayah…") : L("Ayah {n} of {from}–{to}", { n: ayahNow, from: rFrom, to: rTo })}
            </span>
            <LevelMeter />
          </>
        ) : (
          <span className="flex items-center gap-2 text-white/85">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
            {phase.kind === "saving" ? L("Saving the video…") : L("Starting the recitation…")}
          </span>
        )}
        <button
          type="button"
          onClick={() => (phase.kind === "recording" && rolling ? void finish(null) : cancel())}
          disabled={phase.kind === "saving"}
          aria-label={rolling ? L("Stop recording") : L("Cancel")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15 transition hover:bg-white/25 active:scale-95 cursor-pointer"
        >
          <StopIcon className="text-base text-red-400" />
        </button>
      </div>
      {/* What happens next, said once recording starts; problems stay up.
          Low on the frame, just above its logo and link (they sit in the
          frame's bottom ~10%; the frame fills the height above the bar). */}
      {(stalled || (rolling && showGuide) || silent) && phase.kind !== "saving" && (
        <div style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.25rem + 0.13 * (100dvh - 4.25rem - env(safe-area-inset-bottom)))" }} className={`absolute inset-x-3 mx-auto max-w-[480px] rounded-[22px] px-4 py-3 text-sm leading-relaxed text-sand-50 ${BAR}`} role="status">
          {stalled ? (
            <>
              <p>{L("The recitation hasn't started yet.")}</p>
              <div className="mt-2.5 flex gap-2">
                <button type="button" className={`flex-1 ${TEXT_BTN}`} onClick={cancel}>{L("Cancel")}</button>
                <button type="button" className={`flex-[1.4] ${PRIMARY}`} onClick={retryPlay}>{L("Play recitation")}</button>
              </div>
            </>
          ) : silent ? (
            <p className="text-amber-200">{L("No sound is reaching the recording. Check the volume and that the recitation is playing.")}</p>
          ) : (
            <p>
              {L("Recording {surah}, ayah {from} to {to}. It stops by itself after ayah {to} and opens the preview. Tap ■ to stop early.", {
                surah: recRef.current.title,
                from: rFrom,
                to: rTo,
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** The sound going into the recording: five bars. */
function LevelMeter() {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 80) return;
      last = now;
      setLevel(audioLevel());
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const lit = Math.min(5, Math.round(Math.sqrt(level) * 12));
  return (
    <span className="flex h-3.5 shrink-0 items-end gap-[2px]" aria-hidden>
      {[0.35, 0.55, 0.75, 0.9, 1].map((h, i) => (
        <span key={i} className={`w-[3px] rounded-full ${i < lit ? "bg-emerald-400" : "bg-white/20"}`} style={{ height: `${h * 100}%` }} />
      ))}
    </span>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-sand-50">{label}</span>
        {hint && <span className="block text-[11px] text-sand-200/60">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="tap-44 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 transition-all hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
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
  const [playing, setPlaying] = useState(false);
  // Frames along the timeline under the trim handles (like the iPhone's editor).
  const [thumbs, setThumbs] = useState<string[]>([]);
  const key = `${start.toFixed(2)}-${end.toFixed(2)}`;
  const trimmed = start > 0.05 || end < duration - 0.05;
  const sizeMb = (phase.file.size / 1e6) * ((end - start) / Math.max(duration, 0.1));

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Safari shows nothing until play: a tiny seek paints the first frame.
    const onData = () => {
      if (v.currentTime === 0 && v.paused) v.currentTime = 0.05;
    };
    v.addEventListener("loadeddata", onData, { once: true });
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
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [phase.duration]);

  // The filmstrip: frames read from a second, hidden copy of the file.
  useEffect(() => {
    let stop = false;
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = phase.url;
    void (async () => {
      await new Promise((r) => {
        v.onloadeddata = r;
        setTimeout(r, 6000);
      });
      const total = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : phase.duration;
      if (!v.videoWidth || !total) return;
      const n = 10;
      const h = 72;
      const w = Math.round((h * v.videoWidth) / v.videoHeight);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      const out: string[] = [];
      for (let i = 0; i < n && !stop; i++) {
        v.currentTime = Math.min(total - 0.05, ((i + 0.5) / n) * total);
        await new Promise((r) => {
          v.onseeked = r;
          setTimeout(r, 2000);
        });
        ctx?.drawImage(v, 0, 0, w, h);
        out.push(c.toDataURL("image/jpeg", 0.6));
        if (!stop) setThumbs([...out]);
      }
    })();
    return () => {
      stop = true;
      v.removeAttribute("src");
      v.load();
    };
  }, [phase.url, phase.duration]);

  // Play / pause: within the handles, from the start handle at the end.
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused) {
      v.pause();
      return;
    }
    if (v.currentTime < startRef.current || v.currentTime >= endRef.current - 0.1) v.currentTime = startRef.current;
    void v.play().catch(() => {});
  }, []);
  // Space plays and pauses, as in a video editor.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement)?.closest?.("input, textarea, select, [role=slider], button")) return;
      e.preventDefault();
      togglePlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay]);
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
  const seekTo = (e: React.PointerEvent) => {
    const track = trackRef.current;
    const v = videoRef.current;
    if (!track || !v) return;
    const r = track.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * duration;
    v.currentTime = Math.min(Math.max(t, start), end);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0b0d0c] flex flex-col items-center" role="dialog" aria-modal="true" aria-label={L("Preview")}>
      <div className="w-full max-w-3xl flex flex-col gap-3 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] h-full min-h-0">
        {/* Top bar: title · close (discards the recording) */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-sand-50">
            {L("Preview")}
            {phase.part > 1 || phase.nextFrom ? ` · ${L("Part {n}", { n: phase.part })}` : ""}
          </h3>
          <CloseButton onClick={onClose} label={L("Discard")} />
        </div>

        {/* The video: tap to play / pause */}
        <div className="relative flex-1 min-h-0 flex items-center justify-center">
          <video ref={videoRef} src={phase.url} playsInline preload="auto" onClick={togglePlay} className="h-full w-full rounded-2xl bg-black object-contain cursor-pointer" />
          {!playing && (
            <button
              type="button"
              onClick={togglePlay}
              aria-label={L("Play")}
              className="absolute grid h-16 w-16 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/60 cursor-pointer"
            >
              <PlayIcon className="text-3xl" />
            </button>
          )}
        </div>

        {/* Trimmer: play / pause, then the filmstrip with the start / end handles */}
        <div className="select-none">
          <div className="flex h-14 items-stretch gap-3">
            {/* A square button, the filmstrip's height */}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? L("Pause") : L("Play")}
              className="grid aspect-square h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/15 cursor-pointer"
            >
              {playing ? <PauseIcon className="text-2xl" /> : <PlayIcon className="text-2xl" />}
            </button>
            <div ref={trackRef} onPointerDown={seekTo} className="relative flex-1 overflow-hidden rounded-xl bg-white/10 touch-none cursor-pointer">
              {/* Frames */}
              <div className="absolute inset-0 flex">
                {thumbs.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" draggable={false} />
                ))}
              </div>
              {/* Outside the handles: dimmed */}
              <div className="absolute inset-y-0 left-0 bg-black/60" style={{ width: pct(start) }} />
              <div className="absolute inset-y-0 right-0 bg-black/60" style={{ left: pct(end) }} />
              {/* The kept part: framed */}
              <div className="pointer-events-none absolute inset-y-0 border-y-[3px] border-sand-50" style={{ left: pct(start), width: `calc(${pct(end)} - ${pct(start)})` }} />
              {/* Playhead */}
              <div className="pointer-events-none absolute inset-y-0 w-0.5 -ml-px bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)]" style={{ left: pct(now) }} />
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
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag(w)(e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") nudge(w, -1);
                    if (e.key === "ArrowRight") nudge(w, 1);
                  }}
                  className={`absolute inset-y-0 grid w-4 place-items-center bg-sand-50 text-slate-900 cursor-ew-resize ${w === "start" ? "rounded-l-lg" : "-ml-4 rounded-r-lg"}`}
                  style={{ left: pct(w === "start" ? start : end) }}
                >
                  <svg viewBox="0 0 8 14" className="h-3 w-2" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={w === "start" ? "M6 1 1 7l5 6" : "M2 1l5 6-5 6"} />
                  </svg>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-sand-300/80 tabular-nums">
            <span>{fmt(start)} – {fmt(end)}</span>
            <span>{fmt(len)} · ≈ {sizeMb < 10 ? sizeMb.toFixed(1) : Math.round(sizeMb)} MB</span>
          </div>
          {trimmed && (
            <div className="mt-2">
              <button type="button" className={chip(false)} onClick={() => { setStart(0); setEnd(duration); }}>
                {L("Reset")}
              </button>
            </div>
          )}
        </div>

        {msg && <p className="text-xs text-sand-200/80">{msg}</p>}
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
            <button type="button" className={OUTLINE} onClick={() => onContinue(phase.nextFrom!)}>
              {L("Continue as Part {n}", { n: phase.part + 1 })}
            </button>
          )}
          <button
            type="button"
            className={OUTLINE}
            disabled={busy !== null}
            onClick={async () => {
              const r = await prepare();
              download(r.file);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <DownloadIcon className="text-lg" />
              {L("Download")}
            </span>
          </button>
          <button type="button" className={PRIMARY} disabled={busy !== null} onClick={share}>
            <span className="inline-flex items-center gap-2">
              <ShareIcon className="text-lg" />
              {busy !== null ? `${L("Preparing…")} ${Math.round(busy * 100)}%` : L("Share")}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
