/*
 * Optional login (docs/LOGIN_STRATEGY.md, Phase 1): Supabase Auth with Google
 * or an email link. Guests keep everything working; signing in is only for
 * keeping the reading on every device (sync comes in Phase 2).
 *
 * The Supabase client is imported on demand (`import()`), so the code is only
 * fetched when Settings › Account opens or the sign-in link comes back — not
 * on the home page for guests.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Login shows in previews and local runs; in production once NEXT_PUBLIC_LOGIN=on. */
export function loginEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_LOGIN === "on") return true;
  return process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
}

/** Where the sign-in link and Google send the browser back to. */
export const AUTH_CALLBACK_PATH = "/auth/callback";
/** sessionStorage: the page to return to once signed in. */
const RETURN_KEY = "huda:auth-return";

export interface Account {
  id: string;
  email: string;
  name: string;
  /** "google" | "email" (Supabase's own name for the way in). */
  provider: string;
}

async function client(): Promise<SupabaseClient | null> {
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  return getSupabaseBrowserClient();
}

function toAccount(user: User | null | undefined): Account | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : "";
  return {
    id: user.id,
    email: user.email ?? "",
    name,
    provider: String(user.app_metadata?.provider ?? "email"),
  };
}

/** The signed-in account on this browser, or null (read from the saved session, no network). */
export async function getAccount(): Promise<Account | null> {
  const supabase = await client();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return toAccount(data.session?.user);
}

/** Calls `cb` on sign in / out (also from another tab). Returns the unsubscribe. */
export async function onAccountChange(cb: (a: Account | null) => void): Promise<() => void> {
  const supabase = await client();
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(toAccount(session?.user)));
  return () => data.subscription.unsubscribe();
}

export interface AuthWays {
  google: boolean;
  email: boolean;
}

/** Which ways in are switched on in Supabase (its public settings), or null if unknown. */
export async function authWays(): Promise<AuthWays | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return null;
    const s = (await res.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(s.external?.google), email: s.external?.email !== false };
  } catch {
    return null;
  }
}

function rememberReturn() {
  try {
    sessionStorage.setItem(RETURN_KEY, window.location.pathname + window.location.search);
  } catch {}
}

/** The page to go back to after the callback (same-site paths only). */
export function takeReturnPath(): string {
  try {
    const p = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    if (p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith(AUTH_CALLBACK_PATH)) return p;
  } catch {}
  return "/";
}

const callbackUrl = () => `${window.location.origin}${AUTH_CALLBACK_PATH}`;

/** Sends the browser to Google ("redirecting"), or says why it couldn't. */
export async function signInWithGoogle(): Promise<"redirecting" | "unconfigured" | "failed"> {
  const supabase = await client();
  if (!supabase) return "unconfigured";
  rememberReturn();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl(), queryParams: { prompt: "select_account" } },
  });
  return error ? "failed" : "redirecting";
}

export type EmailLinkResult = "sent" | "invalid" | "rate" | "closed" | "failed" | "unconfigured";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails a one-tap sign-in link (makes the account on first use). */
export async function sendEmailLink(email: string): Promise<EmailLinkResult> {
  const address = email.trim();
  if (!EMAIL_RE.test(address) || address.length > 254) return "invalid";
  const supabase = await client();
  if (!supabase) return "unconfigured";
  rememberReturn();
  const { error } = await supabase.auth.signInWithOtp({
    email: address,
    options: { shouldCreateUser: true, emailRedirectTo: callbackUrl() },
  });
  if (!error) return "sent";
  if (error.status === 429) return "rate";
  // New sign-ups switched off in Supabase (until launch).
  if (/signups? not allowed|signup.*disabled/i.test(error.message) || error.code === "signup_disabled") return "closed";
  return "failed";
}

/**
 * Finishes the sign-in on /auth/callback. The client reads the `?code=` itself
 * (PKCE) when it starts; this waits for that and reports the outcome.
 */
export async function finishSignIn(): Promise<"ok" | "expired" | "other-browser" | "failed" | "unconfigured"> {
  const supabase = await client();
  if (!supabase) return "unconfigured";
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const err = params.get("error_code") ?? hash.get("error_code") ?? params.get("error") ?? hash.get("error");
  if (err) return /expired|otp/i.test(err) ? "expired" : "failed";
  const { data, error } = await supabase.auth.getSession();
  if (data.session) return "ok";
  if (error && /code verifier|code_verifier/i.test(error.message)) return "other-browser";
  const code = params.get("code");
  if (code) {
    const r = await supabase.auth.exchangeCodeForSession(code);
    if (r.data.session) return "ok";
    if (r.error && /code verifier|code_verifier/i.test(r.error.message)) return "other-browser";
    return "expired";
  }
  return "failed";
}

export async function signOut(): Promise<void> {
  const supabase = await client();
  await supabase?.auth.signOut({ scope: "local" });
}

/**
 * Deletes the account and everything stored with it on the server
 * (Supabase `delete_my_account`, migration 20261121120000). What is saved in
 * this browser stays, as a guest's.
 */
export async function deleteAccount(): Promise<"ok" | "failed" | "unconfigured"> {
  const supabase = await client();
  if (!supabase) return "unconfigured";
  const { error } = await supabase.rpc("delete_my_account");
  if (error) return "failed";
  await supabase.auth.signOut({ scope: "local" });
  return "ok";
}
