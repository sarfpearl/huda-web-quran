"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionId } from "@/lib/audio/session";
import {
  QURAN_JUZ,
  QURAN_SURAHS,
  getQuranJuzByTrackId,
  isQuranTrackId,
  isSurahTrackId,
  SURAH_TRACK_ID_PREFIX,
} from "@/lib/data/quran";
import { CloseIcon, CommentIcon, FavouriteIcon, ViewCountIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/*
 * View count, live listeners and comments for the Surah / Juz on screen.
 *  - useQuranEngagement()   shared state (polls Supabase, posts/deletes).
 *  - EngagementOverlay      above the player: the general comments + composer
 *                           (shown while 💬 is open; outside press closes).
 *  - PlayerStatsFrame       glass frame around the player whose top strip
 *                           shows Live (left) and view count + comments (right).
 *  - PlayerLikeButton       ♥ like (with count) inside the expanded player.
 * Every number comes from Supabase (supabase/migrations/…_quran_views_comments.sql).
 */

export type QuranKind = "surah" | "juz";
export interface QuranContent {
  kind: QuranKind;
  id: number;
}

interface ViewStats {
  content: { kind: QuranKind; id: number; seconds: number; users: number; live: number };
  site: { seconds: number; users: number; live: number; top_surah: number | null; top_surah_users: number | null };
}

interface QuranComment {
  id: string;
  name: string;
  body: string;
  created_at: string;
  mine: boolean;
}

type Lang = "en" | "ta";

const T = {
  say: { en: "Say something…", ta: "ஏதாவது சொல்லுங்கள்…" },
  yourName: { en: "Your name first…", ta: "முதலில் உங்கள் பெயர்…" },
  views: { en: "View count", ta: "பார்வைகள்" },
  hours: { en: "Listening time", ta: "கேட்ட நேரம்" },
  users: { en: "Listeners", ta: "கேட்டவர்கள்" },
  live: { en: "Live", ta: "நேரலை" },
  overall: { en: "Overall view count", ta: "மொத்த பார்வைகள்" },
  surahViews: { en: "Surah view count", ta: "சூரா பார்வைகள்" },
  like: { en: "Like", ta: "விரும்பு" },
  unlike: { en: "Unlike", ta: "விருப்பத்தை நீக்கு" },
  juzViews: { en: "Juz view count", ta: "ஜுஸ் பார்வைகள்" },
  liveNow: { en: "Listening now", ta: "இப்போது கேட்பவர்கள்" },
  allSite: { en: "All Surahs & Juz", ta: "அனைத்தும்" },
  top: { en: "Most listened Surah", ta: "அதிகம் கேட்கப்பட்ட சூரா" },
  del: { en: "Delete?", ta: "நீக்கவா?" },
  unavailable: { en: "Not available right now.", ta: "தற்போது கிடைக்கவில்லை." },
  rate: { en: "Please wait a moment.", ta: "சிறிது நேரம் காத்திருக்கவும்." },
  failed: { en: "Couldn't post. Try again.", ta: "பதிவிட முடியவில்லை." },
  comment: { en: "Comments", ta: "கருத்துகள்" },
  change: { en: "Change name", ta: "பெயரை மாற்று" },
} as const;

const NAME_KEY = "huda-comment-name";
/** Comments are one general stream for everyone (not per Surah / Juz). */
const GENERAL = { kind: "general", ref: 0 } as const;
const COMMENTS_POLL_MS = 10_000;
const STATS_POLL_MS = 30_000;

/** What's on screen: a Surah track, or a Juz track (counted as that Juz). */
export function quranContentOf(trackId: string | null | undefined): QuranContent | null {
  if (!trackId) return null;
  if (isSurahTrackId(trackId)) {
    const n = Number(trackId.slice(SURAH_TRACK_ID_PREFIX.length));
    return n >= 1 && n <= 114 ? { kind: "surah", id: n } : null;
  }
  if (isQuranTrackId(trackId)) {
    const juz = getQuranJuzByTrackId(trackId);
    return juz ? { kind: "juz", id: juz.id } : null;
  }
  return null;
}

export const contentLabel = (c: { kind: QuranKind | "general"; id: number } | null) =>
  !c ? "—" : c.kind === "general" ? "General" : c.kind === "juz" ? `Juz ${c.id}${QURAN_JUZ[c.id - 1] ? ` · ${QURAN_JUZ[c.id - 1].title}` : ""}` : QURAN_SURAHS[c.id - 1]?.name ?? `Surah ${c.id}`;

const surahName = (n: number | null | undefined) => (n ? QURAN_SURAHS[n - 1]?.name ?? `Surah ${n}` : "—");
export const compactCount = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

function formatHours(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  const h = seconds / 3600;
  return `${h >= 100 ? Math.round(h).toLocaleString() : h.toFixed(1)} hrs`;
}

/** Runs `fn` now, every `ms` while the tab is visible, and again as soon as
 *  a hidden tab becomes visible (so numbers are never stale on return). */
function usePolling(fn: () => void, ms: number) {
  useEffect(() => {
    fn();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") fn();
    }, ms);
    const onVisible = () => {
      if (document.visibilityState === "visible") fn();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fn, ms]);
}

// ── Shared state ────────────────────────────────────────────────────────────

export function useQuranEngagement(content: QuranContent | null) {
  const kind = content?.kind ?? null;
  const ref = content?.id ?? null;
  const [comments, setComments] = useState<QuranComment[]>([]);
  const [commentsTotal, setCommentsTotal] = useState(0);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [statsFailed, setStatsFailed] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [name, setNameState] = useState("");
  const [configured, setConfigured] = useState(false);
  const [likes, setLikes] = useState<{ count: number; liked: boolean } | null>(null);

  useEffect(() => {
    setConfigured(Boolean(getSupabaseBrowserClient()));
    try {
      setNameState(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setStats(null);
    setLikes(null);
  }, [kind, ref]);

  const setName = useCallback((n: string) => {
    setNameState(n);
    try {
      if (n) localStorage.setItem(NAME_KEY, n);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const loadComments = useCallback(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase
      .rpc("get_quran_comments", { p_kind: GENERAL.kind, p_ref: GENERAL.ref, p_limit: 50, p_viewer: getSessionId() })
      .then(({ data, error }) => {
        if (error || !data) return;
        setComments(((data.comments ?? []) as QuranComment[]).slice().reverse());
        setCommentsTotal(data.total ?? 0);
      }, () => {});
  }, []);

  const loadStats = useCallback(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !kind || !ref) return setStatsFailed(true);
    supabase.rpc("get_quran_view_stats", { p_kind: kind, p_ref: ref }).then(
      ({ data, error }) => {
        if (error || !data) setStatsFailed(true);
        else {
          setStats(data as ViewStats);
          setStatsFailed(false);
        }
      },
      () => setStatsFailed(true)
    );
  }, [kind, ref]);

  const loadLikes = useCallback(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !kind || !ref) return;
    supabase
      .rpc("get_quran_likes", { p_viewer: getSessionId(), p_kind: kind, p_ref: ref })
      .then(({ data, error }) => {
        if (!error && data) setLikes(data as { count: number; liked: boolean });
      }, () => {});
  }, [kind, ref]);

  // Comments & View count close on any press outside them (another control
  // included). Their own panels and toggles carry data-engagement-keep.
  useEffect(() => {
    if (!composerOpen && !viewsOpen) return;
    const onDown = (ev: PointerEvent) => {
      const t = ev.target as Element | null;
      if (t?.closest?.("[data-engagement-keep]")) return;
      setComposerOpen(false);
      setViewsOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [composerOpen, viewsOpen]);

  usePolling(loadComments, COMMENTS_POLL_MS);
  usePolling(loadStats, STATS_POLL_MS);
  usePolling(loadLikes, STATS_POLL_MS);

  /** Like / un-like (optimistic; reverts if the server says no). */
  const toggleLike = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !kind || !ref) return;
    let before: { count: number; liked: boolean } | null = null;
    setLikes((l) => {
      before = l;
      const cur = l ?? { count: 0, liked: false };
      return { liked: !cur.liked, count: Math.max(0, cur.count + (cur.liked ? -1 : 1)) };
    });
    try {
      const { data, error } = await supabase.rpc("toggle_quran_like", {
        p_viewer: getSessionId(),
        p_kind: kind,
        p_ref: ref,
      });
      if (error || !data?.ok) setLikes(before);
      else setLikes({ count: data.count, liked: data.liked });
    } catch {
      setLikes(before);
    }
  }, [kind, ref]);

  /** Returns an error message, or null on success. */
  const post = useCallback(
    async (body: string): Promise<"rate" | "failed" | null> => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return "failed";
      try {
        const { data, error } = await supabase.rpc("add_quran_comment", {
          p_viewer: getSessionId(),
          p_kind: GENERAL.kind,
          p_ref: GENERAL.ref,
          p_name: name,
          p_body: body,
        });
        if (error || !data?.ok) return data?.error === "rate_limited" ? "rate" : "failed";
        setComments((c) => [...c, data.comment as QuranComment]);
        setCommentsTotal((n) => n + 1);
        return null;
      } catch {
        return "failed";
      }
    },
    [name]
  );

  const remove = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    let before: QuranComment[] = [];
    setComments((c) => {
      before = c;
      return c.filter((x) => x.id !== id);
    });
    const { data, error } = await supabase.rpc("delete_quran_comment", { p_viewer: getSessionId(), p_id: id });
    if (error || data !== true) setComments(before);
    else setCommentsTotal((n) => Math.max(0, n - 1));
  }, []);

  return {
    content,
    configured,
    comments,
    commentsTotal,
    stats,
    statsFailed,
    composerOpen,
    setComposerOpen,
    viewsOpen,
    setViewsOpen,
    name,
    setName,
    post,
    remove,
    likes,
    toggleLike,
  };
}

export type QuranEngagement = ReturnType<typeof useQuranEngagement>;

// ── Icons ───────────────────────────────────────────────────────────────────


const SendIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);

const LiveDot = ({ on }: { on: boolean }) => (
  <span
    className={cn(
      "h-2 w-2 shrink-0 rounded-full",
      on ? "bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.9)]" : "bg-sand-300/50"
    )}
  />
);

// ── In-player view count (replaces the old ♥ button) ────────────────────────

/** ♥ in the expanded player (replaced the in-player view count). The count
 *  shows once somebody has liked this Surah / Juz. */
export function PlayerLikeButton({ e, lang = "en" }: { e: QuranEngagement; lang?: Lang }) {
  if (!e.content) return null;
  const liked = Boolean(e.likes?.liked);
  const count = e.likes?.count ?? 0;
  const tip = liked ? T.unlike[lang] : T.like[lang];
  return (
    <button
      type="button"
      onClick={() => void e.toggleLike()}
      disabled={!e.configured}
      aria-pressed={liked}
      aria-label={count > 0 ? `${tip} · ${count}` : tip}
      data-tooltip={tip}
      className={cn(
        "flex h-8 sm:h-9 min-w-8 sm:min-w-9 items-center justify-center gap-1 rounded-full bg-black/40 border border-white/10 text-[11px] font-bold tabular-nums transition-all cursor-pointer hover:bg-black/60 active:scale-90 disabled:cursor-default disabled:active:scale-100",
        count > 0 && "px-2.5",
        liked ? "text-emerald-400" : "text-sand-200/80 hover:text-emerald-300"
      )}
    >
      <FavouriteIcon filled={liked} className="text-xs sm:text-sm" />
      {count > 0 && <span>{compactCount(count)}</span>}
    </button>
  );
}

// ── Above the player ────────────────────────────────────────────────────────

/** Live width of the player card (the container's first child). */
function usePlayerWidth(container: RefObject<HTMLElement> | undefined): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const wrap = container?.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    let observed: Element | null = null;
    const ro = new ResizeObserver(() => {
      const w = observed?.getBoundingClientRect().width ?? 0;
      setWidth(w > 0 ? Math.round(w) : null);
    });
    const attach = () => {
      const el = wrap.firstElementChild;
      if (el === observed) return;
      if (observed) ro.unobserve(observed);
      observed = el;
      if (el) ro.observe(el);
      else setWidth(null);
    };
    attach();
    const mo = new MutationObserver(attach);
    mo.observe(wrap, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [container]);
  return width;
}

/**
 * Live geometry of the player card (the container's first child): its width
 * and the left/right insets of the visible view's content (cover / first
 * button … last button), so the stats strip lines up with them. Follows the
 * card resizing and the compact ⇄ expanded switch.
 */
function usePlayerGeometry(container: RefObject<HTMLElement> | undefined) {
  const [geo, setGeo] = useState<{ width: number; left: number; right: number; radius: number } | null>(null);
  useEffect(() => {
    const wrap = container?.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    let card: Element | null = null;
    const measure = () => {
      if (!card) return setGeo(null);
      const c = card.getBoundingClientRect();
      if (c.width <= 0) return setGeo(null);
      const view = [...card.children].find((v) => v.getAttribute("aria-hidden") === "false") as HTMLElement | undefined;
      let left = 0;
      let right = 0;
      if (view) {
        const r = view.getBoundingClientRect();
        const cs = getComputedStyle(view);
        left = Math.max(0, r.left + parseFloat(cs.paddingLeft) - c.left);
        right = Math.max(0, c.right - (r.right - parseFloat(cs.paddingRight)));
      }
      // The compact pill is rounder than the full card; the frame's bottom
      // corners follow it so the two outlines never split into a double line.
      const radius = parseFloat(getComputedStyle(card).borderBottomLeftRadius) || 0;
      setGeo({ width: Math.round(c.width), left: Math.round(left), right: Math.round(right), radius });
    };
    const ro = new ResizeObserver(measure);
    const sync = () => {
      const el = wrap.firstElementChild;
      if (el !== card) {
        if (card) ro.unobserve(card);
        card = el;
        if (el) ro.observe(el);
      }
      measure();
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(wrap, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-hidden"] });
    // The shell animates its size after a switch; re-measure once it settles.
    wrap.addEventListener("transitionend", measure);
    return () => {
      ro.disconnect();
      mo.disconnect();
      wrap.removeEventListener("transitionend", measure);
    };
  }, [container]);
  return geo;
}

function Metric({ label, value, live }: { label: string; value: string; live?: boolean }) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-lg font-semibold text-white tabular-nums">
        {live && <LiveDot on />}
        {value}
      </div>
      <div className="text-[11px] text-sand-200/70">{label}</div>
    </div>
  );
}

function CommentBubble({ c, lang, onDelete }: { c: QuranComment; lang: Lang; onDelete: (id: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = window.setTimeout(() => setConfirm(false), 3000);
    return () => window.clearTimeout(t);
  }, [confirm]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -12 }}
      className="flex max-w-full items-start gap-2 rounded-2xl bg-black/35 backdrop-blur-[8px] px-3 py-1.5 text-xs leading-snug shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
    >
      <p className="min-w-0 break-words text-sand-50">
        <span className="mr-1.5 font-bold text-emerald-300">{c.name}</span>
        {c.body}
      </p>
      {c.mine &&
        (confirm ? (
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            className="shrink-0 rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-red-500"
          >
            {T.del[lang]}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            aria-label="Delete my comment"
            className="mt-px shrink-0 rounded-full p-0.5 text-sand-200/60 hover:bg-white/15 hover:text-white"
          >
            <CloseIcon className="text-[11px]" />
          </button>
        ))}
    </motion.li>
  );
}

export function EngagementOverlay({
  e,
  lang = "en",
  alignTo,
}: {
  e: QuranEngagement;
  lang?: Lang;
  /** Container of the player card; the overlay matches the card's edges. */
  alignTo?: RefObject<HTMLElement>;
}) {
  const playerWidth = usePlayerWidth(alignTo);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { composerOpen, setComposerOpen, viewsOpen, setViewsOpen, name, setName } = e;

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [e.comments.length, composerOpen]);

  useEffect(() => {
    if (composerOpen) inputRef.current?.focus();
    else setMessage(null);
  }, [composerOpen, name]);

  useEffect(() => {
    if (!composerOpen && !viewsOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setComposerOpen(false);
        setViewsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [composerOpen, viewsOpen, setComposerOpen, setViewsOpen]);

  if (!e.content) return null;

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    if (!name) {
      // First message sets the display name.
      setName(value.slice(0, 40));
      setText("");
      return;
    }
    setBusy(true);
    setMessage(null);
    const err = await e.post(value);
    setBusy(false);
    if (err) setMessage(err === "rate" ? T.rate[lang] : T.failed[lang]);
    else setText("");
  };

  return (
    <div
      style={playerWidth ? { width: playerWidth, maxWidth: "100%" } : undefined}
      className="pointer-events-none relative mb-2 flex w-full max-w-[680px] flex-col"
    >
      {/* Comments (one general stream, newest at the bottom) — shown with the
          comment box while 💬 is open */}
      {composerOpen && e.comments.length > 0 && (
        <ul
          data-engagement-keep
          ref={listRef}
          aria-label={T.comment[lang]}
          className="no-scrollbar pointer-events-auto mb-2 flex max-h-[28vh] w-[85%] flex-col items-start gap-1.5 overflow-y-auto pt-6 [mask-image:linear-gradient(to_bottom,transparent,black_28px)]"
        >
          <AnimatePresence initial={false}>
            {e.comments.map((c) => (
              <CommentBubble key={c.id} c={c} lang={lang} onDelete={e.remove} />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Composer (opened from the header's comment button) */}
      {composerOpen && (
        <form
          data-engagement-keep
          onSubmit={submit}
          className="pointer-events-auto mb-2 flex h-12 w-full min-w-0 items-center gap-2 rounded-full bg-[#1a1a1a]/90 backdrop-blur-[10px] border border-white/10 pl-2 pr-1.5 shadow-lg"
        >
          <button
            type="button"
            onClick={() => setComposerOpen(false)}
            aria-label="Close comment box"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sand-200/70 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="text-sm" />
          </button>
          {name && (
            <button
              type="button"
              onClick={() => setName("")}
              title={T.change[lang]}
              className="max-w-[28%] shrink-0 truncate text-xs font-bold text-emerald-300 hover:underline"
            >
              {name}
            </button>
          )}
          <input
            ref={inputRef}
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            maxLength={name ? 500 : 40}
            disabled={!e.configured}
            placeholder={!e.configured ? T.unavailable[lang] : name ? T.say[lang] : T.yourName[lang]}
            aria-label={name ? T.say[lang] : T.yourName[lang]}
            className={cn(
              "min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-sand-200/45 focus:outline-none",
              lang === "ta" && "font-tamil"
            )}
          />
          <button
            type="submit"
            disabled={busy || !text.trim() || !e.configured}
            aria-label="Send"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 disabled:opacity-40"
          >
            <SendIcon className="text-base" />
          </button>
        </form>
      )}
      {message && composerOpen && <p className="-mt-1 mb-2 pl-4 text-xs text-amber-300" role="alert">{message}</p>}

    </div>
  );
}

/**
 * Glass frame around the player: a top strip with Live (left) and Overall
 * view count (right), lined up with the player's content edges; the player
 * card sits inside, sharing the frame's sides and bottom.
 */
export function PlayerStatsFrame({
  e,
  lang = "en",
  playerRef,
  children,
}: {
  e: QuranEngagement;
  lang?: Lang;
  /** The player container passed as children's ref — measured for alignment. */
  playerRef: RefObject<HTMLElement>;
  children: React.ReactNode;
}) {
  const geo = usePlayerGeometry(playerRef);
  const { stats, viewsOpen, setViewsOpen, composerOpen, setComposerOpen } = e;
  // Not a Quran track: no strip, no frame. The element tree stays the same
  // either way so the player never remounts.
  const show = Boolean(e.content);

  const toggleViews = () => {
    setViewsOpen((v) => !v);
    setComposerOpen(false);
  };
  const stat =
    "flex items-center gap-1.5 rounded-md text-[11px] sm:text-xs font-medium text-white tabular-nums transition-opacity hover:opacity-80 active:opacity-60";

  return (
    <div className="relative max-w-full">
      {/* View count details — outside the frame: a backdrop-filter inside another
          backdrop-filter can't blur what lies behind the outer one. */}
      <AnimatePresence>
        {viewsOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            data-engagement-keep
            aria-label={T.views[lang]}
            className="pointer-events-auto absolute bottom-full right-0 z-20 mb-2 max-h-[60vh] w-full max-w-[380px] overflow-y-auto rounded-[28px] sm:rounded-[32px] bg-black/[0.08] backdrop-blur-[6px] border border-white/15 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className={cn("text-sm font-bold text-white", lang === "ta" && "font-tamil")}>{T.views[lang]}</h3>
              <button
                type="button"
                onClick={() => setViewsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-200 hover:bg-white/20 hover:text-white"
                aria-label="Close"
              >
                <CloseIcon className="text-sm" />
              </button>
            </div>
            {stats ? (
              <div className="space-y-3">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">{contentLabel(e.content)}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Metric label={T.users[lang]} value={compactCount(stats.content.users)} />
                    <Metric label={T.liveNow[lang]} value={compactCount(stats.content.live)} live />
                    <Metric label={T.hours[lang]} value={formatHours(stats.content.seconds)} />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-emerald-400">{T.allSite[lang]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Metric label={T.users[lang]} value={compactCount(stats.site.users)} />
                    <Metric label={T.liveNow[lang]} value={compactCount(stats.site.live)} live />
                    <Metric label={T.hours[lang]} value={formatHours(stats.site.seconds)} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-amber-300/10 border border-amber-300/25 px-3 py-2.5">
                  <div>
                    <div className="text-[11px] text-amber-200/80">{T.top[lang]}</div>
                    <div className="text-sm font-semibold text-white">{surahName(stats.site.top_surah)}</div>
                  </div>
                  {stats.site.top_surah_users != null && (
                    <div className="text-right text-xs text-sand-200/80 tabular-nums">
                      {compactCount(stats.site.top_surah_users)} {T.users[lang].toLowerCase()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-sand-200/70">{e.statsFailed ? T.unavailable[lang] : "…"}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    <div
      className={cn(
        "pointer-events-auto relative flex max-w-full flex-col",
        show &&
          "rounded-[28px] sm:rounded-[40px] border border-white/15 bg-black/[0.08] backdrop-blur-[6px] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      )}
      style={show && geo ? { borderBottomLeftRadius: geo.radius, borderBottomRightRadius: geo.radius } : undefined}
    >
      <div
        className={cn("relative items-center justify-between", show ? "flex h-7 sm:h-8" : "hidden")}
        style={{ paddingLeft: geo?.left ?? 24, paddingRight: geo?.right ?? 24 }}
      >
        <button
          type="button"
          data-engagement-keep
          onClick={toggleViews}
          aria-label={`${T.liveNow[lang]}: ${stats?.content.live ?? 0}`}
          className={stat}
        >
          <LiveDot on={Boolean(stats && stats.content.live > 0)} />
          <span>{T.live[lang]}</span>
          <span>{stats ? compactCount(stats.content.live) : "–"}</span>
        </button>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            data-engagement-keep
            onClick={toggleViews}
            aria-expanded={viewsOpen}
            aria-label={`${T.overall[lang]}: ${stats?.content.users ?? 0}`}
            className={cn(stat, viewsOpen && "text-emerald-300")}
          >
            <ViewCountIcon className="text-xs sm:text-sm" />
            <span>{stats ? compactCount(stats.content.users) : "–"}</span>
          </button>
          {/* Comments (moved here from the header): opens the comment box */}
          <button
            type="button"
            data-engagement-keep
            onClick={() => {
              setComposerOpen((o) => !o);
              setViewsOpen(false);
            }}
            aria-pressed={composerOpen}
            aria-label={`${T.comment[lang]}: ${e.commentsTotal}`}
            data-tooltip={T.comment[lang]}
            className={cn(stat, composerOpen && "text-emerald-300")}
          >
            <CommentIcon className="text-xs sm:text-sm" />
            <span>{e.commentsTotal > 99 ? "99+" : e.commentsTotal}</span>
          </button>
        </div>
      </div>
      {/* The card overlaps the frame's border so sides/bottom read as one line */}
      <div className={show ? "-mx-px -mb-px" : undefined}>{children}</div>
    </div>
    </div>
  );
}
