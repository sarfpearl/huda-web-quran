"use client";

import { UI_LANG_KEY, isUiLang, surahNameIn, t, type UiLang } from "@/lib/uiLang";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { BayanWithRelations } from "@/types/bayan";
import {
  isQuranTrack,
  isSurahTrackId,
  SURAH_TRACK_ID_PREFIX,
  getSurahTracksForReciter,
  resolveActiveReciter,
  getSurahPreludeConfig,
  getReciterAyah1TrimOffset,
  PRELUDE_AUDIO,
} from "@/lib/data/service";
import { cbrMasterUrl, reciterHasSurah } from "@/lib/data/quranReciters";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  GLOBAL AUDIO PLAYER ENGINE
 *  HTML5 Audio for the Quran streams (plus a second element for preludes).
 * ─────────────────────────────────────────────────────────────────────────
 */

const LAST_KEY = "huda-player:last";
const POSITIONS_KEY = "huda-player:positions";
const PREFS_KEY = "huda-player:prefs";
const END_MODE_KEY = "huda-player:end-mode";

/** What happens when a Surah / Juz ends: the next one, the same again, or a
 *  random other one. */
export type EndMode = "next" | "repeat" | "shuffle";
export const END_MODES: readonly EndMode[] = ["next", "repeat", "shuffle"];

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;

export interface ContinueListening {
  bayan: BayanWithRelations;
  position: number;
}

interface AudioPlayerState {
  queue: BayanWithRelations[];
  currentIndex: number;
  current: BayanWithRelations | null;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isExpanded: boolean;
  continueListening: ContinueListening | null;
  // Custom prelude (Isti'adhah & Bismillah)
  isPrelude: boolean;
  preludeType: "fatihah" | "bismillah" | "none" | null;
  preludeCurrentTime: number;
  preludeDuration: number;
  // Set while a Juz is playing per-ayah in a chosen reciter's voice.
  ayahSequence: AyahSequenceState | null;
  /** Set while an ayah's meaning is read aloud (the recitation waits). */
  meaningClip: MeaningClipState | null;
  endMode: EndMode;
}

/** An ayah's meaning, read when a whole-Surah track reaches `at`. */
export interface MeaningCue {
  at: number;
  url: string;
  key: string;
  /** The clock the screen shows meanwhile (inside the ayah just recited:
   *  `at` can lie past its timed end). Default: just before `at`. */
  showAt?: number;
}

/** The meaning clip playing: `key` is the page's own (e.g. "2:255"). */
export interface MeaningClipState {
  key: string;
}

/** A short clip played before an ayah in a per-ayah Juz sequence. */
export interface AyahPrelude {
  url: string;
  type: "istiadhah" | "bismillah";
}

/** Per-ayah Juz sequence state. `preType` is set while a prelude clip
 *  (Isti'adhah / Bismillah) plays before ayah `index`. */
export interface AyahSequenceState {
  index: number;
  total: number;
  preType: AyahPrelude["type"] | null;
}

/** Start position: seconds, or computed from the loaded track's real duration
 *  (for reciters whose ayah positions are estimated proportionally). */
type StartAt = number | ((durationSeconds: number) => number);

interface AudioPlayerApi extends AudioPlayerState {
  /** `opts.startAt` (seconds on the track timeline — or a function of the
   *  track's real duration, resolved once metadata loads) starts there directly — skipping
   *  the Bismillah prelude — e.g. to keep the same ayah after a reciter change. */
  playBayan: (
    bayan: BayanWithRelations,
    contextList?: BayanWithRelations[],
    opts?: { startAt?: StartAt }
  ) => void;
  cueBayan: (
    bayan: BayanWithRelations,
    contextList?: BayanWithRelations[],
    opts?: { startAt?: StartAt }
  ) => void;
  /** Play a display track backed by a chained per-ayah audio sequence,
   *  optionally starting at a given ayah index (to resume across reciters). */
  playAyahSequence: (
    displayTrack: BayanWithRelations,
    ayahUrls: string[],
    startIndex?: number,
    /** Clips to play before given ayah indexes (Isti'adhah / Bismillah). */
    preludes?: Record<number, AyahPrelude[]>,
    /** Start `startAt(clipDuration)` seconds into the first ayah's clip
     *  (no preludes then) — a reciter change mid-ayah. */
    startAt?: (clipDuration: number) => number
  ) => void;
  /** Per-ayah sequence: play ayah `index` — from `startAt(clipDuration)`
   *  seconds into its clip when given (a tapped word; no preludes then). */
  jumpToAyah: (index: number, startAt?: (clipDuration: number) => number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  next: () => void;
  /** Per-ayah sequence: what Next does on its last ayah (the next Juz). */
  setAyahSequenceNext: (fn: (() => void) | null) => void;
  /**
   * Whole-Surah track: where the recitation stops for each ayah's meaning —
   * `at` (seconds on the track timeline, between that ayah's voice and the
   * next one's) — then carries on from there. Checked every frame, so no
   * sound of the next ayah slips out first. Each is read once per pass: a
   * seek (a tapped word) lets it be read again; passing `at` by a seek skips
   * it. The last ayah's meaning comes with the track's end (setAyahMeaning).
   */
  setMeaningCues: (cues: MeaningCue[] | null) => void;
  /** The meaning clip read after ayah `index` of a per-ayah sequence — or,
   *  with null, after a whole-Surah track's last ayah — if any. */
  setAyahMeaning: (fn: ((index: number | null) => { url: string; key: string } | null) | null) => void;
  /** Call inside a tap that turns meaning audio on (iOS: lets it start later). */
  unlockMeaning: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (r: number) => void;
  addToQueue: (bayan: BayanWithRelations) => void;
  removeFromQueue: (bayanId: string) => void;
  playFromQueue: (index: number) => void;
  clearQueue: () => void;
  setExpanded: (expanded: boolean) => void;
  dismissContinue: () => void;
  /**
   * The next moment (on the clock being shown: `preludeCurrentTime` during a
   * prelude, else `currentTime`) at which the screen changes — the next word
   * of the ayah. `timeupdate` only fires ~4× a second, so a word would light
   * up to 250ms after the voice reaches it; while playing, the clock is also
   * updated on the first animation frame past this boundary. Null = none.
   */
  setTimeBoundary: (seconds: number | null) => void;
  setEndMode: (mode: EndMode) => void;
  /** Called when a per-ayah Juz sequence ends in "next" / "shuffle" mode (the
   *  Juz list lives with the page). Returns true when it started another. */
  setSequenceEndHandler: (fn: ((mode: EndMode) => boolean) | null) => void;
}

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

/** meaningDoneRef: a whole-Surah track's last-ayah meaning has been read. */
const TRACK_MEANING_DONE = -2;
/** A meaning cue fires this early (s): a frame, and the output's latency. */
const MEANING_CUE_LEAD = 0.05;
/** iOS Safari moves `currentTime` on only ~4× a second: between its steps the
 *  clock is carried on from the wall clock, by at most this much (s). */
const MAX_CLOCK_CARRY = 0.35;

/** Retries of a failed stream (same URL, same position) before giving up. */
const MAX_STREAM_RETRIES = 3;

function readPositions(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(POSITIONS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePosition(bayanId: string, seconds: number) {
  if (typeof window === "undefined") return;
  try {
    const map = readPositions();
    map[bayanId] = Math.floor(seconds);
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// A split second of silence: started inside a tap to unlock the standby
// <audio> on iOS (see unlockStandby).
const SILENT_WAV =
  "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

/** The unavailable-Surah message for a Surah track its reciter lacks, else null. */
function surahMissingFor(bayan: BayanWithRelations): string | null {
  if (!isSurahTrackId(bayan.id)) return null;
  const num = Number(bayan.id.replace(SURAH_TRACK_ID_PREFIX, ""));
  const reciter = resolveActiveReciter(bayan);
  if (reciterHasSurah(reciter, num)) return null;
  const lang = storedUiLang();
  return t(lang, "{surah} isn't available in {reciter}'s recordings. Choose another reciter.", {
    surah: lang === "en" ? bayan.title : surahNameIn(num, lang),
    reciter: reciter.displayName,
  });
}

/** The UI language as last picked (this provider sits above the language context). */
// The home-screen app (iOS "Open as Web App"), not a browser tab.
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** The error set when the home-screen app gets no sound (shown as a notice too). */
export const STANDALONE_SILENT = "Sound doesn't play in the Home Screen app on this device. Open HuDa in Safari instead.";

function storedUiLang(): UiLang {
  try {
    const v = localStorage.getItem(UI_LANG_KEY);
    return isUiLang(v) ? v : "en";
  } catch {
    return "en";
  }
}

/** The next / previous Surah (wrapping 114 ↔ 1) the reciter's server has. */
function stepAvailableSurah(reciter: ReturnType<typeof resolveActiveReciter>, from: number, dir: 1 | -1): number {
  let n = from;
  for (let i = 0; i < 114; i++) {
    n = dir > 0 ? (n >= 114 ? 1 : n + 1) : n <= 1 ? 114 : n - 1;
    if (reciterHasSurah(reciter, n)) return n;
  }
  return dir > 0 ? (from >= 114 ? 1 : from + 1) : from <= 1 ? 114 : from - 1;
}

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  // The element in use. A per-ayah sequence alternates between A and B: the
  // standby one holds the next clip loaded, so each ayah starts the moment
  // the previous one ends instead of after a src swap + load on one element.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const standbyUrlRef = useRef<string | null>(null);
  const standbyUnlockedRef = useRef(false);
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const preludeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaveRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
  // Stream recovery (onError): the raw position to come back to, the attempt
  // a newer load / retry cancels, and where the last retry resumed.
  const lastRawTimeRef = useRef<number>(0);
  const retryTokenRef = useRef<number>(0);
  const retryResumeRef = useRef<number>(0);
  const isPreludeRef = useRef<boolean>(false);
  const currentTrimOffsetRef = useRef<number>(0);
  // Active per-ayah recitation sequence (a Juz recited in a chosen reciter's
  // voice, streamed ayah-by-ayah from everyayah.com). Null for normal tracks.
  const ayahSeqRef = useRef<{
    urls: string[];
    index: number;
    pre: Record<number, AyahPrelude[]>;
    /** Position in pre[index] being played; -1 while the ayah itself plays. */
    preStep: number;
  } | null>(null);
  const ayahSeqNextRef = useRef<(() => void) | null>(null);
  const setAyahSequenceNext = useCallback((fn: (() => void) | null) => {
    ayahSeqNextRef.current = fn;
  }, []);
  // Meaning audio: its own element, played between ayahs while the recitation
  // waits — paused at the ayah's end (a whole-Surah track, "resume") or
  // before the next ayah's clip (a per-ayah sequence, "advance").
  const meaningAudioRef = useRef<HTMLAudioElement | null>(null);
  const meaningRef = useRef<{ key: string; then: "resume" | "advance" } | null>(null);
  const meaningUnlockedRef = useRef(false);
  const ayahMeaningRef = useRef<((index: number | null) => { url: string; key: string } | null) | null>(null);
  // The sequence index whose meaning was just read (its onEnded goes on);
  // TRACK_MEANING_DONE: a whole-Surah track's last ayah.
  const meaningDoneRef = useRef(-1);
  const setAyahMeaning = useCallback((fn: ((index: number | null) => { url: string; key: string } | null) | null) => {
    ayahMeaningRef.current = fn;
  }, []);
  const meaningCuesRef = useRef<MeaningCue[]>([]);
  // The meaning read last on this pass (a seek clears it): not again.
  const meaningCueReadRef = useRef<string | null>(null);
  // Where the last seek landed: a cue at or before it has been passed (a word
  // tapped at an ayah's start must not read the previous ayah's meaning).
  const meaningSeekFloorRef = useRef(-1);
  const setMeaningCues = useCallback((cues: MeaningCue[] | null) => {
    meaningCuesRef.current = cues ?? [];
  }, []);
  // The recitation's clock between iOS's coarse `currentTime` steps.
  const clockStepRef = useRef<{ raw: number; wall: number } | null>(null);
  // Starts the cue's meaning once the clock `t` reaches it (set below).
  const checkMeaningCueRef = useRef<(t: number) => boolean>(() => false);
  // One-shot start position for the next loadCurrent (see playBayan opts).
  const pendingStartAtRef = useRef<StartAt | null>(null);
  // True between loading a track with a forced start and applying it — the
  // element reports t=0 meanwhile, which would flash ayah 1 on screen.
  const forcedSeekPendingRef = useRef(false);
  // Per-ayah prefetch: the next ayahs are downloaded into memory (blob URLs)
  // while the current one plays, so each ayah starts instantly instead of
  // waiting ~0.5s on the network after the previous one ends.
  const ayahBlobRef = useRef<Map<string, string>>(new Map());
  const ayahInflightRef = useRef<Set<string>>(new Set());
  // Paused by the listener (pause / the lock screen), not by the system.
  const userPausedRef = useRef(false);
  // When the system last paused the recitation (a phone / FaceTime call):
  // it plays on once the call ends (see the audio-session effect). 0 = not.
  const interruptedRef = useRef(0);

  // After a call — or the iPad home-screen app coming back from another app —
  // iOS can leave the element "playing" without sound or time moving (pause
  // icon, 0:00, silence): if it hasn't moved shortly after play, load it again
  // from there. The prelude (a few seconds of Isti'adhah / Bismillah) still
  // stuck after that hands over to the reciter instead.
  const onPreludeEndedRef = useRef<() => void>(() => {});
  const kickIfStuck = useCallback((el: HTMLAudioElement, retried = false) => {
    const prelude = el === preludeAudioRef.current;
    const t0 = el.currentTime;
    setTimeout(() => {
      const active = prelude ? isPreludeRef.current : audioRef.current === el;
      if (!active || el.paused || el.ended || userPausedRef.current) return;
      if (Math.abs(el.currentTime - t0) > 0.05 || el.readyState < 3) return;
      const src = el.getAttribute("src");
      if (!src) return;
      if (retried) {
        if (prelude) {
          el.pause();
          onPreludeEndedRef.current();
          return;
        }
        // Still frozen after a reload in the home-screen app: some iPads give
        // that app no sound at all (Safari on the same iPad plays). Say so,
        // instead of a pause icon over silence.
        if (isStandalone()) {
          userPausedRef.current = true;
          el.pause();
          setIsPlaying(false);
          setIsLoading(false);
          setError(t(storedUiLang(), STANDALONE_SILENT));
        }
        return;
      }
      el.src = src;
      el.load();
      el.addEventListener(
        "loadedmetadata",
        () => {
          try {
            el.currentTime = t0;
          } catch {
            /* ignore */
          }
          el.play().then(() => kickIfStuck(el, true)).catch(() => {});
        },
        { once: true },
      );
    }, 2000);
    // Reads only refs (and itself).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [queue, setQueue] = useState<BayanWithRelations[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [meaningClip, setMeaningClip] = useState<MeaningClipState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [continueListening, setContinueListening] =
    useState<ContinueListening | null>(null);

  // Custom Prelude State (Isti'adhah & Bismillah)
  const [isPrelude, setIsPrelude] = useState(false);
  const [preludeType, setPreludeType] = useState<"fatihah" | "bismillah" | "none" | null>(null);
  const [preludeCurrentTime, setPreludeCurrentTime] = useState(0);
  const [preludeDuration, setPreludeDuration] = useState(0);
  // Per-ayah Juz sequence position (for the progress bar & current-ayah verse).
  const [ayahSequence, setAyahSequence] = useState<AyahSequenceState | null>(null);
  const [endMode, setEndModeState] = useState<EndMode>("next");
  const sequenceEndHandlerRef = useRef<((mode: EndMode) => boolean) | null>(null);

  const current = queue[currentIndex] ?? null;

  // Restore saved preferences & purge legacy demo references
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof prefs.volume === "number") setVolumeState(prefs.volume);
      if (typeof prefs.playbackRate === "number")
        setPlaybackRateState(prefs.playbackRate);
      if (typeof prefs.isMuted === "boolean") setIsMuted(prefs.isMuted);
      const mode = localStorage.getItem(END_MODE_KEY);
      if (mode && (END_MODES as readonly string[]).includes(mode)) setEndModeState(mode as EndMode);

      const last = localStorage.getItem(LAST_KEY);
      if (last) {
        const parsed = JSON.parse(last);
        if (parsed?.bayan?.audioUrl?.includes("SoundHelix")) {
          localStorage.removeItem(LAST_KEY);
        } else {
          setContinueListening(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Sync volume, mute & playbackRate to HTML5 audio elements. Every new src
  // load() resets playbackRate to defaultPlaybackRate, so both are set — else
  // the next Surah (or the prelude) played at 1× while the button said 1.25×.
  useEffect(() => {
    for (const el of [audioARef.current, audioBRef.current, preludeAudioRef.current, meaningAudioRef.current]) {
      if (!el) continue;
      el.volume = volume;
      el.muted = isMuted;
      el.defaultPlaybackRate = playbackRate;
      el.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  // Keep the screen awake while a recitation is playing (Screen Wake Lock API).
  // The browser drops the lock whenever the tab is hidden, so re-acquire on
  // return. Release is delayed briefly so ayah-to-ayah gaps don't let it lapse.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        /* denied (e.g. battery saver) — nothing to do */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && isPlaying) acquire();
    };

    if (isPlaying) {
      acquire();
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const lock = sentinel;
      sentinel = null;
      if (lock) setTimeout(() => lock.release().catch(() => {}), 3000);
    };
  }, [isPlaying]);

  const persistLast = useCallback(
    (bayan: BayanWithRelations, position: number) => {
      try {
        localStorage.setItem(
          LAST_KEY,
          JSON.stringify({ bayan, position } satisfies ContinueListening)
        );
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Stop a meaning clip without going on (the listener moved elsewhere).
  // True when one was playing.
  const cancelMeaning = useCallback((): boolean => {
    if (!meaningRef.current) return false;
    meaningRef.current = null;
    setMeaningClip(null);
    const mel = meaningAudioRef.current;
    if (mel) {
      mel.pause();
      mel.removeAttribute("src");
      mel.load();
    }
    return true;
  }, []);

  // iOS lets an element start without a tap only once one has started it
  // (the meaning clip starts from an ayah's end): unlock it inside the tap.
  // Not muted: a muted start doesn't count on iOS (the meaning stayed silent
  // on iPad) — the clip is silent anyway. A failed try may try again.
  const unlockMeaning = useCallback(() => {
    const mel = meaningAudioRef.current;
    if (!mel || meaningUnlockedRef.current || meaningRef.current) return;
    meaningUnlockedRef.current = true;
    mel.src = SILENT_WAV;
    mel.play().then(() => mel.pause()).catch(() => { meaningUnlockedRef.current = false; });
  }, []);

  /**
   * Loads a track into the HTML5 audio element (with its Surah prelude when
   * one applies). Falls back to a known-good recitation if the track has no URL.
   */
  const loadCurrent = useCallback(
    async (bayan: BayanWithRelations, autoplay: boolean) => {
      // A Surah the reciter's server doesn't have (some Audio Only reciters
      // publish only part of the Quran): say so instead of loading a 404 —
      // and never swap in another reciter's voice.
      const missing = surahMissingFor(bayan);
      if (missing) {
        pendingStartAtRef.current = null;
        ayahSeqRef.current = null;
        setAyahSequence(null);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
        }
        setIsPlaying(false);
        setIsLoading(false);
        setError(missing);
        return;
      }
      const forcedStart = pendingStartAtRef.current;
      // A function start resolves against the real duration on metadata; until
      // then use the track's nominal duration so the UI shows the right ayah.
      const startFn = typeof forcedStart === "function" ? forcedStart : null;
      const nominalDur = bayan.durationSeconds || 0;
      const forcedStartAt: number | null = startFn
        ? nominalDur > 0 ? startFn(nominalDur) : 0
        : (forcedStart as number | null);
      const hasForcedStart = Boolean(startFn || (forcedStartAt && forcedStartAt > 0));
      pendingStartAtRef.current = null;
      forcedSeekPendingRef.current = false;
      cancelMeaning();
      meaningCuesRef.current = [];
      meaningCueReadRef.current = null;
      meaningSeekFloorRef.current = -1;
      meaningDoneRef.current = -1;
      setError(null);
      retryCountRef.current = 0;
      retryTokenRef.current += 1;
      lastRawTimeRef.current = 0;
      // Any normal load cancels an in-flight per-ayah Juz sequence.
      ayahSeqRef.current = null;
      setAyahSequence(null);
      clearStandby();
      ayahBlobRef.current.forEach((b) => URL.revokeObjectURL(b));
      ayahBlobRef.current.clear();
      const localAudioUrl =
        bayan.audioSource === "local" && bayan.audioUrl && !bayan.audioUrl.includes("SoundHelix")
          ? bayan.audioUrl
          : null;

      // ── TRACK AUDIO ─────────────────────────────────────────────────────
      if (localAudioUrl) {
        const isSurah = isSurahTrackId(bayan.id);
        const surahNum = isSurah ? Number(bayan.id.replace(SURAH_TRACK_ID_PREFIX, "")) : null;
        const preludeReciter = isSurah ? resolveActiveReciter(bayan) : null;
        const preludeCfg = surahNum ? getSurahPreludeConfig(surahNum, preludeReciter) : null;
        const trimOffset = surahNum ? getReciterAyah1TrimOffset(surahNum, bayan.speaker?.slug) : 0;
        currentTrimOffsetRef.current = trimOffset;

        // Resuming mid-surah (forcedStartAt) skips the Bismillah prelude.
        if (preludeCfg && preludeCfg.hasPrelude && preludeCfg.url && !hasForcedStart) {
          isPreludeRef.current = true;
          setIsPrelude(true);
          setPreludeType(preludeCfg.type);
          setPreludeCurrentTime(0);
          setPreludeDuration(preludeCfg.duration);
          setCurrentTime(0);
          setDuration(bayan.durationSeconds ? Math.max(0, bayan.durationSeconds - trimOffset) : 300);

          const pel = preludeAudioRef.current;
          if (pel) {
            pel.src = preludeCfg.url;
            pel.currentTime = 0;
            pel.load();
            if (autoplay) {
              setIsLoading(true); // show spinner while the prelude buffers
              pel.play().then(() => {
                setIsPlaying(true);
                kickIfStuck(pel);
              }).catch(() => {
                setIsPlaying(false);
                setIsLoading(false);
              });
            }
          }

          // Preload reciter stream in background
          const el = audioRef.current;
          if (el) {
            el.preload = "auto";
            el.src = localAudioUrl;
            el.load();
          }
          return;
        }

        // Standard non-prelude track (Surah 9, Juz files, etc.)
        if (preludeAudioRef.current) {
          preludeAudioRef.current.pause();
          preludeAudioRef.current.src = "";
        }
        isPreludeRef.current = false;
        setIsPrelude(false);
        setPreludeType(null);
        setPreludeCurrentTime(0);
        setPreludeDuration(0);
        currentTrimOffsetRef.current = 0;

        const el = audioRef.current;
        if (!el) return;

        setIsLoading(true);
        el.preload = "auto";
        el.src = localAudioUrl;
        el.load();

        const isQuran = isQuranTrack(bayan.id);
        const saved = isQuran ? 0 : (readPositions()[bayan.id] ?? 0);
        const startAt =
          forcedStartAt && forcedStartAt > 0
            ? forcedStartAt
            : saved > 0 && saved < bayan.durationSeconds - 5 ? saved : 0;
        // Forced starts are on the track timeline (ayah-1 trim offset excluded),
        // like seek(); saved positions are raw element time.
        const rawStartAt = forcedStartAt && forcedStartAt > 0 ? startAt + trimOffset : startAt;
        setCurrentTime(startAt);
        if (startFn && nominalDur > 0) setDuration(Math.max(0, nominalDur - trimOffset));
        forcedSeekPendingRef.current = hasForcedStart;

        // Start playback ASAP
        if (autoplay) {
          el.play().then(() => kickIfStuck(el)).catch(() => setIsPlaying(false));
        }

        // Once metadata arrives, apply duration
        const onLoaded = () => {
          if (startFn) {
            const realDur = Number.isFinite(el.duration) ? el.duration - trimOffset : nominalDur;
            const t = Math.max(0, Math.min(startFn(realDur), realDur - 1));
            try {
              el.currentTime = t + trimOffset;
            } catch {
              /* ignore */
            }
            setCurrentTime(t);
          } else if (startAt > 0) {
            try {
              el.currentTime = rawStartAt;
            } catch {
              /* ignore */
            }
          } else {
            try {
              el.currentTime = 0;
            } catch {
              /* ignore */
            }
          }
          forcedSeekPendingRef.current = false;
          setDuration(
            Number.isFinite(el.duration) ? Math.max(0, el.duration - trimOffset) : bayan.durationSeconds
          );
          setIsLoading(false);
        };
        el.addEventListener("loadedmetadata", onLoaded, { once: true });
        return;
      }

      // ── FALLBACK: no usable URL ────────────────────────────────────────
      const fallbackUrl = "https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/1.mp3";

      const el = audioRef.current;
      if (!el) return;
      setIsLoading(true);
      el.src = fallbackUrl;
      el.load();
      el.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (autoplay) el.play().catch(() => setIsPlaying(false));
      }, { once: true });
    },
    [kickIfStuck, cancelMeaning]
  );

  const playBayan = useCallback(
    (bayan: BayanWithRelations, contextList?: BayanWithRelations[], opts?: { startAt?: StartAt }) => {
      let nextQueue: BayanWithRelations[];
      let index: number;

      if (contextList && contextList.length > 0) {
        nextQueue = contextList;
        index = Math.max(
          0,
          contextList.findIndex((b) => b.id === bayan.id)
        );
      } else {
        const existing = queue.findIndex((b) => b.id === bayan.id);
        if (existing >= 0) {
          nextQueue = queue;
          index = existing;
        } else {
          nextQueue = [bayan];
          index = 0;
        }
      }

      setQueue(nextQueue);
      setCurrentIndex(index);
      pendingStartAtRef.current = opts?.startAt ?? null;
      unlockMeaning();
      loadCurrent(nextQueue[index], true);
      persistLast(nextQueue[index], readPositions()[bayan.id] ?? 0);
      setContinueListening(null);

    },
    [queue, loadCurrent, persistLast, unlockMeaning]
  );

  const cueBayan = useCallback(
    (bayan: BayanWithRelations, contextList?: BayanWithRelations[], opts?: { startAt?: StartAt }) => {
      let nextQueue: BayanWithRelations[];
      let index: number;

      if (contextList && contextList.length > 0) {
        nextQueue = contextList;
        index = Math.max(
          0,
          contextList.findIndex((b) => b.id === bayan.id)
        );
      } else {
        const existing = queue.findIndex((b) => b.id === bayan.id);
        if (existing >= 0) {
          nextQueue = queue;
          index = existing;
        } else {
          nextQueue = [bayan];
          index = 0;
        }
      }

      setQueue(nextQueue);
      setCurrentIndex(index);
      pendingStartAtRef.current = opts?.startAt ?? null;
      // Cueing isn't listening: the home screen cues Al-Fatihah on every open,
      // which must not overwrite (or hide) where the listener left off.
      loadCurrent(nextQueue[index], false);
    },
    [queue, loadCurrent]
  );

  /**
   * Play a display track whose audio is a sequence of per-ayah files (a Juz
   * recited in a chosen reciter's voice). The UI shows `displayTrack` (e.g.
   * "Juz 4 • Al-Sudais") while the player chains `ayahUrls` back-to-back.
   */
  const playAyahSequence = useCallback(
    (
      displayTrack: BayanWithRelations,
      ayahUrls: string[],
      startIndex: number = 0,
      preludes: Record<number, AyahPrelude[]> = {},
      startAt?: (clipDuration: number) => number
    ) => {
      if (!ayahUrls || ayahUrls.length === 0) return;
      const startIdx = Math.max(0, Math.min(startIndex, ayahUrls.length - 1));
      // Stop any prelude and switch to the main element.
      if (preludeAudioRef.current) {
        preludeAudioRef.current.pause();
        preludeAudioRef.current.src = "";
      }
      isPreludeRef.current = false;
      setIsPrelude(false);
      setPreludeType(null);
      currentTrimOffsetRef.current = 0;
      retryCountRef.current = 0;
      setError(null);

      standbyUrlRef.current = null;
      unlockStandby();
      unlockMeaning();
      cancelMeaning();
      ayahSeqRef.current = { urls: ayahUrls, index: startIdx, pre: preludes, preStep: -1 };
      setQueue([displayTrack]);
      setCurrentIndex(0);
      setContinueListening(null);
      setCurrentTime(0);
      setDuration(0);
      // A start inside the ayah (a reciter change mid-ayah) skips its preludes.
      loadAyahAt(startIdx, !startAt, startAt);
      setIsPlaying(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Keep blobs for a small window around the current ayah; free the rest.
  const prefetchAyahsAround = useCallback((urls: string[], idx: number) => {
    const pre = ayahSeqRef.current?.pre ?? {};
    const preUrls = (i: number) => (pre[i] ?? []).map((p) => p.url);
    const ahead: string[] = [];
    for (let i = idx; i < idx + 3; i++) {
      if (i > idx && urls[i]) ahead.push(...preUrls(i), urls[i]);
    }
    const keep = new Set([...urls.slice(Math.max(0, idx - 1), idx + 3), ...preUrls(idx), ...ahead]);
    for (const [url, blobUrl] of ayahBlobRef.current) {
      if (!keep.has(url)) {
        URL.revokeObjectURL(blobUrl);
        ayahBlobRef.current.delete(url);
      }
    }
    for (const url of ahead) {
      if (ayahBlobRef.current.has(url) || ayahInflightRef.current.has(url)) continue;
      ayahInflightRef.current.add(url);
      fetch(url)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          // Only keep it if this ayah is still part of the active sequence.
          if (b && ayahSeqRef.current) {
            ayahBlobRef.current.set(url, URL.createObjectURL(b));
            // The standby element may be streaming this clip: use the blob.
            if (standbyUrlRef.current === url) primeStandby(true);
          }
        })
        .catch(() => {
          /* fall back to streaming that ayah */
        })
        .finally(() => ayahInflightRef.current.delete(url));
    }
  }, []);

  const ayahSrc = (url: string) => ayahBlobRef.current.get(url) ?? url;

  const standbyAudio = () =>
    audioRef.current === audioBRef.current ? audioARef.current : audioBRef.current;

  // The clip that follows the one now playing: the next prelude clip, the
  // ayah after its preludes, or the next ayah (its first prelude, if any).
  const nextClipUrl = (): string | null => {
    const seq = ayahSeqRef.current;
    if (!seq) return null;
    if (seq.preStep >= 0) return seq.pre[seq.index]?.[seq.preStep + 1]?.url ?? seq.urls[seq.index];
    const n = seq.index + 1;
    if (n >= seq.urls.length) return null;
    return seq.pre[n]?.[0]?.url ?? seq.urls[n];
  };

  // Load the next clip into the standby element (again with `force`, once
  // its blob has arrived) so it can start without a network / decode wait.
  const primeStandby = (force = false) => {
    const sb = standbyAudio();
    const url = nextClipUrl();
    if (!sb || !url || (!force && standbyUrlRef.current === url)) return;
    if (force && standbyUrlRef.current !== url) return;
    standbyUrlRef.current = url;
    sb.preload = "auto";
    sb.src = ayahSrc(url);
    sb.load();
  };

  const clearStandby = () => {
    standbyUrlRef.current = null;
    const sb = standbyAudio();
    if (sb && sb.getAttribute("src")) {
      sb.pause();
      sb.removeAttribute("src");
      sb.load();
    }
  };

  // iOS only lets an element play without a tap once it has been started from
  // one: start the standby element (muted, on a silent clip) inside the tap.
  const unlockStandby = () => {
    const sb = standbyAudio();
    if (!sb || standbyUnlockedRef.current) return;
    standbyUnlockedRef.current = true;
    const muted = sb.muted;
    sb.muted = true;
    sb.src = SILENT_WAV;
    sb.play().then(() => sb.pause()).catch(() => {}).finally(() => { sb.muted = muted; });
  };

  // A clip started part-way (a tapped word): once its length is known.
  const startClipAt = (el: HTMLAudioElement, startAt?: (dur: number) => number) => {
    if (!startAt) return;
    const go = () => {
      const t = startAt(Number.isFinite(el.duration) ? el.duration : 0);
      if (t > 0) {
        try {
          el.currentTime = t;
        } catch {
          /* ignore */
        }
      }
    };
    if (el.readyState >= 1) go();
    else el.addEventListener("loadedmetadata", go, { once: true });
  };
  // Start one clip of the sequence: hand over to the standby element when it
  // already holds this clip, else load it on the current element.
  const playClip = (url: string, startAt?: (dur: number) => number) => {
    const cur = audioRef.current;
    const sb = standbyAudio();
    if (cur && sb && standbyUrlRef.current === url && sb.getAttribute("src") && !sb.error) {
      audioRef.current = sb; // before pausing, so cur's events are ignored
      standbyUrlRef.current = null;
      cur.pause();
      sb.volume = cur.volume;
      sb.muted = cur.muted;
      sb.defaultPlaybackRate = cur.playbackRate;
      sb.playbackRate = cur.playbackRate;
      try { sb.currentTime = 0; } catch { /* ignore */ }
      startClipAt(sb, startAt);
      setDuration(Number.isFinite(sb.duration) ? sb.duration : 0);
      sb.play().catch(() => {});
    } else if (cur) {
      cur.src = ayahSrc(url);
      cur.currentTime = 0;
      cur.load();
      startClipAt(cur, startAt);
      setDuration(0);
      cur.play().catch(() => {});
    }
    // The previous clip's time must not be read against the new ayah's words
    // (it flashed the new ayah's last word and jerked the scroll).
    setCurrentTime(0);
    primeStandby();
  };

  // Load a specific ayah of the active sequence (keeps ayahSequence state in
  // sync). With `withPre`, that ayah's prelude clips (Isti'adhah / Bismillah)
  // play first; the ayah follows from onEnded (see advanceAyahSequence).
  const loadAyahAt = useCallback((i: number, withPre: boolean = true, startAt?: (dur: number) => number) => {
    const seq = ayahSeqRef.current;
    if (!seq) return;
    const idx = Math.max(0, Math.min(i, seq.urls.length - 1));
    seq.index = idx;
    cancelMeaning();
    meaningDoneRef.current = -1;
    const pre = withPre ? seq.pre[idx] ?? [] : [];
    seq.preStep = pre.length > 0 ? 0 : -1;
    setAyahSequence({ index: idx, total: seq.urls.length, preType: pre[0]?.type ?? null });
    prefetchAyahsAround(seq.urls, idx);
    playClip(pre.length > 0 ? pre[0].url : seq.urls[idx], pre.length > 0 ? undefined : startAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefetchAyahsAround]);

  // Current clip finished (or failed): next prelude clip → the ayah itself →
  // the next ayah (with its own preludes). Returns false at the sequence end.
  const advanceAyahSequence = useCallback((): boolean => {
    const seq = ayahSeqRef.current;
    if (!seq) return false;
    if (seq.preStep >= 0) {
      const pre = seq.pre[seq.index] ?? [];
      const nextStep = seq.preStep + 1;
      if (nextStep < pre.length) {
        seq.preStep = nextStep;
        setAyahSequence({ index: seq.index, total: seq.urls.length, preType: pre[nextStep].type });
        playClip(pre[nextStep].url);
        return true;
      }
      loadAyahAt(seq.index, false); // preludes done → the ayah itself
      return true;
    }
    if (seq.index + 1 < seq.urls.length) {
      loadAyahAt(seq.index + 1, true);
      return true;
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAyahAt]);

  const jumpToAyah = useCallback((index: number, startAt?: (clipDuration: number) => number) => {
    if (ayahSeqRef.current) loadAyahAt(index, !startAt, startAt);
  }, [loadAyahAt]);

  const pause = useCallback(() => {
    userPausedRef.current = true;
    interruptedRef.current = 0;
    if (meaningRef.current) {
      meaningAudioRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (isPreludeRef.current && preludeAudioRef.current) {
      preludeAudioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    userPausedRef.current = false;
    interruptedRef.current = 0;
    unlockMeaning();
    const mel = meaningAudioRef.current;
    if (meaningRef.current && mel) {
      mel.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }
    if (isPreludeRef.current && preludeAudioRef.current) {
      setIsLoading(true); // spinner while the prelude resumes/buffers
      const pel = preludeAudioRef.current;
      pel
        .play()
        .then(() => {
          setIsPlaying(true);
          kickIfStuck(pel);
        })
        .catch(() => setIsLoading(false));
      return;
    }
    if (!current) return;
    const el = audioRef.current;
    if (!el) return;
    if (!el.src && current.audioUrl) {
      loadCurrent(current, true);
      return;
    }
    // Gave up after a stream error (see onError): play loads it again, from
    // where it stopped.
    if (el.error && !ayahSeqRef.current) {
      const at = lastRawTimeRef.current - currentTrimOffsetRef.current;
      if (at > 0) pendingStartAtRef.current = at;
      loadCurrent(current, true);
      return;
    }
    el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    kickIfStuck(el);
  }, [current, loadCurrent, kickIfStuck, unlockMeaning]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((seconds: number) => {
    // A seek during a meaning clip goes straight there (the recitation waited),
    // and that ayah's meaning is read again at its end.
    const wasInMeaning = cancelMeaning();
    meaningCueReadRef.current = null;
    meaningSeekFloorRef.current = Math.max(0, seconds);
    clockStepRef.current = null;
    // If user explicitly seeks during prelude, stop prelude and jump directly into the Surah verses
    const wasInPrelude = isPreludeRef.current;
    if (wasInPrelude) {
      if (preludeAudioRef.current) {
        preludeAudioRef.current.pause();
      }
      isPreludeRef.current = false;
      setIsPrelude(false);
      setPreludeType(null);
    }
    const el = audioRef.current;
    if (!el) return;
    const offset = currentTrimOffsetRef.current;
    const target = Math.max(0, seconds) + offset;
    try {
      el.currentTime = target;
    } catch {
      /* ignore */
    }
    setCurrentTime(Math.max(0, seconds));
    if ((wasInPrelude || wasInMeaning) && isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    }
  }, [isPlaying, cancelMeaning]);

  const playFromQueue = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      if (preludeAudioRef.current) {
        preludeAudioRef.current.pause();
        preludeAudioRef.current.src = "";
      }
      isPreludeRef.current = false;
      setIsPrelude(false);
      setCurrentIndex(index);
      loadCurrent(queue[index], true);
      persistLast(queue[index], 0);
    },
    [queue, loadCurrent, persistLast]
  );

  const next = useCallback(() => {
    // Per-ayah Juz sequence: skip forward one ayah; on the last one, the
    // next Juz (it replayed the last ayah).
    const seq = ayahSeqRef.current;
    if (seq) {
      if (seq.index + 1 >= seq.urls.length && ayahSeqNextRef.current) ayahSeqNextRef.current();
      else loadAyahAt(seq.index + 1);
      return;
    }
    if (preludeAudioRef.current) {
      preludeAudioRef.current.pause();
      preludeAudioRef.current.src = "";
    }
    isPreludeRef.current = false;
    setIsPrelude(false);

    if (current && isSurahTrackId(current.id)) {
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      const activeReciter = resolveActiveReciter(current);
      const nextNum = stepAvailableSurah(activeReciter, num, 1);
      const surahTracks = getSurahTracksForReciter(activeReciter);
      const nextTrack = surahTracks[nextNum - 1];
      if (nextTrack) {
        playBayan(nextTrack, surahTracks);
        return;
      }
    }
    if (currentIndex < queue.length - 1) playFromQueue(currentIndex + 1);
  }, [current, currentIndex, queue.length, playFromQueue, playBayan, loadAyahAt]);

  const previous = useCallback(() => {
    // Per-ayah Juz sequence: restart the ayah, or step back one.
    const seq = ayahSeqRef.current;
    if (seq) {
      const el = audioRef.current;
      // During its meaning: that ayah again.
      if (meaningRef.current) { loadAyahAt(seq.index, false); return; }
      if (el && el.currentTime > 3) { el.currentTime = 0; return; }
      loadAyahAt(seq.index - 1);
      return;
    }
    if (preludeAudioRef.current) {
      preludeAudioRef.current.pause();
      preludeAudioRef.current.src = "";
    }
    isPreludeRef.current = false;
    setIsPrelude(false);

    const el = audioRef.current;
    if (el && el.currentTime > 3) {
      seek(0);
      return;
    }
    if (current && isSurahTrackId(current.id)) {
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      const activeReciter = resolveActiveReciter(current);
      const prevNum = stepAvailableSurah(activeReciter, num, -1);
      const surahTracks = getSurahTracksForReciter(activeReciter);
      const prevTrack = surahTracks[prevNum - 1];
      if (prevTrack) {
        playBayan(prevTrack, surahTracks);
        return;
      }
    }
    if (currentIndex > 0) playFromQueue(currentIndex - 1);
  }, [current, currentIndex, playFromQueue, playBayan, seek, loadAyahAt]);

  // Lock screen / notification / headset controls (Media Session API): what
  // is playing, play / pause, previous / next and seeking, so a listener with
  // the phone locked or the tab in the background can still control it.
  const mediaActionsRef = useRef({ resume, pause, next, previous, seek, time: currentTime });
  mediaActionsRef.current = { resume, pause, next, previous, seek, time: currentTime };
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const act = () => mediaActionsRef.current;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => act().resume()],
      ["pause", () => act().pause()],
      ["previoustrack", () => act().previous()],
      ["nexttrack", () => act().next()],
      ["seekbackward", (d) => act().seek(Math.max(0, act().time - (d.seekOffset ?? 10)))],
      ["seekforward", (d) => act().seek(act().time + (d.seekOffset ?? 10))],
      ["seekto", (d) => typeof d.seekTime === "number" && act().seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported here */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);
  // What the lock screen / Control Centre shows. iOS Safari drops metadata
  // set before the <audio> starts (each new src resets "Now Playing" — the
  // lock screen showed a blank card), so it is set again on every "playing"
  // of the active element and the prelude, not only when the track changes.
  const currentRef = useRef(current);
  currentRef.current = current;
  const metaRetryRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const applyMediaMetadata = useCallback((retry = true) => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    // iOS can still blank the card just after a new stream starts (Now Playing
    // is rebuilt from the element a moment later): set it again shortly after.
    if (retry) {
      metaRetryRef.current.forEach(clearTimeout);
      metaRetryRef.current = [500, 2000].map((ms) => setTimeout(() => applyMediaMetadata(false), ms));
    }
    const track = currentRef.current;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const reciter = resolveActiveReciter(track);
    const abs = (u: string) => new URL(u, window.location.href).href;
    // The scene lives on R2 (cross-origin, full-size, wide). The home-screen
    // app's lock screen skips such artwork — and can then blank the whole
    // card — and shows a wide one as a wide card, so it comes through the
    // site's own artwork route: same origin, a 512 px square.
    const cover = track.coverImageUrl;
    const art = cover ? `/api/artwork?src=${encodeURIComponent(cover)}` : null;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: reciter?.displayName ?? track.speaker?.name ?? "",
      album: "HuDa Web Quran",
      // The scene, then the logo (same origin) if the scene can't be shown.
      artwork: [
        ...(art ? [{ src: abs(art), sizes: "512x512", type: "image/jpeg" }] : []),
        { src: abs("/icon-512.png"), sizes: "512x512", type: "image/png" },
        { src: abs("/icon-192.png"), sizes: "192x192", type: "image/png" },
      ],
    });
  }, []);
  useEffect(() => {
    applyMediaMetadata();
  }, [current, applyMediaMetadata]);
  // Pending retries must not outlive the provider.
  useEffect(() => () => metaRetryRef.current.forEach(clearTimeout), []);
  // Locking the phone is when the lock screen reads it: set it as the page hides.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") applyMediaMetadata(false);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [applyMediaMetadata]);

  // One recitation at a time: "playback" (not mixable) makes iOS pause this
  // tab when another app — Instagram, a video — starts its sound, and pause
  // that one when the recitation starts (Safari 17+; elsewhere a no-op).
  useEffect(() => {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) {
      try {
        session.type = "playback";
      } catch {
        /* not supported */
      }
    }
  }, []);
  // A phone / FaceTime call interrupts the audio session and iOS pauses the
  // recitation; it never started again after the call. When the session
  // leaves "interrupted" (checked again on return, in case the page was
  // asleep through the call), play on — only if it was the call that paused
  // it (not the listener, nor headphones coming out).
  useEffect(() => {
    const session = (navigator as Navigator & { audioSession?: EventTarget & { state?: string } }).audioSession;
    if (!session || typeof session.addEventListener !== "function") return;
    let prev = session.state;
    const onState = () => {
      const state = session.state;
      const was = prev;
      prev = state;
      if (was !== "interrupted" || state === "interrupted") return;
      const at = interruptedRef.current;
      if (at && Date.now() - at < 10 * 60_000 && !userPausedRef.current) mediaActionsRef.current.resume();
    };
    const onShow = () => document.visibilityState === "visible" && onState();
    session.addEventListener("statechange", onState);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      session.removeEventListener("statechange", onState);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, []);
  // Back from another app (the iPad home-screen app especially), iOS can
  // keep the recitation "playing" with the clock frozen and no sound: check
  // the element in use once the page shows again.
  useEffect(() => {
    if (!isPlaying) return;
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      const el = isPreludeRef.current ? preludeAudioRef.current : audioRef.current;
      if (!el) return;
      // Paused while the app was away without a pause event reaching us:
      // show play, so a tap starts it again.
      if (el.paused && !el.ended && el.getAttribute("src")) setIsPlaying(false);
      else kickIfStuck(el);
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
    };
    // kickIfStuck only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = current ? (isPlaying ? "playing" : "paused") : "none";
  }, [current, isPlaying]);
  // The lock screen's progress bar: set on play / pause / seek / length
  // changes (the OS runs it forward from there), not on every tick.
  const positionTick = Math.floor(currentTime / 15);
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!(duration > 0) || !Number.isFinite(duration)) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: playbackRate || 1,
        position: Math.min(Math.max(0, mediaActionsRef.current.time), duration),
      });
    } catch {
      /* ignore */
    }
  }, [duration, playbackRate, isPlaying, positionTick]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (clamped > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setPlaybackRate = useCallback((r: number) => {
    setPlaybackRateState(r);
  }, []);

  const setEndMode = useCallback((mode: EndMode) => {
    setEndModeState(mode);
    try {
      localStorage.setItem(END_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const setSequenceEndHandler = useCallback((fn: ((mode: EndMode) => boolean) | null) => {
    sequenceEndHandlerRef.current = fn;
  }, []);

  const addToQueue = useCallback((bayan: BayanWithRelations) => {
    setQueue((q) => (q.some((b) => b.id === bayan.id) ? q : [...q, bayan]));
  }, []);

  const removeFromQueue = useCallback(
    (bayanId: string) => {
      setQueue((q) => {
        const idx = q.findIndex((b) => b.id === bayanId);
        if (idx < 0) return q;
        const nextQ = q.filter((b) => b.id !== bayanId);
        if (idx < currentIndex) setCurrentIndex((c) => c - 1);
        return nextQ;
      });
    },
    [currentIndex]
  );

  const clearQueue = useCallback(() => {
    setQueue((q) => (current ? [current] : []));
    setCurrentIndex(0);
  }, [current]);

  const setExpanded = useCallback((expanded: boolean) => {
    setIsExpanded(expanded);
  }, []);

  const dismissContinue = useCallback(() => {
    setContinueListening(null);
    try {
      localStorage.removeItem(LAST_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const onPreludeEnded = useCallback(() => {
    isPreludeRef.current = false;
    setIsPrelude(false);
    setPreludeType(null);
    setPreludeCurrentTime(0);

    const el = audioRef.current;
    if (!el) return;
    const offset = currentTrimOffsetRef.current;
    try {
      el.currentTime = offset;
    } catch {
      /* ignore */
    }
    setCurrentTime(0);
    setIsLoading(true); // handoff gap: spinner until the reciter stream starts
    el.play().then(() => {
      setIsPlaying(true);
      kickIfStuck(el);
    }).catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });
  }, [kickIfStuck]);
  onPreludeEndedRef.current = onPreludeEnded;

  const onPreludeTimeUpdate = useCallback(() => {
    const pel = preludeAudioRef.current;
    if (!pel || !isPreludeRef.current) return;
    // Surah 1: the reciter's own audio already recites Bismillah, so we play
    // only the Isti'adhah portion of the prelude and then hand off to the
    // reciter's voice — avoiding a duplicated Bismillah while still opening with
    // "A'udhu billahi..." → the reciter's own "Bismillah..." → the ayahs.
    const src = pel.currentSrc || pel.src;
    if ((src.includes("fatihah-prelude") || src.includes("istiadhah")) && pel.currentTime >= PRELUDE_AUDIO.fatihah.istiadhahEndTime) {
      pel.pause();
      onPreludeEnded();
      return;
    }
    setPreludeCurrentTime(pel.currentTime);
    setCurrentTime(0); // Audio counter strictly stays at 00:00 during prelude!
  }, [onPreludeEnded]);

  const onPreludeError = useCallback(() => {
    // Clearing the prelude's src (src = "") on every track switch fires an
    // `error` event too. Only a prelude that is actually playing may hand off —
    // otherwise this reset the new track to 0 (ayah 1 flashed on reciter change).
    if (!isPreludeRef.current) return;
    console.warn("[Huda Audio] Prelude playback failed, continuing to main reciter audio");
    onPreludeEnded();
  }, [onPreludeEnded]);

  // Word-accurate clock: see setTimeBoundary in AudioPlayerApi. Only the
  // frame that crosses the boundary sets state, so the tree re-renders once
  // per word, not every frame.
  const timeBoundaryRef = useRef<number | null>(null);
  const setTimeBoundary = useCallback((seconds: number | null) => {
    timeBoundaryRef.current = seconds;
  }, []);
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    const frame = () => {
      if (meaningCuesRef.current.length && !forcedSeekPendingRef.current && !isPreludeRef.current) {
        const el = audioRef.current;
        // Paused (the meaning, a pause): the clock starts afresh after it.
        if (!el || el.paused) clockStepRef.current = null;
        else {
          const now = performance.now();
          const step = clockStepRef.current;
          if (!step || step.raw !== el.currentTime) clockStepRef.current = { raw: el.currentTime, wall: now };
          const { raw, wall } = clockStepRef.current!;
          const carried = Math.min(MAX_CLOCK_CARRY, ((now - wall) / 1000) * (el.playbackRate || 1));
          checkMeaningCueRef.current(raw + carried - currentTrimOffsetRef.current);
        }
      }
      const b = timeBoundaryRef.current;
      if (b !== null && !forcedSeekPendingRef.current) {
        if (isPreludeRef.current) {
          const pel = preludeAudioRef.current;
          if (pel && !pel.paused && pel.currentTime >= b) {
            timeBoundaryRef.current = null;
            setPreludeCurrentTime(pel.currentTime);
          }
        } else {
          const el = audioRef.current;
          const t = el ? el.currentTime - currentTrimOffsetRef.current : -1;
          if (el && !el.paused && t >= b) {
            timeBoundaryRef.current = null;
            setCurrentTime(Math.max(0, t));
          }
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying]);

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (forcedSeekPendingRef.current) return;
    // The recitation waits on its meaning clip: keep the ayah just recited.
    if (meaningRef.current) return;
    if (isPreludeRef.current) {
      setCurrentTime(0);
      return;
    }
    const offset = currentTrimOffsetRef.current;
    const effectiveTime = Math.max(0, el.currentTime - offset);
    // A background tab gets no animation frames: the meaning cue is caught here.
    if (!el.paused && checkMeaningCueRef.current(effectiveTime)) return;
    setCurrentTime(effectiveTime);
    if (el.currentTime > 0) lastRawTimeRef.current = el.currentTime;
    // Playing well again for 30s since a recovery: later glitches get
    // their full retries.
    if (retryCountRef.current > 0 && el.currentTime > retryResumeRef.current + 30) retryCountRef.current = 0;

    // Per-ayah Juz playback: don't persist a resume position (it would be a
    // single ayah's offset, meaningless for the Juz as a whole).
    if (ayahSeqRef.current) return;

    const now = Math.floor(effectiveTime);
    if (now !== lastSaveRef.current) {
      lastSaveRef.current = now;
      writePosition(current.id, effectiveTime);
      persistLast(current, effectiveTime);
    }
  }, [current, persistLast]);

  // The meaning clip finished (or failed): the recitation goes on — from
  // where it waited, or with the sequence's next ayah.
  const onEndedRef = useRef<() => void>(() => {});
  const finishMeaning = useCallback(() => {
    const m = meaningRef.current;
    if (!m) return;
    cancelMeaning();
    if (m.then === "advance") {
      meaningDoneRef.current = ayahSeqRef.current?.index ?? TRACK_MEANING_DONE;
      onEndedRef.current();
      return;
    }
    const el = audioRef.current;
    el?.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [cancelMeaning]);

  const startMeaning = useCallback(
    (url: string, key: string, then: "resume" | "advance", resumeAt?: number, showAt?: number) => {
      const mel = meaningAudioRef.current;
      if (!mel) return;
      // Set first: the recitation's own pause / seek events check it.
      meaningRef.current = { key, then };
      setMeaningClip({ key });
      if (mel.getAttribute("src") !== url) {
        mel.src = url;
        mel.load();
      } else if (mel.currentTime > 0) {
        mel.currentTime = 0;
      }
      // Can't start (no tap yet on iOS, say): carry on without it.
      mel.play().catch(() => finishMeaning());
      // Only now the recitation waits: iOS lets a clip start by itself more
      // readily while the page's audio is still playing.
      const el = audioRef.current;
      if (then === "resume" && el) {
        el.pause();
        if (resumeAt !== undefined) {
          try {
            el.currentTime = resumeAt + currentTrimOffsetRef.current;
          } catch {
            /* ignore */
          }
          // Inside the ayah just recited, so the screen stays on it.
          setCurrentTime(Math.max(0, showAt ?? resumeAt - 0.05));
        }
      }
    },
    [finishMeaning]
  );

  checkMeaningCueRef.current = (t) => {
    if (ayahSeqRef.current || isPreludeRef.current || meaningRef.current) return false;
    const cues = meaningCuesRef.current;
    // Reached (not passed by a seek: within 0.5 s) and not read on this pass.
    const cue = cues.find(
      (c) => t >= c.at - MEANING_CUE_LEAD && t <= c.at + 0.5 && c.at > meaningSeekFloorRef.current && c.key !== meaningCueReadRef.current
    );
    if (!cue) {
      // Fetch the coming clip ahead, so it starts as the recitation stops.
      const next = cues.find((c) => c.at > t && c.at - t < 4);
      const mel = meaningAudioRef.current;
      // (Not while the silent unlock clip is still playing.)
      if (next && mel && mel.paused && mel.getAttribute("src") !== next.url) {
        mel.preload = "auto";
        mel.src = next.url;
      }
      return false;
    }
    meaningCueReadRef.current = cue.key;
    startMeaning(cue.url, cue.key, "resume", cue.at, cue.showAt);
    return true;
  };

  const onEnded = useCallback(() => {
    // Per-ayah Juz sequence: advance to the next ayah in the chosen voice.
    const seq = ayahSeqRef.current;
    if (seq) {
      // The ayah itself ended (not a prelude): its meaning first, when wanted.
      if (seq.preStep < 0 && meaningDoneRef.current !== seq.index) {
        const m = ayahMeaningRef.current?.(seq.index);
        if (m) {
          startMeaning(m.url, m.key, "advance");
          return;
        }
      }
      if (advanceAyahSequence()) return;
      // The Juz is over: again from its first ayah, or the page starts the
      // next / a random Juz.
      if (endMode === "repeat") {
        loadAyahAt(0);
        return;
      }
      if (sequenceEndHandlerRef.current?.(endMode)) return;
      ayahSeqRef.current = null;
      setAyahSequence(null);
      setIsPlaying(false);
      return;
    }
    // A whole-Surah track: its last ayah's meaning before going on.
    if (meaningDoneRef.current !== TRACK_MEANING_DONE) {
      const m = ayahMeaningRef.current?.(null);
      if (m && m.key !== meaningCueReadRef.current) {
        meaningCueReadRef.current = m.key;
        startMeaning(m.url, m.key, "advance");
        return;
      }
    }
    meaningDoneRef.current = -1;
    if (current) writePosition(current.id, 0);
    if (current && isSurahTrackId(current.id)) {
      if (endMode === "repeat") {
        playFromQueue(currentIndex);
        return;
      }
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      if (endMode === "shuffle") {
        const reciter = resolveActiveReciter(current);
        const tracks = getSurahTracksForReciter(reciter);
        const pool = tracks.filter((tr, i) => i + 1 !== num && reciterHasSurah(reciter, i + 1));
        const pick = pool[Math.floor(Math.random() * pool.length)];
        if (pick) {
          playBayan(pick, tracks);
          return;
        }
      }
      if (num < 114) {
        next();
        return;
      }
      setIsPlaying(false);
      return;
    }
    if (endMode === "repeat") playFromQueue(currentIndex);
    else if (currentIndex < queue.length - 1) next();
    else setIsPlaying(false);
  }, [current, currentIndex, queue.length, next, advanceAyahSequence, endMode, loadAyahAt, playFromQueue, playBayan, startMeaning]);
  onEndedRef.current = onEnded;

  const onError = useCallback(() => {
    // A single missing/failed ayah file must not kill a Juz sequence — skip it.
    const seq = ayahSeqRef.current;
    if (seq) {
      if (!advanceAyahSequence()) {
        ayahSeqRef.current = null;
        setAyahSequence(null);
        setIsPlaying(false);
      }
      return;
    }
    // A stream that fails (network drop, server hiccup) is retried — the
    // same recording, from where it stopped, so the word timings still fit.
    // Never another reciter's file: its voice wouldn't match the reciter
    // shown or the highlight. Offline: wait for the connection to come back.
    const el = audioRef.current;
    const failed = el?.getAttribute("src");
    // Our R2 CBR copy of a VBR master failing (e.g. r2.dev throttling): carry
    // on from the master — the same recording, so the timings still fit.
    const url = (failed && cbrMasterUrl(failed)) || failed;
    if (current && el && url && retryCountRef.current < MAX_STREAM_RETRIES) {
      retryCountRef.current += 1;
      const token = ++retryTokenRef.current;
      const resumeAt = lastRawTimeRef.current;
      setIsLoading(true);
      const attempt = () => {
        if (retryTokenRef.current !== token || audioRef.current !== el) return;
        retryResumeRef.current = resumeAt;
        el.src = url;
        el.load();
        el.addEventListener(
          "loadedmetadata",
          () => {
            if (retryTokenRef.current !== token) return;
            try {
              if (resumeAt > 0) el.currentTime = resumeAt;
            } catch {
              /* ignore */
            }
            el.play().catch(() => setIsLoading(false));
          },
          { once: true },
        );
      };
      console.warn(`[HuDa Audio] Stream error — retry ${retryCountRef.current}/${MAX_STREAM_RETRIES} from ${resumeAt.toFixed(1)}s`);
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        window.addEventListener("online", attempt, { once: true });
      } else {
        setTimeout(attempt, 1000 * retryCountRef.current);
      }
      return;
    }
    retryCountRef.current = 0;
    setIsPlaying(false);
    setIsLoading(false);
    setError(t(storedUiLang(), "Couldn't load this audio. Check your connection and press play to try again."));
  }, [current, advanceAyahSequence]);

  const value = useMemo<AudioPlayerApi>(
    () => ({
      queue,
      currentIndex,
      current,
      isPlaying,
      isLoading,
      error,
      currentTime,
      duration,
      volume,
      isMuted,
      playbackRate,
      isExpanded,
      continueListening,
      isPrelude,
      preludeType,
      preludeCurrentTime,
      preludeDuration,
      ayahSequence,
      meaningClip,
      endMode,
      playBayan,
      cueBayan,
      playAyahSequence,
      jumpToAyah,
      togglePlay,
      pause,
      resume,
      seek,
      next,
      setAyahSequenceNext,
      setMeaningCues,
      setAyahMeaning,
      unlockMeaning,
      previous,
      setVolume,
      toggleMute,
      setPlaybackRate,
      addToQueue,
      removeFromQueue,
      playFromQueue,
      clearQueue,
      setExpanded,
      dismissContinue,
      setTimeBoundary,
      setEndMode,
      setSequenceEndHandler,
          }),
    [
      queue,
      currentIndex,
      current,
      isPlaying,
      isLoading,
      error,
      currentTime,
      duration,
      volume,
      isMuted,
      playbackRate,
      isExpanded,
      continueListening,
      isPrelude,
      preludeType,
      preludeCurrentTime,
      preludeDuration,
      ayahSequence,
      meaningClip,
      endMode,
      playBayan,
      cueBayan,
      playAyahSequence,
      jumpToAyah,
      togglePlay,
      pause,
      resume,
      seek,
      next,
      setAyahSequenceNext,
      setMeaningCues,
      setAyahMeaning,
      unlockMeaning,
      previous,
      setVolume,
      toggleMute,
      setPlaybackRate,
      addToQueue,
      removeFromQueue,
      playFromQueue,
      clearQueue,
      setExpanded,
      dismissContinue,
      setTimeBoundary,
      setEndMode,
      setSequenceEndHandler,
          ]
  );

  // Events of the standby <audio> (per-ayah double buffer) are ignored.
  const fromActive =
    <E extends React.SyntheticEvent<HTMLAudioElement>>(fn: (e: E) => void) =>
    (e: E) => {
      if (e.currentTarget === audioRef.current) fn(e);
    };
  // One voice at a time. Back from another app, iOS could start an element
  // again that the sequence had already handed over from (the standby, or
  // the main one while the prelude plays): two recitations at once. Any
  // element that starts while it isn't the one in use is stopped.
  const strayStarted = (el: HTMLAudioElement) => {
    const stray = el !== audioRef.current || (isPreludeRef.current && !preludeAudioRef.current?.paused) || meaningRef.current !== null;
    // unlockStandby's muted silent clip pauses itself.
    if (stray && el.getAttribute("src") !== SILENT_WAV) el.pause();
    return stray;
  };
  const mainAudioEvents = {
    onPlay: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      if (strayStarted(e.currentTarget)) return;
      if (!isPreludeRef.current) setIsPlaying(true);
    },
    onPause: fromActive((e) => {
      // Paused for its meaning clip: still playing.
      if (meaningRef.current) return;
      // An ayah clip reaching its end pauses too, right before the next one
      // starts: keep the pause icon instead of flashing play for a frame.
      if (ayahSeqRef.current && e.currentTarget.ended) return;
      // Not the listener: the system (a call) — see the audio-session effect.
      if (!userPausedRef.current && !e.currentTarget.ended && !isPreludeRef.current) interruptedRef.current = Date.now();
      if (!isPreludeRef.current) setIsPlaying(false);
    }),
    onPlaying: fromActive(() => {
      applyMediaMetadata();
      userPausedRef.current = false;
      if (!isPreludeRef.current) {
        clearTimeout(waitingTimerRef.current);
        setIsPlaying(true);
        setIsLoading(false);
        setError(null);
      }
    }),
    onWaiting: fromActive(() => {
      // Only a real stall shows the spinner — each ayah clip reports a
      // few-ms "waiting" as it starts, which flashed it at every ayah.
      if (isPreludeRef.current) return;
      clearTimeout(waitingTimerRef.current);
      waitingTimerRef.current = setTimeout(() => {
        const el = audioRef.current;
        if (el && !el.paused && el.readyState < 3) setIsLoading(true);
      }, 300);
    }),
    onTimeUpdate: fromActive(onTimeUpdate),
    onSeeked: fromActive(onTimeUpdate),
    onDurationChange: fromActive((e) => {
      // A pending forced start applies duration + time together on
      // loadedmetadata; updating duration alone first flashed a wrong ayah.
      if (forcedSeekPendingRef.current) return;
      const rawDur = e.currentTarget.duration || 0;
      const offset = currentTrimOffsetRef.current;
      setDuration(Math.max(0, rawDur - offset));
    }),
    onEnded: fromActive(onEnded),
    onError: fromActive(onError),
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {/* Dedicated HTML5 audio element for custom prelude (Isti'adhah & Bismillah) */}
      <audio
        ref={preludeAudioRef}
        preload="auto"
        onTimeUpdate={onPreludeTimeUpdate}
        onWaiting={() => { if (isPreludeRef.current) setIsLoading(true); }}
        onPlaying={() => {
          applyMediaMetadata();
          if (isPreludeRef.current) setIsLoading(false);
        }}
        // Paused from outside (another app's sound, a call): show play. Not
        // when a switch already started it again, or it was emptied.
        onPause={(e) => {
          const el = e.currentTarget;
          if (isPreludeRef.current && el.paused && !el.ended && el.getAttribute("src")) {
            if (!userPausedRef.current) interruptedRef.current = Date.now();
            setIsPlaying(false);
          }
        }}
        // Started by the system after the prelude was over: not again.
        onPlay={(e) => {
          if (!isPreludeRef.current) e.currentTarget.pause();
        }}
        onCanPlay={() => { if (isPreludeRef.current) setIsLoading(false); }}
        onEnded={onPreludeEnded}
        onError={onPreludeError}
      />

      {/* Meaning audio: an ayah's meaning, read between ayahs. */}
      <audio
        ref={meaningAudioRef}
        preload="auto"
        onPlaying={() => {
          if (!meaningRef.current) return;
          applyMediaMetadata();
          setIsPlaying(true);
          setIsLoading(false);
        }}
        onWaiting={() => { if (meaningRef.current) setIsLoading(true); }}
        // Paused from outside (a call, another app's sound): show play.
        onPause={(e) => {
          const el = e.currentTarget;
          if (meaningRef.current && !el.ended && el.getAttribute("src")) {
            if (!userPausedRef.current) interruptedRef.current = Date.now();
            setIsPlaying(false);
          }
        }}
        // Started by the system when no meaning is due: not again.
        onPlay={(e) => {
          if (!meaningRef.current && e.currentTarget.getAttribute("src") !== SILENT_WAV) e.currentTarget.pause();
        }}
        onEnded={finishMeaning}
        // A missing clip just skips its meaning.
        onError={() => { if (meaningRef.current) finishMeaning(); }}
      />

      {/* Persistent HTML5 audio elements for direct local MP3 audio (A is the
          default; B is the standby for gapless per-ayah playback). Events of
          the element not in use are ignored. */}
      {[audioARef, audioBRef].map((r, n) => (
        <audio
          key={n}
          ref={(node) => {
            r.current = node;
            if (n === 0 && node && !audioRef.current) audioRef.current = node;
          }}
          preload="none"
          {...mainAudioEvents}
        />
      ))}

      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerApi {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider");
  }
  return ctx;
}
