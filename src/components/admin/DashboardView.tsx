"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { contentLabel } from "@/components/home/QuranEngagement";
import { DashboardCards } from "@/components/admin/DashboardCards";
import { buildDashboard, type DashboardPayload, type TrendRow } from "@/lib/dashboard";

/*
 * /admin/dashboard — the morning snapshot, numbers first. Signs in like
 * /admin/comments (email magic link, Supabase Auth) and reads
 * public.dashboard_snapshots with that session: RLS lets only users in
 * public.admins select (supabase/migrations/20261031120000_dashboard_snapshots.sql).
 */

type Snapshot = { id: number; created_at: string; payload: DashboardPayload };

const TREND_SELECT =
  "created_at, pageviews:payload->analytics->last24h->>pageviews, visitors:payload->analytics->last24h->>visitors, listeners:payload->supabase->stats->>unique_viewers";

const toNum = (v: unknown): number | null => {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function DashboardView() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null | undefined>(undefined);
  const [trend, setTrend] = useState<TrendRow[]>([]);
  const [error, setError] = useState<string | null>(null);
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
    // RLS shows a non-admin an empty table, so ask who they are first.
    const admin = await supabase.rpc("is_admin");
    if (admin.error) {
      setError("தரவை ஏற்ற முடியவில்லை. மீண்டும் முயலுங்கள்.");
      return;
    }
    setIsAdmin(admin.data === true);
    if (admin.data !== true) return;

    const latest = await supabase
      .from("dashboard_snapshots")
      .select("id, created_at, payload")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) {
      setError("தரவை ஏற்ற முடியவில்லை. மீண்டும் முயலுங்கள்.");
      return;
    }
    setSnapshot((latest.data as Snapshot | null) ?? null);

    // Trend lines: a few numbers from each of the last 14 snapshots. If this
    // query fails the cards still show; only the trend lines go missing.
    const rows = await supabase
      .from("dashboard_snapshots")
      .select(TREND_SELECT)
      .order("created_at", { ascending: false })
      .limit(14);
    setTrend(
      rows.error || !rows.data
        ? []
        : (rows.data as unknown as Record<string, unknown>[]).map((r) => ({
            created_at: String(r.created_at),
            pageviews: toNum(r.pageviews),
            visitors: toNum(r.visitors),
            listeners: toNum(r.listeners),
          })),
    );
  }, [session]);

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
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin/dashboard` },
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
    setSnapshot(undefined);
    setIsAdmin(null);
    setLinkSent(false);
  };

  const model = useMemo(
    () =>
      snapshot
        ? buildDashboard(snapshot.payload, {
            trend,
            label: (kind, id) => contentLabel({ kind, id }),
          })
        : null,
    [snapshot, trend],
  );

  return (
    <div className="space-y-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          {model && (
            <p className="text-muted text-sm">
              புதுப்பிக்கப்பட்டது: {model.updatedLabel}
            </p>
          )}
        </div>
        {session && (
          <div className="text-muted flex items-center gap-3 text-xs">
            <span className="max-w-[40vw] truncate">{session.user.email}</span>
            <button type="button" onClick={() => void load()} className="hover:underline">
              புதுப்பி
            </button>
            <button type="button" onClick={() => void signOut()} className="hover:underline">
              Sign out
            </button>
          </div>
        )}
      </div>

      {configured === null ? (
        <div className="skeleton h-24 max-w-md rounded-2xl" aria-busy="true" />
      ) : !configured ? (
        <p className="surface text-muted rounded-2xl border p-5 text-sm">Supabase இணைக்கப்படவில்லை, அதனால் dashboard தரவு இல்லை.</p>
      ) : !session ? (
        linkSent ? (
          <div className="surface max-w-md space-y-2 rounded-2xl border p-5 text-sm shadow-soft" role="status">
            <p className="font-medium">உங்கள் email-ஐப் பாருங்கள்</p>
            <p className="text-muted">{email.trim()} admin என்றால் sign-in link வந்துவிடும். இதே browser-ல் திறக்கவும்.</p>
            <button type="button" onClick={() => setLinkSent(false)} className="text-muted text-xs hover:underline">
              வேறு email பயன்படுத்து
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
              {sending ? "அனுப்புகிறது…" : "Sign-in link-ஐ email செய்"}
            </button>
            {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          </form>
        )
      ) : isAdmin === false ? (
        <p className="surface text-muted max-w-md rounded-2xl border p-5 text-sm" role="alert">
          {session.user.email} admin அல்ல. Sign out செய்து admin கணக்கைப் பயன்படுத்துங்கள்.
        </p>
      ) : (
        <>
          {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
          {snapshot === undefined && !error ? (
            <div className="skeleton h-40 rounded-2xl" aria-busy="true" />
          ) : snapshot === null ? (
            <div className="surface max-w-md space-y-1 rounded-2xl border p-5 text-sm shadow-soft">
              <p className="font-medium">இன்னும் தரவு இல்லை</p>
              <p className="text-muted">காலை 8:00 IST-க்கு Morning dashboard workflow ஓடியதும் இங்கே தெரியும்.</p>
            </div>
          ) : model ? (
            <>
              {model.stale && (
                <p className="rounded-xl border border-gold-400/50 bg-gold-400/10 px-4 py-2.5 text-sm text-gold-600 dark:text-gold-300" role="alert">
                  ⚠ தரவு 26 மணி நேரத்துக்கு மேல் பழையது. Morning dashboard workflow ஓடவில்லையா என்று பாருங்கள்.
                </p>
              )}
              {model.fatal && (
                <p className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400" role="alert">
                  சேகரிப்பு பாதியில் நின்றது: {model.fatal}
                </p>
              )}
              <DashboardCards model={model} />
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
