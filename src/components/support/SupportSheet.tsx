"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { ChevronRightIcon, CloseIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { isRtl, t, useUiLang } from "@/lib/uiLang";
import { qrMatrix } from "@/lib/qr";
import {
  OPEN_SUPPORT_EVENT,
  SUPPORT_KOFI_URL,
  SUPPORT_UPI_ID,
  SUPPORT_WAY_KEY,
  UPI_AMOUNTS,
  defaultSupportWay,
  kofiConfigured,
  supportEnabled,
  upiConfigured,
  upiLink,
  type SupportWay,
} from "@/lib/support";
import { recordSupportTap } from "@/lib/supportTaps";
import { GiftMark } from "./SupportGift";

/*
 * "Help keep HuDa free": the app's own action sheet, then two ways to give — UPI for India
 * (QR on a computer, the UPI app on a phone) and Ko-fi for everyone else.
 * HuDa only builds the link; the money goes straight from the visitor's app
 * or Ko-fi to the owner. Opens from Settings or the gift tab, never by itself.
 */

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

/** A phone or tablet — where `upi://` opens the UPI app (GPay, PhonePe…). */
function isHandheld(): boolean {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function QrCode({ text }: { text: string }) {
  const path = useMemo(() => {
    const m = qrMatrix(text);
    let d = "";
    m.forEach((row, y) => row.forEach((dark, x) => dark && (d += `M${x + 4} ${y + 4}h1v1h-1z`)));
    return { d, size: m.length + 8 };
  }, [text]);
  return (
    <svg viewBox={`0 0 ${path.size} ${path.size}`} className="h-full w-full" shapeRendering="crispEdges" role="img" aria-label="UPI QR">
      <rect width={path.size} height={path.size} fill="#fbf9f4" />
      <path d={path.d} fill="#0e100f" />
    </svg>
  );
}

/** The one payment way that is set up, when only one is; else null. */
function onlyWay(): SupportWay | null {
  const upi = upiConfigured();
  if (upi === kofiConfigured()) return null;
  return upi ? "upi" : "kofi";
}

export function SupportSheet() {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [way, setWay] = useState<SupportWay>("upi");
  const [amount, setAmount] = useState<number | null>(null);
  const [handheld, setHandheld] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    const onOpen = () => {
      if (!supportEnabled()) return;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(SUPPORT_WAY_KEY);
      } catch {
        /* private mode */
      }
      // Only one way set up (e.g. Ko-fi still pending) → just that way, no switch.
      const only = onlyWay();
      setWay(only ?? (saved === "upi" || saved === "kofi" ? saved : defaultSupportWay()));
      setHandheld(isHandheld());
      setShowQr(false);
      setCopied(false);
      setThanked(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const chooseWay = (w: SupportWay) => {
    setWay(w);
    setThanked(false);
    store(SUPPORT_WAY_KEY, w);
  };
  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_UPI_ID);
      setCopied(true);
      recordSupportTap("upi_copy");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the ID is on screen to copy by hand */
    }
  };

  const upiReady = upiConfigured();
  // Counted once each time the QR comes on screen (admin dashboard).
  const qrShown = open && way === "upi" && upiReady && (!handheld || showQr);
  useEffect(() => {
    if (qrShown) recordSupportTap("upi_qr");
  }, [qrShown]);
  const kofiReady = kofiConfigured();
  const single = onlyWay();
  const link = upiReady ? upiLink(amount ?? undefined) : "";
  const rtl = isRtl(lang);
  return (
    <ActionSheet open={open} onClose={close} labelledBy="support-title">
      <div dir={rtl ? "rtl" : undefined} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1">
        <div className="flex items-center justify-between gap-3 pb-1">
          <h2 id="support-title" className="flex items-center gap-2 text-base font-bold text-white">
            <GiftMark className="h-[18px] w-[18px] text-amber-200" strokeWidth={2} />
            {t(lang, "Help keep HuDa free")}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t(lang, "Close")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sand-300 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
          >
            <CloseIcon className="text-sm" />
          </button>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-sand-200/85">
          {t(lang, "HuDa is free for everyone — no ads, no sign-up, nothing locked. If it has been a companion to you, you can help pay for its servers, recitations and videos.")}
        </p>
        <p className="mt-1.5 text-xs italic leading-snug text-amber-200/60">
          {t(lang, "A gift, not a purchase: nothing extra is unlocked in return.")}
        </p>
            {/* Way to give — only when both ways are set up */}
            {!single && (
              <div
                role="radiogroup"
                aria-label={t(lang, "Way to give")}
                className="relative mt-4 grid grid-cols-2 rounded-full bg-white/[0.06] p-1"
              >
                {(["upi", "kofi"] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    role="radio"
                    aria-checked={way === w}
                    onClick={() => chooseWay(w)}
                    className={cn(
                      "relative z-[1] flex flex-col items-center rounded-full px-2 py-1.5 leading-tight transition-colors",
                      way === w ? "text-charcoal-950" : "text-sand-200/80 hover:text-sand-50",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-0 -z-[1] rounded-full bg-amber-200/90 transition-opacity duration-300",
                        way === w ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden="true"
                    />

                    <span className="text-[13px] font-semibold">{t(lang, w === "upi" ? "India" : "Other countries")}</span>
                    <span className="text-[10.5px] opacity-75">{w === "upi" ? "UPI" : "Ko-fi"}</span>
                  </button>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={way}
                initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -6 }}
                transition={{ duration: 0.22 }}
                className="mt-4"
              >
                {way === "upi" ? (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sand-200/60">{t(lang, "Amount")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[null, ...UPI_AMOUNTS].map((a) => (
                        <button
                          key={a ?? "any"}
                          type="button"
                          aria-pressed={amount === a}
                          onClick={() => setAmount(a)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[13px] tabular-nums transition-colors",
                            amount === a
                              ? "border-amber-300/70 bg-amber-300/15 text-amber-100"
                              : "border-white/10 bg-white/[0.04] text-sand-200/85 hover:bg-white/10",
                          )}
                        >
                          {a === null ? t(lang, "Your choice") : `₹${a}`}
                        </button>
                      ))}
                    </div>

                    {handheld && (
                      <a
                        href={upiReady ? link : undefined}
                        aria-disabled={!upiReady}
                        onClick={() => {
                          if (!upiReady) return;
                          setThanked(true);
                          recordSupportTap("upi_app");
                        }}
                        className={cn(
                          "mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition",
                          upiReady
                            ? "bg-amber-200/90 text-black hover:bg-amber-200 active:scale-[0.99]"
                            : "cursor-not-allowed bg-white/10 text-sand-200/50",
                        )}
                      >
                        <GiftMark className="h-[18px] w-[18px]" strokeWidth={2.4} />
                        {t(lang, "Pay with a UPI app")}
                      </a>
                    )}

                    {(!handheld || showQr) && upiReady && (
                      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                        <div className="h-[132px] w-[132px] shrink-0 overflow-hidden rounded-xl">
                          <QrCode text={link} />
                        </div>
                        <p className="text-[13px] leading-snug text-sand-200/85">{t(lang, "Scan with any UPI app")}</p>
                      </div>
                    )}
                    {handheld && !showQr && upiReady && (
                      <button
                        type="button"
                        onClick={() => setShowQr(true)}
                        className="mt-2 w-full py-1.5 text-center text-[12.5px] text-amber-200/80 underline-offset-4 hover:underline"
                      >
                        {t(lang, "Show QR code")}
                      </button>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-black/25 py-2 ps-3.5 pe-1.5">
                      <div className="min-w-0">
                        <p className="text-[10.5px] uppercase tracking-[0.12em] text-sand-200/55">{t(lang, "UPI ID")}</p>
                        <p dir="ltr" className="truncate font-mono text-[13.5px] text-sand-50">
                          {upiReady ? SUPPORT_UPI_ID : t(lang, "Not set up yet")}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!upiReady}
                        onClick={copyUpi}
                        className="h-9 shrink-0 rounded-full border border-white/15 px-3.5 text-[12.5px] font-medium text-sand-100 transition-colors hover:bg-white/10 disabled:opacity-40"
                      >
                        {t(lang, copied ? "Copied" : "Copy")}
                      </button>
                    </div>
                    <p className="mt-2 text-center text-[11.5px] text-emerald-200/70">{t(lang, "Straight to the bank account, no fee.")}</p>
                  </div>
                ) : (
                  <div>
                    <a
                      href={kofiReady ? SUPPORT_KOFI_URL : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-disabled={!kofiReady}
                      onClick={() => {
                        if (!kofiReady) return;
                        setThanked(true);
                        recordSupportTap("kofi");
                      }}
                      className={cn(
                        "flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-bold transition",
                        kofiReady
                          ? "bg-amber-200/90 text-black hover:bg-amber-200 active:scale-[0.99]"
                          : "cursor-not-allowed bg-white/10 text-sand-200/50",
                      )}
                    >
                      <GiftMark className="h-[18px] w-[18px]" strokeWidth={2.4} />
                      {kofiReady ? t(lang, "Open Ko-fi") : t(lang, "Not set up yet")}
                      {kofiReady && (
                        <svg className="h-4 w-4 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M7 17L17 7M9 7h8v8" />
                        </svg>
                      )}
                    </a>
                    <p className="mt-3 text-center text-[12px] leading-relaxed text-sand-200/70">
                      {t(lang, "Card or PayPal, on Ko-fi's own page. Ko-fi keeps no fee on one-time gifts; the card or PayPal company takes a small part.")}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {thanked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden text-center"
                >
                  <p lang="ar" dir="rtl" className="mt-4 font-arabic text-[22px] leading-none text-amber-200">
                    جَزَاكَ ٱللَّٰهُ خَيْرًا
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-sand-200/80">{t(lang, "May Allah reward you with good.")}</p>
                </motion.div>
            )}

            <div className="mt-5 border-t border-white/10 pt-3 text-center">
              <p className="text-[11px] text-sand-200/50">{t(lang, "HuDa never sees your payment details.")}</p>
            </div>
      </div>
    </ActionSheet>
  );
}

/** Settings row: "Support HuDa" — opens the sheet once Settings has closed. */
export function SupportSettingsRow({ onLeave }: { onLeave: (event: string) => void }) {
  const lang = useUiLang();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => setEnabled(supportEnabled()), []);
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={() => onLeave(OPEN_SUPPORT_EVENT)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-300/25 bg-[radial-gradient(140%_120%_at_0%_50%,rgba(252,211,77,0.12),transparent_60%)] px-4 py-3.5 text-left transition-colors hover:bg-amber-300/10 cursor-pointer active:scale-[0.99]"
    >
      <span className="flex items-center gap-2.5 text-sm font-semibold text-amber-100">
        <GiftMark className="h-5 w-5 text-amber-300" />
        {t(lang, "Support HuDa")}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-sand-200/80 rtl:-scale-x-100" />
    </button>
  );
}
