"use client";

import { useEffect, useState } from "react";
import { accountHint, getAccount, loginEnabled, onAccountChange, type Account } from "@/lib/auth/account";
import { OPEN_ACCOUNT_EVENT } from "@/lib/settingsEvents";
import { UserIcon } from "@/components/ui/Icon";
import { t, useUiLang } from "@/lib/uiLang";

/**
 * The header's round profile picture (owner, 2026-11-23): the Google photo
 * once signed in; before that the icon set's "user" figure in the
 * same glass circle as the other header buttons, never lit. A tap opens
 * Settings › Account.
 *
 * Guests never download the Supabase client: it is only loaded when the
 * browser already holds a session cookie (`accountHint`).
 */
export function AccountAvatar({ className = "" }: { className?: string }) {
  const lang = useUiLang();
  const [account, setAccount] = useState<Account | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const enabled = loginEnabled();

  useEffect(() => {
    if (!enabled || !accountHint()) return;
    let live = true;
    let off: (() => void) | undefined;
    void getAccount().then((a) => live && setAccount(a));
    void onAccountChange((a) => live && setAccount(a)).then((u) => {
      if (live) off = u;
      else u();
    });
    return () => {
      live = false;
      off?.();
    };
  }, [enabled]);

  useEffect(() => setPhotoFailed(false), [account?.avatarUrl]);

  if (!enabled) return null;

  const label = account ? `${t(lang, "Account")} · ${account.name || account.email}` : t(lang, "Not signed in");
  const photo = account?.avatarUrl && !photoFailed ? account.avatarUrl : "";
  const initial = account ? [...(account.name || account.email).trim()][0]?.toUpperCase() ?? "" : "";

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_ACCOUNT_EVENT))}
      data-tour="account"
      aria-label={label}
      data-tooltip={label}
      className={`pointer-events-auto relative grid h-9 w-9 min-[360px]:h-10 min-[360px]:w-10 min-[400px]:h-11 min-[400px]:w-11 sm:h-12 sm:w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-black/[0.08] backdrop-blur-[6px] border border-white/15 shadow-lg hover:bg-black/20 hover:border-white/30 active:scale-90 transition-all cursor-pointer ${className}`}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- Google's photo host, no optimiser needed
        <img
          src={photo}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : account ? (
        <span aria-hidden="true" className="text-sm sm:text-base font-semibold text-sand-100">
          {initial}
        </span>
      ) : (
        // Guest: the Hugeicons "user" figure, like the other header icons
        // (owner, 2026-11-23: from the icon set, not a drawn silhouette).
        <UserIcon aria-hidden="true" className="h-5 w-5 text-white" />
      )}
    </button>
  );
}
