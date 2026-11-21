"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { finishSignIn, takeReturnPath } from "@/lib/auth/account";
import { UI_LANG_KEY, isRtl, isUiLang, t, type UiLang } from "@/lib/uiLang";

/*
 * /auth/callback: finishes the sign-in (the Supabase client reads the
 * `?code=`), then goes back to the page the visitor signed in from. A used or
 * expired link, or one opened in another browser, says so plainly.
 */

type State = "working" | "expired" | "other-browser" | "failed";

const MESSAGE: Record<Exclude<State, "working">, string> = {
  expired: "This sign-in link has expired or was already used. Please ask for a new one.",
  "other-browser": "Open the link in the same browser where you asked for it.",
  failed: "Something went wrong. Check your connection and try again.",
};

export function AuthCallback() {
  const [lang, setLang] = useState<UiLang>("en");
  const [state, setState] = useState<State>("working");

  useEffect(() => {
    try {
      const l = localStorage.getItem(UI_LANG_KEY);
      if (isUiLang(l)) setLang(l);
    } catch {}
    let live = true;
    void finishSignIn().then((r) => {
      if (!live) return;
      if (r === "ok") window.location.replace(takeReturnPath());
      else setState(r === "unconfigured" ? "failed" : r);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div
      data-not-found
      dir={isRtl(lang) ? "rtl" : undefined}
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[rgb(var(--background))] px-4 py-16 text-center text-[rgb(var(--foreground))]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/huda-logo.webp?v=3" alt="HuDa" width={96} height={96} className="h-24 w-24 drop-shadow-lg" />
      {state === "working" ? (
        <p role="status" className="mt-6 text-lg font-semibold">
          {t(lang, "Signing you in…")}
        </p>
      ) : (
        <>
          <p role="alert" className="mt-6 max-w-sm text-base">
            {t(lang, MESSAGE[state])}
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-full bg-primary-700 px-6 font-semibold text-sand-50 hover:bg-primary-600"
          >
            {t(lang, "Back to HuDa")}
          </Link>
        </>
      )}
    </div>
  );
}
