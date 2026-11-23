"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AtIcon, CloudSavedIcon, GoogleIcon, LogoutIcon, MailIcon, TrashIcon, UserCircleIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { t, uiLocale, useUiLang } from "@/lib/uiLang";
import {
  authWays,
  deleteAccount,
  getAccount,
  googleRedirectOnly,
  onAccountChange,
  renderGoogleButton,
  sendEmailLink,
  signInWithGoogle,
  signOut,
  type Account,
  type AuthWays,
  type EmailLinkResult,
} from "@/lib/auth/account";
import { flushBeforeSignOut, forgetThisDevice, startSync, useSyncState } from "@/lib/auth/sync";

/*
 * Settings › Account: the optional login (docs/LOGIN_STRATEGY.md, Phase 1).
 * Guests see what signing in is for and the two ways in (Google, an email
 * link); a signed-in visitor sees the account, Sign out and Delete account
 * (in-app deletion, as the App Store asks). Auth code: lib/auth/account.
 */

const GROUP = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";
const SCROLL = "no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-2.5 text-sand-100";
/** The Profile menu's round sign-in buttons (Google's "G", the @): white, 40px, like Google's own round button. */
const ROUND_BTN =
  "tap-44 grid h-10 w-10 place-items-center rounded-full border border-[#dadce0] bg-white text-slate-800 transition-colors hover:bg-sand-50 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-default";
const BIG_BTN =
  "flex h-12 w-full items-center justify-center gap-2.5 rounded-full border text-sm font-semibold transition-colors cursor-pointer active:scale-[0.99] disabled:cursor-default disabled:opacity-50";

/** The signed-in account, kept current (undefined while it loads). */
function useAccount(): Account | null | undefined {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    let off: (() => void) | undefined;
    let live = true;
    void getAccount().then((a) => live && setAccount(a));
    void onAccountChange((a) => live && setAccount(a)).then((u) => {
      if (live) off = u;
      else u();
    });
    return () => {
      live = false;
      off?.();
    };
  }, []);
  return account;
}

const TRY_AGAIN = "Something went wrong. Check your connection and try again.";
const EMAIL_ERROR: Partial<Record<EmailLinkResult, string>> = {
  invalid: "Enter a valid email address.",
  rate: "Too many tries. Please wait a minute and try again.",
  closed: "New accounts aren't open yet.",
  failed: "Something went wrong. Check your connection and try again.",
  unconfigured: "Something went wrong. Check your connection and try again.",
};

function SignedOut({ wrap }: { wrap: string }) {
  const lang = useUiLang();
  const [ways, setWays] = useState<AuthWays | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sentTo, setSentTo] = useState("");
  // The email form shows once its round @ is tapped (owner, 2026-11-23).
  const [emailOpen, setEmailOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (emailOpen) emailRef.current?.focus();
  }, [emailOpen]);
  const [error, setError] = useState("");

  useEffect(() => {
    void authWays().then(setWays);
  }, []);

  const google = async () => {
    setError("");
    setBusy("google");
    const r = await signInWithGoogle();
    // On success the browser is already on its way to Google.
    if (r !== "redirecting") {
      setBusy(null);
      setError(TRY_AGAIN);
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy("email");
    const r = await sendEmailLink(email);
    setBusy(null);
    if (r === "sent") setSentTo(email.trim());
    else setError(EMAIL_ERROR[r] ?? TRY_AGAIN);
  };

  // Unknown (offline / settings unreadable): offer both and let the call report.
  const googleOn = ways === undefined || ways === null || ways.google;

  // Google's own button (this site's name on Google's screen); the redirect
  // button where it can't work: Home-Screen app on iPhone, script blocked.
  const gisRef = useRef<HTMLDivElement>(null);
  const [redirect, setRedirect] = useState(false);
  const [gisFailed, setGisFailed] = useState(false);
  useEffect(() => setRedirect(googleRedirectOnly()), []);
  useEffect(() => {
    const el = gisRef.current;
    if (!el || !googleOn || redirect || sentTo) return;
    let live = true;
    void renderGoogleButton(el, {
      locale: uiLocale(lang),
      width: el.clientWidth || 320,
      round: true,
      onStart: () => live && setBusy("google"),
      onDone: (ok) => {
        if (!live) return;
        setBusy(null);
        if (!ok) setError(TRY_AGAIN);
      },
    }).then((ok) => live && !ok && setGisFailed(true));
    return () => {
      live = false;
    };
  }, [googleOn, redirect, sentTo, lang]);

  return (
    <div className={wrap}>
      <div className={cn(GROUP, "py-4")}>
        <p className="text-base font-semibold text-white">{t(lang, "Save your progress across devices")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-sand-200/80">
          {t(lang, "Sign in to keep your last read, bookmarks and settings on every phone and computer.")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-sand-200/80">
          {t(lang, "Listen to half a Surah on your phone, then carry on from the same ayah on your computer — everything stays in step.")}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-200/80">{t(lang, "Optional — HuDa works fully without an account.")}</p>
      </div>

      {sentTo ? (
        <div className={cn(GROUP, "py-4")} role="status">
          <div className="flex items-center gap-2 text-white">
            <MailIcon className="text-lg text-emerald-300" />
            <p className="text-sm font-semibold">{t(lang, "Check your email")}</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-sand-200/80">
            {t(lang, "We sent a sign-in link to {email}. Open it on this device, in this browser.", { email: sentTo })}
          </p>
          <button
            type="button"
            onClick={() => setSentTo("")}
            className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            {t(lang, "Use another email")}
          </button>
        </div>
      ) : (
        <div className={cn(GROUP, "space-y-3 py-4")}>
          {/* Two round buttons: Google's "G" and an @ that opens the email form.
              (Google's round button is sized for content-box, not this app's
              border-box everywhere — its G sank and shrank to nothing.) */}
          <div className="flex items-center justify-center gap-5">
            {googleOn && !redirect && (
              <div
                ref={gisRef}
                aria-busy={busy === "google"}
                className={cn("grid h-10 w-10 place-items-center [color-scheme:light] [&_*]:[box-sizing:content-box]", gisFailed && "hidden", busy === "google" && "pointer-events-none opacity-50")}
              />
            )}
            {(!googleOn || redirect || gisFailed) && (
              <button
                type="button"
                onClick={google}
                disabled={!googleOn || busy !== null}
                aria-label={t(lang, "Continue with Google")}
                data-tooltip={t(lang, "Continue with Google")}
                className={ROUND_BTN}
              >
                <GoogleIcon className="text-xl" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setEmailOpen((o) => !o)}
              aria-expanded={emailOpen}
              aria-label={t(lang, "Continue with email")}
              data-tooltip={t(lang, "Continue with email")}
              className={cn(ROUND_BTN, emailOpen && "ring-2 ring-emerald-400/70")}
            >
              <AtIcon className="h-5 w-5" />
            </button>
          </div>
          {busy === "google" && !redirect && !gisFailed && (
            <p role="status" className="text-center text-xs text-sand-200/80">
              {t(lang, "Signing you in…")}
            </p>
          )}
          {!googleOn && <p className="text-center text-[11px] text-sand-200/60">{t(lang, "Google sign-in isn't set up yet.")}</p>}

          {emailOpen && (
          <form onSubmit={send} className="space-y-2.5">
            <label className="block">
              <span className="sr-only">{t(lang, "Your email address")}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                ref={emailRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t(lang, "Your email address")}
                className="h-12 w-full rounded-full border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-sand-300/40 focus:border-emerald-400/50 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
              />
            </label>
            <button type="submit" disabled={busy !== null} className={cn(BIG_BTN, "border-emerald-400/40 bg-emerald-500 text-slate-950 hover:bg-emerald-400")}>
              {busy === "email" ? "…" : t(lang, "Continue with email")}
            </button>
          </form>
          )}
          {error && (
            <p role="alert" className="text-center text-xs text-amber-200">
              {t(lang, error)}
            </p>
          )}
        </div>
      )}

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-sand-200/60">
        {t(lang, "We save only your last read, bookmarks and settings. No ads, nothing sold.")}{" "}
        <Link href="/privacy" className="whitespace-nowrap font-semibold text-sand-100 underline underline-offset-2 hover:text-white">
          {t(lang, "Privacy policy")}
        </Link>
      </p>
    </div>
  );
}

function SignedIn({ account, wrap }: { account: Account; wrap: string }) {
  const lang = useUiLang();
  const [confirming, setConfirming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sync = useSyncState();

  // Sign out: send what is still waiting, then keep or forget this device's copy.
  const leave = async (keep: boolean) => {
    setBusy(true);
    await flushBeforeSignOut();
    await signOut();
    if (!keep) forgetThisDevice();
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    const r = await deleteAccount();
    setBusy(false);
    if (r !== "ok") setError("Couldn't delete the account. Please try again.");
  };

  return (
    <div className={wrap}>
      <div className={cn(GROUP, "flex items-center gap-3 py-4")}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-2xl text-emerald-200">
          <UserCircleIcon />
        </span>
        <div className="min-w-0">
          {account.name && <p className="truncate text-sm font-semibold text-white">{account.name}</p>}
          <p className={cn("truncate", account.name ? "text-xs text-sand-200/80" : "text-sm font-semibold text-white")}>{account.email}</p>
          <p className="mt-0.5 text-[11px] text-emerald-200/80">
            {t(lang, account.provider === "google" ? "Signed in with Google" : "Signed in with email")}
          </p>
        </div>
      </div>

      <div className={cn(GROUP, "flex gap-3 py-3.5")}>
        <CloudSavedIcon className={cn("mt-0.5 shrink-0 text-lg", sync === "synced" ? "text-emerald-300" : "text-sand-200/70")} />
        <div className="min-w-0" aria-live="polite">
          <p className="text-sm font-semibold text-white">
            {t(lang, sync === "offline" ? "Not synced yet — will try again." : sync === "synced" ? "Synced" : "Syncing…")}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-sand-200/80">
            {t(lang, "Your last read, bookmarks and settings follow you on every device.")}
          </p>
        </div>
      </div>

      {leaving ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
          <p className="text-xs leading-relaxed text-sand-100">{t(lang, "Keep your last read and bookmarks on this device?")}</p>
          <div className="mt-3 flex flex-col gap-2">
            {[true, false].map((keep) => (
              <button
                key={String(keep)}
                type="button"
                disabled={busy}
                onClick={() => void leave(keep)}
                className={cn(
                  "h-10 rounded-full text-sm font-semibold transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60",
                  keep ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "border border-white/15 bg-white/5 text-white hover:bg-white/10",
                )}
              >
                {t(lang, keep ? "Keep on this device" : "Remove from this device")}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setLeaving(false)}
              disabled={busy}
              className="h-9 rounded-full text-xs font-semibold text-sand-200/80 hover:text-white cursor-pointer"
            >
              {t(lang, "Cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer active:scale-[0.99]"
        >
          {t(lang, "Sign out")}
          <LogoutIcon className="text-lg text-sand-200/80" />
        </button>
      )}

      {confirming ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-4">
          <p className="text-xs leading-relaxed text-red-100">
            {t(lang, "This deletes your account and everything saved with it. What is on this device stays. This can't be undone.")}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="h-10 flex-1 rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 cursor-pointer"
            >
              {t(lang, "Cancel")}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="h-10 flex-1 rounded-full bg-red-500 text-sm font-semibold text-white hover:bg-red-400 cursor-pointer disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "…" : t(lang, "Delete my account")}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-center text-xs text-amber-200">
              {t(lang, error)}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 cursor-pointer active:scale-[0.99]"
        >
          {t(lang, "Delete account")}
          <TrashIcon className="text-lg" />
        </button>
      )}

      <p className="px-2 pb-2 text-center text-[11px]">
        <Link href="/privacy" className="font-semibold text-sand-200/70 underline underline-offset-2 hover:text-white">
          {t(lang, "Privacy policy")}
        </Link>
      </p>
    </div>
  );
}

/** Settings › Account. */
/** `embedded`: inside the Profile menu's scroll, not a page of its own. */
export function AccountPage({ embedded = false }: { embedded?: boolean }) {
  const account = useAccount();
  // Signing in here (Google's pop-up) starts the sync without a page load.
  useEffect(() => startSync(), []);
  const wrap = embedded ? "space-y-2.5" : SCROLL;
  if (account === undefined) return <div className={wrap} />;
  return account ? <SignedIn account={account} wrap={wrap} /> : <SignedOut wrap={wrap} />;
}
