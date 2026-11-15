"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { isRtl, t, useUiLang } from "@/lib/uiLang";
import { useDialogFocus } from "@/lib/useDialogFocus";
import { useBackToClose } from "@/lib/useBackToClose";
import { useOnlyOneSheet } from "@/lib/useOnlyOneSheet";
import { qrMatrix } from "@/lib/qr";
import {
  OPEN_SUPPORT_EVENT,
  SUPPORT_KOFI_URL,
  SUPPORT_LAST_OPENED_KEY,
  SUPPORT_STAR_HIDDEN_KEY,
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
import { StarMark, SUPPORT_STAR_CHANGED_EVENT } from "./SupportStar";

/*
 * "Help keep HuDa free": a small night sky. The eight-point star draws itself
 * in gold over a field of faint stars, then two ways to give — UPI for India
 * (QR on a computer, the UPI app on a phone) and Ko-fi for everyone else.
 * HuDa only builds the link; the money goes straight from the visitor's app
 * or Ko-fi to the owner. Opens from Settings or the edge star, never by itself.
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

/** Faint stars scattered over the sheet's sky — fixed, so they don't jump between opens. */
const SKY = [
  [8, 12, 1], [21, 5, 0.6], [34, 18, 0.8], [47, 7, 0.5], [62, 14, 1], [76, 4, 0.7], [90, 16, 0.9],
  [5, 34, 0.6], [94, 38, 0.6], [14, 52, 0.5], [86, 58, 0.8], [3, 74, 0.7], [97, 82, 0.5], [12, 92, 0.6], [82, 95, 0.7],
] as const;

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

export function SupportSheet() {
  const lang = useUiLang();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  // Kept mounted while it slides out; unmounted on a timer rather than by
  // AnimatePresence, whose exit never finished here (the dialog stayed in the DOM).
  const [mounted, setMounted] = useState(false);
  const [way, setWay] = useState<SupportWay>("upi");
  const [amount, setAmount] = useState<number | null>(null);
  const [handheld, setHandheld] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thanked, setThanked] = useState(false);
  const [starHidden, setStarHidden] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOpen = () => {
      if (!supportEnabled()) return;
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(SUPPORT_WAY_KEY);
        setStarHidden(localStorage.getItem(SUPPORT_STAR_HIDDEN_KEY) === "1");
      } catch {
        /* private mode */
      }
      setWay(saved === "upi" || saved === "kofi" ? saved : defaultSupportWay());
      setHandheld(isHandheld());
      setShowQr(false);
      setCopied(false);
      setThanked(false);
      setOpen(true);
      setMounted(true);
      store(SUPPORT_LAST_OPENED_KEY, String(Date.now()));
      window.dispatchEvent(new Event(SUPPORT_STAR_CHANGED_EVENT));
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpen);
  }, []);

  const close = () => setOpen(false);
  useEffect(() => {
    if (open || !mounted) return;
    const id = window.setTimeout(() => setMounted(false), 450);
    return () => window.clearTimeout(id);
  }, [open, mounted]);
  useDialogFocus(open, sheetRef);
  useBackToClose(open, close);
  useOnlyOneSheet(open, close);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const chooseWay = (w: SupportWay) => {
    setWay(w);
    setThanked(false);
    store(SUPPORT_WAY_KEY, w);
  };
  const hideStar = () => {
    store(SUPPORT_STAR_HIDDEN_KEY, "1");
    setStarHidden(true);
    window.dispatchEvent(new Event(SUPPORT_STAR_CHANGED_EVENT));
  };
  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the ID is on screen to copy by hand */
    }
  };

  const upiReady = upiConfigured();
  const kofiReady = kofiConfigured();
  const link = upiReady ? upiLink(amount ?? undefined) : "";
  const rtl = isRtl(lang);
  // The star's two squares draw in, one after the other.
  const draw = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { duration: 1.6, delay, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.2, delay } },
        };

  if (!mounted) return null;
  return (
    <>
      <motion.div
        key="support-scrim"
        className={cn("absolute inset-0 z-[60] bg-black/60", !open && "pointer-events-none")}
        initial={{ opacity: 0 }}
        animate={{ opacity: open ? 1 : 0 }}
        onClick={close}
        aria-hidden="true"
      />
      <motion.div
        key="support-sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-title"
        dir={rtl ? "rtl" : undefined}
        className="absolute inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-[440px] px-3 outline-none pb-[calc(max(env(safe-area-inset-bottom),var(--vv-bottom,0px))+0.75rem)] md:inset-y-0 md:flex md:items-center md:pb-0"
        initial={reduce ? { opacity: 0 } : { y: "100%", opacity: 1 }}
        animate={open ? { y: 0, opacity: 1 } : reduce ? { opacity: 0 } : { y: "110%", opacity: 1 }}
        transition={open ? { type: "spring", damping: 30, stiffness: 300 } : { duration: 0.35, ease: [0.4, 0, 1, 1] }}
      >
        <div className="relative max-h-[calc(var(--vv-height,100dvh)-1.5rem)] w-full overflow-y-auto overscroll-contain no-scrollbar rounded-[30px] border border-amber-200/15 bg-[radial-gradient(120%_70%_at_50%_0%,#123b30_0%,#0a1f19_45%,#060c0a_100%)] text-sand-50 shadow-[0_30px_80px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(252,211,77,0.12)]">
          {/* The sky */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden" aria-hidden="true">
            {SKY.map(([x, y, o], i) => (
              <motion.span
                key={i}
                className="absolute h-[2px] w-[2px] rounded-full bg-amber-100"
                style={{ left: `${x}%`, top: `${y}%` }}
                initial={{ opacity: 0 }}
                animate={reduce ? { opacity: o * 0.6 } : { opacity: [o * 0.25, o * 0.8, o * 0.25] }}
                transition={reduce ? { duration: 0.6 } : { duration: 3 + (i % 4), repeat: Infinity, delay: (i % 5) * 0.4 }}
              />
            ))}
            <div className="absolute left-1/2 top-6 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-300/10 blur-3xl" />
          </div>

          <button
            type="button"
            onClick={close}
            aria-label={t(lang, "Close")}
            className="absolute end-2 top-2 z-10 grid h-11 w-11 place-items-center rounded-full text-sand-300 transition-colors hover:bg-white/10"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div className="relative px-5 pb-5 pt-7">
            {/* The star, drawn */}
            <svg viewBox="0 0 64 64" className="mx-auto h-16 w-16 text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.45)]" fill="none" aria-hidden="true">
              <motion.rect x="15" y="15" width="34" height="34" rx="3.5" stroke="currentColor" strokeWidth="1.6" {...draw(0.15)} />
              <motion.rect x="15" y="15" width="34" height="34" rx="3.5" stroke="currentColor" strokeWidth="1.6" transform="rotate(45 32 32)" strokeOpacity={0.6} {...draw(0.7)} />
              <motion.circle
                cx="32"
                cy="32"
                r="3.5"
                fill="currentColor"
                initial={reduce ? { opacity: 0 } : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: reduce ? 0 : 1.9, duration: 0.5 }}
                style={{ transformOrigin: "32px 32px" }}
              />
            </svg>

            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : 0.35, duration: 0.6 }}
              className="mt-3 text-center"
            >
              <h2 id="support-title" className="text-[21px] font-semibold leading-tight tracking-[-0.01em] text-amber-50">
                {t(lang, "Help keep HuDa free")}
              </h2>
              <p className="mx-auto mt-2.5 max-w-[34ch] text-[13.5px] leading-relaxed text-sand-200/85">
                {t(lang, "HuDa is free for everyone — no ads, no sign-up, nothing locked. If it has been a companion to you, you can help pay for its servers, recitations and videos.")}
              </p>
              <p className="mx-auto mt-2 max-w-[36ch] text-[11.5px] italic leading-snug text-amber-200/60">
                {t(lang, "A gift, not a purchase: nothing extra is unlocked in return.")}
              </p>
            </motion.div>

            {/* Way to give */}
            <div
              role="radiogroup"
              aria-label={t(lang, "Way to give")}
              className="relative mt-5 grid grid-cols-2 rounded-full border border-white/10 bg-black/30 p-1"
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
                      "absolute inset-0 -z-[1] rounded-full bg-gradient-to-b from-amber-200 to-amber-400 shadow-[0_0_18px_rgba(252,211,77,0.35)] transition-opacity duration-300",
                      way === w ? "opacity-100" : "opacity-0",
                    )}
                    aria-hidden="true"
                  />

                  <span className="text-[13px] font-semibold">{t(lang, w === "upi" ? "India" : "Other countries")}</span>
                  <span className="text-[10.5px] opacity-75">{w === "upi" ? "UPI" : "Ko-fi"}</span>
                </button>
              ))}
            </div>

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
                        onClick={() => upiReady && setThanked(true)}
                        className={cn(
                          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-transform",
                          upiReady
                            ? "bg-gradient-to-b from-amber-200 to-amber-400 text-charcoal-950 shadow-[0_8px_24px_rgba(252,211,77,0.25)] active:scale-[0.98]"
                            : "cursor-not-allowed bg-white/10 text-sand-200/50",
                        )}
                      >
                        <StarMark className="h-4 w-4" strokeWidth={4} />
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
                      onClick={() => kofiReady && setThanked(true)}
                      className={cn(
                        "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-transform",
                        kofiReady
                          ? "bg-gradient-to-b from-amber-200 to-amber-400 text-charcoal-950 shadow-[0_8px_24px_rgba(252,211,77,0.25)] active:scale-[0.98]"
                          : "cursor-not-allowed bg-white/10 text-sand-200/50",
                      )}
                    >
                      <StarMark className="h-4 w-4" strokeWidth={4} />
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
              {starHidden ? (
                <p className="mt-1.5 text-[11.5px] text-sand-200/50">{t(lang, "Star hidden")}</p>
              ) : (
                <button
                  type="button"
                  onClick={hideStar}
                  title={t(lang, "The star at the screen's edge won't show again. Support stays in Settings.")}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] text-sand-200/60 transition-colors hover:bg-white/5 hover:text-sand-100"
                >
                  <StarMark className="h-3 w-3" strokeWidth={4} />
                  {t(lang, "Hide the star")}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </>
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
        <StarMark className="h-[18px] w-[18px] text-amber-300" />
        {t(lang, "Support HuDa")}
      </span>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-sand-200/80 rtl:-scale-x-100" />
    </button>
  );
}
