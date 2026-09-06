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
  SURAH_TRACKS,
  SURAH_TRACK_ID_PREFIX,
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
}

interface AudioPlayerApi extends AudioPlayerState {
  playBayan: (
    bayan: BayanWithRelations,
    contextList?: BayanWithRelations[]
  ) => void;
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
  const ytPlayerRef = useRef<any>(null);
  const ytReadyRef = useRef<boolean>(false);
  const currentPlaylistIdRef = useRef<string | null>(null);
  const activeSourceRef = useRef<SourceType>("local");
  const lastSaveRef = useRef<number>(0);
  const retryCountRef = useRef<number>(0);

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

  // Sync volume, mute & playbackRate to HTML5 audio element
  useEffect(() => {
    const el = audioRef.current;
    if (el) {
      el.volume = volume;
      el.muted = isMuted;
      el.playbackRate = playbackRate;
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
      setError(null);
      retryCountRef.current = 0;
      const playlistId = bayan.youtubePlaylistId || bayan.category?.youtubePlaylistId;
      const isYoutubeSource =
        bayan.audioSource === "youtube" || Boolean(playlistId || bayan.youtubeVideoId);
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

        const el = audioRef.current;
        if (!el) return;

        setIsLoading(true);
        el.preload = "auto";
        el.src = localAudioUrl;
        el.load();

        const isQuran = isQuranTrack(bayan.id);
        const saved = isQuran ? 0 : (readPositions()[bayan.id] ?? 0);
        const startAt =
          saved > 0 && saved < bayan.durationSeconds - 5 ? saved : 0;
        setCurrentTime(startAt);

        // Start playback ASAP — don't wait for full metadata. The browser
        // begins buffering immediately and plays as soon as it can, which
        // noticeably cuts the startup delay on large remote recitations.
        if (autoplay) {
          el.play().catch(() => setIsPlaying(false));
        }

        // Once metadata arrives, apply the saved resume position & duration.
        const onLoaded = () => {
          if (startAt > 0) {
            try {
              el.currentTime = startAt;
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
          setDuration(Number.isFinite(el.duration) ? el.duration : bayan.durationSeconds);
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
    (bayan: BayanWithRelations, contextList?: BayanWithRelations[]) => {
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
      loadCurrent(nextQueue[index], true);
      persistLast(nextQueue[index], readPositions()[bayan.id] ?? 0);
      setContinueListening(null);

      void incrementPlayCount(bayan.id, getSessionId());
    },
    [queue, loadCurrent, persistLast]
  );

  const pause = useCallback(() => {
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
      el.play().catch(() => setIsPlaying(false));
    }
  }, [current, loadCurrent]);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((seconds: number) => {
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
    el.currentTime = Math.max(0, seconds);
    setCurrentTime(el.currentTime);
  }, []);

  const playFromQueue = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      setCurrentIndex(index);
      loadCurrent(queue[index], true);
      persistLast(queue[index], 0);
      void incrementPlayCount(queue[index].id, getSessionId());
    },
    [queue, loadCurrent, persistLast]
  );

  const next = useCallback(() => {
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
      const nextTrack = SURAH_TRACKS[nextNum - 1];
      if (nextTrack) {
        playBayan(nextTrack, SURAH_TRACKS);
        return;
      }
    }
    if (currentIndex < queue.length - 1) playFromQueue(currentIndex + 1);
  }, [current, currentIndex, queue.length, playFromQueue, playBayan]);

  const previous = useCallback(() => {
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
      const prevTrack = SURAH_TRACKS[prevNum - 1];
      if (prevTrack) {
        playBayan(prevTrack, SURAH_TRACKS);
        return;
      }
    }
    if (currentIndex > 0) playFromQueue(currentIndex - 1);
  }, [current, currentIndex, playFromQueue, playBayan, seek]);

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

  const onTimeUpdate = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current || activeSourceRef.current !== "local") return;
    setCurrentTime(el.currentTime);

    const now = Math.floor(el.currentTime);
    if (now !== lastSaveRef.current) {
      lastSaveRef.current = now;
      writePosition(current.id, el.currentTime);
      persistLast(current, el.currentTime);
    }
  }, [current, persistLast]);

  const onEnded = useCallback(() => {
    if (current) writePosition(current.id, 0);
    if (currentIndex < queue.length - 1) next();
    else setIsPlaying(false);
  }, [current, currentIndex, queue.length, next]);

  const onError = useCallback(() => {
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
  }, [current]);

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
      playBayan,
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
      playBayan,
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
      {/* Persistent HTML5 audio element for direct local MP3 audio */}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onPlaying={() => {
          setIsPlaying(true);
          setIsLoading(false);
          setError(null);
        }}
        onWaiting={() => setIsLoading(true)}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
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
