"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { contentLabel, type QuranKind } from "@/components/home/QuranEngagement";
import { cn } from "@/lib/utils";

/*
 * Moderate Surah / Juz comments: hide, unhide or delete. Gated by a moderator
 * key checked on the server (see supabase/migrations/…_quran_comment_moderation.sql);
 * the key is kept only for this browser tab (sessionStorage).
 */

interface AdminComment {
  id: string;
  kind: QuranKind;
  ref: number;
  name: string;
  body: string;
  created_at: string;
  hidden: boolean;
}

type Filter = "all" | "visible" | "hidden";

const KEY_STORAGE = "huda-moderator-key";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function CommentsModeration() {
  const [key, setKey] = useState("");
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [comments, setComments] = useState<AdminComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Decided after mount so the server and first client render match.
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    setConfigured(Boolean(getSupabaseBrowserClient()));
    try {
      const saved = sessionStorage.getItem(KEY_STORAGE);
      if (saved) setKey(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !key) return;
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("admin_list_quran_comments", {
      p_key: key,
      p_filter: filter,
      p_limit: 200,
    });
    if (rpcError) {
      setError("Couldn't load comments. Please try again.");
      return;
    }
    if (!data?.ok) {
      setError("That moderator key isn't valid.");
      setKey("");
      try {
        sessionStorage.removeItem(KEY_STORAGE);
      } catch {
        /* ignore */
      }
      return;
    }
    setComments(data.comments as AdminComment[]);
  }, [key, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const unlock = (e: React.FormEvent) => {
    e.preventDefault();
    const k = input.trim();
    if (!k) return;
    setKey(k);
    setInput("");
    try {
      sessionStorage.setItem(KEY_STORAGE, k);
    } catch {
      /* ignore */
    }
  };

  const lock = () => {
    setKey("");
    setComments(null);
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
  };

  const act = async (id: string, action: "hide" | "unhide" | "delete") => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setBusyId(id);
    setConfirmDelete(null);
    const { data, error: rpcError } = await supabase.rpc("moderate_quran_comment", { p_key: key, p_id: id, p_action: action });
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
          <p className="text-muted text-sm">Hide, restore or delete comments on Surahs and Juz.</p>
        </div>
        {key && (
          <button type="button" onClick={lock} className="text-muted text-xs hover:underline">
            Lock
          </button>
        )}
      </div>

      {configured === null ? (
        <div className="skeleton h-24 max-w-md rounded-2xl" aria-busy="true" />
      ) : !configured ? (
        <p className="surface rounded-2xl border p-5 text-sm text-muted">Supabase isn&apos;t connected, so there are no comments to moderate.</p>
      ) : !key ? (
        <form onSubmit={unlock} className="surface max-w-md space-y-3 rounded-2xl border p-5 shadow-soft">
          <label htmlFor="mod-key" className="block text-sm font-medium">Moderator key</label>
          <input
            id="mod-key"
            type="password"
            autoComplete="current-password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="surface-muted w-full rounded-xl border px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <button type="submit" className="w-full rounded-xl bg-primary-700 px-4 py-2.5 text-sm font-semibold text-sand-50 hover:bg-primary-800">
            Unlock
          </button>
          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          <p className="text-muted text-xs">Kept only for this browser tab.</p>
        </form>
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
