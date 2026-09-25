"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import type { BayanWithRelations } from "@/types/bayan";
import { ImmersiveBackground } from "./ImmersiveBackground";
import { ImmersiveHeader } from "./ImmersiveHeader";
import { CompactBayanPlayer } from "./CompactBayanPlayer";
import { TopicPickerModal } from "./TopicPickerModal";
import { CenterVerseDisplay } from "./CenterVerseDisplay";
import { InstallGuide, InstallGuideButton } from "./InstallGuide";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { VideoCameraIcon, ImageIcon } from "@/components/ui/Icon";
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
  resolveActiveReciter,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "@/lib/data/service";
import {
  useQuranVerseSync,
  getVoiceProgressInVerse,
  fetchSurahVerses,
  getRecitationTimeline,
  CANONICAL_ISTIADHAH,
  CANONICAL_BISMILLAH,
  type AyahVerse,
  type RecitationSegment,
} from "@/lib/data/quranVerses";
import { SURAH_DURATIONS } from "@/lib/data/surahDurations";
import { SyncQADebugHUD } from "./SyncQADebugHUD";
import {
  useQuranEngagement,
  quranContentOf,
  EngagementOverlay,
  PlayerStatsFrame,
  PlayerLikeButton,
} from "./QuranEngagement";

interface ImmersiveHomeClientProps {
  categories: Category[];
  allBayan: BayanWithRelations[];
  speakers?: Speaker[];
}

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

export function ImmersiveHomeClient({
  categories,
  allBayan,
  speakers = [],
}: ImmersiveHomeClientProps) {
  const player = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  const [visualMode, setVisualMode] = useState<"video" | "image">("video");
  const [language, setLanguage] = useState<"en" | "ta">("en");
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
      const saved = localStorage.getItem("huda-visual-mode");
      if (saved === "video" || saved === "image") {
        setVisualMode(saved);
      }
      const savedLang = localStorage.getItem("huda-translation-lang");
      if (savedLang === "en" || savedLang === "ta") {
        setLanguage(savedLang);
      }
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

  // Initial category: default to 'quran' or 'iman-taqwa'
  const defaultCategory =
    categories.find((c) => c.slug === "quran" || c.slug === "quran-recitation") ??
    categories.find((c) => c.slug === "iman-taqwa") ??
    categories[0] ?? {
      id: "iman-taqwa",
      name: "Iman & Taqwa",
      slug: "iman-taqwa",
      nameTa: "ஈமான் & தக்வா",
      description: "Strengthen your faith, devotion, and mindfulness of Allah.",
      icon: "heart",
      coverImageUrl: null,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

  const [activeCategory, setActiveCategory] = useState<Category>(
    () => defaultCategory
  );

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


  // Filter Bayans belonging to current active category
  const categoryBayans = useMemo(() => {
    const list = allBayan.filter((b) => b.categoryId === activeCategory.id);
    return list.length > 0 ? list : allBayan;
  }, [allBayan, activeCategory.id]);

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
      categoryBayans[0] ??
      allBayan[0] ??
      null
    );
  }, [overrideBayan, player, surahTracksForCurrentReciter, categoryBayans, allBayan]);

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

  const handleSelectCategory = (category: Category) => {
    setOverrideBayan(null);
    setActiveCategory(category);
    const newCategoryBayans = allBayan.filter((b) => b.categoryId === category.id);
    const targetBayan = newCategoryBayans[0] ?? allBayan[0];

    // If audio is currently playing, smoothly transition audio to new category's top track
    if (player.isPlaying && targetBayan) {
      player.playBayan(targetBayan, newCategoryBayans);
    }
  };

  const handleSelectSpeaker = (speaker: Speaker) => {
    const speakerBayans = allBayan.filter((b) => b.speakerId === speaker.id);
    if (speakerBayans.length > 0) {
      const targetBayan = speakerBayans[0];
      setOverrideBayan(targetBayan);
      setActiveCategory(targetBayan.category);
      if (player.isPlaying) {
        player.playBayan(targetBayan, speakerBayans);
      }
    }
  };

  const handleSelectBayan = (bayan: BayanWithRelations) => {
    setOverrideBayan(bayan);
    setActiveCategory(bayan.category);
    player.playBayan(bayan, allBayan);
  };

  const handleShuffle = () => {
    if (categories.length === 0) return;
    const randomIndex = Math.floor(Math.random() * categories.length);
    const randomCat = categories[randomIndex];
    handleSelectCategory(randomCat);
  };

  const handleToggleVisualMode = () => {
    setVisualMode((prev) => {
      const next = prev === "video" ? "image" : "video";
      try {
        localStorage.setItem("huda-visual-mode", next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleToggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === "en" ? "ta" : "en";
      try {
        localStorage.setItem("huda-translation-lang", next);
      } catch {
        /* ignore */
      }
      return next;
    });
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
  const handleSelectJuz = (juzId: number) => {
    const juz = getQuranJuzByTrackId(`quran-juz-${juzId}`);
    if (!juz) return;
    const ayahUrls = buildJuzAyahUrls(juz.id, selectedReciter.id);
    if (ayahUrls && ayahUrls.length > 0) {
      const displayTrack = quranJuzToTrackForReciter(juz, selectedReciter, ayahUrls[0]);
      player.playAyahSequence(displayTrack, ayahUrls, 0, buildJuzPreludes(juz.id, selectedReciter.id));
      return;
    }
    const juzTrack = QURAN_TRACKS[juz.id - 1];
    if (juzTrack) player.playBayan(juzTrack, QURAN_TRACKS);
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
      // starting at this Juz's first Surah.
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
  // length (word-sync reciters: QDC word window — same recording as everyayah;
  // others: the verse's default timestamps) and sum them for elapsed / total.
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
            const w = v?.words;
            if (w && w.length > 0) {
              const d = (w[w.length - 1].endTime ?? 0) - (w[0].startTime ?? 0);
              if (d > 0) return d;
            }
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

  // Word-by-word highlight for the per-ayah Juz. The QDC word timings are
  // Surah-relative; the everyayah ayah audio starts at 0 and may differ in
  // length, so we make the timings ayah-relative and scale them to the loaded
  // ayah's duration, then pick the active word from the ayah-relative time.
  const juzWordSync = useMemo(() => {
    if (!isJuz || !juzAyahVerse || !reciterHasWordTiming(selectedReciter)) {
      return { hasWordTiming: false, activeWordIndex: -1 };
    }
    const words = juzAyahVerse.words;
    if (
      !words ||
      words.length === 0 ||
      !words.some((w) => (w.startTime ?? 0) > 0 || (w.endTime ?? 0) > 0)
    ) {
      return { hasWordTiming: false, activeWordIndex: -1 };
    }
    // Reference the actual first/last WORD-segment times as the ayah window —
    // NOT timestampFrom/To, which can sit several seconds off from the segment
    // times and shift the whole highlight ahead. The everyayah audio matches
    // these segment times (same reciter recording, same duration).
    const ayahStart = words[0].startTime ?? 0;
    const ayahEnd = words[words.length - 1].endTime ?? ayahStart;
    const qdcDur = ayahEnd - ayahStart;
    const eaDur = player.duration > 0 ? player.duration : qdcDur;
    const scale = qdcDur > 0 ? eaDur / qdcDur : 1;
    const t = player.currentTime;
    let idx = -1;
    for (let i = 0; i < words.length; i++) {
      const s = ((words[i].startTime ?? 0) - ayahStart) * scale;
      const e = ((words[i].endTime ?? 0) - ayahStart) * scale;
      if (t >= s && t < e) {
        idx = i;
        break;
      }
      if (t >= e) idx = i;
    }
    return { hasWordTiming: true, activeWordIndex: idx };
  }, [isJuz, juzAyahVerse, selectedReciter, player.currentTime, player.duration]);

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
    categorySlug: activeBayan?.category?.slug || activeCategory.slug,
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

  // Ayah meaning (translation) is OFF on every page load; the toggle only
  // applies to the current session.
  const handleToggleMeaning = () => {
    setShowTranslation((prev) => !prev);
  };

  return (
    <div
      ref={sceneRef}
      // 99% alpha: iOS 26 Safari clips opaque fixed layers short of its bars.
      // Black, not slate: Safari tints its bars with this colour.
      className="fixed inset-0 z-10 overflow-hidden bg-black/[0.99] text-sand-50 select-none"
    >
      {/* Edge-to-Edge Dynamic Scene Background (Category or Verse-Aware Surah Video) */}
      <ImmersiveBackground
        categorySlug={activeBayan?.category?.slug || activeCategory.slug}
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

      {/* 20% black scrim over every background so the verse text stays legible */}
      <div className="absolute inset-0 z-[1] bg-black/20 pointer-events-none" aria-hidden="true" />

      {/* Center Quran Verses Stage (Pure Arabic Calligraphy + English/Tamil Translation) */}
      <CenterVerseDisplay
        currentVerse={isJuz ? (juzPreSegment ? null : juzAyahVerse) : currentVerse}
        currentSegment={isJuz ? juzPreSegment : currentSegment}
        currentTime={player.isPrelude ? player.preludeCurrentTime : player.currentTime}
        isPlaying={player.isPlaying}
        language={language}
        showTranslation={showTranslation}
        activeWordIndex={isJuz ? juzWordSync.activeWordIndex : activeWordIndex}
        hasWordTiming={isJuz ? !juzPreSegment && juzWordSync.hasWordTiming : hasWordTiming}
        reciterWordSync={reciterHasWordTiming(selectedReciter)}
        isJuz={isJuz}
      />

      {/* Floating Top Header with Top-Right Hamburger Menu & Mode Toggle */}
      <ImmersiveHeader
        onShuffle={handleShuffle}
        visualMode={visualMode}
        // The image/video toggle lives in the player strip whenever it shows.
        onToggleVisualMode={engagement.content ? undefined : handleToggleVisualMode}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        showMeaning={showTranslation}
        onToggleMeaning={handleToggleMeaning}
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
        <TopicPickerModal
          categories={categories}
          speakers={speakers}
          allBayan={allBayan}
          surahTracks={surahTracksForCurrentReciter}
          activeCategorySlug={activeCategory.slug}
          onSelectCategory={handleSelectCategory}
          onSelectJuz={handleSelectJuz}
          onSelectSpeaker={handleSelectSpeaker}
          onSelectBayan={handleSelectBayan}
          onShuffle={handleShuffle}
        />
      </ImmersiveHeader>

      {/* Typing a comment: dim the verse so the comments read cleanly over it */}
      {keyboardOpen && engagement.composerOpen && (
        <div className="absolute inset-0 z-[35] bg-black/50 pointer-events-none" aria-hidden="true" />
      )}

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
        <EngagementOverlay e={engagement} lang={language} alignTo={playerWrapRef} keyboardOpen={keyboardOpen} />
        {/* Typing a comment: the keyboard leaves no room, so only the comments
            and the box sit above it; the player returns when it closes. */}
        <div className={keyboardOpen && engagement.composerOpen ? "hidden" : "contents"}>
        <PlayerStatsFrame
          e={engagement}
          lang={language}
          playerRef={playerWrapRef}
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
            {/* Reopens the Add to Home Screen guide after it was dismissed */}
            <InstallGuideButton className="relative grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-base sm:text-lg text-sand-200 transition-opacity hover:opacity-80 active:opacity-60 before:absolute before:-inset-2 before:content-['']" />
            </div>
          }
        >
          <div ref={playerWrapRef} className="pointer-events-auto flex max-w-[calc(100vw-2rem)] justify-center">
            {/* Compact Integrated Glassmorphism Player with Ayah Controls */}
            {activeBayan && (
              <CompactBayanPlayer
                bayan={activeBayan}
                categoryList={categoryBayans}
                surahTracks={surahTracksForCurrentReciter}
                onShuffleCategory={handleShuffle}
                activeSurah={activeSurah}
                currentVerse={isJuz ? null : currentVerse}
                currentSegment={isJuz ? null : currentSegment}
                segments={isJuz ? [] : segments}
                totalVerses={isJuz ? 1 : (activeSurah?.verses ?? verses.length)}
                activeVerseIndex={isJuz ? 0 : activeIndex}
                language={language}
                onToggleLanguage={handleToggleLanguage}
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
                onPrevTrack={isJuz && activeJuz ? () => handleSelectJuz(activeJuz.id <= 1 ? 30 : activeJuz.id - 1) : undefined}
                onNextTrack={isJuz && activeJuz ? () => handleSelectJuz(activeJuz.id >= 30 ? 1 : activeJuz.id + 1) : undefined}
                onSeekToVerse={jumpToVerse}
                viewSlot={<PlayerLikeButton e={engagement} lang={language} />}
              />
            )}
          </div>
        </PlayerStatsFrame>
        </div>
      </div>

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
