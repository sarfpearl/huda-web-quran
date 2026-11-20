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
import { loadMeaningTimings } from "@/lib/data/meaningTimings";
import type { MeaningVoice } from "@/lib/data/meaningAudio";
import type { TranslationLang } from "@/lib/data/translations";
import { clearRecordings } from "@/lib/record/chunkSink";
import { audioLevel } from "@/lib/record/audioTap";
import { coolBackground, warmBackground } from "@/lib/record/frameComposer";
import { ActionSheet, PLAYER_GLASS } from "@/components/ui/ActionSheet";
import { SELECTED, SELECTED_BADGE } from "@/components/ui/selection";
import { SURAH_NAMES } from "@/lib/data/surahNames";
import { ClockIcon, DownloadIcon, ExitFullscreenIcon, FullscreenIcon, LayersIcon, MuteIcon, PauseIcon, QuranStandIcon, PlayIcon, ShareIcon, StopIcon, VolumeIcon, CloseIcon, ArrowRightIcon } from "@/components/ui/Icon";
import { ArchHeader, GOLD, MosqueFooter, PATTERN_BG } from "./PreviewArt";
import { extFor, prepareSession, VIDEO_BPS, webmOnly, type Quality, type Session, type Shape } from "@/lib/record/recorder";

/** HuDa's glass (the player card's, ActionSheet's PLAYER_GLASS). */
const GLASS = PLAYER_GLASS;

/** The preview's controls bar under the video (px). */
const CONTROLS_H = 56;

/** Ayah length to assume where the reciter's timings are missing (s). */
const AVG_AYAH_SECONDS = 9;

/** The first estimate, before the meaning clips' lengths are known (meaning ≈ ayah). */
function estimateStatic(sec: number[] | undefined, a: number, b: number, meaning: boolean) {
  let t = 0;
  for (let i = a; i <= b; i++) t += (sec?.[i - 1] || AVG_AYAH_SECONDS) * (meaning ? 2 : 1);
  return t;
}

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
  /** Each ayah's recitation length (s), index = ayah − 1; empty when unknown. */
  ayahSeconds?: number[];
  /** The meaning read aloud after each ayah, when it is on. */
  meaning?: { voice: MeaningVoice; lang: TranslationLang } | null;
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

/** "3 min 40 s" / "45 s" in the UI language. */
function fmtLong(s: number, lang: UiLang) {
  const v = Math.max(1, Math.round(s));
  const m = Math.floor(v / 60);
  const r = v % 60;
  if (!m) return t(lang, "{s} s", { s: r });
  return r ? t(lang, "{m} min {s} s", { m, s: r }) : t(lang, "{m} min", { m });
}

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
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f3eee4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9'/%3E%3C/svg%3E\")";
const SELECT =
  "h-11 w-full appearance-none rounded-full border border-white/15 bg-black/40 bg-[length:16px] bg-[position:right_1rem_center] bg-no-repeat pl-4 pr-10 text-sm text-sand-50 cursor-pointer";
const SELECT_SM =
  "h-10 max-w-[60%] shrink-0 appearance-none truncate rounded-full border border-white/15 bg-black/40 bg-[length:14px] bg-[position:right_0.85rem_center] bg-no-repeat pl-3.5 pr-9 text-[13px] text-sand-50 cursor-pointer";
const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${on ? SELECTED : "border border-white/10 bg-white/[0.04] text-sand-100 hover:bg-white/[0.08]"}`;

export default function RecordStudio(props: RecordStudioProps) {
  const { surah, surahTitle, verseCount, currentAyah, startAt, language, onClose, ayahSeconds, meaning } = props;
  const player = useAudioPlayer();
  const phone = useMemo(isPhone, []);
  // The meaning clips' lengths (their last word's end), when the meaning is read aloud.
  const [meaningSecs, setMeaningSecs] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!meaning) return;
    let live = true;
    void loadMeaningTimings(meaning.voice, meaning.lang, surah).then((tm) => {
      if (!live || !tm) return;
      const out: Record<string, number> = {};
      for (const [ayah, words] of Object.entries(tm)) out[ayah] = (words[words.length - 1]?.[2] ?? 0) + 0.6;
      setMeaningSecs(out);
    });
    return () => {
      live = false;
    };
  }, [meaning, surah]);
  // About how long ayahs from…to take: recitation, plus each meaning clip
  // (measured where its timings exist, else about as long as the ayah).
  const ayahCost = useCallback(
    (a: number) => {
      const rec = ayahSeconds?.[a - 1] || AVG_AYAH_SECONDS;
      return rec + (meaning ? (meaningSecs?.[String(a)] ?? rec) : 0);
    },
    [ayahSeconds, meaning, meaningSecs],
  );
  const estimate = useCallback(
    (a: number, b: number) => {
      let t = 0;
      for (let i = a; i <= b; i++) t += ayahCost(i);
      return t;
    },
    [ayahCost],
  );
  /** The last ayah that still fits in one video from `a`. */
  const lastFitting = useCallback(
    (a: number) => {
      let t = 0;
      let b = a;
      for (let i = a; i <= verseCount; i++) {
        t += ayahCost(i);
        if (t > MAX_SECONDS && i > a) break;
        b = i;
      }
      return b;
    },
    [ayahCost, verseCount],
  );
  // Default: the whole Surah when it fits, else from the ayah on screen as far as fits.
  const [from, setFrom] = useState(() => (estimateStatic(ayahSeconds, 1, verseCount, !!meaning) <= MAX_SECONDS ? 1 : Math.min(currentAyah, verseCount)));
  const [to, setTo] = useState(() => {
    const a = estimateStatic(ayahSeconds, 1, verseCount, !!meaning) <= MAX_SECONDS ? 1 : Math.min(currentAyah, verseCount);
    let t = 0;
    let b = a;
    for (let i = a; i <= verseCount; i++) {
      t += (ayahSeconds?.[i - 1] || AVG_AYAH_SECONDS) * (meaning ? 2 : 1);
      if (t > MAX_SECONDS && i > a) break;
      b = i;
    }
    return b;
  });
  const maxTo = lastFitting(from);
  // Once the meaning lengths arrive (or the start moves), keep the end in reach.
  useEffect(() => {
    if (to > maxTo) setTo(maxTo);
  }, [to, maxTo]);
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
    const secs = estimate(from, to);
    return (
      <ActionSheet open={sheetOpen} onClose={close} label={L("Record video")} noAutoClose>
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white">{L("Record video")}</h3>
          <CloseButton onClick={close} label={L("Close")} />
        </div>
        <div className="min-h-0 space-y-2.5 overflow-y-auto no-scrollbar pb-1">
          {/* Which Surah is being recorded: plain to see, in the app's selected style */}
          <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${SELECTED}`}>
            <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold tabular-nums ${SELECTED_BADGE}`} aria-hidden>
              {surah}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-bold text-white">{surahTitle}</span>
              <span className="block text-xs text-sand-200/75">
                {L("Surah")} {surah} · {L("{n} ayahs", { n: verseCount })}
              </span>
            </span>
            <span lang="ar" dir="rtl" className="shrink-0 font-arabic text-xl text-amber-200">
              {(SURAH_NAMES[surah - 1]?.[0] ?? "").replace(/^سُورَةُ\s*/, "")}
            </span>
          </div>
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
                    // The same end if it is still after the start and fits; else as far
                    // as one video reaches (the "next video" case).
                    setTo((t) => (t < v ? lastFitting(v) : Math.min(t, lastFitting(v))));
                  }}
                  className={SELECT}
                  style={{ backgroundImage: CHEVRON }}
                >
                  {options.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <ArrowRightIcon className="mb-3 h-4 w-4 shrink-0 text-sand-300/60" />
              <label className="flex-1 text-xs text-sand-200/80">
                <span className="mb-1 block">{L("To ayah")}</span>
                {/* Only ayahs that end within 10 minutes can be picked. */}
                <select value={to} onChange={(e) => setTo(Number(e.target.value))} className={SELECT} style={{ backgroundImage: CHEVRON }}>
                  {options.filter((n) => n >= from).map((n) => (
                    <option key={n} value={n} disabled={n > maxTo}>
                      {n > maxTo ? `${n} · ${L("over 10 min")}` : n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {/* About how long, against the 10-minute limit */}
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-sand-100">{L("About {t}", { t: fmtLong(secs, language) })}</span>
                <span className="tabular-nums text-sand-200/60">{L("max {t} per video", { t: fmtLong(MAX_SECONDS, language) })}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="meter" aria-valuemin={0} aria-valuemax={MAX_SECONDS} aria-valuenow={Math.round(secs)} aria-label={L("Length of the video")}>
                <div
                  className={`h-full rounded-full ${secs > MAX_SECONDS * 0.9 ? "bg-amber-400" : "bg-[linear-gradient(90deg,#f6de9a,#e3b65a)]"}`}
                  style={{ width: `${Math.min(100, (secs / MAX_SECONDS) * 100)}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-sand-200/60">
              {count === 1
                ? L("1 ayah (ayah {from}). Recording stops by itself after it.", { from })
                : L("{n} ayahs (ayah {from} to {to}). Recording stops by itself after ayah {to}.", { n: count, from, to })}
              {maxTo < verseCount && to === maxTo && <> {L("One video is up to 10 minutes: record ayah {n} onwards as the next video.", { n: maxTo + 1 })}</>}
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
            {L("Records in real time, with the recitation and meaning audio as you have them on.")}
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
          Low on the frame, clear above its logo and link (they sit in the
          frame's bottom ~10%; the frame fills the height above the bar). */}
      {(stalled || (rolling && showGuide) || silent) && phase.kind !== "saving" && (
        <div style={{ bottom: "calc(env(safe-area-inset-bottom) + 4.25rem + 0.17 * (100dvh - 4.25rem - env(safe-area-inset-bottom)))" }} className={`absolute inset-x-3 mx-auto max-w-[480px] rounded-[22px] px-4 py-3 text-sm leading-relaxed text-sand-50 ${BAR}`} role="status">
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
      <CloseIcon className="h-4 w-4" />
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
  const [muted, setMuted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setSheetOpen(true), []);
  const [full, setFull] = useState(false);
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
    // (The video is in the sheet: it exists once the sheet has opened.)
  }, [phase.duration, sheetOpen]);

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
  // The progress bar under the video: anywhere in the recording.
  const progressRef = useRef<HTMLDivElement>(null);
  const scrub = (e: React.PointerEvent) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    e.preventDefault();
    bar.setPointerCapture?.(e.pointerId);
    const at = (x: number) => {
      const r = bar.getBoundingClientRect();
      v.currentTime = Math.min(1, Math.max(0, (x - r.left) / r.width)) * duration;
    };
    at(e.clientX);
    const move = (ev: PointerEvent) => at(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // A fixed-height preview area (what the screen leaves between the header and
  // the timeline). The video is as tall as it (less the controls bar), its
  // width from its own ratio (9:16 for Status), centred; only a too-narrow
  // screen makes the width the limit instead. Never stretched.
  const areaRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ w: number; videoH: number } | null>(null);
  useEffect(() => {
    const area = areaRef.current;
    const v = videoRef.current;
    if (!area) return;
    const fit = () => {
      const ratio = v?.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 9 / 16;
      const { width, height } = area.getBoundingClientRect();
      let videoH = Math.max(0, height - CONTROLS_H - 3);
      let w = videoH * ratio;
      if (w > width) {
        w = width;
        videoH = w / ratio;
      }
      setCardSize({ w: Math.floor(w), videoH: Math.floor(videoH) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(area);
    v?.addEventListener("loadedmetadata", fit);
    return () => {
      ro.disconnect();
      v?.removeEventListener("loadedmetadata", fit);
    };
  }, [sheetOpen]);

  // Full screen: the card itself (custom controls stay); iPhone: the native player.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  const toggleFull = () => {
    const card = cardRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const v = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (card?.requestFullscreen) void card.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else if (card?.webkitRequestFullscreen) card.webkitRequestFullscreen();
    else v?.webkitEnterFullscreen?.();
  };

  const current = Math.min(Math.floor((now / Math.max(duration, 0.1)) * Math.max(thumbs.length, 1)), Math.max(thumbs.length - 1, 0));
  const ext = (ready?.key === key ? ready.file.type : phase.file.type).includes("webm") ? "WEBM" : "MP4";
  // ‹ › : a tap steps one frame of the strip back / on; a drag trims.
  const step = (dir: -1 | 1) => {
    const v = videoRef.current;
    if (!v || !thumbs.length) return;
    const seg = duration / thumbs.length;
    v.currentTime = Math.min(end, Math.max(start, (current + dir) * seg + 0.01));
  };
  const handleDown = (w: "start" | "end") => (e: React.PointerEvent) => {
    e.stopPropagation();
    const x0 = e.clientX;
    let moved = false;
    const mv = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - x0) > 4) moved = true;
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      if (!moved) step(w === "start" ? -1 : 1);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    drag(w)(e);
  };

  return (
    // The app's own action sheet (its glass over the scene, handle, Back /
    // Escape / swipe down to close), nearly full height.
    <ActionSheet open={sheetOpen} onClose={onClose} label={L("Video Preview")} noAutoClose className="h-[94dvh] max-h-[94dvh]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 [mask-image:linear-gradient(to_bottom,#000,transparent)]" style={{ backgroundImage: PATTERN_BG }} aria-hidden />
      {/* One sheet, no scrolling: the preview area takes the height left over. */}
      <div className="relative flex h-full min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <div className="mx-auto flex h-full w-full max-w-[440px] flex-col pb-3">
            {/* Header: the arch, the Quran emblem, title and subtitle; close at top right */}
            {/* Shorter screens: a tighter header, so the video keeps its height. */}
            <header className="relative shrink-0 pt-3 pb-4 text-center [@media(max-height:800px)]:pt-1 [@media(max-height:800px)]:pb-2">
              <ArchHeader className="pointer-events-none absolute -inset-x-4 -top-2 h-[calc(100%+1.5rem)] w-[calc(100%+2rem)]" />
              <button
                type="button"
                onClick={onClose}
                aria-label={L("Close")}
                className="absolute right-0 top-0 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-sand-200 transition-all hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
              <div className="relative flex flex-col items-center">
                {/* Hugeicons Quran01: the open Quran on its stand, in the app's gold */}
                <QuranStandIcon strokeWidth={1} className="mt-3 text-[38px] text-[#f6de9a] drop-shadow-[0_0_10px_rgba(227,182,90,0.45)] [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:text-[30px]" />
                <h3 className="mt-4 text-[28px] leading-tight text-white [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:text-[23px]" style={{ fontFamily: "var(--font-amiri), serif" }}>
                  {L("Video Preview")}
                  {phase.part > 1 || phase.nextFrom ? ` · ${L("Part {n}", { n: phase.part })}` : ""}
                </h3>
                <p className="mt-1 text-[13px] text-sand-200/80">{L("Review your recitation video before download")}</p>
              </div>
            </header>

            {/* The preview area: fixed height, the card centred in it; the video
                gold-edged, its controls in the card's foot (never over its text
                or link) */}
            <div ref={areaRef} className="flex min-h-0 flex-1 items-center justify-center">
            <div
              ref={cardRef}
              className={full ? "flex h-full w-full flex-col bg-black" : "relative isolate overflow-hidden rounded-[24px] border-[1.5px] border-transparent shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_28px_rgba(232,196,110,0.16)]"}
              // The gold edge: the app's gold (.huda-tab-gold) as a gradient border.
              style={full ? undefined : { width: cardSize ? cardSize.w + 3 : undefined, background: "linear-gradient(#000, #000) padding-box, linear-gradient(120deg, #f6de9a, #b98532 40%, #f6de9a 65%, #8a6424) border-box" }}
            >
              <div className={`relative overflow-hidden bg-black ${full ? "min-h-0 flex-1" : "rounded-t-[22.5px]"}`} style={full ? undefined : { width: cardSize?.w, height: cardSize?.videoH }}>
                <video ref={videoRef} src={phase.url} playsInline preload="auto" muted={muted} onClick={togglePlay} className="absolute inset-0 h-full w-full object-contain cursor-pointer" />
                <button
                  type="button"
                  onClick={toggleFull}
                  aria-label={full ? L("Exit full screen") : L("Full screen")}
                  className={`absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full text-white transition hover:bg-black/30 cursor-pointer ${GLASS}`}
                >
                  {full ? <ExitFullscreenIcon className="text-xl" /> : <FullscreenIcon className="text-xl" />}
                </button>
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={L("Play")}
                    className="absolute left-1/2 top-1/2 grid h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/80 bg-black/[0.08] text-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-[6px] transition hover:bg-black/25 cursor-pointer"
                  >
                    <PlayIcon className="translate-x-0.5 text-4xl [&_path]:fill-current" />
                  </button>
                )}
              </div>
              {/* Controls: the progress line across the top, then play · time · volume */}
              {/* Its own rounded foot: a blurred layer isn't clipped by the card's corners in Chrome. */}
              <div className={`flex shrink-0 flex-col border-t border-white/10 bg-black/40 px-2 text-[12px] tabular-nums text-white backdrop-blur-[14px] ${full ? "" : "rounded-b-[22.5px]"}`} style={{ height: CONTROLS_H }}>
                <div ref={progressRef} onPointerDown={scrub} className="relative h-4 w-full shrink-0 cursor-pointer touch-none" role="slider" aria-label={L("Seek")} aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(now)} aria-valuetext={fmt(now)} tabIndex={0}>
                  <div className="absolute inset-x-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/25" />
                  <div className="absolute left-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#f6de9a,#e3b65a)]" style={{ width: `calc((100% - 0.5rem) * ${now / Math.max(duration, 0.1)})` }} />
                  <div className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow" style={{ left: `calc(0.25rem + (100% - 0.5rem) * ${now / Math.max(duration, 0.1)})` }} />
                </div>
                <div className="flex min-h-0 flex-1 items-center justify-between gap-1">
                  <button type="button" onClick={togglePlay} aria-label={playing ? L("Pause") : L("Play")} className="grid h-10 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10 cursor-pointer">
                    {playing ? <PauseIcon className="text-[20px] [&_path]:fill-current" /> : <PlayIcon className="text-[20px] [&_path]:fill-current" />}
                  </button>
                  <span className="whitespace-nowrap">
                    {fmt(now)} <span className="text-white/50">/ {fmt(duration)}</span>
                  </span>
                  <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? L("Unmute") : L("Mute")} className="grid h-10 w-8 shrink-0 place-items-center rounded-full hover:bg-white/10 cursor-pointer">
                    {muted ? <MuteIcon className="text-[20px]" /> : <VolumeIcon className="text-[20px]" />}
                  </button>
                </div>
              </div>
            </div>

            </div>

            {/* Timeline: frames, the one on screen in gold, the playhead; ‹ › step
                a frame on a tap and trim on a drag */}
            <div className="mt-3 shrink-0 select-none">
              <div className={`relative h-[60px] rounded-2xl px-6 py-1.5 [@media(max-height:800px)]:h-[52px] ${GLASS}`}>
                <div ref={trackRef} onPointerDown={seekTo} className="relative h-full touch-none cursor-pointer">
                  {/* Everything on the strip stays inside its rounded corners. */}
                  <div className="absolute inset-0 overflow-hidden rounded-lg">
                    <div className="absolute inset-0 flex">
                      {thumbs.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="" className="h-full min-w-0 flex-1 object-cover" draggable={false} />
                      ))}
                    </div>
                    {thumbs.length > 0 && (
                      <div
                        className="pointer-events-none absolute inset-y-0 rounded-lg border-2 shadow-[inset_0_0_8px_rgba(227,182,90,0.45)]"
                        style={{ borderColor: GOLD, left: `${(current / thumbs.length) * 100}%`, width: `${100 / thumbs.length}%` }}
                      />
                    )}
                    <div className="pointer-events-none absolute inset-y-0 left-0 bg-black/60" style={{ width: pct(start) }} />
                    <div className="pointer-events-none absolute inset-y-0 right-0 bg-black/60" style={{ left: pct(end) }} />
                    <div className="pointer-events-none absolute inset-y-0 w-[3px] rounded-full bg-white shadow-[0_0_4px_rgba(0,0,0,0.8)]" style={{ left: `clamp(0px, calc(${pct(now)} - 1.5px), calc(100% - 3px))` }} />
                  </div>
                </div>
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
                    onPointerDown={handleDown(w)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowLeft") nudge(w, -1);
                      if (e.key === "ArrowRight") nudge(w, 1);
                    }}
                    className="absolute inset-y-0 grid w-6 place-items-center text-sand-200/80 hover:text-white cursor-ew-resize"
                    style={{ left: `calc(1.5rem + (100% - 3rem) * ${(w === "start" ? start : end) / Math.max(duration, 0.1)} - ${w === "start" ? "1.5rem" : "0rem"})` }}
                  >
                    <svg viewBox="0 0 8 14" className="h-3.5 w-2" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d={w === "start" ? "M6 1 1 7l5 6" : "M2 1l5 6-5 6"} />
                    </svg>
                  </div>
                ))}
              </div>
              {trimmed && (
                <div className="mt-1.5 flex items-center justify-between text-xs text-sand-300/80 tabular-nums">
                  <span>{fmt(start)} – {fmt(end)}</span>
                  <button type="button" onClick={() => { setStart(0); setEnd(duration); }} className="rounded-full px-2 py-1 text-amber-200/90 hover:text-amber-100 cursor-pointer">
                    {L("Reset")}
                  </button>
                </div>
              )}
            </div>

            {/* Duration · File size · Format */}
            <div className={`mt-3 flex shrink-0 items-center rounded-2xl px-4 py-3 [@media(max-height:800px)]:mt-2 [@media(max-height:800px)]:py-2 ${GLASS}`}>
              <div className="flex flex-1 items-center gap-3">
                <ClockIcon className="text-2xl text-sand-200" />
                <div className="leading-tight">
                  <p className="text-xs text-sand-200/75">{L("Duration")}</p>
                  <p className="text-base font-semibold tabular-nums">{fmt(len)}</p>
                </div>
              </div>
              <span className="mx-3 h-9 w-px bg-white/15" aria-hidden />
              <div className="flex flex-1 items-center gap-3">
                <LayersIcon className="text-2xl text-sand-200" />
                <div className="leading-tight">
                  <p className="text-xs text-sand-200/75">{L("File size")}</p>
                  <p className="text-base font-semibold tabular-nums">{sizeMb < 10 ? sizeMb.toFixed(1) : Math.round(sizeMb)} MB</p>
                </div>
              </div>
              {/* MP4 is what everyone expects: the format shows only when it is WebM. */}
              {ext !== "MP4" && <span className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-semibold">{ext}</span>}
            </div>

            {(msg || (ready?.key === key && ready.webm) || (phase.nextFrom !== null && phase.nextFrom <= rangeEnd)) && (
              <div className="mt-2 shrink-0 space-y-1.5 text-center text-xs text-sand-200/80">
                {msg && <p>{msg}</p>}
                {ready?.key === key && ready.webm && <p>{L("This browser can only make WebM. WhatsApp may not take it; share from Chrome or Safari for MP4.")}</p>}
                {phase.nextFrom !== null && phase.nextFrom <= rangeEnd && (
                  <p>
                    {L("10 minutes reached. Share or download this part first, then continue from ayah {n}.", { n: phase.nextFrom })}{" "}
                    <button type="button" onClick={() => onContinue(phase.nextFrom!)} className="font-semibold text-amber-200 underline underline-offset-2 cursor-pointer">
                      {L("Continue as Part {n}", { n: phase.part + 1 })}
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Download · Share; the skyline and lanterns under them */}
        <div className="relative shrink-0">
          <div className="relative mx-auto grid w-full max-w-[440px] grid-cols-2 gap-3 pb-12">
            <button
              type="button"
              disabled={busy !== null}
              onClick={async () => {
                const r = await prepare();
                download(r.file);
              }}
              className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold text-white transition hover:bg-black/30 active:scale-[0.98] disabled:opacity-50 cursor-pointer ${GLASS}`}
            >
              <DownloadIcon className="text-xl" />
              {L("Download")}
            </button>
            {/* The app's gold: gold edge, gold label and the logo's shine (.huda-tab-gold) */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={share}
              className="huda-tab-gold flex h-11 items-center justify-center gap-2 rounded-full border text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <ShareIcon className="relative z-[1] text-xl" />
              <span className="relative z-[1]">{busy !== null ? `${L("Preparing…")} ${Math.round(busy * 100)}%` : L("Share")}</span>
            </button>
          </div>
          <MosqueFooter className="absolute -inset-x-4 bottom-0 h-10 opacity-75" />
        </div>
      </div>
    </ActionSheet>
  );
}
