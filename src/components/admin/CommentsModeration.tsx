"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { contentLabel, type QuranKind } from "@/components/home/QuranEngagement";
import { cn } from "@/lib/utils";

/*
 * Moderate Surah / Juz comments: hide, unhide or delete. Sign in with an email
 * magic link (Supabase Auth); the server lets only users in public.admins
 * moderate (see supabase/migrations/…_admin_login_moderation.sql).
 */

interface AdminComment {
  id: string;
  kind: QuranKind | "general";
  ref: number;
  name: string;
  body: string;
  created_at: string;
  hidden: boolean;
}

type Filter = "all" | "visible" | "hidden";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CommentsModeration() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [notAdmin, setNotAdmin] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [comments, setComments] = useState<AdminComment[] | null>(null);
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
    const { data, error: rpcError } = await supabase.rpc("admin_list_quran_comments", {
      p_filter: filter,
      p_limit: 200,
    });
    if (rpcError) {
      setError("Couldn't load comments. Please try again.");
      return;
    }
    if (!data?.ok) {
      setNotAdmin(true);
      return;
    }
    setNotAdmin(false);
    setComments(data.comments as AdminComment[]);
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
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/comments` },
    });
    setSending(false);
    // An unknown email fails too; say the same thing so the page doesn't reveal who is an admin.
    if (authError?.status === 429) {
      setError("Too many sign-in attempts. Please wait a minute and try again.");
      return;
    }
    setLinkSent(true);
  };

  const signOut = async () => {
    await getSupabaseBrowserClient()?.auth.signOut();
    setComments(null);
    setNotAdmin(false);
    setLinkSent(false);
  };

  const act = async (id: string, action: "hide" | "unhide" | "delete") => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(id);
    setConfirmDelete(null);
    const { data, error: rpcError } = await supabase.rpc("moderate_quran_comment", { p_id: id, p_action: action });
    setBusyId(null);
    if (rpcError || !data?.ok) {
      setError("That action didn't go through. Please try again.");
      return;
    }
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Comments</h1>
          <p className="text-muted text-sm">Hide, restore or delete comments.</p>
        </div>
        {session && (
          <div className="text-muted flex items-center gap-3 text-xs">
            <span>{session.user.email}</span>
            <button type="button" onClick={() => void signOut()} className="hover:underline">
              Sign out
            </button>
          </div>
        )}
      </div>

      {configured === null ? (
        <div className="skeleton h-24 max-w-md rounded-2xl" aria-busy="true" />
      ) : !configured ? (
        <p className="surface rounded-2xl border p-5 text-sm text-muted">Supabase isn&apos;t connected, so there are no comments to moderate.</p>
      ) : !session ? (
        linkSent ? (
          <div className="surface max-w-md space-y-2 rounded-2xl border p-5 text-sm shadow-soft" role="status">
            <p className="font-medium">Check your email</p>
            <p className="text-muted">If {email.trim()} has admin access, a sign-in link is on its way. Open it in this browser.</p>
            <button type="button" onClick={() => setLinkSent(false)} className="text-muted text-xs hover:underline">
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={sendLink} className="surface max-w-md space-y-3 rounded-2xl border p-5 shadow-soft">
            <label htmlFor="admin-email" className="block text-sm font-medium">Admin email</label>
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
              {sending ? "Sending…" : "Email me a sign-in link"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          </form>
        )
      ) : notAdmin ? (
        <p className="surface max-w-md rounded-2xl border p-5 text-sm text-muted" role="alert">
          {session.user.email} isn&apos;t an admin. Sign out and use an admin account.
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="Filter" className="surface-muted inline-flex gap-1 rounded-full p-1">
            {(["all", "visible", "hidden"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-medium capitalize transition-colors",
                  filter === f ? "bg-primary-700 text-sand-50" : "text-muted hover:text-primary-700"
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

          {comments === null ? (
            <div className="skeleton h-24 rounded-2xl" aria-busy="true" />
          ) : comments.length === 0 ? (
            <p className="surface rounded-2xl border p-5 text-sm text-muted">No comments here.</p>
          ) : (
            <ul className="surface divide-y rounded-2xl border shadow-soft">
              {comments.map((c) => (
                <li key={c.id} className={cn("flex flex-wrap items-start gap-3 p-4", c.hidden && "opacity-60")}>
                  <div className="min-w-0 flex-1">
                    <p className="text-muted text-xs">
                      {contentLabel({ kind: c.kind, id: c.ref })} · {when(c.created_at)}
                      {c.hidden && <span className="ml-2 rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-semibold text-gold-600">Hidden</span>}
                    </p>
                    <p className="mt-1 break-words text-sm">
                      <span className="mr-1.5 font-semibold text-primary-700 dark:text-primary-300">{c.name}</span>
                      {c.body}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      onClick={() => void act(c.id, c.hidden ? "unhide" : "hide")}
                      className="surface-muted rounded-full border px-3 py-1.5 text-xs font-medium hover:border-primary-400 disabled:opacity-50"
                    >
                      {c.hidden ? "Unhide" : "Hide"}
                    </button>
                    {confirmDelete === c.id ? (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => void act(c.id, "delete")}
                        className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Confirm delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(c.id)}
                        className="rounded-full border border-red-300/60 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
