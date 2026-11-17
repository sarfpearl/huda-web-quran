"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FEEDBACK_BUCKET, type FeedbackKind } from "@/lib/feedback";
import { cn } from "@/lib/utils";

/*
 * /admin/feedback — what came in through the lantern. Signs in like
 * /admin/dashboard (email magic link, Supabase Auth); admin_list_feedback()
 * and the screenshot bucket answer only users in public.admins
 * (supabase/migrations/20261115121000_feedback.sql). Owner-facing, in Tamil.
 */

type Status = "new" | "read" | "done";
type Filter = "all" | Status;

interface FeedbackRow {
  id: string;
  created_at: string;
  kind: FeedbackKind;
  message: string;
  page: string | null;
  ui_lang: string | null;
  user_agent: string | null;
  viewport: string | null;
  screenshot_path: string | null;
  status: Status;
}

const KIND_LABEL: Record<FeedbackKind, string> = { issue: "பிழை", improvement: "மேம்பாடு", other: "மற்றவை" };
const KIND_STYLE: Record<FeedbackKind, string> = {
  issue: "bg-red-500/15 text-red-600 dark:text-red-300",
  improvement: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  other: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
};
const STATUS_LABEL: Record<Status, string> = { new: "புதியது", read: "படித்தது", done: "முடிந்தது" };
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "அனைத்தும்" },
  { id: "new", label: STATUS_LABEL.new },
  { id: "read", label: STATUS_LABEL.read },
  { id: "done", label: STATUS_LABEL.done },
];

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "iPhone · Safari" style hint from the user agent; the full string is in the tooltip. */
function device(ua: string | null) {
  if (!ua) return null;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(" · ") || "?";
}

export function FeedbackInbox() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [notAdmin, setNotAdmin] = useState(false);
  const [filter, setFilter] = useState<Filter>("new");
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [counts, setCounts] = useState<Record<Status, number> | null>(null);
  const [shots, setShots] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Decided after mount so the server and first client render match.
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    setConfigured(Boolean(supabase));
    if (!supabase) return;
    // The magic link lands back here; the client picks the session up from the URL.
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !session) return;
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("admin_list_feedback", { p_status: filter, p_limit: 200 });
    if (rpcError) {
      setError("கருத்துகளை ஏற்ற முடியவில்லை. மீண்டும் முயலுங்கள்.");
      return;
    }
    if (!data?.ok) {
      setNotAdmin(true);
      return;
    }
    setNotAdmin(false);
    const list = data.feedback as FeedbackRow[];
    setRows(list);
    setCounts(data.counts as Record<Status, number>);
    // Screenshots are private: short-lived signed links, one request for the page.
    const paths = list.map((r) => r.screenshot_path).filter((p): p is string => Boolean(p));
    if (paths.length === 0) return setShots({});
    const signed = await supabase.storage.from(FEEDBACK_BUCKET).createSignedUrls(paths, 3600);
    const next: Record<string, string> = {};
    for (const s of signed.data ?? []) if (s.path && s.signedUrl && !s.error) next[s.path] = s.signedUrl;
    setShots(next);
  }, [session, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    const address = email.trim();
    if (!supabase || !address) return;
    setSending(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/feedback` },
    });
    setSending(false);
    // An unknown email fails too; say the same thing so the page doesn't reveal who is an admin.
    if (authError?.status === 429) {
      setError("பல முறை முயன்றீர்கள். ஒரு நிமிடம் கழித்து மீண்டும் முயலுங்கள்.");
      return;
    }
    setLinkSent(true);
  };

  const signOut = async () => {
    await getSupabaseBrowserClient()?.auth.signOut();
    setRows(null);
    setNotAdmin(false);
    setLinkSent(false);
  };

  const act = async (row: FeedbackRow, action: Status | "delete") => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(row.id);
    setConfirmDelete(null);
    // The screenshot goes first, so a deleted row never leaves a file behind.
    if (action === "delete" && row.screenshot_path) {
      const removed = await supabase.storage.from(FEEDBACK_BUCKET).remove([row.screenshot_path]);
      if (removed.error) {
        setBusyId(null);
        setError("ஸ்கிரீன்ஷாட்டை நீக்க முடியவில்லை. மீண்டும் முயலுங்கள்.");
        return;
      }
    }
    const { data, error: rpcError } = await supabase.rpc("admin_update_feedback", { p_id: row.id, p_action: action });
    setBusyId(null);
    if (rpcError || !data?.ok) {
      setError("அது நடக்கவில்லை. மீண்டும் முயலுங்கள்.");
      return;
    }
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">கருத்துகள் (Feedback)</h1>
          <p className="text-muted text-sm">ஆப்பில் உள்ள லாந்தர் வழியாக வந்தவை.</p>
        </div>
        {session && (
          <div className="text-muted flex items-center gap-3 text-xs">
            <span>{session.user.email}</span>
            <button type="button" onClick={() => void signOut()} className="hover:underline">
              வெளியேறு
            </button>
          </div>
        )}
      </div>

      {configured === null ? (
        <div className="skeleton h-24 max-w-md rounded-2xl" aria-busy="true" />
      ) : !configured ? (
        <p className="surface rounded-2xl border p-5 text-sm text-muted">Supabase இணைக்கப்படவில்லை.</p>
      ) : !session ? (
        linkSent ? (
          <div className="surface max-w-md space-y-2 rounded-2xl border p-5 text-sm shadow-soft" role="status">
            <p className="font-medium">மின்னஞ்சலைப் பாருங்கள்</p>
            <p className="text-muted">{email.trim()} admin என்றால், உள்நுழையும் இணைப்பு வரும். அதை இதே browser-ல் திறங்கள்.</p>
            <button type="button" onClick={() => setLinkSent(false)} className="text-muted text-xs hover:underline">
              வேறு மின்னஞ்சல்
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="surface max-w-md space-y-3 rounded-2xl border p-5 shadow-soft">
            <label htmlFor="admin-email" className="block text-sm font-medium">Admin மின்னஞ்சல்</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="surface-muted w-full rounded-xl border px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-semibold text-sand-50 hover:bg-primary-800 disabled:opacity-50"
            >
              {sending ? "அனுப்புகிறது…" : "உள்நுழைய இணைப்பை அனுப்பு"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          </form>
        )
      ) : notAdmin ? (
        <p className="surface max-w-md rounded-2xl border p-5 text-sm text-muted" role="alert">
          {session.user.email} admin அல்ல. வெளியேறி admin கணக்கில் நுழையுங்கள்.
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="வடிகட்டி" className="surface-muted inline-flex gap-1 rounded-full p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
                  filter === f.id ? "bg-primary-700 text-sand-50" : "text-muted hover:text-primary-700"
                )}
              >
                {f.label}
                {counts && f.id !== "all" && <span className="ml-1 tabular-nums opacity-70">{counts[f.id]}</span>}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          {rows === null ? (
            <div className="skeleton h-24 rounded-2xl" aria-busy="true" />
          ) : rows.length === 0 ? (
            <p className="surface rounded-2xl border p-5 text-sm text-muted">இங்கே எதுவும் இல்லை.</p>
          ) : (
            <ul className="surface divide-y rounded-2xl border shadow-soft">
              {rows.map((r) => (
                <li key={r.id} className={cn("flex flex-wrap items-start gap-4 p-4", r.status === "done" && "opacity-60")}>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", KIND_STYLE[r.kind])}>{KIND_LABEL[r.kind]}</span>
                      <span>{when(r.created_at)}</span>
                      <span className="rounded-full border px-2 py-0.5 text-[10px]">{STATUS_LABEL[r.status]}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{r.message}</p>
                    <p className="text-muted break-all text-[11px]" title={r.user_agent ?? undefined}>
                      {[r.page, r.ui_lang && `மொழி ${r.ui_lang}`, r.viewport, device(r.user_agent)].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(["new", "read", "done"] as Status[])
                        .filter((s) => s !== r.status)
                        .map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void act(r, s)}
                            className="surface-muted rounded-full border px-3 py-1.5 text-xs font-medium hover:border-primary-400 disabled:opacity-50"
                          >
                            {STATUS_LABEL[s]} எனக் குறி
                          </button>
                        ))}
                      {confirmDelete === r.id ? (
                        <button
                          type="button"
                          disabled={busyId === r.id}
                          onClick={() => void act(r, "delete")}
                          className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          உறுதியாக நீக்கு
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(r.id)}
                          className="rounded-full border border-red-300/60 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          நீக்கு
                        </button>
                      )}
                    </div>
                  </div>
                  {r.screenshot_path &&
                    (shots[r.screenshot_path] ? (
                      <a href={shots[r.screenshot_path]} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a signed private-bucket link */}
                        <img src={shots[r.screenshot_path]} alt="ஸ்கிரீன்ஷாட்" className="max-h-44 max-w-[10rem] rounded-xl border object-contain" />
                      </a>
                    ) : (
                      <span className="text-muted shrink-0 text-[11px]">ஸ்கிரீன்ஷாட் பதிவேறவில்லை</span>
                    ))}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
