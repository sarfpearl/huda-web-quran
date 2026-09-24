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
  incrementPlayCount,
  isQuranTrack,
  isSurahTrackId,
  SURAH_TRACK_ID_PREFIX,
  getSurahTracksForReciter,
  resolveActiveReciter,
  getSurahPreludeConfig,
  getReciterAyah1TrimOffset,
  PRELUDE_AUDIO,
} from "@/lib/data/service";
import { getSessionId } from "@/lib/audio/session";
import { loadYouTubeIframeApi } from "@/lib/youtube/iframe-api";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  GLOBAL AUDIO PLAYER ENGINE
 *  Supports official YouTube IFrame Player API for YouTube playlists & videos,
 *  and HTML5 Audio for local audio streams.
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

type SourceType = "youtube-playlist" | "youtube-video" | "local";

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
  setShuffle?: (shuffle: boolean) => void;
}

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

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

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preludeAudioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);
  const currentPlaylistIdRef = useRef<string | null>(null);
  const activeSourceRef = useRef<SourceType>("local");
  const lastSaveRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);
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

  // Sync volume, mute & playbackRate to HTML5 audio elements
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.volume = volume;
      el.muted = isMuted;
      el.playbackRate = playbackRate;
    }
    const pel = preludeAudioRef.current;
    if (pel) {
      pel.volume = volume;
      pel.muted = isMuted;
      pel.playbackRate = playbackRate;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === "function") {
      try {
        ytPlayerRef.current.setVolume(isMuted ? 0 : Math.round(volume * 100));
      } catch {
        /* ignore */
      }
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === "function") {
      try {
        ytPlayerRef.current.setPlaybackRate(playbackRate);
      } catch {
        /* ignore */
      }
    }
  }, [volume, isMuted, playbackRate]);

  // Periodic timer for updating progress and duration when YouTube player is active
  useEffect(() => {
    if (activeSourceRef.current !== "local" && isPlaying) {
      const interval = setInterval(() => {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
          try {
            const time = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(time);
            if (dur > 0 && dur !== duration) setDuration(dur);
          } catch {
            /* ignore */
          }
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isPlaying, duration]);

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
   * Primary Source Selection & Playlist Loader:
   * Source Selection Priority:
   * 1. youtubePlaylistId -> USE YOUTUBE PLAYLIST (via official YT.Player)
   * 2. Real local audio -> USE LOCAL AUDIO (HTML5 Audio)
   * 3. youtubeVideoId -> USE SINGLE YOUTUBE VIDEO (via YT.Player)
   * 4. Fallback content
   */
  const loadCurrent = useCallback(
    async (bayan: BayanWithRelations, autoplay: boolean) => {
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
      // Any normal load cancels an in-flight per-ayah Juz sequence.
      ayahSeqRef.current = null;
      setAyahSequence(null);
      ayahBlobRef.current.forEach((b) => URL.revokeObjectURL(b));
      ayahBlobRef.current.clear();
      const playlistId = bayan.youtubePlaylistId || bayan.category?.youtubePlaylistId;
      const isYoutubeSource =
        bayan.audioSource === "youtube" ||
        (bayan.audioSource !== "local" && Boolean(playlistId || bayan.youtubeVideoId));
      const localAudioUrl =
        bayan.audioSource === "local" && bayan.audioUrl && !bayan.audioUrl.includes("SoundHelix")
          ? bayan.audioUrl
          : null;

      // ── SOURCE PRIORITY 1: REAL YOUTUBE PLAYLIST ───────────────────────
      if (playlistId && isYoutubeSource) {
        console.log("[Huda Audio] Selected category:", bayan.category?.name);
        console.log("[Huda Audio] Audio source: youtube");
        console.log("[Huda Audio] YouTube playlist ID:", playlistId);
        console.log("[Huda Audio] Loading YouTube playlist:", playlistId);

        activeSourceRef.current = "youtube-playlist";

        // Stop HTML5 audio
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        setIsLoading(true);
        currentPlaylistIdRef.current = playlistId;

        try {
          const YT = await loadYouTubeIframeApi();

          if (!ytPlayerRef.current) {
            ytPlayerRef.current = new YT.Player("huda-yt-player-target", {
              height: "1",
              width: "1",
              playerVars: {
                autoplay: autoplay ? 1 : 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
                origin: typeof window !== "undefined" ? window.location.origin : undefined,
              },
              events: {
                onReady: (event: any) => {
                  console.log("[Huda Audio] Player ready");
                  ytReadyRef.current = true;
                  if (currentPlaylistIdRef.current) {
                    if (autoplay) {
                      event.target.loadPlaylist({
                        listType: "playlist",
                        list: currentPlaylistIdRef.current,
                        index: 0,
                      });
                    } else {
                      event.target.cuePlaylist({
                        listType: "playlist",
                        list: currentPlaylistIdRef.current,
                        index: 0,
                      });
                    }
                  }
                },
                onStateChange: (event: any) => {
                  const state = event.data;
                  if (state === YT.PlayerState.PLAYING) {
                    console.log("[Huda Audio] Player state: PLAYING");
                    setIsPlaying(true);
                    setIsLoading(false);
                  } else if (state === YT.PlayerState.PAUSED) {
                    console.log("[Huda Audio] Player state: PAUSED");
                    setIsPlaying(false);
                  } else if (state === YT.PlayerState.BUFFERING) {
                    console.log("[Huda Audio] Player state: BUFFERING");
                    setIsLoading(true);
                  } else if (state === YT.PlayerState.ENDED) {
                    console.log("[Huda Audio] Player state: ENDED");
                    // YouTube playlist automatically advances to next item!
                  } else if (state === YT.PlayerState.CUED) {
                    console.log("[Huda Audio] Player state: CUED");
                    setIsLoading(false);
                  }
                },
                onError: (event: any) => {
                  console.error("[Huda Audio] YouTube Player Error:", event.data);
                  setIsPlaying(false);
                  setIsLoading(false);
                },
              },
            });
          } else {
            // Re-use existing singleton YT.Player instance safely!
            if (autoplay) {
              ytPlayerRef.current.loadPlaylist({
                listType: "playlist",
                list: playlistId,
                index: 0,
              });
            } else {
              ytPlayerRef.current.cuePlaylist({
                listType: "playlist",
                list: playlistId,
                index: 0,
              });
            }
          }
        } catch (err) {
          console.error("[Huda Audio] Failed to load YouTube Player API:", err);
          setIsLoading(false);
        }

        setDuration(bayan.durationSeconds || 1800);
        setCurrentTime(0);
        return;
      }

      // ── SOURCE PRIORITY 2: REAL LOCAL AUDIO ─────────────────────────────
      if (localAudioUrl) {
        console.log("[Huda Audio] Selected category:", bayan.category?.name);
        console.log("[Huda Audio] Audio source: local");

        activeSourceRef.current = "local";

        // Pause YT player
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {
            /* ignore */
          }
        }

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

        // Standard non-prelude track (Surah 9, non-Quran bayans, etc.)
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

      // ── SOURCE PRIORITY 3: SINGLE YOUTUBE VIDEO ──────────────────────────
      if (bayan.youtubeVideoId) {
        console.log("[Huda Audio] Selected category:", bayan.category?.name);
        console.log("[Huda Audio] Audio source: youtube-video");
        console.log("[Huda Audio] YouTube video ID:", bayan.youtubeVideoId);

        activeSourceRef.current = "youtube-video";

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }

        setIsLoading(true);
        const videoId = bayan.youtubeVideoId;

        try {
          const YT = await loadYouTubeIframeApi();

          if (!ytPlayerRef.current) {
            ytPlayerRef.current = new YT.Player("huda-yt-player-target", {
              height: "1",
              width: "1",
              playerVars: {
                autoplay: autoplay ? 1 : 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
                origin: typeof window !== "undefined" ? window.location.origin : undefined,
              },
              events: {
                onReady: (event: any) => {
                  console.log("[Huda Audio] Player ready");
                  ytReadyRef.current = true;
                  if (autoplay) event.target.loadVideoById(videoId);
                  else event.target.cueVideoById(videoId);
                },
                onStateChange: (event: any) => {
                  const state = event.data;
                  if (state === YT.PlayerState.PLAYING) {
                    console.log("[Huda Audio] Player state: PLAYING");
                    setIsPlaying(true);
                    setIsLoading(false);
                  } else if (state === YT.PlayerState.PAUSED) {
                    console.log("[Huda Audio] Player state: PAUSED");
                    setIsPlaying(false);
                  } else if (state === YT.PlayerState.BUFFERING) {
                    console.log("[Huda Audio] Player state: BUFFERING");
                    setIsLoading(true);
                  }
                },
              },
            });
          } else {
            if (autoplay) ytPlayerRef.current.loadVideoById(videoId);
            else ytPlayerRef.current.cueVideoById(videoId);
          }
        } catch {
          setIsLoading(false);
        }

        setDuration(bayan.durationSeconds || 1800);
        setCurrentTime(0);
        return;
      }

      // ── SOURCE PRIORITY 4: DEMO FALLBACK ────────────────────────────────
      console.log("[Huda Audio] Audio source: demo fallback");
      const fallbackUrl = "https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/1.mp3";
      activeSourceRef.current = "local";

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

      void incrementPlayCount(bayan.id, getSessionId());
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
      loadCurrent(nextQueue[index], false);
      persistLast(nextQueue[index], readPositions()[bayan.id] ?? 0);
      setContinueListening(null);
    },
    [queue, loadCurrent, persistLast]
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
      // Stop any YouTube / prelude source and switch to the local element.
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
        try { ytPlayerRef.current.pauseVideo(); } catch { /* ignore */ }
      }
      if (preludeAudioRef.current) {
        preludeAudioRef.current.pause();
        preludeAudioRef.current.src = "";
      }
      isPreludeRef.current = false;
      setIsPrelude(false);
      setPreludeType(null);
      activeSourceRef.current = "local";
      currentTrimOffsetRef.current = 0;
      retryCountRef.current = 0;
      setError(null);

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
          }
        })
        .catch(() => {
          /* fall back to streaming that ayah */
        })
        .finally(() => ayahInflightRef.current.delete(url));
    }
  }, []);

  const ayahSrc = (url: string) => ayahBlobRef.current.get(url) ?? url;

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
    const el = audioRef.current;
    prefetchAyahsAround(seq.urls, idx);
    if (el) {
      el.src = ayahSrc(pre.length > 0 ? pre[0].url : seq.urls[idx]);
      el.currentTime = 0;
      el.load();
      el.play().catch(() => {});
    }
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
      const el = audioRef.current;
      if (nextStep < pre.length) {
        seq.preStep = nextStep;
        setAyahSequence({ index: seq.index, total: seq.urls.length, preType: pre[nextStep].type });
        if (el) {
          el.src = ayahSrc(pre[nextStep].url);
          el.currentTime = 0;
          el.load();
          el.play().catch(() => {});
        }
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
    if (activeSourceRef.current !== "local" && ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        /* ignore */
      }
    } else if (audioRef.current) {
      audioRef.current.pause();
    }
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
    if (activeSourceRef.current !== "local" && ytPlayerRef.current && typeof ytPlayerRef.current.playVideo === "function") {
      try {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      } catch {
        loadCurrent(current, true);
      }
    } else {
      const el = audioRef.current;
      if (!el) return;
      if (!el.src && current.audioUrl) {
        loadCurrent(current, true);
        return;
      }
      el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
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
    if (activeSourceRef.current !== "local" && ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === "function") {
      try {
        ytPlayerRef.current.seekTo(seconds, true);
        setCurrentTime(seconds);
        return;
      } catch {
        /* ignore */
      }
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
      void incrementPlayCount(queue[index].id, getSessionId());
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

    if (activeSourceRef.current !== "local" && ytPlayerRef.current && typeof ytPlayerRef.current.nextVideo === "function") {
      console.log("[Huda Audio] Next playlist item");
      try {
        ytPlayerRef.current.nextVideo();
        return;
      } catch {
        /* fallback to queue */
      }
    }
    if (current && isSurahTrackId(current.id)) {
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      const nextNum = num >= 114 ? 1 : num + 1;
      const activeReciter = resolveActiveReciter(current);
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

    if (activeSourceRef.current !== "local" && ytPlayerRef.current && typeof ytPlayerRef.current.previousVideo === "function") {
      console.log("[Huda Audio] Previous playlist item");
      try {
        ytPlayerRef.current.previousVideo();
        return;
      } catch {
        /* fallback to queue */
      }
    }
    const el = audioRef.current;
    if (el && el.currentTime > 3) {
      seek(0);
      return;
    }
    if (current && isSurahTrackId(current.id)) {
      const num = Number(current.id.replace(SURAH_TRACK_ID_PREFIX, ""));
      const prevNum = num <= 1 ? 114 : num - 1;
      const activeReciter = resolveActiveReciter(current);
      const surahTracks = getSurahTracksForReciter(activeReciter);
      const prevTrack = surahTracks[prevNum - 1];
      if (prevTrack) {
        playBayan(prevTrack, surahTracks);
        return;
      }
    }
    if (currentIndex > 0) playFromQueue(currentIndex - 1);
  }, [current, currentIndex, playFromQueue, playBayan, seek, loadAyahAt]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (clamped > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => setIsMuted((m) => !m), []);

  const setPlaybackRate = useCallback((r: number) => {
    setPlaybackRateState(r);
  }, []);

  const setShuffle = useCallback((shuffle: boolean) => {
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setShuffle === "function") {
      try {
        ytPlayerRef.current.setShuffle(shuffle);
        console.log("[Huda Audio] Playlist shuffle set to:", shuffle);
      } catch {
        /* ignore */
      }
    }
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
    if (src.includes("fatihah-prelude") && pel.currentTime >= PRELUDE_AUDIO.fatihah.istiadhahEndTime) {
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

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current || activeSourceRef.current !== "local") return;
    if (forcedSeekPendingRef.current) return;
    if (isPreludeRef.current) {
      setCurrentTime(0);
      return;
    }
    const offset = currentTrimOffsetRef.current;
    const effectiveTime = Math.max(0, el.currentTime - offset);
    setCurrentTime(effectiveTime);

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
    const el = audioRef.current;
    if (activeSourceRef.current === "local" && current && el) {
      // Automatic fallback for Quran Surah tracks
      if (current.id.startsWith("quran-surah-") && retryCountRef.current < 2) {
        const num = Number(current.id.replace("quran-surah-", ""));
        const pad = String(num).padStart(3, "0");
        const fallbacks = [
          `https://server8.mp3quran.net/afs/${pad}.mp3`,
          `https://server11.mp3quran.net/sds/${pad}.mp3`,
          `https://server6.mp3quran.net/thubti/${pad}.mp3`,
        ];
        retryCountRef.current += 1;
        const nextUrl = fallbacks[retryCountRef.current % fallbacks.length];
        console.warn(`[HuDa Audio] Audio stream encountered an error, trying backup CDN: ${nextUrl}`);
        el.src = nextUrl;
        el.load();
        el.play().catch(() => {});
        return;
      }
    }
    retryCountRef.current = 0;
    setIsPlaying(false);
    setIsLoading(false);
    if (activeSourceRef.current === "local") {
      setError("Couldn't load this audio. Please try another.");
    }
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
      setShuffle,
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
      setShuffle,
    ]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {/* Dedicated HTML5 audio element for custom prelude (Isti'adhah & Bismillah) */}
      <audio
        ref={preludeAudioRef}
        preload="auto"
        onTimeUpdate={onPreludeTimeUpdate}
        onWaiting={() => { if (isPreludeRef.current) setIsLoading(true); }}
        onPlaying={() => { if (isPreludeRef.current) setIsLoading(false); }}
        onCanPlay={() => { if (isPreludeRef.current) setIsLoading(false); }}
        onEnded={onPreludeEnded}
        onError={onPreludeError}
      />

      {/* Persistent HTML5 audio element for direct local MP3 audio */}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => {
          if (!isPreludeRef.current) setIsPlaying(true);
        }}
        onPause={() => {
          if (!isPreludeRef.current) setIsPlaying(false);
        }}
        onPlaying={() => {
          if (!isPreludeRef.current) {
            setIsPlaying(true);
            setIsLoading(false);
            setError(null);
          }
        }}
        onWaiting={() => {
          if (!isPreludeRef.current) setIsLoading(true);
        }}
        onTimeUpdate={onTimeUpdate}
        onSeeked={onTimeUpdate}
        onDurationChange={(e) => {
          // A pending forced start applies duration + time together on
          // loadedmetadata; updating duration alone first flashed a wrong ayah.
          if (forcedSeekPendingRef.current) return;
          const rawDur = e.currentTarget.duration || 0;
          const offset = currentTrimOffsetRef.current;
          setDuration(Math.max(0, rawDur - offset));
        }}
        onEnded={onEnded}
        onError={onError}
      />

      {/* Singleton target container for official YouTube IFrame Player API */}
      <div className="pointer-events-none fixed -left-[9999px] -top-[9999px] h-1 w-1 opacity-0 overflow-hidden">
        <div id="huda-yt-player-target" />
      </div>

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
