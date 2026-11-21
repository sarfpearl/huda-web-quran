"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, CloudSavedIcon, GoogleIcon, LogoutIcon, MailIcon, TrashIcon, UserCircleIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { t, useUiLang } from "@/lib/uiLang";
import {
  authWays,
  deleteAccount,
  getAccount,
  onAccountChange,
  sendEmailLink,
  signInWithGoogle,
  signOut,
  type Account,
  type AuthWays,
  type EmailLinkResult,
} from "@/lib/auth/account";

/*
 * Settings › Account: the optional login (docs/LOGIN_STRATEGY.md, Phase 1).
 * Guests see what signing in is for and the two ways in (Google, an email
 * link); a signed-in visitor sees the account, Sign out and Delete account
 * (in-app deletion, as the App Store asks). Auth code: lib/auth/account.
 */

const GROUP = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";
const SCROLL = "no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-2.5 text-sand-100";
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

/** The Settings list's first row: who is signed in, or what signing in is for. */
export function AccountRow({ onOpen }: { onOpen: () => void }) {
  const lang = useUiLang();
  const account = useAccount();
  const signedIn = Boolean(account);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-4 py-3.5 text-left transition-colors hover:bg-emerald-400/[0.12] cursor-pointer active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 text-xl text-emerald-200">
        {signedIn ? <CloudSavedIcon /> : <UserCircleIcon />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-white">
          {signedIn ? t(lang, "Account") : t(lang, "Save your progress across devices")}
        </span>
        <span className="mt-0.5 block truncate text-xs text-sand-200/75">
          {account === undefined ? " " : signedIn ? account?.email || account?.name : t(lang, "Optional — HuDa works fully without an account.")}
        </span>
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-sand-200/80" />
    </button>
  );
}

const TRY_AGAIN = "Something went wrong. Check your connection and try again.";
const EMAIL_ERROR: Partial<Record<EmailLinkResult, string>> = {
  invalid: "Enter a valid email address.",
  rate: "Too many tries. Please wait a minute and try again.",
  closed: "New accounts aren't open yet.",
  failed: "Something went wrong. Check your connection and try again.",
  unconfigured: "Something went wrong. Check your connection and try again.",
};

function SignedOut() {
  const lang = useUiLang();
  const [ways, setWays] = useState<AuthWays | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [sentTo, setSentTo] = useState("");
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

  return (
    <div className={SCROLL}>
      <div className={cn(GROUP, "py-4")}>
        <p className="text-base font-semibold text-white">{t(lang, "Save your progress across devices")}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-sand-200/80">
          {t(lang, "Sign in to keep your last read, bookmarks and settings on every phone and computer.")}
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
          <button
            type="button"
            onClick={google}
            disabled={!googleOn || busy !== null}
            className={cn(BIG_BTN, "border-white/15 bg-white text-slate-900 hover:bg-sand-50")}
          >
            <GoogleIcon className="text-lg" />
            {t(lang, "Continue with Google")}
          </button>
          {!googleOn && <p className="text-center text-[11px] text-sand-200/60">{t(lang, "Google sign-in isn't set up yet.")}</p>}

          <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-widest text-sand-200/40" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" />
            <MailIcon className="text-sm" />
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={send} className="space-y-2.5">
            <label className="block">
              <span className="sr-only">{t(lang, "Your email address")}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
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
          {error && (
            <p role="alert" className="text-center text-xs text-amber-200">
              {t(lang, error)}
            </p>
          )}
        </div>
      )}

      <p className="px-2 pb-2 text-center text-[11px] leading-relaxed text-sand-200/60">
        {t(lang, "We save only your last read, bookmarks and settings. No ads, nothing sold.")}{" "}
        <Link href="/privacy" className="font-semibold text-sand-100 underline underline-offset-2 hover:text-white">
          {t(lang, "Privacy policy")}
        </Link>
      </p>
    </div>
  );
}

function SignedIn({ account }: { account: Account }) {
  const lang = useUiLang();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true);
    setError("");
    const r = await deleteAccount();
    setBusy(false);
    if (r !== "ok") setError("Couldn't delete the account. Please try again.");
  };

  return (
    <div className={SCROLL}>
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
        <CloudSavedIcon className="mt-0.5 shrink-0 text-lg text-sand-200/70" />
        <p className="text-xs leading-relaxed text-sand-200/80">{t(lang, "Keeping your reading on every device is coming soon, in sha Allah.")}</p>
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer active:scale-[0.99]"
      >
        {t(lang, "Sign out")}
        <LogoutIcon className="text-lg text-sand-200/80" />
      </button>

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
export function AccountPage() {
  const account = useAccount();
  if (account === undefined) return <div className={SCROLL} />;
  return account ? <SignedIn account={account} /> : <SignedOut />;
}
