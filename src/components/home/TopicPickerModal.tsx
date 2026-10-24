"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { BayanWithRelations } from "@/types/bayan";
import { AndroidIcon, AppleIcon, CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FavouriteIcon, SearchIcon, SearchIcon02, VoiceSearchIcon, VoiceWaveIcon } from "@/components/ui/Icon";
import { playClick } from "@/lib/clickSound";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useBackToClose } from "@/lib/useBackToClose";
import { useOnlyOneSheet } from "@/lib/useOnlyOneSheet";
import { PLAYER_GLASS, useIsMobile, useKeyboardInset } from "@/components/ui/ActionSheet";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import {
  QURAN_JUZ,
  QURAN_TRACKS,
  QURAN_SURAHS,
  SURAH_TRACKS,
  quranThumbUrl,
  getSurahTracksForReciter,
  resolveActiveReciter,
} from "@/lib/data/service";
import { getJuzAyahPairs } from "@/lib/data/quran";
import { MUSHAF_PAGE_COUNT, mushafPageOf } from "@/lib/data/mushafPages";
import { searchSurahs } from "@/lib/data/surahSearch";
import { loadSearchIndex, parseVerseRef, searchVerses, type VerseHit } from "@/lib/data/verseSearch";
import { VERSE_TOPICS } from "@/lib/data/verseTopics";
import { toArabicNumerals } from "@/lib/data/quranVerses";
import { ABOUT } from "@/lib/data/about";
import { ContentListCard } from "./ContentListCard";
import { QuranTextPage, SETTINGS_PAGES, SETTINGS_PAGE_TITLE, SettingsList, TextSizePage, TranslationPage, type SettingsPage } from "./SettingsPages";
import { compactCount } from "./QuranEngagement";
import { getSupabaseRpcClient } from "@/lib/supabase/rpc";
import { getSessionId } from "@/lib/audio/session";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { UI_LANGS, surahNameIn, t, uiLocale, useSetUiLang, useUiLang, word } from "@/lib/uiLang";

type ModalTab = "surah" | "quran";

interface TopicPickerModalProps {
  surahTracks?: BayanWithRelations[];
  /** Play a Juz in the currently-selected reciter's voice (per-ayah). */
  onSelectJuz?: (juzId: number) => void;
  /** Cue a Surah at an ayah (Verse search result tapped). */
  onOpenAyah?: (surah: number, ayah: number) => void;
  /** Bump to open the browser from outside (the player's Surah / Juz name). */
  openRequest?: number;
  /** Trigger button classes (default: the round header button). */
  triggerClassName?: string;
  /**
   * "browser" (default): the ☰ content browser (Surah | Juz).
   * "favourites": the home ♥ button — only the Surahs / Juz this browser liked.
   */
  variant?: "browser" | "favourites";
}

// Mushaf pages each Juz spans, [first, last] — so the Juz search finds a page no.
const JUZ_PAGES = Array.from({ length: 30 }, (_, i) => {
  const pairs = getJuzAyahPairs(i + 1);
  const [s0, a0] = pairs[0];
  const [s1, a1] = pairs[pairs.length - 1];
  return [mushafPageOf(s0, a0), mushafPageOf(s1, a1)] as const;
});

// The content browser's morph out of its round button (see setPanelRef):
// the shape at --reveal, and a ring tracing its edge that fades out at the end.
// The top and right edges reach the panel's corner in the first quarter, so the
// shape is pinned top-right and opens out leftward and down from there.
const morphInset = (v: string) => `calc(var(${v}, 0px) * (1 - var(--reveal, 1)))`;
const morphInsetFast = (v: string) => `calc(var(${v}, 0px) * (1 - min(1, var(--reveal, 1) * 4)))`;
const morphRadius = "calc(var(--r0, 24px) + (var(--r1, 28px) - var(--r0, 24px)) * var(--reveal, 1))";
const MORPH_CLIP = `inset(${morphInsetFast("--it")} ${morphInsetFast("--ir")} ${morphInset("--ib")} ${morphInset("--il")} round ${morphRadius})`;
const MORPH_RING: React.CSSProperties = {
  top: morphInsetFast("--it"),
  right: morphInsetFast("--ir"),
  bottom: morphInset("--ib"),
  left: morphInset("--il"),
  borderRadius: morphRadius,
  border: "1px solid rgba(255, 255, 255, 0.22)",
  background: "rgba(0, 0, 0, 0.12)",
  opacity: "calc((1 - var(--reveal, 1)) / 0.2)",
};

/** Puts the content browser's top-right corner on its header button's. */
function pinToTrigger(el: HTMLElement, r: DOMRect) {
  el.style.top = `${r.top}px`;
  el.style.right = `${document.documentElement.clientWidth - r.right}px`;
}

/** A small section heading between result groups (Surah · Juz · Verses). */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-sand-200/50">
      {children}
    </p>
  );
}

export function TopicPickerModal({
  surahTracks,
  onSelectJuz,
  onOpenAyah,
  triggerClassName,
  openRequest = 0,
  variant = "browser",
}: TopicPickerModalProps) {
  const isFavourites = variant === "favourites";
  const player = useAudioPlayer();
  const lang = useUiLang();
  const [isOpen, setIsOpen] = useState(false);
  // The browser's list, its « About HuDa » view (footer link) or Settings
  // (⚙ beside Close) and its App-language page; every open starts on the list.
  const [view, setView] = useState<"list" | "about" | "settings" | SettingsPage>("list");
  useEffect(() => {
    if (isOpen) setView("list");
  }, [isOpen]);
  const showAbout = !isFavourites && view === "about";
  // A page under Settings (App language, Translation, …).
  const settingsPage = !isFavourites && SETTINGS_PAGES.includes(view as SettingsPage) ? (view as SettingsPage) : null;
  const showSettings = !isFavourites && (view === "settings" || settingsPage !== null);
  const [activeTab, setActiveTab] = useState<ModalTab>("surah");
  const [searchQuery, setSearchQuery] = useState("");
  // Verse tab: full-text search over the prebuilt index (loaded on first use).
  const [verseHits, setVerseHits] = useState<VerseHit[] | null>(null);
  const [verseRef, setVerseRef] = useState<{ surah: number; ayah: number } | null>(null);
  const [verseLoading, setVerseLoading] = useState(false);
  // The panel is portalled to <body>: the ♥ trigger sits inside the player's
  // blurred frame, which would otherwise trap the fixed panel inside it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // The panel morphs out of this round button: its visible shape (a clip-path
  // inset) starts as the button's circle and stretches into the full rounded
  // panel, then the content fades in — reversed on close. --reveal (0 → 1)
  // drives it; --it/--ir/--ib/--il are the button's insets within the panel.
  // A ring (MORPH_RING) traces the shape's edge, as the glass alone barely
  // shows; the clip comes off once open so the panel's shadow isn't cut.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  // Phone sheet with a search box: sit on top of the on-screen keyboard.
  const kb = useKeyboardInset(isOpen && isMobile);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const dismissKeyboard = useCallback(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const closeModal = useCallback(() => {
    dismissKeyboard();
    setIsOpen(false);
  }, [dismissKeyboard]);

  // Keyboard / screen reader: focus moves into the panel and stays there until
  // it closes (then back to the button); Escape closes it.
  const titleId = useId();
  useDialogFocus(isOpen, panelRef, triggerRef);
  useBackToClose(isOpen, closeModal);
  useOnlyOneSheet(isOpen, closeModal);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      // A sheet opened over the panel closes first (it handles its own Escape).
      if (ev.key === "Escape" && !document.querySelector("[data-action-sheet]")) closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeModal]);
  // Header trigger: the panel's top-right corner is the button's top-right
  // corner on every screen (the header centres its buttons, so its padding
  // alone doesn't give it), kept there as the window resizes.
  useEffect(() => {
    if (!isOpen || isFavourites) return;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const pin = () => {
      const el = panelRef.current;
      const btn = triggerRef.current;
      if (el && btn) pinToTrigger(el, btn.getBoundingClientRect());
    };
    // Again once the header buttons' size transition has settled.
    const onResize = () => {
      pin();
      clearTimeout(settle);
      settle = setTimeout(pin, 400);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(settle);
    };
  }, [isOpen, isFavourites]);
  // Stable, so it runs when the panel mounts — not on every re-render (the
  // player's clock re-renders this), which would put the clip back once open.
  const setPanelRef = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    const btn = triggerRef.current;
    if (!el || !btn || isMobile) return;
    el.style.clipPath = MORPH_CLIP;
    const r = btn.getBoundingClientRect();
    if (!isFavourites) pinToTrigger(el, r);
    const inset = (v: number) => `${Math.max(0, v)}px`;
    el.style.setProperty("--it", inset(r.top - el.offsetTop));
    el.style.setProperty("--ir", inset(el.offsetLeft + el.offsetWidth - r.right));
    el.style.setProperty("--ib", inset(el.offsetTop + el.offsetHeight - r.bottom));
    el.style.setProperty("--il", inset(r.left - el.offsetLeft));
    el.style.setProperty("--r0", `${r.width / 2}px`);
    el.style.setProperty("--r1", getComputedStyle(el).borderTopLeftRadius);
  }, [isFavourites, isMobile]);

  // Opened from the player's name: show the tab of what's playing.
  useEffect(() => {
    if (!openRequest) return;
    setSearchQuery("");
    if (player.current?.id.startsWith("quran-juz-")) setActiveTab("quran");
    else if (player.current?.id.startsWith("quran-surah-")) setActiveTab("surah");
    setIsOpen(true);
  }, [openRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Every open: bring the playing Surah / Juz card to the middle of the list
  // (once the panel has slid in and the list has rendered).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[aria-current="true"]')
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 750);
    return () => clearTimeout(timer);
  }, [isOpen, activeTab]);

  // Listener counts per Surah / Juz for the list (one request per tab, while
  // the browser is open). Stays null — icons only — without Supabase.
  const [viewCounts, setViewCounts] = useState<Record<"surah" | "juz", Record<string, number> | null>>({
    surah: null,
    juz: null,
  });
  const countKinds: Array<"surah" | "juz"> =
    isFavourites ? ["surah", "juz"] : activeTab === "surah" ? ["surah"] : ["juz"];
  const countKindsKey = countKinds.join(",");
  useEffect(() => {
    if (!isOpen || !countKindsKey) return;
    const supabase = getSupabaseRpcClient();
    if (!supabase) return;
    let cancelled = false;
    for (const kind of countKindsKey.split(",") as Array<"surah" | "juz">) {
      supabase.rpc("get_quran_view_counts", { p_kind: kind }).then(
        ({ data, error }) => {
          if (!cancelled && !error && data) setViewCounts((v) => ({ ...v, [kind]: data as Record<string, number> }));
        },
        () => {}
      );
    }
    return () => {
      cancelled = true;
    };
  }, [isOpen, countKindsKey]);

  // Favourites panel: the Surahs / Juz this browser liked (♥ in the player).
  // Re-read every time the panel opens so a new like appears straight away.
  const [favourites, setFavourites] = useState<Array<{ kind: "surah" | "juz"; id: number }> | null>(null);
  const [favouritesFailed, setFavouritesFailed] = useState(false);
  // Surah | Juz segment — opens on the kind being played.
  const [favTab, setFavTab] = useState<"surah" | "juz">("surah");
  useEffect(() => {
    if (!isOpen || !isFavourites) return;
    setFavTab(player.current?.id.startsWith("quran-juz-") ? "juz" : "surah");
  }, [isOpen, isFavourites]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen || !isFavourites) return;
    const supabase = getSupabaseRpcClient();
    if (!supabase) {
      setFavouritesFailed(true);
      return;
    }
    let cancelled = false;
    setFavouritesFailed(false);
    supabase.rpc("get_my_quran_likes", { p_viewer: getSessionId() }).then(
      ({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data)) setFavouritesFailed(true);
        else setFavourites(data as Array<{ kind: "surah" | "juz"; id: number }>);
      },
      () => !cancelled && setFavouritesFailed(true)
    );
    return () => {
      cancelled = true;
    };
  }, [isOpen, isFavourites]);
  const favCounts = {
    surah: favourites?.filter((f) => f.kind === "surah").length ?? 0,
    juz: favourites?.filter((f) => f.kind === "juz").length ?? 0,
  };
  const countFor = (kind: "surah" | "juz", id: number) => {
    const map = viewCounts[kind];
    return map ? map[String(id)] ?? 0 : null;
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredJuz = QURAN_JUZ.filter((j) => {
    if (!q) return true;
    return (
      j.title.toLowerCase().includes(q) ||
      String(j.id).includes(q) ||
      `juz ${j.id}`.includes(q) ||
      `para ${j.id}`.includes(q) ||
      `${word("juz", "ta")} ${j.id}`.includes(q) ||
      `${word("juz", lang)} ${j.id}`.toLowerCase().includes(q) ||
      // A page no. (1–604): the Juz that page is in.
      (/^\d+$/.test(q) && +q >= 1 && +q <= MUSHAF_PAGE_COUNT && +q >= JUZ_PAGES[j.id - 1][0] && +q <= JUZ_PAGES[j.id - 1][1])
    );
  });

  const filteredSurah = searchSurahs(QURAN_SURAHS, searchQuery);

  // One common search box (browser variant): a non-empty query — or a topic
  // chip — searches Surahs, Juz AND verses together. Verses come from the
  // prebuilt index (loadSearchIndex memoizes it, fetched on first search);
  // a topic chip runs the same engine with OR semantics over its keywords.
  const [verseTopicKey, setVerseTopicKey] = useState<string | null>(null);
  const trimmedQuery = searchQuery.trim();
  const isSearching = !isFavourites && (trimmedQuery.length >= 2 || !!verseTopicKey);
  const verseQuery = isSearching ? trimmedQuery : "";
  useEffect(() => {
    if (!isSearching) {
      setVerseHits(null);
      setVerseRef(null);
      setVerseLoading(false);
      return;
    }
    const topic = verseTopicKey ? VERSE_TOPICS.find((x) => x.key === verseTopicKey) : null;
    const terms = topic ? topic.terms.join(" ") : verseQuery;
    if (!terms || terms.length < 2) {
      setVerseHits(null);
      setVerseRef(null);
      setVerseLoading(false);
      return;
    }
    setVerseRef(topic ? null : parseVerseRef(verseQuery));
    setVerseLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      // Load the core index plus the UI language's own blobs (ta, ur, … are
      // lazy; Arabic/English ride in core), so a search fetches only what it needs.
      loadSearchIndex(lang)
        .then((index) => {
          if (cancelled) return;
          setVerseHits(searchVerses(index, terms, { anyTerm: !!topic }));
          setVerseLoading(false);
        })
        .catch(() => {
          if (cancelled) return;
          setVerseHits([]);
          setVerseLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSearching, verseQuery, verseTopicKey, lang]);

  // Voice input (Web Speech API, no AI). Absent in some browsers or iOS PWA → hide the mic.
  const [listening, setListening] = useState(false);
  // The mic hears speech: the wave on the voice button moves.
  const [hearing, setHearing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const voiceTimeoutRef = useRef<number | null>(null);

  const isIosStandalone =
    typeof window !== "undefined" &&
    ((window.navigator as unknown as { standalone?: boolean })?.standalone === true);

  // The iPhone home-screen app may have no (or a broken) Web Speech API, so
  // the mic stays there and falls back to the keyboard's own dictation.
  const voiceSupported =
    typeof window !== "undefined" &&
    (isIosStandalone || !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [dictationHint, setDictationHint] = useState(false);
  const dictationHintTimerRef = useRef<number | null>(null);
  const showDictationHint = useCallback(() => {
    setDictationHint(true);
    if (dictationHintTimerRef.current) window.clearTimeout(dictationHintTimerRef.current);
    dictationHintTimerRef.current = window.setTimeout(() => setDictationHint(false), 6000);
  }, []);

  // iOS: no clicks around listening (a sound then can take the audio
  // session from recognition).
  const isIos =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
  // When a voice search last ended (0 = none yet this page), and whether
  // the current one heard speech — for the silent-mic fallback below.
  const voiceEndedAtRef = useRef(0);
  const heardRef = useRef(false);

  const stopVoice = useCallback(() => {
    if (voiceTimeoutRef.current) {
      window.clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
      voiceEndedAtRef.current = Date.now();
    }
    setListening(false);
    setHearing(false);
  }, []);

  // TEMP (?voicedebug): on-screen log of the recognition events, to find on
  // the iPhone why later voice searches hear nothing. Remove before merge.
  const voiceDebug = typeof window !== "undefined" && window.location.search.includes("voicedebug");
  const [voiceLog, setVoiceLog] = useState<string[]>([]);
  const vlog = useCallback((m: string) => {
    if (!voiceDebug) return;
    const t0 = new Date().toISOString().slice(17, 23);
    setVoiceLog((l) => [...l.slice(-14), `${t0} ${m}`]);
  }, [voiceDebug]);

  const startVoice = useCallback(() => {
    vlog(`tap · ctor=${!!(window.SpeechRecognition || window.webkitSpeechRecognition)} standalone=${isIosStandalone} session=${(navigator as Navigator & { audioSession?: { type: string; state?: string } }).audioSession?.type}/${(navigator as Navigator & { audioSession?: { state?: string } }).audioSession?.state}`);
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      // Still inside the tap, so iOS opens the keyboard (and its 🎤).
      searchInputRef.current?.focus();
      showDictationHint();
      return;
    }

    // Stop any existing session
    stopVoice();
    if (!isIos) playClick();

    // Pause audio recitation so iOS / mobile microphone can clearly record user speech
    if (player.isPlaying) {
      player.pause();
    }

    try {
      const rec = new Ctor();
      recognitionRef.current = rec;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      // Locale: try the UI locale, fallback to browser language or en-US
      const targetLocale = uiLocale(lang);
      rec.lang = targetLocale || (typeof navigator !== "undefined" ? navigator.language : "en-US");

      let started = false;
      const recX = rec as SpeechRecognition & Record<string, unknown>;
      for (const ev of ["audiostart", "audioend", "soundstart", "nomatch"]) recX[`on${ev}`] = () => vlog(ev);
      rec.onstart = () => {
        vlog("start");
        started = true;
        setListening(true);
      };

      heardRef.current = false;
      rec.onspeechstart = () => {
        heardRef.current = true;
        vlog("speechstart");
        setHearing(true);
      };

      rec.onresult = (e: SpeechRecognitionEvent) => {
        heardRef.current = true;
        setHearing(true);
        let transcript = "";
        for (let i = 0; i < e.results.length; ++i) {
          const item = e.results[i]?.[0]?.transcript;
          if (item) transcript += item;
        }
        const clean = transcript.trim();
        vlog(`result "${clean}" final=${!!e.results[e.results.length - 1]?.isFinal}`);
        if (clean) {
          setVerseTopicKey(null);
          setSearchQuery(clean);
        }
      };

      rec.onspeechend = () => {
        setHearing(false);
        try {
          rec.stop();
        } catch {}
      };

      // An older session's late end / error must not reset this one.
      rec.onend = () => {
        vlog(`end (current=${recognitionRef.current === rec})`);
        if (recognitionRef.current !== rec) return;
        if (voiceTimeoutRef.current) {
          window.clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setListening(false);
        setHearing(false);
        recognitionRef.current = null;
        voiceEndedAtRef.current = Date.now();
      };

      rec.onerror = (e) => {
        vlog(`error ${(e as Event & { error?: string; message?: string }).error} ${(e as Event & { message?: string }).message ?? ""}`);
        console.warn("Speech recognition error:", e);
        if (recognitionRef.current !== rec) return;
        // Refused or unavailable (the home-screen app): point to dictation.
        if (["not-allowed", "service-not-allowed", "audio-capture", "network"].includes((e as Event & { error?: string }).error ?? "")) showDictationHint();
        if (voiceTimeoutRef.current) {
          window.clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setListening(false);
        setHearing(false);
        recognitionRef.current = null;
        voiceEndedAtRef.current = Date.now();
      };

      const startRec = () => {
        if (recognitionRef.current !== rec) return; // stopped meanwhile
        try {
          rec.start();
          vlog("start() called");
        } catch (err) {
          vlog(`start() threw ${(err as DOMException)?.name}`);
          // Still winding down: once more, shortly.
          if ((err as DOMException)?.name !== "InvalidStateError") throw err;
          window.setTimeout(() => {
            try {
              rec.start();
            } catch {}
          }, 500);
        }
      };
      // Started inside the tap: iOS ignores a start() made later.
      startRec();
      // iOS: a later search can get a live mic with only silence (audiostart,
      // then nothing). Not the first one, which works: after 4 s with no
      // speech, stop and point to the keyboard's dictation instead.
      if (isIos && voiceEndedAtRef.current > 0) {
        window.setTimeout(() => {
          if (recognitionRef.current === rec && !heardRef.current) {
            vlog("silent mic → dictation hint");
            stopVoice();
            showDictationHint();
          }
        }, 4000);
      }
      setListening(true);

      // Auto-stop after 8 seconds of no input to avoid perpetual listening state
      voiceTimeoutRef.current = window.setTimeout(() => {
        stopVoice();
      }, 8000);
      // In the home-screen app it can also just never start.
      if (isIosStandalone) {
        window.setTimeout(() => {
          if (!started && recognitionRef.current === rec) {
            stopVoice();
            showDictationHint();
          }
        }, 2500);
      }
    } catch (err) {
      console.warn("Failed to start speech recognition:", err);
      stopVoice();
      searchInputRef.current?.focus();
      showDictationHint();
    }
  }, [lang, player, stopVoice, isIos, isIosStandalone, showDictationHint, vlog]);

  // The same click when listening ends — tapped off, timed out or finished.
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (wasListeningRef.current && !listening && !isIos) playClick();
    wasListeningRef.current = listening;
  }, [listening, isIos]);

  // Stop listening when the panel closes.
  useEffect(() => {
    if (!isOpen && listening) stopVoice();
  }, [isOpen, listening, stopVoice]);

  const renderVerseCard = (h: VerseHit) => {
    const s = QURAN_SURAHS[h.surah - 1];
    return (
      <button
        key={h.key}
        type="button"
        onClick={() => {
          dismissKeyboard();
          onOpenAyah?.(h.surah, h.ayah);
          setIsOpen(false);
        }}
        className="group flex w-full items-stretch gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-emerald-400/40 hover:bg-white/10 cursor-pointer"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-bold text-white">
              {surahNameIn(h.surah, lang)}
            </span>
            {s?.arabicName && (
              <span lang="ar" dir="rtl" className="shrink-0 font-arabic text-xs text-emerald-300">
                {s.arabicName}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11px] text-sand-200/70">
            {word("surah", lang)} {h.surah} · {word("ayah", lang)} {h.ayah}
          </span>
          <span
            lang="ar"
            dir="rtl"
            // quran-tanzil → Amiri: the stored text is Tanzil-encoded and the
            // Hafs font draws U+06DF as a dotted circle; Amiri renders it right.
            className="quran-tanzil mt-1.5 line-clamp-2 block text-right font-arabic text-base leading-[1.9] text-sand-50/90"
          >
            {h.arabic}
            <span className="mx-1 text-amber-300">{toArabicNumerals(h.ayah)}</span>
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-sand-200/50" />
      </button>
    );
  };

  const renderSurahCard = (s: (typeof QURAN_SURAHS)[number]) => {
    const isTrackCurrent = player.current?.id === `quran-surah-${s.number}`;
    const surahImg = quranThumbUrl("surah", s.number);
    return (
      <ContentListCard
        key={`surah-${s.number}`}
        number={s.number.toString().padStart(2, "0")}
        imageSrc={surahImg}
        title={surahNameIn(s.number, lang)}
        secondaryLabel={s.arabicName}
        isArabicLabel={true}
        subtitle={`${s.verses} ${word("verses", lang)} · ${word(s.revelation === "Medinan" ? "medinan" : "meccan", lang)}`}
        iconName="quran"
        viewCount={countFor("surah", s.number)}
        viewCountText={compactCount(countFor("surah", s.number) ?? 0)}
        isActive={isTrackCurrent}
        isPlaying={isTrackCurrent && player.isPlaying}
        onClick={() => {
          dismissKeyboard();
          setIsOpen(false);
          const activeReciter = resolveActiveReciter(player.current);
          const activeSurahTracks = surahTracks || getSurahTracksForReciter(activeReciter);
          player.playBayan(activeSurahTracks[s.number - 1], activeSurahTracks);
        }}
      />
    );
  };

  const renderJuzCard = (j: (typeof QURAN_JUZ)[number]) => {
    const isTrackCurrent = player.current?.id === `quran-juz-${j.id}`;
    const juzImg = quranThumbUrl("juz", j.id);
    return (
      <ContentListCard
        key={`juz-${j.id}`}
        number={j.id.toString().padStart(2, "0")}
        imageSrc={juzImg}
        title={j.title}
        secondaryLabel={`${word("juz", lang)} ${j.id}`}
        isArabicLabel={false}
        subtitle={t(lang, "Page {from} to {to}", { from: JUZ_PAGES[j.id - 1][0], to: JUZ_PAGES[j.id - 1][1] })}
        iconName="quran"
        viewCount={countFor("juz", j.id)}
        viewCountText={compactCount(countFor("juz", j.id) ?? 0)}
        isActive={isTrackCurrent}
        isPlaying={isTrackCurrent && player.isPlaying}
        onClick={() => {
          dismissKeyboard();
          if (onSelectJuz) {
            onSelectJuz(j.id);
          } else {
            player.playBayan(QURAN_TRACKS[j.id - 1], QURAN_TRACKS);
          }
          setIsOpen(false);
        }}
      />
    );
  };

  return (
    <>
      {/* Top Right Header Trigger Button (☰ content browser, or ♥ favourites) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          triggerClassName ??
          "pointer-events-auto grid h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg text-sand-100 hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer"
        }
        data-tooltip={
          isFavourites ? t(lang, "Favourites") : `${word("surah", lang)} & ${word("juz", lang)}`
        }
        aria-label={
          isFavourites
            ? t(lang, "Open Favourites")
            : t(lang, "Open Content Browser")
        }
      >
        {isFavourites ? (
          <FavouriteIcon className={triggerClassName ? "text-base sm:text-lg" : "h-5 w-5"} />
        ) : (
          <SearchIcon02 className="h-5 w-5" />
        )}
      </button>

      {/* Slide-over panel, every screen size: grows out of the ☰ button and
          shrinks back into it, so the list is seen to live behind that icon. */}
      {mounted && createPortal(
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              onClick={closeModal}
              className="pointer-events-auto fixed inset-0 z-50 bg-black/40 cursor-pointer"
              aria-hidden="true"
            />

            {/* Right Slide-Over Panel */}
            <motion.div
              ref={setPanelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={
                isMobile && kb.bottom > 0
                  ? { bottom: kb.bottom, height: "auto", maxHeight: Math.round(kb.height * 0.92) }
                  : undefined
              }
              {...(isMobile
                ? {
                    // Phones / tablets: a bottom sheet docked to the bottom edge.
                    initial: { y: "100%" },
                    animate: { y: 0 },
                    exit: { y: "100%" },
                    transition: { type: "spring", damping: 30, stiffness: 320 },
                  }
                : {
                    initial: { "--reveal": 0 } as never,
                    animate: { "--reveal": 1 } as never,
                    exit: { "--reveal": 0, transition: { duration: 0.5, ease: [0.4, 0, 1, 1] } } as never,
                    transition: { duration: 0.75, ease: [0.32, 0.72, 0, 1] },
                    onAnimationStart: () => {
                      const el = panelRef.current;
                      if (el) el.style.clipPath = MORPH_CLIP;
                    },
                    onAnimationComplete: (def: unknown) => {
                      const el = panelRef.current;
                      if (el && (def as Record<string, unknown>)["--reveal"] === 1) el.style.clipPath = "none";
                    },
                  })}
              // Floating card in the player's glass. Top and right match the
              // header's padding (ImmersiveHeader), so the panel's corner is the
              // trigger button's corner and the morph opens from it.
              className={`pointer-events-auto fixed z-50 flex flex-col ${PLAYER_GLASS} outline-none ${isMobile ? `inset-x-2 bottom-0 mx-auto h-[86dvh] max-w-[520px] ${kb.bottom > 0 ? "rounded-[28px] border-b" : "rounded-t-[28px] border-b-0"} px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]` : "top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+var(--header-gap,1rem))] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-2 sm:right-8 md:bottom-4 w-[88vw] max-w-md rounded-[28px] sm:rounded-[40px] p-4 md:p-6"} [&>*:not([data-ring])]:[opacity:calc((var(--reveal,1)-0.4)/0.6)]`}
            >
              <span data-ring aria-hidden="true" style={MORPH_RING} className="pointer-events-none absolute" />
              {/* 1. Shared Header */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex min-w-0 items-center gap-2">
                  {(showAbout || showSettings) && (
                    <button
                      type="button"
                      onClick={() => setView(settingsPage ? "settings" : "list")}
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                      aria-label={t(lang, settingsPage ? "Settings" : "Back to the list")}
                    >
                      <ChevronRightIcon className="h-4 w-4 rotate-180" />
                    </button>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                      {isFavourites
                        ? t(lang, "Your Library")
                        : showAbout
                        ? t(lang, "The story & credits")
                        : showSettings
                        ? t(lang, "Your preferences")
                        : t(lang, "Listen & Read")}
                    </span>
                    <h3 id={titleId} className="text-xl font-black text-white tracking-tight">
                      {isFavourites
                        ? t(lang, "Favourites")
                        : showAbout
                        ? t(lang, "About HuDa Web Quran")
                        : settingsPage
                        ? t(lang, SETTINGS_PAGE_TITLE[settingsPage])
                        : showSettings
                        ? t(lang, "Settings")
                        : t(lang, "Choose a Surah or Juz")}
                    </h3>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                {!isFavourites && !showSettings && (
                  <button
                    type="button"
                    onClick={() => setView("settings")}
                    className="tap-44 pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                    aria-label={t(lang, "Settings")}
                    data-tooltip={t(lang, "Settings")}
                  >
                    <SettingsIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeModal();
                  }}
                  className="tap-44 pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                  aria-label={t(lang, "Close")}
                >
                  <CloseIcon className="text-lg" />
                </button>
                </div>
              </div>

              {settingsPage === "language" ? (
                <LanguageView />
              ) : settingsPage === "translation" ? (
                <TranslationPage />
              ) : settingsPage === "textSize" ? (
                <TextSizePage />
              ) : settingsPage === "quran" ? (
                <QuranTextPage />
              ) : showSettings ? (
                <SettingsList
                  onOpen={setView}
                  onLeave={(event) => {
                    // Closed first, and the sheet asked for once the closing
                    // Back entry is gone: that history pop would close it too.
                    setIsOpen(false);
                    window.setTimeout(() => window.dispatchEvent(new Event(event)), 350);
                  }}
                />
              ) : showAbout ? (
                <AboutView />
              ) : (
                <>
                  {/* 3. Search Input Box — above the tabs */}
                  <div className="relative mt-4 mb-3">
                    <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sand-200/50 text-base pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      type="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={
                        isFavourites
                          ? t(lang, "Search favourites...")
                          : t(lang, "Search a Surah, word, topic or 2:255...")
                      }
                      aria-label={
                        isFavourites ? t(lang, "Search favourites") : t(lang, "Search the Quran")
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setVerseTopicKey(null);
                        setSearchQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLElement).blur();
                        }
                      }}
                      className={cn(
                        "w-full rounded-full bg-white/5 border border-white/10 pl-10 py-2.5 text-xs text-white placeholder:text-sand-200/40 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 transition-all",
                        searchQuery ? "pr-11" : "pr-4",
                      )}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                        aria-label={t(lang, "Clear search")}
                        className="absolute right-2.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-sand-200/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 2a. Favourites: Surah | Juz */}
                  {isFavourites && (
                    <div role="tablist" className={cn("mb-3", TAB_TRACK)}>
                      {(["surah", "juz"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          role="tab"
                          aria-selected={favTab === k}
                          onClick={() => setFavTab(k)}
                          className={cn(
                            TAB,
                            favTab === k ? SELECTED_TAB : UNSELECTED_TAB,
                          )}
                        >
                          {word(k, lang)}
                          {favCounts[k] > 0 && <span className="ml-1.5 tabular-nums opacity-70">{favCounts[k]}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 2. Segmented Navigation Tabs (Surah | Juz) — browse only;
                      hidden while searching, when results span all three. */}
                  {!isFavourites && !isSearching && (
                  <div className={cn("mb-3", TAB_TRACK)}>
                    <button
                      type="button"
                      onClick={() => setActiveTab("surah")}
                      className={cn(
                        TAB,
                        activeTab === "surah" ? SELECTED_TAB : UNSELECTED_TAB,
                      )}
                    >
                      {word("surah", lang)}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("quran")}
                      className={cn(
                        TAB,
                        activeTab === "quran" ? SELECTED_TAB : UNSELECTED_TAB,
                      )}
                    >
                      {word("juz", lang)}
                    </button>
                  </div>
                  )}

                  {/* Topic chips (browser): a keyword preset searched across all. */}
                  {!isFavourites && (
                    <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                      {VERSE_TOPICS.map((topic) => (
                        <button
                          key={topic.key}
                          type="button"
                          onClick={() => {
                            setVerseTopicKey((prev) => (prev === topic.key ? null : topic.key));
                            setSearchQuery("");
                          }}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors cursor-pointer",
                            verseTopicKey === topic.key
                              ? "border-amber-300/50 bg-amber-300/15 text-amber-200"
                              : "border-white/15 bg-white/5 text-sand-100 hover:bg-white/10",
                          )}
                        >
                          {t(lang, topic.label)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 4. Scrollable List Content using ContentListCard */}
                  <div className="relative flex min-h-0 flex-1 flex-col">
                  <div
                    ref={listRef}
                    onTouchStart={() => {
                      if (document.activeElement instanceof HTMLInputElement) {
                        document.activeElement.blur();
                      }
                    }}
                    onScroll={() => {
                      if (document.activeElement instanceof HTMLInputElement) {
                        document.activeElement.blur();
                      }
                    }}
                    className={cn(
                      "no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 pt-1",
                      !isFavourites && voiceSupported && "pb-20",
                    )}
                  >
                    {/* BROWSE (box empty): the selected tab's full list. */}
                    {!isFavourites && !isSearching && activeTab === "surah" && filteredSurah.map(renderSurahCard)}
                    {!isFavourites && !isSearching && activeTab === "quran" && filteredJuz.map(renderJuzCard)}

                    {/* SEARCH (box typed or topic chosen): Surahs, Juz & verses
                        together — one common search across all three. */}
                    {!isFavourites && isSearching && (
                      <>
                        {/* A recognised reference jumps straight to the ayah. */}
                        {verseRef && (
                          <button
                            type="button"
                            onClick={() => {
                              dismissKeyboard();
                              onOpenAyah?.(verseRef.surah, verseRef.ayah);
                              setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-300/10 p-3 text-left transition-colors hover:bg-amber-300/15 cursor-pointer"
                          >
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-300/20 text-amber-200">
                              <ChevronRightIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-bold text-white">
                                {surahNameIn(verseRef.surah, lang)} · {word("ayah", lang)} {verseRef.ayah}
                              </span>
                              <span className="block text-[11px] text-amber-200/80">
                                {t(lang, "Go to {ref}", { ref: `${verseRef.surah}:${verseRef.ayah}` })}
                              </span>
                            </span>
                          </button>
                        )}

                        {/* Matching Surahs (text query only, not a topic chip). */}
                        {!verseTopicKey && filteredSurah.length > 0 && (
                          <>
                            <SectionLabel>{word("surah", lang)}</SectionLabel>
                            {filteredSurah.slice(0, 8).map(renderSurahCard)}
                          </>
                        )}

                        {/* Matching Juz. */}
                        {!verseTopicKey && filteredJuz.length > 0 && filteredJuz.length < QURAN_JUZ.length && (
                          <>
                            <SectionLabel>{word("juz", lang)}</SectionLabel>
                            {filteredJuz.map(renderJuzCard)}
                          </>
                        )}

                        {/* Matching verses (hidden when a pure reference matched
                            nothing else — the jump row above is the answer). */}
                        {(verseLoading || !!verseHits?.length || !verseRef) && (
                          <SectionLabel>{word("verses", lang)}</SectionLabel>
                        )}
                        {verseLoading && (
                          <div className="h-16 animate-pulse rounded-2xl bg-white/5" aria-busy="true" />
                        )}
                        {!verseLoading && verseHits?.map(renderVerseCard)}
                        {!verseLoading && !verseRef && verseHits !== null && verseHits.length === 0 && (
                          <p className="px-2 py-6 text-center text-xs text-sand-200/60">
                            {t(lang, "No verses found. Try another word or spelling.")}
                          </p>
                        )}
                      </>
                    )}


                    {/* FAVOURITES PANEL (liked Surahs & Juz, newest first) */}
                    {isFavourites &&
                      (favouritesFailed ? (
                        <p className="px-2 py-8 text-center text-xs text-sand-200/60">
                          {t(lang, "Favourites aren't available right now.")}
                        </p>
                      ) : favourites === null ? (
                        <div className="h-16 animate-pulse rounded-2xl bg-white/5" aria-busy="true" />
                      ) : (() => {
                        const cards = favourites
                          .filter((f) => f.kind === favTab)
                          .map((f) => {
                            if (f.kind === "surah") {
                              const sura = filteredSurah.find((x) => x.number === f.id);
                              return sura ? renderSurahCard(sura) : null;
                            }
                            const juz = filteredJuz.find((x) => x.id === f.id);
                            return juz ? renderJuzCard(juz) : null;
                          })
                          .filter(Boolean);
                        if (cards.length) return cards;
                        const label = word(favTab, lang);
                        return (
                          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <FavouriteIcon className="text-2xl text-emerald-400/70" />
                            <p className="text-xs text-sand-200/70">
                              {q && favCounts[favTab]
                                ? t(lang, "No matching favourites.")
                                : t(lang, "No {label} favourites yet.", { label })}
                            </p>
                            {!(q && favCounts[favTab]) && (
                              <p className="text-[11px] text-sand-200/65">
                                {t(lang, "Like the {label} you're listening to (♥ beside the cover) to keep it here.", { label })}
                              </p>
                            )}
                          </div>
                        );
                      })())}

                  </div>

                  {/* Voice search: a floating gold button over the list. */}
                  {voiceDebug && voiceLog.length > 0 && (
                    <pre className="absolute left-2 top-2 z-20 max-h-[60%] max-w-[85%] overflow-auto whitespace-pre-wrap rounded-lg bg-black/90 p-2 text-[10px] leading-tight text-green-300">
                      {voiceLog.join("\n")}
                    </pre>
                  )}
                  {!isFavourites && voiceSupported && dictationHint && (
                    <p
                      role="status"
                      className="absolute bottom-[4.75rem] right-3 z-10 max-w-[15rem] rounded-2xl bg-black/80 px-3 py-2 text-xs leading-snug text-sand-100 shadow-lg ring-1 ring-white/10"
                    >
                      {t(lang, "Voice search isn't available here. Tap the search box, then 🎤 on the keyboard.")}
                    </p>
                  )}
                  {!isFavourites && voiceSupported && (
                    <button
                      type="button"
                      onClick={listening ? stopVoice : startVoice}
                      aria-label={listening ? t(lang, "Stop listening") : t(lang, "Search by voice")}
                      aria-pressed={listening}
                      className={cn(
                        "absolute bottom-3 right-3 z-10 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-600 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-gold-300/60 transition-transform cursor-pointer hover:scale-105 active:scale-90",
                      )}
                    >
                      {listening ? (
                        <VoiceWaveIcon className={cn("text-[40px]", hearing && "voice-wave-live")} />
                      ) : (
                        <VoiceSearchIcon className="text-[26px]" />
                      )}
                    </button>
                  )}
                  </div>
                </>
              )}

              {/* 5. Footer: « About HuDa » (the browser only) — not while
                  searching, when the keyboard leaves the results little room */}
              {!isFavourites && !showAbout && !showSettings && !(kb.bottom > 0 || searchQuery.trim()) && (
                <button
                  type="button"
                  onClick={() => setView("about")}
                  className={`mt-3 ${isMobile ? "mb-1.5" : ""} flex w-full shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1.5 text-left hover:bg-white/10 transition-colors cursor-pointer`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/huda-logo-circle.webp" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full object-contain" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-white">
                      {t(lang, "About HuDa Web Quran")}
                    </span>
                    <span className="block truncate text-[11px] text-sand-200/60">
                      {ABOUT.appUrl || ABOUT.appNote
                        ? t(lang, "The app · credits · feedback")
                        : t(lang, "Credits · feedback")}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-sand-200/60" />
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

/** « About HuDa »: what it is, the app, the maker, credits, feedback. */
function AboutView() {
  const lang = useUiLang();
  const contactHref = ABOUT.contact.includes("@") && !ABOUT.contact.startsWith("http") ? `mailto:${ABOUT.contact}` : ABOUT.contact;
  // Copy the contact (✓ for a moment). Clipboard API, else a hidden textarea.
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);
  const copyContact = async () => {
    try {
      await navigator.clipboard.writeText(ABOUT.contact);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = ABOUT.contact;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) return; // nothing copied: no ✓
    }
    setCopied(true);
  };
  const copyLabel = t(lang, "Copy");
  const copiedLabel = t(lang, "Copied");
  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 pr-1 space-y-4 text-sand-100">
      {/* Logo left, name right — the pair centred over the intro */}
      <div className="flex items-center justify-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/huda-logo-circle.webp" alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-contain" />
        <div className="text-left">
          <p className="text-lg font-black text-white">HuDa Web Quran</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-sand-200/60">{ABOUT.tagline}</p>
        </div>
      </div>
      <p className="text-center text-[13px] leading-relaxed text-sand-100/85">{ABOUT.intro}</p>


      {!ABOUT.appUrl && ABOUT.appNote && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
          <p className="text-xs font-bold text-white">{t(lang, "HuDa Mobile App")}</p>
          <p className="text-[11px] text-sand-200/70">{ABOUT.appNote}</p>
          {ABOUT.appPlatforms.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {ABOUT.appPlatforms.map((p) => (
                <span
                  key={p}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-200",
                  )}
                >
                  {p === "iOS" ? <AppleIcon className="text-sm" /> : <AndroidIcon className="text-sm" />}
                  {p} · {t(lang, "Coming soon")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {ABOUT.appUrl && (
        <a
          href={ABOUT.appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 hover:bg-emerald-500/15 transition-colors"
        >
          <span>
            <span className="block text-xs font-bold text-white">{t(lang, "HuDa Mobile App")}</span>
            <span className="block text-[11px] text-sand-200/70">{t(lang, "Get the app")}</span>
          </span>
          <ChevronRightIcon className="h-4 w-4 text-emerald-300" />
        </a>
      )}

      {/* Feedback right under the mobile app (owner, 2026-10-09) */}
      {ABOUT.contact && (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2">
          <a
            href={contactHref}
            target={contactHref.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="min-w-0 flex-1 rounded-xl px-2.5 py-1.5 hover:bg-white/5 transition-colors"
          >
            <span className="block text-xs font-bold text-white">{t(lang, "Feedback")}</span>
            <span className="block truncate text-[11px] text-sand-200/70">{ABOUT.contact}</span>
          </a>
          <button
            type="button"
            onClick={copyContact}
            aria-label={copied ? copiedLabel : `${copyLabel} ${ABOUT.contact}`}
            title={copied ? copiedLabel : copyLabel}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors cursor-pointer active:scale-95",
              copied
                ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-300"
                : "border-white/10 bg-white/10 text-sand-100 hover:bg-white/20 hover:text-white"
            )}
          >
            {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
            <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
          </button>
        </div>
      )}

      {ABOUT.maker && (
        // Maker card: thin gold edge, a warm halo behind the logo, and a shine
        // that sweeps across the gold lettering only (masked to the logo).
        <div className="rounded-[22px] bg-gradient-to-br from-[#F6DE9A]/50 via-white/10 to-[#B98532]/40 p-px">
          <div className="relative overflow-hidden rounded-[21px] bg-[#0d0f0e]/80 px-5 pb-5 pt-4 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-6 mx-auto h-24 w-56 rounded-full bg-[#E8C46E]/20 blur-3xl"
            />
            <p className="relative text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#E8C46E]/80">
              {t(lang, "Crafted by")}
            </p>
            {ABOUT.makerLogo ? (
              // The SVG keeps the Figma frame's side margins (more room right of
              // the lettering than left), so the light feather tail balances.
              <div className="relative mx-auto mt-3 w-full max-w-[296px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ABOUT.makerLogo}
                  alt={ABOUT.maker}
                  width={964}
                  height={220}
                  className="h-auto w-full drop-shadow-[0_4px_18px_rgba(232,196,110,0.35)]"
                />
                <span
                  aria-hidden="true"
                  className="huda-logo-shine pointer-events-none absolute inset-0"
                  style={{ WebkitMaskImage: `url(${ABOUT.makerLogo})`, maskImage: `url(${ABOUT.makerLogo})` }}
                />
              </div>
            ) : (
              <p className="relative mt-2 text-lg font-bold text-white">{ABOUT.maker}</p>
            )}
            {ABOUT.makerNote.length > 0 && (
              <div className="relative mt-5 space-y-3 border-t border-white/10 pt-4 text-center">
                {ABOUT.makerNote.map((para) => (
                  <p key={para} className="text-[13px] leading-relaxed text-sand-100/85">
                    {/* **text** → gold; the split leaves those at odd indexes */}
                    {para.split("**").map((part, i) =>
                      i % 2 ? (
                        <strong key={i} className="font-semibold text-[#E8C46E]">
                          {part}
                        </strong>
                      ) : (
                        part
                      )
                    )}
                  </p>
                ))}
              </div>
            )}
            {ABOUT.builtWith.length > 0 && (
              <p className="relative mt-4 text-[11px] text-sand-200/70">
                <span>{t(lang, "Created with AI")}</span> ·{" "}
                {ABOUT.builtWith.map((tool, i) => (
                  <span key={tool}>
                    {i > 0 && " & "}
                    <span className="font-semibold text-[#E8C46E]">{tool}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 space-y-2.5">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
          {t(lang, "Sources & credits")}
        </p>
        {ABOUT.credits.map((c) => (
          <div key={c.label}>
            <p className="text-[11px] font-bold text-white">{c.label}</p>
            <p className="text-[11px] text-sand-200/70">{c.value}</p>
          </div>
        ))}
      </div>

    </div>
  );
}

/** Settings › App language: every label, each name in its own script. */
function LanguageView() {
  const lang = useUiLang();
  const setUiLang = useSetUiLang();
  return (
    <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 pr-1 space-y-4 text-sand-100">
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-[11px] text-sand-200/70">
          {t(lang, "Ayah meanings are chosen separately, from the translation button.")}
        </p>
        <div role="radiogroup" aria-label={t(lang, "App language")} className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {UI_LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={lang === l.id}
              lang={l.id}
              dir={l.id === "ur" ? "rtl" : undefined}
              onClick={() => setUiLang(l.id)}
              className={cn(TAB, "leading-5", lang === l.id ? SELECTED_TAB : "border-white/10 text-white hover:bg-white/5")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Settings gear (24px grid, stroke follows the text colour). */
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.3175 7.14139L20.8239 6.28479C20.4506 5.63696 20.264 5.31305 19.9464 5.18388C19.6288 5.05472 19.2696 5.15664 18.5513 5.36048L17.3311 5.70418C16.8725 5.80994 16.3913 5.74994 15.9726 5.53479L15.6357 5.34042C15.2766 5.11043 15.0004 4.77133 14.8475 4.37274L14.5136 3.37536C14.294 2.71534 14.1842 2.38533 13.9228 2.19657C13.6615 2.00781 13.3143 2.00781 12.6199 2.00781H11.5051C10.8108 2.00781 10.4636 2.00781 10.2022 2.19657C9.94085 2.38533 9.83106 2.71534 9.61149 3.37536L9.27753 4.37274C9.12465 4.77133 8.84845 5.11043 8.48937 5.34042L8.15249 5.53479C7.73374 5.74994 7.25259 5.80994 6.79398 5.70418L5.57375 5.36048C4.85541 5.15664 4.49625 5.05472 4.17867 5.18388C3.86109 5.31305 3.67445 5.63696 3.30115 6.28479L2.80757 7.14139C2.45766 7.74864 2.2827 8.05227 2.31666 8.37549C2.35061 8.69871 2.58483 8.95918 3.05326 9.48012L4.0843 10.6328C4.3363 10.9518 4.51521 11.5078 4.51521 12.0077C4.51521 12.5078 4.33636 13.0636 4.08433 13.3827L3.05326 14.5354C2.58483 15.0564 2.35062 15.3168 2.31666 15.6401C2.2827 15.9633 2.45766 16.2669 2.80757 16.8741L3.30114 17.7307C3.67443 18.3785 3.86109 18.7025 4.17867 18.8316C4.49625 18.9608 4.85542 18.8589 5.57377 18.655L6.79394 18.3113C7.25263 18.2055 7.73387 18.2656 8.15267 18.4808L8.4895 18.6752C8.84851 18.9052 9.12464 19.2442 9.2775 19.6428L9.61149 20.6403C9.83106 21.3003 9.94085 21.6303 10.2022 21.8191C10.4636 22.0078 10.8108 22.0078 11.5051 22.0078H12.6199C13.3143 22.0078 13.6615 22.0078 13.9228 21.8191C14.1842 21.6303 14.294 21.3003 14.5136 20.6403L14.8476 19.6428C15.0004 19.2442 15.2765 18.9052 15.6356 18.6752L15.9724 18.4808C16.3912 18.2656 16.8724 18.2055 17.3311 18.3113L18.5513 18.655C19.2696 18.8589 19.6288 18.9608 19.9464 18.8316C20.264 18.7025 20.4506 18.3785 20.8239 17.7307L21.3175 16.8741C21.6674 16.2669 21.8423 15.9633 21.8084 15.6401C21.7744 15.3168 21.5402 15.0564 21.0718 14.5354L20.0407 13.3827C19.7887 13.0636 19.6098 12.5078 19.6098 12.0077C19.6098 11.5078 19.7888 10.9518 20.0407 10.6328L21.0718 9.48012C21.5402 8.95918 21.7744 8.69871 21.8084 8.37549C21.8423 8.05227 21.6674 7.74864 21.3175 7.14139Z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M15.5195 12C15.5195 13.933 13.9525 15.5 12.0195 15.5C10.0865 15.5 8.51953 13.933 8.51953 12C8.51953 10.067 10.0865 8.5 12.0195 8.5C13.9525 8.5 15.5195 10.067 15.5195 12Z"
        stroke="currentColor"
        strokeWidth={1.5}
      />
    </svg>
  );
}
