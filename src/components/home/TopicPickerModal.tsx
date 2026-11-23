"use client";

import { landscapeQuery } from "@/lib/landscape";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { BayanWithRelations } from "@/types/bayan";
import { AndroidIcon, AppleIcon, CheckIcon, ChevronRightIcon, CloseIcon, CopyIcon, FavouriteIcon, KeyboardMicIcon, SearchIcon, SearchIcon02, VoiceSearchIcon, VoiceWaveIcon } from "@/components/ui/Icon";
import { playClick } from "@/lib/clickSound";
import { cn } from "@/lib/utils";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useBackToClose } from "@/lib/useBackToClose";
import { useOnlyOneSheet } from "@/lib/useOnlyOneSheet";
import { useAutoCloseIdle } from "@/lib/useAutoCloseIdle";
import { PLAYER_GLASS, peekScroll, SearchStuckProvider, StickySearch, TitleBacking, useIsMobile, useKeyboardInset } from "@/components/ui/ActionSheet";
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
import { ABOUT } from "@/lib/data/about";
import { ContentListCard } from "./ContentListCard";
import { RemindersPage } from "./RemindersPage";
import { AccountPage } from "./AccountPage";
import { OPEN_ACCOUNT_EVENT } from "@/lib/settingsEvents";
import { QuranTextPage, SETTINGS_PAGES, SETTINGS_PAGE_TITLE, ProfileList, SettingsList, TextSizePage, TranslationPage, useHomeSettings, type SettingsPage } from "./SettingsPages";
import { fetchSurahWords, type QuranScript } from "@/lib/data/quranGlyphs";
import { compactCount } from "./QuranEngagement";
import { getSupabaseRpcClient } from "@/lib/supabase/rpc";
import { getSessionId } from "@/lib/audio/session";
import { SELECTED_TAB, TAB, TAB_TRACK, UNSELECTED_TAB } from "@/components/ui/selection";
import { UI_LANGS, surahNameIn, t, uiLocale, useSetUiLang, useUiLang, word } from "@/lib/uiLang";

type ModalTab = "surah" | "quran";

/**
 * A verse row's Arabic: one line, ellipsized, in the reader's script — the
 * Uthmani words in the Hafs font or the IndoPak words in the IndoPak font
 * (the same per-surah word data the reader loads). The index's Tanzil text
 * (Amiri) shows until those words arrive, or if they can't be fetched.
 */
function VerseLine({ hit, script }: { hit: VerseHit; script: QuranScript }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setText(null);
    fetchSurahWords(hit.surah, script).then((verses) => {
      const v = verses?.find((x) => x.a === hit.ayah);
      if (live && v) setText(v.w.map((w) => w[2]).join(" "));
    });
    return () => {
      live = false;
    };
  }, [hit.surah, hit.ayah, script]);
  return (
    <span
      lang="ar"
      dir="rtl"
      className={cn(
        // Generous line-height + padding so the marks above and below aren't
        // clipped; the line fades out at its end (left) instead of cutting a word.
        "mt-1 block overflow-hidden whitespace-nowrap py-1 text-right font-arabic text-sand-50/90",
        "[mask-image:linear-gradient(to_left,black_75%,transparent)]",
        text === null
          ? "quran-tanzil text-lg leading-[2]" // Hafs draws U+06DF as a dotted circle; Amiri doesn't.
          : script === "indopak"
            ? "quran-indopak text-xl leading-[2.2]"
            : "text-xl leading-[2]",
      )}
    >
      {text ?? hit.arabic}
    </span>
  );
}

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
  // The browser's list, its « About HuDa » view (the logo above the mic), and
  // the header profile picture's menu (sign in · Settings · About) with
  // Settings and its pages; 🔍 opens on the list, the picture on its menu.
  const [view, setView] = useState<"list" | "profile" | "about" | "settings" | SettingsPage>("list");
  const startViewRef = useRef<"profile" | null>(null);
  // About reached from the profile menu goes back there, not to the list.
  const [aboutFromProfile, setAboutFromProfile] = useState(false);
  useEffect(() => {
    if (isOpen) setView(startViewRef.current ?? "list");
    startViewRef.current = null;
  }, [isOpen]);
  useEffect(() => {
    if (view === "list") setAboutFromProfile(false);
  }, [view]);
  const showProfile = !isFavourites && view === "profile";
  // The Profile menu is short (sign-in, Settings, About): the panel fits it
  // instead of standing full height (owner, 2026-11-23).
  const fitHeight = showProfile;
  const showAbout = !isFavourites && view === "about";
  // A page under Settings (App language, Translation, …).
  const settingsPage = !isFavourites && SETTINGS_PAGES.includes(view as SettingsPage) ? (view as SettingsPage) : null;
  // A Settings row that opens another sheet: closed first, and the sheet
  // asked for once the closing Back entry is gone (that pop would close it too).
  const leaveSettings = (event: string) => {
    setIsOpen(false);
    window.setTimeout(() => window.dispatchEvent(new Event(event)), 350);
  };
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
  // Phones, browse list: the whole panel scrolls (header, tabs, topics, list),
  // only the search row stays at the top — a landscape phone has no room for
  // a fixed header above an inner list.
  const wholeScroll = isMobile && !showAbout && !showSettings && !showProfile;
  const [panelScrolled, setPanelScrolled] = useState(false);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  // Phone landscape: a little peek on open, so the Surah list below shows.
  useEffect(() => {
    if (!isOpen || !wholeScroll) return;
    return peekScroll(scrollWrapRef.current, 800);
  }, [isOpen, wholeScroll]);
  const [searchStuck, setSearchStuck] = useState(false);
  useEffect(() => {
    setPanelScrolled(false);
  }, [view, isOpen]);
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
  useAutoCloseIdle(isOpen, closeModal);
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

  // The header profile picture: its menu (sign in · Settings · About).
  useEffect(() => {
    if (isFavourites) return;
    const open = () => {
      startViewRef.current = "profile";
      setView("profile");
      setIsOpen(true);
    };
    window.addEventListener(OPEN_ACCOUNT_EVENT, open);
    return () => window.removeEventListener(OPEN_ACCOUNT_EVENT, open);
  }, [isFavourites]);

  // Every open: bring the playing Surah / Juz card to the middle of the list
  // (once the panel has slid in and the list has rendered).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Phone landscape: open at the top (tabs and topics first); the
    // listener scrolls to the list themself.
    if (!isOpen || window.matchMedia(landscapeQuery()).matches) return;
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
  const chosenTopic = verseTopicKey ? VERSE_TOPICS.find((x) => x.key === verseTopicKey) ?? null : null;
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
          setVerseHits(searchVerses(index, terms, { anyTerm: !!topic, mushafOrder: !!topic, limit: topic ? 60 : 40 }));
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

  // iOS: no clicks around listening (a sound then can take the audio
  // session from recognition).
  const isIos =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  // On iOS the mic always falls back to the keyboard's own dictation, so it
  // stays there even with no (or a broken) Web Speech API.
  const voiceSupported =
    typeof window !== "undefined" &&
    (isIos || isIosStandalone || !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [dictationHint, setDictationHint] = useState(false);
  const dictationHintTimerRef = useRef<number | null>(null);
  const showDictationHint = useCallback(() => {
    setDictationHint(true);
    if (dictationHintTimerRef.current) window.clearTimeout(dictationHintTimerRef.current);
    dictationHintTimerRef.current = window.setTimeout(() => setDictationHint(false), 6000);
  }, []);


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
    }
    setListening(false);
    setHearing(false);
  }, []);

  const startVoice = useCallback(() => {
    // iOS: always open the keyboard and point to its own dictation — it
    // catches Surah names well, and iOS Safari gives a page's second Web
    // Speech search a mic with only silence (WebKit bug; checked on the
    // owner's iPhone 13, iOS 27.0.1). A page can't press the keyboard mic itself.
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (isIos || !Ctor) {
      // Still inside the tap, so iOS opens the keyboard (and its mic).
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
      rec.onstart = () => {
        started = true;
        setListening(true);
      };

      rec.onspeechstart = () => {
        setHearing(true);
      };

      rec.onresult = (e: SpeechRecognitionEvent) => {
        setHearing(true);
        let transcript = "";
        for (let i = 0; i < e.results.length; ++i) {
          const item = e.results[i]?.[0]?.transcript;
          if (item) transcript += item;
        }
        const clean = transcript.trim();
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
        if (recognitionRef.current !== rec) return;
        if (voiceTimeoutRef.current) {
          window.clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = null;
        }
        setListening(false);
        setHearing(false);
        recognitionRef.current = null;
      };

      rec.onerror = (e) => {
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
      };

      const startRec = () => {
        if (recognitionRef.current !== rec) return; // stopped meanwhile
        try {
          rec.start();
        } catch (err) {
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
  }, [lang, player, stopVoice, isIos, isIosStandalone, showDictationHint]);

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

  // Verse rows follow the reader's script (Uthmani / IndoPak, Settings).
  const script = useHomeSettings()?.script ?? "uthmani";
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
          <VerseLine hit={h} script={script} />
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
        data-tour={isFavourites ? "favourites" : "browse"}
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
              className={`pointer-events-auto fixed z-50 flex flex-col ${PLAYER_GLASS} outline-none ${isMobile ? `inset-x-2 bottom-0 mx-auto ${fitHeight ? "h-auto max-h-[86dvh]" : "h-[86dvh]"} max-w-[520px] ${kb.bottom > 0 ? "rounded-[28px] border-b" : "rounded-t-[28px] border-b-0"} px-4 pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]` : `top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+var(--header-gap,1rem))] ${fitHeight ? "max-h-[calc(100dvh-max(env(safe-area-inset-top),var(--vv-top,0px))-var(--header-gap,1rem)-1rem)]" : "bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] md:bottom-4"} right-2 sm:right-8 w-[88vw] max-w-md rounded-[28px] sm:rounded-[40px] p-4 md:p-6`} [&>*:not([data-ring])]:[opacity:calc((var(--reveal,1)-0.4)/0.6)]`}
            >
              <span data-ring aria-hidden="true" style={MORPH_RING} className="pointer-events-none absolute" />
              {/* 1. Shared Header — phones: a dark backing fades in behind it once
                  the panel's content scrolls (joined to a stuck search row). */}
              <div className="relative isolate flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                {isMobile && <TitleBacking show={panelScrolled} joined={searchStuck} className="-inset-x-4 -top-4 bottom-0" />}
                <div className="flex min-w-0 items-center gap-2">
                  {(showAbout || showSettings) && (
                    <button
                      type="button"
                      onClick={() =>
                        setView(
                          settingsPage === "account" || view === "settings" || (showAbout && aboutFromProfile)
                            ? "profile"
                            : settingsPage
                              ? "settings"
                              : "list",
                        )
                      }
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white transition-colors cursor-pointer active:scale-90"
                      aria-label={
                        settingsPage && settingsPage !== "account"
                          ? t(lang, "Settings")
                          : showAbout && !aboutFromProfile
                            ? t(lang, "Back to the list")
                            : t(lang, "Profile")
                      }
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
                        : showSettings || showProfile
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
                        : showProfile
                        ? t(lang, "Profile")
                        : t(lang, "Choose a Surah or Juz")}
                    </h3>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
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

              {/* Phones, browse list: everything under the title scrolls as one;
                  the search row sticks at the top of it. */}
              <SearchStuckProvider value={setSearchStuck}>
              <div
                ref={scrollWrapRef}
                className={cn(
                  wholeScroll ? "no-scrollbar -mx-4 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 [&>*]:shrink-0" : "contents [&>*]:[opacity:calc((var(--reveal,1)-0.4)/0.6)]",
                  // Phones: the list runs on to the panel's bottom edge, not cut
                  // short by the panel's bottom padding (keyboard closed only).
                  wholeScroll && !isFavourites && !(kb.bottom > 0) && "-mb-[max(0.75rem,env(safe-area-inset-bottom))]",
                )}
                onScrollCapture={(ev) => setPanelScrolled((ev.target as HTMLElement).scrollTop > 0)}
              >
              {settingsPage === "language" ? (
                <LanguageView />
              ) : settingsPage === "translation" ? (
                <TranslationPage />
              ) : settingsPage === "textSize" ? (
                <TextSizePage />
              ) : settingsPage === "quran" ? (
                <QuranTextPage />
              ) : settingsPage === "reminders" ? (
                <RemindersPage onLeave={leaveSettings} />
              ) : settingsPage === "account" ? (
                <AccountPage />
              ) : showSettings ? (
                <SettingsList onOpen={setView} onLeave={leaveSettings} />
              ) : showProfile ? (
                <ProfileList
                  onSettings={() => setView("settings")}
                  onAbout={() => {
                    setAboutFromProfile(true);
                    setView("about");
                  }}
                />
              ) : showAbout ? (
                <AboutView />
              ) : (
                <>
                  {/* 3. Search Input Box — above the tabs. A chosen topic sits
                      inside it as a chip; the ✕ at its end clears both. */}
                  <SearchRow sticky={wholeScroll}>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pl-3.5 pr-1.5 transition-all focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400">
                    <SearchIcon className="shrink-0 text-base text-sand-200/50 pointer-events-none" />
                    {chosenTopic && (
                      <button
                        type="button"
                        onClick={() => {
                          setVerseTopicKey(null);
                          searchInputRef.current?.focus();
                        }}
                        aria-label={`${t(lang, "Clear search")}: ${t(lang, chosenTopic.label)}`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/50 bg-amber-300/15 py-0.5 ps-2.5 pe-1 text-[11px] font-medium text-amber-200 cursor-pointer"
                      >
                        {t(lang, chosenTopic.label)}
                        <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-200/20">
                          <CloseIcon className="h-2.5 w-2.5" />
                        </span>
                      </button>
                    )}
                    <input
                      ref={searchInputRef}
                      type="search"
                      enterKeyHint="search"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={
                        chosenTopic
                          ? ""
                          : isFavourites
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
                        // Backspace in an empty box takes the topic chip out.
                        if (e.key === "Backspace" && !searchQuery && chosenTopic) setVerseTopicKey(null);
                      }}
                      className="min-w-0 flex-1 bg-transparent py-2.5 pr-2 text-xs text-white placeholder:text-sand-200/40 focus:outline-none"
                    />
                    {(searchQuery || chosenTopic) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setVerseTopicKey(null);
                          searchInputRef.current?.focus();
                        }}
                        aria-label={t(lang, "Clear search")}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sand-200/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  </SearchRow>

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

                  {/* Topic chips (browser): a keyword preset searched across all; the
                      chosen one moves into the search box. */}
                  {!isFavourites && (
                    <div className="no-scrollbar mb-3 flex gap-2 overflow-x-auto pb-1">
                      {VERSE_TOPICS.filter((topic) => topic.key !== verseTopicKey).map((topic) => (
                        <button
                          key={topic.key}
                          type="button"
                          onClick={() => {
                            setVerseTopicKey(topic.key);
                            setSearchQuery("");
                          }}
                          className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-sand-100 transition-colors hover:bg-white/10 cursor-pointer"
                        >
                          {t(lang, topic.label)}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 4. Scrollable List Content using ContentListCard */}
                  <div className={wholeScroll ? "relative flex flex-col" : "relative flex min-h-0 flex-1 flex-col"}>
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
                      wholeScroll ? "space-y-2 pt-1" : "no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 pt-1",
                      // Room for the About logo (and the mic) floating over the list's end.
                      !isFavourites && (voiceSupported ? "pb-36" : "pb-20"),
                      // Larger screens: run on through the panel's bottom padding
                      // to its edge; the bottom corners follow the panel's curve.
                      !wholeScroll && !isFavourites && "-mb-4 rounded-b-[12px] sm:rounded-b-[24px] md:-mb-6 md:rounded-b-[16px]",
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

                  {/* Voice search: a floating gold button over the list (phones:
                      held at the panel's bottom edge while the panel scrolls). */}
                  <div
                    className={cn(
                      wholeScroll ? "pointer-events-none sticky bottom-0 z-10 -mt-20 h-20" : "contents",
                      // Keep the mic/logo above the home bar now the list runs to the edge.
                      wholeScroll && !isFavourites && !(kb.bottom > 0) && "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
                    )}
                  >
                  {!isFavourites && voiceSupported && dictationHint && (
                    <p
                      role="status"
                      className="pointer-events-auto absolute bottom-[4.75rem] right-3 z-10 max-w-[15rem] right-20rounded-2xl bg-black/80 px-3 py-2 text-xs leading-snug text-sand-100 shadow-lg ring-1 ring-white/10"
                    >
                      {/* The keyboard's own mic, drawn where {mic} stands. */}
                      {t(lang, "Tap {mic} on the keyboard to search by voice.")
                        .split("{mic}")
                        .flatMap((part, i) => (i ? [<KeyboardMicIcon key={i} className="mx-0.5 inline-block align-[-0.2em] text-[1.25em]" />, part] : [part]))}
                    </p>
                  )}
                  {!isFavourites && voiceSupported && (
                    <button
                      type="button"
                      onClick={listening ? stopVoice : startVoice}
                      aria-label={listening ? t(lang, "Stop listening") : t(lang, "Search by voice")}
                      aria-pressed={listening}
                      className={cn(
                        "pointer-events-auto absolute bottom-3 right-3 z-10 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-gold-600 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-1 ring-gold-300/60 transition-transform cursor-pointer hover:scale-105 active:scale-90",
                      )}
                    >
                      {listening ? (
                        <VoiceWaveIcon className={cn("text-[40px]", hearing && "voice-wave-live")} />
                      ) : (
                        <VoiceSearchIcon className="text-[26px]" />
                      )}
                    </button>
                  )}
                  {/* « About HuDa »: the logo floats just above the mic, the same
                      size, on every screen — hidden while searching, when the
                      keyboard leaves the results little room. */}
                  {!isFavourites && !(kb.bottom > 0 || searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => setView("about")}
                      className={cn(
                        "pointer-events-auto absolute right-3 z-10 grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-white/10 shadow-[0_6px_18px_rgba(0,0,0,0.4)] ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20 cursor-pointer active:scale-90",
                        voiceSupported ? "bottom-[4.75rem]" : "bottom-3",
                      )}
                      aria-label={t(lang, "About HuDa Web Quran")}
                      data-tooltip={t(lang, "About HuDa Web Quran")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/huda-logo-circle.webp" alt="" width={56} height={56} className="h-14 w-14 rounded-full object-contain" />
                    </button>
                  )}
                  </div>
                  </div>
                </>
              )}

              </div>
              </SearchStuckProvider>
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

/** The search row: sticks at the top of the phone list, plain elsewhere. */
function SearchRow({ sticky, children }: { sticky: boolean; children: React.ReactNode }) {
  return sticky ? <StickySearch className="mt-2 mb-1">{children}</StickySearch> : <div className="mt-4 mb-3">{children}</div>;
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
