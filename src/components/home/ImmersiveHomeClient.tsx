"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BayanWithRelations } from "@/types/bayan";
import { ImmersiveBackground } from "./ImmersiveBackground";
import { ImmersiveHeader, READER_SCALES } from "./ImmersiveHeader";
import { CompactBayanPlayer } from "./CompactBayanPlayer";
import { TopicPickerModal } from "./TopicPickerModal";
import { CenterVerseDisplay } from "./CenterVerseDisplay";
import { ReadingView, type ReadingRange } from "./ReadingView";
import { MushafPagePicker } from "./MushafPagePicker";
import { MUSHAF_PAGE_COUNT, MUSHAF_PAGE_STARTS, mushafPageOf } from "@/lib/data/mushafPages";
import { reciterHasSurah } from "@/lib/data/quranReciters";
import { InstallGuide, InstallGuideButton } from "./InstallGuide";
import { afterSplash, afterStage } from "@/lib/onboarding";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { VideoCameraIcon, ImageIcon, BookOpenIcon, BookOpenFilledIcon, BookmarkIcon, BookmarkAddIcon } from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import {
  browserTranslationLang,
  detectTranslationLang,
  isTranslationLang,
  placeTranslationLang,
  PLACE_EVENT,
  type PlaceDetail,
  type TranslationLang,
} from "@/lib/data/translations";
import { bookmarkId, loadBookmarks, saveBookmarks, type Bookmark } from "@/lib/lastRead";
import {
  isQuranTrack,
  isQuranTrackId,
  isSurahTrackId,
  getSurahByTrackId,
  getQuranJuzByTrackId,
  SURAH_TRACKS,
  QURAN_SURAHS,
  QURAN_TRACKS,
  getSurahTracksForReciter,
  quranSurahToTrack,
  quranJuzToTrackForReciter,
  buildJuzAyahUrls,
  buildJuzPreludes,
  getJuzAyahPairs,
  getDefaultReciter,
  getReciterById,
  reciterHasWordTiming,
  reciterHasWordTimingFor,
  wordSyncUnavailableReason,
  resolveActiveReciter,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "@/lib/data/service";
import {
  useQuranVerseSync,
  getVoiceProgressInVerse,
  fetchSurahVerses,
  getRecitationTimeline,
  getAyahClipWordSync,
  ayahClipTimeOf,
  CANONICAL_ISTIADHAH,
  CANONICAL_BISMILLAH,
  type AyahVerse,
  type RecitationSegment,
} from "@/lib/data/quranVerses";
import { SURAH_DURATIONS } from "@/lib/data/surahDurations";
import { isWebKit } from "@/lib/data/quranGlyphs";
import { SyncQADebugHUD } from "./SyncQADebugHUD";
import { useIsMobile } from "@/components/ui/ActionSheet";
import {
  useQuranEngagement,
  quranContentOf,
  EngagementOverlay,
  PlayerStatsFrame,
  PlayerLikeButton,
} from "./QuranEngagement";

/**
 * The Surah each Juz begins in (many Juz start mid-surah). Only Maher has a
 * dedicated 30-Juz recording; when the listener picks another reciter for a
 * Juz we continue in that reciter's voice from the Juz's starting Surah,
 * rather than resetting to Al-Fatihah.
 */
const JUZ_START_SURAH: Record<number, number> = {
  1: 1, 2: 2, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 7, 10: 8,
  11: 9, 12: 11, 13: 12, 14: 15, 15: 17, 16: 18, 17: 21, 18: 23, 19: 25, 20: 27,
  21: 29, 22: 33, 23: 36, 24: 39, 25: 41, 26: 46, 27: 51, 28: 58, 29: 67, 30: 78,
};

export function ImmersiveHomeClient() {
  const player = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  const [visualMode, setVisualMode] = useState<"video" | "image">("video");
  // The ayah-meaning language (English, Tamil, Urdu…). The app's own labels
  // follow it only for Tamil — the rest of the interface is in English.
  const [translationLang, setTranslationLang] = useState<TranslationLang>("en");
  const language: "en" | "ta" = translationLang === "ta" ? "ta" : "en";
  // Greet the visitor on open; the ayah takes over once playback first starts.
  const [hasPlayed, setHasPlayed] = useState(false);
  useEffect(() => {
    if (player.isPlaying) setHasPlayed(true);
  }, [player.isPlaying]);
  const [selectedReciter, setSelectedReciter] = useState<QuranReciter>(getDefaultReciter);

  // Memoize surah tracks for the selected reciter
  const surahTracksForCurrentReciter = useMemo(
    () => getSurahTracksForReciter(selectedReciter),
    [selectedReciter]
  );

  // Load persisted preferences ONCE on mount. This must NOT depend on
  // `selectedReciter`: re-running it re-applies the saved reciter from
  // localStorage, which fights the track-sync effect below (that forces the
  // Juz reciter) and produces an infinite setSelectedReciter render loop —
  // the reciter avatar was remounting thousands of times/sec on Juz tracks.
  useEffect(() => {
    setMounted(true);
    try {
      // Visual mode isn't restored: every open of the app starts in video mode.
      // The language picked before, else a first-visit guess (browser
      // language, time zone — refined by the place below; translations.ts).
      const savedLang = localStorage.getItem("huda-translation-lang");
      setTranslationLang(isTranslationLang(savedLang) ? savedLang : detectTranslationLang());
      // Reciter is NOT restored: every page load lands on Al-Fatihah with the
      // default reciter (Sheikh Mishari Al-afasi), Surah tab.
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Expose the debug play helper with the current reciter. Separate from the
  // mount-init effect so it can track `selectedReciter` without ever calling
  // setSelectedReciter (which would re-introduce the loop above).
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).__hudaPlaySurah = (surahNum: number) => {
      const tracks = getSurahTracksForReciter(selectedReciter);
      if (tracks[surahNum - 1]) {
        player.playBayan(tracks[surahNum - 1], tracks);
      }
    };
  }, [player, selectedReciter]);

  // Keep selectedReciter in sync if player.current changes to a Surah track with a different reciter, or a Quran Juz track
  useEffect(() => {
    if (player.current && (isSurahTrackId(player.current.id) || isQuranTrackId(player.current.id))) {
      const active = resolveActiveReciter(player.current);
      if (active.id !== selectedReciter.id) {
        setSelectedReciter(active);
        // Only persist Surah reciter preference (do not overwrite saved Surah reciter with Juz reciter)
        if (isSurahTrackId(player.current.id)) {
          try {
            localStorage.setItem(RECITER_STORAGE_KEY, active.id);
          } catch {
            /* ignore */
          }
        }
      }
    }
  }, [player.current, selectedReciter.id]);

  const [overrideBayan, setOverrideBayan] = useState<BayanWithRelations | null>(null);
  // Current ayah's text + translation while a Juz plays per-ayah (word-sync reciter).
  const [juzAyahVerse, setJuzAyahVerse] = useState<AyahVerse | null>(null);
  // Short-lived info notice (e.g. Audio Only reciter → plays from Ayah 1).
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(null);
  const showNotice = (text: string) => setNotice({ id: Date.now(), text });
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(t);
  }, [notice]);


  // Selected track (defaults to Surah 1: Al-Fatihah, or active player track / category track)
  const activeBayan = useMemo(() => {
    if (player.current) {
      return player.current;
    }
    if (overrideBayan) return overrideBayan;
    // Default initial landing: Surah 1 (Al-Fatihah) for active reciter
    return (
      surahTracksForCurrentReciter[0] ??
      SURAH_TRACKS[0] ??
      null
    );
  }, [overrideBayan, player, surahTracksForCurrentReciter]);

  // Resolve active Surah metadata if activeBayan is a Surah track
  const activeSurah = useMemo(() => {
    if (activeBayan && isSurahTrackId(activeBayan.id)) {
      return getSurahByTrackId(activeBayan.id) ?? null;
    }
    return null;
  }, [activeBayan]);

  // Resolve active Juz metadata if activeBayan is a Quran Juz track
  const activeJuz = useMemo(() => {
    if (activeBayan && isQuranTrackId(activeBayan.id)) {
      return getQuranJuzByTrackId(activeBayan.id) ?? null;
    }
    return null;
  }, [activeBayan]);

  const handleStepSurah = (dir: 1 | -1) => {
    if (!activeSurah) return;
    const num = ((activeSurah.number - 1 + dir + 114) % 114) + 1;
    const track = surahTracksForCurrentReciter[num - 1];
    if (track) player.playBayan(track, surahTracksForCurrentReciter);
  };

  const handleToggleVisualMode = () => {
    setVisualMode((prev) => (prev === "video" ? "image" : "video"));
  };

  // Once the location is known (TimeLocationWidget), a visitor who never
  // picked a language and whose browser named none of ours gets the language
  // of where they are — e.g. Kerala → Malayalam, even with an English browser.
  // Not saved: only a language picked by hand is remembered.
  useEffect(() => {
    const onPlace = (e: Event) => {
      const { countryCode, stateCode } = (e as CustomEvent<PlaceDetail>).detail ?? {};
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("huda-translation-lang");
      } catch {
        /* ignore */
      }
      if (isTranslationLang(saved) || browserTranslationLang()) return;
      const lang = placeTranslationLang(countryCode, stateCode);
      if (lang) setTranslationLang(lang);
    };
    window.addEventListener(PLACE_EVENT, onPlace);
    return () => window.removeEventListener(PLACE_EVENT, onPlace);
  }, []);

  const handleChooseTranslation = (lang: TranslationLang) => {
    setTranslationLang(lang);
    try {
      localStorage.setItem("huda-translation-lang", lang);
    } catch {
      /* ignore */
    }
  };

  const handleSeekToVerse = (targetTimeOrIndex: number) => {
    if (typeof targetTimeOrIndex === "number") {
      player.seek(targetTimeOrIndex);
    }
  };

  // Picking a Juz from the browser plays it ayah-by-ayah in the CURRENTLY-
  // selected reciter's voice — including Sheikh Maher — so the ayah progress
  // bar, word highlight and verse text work uniformly for every reciter. Only a
  // reciter with no per-ayah audio at all falls back to Maher's full-Juz file.
  const handleSelectJuz = (juzId: number, startIndex = 0) => {
    const juz = getQuranJuzByTrackId(`quran-juz-${juzId}`);
    if (!juz) return;
    const ayahUrls = buildJuzAyahUrls(juz.id, selectedReciter.id);
    if (ayahUrls && ayahUrls.length > 0) {
      const displayTrack = quranJuzToTrackForReciter(juz, selectedReciter, ayahUrls[0]);
      player.playAyahSequence(displayTrack, ayahUrls, startIndex, buildJuzPreludes(juz.id, selectedReciter.id));
      return;
    }
    // This reciter has no per-ayah recording to build the Juz from. Never
    // play another reciter's voice under their name: say so instead.
    showNotice(
      language === "ta"
        ? `${selectedReciter.displayName} — Juz ${juz.id} இந்த reciter-இன் குரலில் இல்லை. Juz-க்கு வேறு reciter-ஐத் தேர்ந்தெடுக்கவும் (எ.கா. Maher Al-Muaiqly).`
        : `Juz ${juz.id} isn't available in ${selectedReciter.displayName}'s voice. Choose another reciter for Juz (e.g. Maher Al-Muaiqly).`
    );
  };

  const handleSelectReciter = (reciter: QuranReciter) => {
    if (reciter.id === selectedReciter.id) return;

    const isPlayingJuz = Boolean(activeBayan && isQuranTrackId(activeBayan.id));

    // Rule: switching to a WORD SYNC reciter keeps the current ayah (their own
    // timings place it exactly). Switching to an AUDIO ONLY reciter restarts the
    // Surah / Juz from its first ayah — without timings its ayah positions are
    // only estimates, so resuming "the same ayah" would land somewhere else.
    const keepAyah = reciterHasWordTiming(reciter);
    if (!keepAyah) {
      const what = isPlayingJuz ? `Juz ${activeJuz?.id ?? ""}`.trim() : activeSurah?.name ?? "The Surah";
      showNotice(
        language === "ta"
          ? `${reciter.displayName} — Audio Only. ${what} முதல் ayah-விலிருந்து மீண்டும் ஒலிக்கும்.`
          : `${reciter.displayName} is Audio Only — ${what} will play again from the beginning.`
      );
    }

    try {
      localStorage.setItem(RECITER_STORAGE_KEY, reciter.id);
    } catch {
      /* ignore */
    }

    // ── Changing reciter while a JUZ is playing ──────────────────────────
    // Every reciter (including Maher) streams the Juz's EXACT ayahs in their own
    // voice, ayah-by-ayah from everyayah.com, so the ayah progress bar / word
    // highlight stay consistent. If a per-ayah sequence is already playing,
    // resume at the SAME ayah instead of restarting from the first one.
    if (isPlayingJuz && activeJuz) {
      const ayahUrls = buildJuzAyahUrls(activeJuz.id, reciter.id);
      if (ayahUrls && ayahUrls.length > 0) {
        const resumeIndex = keepAyah ? player.ayahSequence?.index ?? 0 : 0;
        const startUrl = ayahUrls[Math.min(resumeIndex, ayahUrls.length - 1)] ?? ayahUrls[0];
        const displayTrack = quranJuzToTrackForReciter(activeJuz, reciter, startUrl);
        setSelectedReciter(reciter);
        player.playAyahSequence(displayTrack, ayahUrls, resumeIndex, buildJuzPreludes(activeJuz.id, reciter.id));
        return;
      }
      // Reciter has no per-ayah audio → fall through to whole-surah playback
      // (in the NEW reciter's own voice) at the Surah the Juz was on — said so.
      showNotice(
        language === "ta"
          ? `${reciter.displayName} — Juz இல்லை; அதே சூரா முழுமையாக ஒலிக்கும்.`
          : `${reciter.displayName} has no Juz recording — playing the Surah instead.`
      );
    }

    // Which Surah to (re)start from in the new reciter's voice:
    //  - Playing a Juz (no per-ayah audio for this reciter) → the Juz's own
    //    starting Surah, instead of jumping to Al-Fatihah.
    //  - Playing a Surah → the same Surah (keep the listener's place).
    // Juz playing ayah-by-ayah but the new reciter has no per-ayah audio → keep
    // the place: continue the SURAH + ayah the Juz was on in full-surah audio.
    const juzPair =
      keepAyah && isPlayingJuz && activeJuz && player.ayahSequence
        ? getJuzAyahPairs(activeJuz.id)[player.ayahSequence.index] ?? null
        : null;
    const currentSurahNum = juzPair
      ? juzPair[0]
      : isPlayingJuz
      ? (activeJuz ? (JUZ_START_SURAH[activeJuz.id] ?? 1) : 1)
      : (activeSurah?.number ??
        (activeBayan && isSurahTrackId(activeBayan.id)
          ? parseInt(activeBayan.id.replace("quran-surah-", ""), 10)
          : 1));
    const targetSurah =
      QURAN_SURAHS.find((s) => s.number === currentSurahNum) ?? QURAN_SURAHS[0];
    const newTrack = quranSurahToTrack(targetSurah, reciter);
    const reciterSurahTracks = getSurahTracksForReciter(reciter);

    // Keep the listener on the SAME ayah. Each reciter paces differently, so the
    // old reciter's timestamp would land on a different ayah — resolve that
    // ayah's start in the NEW reciter's own timeline first, then start the new
    // track right there (skipping the Bismillah prelude). Juz → from the top.
    const resumeAyah = !keepAyah
      ? 0
      : juzPair
      ? juzPair[1]
      : !isPlayingJuz && !player.isPrelude ? currentVerse?.ayahNumber ?? 0 : 0;
    const wasPlaying = player.isPlaying;

    // Swap the displayed track only together with the audio — setting it before
    // the timings fetch resolves showed the new track at t=0 (ayah 1) briefly.
    const start = (startAt?: number | ((dur: number) => number)) => {
      const opts =
        typeof startAt === "function" || (startAt && startAt > 0) ? { startAt } : undefined;
      // Reciter, displayed track and audio switch together (one render).
      setSelectedReciter(reciter);
      setOverrideBayan(newTrack);
      if (wasPlaying) player.playBayan(newTrack, reciterSurahTracks, opts);
      else player.cueBayan(newTrack, reciterSurahTracks, opts);
    };

    if (resumeAyah <= 1) {
      start();
      return;
    }
    fetchSurahVerses(targetSurah.number, reciter.id)
      .then((newVerses) => {
        // +50ms: an ayah's start equals the previous ayah's end, so landing
        // exactly on it briefly resolved to the previous ayah.
        const ayahStartFor = (dur: number) => {
          const seg = getRecitationTimeline(targetSurah.number, newVerses, false, dur, reciter).find(
            (sg) => sg.type === "ayah" && sg.ayahNumber === resumeAyah
          );
          return seg ? seg.startTime + 0.05 : 0;
        };
        // Word-sync reciter: absolute timestamps from its own timings.
        start(ayahStartFor(SURAH_DURATIONS[targetSurah.number] ?? 0));
      })
      .catch(() => start());
  };

  // Keyboard shortcuts (home player):
  //   Space        play / pause
  //   ← / →        previous / next ayah
  //   Shift+← / →  previous / next Surah (or Juz)
  //   M            mute / unmute
  // Presses the player's own visible buttons, so every shortcut behaves exactly
  // like clicking. Works even while a player button has focus (after a click):
  // Space is intercepted there so the focused button isn't pressed as well.
  // Ignored while typing, inside dialogs, on the seek ring (it has its own
  // keys), and with Ctrl / Cmd / Alt held.
  const toggleMuteRef = useRef(player.toggleMute);
  toggleMuteRef.current = player.toggleMute;
  useEffect(() => {
    const target = (e: KeyboardEvent): string[] | "mute" | null => {
      if (e.key === " " || e.code === "Space") return e.shiftKey ? null : ["Play", "Pause"];
      if (e.key === "ArrowRight") return e.shiftKey ? ["Next Surah", "Next Juz", "Next"] : ["Next Ayah"];
      if (e.key === "ArrowLeft") return e.shiftKey ? ["Previous Surah", "Previous Juz", "Previous"] : ["Previous Ayah"];
      if ((e.key === "m" || e.key === "M") && !e.shiftKey) return "mute";
      return null;
    };
    const blocked = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return true;
      const t = e.target as HTMLElement | null;
      return Boolean(
        t && (t.isContentEditable || t.closest("input, textarea, select, [role=slider], [role=dialog]"))
      );
    };
    let swallowSpaceUp = false;
    const onKeyDown = (e: KeyboardEvent) => {
      const wanted = target(e);
      if (!wanted || blocked(e)) return;
      if (wanted === "mute") {
        e.preventDefault();
        if (!e.repeat) toggleMuteRef.current();
        return;
      }
      const btn = [...document.querySelectorAll<HTMLButtonElement>("[data-player-dock] button")].find(
        (b) => wanted.includes(b.getAttribute("aria-label") ?? "") && !b.closest('[aria-hidden="true"]') && !b.disabled
      );
      if (!btn) return;
      e.preventDefault();
      if (wanted[0] === "Play") {
        // A focused button would also fire on Space's keyup — swallow it.
        swallowSpaceUp = true;
        if (e.repeat) return;
      }
      btn.click();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (swallowSpaceUp && (e.key === " " || e.code === "Space")) {
        swallowSpaceUp = false;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
    };
  }, []);

  // Player container — the Comments / View count row aligns to the card's edges.
  const playerWrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const keyboardOpen = useVisibleArea(sceneRef);
  // View count / live / comments for the Surah or Juz on screen.
  const engagement = useQuranEngagement(quranContentOf(activeBayan?.id));
  // Phones and tablets (same breakpoint the action sheets use).
  const compactScreen = useIsMobile();
  // Compact player → the frame's bottom strip (name + Ayat steps) opens.
  const [playerCollapsed, setPlayerCollapsed] = useState(false);
  const [playerFooter, setPlayerFooter] = useState<HTMLDivElement | null>(null);
  const isJuz = Boolean(activeBayan && isQuranTrackId(activeBayan.id));
  // Voice Sync QA HUD is a developer tool — hidden for end users. Open the
  // app with ?qa=1 in the URL to show it.
  const [showQaHud, setShowQaHud] = useState(false);
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("qa") === "1") setShowQaHud(true);
    } catch {
      /* ignore */
    }
  }, []);

  // Load the current ayah's text + translation while a Juz plays per-ayah, so
  // the center display shows the Arabic + meaning (word-sync reciters only —
  // the CenterVerseDisplay itself is gated to reciterWordSync).
  const ayahSeqIndex = player.ayahSequence?.index ?? -1;
  useEffect(() => {
    if (ayahSeqIndex < 0 || !activeJuz) {
      setJuzAyahVerse(null);
      return;
    }
    const pair = getJuzAyahPairs(activeJuz.id)[ayahSeqIndex];
    if (!pair) {
      setJuzAyahVerse(null);
      return;
    }
    const [surah, ayah] = pair;
    let cancelled = false;
    fetchSurahVerses(surah, selectedReciter.id)
      .then((verses) => {
        if (!cancelled) setJuzAyahVerse(verses.find((v) => v.ayahNumber === ayah) ?? null);
      })
      .catch(() => {
        if (!cancelled) setJuzAyahVerse(null);
      });
    return () => {
      cancelled = true;
    };
  }, [ayahSeqIndex, activeJuz, selectedReciter.id]);

  // Juz clock: a per-ayah Juz has no single audio file, so estimate each ayah's
  // length (word-sync reciters: the dataset's ayah window, where everyayah cuts
  // the same recording; others: the verse's default timestamps) and sum them.
  const hasAyahSeq = Boolean(player.ayahSequence);
  const [juzAyahDurations, setJuzAyahDurations] = useState<number[] | null>(null);
  useEffect(() => {
    if (!isJuz || !activeJuz || !hasAyahSeq) {
      setJuzAyahDurations(null);
      return;
    }
    const pairs = getJuzAyahPairs(activeJuz.id);
    const surahs = [...new Set(pairs.map(([sn]) => sn))];
    let cancelled = false;
    Promise.all(surahs.map((sn) => fetchSurahVerses(sn, selectedReciter.id).then((v) => [sn, v] as const)))
      .then((entries) => {
        if (cancelled) return;
        const bySurah = new Map(entries);
        setJuzAyahDurations(
          pairs.map(([sn, an]) => {
            const v = bySurah.get(sn)?.find((x) => x.ayahNumber === an);
            // The everyayah clip is cut at the dataset's ayah window.
            const win = v?.datasetWindow;
            if (win && win.to > win.from) return win.to - win.from;
            const d = (v?.timestampTo ?? 0) - (v?.timestampFrom ?? 0);
            return d > 0 ? d : 6;
          })
        );
      })
      .catch(() => !cancelled && setJuzAyahDurations(null));
    return () => {
      cancelled = true;
    };
  }, [isJuz, activeJuz, hasAyahSeq, selectedReciter.id]);

  // Self-correcting: record each ayah's REAL file length as it plays and scale
  // the not-yet-played estimates by the observed real/estimate ratio (the word
  // windows omit each file's lead/trail silence, so raw estimates run short).
  const [juzMeasured, setJuzMeasured] = useState<Record<number, number>>({});
  useEffect(() => setJuzMeasured({}), [juzAyahDurations]);
  const seqIdx = player.ayahSequence?.index ?? -1;
  useEffect(() => {
    if (seqIdx < 0 || !(player.duration > 0) || player.isLoading || player.ayahSequence?.preType) return;
    setJuzMeasured((m) => (m[seqIdx] === player.duration ? m : { ...m, [seqIdx]: player.duration }));
  }, [seqIdx, player.duration, player.isLoading, player.ayahSequence?.preType]);

  const juzTiming = useMemo(() => {
    const seq = player.ayahSequence;
    if (!juzAyahDurations || !seq) return null;
    let realSum = 0;
    let estSum = 0;
    for (const [k, v] of Object.entries(juzMeasured)) {
      realSum += v;
      estSum += juzAyahDurations[Number(k)] ?? 0;
    }
    const ratio = estSum > 0 ? realSum / estSum : 1;
    const durOf = (i: number) => juzMeasured[i] ?? (juzAyahDurations[i] ?? 0) * ratio;
    let total = 0;
    let before = 0;
    for (let i = 0; i < juzAyahDurations.length; i++) {
      const d = durOf(i);
      total += d;
      if (i < seq.index) before += d;
    }
    const inAyah = seq.preType ? 0 : Math.min(player.currentTime, durOf(seq.index));
    return { elapsed: before + inAyah, total };
  }, [juzAyahDurations, juzMeasured, player.ayahSequence, player.currentTime]);

  // While a Juz prelude clip plays (Isti'adhah / Bismillah before an ayah),
  // show that text instead of the upcoming ayah.
  const juzPreType = isJuz ? player.ayahSequence?.preType ?? null : null;
  const juzPreSegment = useMemo<RecitationSegment | null>(() => {
    if (!juzPreType) return null;
    const c = juzPreType === "istiadhah" ? CANONICAL_ISTIADHAH : CANONICAL_BISMILLAH;
    return {
      id: `juz-prelude-${juzPreType}`,
      type: juzPreType,
      startTime: 0,
      endTime: 0,
      textArabic: c.textArabic,
      textEnglish: c.textEnglish,
      textTamil: c.textTamil,
      words: [],
    };
  }, [juzPreType]);

  // Word-by-word highlight for the per-ayah Juz: the everyayah clip is the
  // reciter's recording cut at the ayah's QDC voice window, so clip time maps
  // straight onto the ayah's raw word segments (repeats included) — see
  // getAyahClipWordSync. A clip of another length (another take) gets no word
  // highlight rather than a stretched, wrong one.
  const juzWordSync = useMemo(() => {
    if (!isJuz || !juzAyahVerse || !reciterHasWordTiming(selectedReciter) || player.ayahSequence?.preType) {
      return { hasWordTiming: false, activeWordIndex: -1 };
    }
    return getAyahClipWordSync(juzAyahVerse, player.currentTime, player.isLoading ? 0 : player.duration);
  }, [isJuz, juzAyahVerse, selectedReciter, player.currentTime, player.duration, player.isLoading, player.ayahSequence?.preType]);

  // A Surah whose streamed recording doesn't match this reciter's word timings
  // plays audio-only: say so once, so a missing verse text isn't a mystery.
  const syncGapKey = !isJuz && activeSurah && wordSyncUnavailableReason(selectedReciter, activeSurah.number)
    ? `${selectedReciter.id}:${activeSurah.number}`
    : null;
  const lastSyncGapRef = useRef<string | null>(null);
  useEffect(() => {
    if (!syncGapKey || !player.isPlaying || lastSyncGapRef.current === syncGapKey) return;
    lastSyncGapRef.current = syncGapKey;
    showNotice(
      language === "ta"
        ? `${selectedReciter.displayName} — இந்த சூராவின் recording-க்கு Word-Sync இல்லை; ஒலி மட்டும்.`
        : `Word Sync isn't available for this Surah in ${selectedReciter.displayName}'s recording — audio only.`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncGapKey, player.isPlaying]);

  const {
    verses,
    segments,
    activeIndex,
    activeSegmentIndex,
    currentSegment,
    currentVerse,
    voiceProgress,
    activeWord,
    activeWordIndex,
    hasWordTiming,
    timingMode,
    timingSource,
    currentVideo,
    showTranslation,
    setShowTranslation,
    handlePrevVerse,
    handleNextVerse,
    jumpToVerse,
  } = useQuranVerseSync({
    surahNumber: isJuz ? null : (activeSurah?.number ?? null),
    categorySlug: activeBayan?.category?.slug || "quran-recitation",
    currentTime: player.currentTime,
    duration: player.duration,
    isPlaying: player.isPlaying,
    onSeekToVerse: handleSeekToVerse,
    isJuz,
    reciter: selectedReciter,
    isPrelude: player.isPrelude,
    preludeType: player.preludeType,
    preludeCurrentTime: player.preludeCurrentTime,
    preludeDuration: player.preludeDuration,
  });

  // Tap a word → jump the recitation to its start. Surah timings share the
  // player clock; a per-ayah Juz file is ayah-relative and scaled (as above).
  const handleSeekToWord = (_idx: number, word: { startTime: number }) => {
    if (player.isPrelude) return;
    if (!isJuz) {
      // A first word can start a few ms before the ayah window the verse sync
      // uses (e.g. 1:6 word 1 at 27.585s, ayah from 27.66s); seeking there would
      // show the previous ayah, so land just inside the current ayah.
      const ayahStart = currentSegment?.startTime ?? currentVerse?.timestampFrom ?? 0;
      player.seek(Math.max(word.startTime, ayahStart + 0.02));
      return;
    }
    if (juzPreSegment) return;
    const at = ayahClipTimeOf(juzAyahVerse, word.startTime, player.duration);
    if (at !== null) player.seek(at);
  };

  // Tajweed colours: off by default; remembered per browser — except on
  // WebKit (Safari / iOS), where every visit starts off so a device that
  // can't draw the page fonts reloads into the text view (see isWebKit).
  const [showTajweed, setShowTajweed] = useState(false);
  useEffect(() => {
    // WebKit: page-font glyphs without text-shadows (see globals.css).
    if (isWebKit()) document.documentElement.dataset.wkGlyphLite = "";
    if (isWebKit()) return;
    try {
      if (localStorage.getItem("huda:tajweed") === "1") setShowTajweed(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  // Reading mode's text size (× default), remembered per browser.
  const [readerScale, setReaderScale] = useState(1);
  useEffect(() => {
    try {
      const v = Number(localStorage.getItem("huda:reader-scale"));
      if (READER_SCALES.includes(v)) setReaderScale(v);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const handleReaderScale = (v: number) => {
    setReaderScale(v);
    try {
      localStorage.setItem("huda:reader-scale", String(v));
    } catch {
      /* storage unavailable */
    }
  };
  const handleToggleTajweed = () => {
    setShowTajweed((prev) => {
      try {
        if (!isWebKit()) localStorage.setItem("huda:tajweed", prev ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !prev;
    });
  };

  // Reading mode (header 📖): the playing Surah's / Juz's full text as Mushaf
  // pages on the scene instead of the single ayah, the player shrunk to its
  // compact pill.
  const [readingMode, setReadingMode] = useState(false);
  const readingJuz = readingMode && isJuz ? activeJuz ?? null : null;
  const readingSurah = readingMode && !isJuz ? activeSurah?.number ?? null : null;
  const readingActive = readingSurah !== null || readingJuz !== null;
  const readingKey = readingJuz ? `juz-${readingJuz.id}` : readingSurah !== null ? `surah-${readingSurah}` : null;

  // Audio Only playback (no word sync for this reciter × Surah / Juz) shows no
  // verse on the scene, so open the full text in reading mode by default —
  // once per reciter × track, so turning it off sticks until the track changes.
  // Closed again on its own when the playback gains word sync.
  const audioOnlyKey = !hasPlayed
    ? null
    : isJuz
    ? activeJuz && !(reciterHasWordTiming(selectedReciter) && player.ayahSequence)
      ? `${selectedReciter.id}:juz-${activeJuz.id}`
      : null
    : activeSurah && !reciterHasWordTimingFor(selectedReciter, activeSurah.number)
    ? `${selectedReciter.id}:surah-${activeSurah.number}`
    : null;
  const audioOnlyRef = useRef<{ key: string | null; auto: boolean }>({ key: null, auto: false });
  useEffect(() => {
    const prev = audioOnlyRef.current;
    if (audioOnlyKey === prev.key) return;
    if (audioOnlyKey) {
      setReadingMode(true);
      audioOnlyRef.current = { key: audioOnlyKey, auto: true };
    } else {
      if (prev.auto) setReadingMode(false);
      audioOnlyRef.current = { key: null, auto: false };
    }
  }, [audioOnlyKey]);
  // A Juz's ayahs, and the Surah-by-Surah ranges the reader shows.
  const juzPairs = useMemo(() => (readingJuz ? getJuzAyahPairs(readingJuz.id) : []), [readingJuz]);
  const readingRanges = useMemo<ReadingRange[]>(() => {
    if (readingSurah !== null) {
      const n = QURAN_SURAHS.find((x) => x.number === readingSurah)?.verses ?? 1;
      return [{ surah: readingSurah, from: 1, to: n }];
    }
    const out: ReadingRange[] = [];
    for (const [surah, ayah] of juzPairs) {
      const last = out[out.length - 1];
      if (last?.surah === surah) last.to = ayah;
      else out.push({ surah, from: ayah, to: ayah });
    }
    return out;
  }, [readingSurah, juzPairs]);
  // The recited ayah. Juz: only a per-ayah Juz knows it (Maher's full-Juz file doesn't).
  // Audio Only Surah: no timings to place the ayah, so none is lit.
  const readingAyah = readingSurah !== null
    ? player.isPrelude || !currentVerse || audioOnlyKey ? null : { surah: readingSurah, ayah: currentVerse.ayahNumber }
    : player.ayahSequence && !player.ayahSequence.preType && juzPairs[player.ayahSequence.index]
    ? { surah: juzPairs[player.ayahSequence.index][0], ayah: juzPairs[player.ayahSequence.index][1] }
    : null;
  const readingWordIndex = readingSurah !== null
    ? hasWordTiming && !player.isPrelude ? activeWordIndex : -1
    : !juzPreSegment ? juzWordSync.activeWordIndex : -1;
  const juzIndexOf = (surah: number, ayah: number) => juzPairs.findIndex(([s, a]) => s === surah && a === ayah);

  const handleReadSeek = (ayahNumber: number) => {
    const idx = segments.findIndex((sg) => sg.type === "ayah" && sg.ayahNumber === ayahNumber);
    if (idx >= 0) jumpToVerse(idx);
  };
  // Tap an ayah / word in the reader. Surah: seek (a word lands inside its
  // ayah — a first word can start a few ms before the ayah window, see
  // handleSeekToWord; a tap during the prelude ends it, player.seek does).
  // Per-ayah Juz: jump to that ayah's file. Paused (reading in one's own
  // voice): a tapped word starts the recitation.
  const handleReaderSeekAyah = (surah: number, ayah: number) => {
    if (readingSurah !== null) handleReadSeek(ayah);
    else if (player.ayahSequence) {
      const i = juzIndexOf(surah, ayah);
      if (i >= 0) player.jumpToAyah(i);
    }
  };
  const handleReaderSeekWord = (surah: number, ayah: number, startTime: number) => {
    if (readingSurah !== null) {
      const seg = segments.find((sg) => sg.type === "ayah" && sg.ayahNumber === ayah);
      player.seek(Math.max(startTime, (seg?.startTime ?? 0) + 0.02));
    } else {
      handleReaderSeekAyah(surah, ayah);
    }
    if (!player.isPlaying) player.resume();
  };

  // Reading mode's « Page N »: the page on screen. « » and the page picker
  // start the recitation at the first ayah beginning on a page — for a Surah,
  // in another Surah when the page belongs to one; a Juz keeps to its own
  // pages (and without per-ayah audio only scrolls there).
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  // Player's Surah / Juz name → open the content browser at it.
  const [browserOpenRequest, setBrowserOpenRequest] = useState(0);
  // Every open of the app, the content browser slides in so a first-time
  // visitor sees there's a Surah / Juz list — last in the onboarding sequence
  // (splash → location → install guide, lib/onboarding), a moment after the
  // install guide closes or is skipped; not if playback has started by then.
  const hasPlayedRef = useRef(hasPlayed);
  hasPlayedRef.current = hasPlayed;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    Promise.all([afterSplash(), afterStage("install")]).then(() => {
      if (cancelled) return;
      timer = setTimeout(() => {
        if (!hasPlayedRef.current) setBrowserOpenRequest((n) => n + 1);
      }, 600);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
  // The page on screen follows the reader's scrolling (ReadingView reports it);
  // before the first report, the recited ayah's page.
  const [visiblePage, setVisiblePage] = useState<number | null>(null);
  useEffect(() => setVisiblePage(null), [readingKey]);
  const [scrollToPage, setScrollToPage] = useState<{ page: number; n: number; at: number } | null>(null);
  // A page asked for (« » / the picker) is the page at once — not once the
  // view has scrolled there and reported it — and holds over scroll reports
  // until the view reports that page, or the reader scrolls by hand. Valid in
  // the Surah / Juz it was asked from and the one it opens — and, for quick
  // steps over a Surah's edge, those the steps before it passed through (the
  // player catches up with them a moment later).
  const [pageRequest, setPageRequest] = useState<{ page: number; keys: (string | null)[] } | null>(null);
  const requestPage = (page: number, opens: string | null) =>
    setPageRequest((r) => ({
      page,
      keys: [...new Set([...(r && r.keys.includes(readingKey) ? r.keys : []), readingKey, opens])],
    }));
  // A view fading out (AnimatePresence) still reports its own pages: only the
  // current Surah / Juz's view counts.
  const readingKeyRef = useRef(readingKey);
  readingKeyRef.current = readingKey;
  const handleVisiblePageChange = (viewKey: string | null, page: number, byHand: boolean) => {
    if (viewKey !== readingKeyRef.current) return;
    setVisiblePage(page);
    setPageRequest((r) => (r && (byHand || r.page === page) ? null : r));
  };
  const juzPageRange: [number, number] | null = juzPairs.length
    ? [mushafPageOf(juzPairs[0][0], juzPairs[0][1]), mushafPageOf(...juzPairs[juzPairs.length - 1])]
    : null;
  const readingPage = !readingActive
    ? 1
    : pageRequest && pageRequest.keys.includes(readingKey)
    ? pageRequest.page
    : visiblePage ??
      (readingAyah
        ? mushafPageOf(readingAyah.surah, readingAyah.ayah)
        : readingRanges[0]
        ? mushafPageOf(readingRanges[0].surah, readingRanges[0].from)
        : 1);
  // Bookmark: ONE ayah marked by hand (the player's 🔖+), as a Mushaf's
  // ribbon — a new one replaces it. Surah or Juz by what's playing; reading
  // mode's « Bookmark » pill goes back to it.
  // Reading mode: tapping places one at the recited ayah while playing, else
  // at the first ayah on screen; with bookmarks on screen, tapping takes them
  // out. Otherwise it marks / unmarks the ayah being recited.
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  useEffect(() => setBookmarks(loadBookmarks().slice(0, 1)), []);
  const updateBookmarks = (next: Bookmark[]) => {
    setBookmarks(next);
    saveBookmarks(next);
  };
  const [visibleAyah, setVisibleAyah] = useState<{ surah: number; ayah: number } | null>(null);
  useEffect(() => setVisibleAyah(null), [readingKey]);
  const inReading = (b: Bookmark) =>
    readingJuz ? b.kind === "juz" && b.juz === readingJuz.id : b.kind === "surah" && b.surah === readingSurah;
  const readingBookmarks = readingActive ? bookmarks.filter(inReading) : [];
  // Bookmarks whose mark is on screen: the 🔖 shows filled and takes them out.
  const [bookmarksInView, setBookmarksInView] = useState<string[]>([]);
  const pageBookmarks = readingBookmarks.filter((b) => bookmarksInView.includes(`${b.surah}:${b.ayah}`));
  useEffect(() => setBookmarksInView([]), [readingKey]);
  // The ayah on air outside reading mode (Juz: only a per-ayah Juz knows it).
  const activeJuzPairs = useMemo(() => (activeJuz ? getJuzAyahPairs(activeJuz.id) : []), [activeJuz]);
  const onAirAyah: { surah: number; ayah: number } | null = isJuz
    ? player.ayahSequence && activeJuzPairs[player.ayahSequence.index]
      ? { surah: activeJuzPairs[player.ayahSequence.index][0], ayah: activeJuzPairs[player.ayahSequence.index][1] }
      : activeJuzPairs[0]
      ? { surah: activeJuzPairs[0][0], ayah: activeJuzPairs[0][1] }
      : null
    : activeSurah
    ? { surah: activeSurah.number, ayah: currentVerse?.ayahNumber || 1 }
    : null;
  const bookmarkFor = (at: { surah: number; ayah: number }): Bookmark =>
    isJuz && activeJuz
      ? { kind: "juz", juz: activeJuz.id, ...at, at: Date.now() }
      : { kind: "surah", ...at, at: Date.now() };
  const onAirBookmarked = Boolean(onAirAyah && bookmarks.some((b) => bookmarkId(b) === bookmarkId(bookmarkFor(onAirAyah))));
  const handleToggleBookmark = () => {
    if (!readingActive) {
      if (!onAirAyah) return;
      const id = bookmarkId(bookmarkFor(onAirAyah));
      updateBookmarks(
        onAirBookmarked ? bookmarks.filter((b) => bookmarkId(b) !== id) : [bookmarkFor(onAirAyah)]
      );
      return;
    }
    if (pageBookmarks.length) {
      const drop = new Set(pageBookmarks.map(bookmarkId));
      updateBookmarks(bookmarks.filter((b) => !drop.has(bookmarkId(b))));
      return;
    }
    const at = player.isPlaying && readingAyah ? readingAyah : visibleAyah ?? readingAyah;
    if (!at) return;
    const b: Bookmark = readingJuz
      ? { kind: "juz", juz: readingJuz.id, ...at, at: Date.now() }
      : { kind: "surah", ...at, at: Date.now() };
    updateBookmarks([b]);
  };
  const bookmarkOn = readingActive ? pageBookmarks.length > 0 : onAirBookmarked;
  const mainBookmark = bookmarks[0] ?? null;
  // Open a bookmark: reading mode, reciting from its ayah.
  const handleOpenBookmark = (b: Bookmark) => {
    setReadingMode(true);
    if (b.kind === "surah") {
      openSurahAt(b.surah, b.ayah);
      return;
    }
    const i = Math.max(0, getJuzAyahPairs(b.juz!).findIndex(([s, a]) => s === b.surah && a === b.ayah));
    if (activeJuz?.id === b.juz && player.ayahSequence) player.jumpToAyah(i);
    else handleSelectJuz(b.juz!, i);
  };

  const readingFirstPage = juzPageRange?.[0] ?? 1;
  const readingLastPage = juzPageRange?.[1] ?? MUSHAF_PAGE_COUNT;
  // The page the next « » steps from: set as a step is made, so taps
  // quicker than a render (or the scroll report) don't step from a stale page.
  const pageNowRef = useRef(readingPage);
  pageNowRef.current = readingPage;
  const handleGoToPage = (page: number) => {
    const p = Math.min(readingLastPage, Math.max(readingFirstPage, page));
    pageNowRef.current = p;
    if (readingJuz) {
      const [ps, pa] = MUSHAF_PAGE_STARTS[p - 1];
      // First Juz ayah on or after the page's start.
      const i = juzPairs.findIndex(([s, a]) => s > ps || (s === ps && a >= pa));
      if (player.ayahSequence && i >= 0) player.jumpToAyah(i);
      requestPage(p, readingKey);
      setScrollToPage((prev) => ({ page: p, n: (prev?.n ?? 0) + 1, at: Date.now() }));
      return;
    }
    const [surahNum, ayah] = MUSHAF_PAGE_STARTS[p - 1];
    // A Surah the reciter doesn't have isn't opened (the player says so): the
    // page stays where it is.
    if (surahNum !== activeSurah?.number && !reciterHasSurah(selectedReciter, surahNum)) {
      pageNowRef.current = readingPage;
      openSurahAt(surahNum, ayah);
      return;
    }
    requestPage(p, `surah-${surahNum}`);
    openSurahAt(surahNum, ayah);
    setScrollToPage((prev) => ({ page: p, n: (prev?.n ?? 0) + 1, at: Date.now() }));
  };
  // « »: one page on from the latest page; nothing past the first / last.
  const handleStepPage = (d: -1 | 1) => {
    const p = pageNowRef.current + d;
    if (p < readingFirstPage || p > readingLastPage) return;
    handleGoToPage(p);
  };
  // Only the latest call starts its Surah: a slower verse fetch of an earlier
  // one (quick « » over a Surah's edge) must not start after it.
  const openSurahSeqRef = useRef(0);
  // Recite a Surah from an ayah: a seek within the playing Surah, else that
  // Surah's track cued (or played, when playing) at the ayah.
  const openSurahAt = (surahNum: number, ayah: number) => {
    const seq = ++openSurahSeqRef.current;
    if (surahNum === activeSurah?.number) {
      handleReadSeek(ayah);
      return;
    }
    const track = surahTracksForCurrentReciter[surahNum - 1];
    if (!track) return;
    const wasPlaying = player.isPlaying;
    const start = (startAt?: (dur: number) => number) => {
      if (seq !== openSurahSeqRef.current) return;
      const opts = startAt ? { startAt } : undefined;
      if (wasPlaying) player.playBayan(track, surahTracksForCurrentReciter, opts);
      else player.cueBayan(track, surahTracksForCurrentReciter, opts);
    };
    if (ayah <= 1) {
      start();
      return;
    }
    // Resolve the ayah's start in this reciter's own timeline (as a reciter
    // switch does); +50ms lands inside it, not on the previous ayah's end.
    fetchSurahVerses(surahNum, selectedReciter.id)
      .then((v) =>
        start((dur) => {
          const seg = getRecitationTimeline(surahNum, v, false, dur, selectedReciter).find(
            (sg) => sg.type === "ayah" && sg.ayahNumber === ayah
          );
          return seg ? seg.startTime + 0.05 : 0;
        })
      )
      .catch(() => start());
  };

  // Ayah meaning (translation) is OFF on every page load; the toggle only
  // applies to the current session.
  const handleToggleMeaning = () => {
    setShowTranslation((prev) => !prev);
  };

  const installGuideButton = (
    // Very narrow screens: left out so the player's strips fit.
    <InstallGuideButton className="max-[369px]:hidden relative grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-full text-base sm:text-lg text-sand-200 transition-opacity hover:opacity-80 active:opacity-60 before:absolute before:-inset-2 before:content-['']" />
  );

  return (
    <div
      ref={sceneRef}
      // 99% alpha: iOS 26 Safari clips opaque fixed layers short of its bars.
      // Black, not slate: Safari tints its bars with this colour. bleed-clear:
      // transparent in the iOS 26 Safari tab (see .safari-bleed in globals.css).
      className="bleed-clear fixed inset-0 z-10 overflow-hidden bg-black/[0.99] text-sand-50 select-none"
    >
      {/* Edge-to-Edge Dynamic Scene Background (Category or Verse-Aware Surah Video) */}
      <ImmersiveBackground
        categorySlug={activeBayan?.category?.slug || "quran-recitation"}
        activeSurahNumber={activeSurah?.number ?? null}
        activeJuzNumber={activeJuz?.id ?? null}
        ayahNumber={currentVerse?.ayahNumber ?? null}
        videoSrc={currentVideo}
        // Always the MAIN recitation clock: the prelude clip's own 0→5s clock
        // read as surah progress swept through every chapter video (flicker).
        currentTime={player.currentTime}
        duration={player.duration}
        isPlaying={player.isPlaying}
        visualMode={visualMode}
      />

      {/* Scrim over every background so the verse reads clearly on any scene,
          bright ones too — the Tajweed glyph words carry no text shadow on
          WebKit. Darker towards the edges, where the header and player sit. */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35),rgba(0,0,0,0.55))]"
        aria-hidden="true"
      />

      {/* Center Quran Verses Stage (Pure Arabic Calligraphy + English/Tamil Translation).
          Phones / tablets: the open comments panel (and the keyboard) take the
          room the verse needs, so the verse fades out instead of spilling over
          the list and under the header. Kept mounted so its fit stays current. */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-300 ${
          readingActive || (compactScreen && engagement.composerOpen) ? "invisible opacity-0" : "opacity-100"
        }`}
        aria-hidden={readingActive || (compactScreen && engagement.composerOpen) ? true : undefined}
      >
      <CenterVerseDisplay
        // Remount on leaving reading mode: on WebKit the reader unloads the
        // page fonts it used, which this view reloads on mount.
        key={readingActive ? "reading" : "scene"}
        currentVerse={isJuz ? (juzPreSegment ? null : juzAyahVerse) : currentVerse}
        currentSegment={isJuz ? juzPreSegment : currentSegment}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        isPlaying={player.isPlaying}
        language={language}
        translationLang={translationLang}
        showTranslation={showTranslation}
        activeWordIndex={isJuz ? juzWordSync.activeWordIndex : activeWordIndex}
        hasWordTiming={isJuz ? !juzPreSegment && juzWordSync.hasWordTiming : hasWordTiming}
        reciterWordSync={
          isJuz ? reciterHasWordTiming(selectedReciter) : reciterHasWordTimingFor(selectedReciter, activeSurah?.number)
        }
        isJuz={isJuz}
        showGreeting={!hasPlayed}
        onSeekToWord={handleSeekToWord}
        tajweed={showTajweed}
      />
      </div>

      {/* Floating Top Header with Top-Right Hamburger Menu & Mode Toggle */}
      <ImmersiveHeader
        visualMode={visualMode}
        // The image/video toggle lives in the player strip whenever it shows.
        onToggleVisualMode={engagement.content ? undefined : handleToggleVisualMode}
        language={language}
        translationLang={translationLang}
        onChooseTranslation={handleChooseTranslation}
        showMeaning={showTranslation}
        // Reading mode is Arabic only: no translation to choose there.
        onToggleMeaning={readingActive ? undefined : handleToggleMeaning}
        // …and gets a text-size control in its place.
        textSize={readingActive ? { value: readerScale, onChange: handleReaderScale } : undefined}
        showTajweed={showTajweed}
        onToggleTajweed={handleToggleTajweed}
        selectedReciter={selectedReciter}
        onSelectReciter={handleSelectReciter}
        isQuranActive={Boolean(activeSurah || (activeBayan && isQuranTrackId(activeBayan.id)))}
        isJuz={isJuz}
        qaHud={
          showQaHud && !isJuz && (
            <SyncQADebugHUD
              currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
              activeSurah={activeSurah}
              currentVerse={currentVerse}
              currentSegment={currentSegment}
              activeVerseIndex={activeIndex}
              totalVerses={verses.length}
              voiceProgress={voiceProgress}
              activeWord={activeWord}
              selectedReciter={selectedReciter}
              timingMode={timingMode}
              timingSource={timingSource}
            />
          )
        }
      >
        {/* Reading mode toggle: the whole Surah's / Juz's text */}
        {((activeSurah && !isJuz) || (isJuz && activeJuz)) && (
          <button
            type="button"
            onClick={() => setReadingMode((on) => !on)}
            aria-pressed={readingMode}
            aria-label={readingMode ? "Exit reading mode" : "Reading mode"}
            data-tooltip={readingMode ? "Exit reading mode" : "Reading mode"}
            // On: the filled book alone — no coloured ring (nor the focus ring
            // a tap left on it).
            className="pointer-events-auto grid h-10 w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 text-sand-100 shadow-lg hover:text-white hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer focus-visible:outline-none"
          >
            {readingMode ? <BookOpenFilledIcon className="h-5 w-5" /> : <BookOpenIcon className="h-5 w-5" />}
          </button>
        )}
        <TopicPickerModal
          openRequest={browserOpenRequest}
          surahTracks={surahTracksForCurrentReciter}
          onSelectJuz={handleSelectJuz}
        />
      </ImmersiveHeader>

      {/* Typing a comment: dim the verse so the comments read cleanly over it */}
      {keyboardOpen && engagement.composerOpen && (
        <div className="absolute inset-0 z-[35] bg-black/50 pointer-events-none" aria-hidden="true" />
      )}

      {/* Reading mode: the whole Surah over the scene, recited ayah lit */}
      <AnimatePresence>
        {readingActive && readingKey && !(compactScreen && engagement.composerOpen) && (
          <ReadingView
            key={readingKey}
            ranges={readingRanges}
            label={readingJuz ? `Juz ${readingJuz.id}` : activeSurah?.name ?? ""}
            reciterId={selectedReciter.id}
            active={readingAyah}
            onSeekAyah={handleReaderSeekAyah}
            tajweed={showTajweed}
            activeWordIndex={readingWordIndex}
            onSeekWord={handleReaderSeekWord}
            onVisiblePageChange={(page, byHand) => handleVisiblePageChange(readingKey, page, byHand)}
            scrollToPage={scrollToPage}
            textScale={readerScale}
            playing={player.isPlaying}
            onOpenAyah={openSurahAt}
            mark={bookmarks[0] ?? null}
            onOpenMark={() => bookmarks[0] && handleOpenBookmark(bookmarks[0])}
            bookmarks={readingBookmarks}
            onVisibleAyahChange={setVisibleAyah}
            onBookmarksInViewChange={setBookmarksInView}
          />
        )}
      </AnimatePresence>

      {/* Main view: « Bookmark » back to the bookmarked ayah, in reading mode —
          only while the recitation is stopped (a clean scene while it plays
          or buffers to play)
          and when the ayah on air isn't the bookmark itself. */}
      <AnimatePresence>
        {!readingActive && mainBookmark && !player.isPlaying && !player.isLoading && !onAirBookmarked && !engagement.composerOpen && (
          <motion.div
            key="main-bookmark"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),var(--vv-top,0px))+5.75rem)] z-30 flex justify-center px-4"
          >
            <button
              type="button"
              onClick={() => {
                haptic();
                handleOpenBookmark(mainBookmark);
              }}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-amber-300/40 bg-black/45 backdrop-blur-md py-1.5 px-3.5 text-xs sm:text-sm font-medium text-sand-50 shadow-lg hover:text-white cursor-pointer"
            >
              <BookmarkIcon filled className="text-amber-300" />
              <span>
                Bookmark · {QURAN_SURAHS.find((x) => x.number === mainBookmark.surah)?.name ?? `Surah ${mainBookmark.surah}`}{" "}
                {mainBookmark.surah}:{mainBookmark.ayah}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Floating Player */}
      <div
        data-player-dock
        className="absolute bottom-[calc(var(--vv-bottom,0px)+1rem)] sm:bottom-[calc(var(--vv-bottom,0px)+1.5rem)] inset-x-0 z-40 flex flex-col items-center px-4 pointer-events-none"
      >
        {notice && !keyboardOpen && (
          <div
            key={notice.id}
            role="status"
            aria-live="polite"
            className="mb-3 max-w-[680px] w-full sm:w-auto flex items-center gap-2.5 rounded-2xl bg-black/[0.08] backdrop-blur-[14px] border border-amber-300/30 px-4 py-2.5 text-xs sm:text-sm text-sand-100 shadow-[0_12px_30px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <svg className="h-4 w-4 shrink-0 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            <span className={language === "ta" ? "font-tamil" : ""}>{notice.text}</span>
          </div>
        )}
        {/* Live comments + composer (the Live / view count strip frames the player below) */}
        <EngagementOverlay e={engagement} lang={language} />
        {/* Typing a comment: the keyboard leaves no room, so only the comments
            and the box sit above it; the player returns when it closes. */}
        <div className={keyboardOpen && engagement.composerOpen ? "hidden" : "contents"}>
        <PlayerStatsFrame
          e={engagement}
          lang={language}
          playerRef={playerWrapRef}
          footerRef={setPlayerFooter}
          footerOpen={playerCollapsed}
          leading={
            <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleVisualMode}
              data-tooltip={visualMode === "video" ? "Image mode" : "Video mode"}
              aria-label={visualMode === "video" ? "Switch to Image Mode" : "Switch to Video Mode"}
              className="relative grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-sand-200 transition-opacity hover:opacity-80 active:opacity-60 before:absolute before:-inset-2 before:content-['']"
            >
              {visualMode === "video" ? (
                <VideoCameraIcon className="text-base sm:text-lg" />
              ) : (
                <ImageIcon className="text-base sm:text-lg" />
              )}
            </button>
            {/* Reopens the Add to Home Screen guide after it was dismissed —
                compact player: leads the bottom strip instead */}
            {!playerCollapsed && installGuideButton}
            {/* Favourites (♥) — the Surahs / Juz this browser liked */}
            <TopicPickerModal
              variant="favourites"
              triggerClassName="pointer-events-auto relative grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-sand-200 transition-opacity hover:opacity-80 active:opacity-60 before:absolute before:-inset-2 before:content-[''] cursor-pointer"
              surahTracks={surahTracksForCurrentReciter}
              onSelectJuz={handleSelectJuz}
            />
            {/* 🔖 add (bookmark +) / remove (filled) the ayah being read */}
            {onAirAyah && (
              <button
                type="button"
                onClick={() => {
                  haptic();
                  handleToggleBookmark();
                }}
                aria-pressed={bookmarkOn}
                aria-label={bookmarkOn ? "Remove bookmark" : "Add bookmark"}
                data-tooltip={bookmarkOn ? "Remove bookmark" : "Add bookmark"}
                className={`pointer-events-auto relative grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full transition-opacity hover:opacity-80 active:opacity-60 before:absolute before:-inset-2 before:content-[''] cursor-pointer ${bookmarkOn ? "text-amber-300" : "text-sand-200"}`}
              >
                {bookmarkOn ? <BookmarkIcon filled className="text-base sm:text-lg" /> : <BookmarkAddIcon className="text-base sm:text-lg" />}
              </button>
            )}
            </div>
          }
        >
          <div ref={playerWrapRef} className="pointer-events-auto flex max-w-[calc(100vw-2rem)] justify-center">
            {/* Compact Integrated Glassmorphism Player with Ayah Controls */}
            {activeBayan && (
              <CompactBayanPlayer
                bayan={activeBayan}
                surahTracks={surahTracksForCurrentReciter}
                activeSurah={activeSurah}
                currentVerse={isJuz ? null : currentVerse}
                currentSegment={isJuz ? null : currentSegment}
                segments={isJuz ? [] : segments}
                totalVerses={isJuz ? 1 : (activeSurah?.verses ?? verses.length)}
                activeVerseIndex={isJuz ? 0 : activeIndex}
                language={language}
                showTranslation={showTranslation}
                onToggleShowTranslation={handleToggleMeaning}
                onPrevVerse={
                  isJuz
                    ? player.ayahSequence
                      ? () => player.jumpToAyah((player.ayahSequence?.index ?? 0) - 1)
                      : undefined
                    : verses.length > 1 ? handlePrevVerse : undefined
                }
                onNextVerse={
                  isJuz
                    ? player.ayahSequence
                      ? () => player.jumpToAyah((player.ayahSequence?.index ?? 0) + 1)
                      : undefined
                    : verses.length > 1 ? handleNextVerse : undefined
                }
                trackKind={isJuz ? "Juz" : activeSurah ? "Surah" : null}
                juzTiming={isJuz ? juzTiming : null}
                // Juz: |< / >| move between Juz (1 ↔ 30 wraps), not between ayahs.
                // Surah: the player's own next/previous need a loaded track, so
                // before the first play step from the landing Surah (114 ↔ 1 wraps).
                onPrevTrack={
                  isJuz && activeJuz
                    ? () => handleSelectJuz(activeJuz.id <= 1 ? 30 : activeJuz.id - 1)
                    : !player.current && activeSurah
                      ? () => handleStepSurah(-1)
                      : undefined
                }
                onNextTrack={
                  isJuz && activeJuz
                    ? () => handleSelectJuz(activeJuz.id >= 30 ? 1 : activeJuz.id + 1)
                    : !player.current && activeSurah
                      ? () => handleStepSurah(1)
                      : undefined
                }
                onSeekToVerse={jumpToVerse}
                viewSlot={<PlayerLikeButton e={engagement} lang={language} />}
                footerSlot={playerFooter}
                footerLeading={installGuideButton}
                onCollapsedChange={setPlayerCollapsed}
                forceCompact={readingActive}
                onTitleClick={() => setBrowserOpenRequest((n) => n + 1)}
                pageNav={
                  readingActive
                    ? {
                        page: readingPage,
                        first: readingFirstPage,
                        last: readingLastPage,
                        onStep: handleStepPage,
                        onOpenPicker: () => setPagePickerOpen(true),
                      }
                    : null
                }
              />
            )}
          </div>
        </PlayerStatsFrame>
        </div>
      </div>

      {/* Reading mode → « Page N »: choose a Mushaf page */}
      <MushafPagePicker
        open={pagePickerOpen && readingActive}
        currentPage={readingPage}
        range={[readingFirstPage, readingLastPage]}
        onPick={handleGoToPage}
        onClose={() => setPagePickerOpen(false)}
      />

      {/* First visit on a phone browser: how to add HuDa to the Home Screen */}
      <InstallGuide />
    </div>
  );
}

/**
 * Keeps the scene's controls inside the part of the screen that is actually
 * visible: Safari's toolbars and the on-screen keyboard can cover the bottom of
 * the fixed scene. Publishes the covered heights as --vv-top / --vv-bottom on
 * the scene (plus the visible --vv-height) and returns whether the keyboard is up.
 */
function useVisibleArea(sceneRef: React.RefObject<HTMLDivElement>): boolean {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const scene = sceneRef.current;
    const vv = window.visualViewport;
    if (!scene || !vv) return;
    let frame = 0;
    // Tallest visible height seen at this width — the keyboard shrinks it a lot.
    let full = { width: 0, height: 0 };
    // Home-screen app (iOS black-translucent status bar): the fixed scene comes
    // up a status bar short of the screen, leaving a black strip at the bottom.
    // Stretch it to the physical screen height.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (standalone) {
          const long = Math.max(screen.width, screen.height);
          const short = Math.min(screen.width, screen.height);
          scene.style.minHeight = `${window.innerHeight >= window.innerWidth ? long : short}px`;
        }
        const r = scene.getBoundingClientRect();
        const top = Math.max(0, Math.round(vv.offsetTop - r.top));
        const bottom = Math.max(0, Math.round(r.bottom - (vv.offsetTop + vv.height)));
        scene.style.setProperty("--vv-top", `${top}px`);
        scene.style.setProperty("--vv-bottom", `${bottom}px`);
        scene.style.setProperty("--vv-height", `${Math.round(vv.height)}px`);
        if (vv.width !== full.width || vv.height > full.height) full = { width: vv.width, height: vv.height };
        setKeyboardOpen(full.height - vv.height > 150);
      });
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sceneRef]);
  return keyboardOpen;
}
