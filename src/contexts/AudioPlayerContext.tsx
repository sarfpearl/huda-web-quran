"use client";

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
import { reciterHasSurah } from "@/lib/data/quranReciters";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  GLOBAL AUDIO PLAYER ENGINE
 *  HTML5 Audio for the Quran streams (plus a second element for preludes).
 * ─────────────────────────────────────────────────────────────────────────
 */

const LAST_KEY = "huda-player:last";
const POSITIONS_KEY = "huda-player:positions";
const PREFS_KEY = "huda-player:prefs";

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
    preludes?: Record<number, AyahPrelude[]>
  ) => void;
  /** Jump to a specific ayah index within the active per-ayah sequence. */
  jumpToAyah: (index: number) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  next: () => void;
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
}

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

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
  return `${bayan.title} isn't available in ${reciter.displayName}'s recordings. Choose another reciter.`;
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
  const waitingTimerRef = useRef<ReturnType<typeof setTimeout>>();
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

  const [queue, setQueue] = useState<BayanWithRelations[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
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

  const current = queue[currentIndex] ?? null;

  // Restore saved preferences & purge legacy demo references
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
      if (typeof prefs.volume === "number") setVolumeState(prefs.volume);
      if (typeof prefs.playbackRate === "number")
        setPlaybackRateState(prefs.playbackRate);
      if (typeof prefs.isMuted === "boolean") setIsMuted(prefs.isMuted);

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
    for (const el of [audioARef.current, audioBRef.current, preludeAudioRef.current]) {
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
              pel.play().then(() => setIsPlaying(true)).catch(() => {
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
          el.play().catch(() => setIsPlaying(false));
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
    []
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
      loadCurrent(nextQueue[index], true);
      persistLast(nextQueue[index], readPositions()[bayan.id] ?? 0);
      setContinueListening(null);

    },
    [queue, loadCurrent, persistLast]
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
      preludes: Record<number, AyahPrelude[]> = {}
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
      ayahSeqRef.current = { urls: ayahUrls, index: startIdx, pre: preludes, preStep: -1 };
      setQueue([displayTrack]);
      setCurrentIndex(0);
      setContinueListening(null);
      setCurrentTime(0);
      setDuration(0);
      loadAyahAt(startIdx, true);
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

  // Start one clip of the sequence: hand over to the standby element when it
  // already holds this clip, else load it on the current element.
  const playClip = (url: string) => {
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
      setDuration(Number.isFinite(sb.duration) ? sb.duration : 0);
      sb.play().catch(() => {});
    } else if (cur) {
      cur.src = ayahSrc(url);
      cur.currentTime = 0;
      cur.load();
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
  const loadAyahAt = useCallback((i: number, withPre: boolean = true) => {
    const seq = ayahSeqRef.current;
    if (!seq) return;
    const idx = Math.max(0, Math.min(i, seq.urls.length - 1));
    seq.index = idx;
    const pre = withPre ? seq.pre[idx] ?? [] : [];
    seq.preStep = pre.length > 0 ? 0 : -1;
    setAyahSequence({ index: idx, total: seq.urls.length, preType: pre[0]?.type ?? null });
    prefetchAyahsAround(seq.urls, idx);
    playClip(pre.length > 0 ? pre[0].url : seq.urls[idx]);
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

  const jumpToAyah = useCallback((index: number) => {
    if (ayahSeqRef.current) loadAyahAt(index);
  }, [loadAyahAt]);

  const pause = useCallback(() => {
    if (isPreludeRef.current && preludeAudioRef.current) {
      preludeAudioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (isPreludeRef.current && preludeAudioRef.current) {
      setIsLoading(true); // spinner while the prelude resumes/buffers
      preludeAudioRef.current
        .play()
        .then(() => setIsPlaying(true))
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
  }, [current, loadCurrent]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((seconds: number) => {
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
    if (wasInPrelude && isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    }
  }, [isPlaying]);

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
    // Per-ayah Juz sequence: skip forward one ayah.
    if (ayahSeqRef.current) {
      loadAyahAt(ayahSeqRef.current.index + 1);
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
    // The scene lives on R2 (cross-origin, full-size). The home-screen app's
    // lock screen skips such artwork — and can then blank the whole card — so
    // it goes through the site's own image optimizer: same origin, 512 px.
    const cover = track.coverImageUrl;
    const art = cover && /^https?:/i.test(cover) ? `/_next/image?url=${encodeURIComponent(cover)}&w=512&q=75` : cover;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: reciter?.displayName ?? track.speaker?.name ?? "",
      album: "HuDa Web Quran",
      // The scene, then the logo (same origin) if the scene can't be shown.
      // No `type`: the optimizer picks the format per device.
      artwork: [
        ...(art ? [{ src: abs(art), sizes: "512x512" }] : []),
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
    el.play().then(() => setIsPlaying(true)).catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
    });
  }, []);

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
    if (isPreludeRef.current) {
      setCurrentTime(0);
      return;
    }
    const offset = currentTrimOffsetRef.current;
    const effectiveTime = Math.max(0, el.currentTime - offset);
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

  const onEnded = useCallback(() => {
    // Per-ayah Juz sequence: advance to the next ayah in the chosen voice.
    const seq = ayahSeqRef.current;
    if (seq) {
      if (!advanceAyahSequence()) {
        ayahSeqRef.current = null;
        setAyahSequence(null);
        setIsPlaying(false);
      }
      return;
    }
    if (current) writePosition(current.id, 0);
    if (current && isSurahTrackId(current.id)) {
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      if (num < 114) {
        next();
        return;
      }
      setIsPlaying(false);
      return;
    }
    if (currentIndex < queue.length - 1) next();
    else setIsPlaying(false);
  }, [current, currentIndex, queue.length, next, advanceAyahSequence]);

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
    const url = el?.getAttribute("src");
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
    setError("Couldn't load this audio. Check your connection and press play to try again.");
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
      playBayan,
      cueBayan,
      playAyahSequence,
      jumpToAyah,
      togglePlay,
      pause,
      resume,
      seek,
      next,
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
      playBayan,
      cueBayan,
      playAyahSequence,
      jumpToAyah,
      togglePlay,
      pause,
      resume,
      seek,
      next,
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
          ]
  );

  // Events of the standby <audio> (per-ayah double buffer) are ignored.
  const fromActive =
    <E extends React.SyntheticEvent<HTMLAudioElement>>(fn: (e: E) => void) =>
    (e: E) => {
      if (e.currentTarget === audioRef.current) fn(e);
    };
  const mainAudioEvents = {
    onPlay: fromActive(() => {
      if (!isPreludeRef.current) setIsPlaying(true);
    }),
    onPause: fromActive((e) => {
      // An ayah clip reaching its end pauses too, right before the next one
      // starts: keep the pause icon instead of flashing play for a frame.
      if (ayahSeqRef.current && e.currentTarget.ended) return;
      if (!isPreludeRef.current) setIsPlaying(false);
    }),
    onPlaying: fromActive(() => {
      applyMediaMetadata();
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
          if (isPreludeRef.current && el.paused && !el.ended && el.getAttribute("src")) setIsPlaying(false);
        }}
        onCanPlay={() => { if (isPreludeRef.current) setIsLoading(false); }}
        onEnded={onPreludeEnded}
        onError={onPreludeError}
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
