"use client";

import { useEffect, useRef, useState } from "react";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { CloseIcon, ImageIcon } from "@/components/ui/Icon";
import { t, isRtl, useUiLang } from "@/lib/uiLang";
import { cn } from "@/lib/utils";
import {
  FEEDBACK_KINDS,
  FEEDBACK_MAX_CHARS,
  captureScreen,
  sendFeedback,
  shrinkImageFile,
  type FeedbackKind,
} from "@/lib/feedback";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "error"; text: string };

/**
 * The feedback form behind the lantern: type, message, an optional
 * screenshot (this screen, or an image from the device), Send. Loaded only
 * once the lantern is tapped open. Sent: the sheet closes at once and the
 * home screen shows a thank-you toast (FeedbackLantern).
 */
export default function FeedbackSheet({
  open,
  onClose,
  onSent,
  captureRoot,
}: {
  open: boolean;
  onClose: () => void;
  /** Sent; false when the attached screenshot didn't upload. */
  onSent: (screenshotUploaded: boolean) => void;
  /** The scene to draw for "Attach this screen". */
  captureRoot: () => HTMLElement | null;
}) {
  const lang = useUiLang();
  const [kind, setKind] = useState<FeedbackKind>("issue");
  const [message, setMessage] = useState("");
  const [shot, setShot] = useState<Blob | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shot) return setShotUrl(null);
    const url = URL.createObjectURL(shot);
    setShotUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shot]);

  const attachScreen = async () => {
    const root = captureRoot();
    if (!root || capturing) return;
    setCapturing(true);
    setShotError(null);
    try {
      const blob = await captureScreen(root);
      if (blob) setShot(blob);
      else setShotError(t(lang, "Couldn't capture the screen. Choose an image instead."));
    } catch {
      setShotError(t(lang, "Couldn't capture the screen. Choose an image instead."));
    } finally {
      setCapturing(false);
    }
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setShotError(null);
    const blob = await shrinkImageFile(file);
    if (blob) setShot(blob);
    else setShotError(t(lang, "That image can't be used. Try another one."));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || status.kind === "sending") return;
    setStatus({ kind: "sending" });
    const res = await sendFeedback({ kind, message, screenshot: shot, uiLang: lang });
    if (res.ok) {
      onSent(!shot || res.screenshotUploaded);
      // The next opening starts with an empty form.
      setMessage("");
      setShot(null);
      setKind("issue");
      setStatus({ kind: "idle" });
      return;
    }
    setStatus({
      kind: "error",
      text:
        res.error === "rate_limited"
          ? t(lang, "You've sent a lot of feedback just now. Please try again later.")
          : res.error === "unavailable"
            ? t(lang, "Feedback isn't available right now.")
            : t(lang, "Couldn't send. Please try again."),
    });
  };

  const busy = status.kind === "sending";

  return (
    <ActionSheet
      open={open}
      onClose={onClose}
      label={t(lang, "Send feedback")}
      noAutoClose
      header={
        <div dir={isRtl(lang) ? "rtl" : undefined} className="px-1 pb-2">
        <div className="flex items-center justify-between gap-3 pb-1">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <span aria-hidden="true" className="text-amber-200">✦</span>
            {t(lang, "Send feedback")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(lang, "Close feedback")}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-sand-300 hover:text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
          >
            <CloseIcon className="text-sm" />
          </button>
        </div>
        </div>
      }
    >
      <div dir={isRtl(lang) ? "rtl" : undefined} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-1">
          <form onSubmit={submit} className="space-y-3.5 pb-1">
            <p className="text-sm leading-relaxed text-sand-200/85">
              {t(lang, "Found an issue, or have an idea to improve the app? Tell me.")}
            </p>

            <div role="radiogroup" aria-label={t(lang, "Feedback type")} className="flex gap-1.5 rounded-full bg-white/[0.06] p-1">
              {FEEDBACK_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === k.id}
                  onClick={() => setKind(k.id)}
                  className={cn(
                    "flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                    kind === k.id ? "bg-amber-200/90 text-black" : "text-sand-200/80 hover:text-white",
                  )}
                >
                  {t(lang, k.label)}
                </button>
              ))}
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={FEEDBACK_MAX_CHARS}
              rows={4}
              required
              aria-label={t(lang, "What happened, or what would make it better?")}
              placeholder={t(lang, "What happened, or what would make it better?")}
              // 16px: iOS zooms the page into smaller text fields.
              className="block w-full resize-none rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-base text-white placeholder:text-sand-200/40 focus:border-amber-200/50 focus:outline-none"
            />

            <div className="space-y-2">
              <p className="text-xs font-semibold text-sand-200/70">{t(lang, "Screenshot")}</p>
              {shotUrl ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview */}
                  <img src={shotUrl} alt={t(lang, "Screenshot")} className="max-h-40 rounded-xl border border-white/15" />
                  <button
                    type="button"
                    onClick={() => setShot(null)}
                    aria-label={t(lang, "Remove screenshot")}
                    className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-white/20 bg-black/80 text-sand-100 hover:text-white cursor-pointer"
                  >
                    <CloseIcon className="text-xs" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void attachScreen()}
                    disabled={capturing}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-sand-100 hover:bg-white/20 disabled:opacity-60 cursor-pointer"
                  >
                    <ScreenIcon />
                    {capturing ? t(lang, "Capturing…") : t(lang, "Attach this screen")}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold text-sand-100 hover:bg-white/20 cursor-pointer"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t(lang, "Choose an image")}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      void pickImage(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
              {shotError && <p className="text-xs text-amber-300" role="alert">{shotError}</p>}
            </div>

            {status.kind === "error" && <p className="text-xs text-amber-300" role="alert">{status.text}</p>}

            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="w-full rounded-full bg-amber-200/90 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-200 disabled:opacity-50 cursor-pointer active:scale-[0.99] transition"
            >
              {busy ? t(lang, "Sending…") : t(lang, "Send")}
            </button>
          </form>
      </div>
    </ActionSheet>
  );
}

function ScreenIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10 18.5h4" />
    </svg>
  );
}
