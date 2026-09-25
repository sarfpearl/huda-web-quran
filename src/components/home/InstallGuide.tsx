"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const DISMISSED_KEY = "huda-install-dismissed";
// After "Not now", ask again in two weeks.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
// Let the first recitation screen settle before asking.
const SHOW_DELAY_MS = 4000;

type Platform = "ios" | "android";

// Chrome / Edge / Samsung Internet fire this before offering their own install.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectPlatform(): Platform | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return null;
}

function snoozed() {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

/**
 * Bottom sheet teaching phone users to add HuDa to their Home Screen, so it
 * opens full-screen like an app. iOS gets the Share → Add to Home Screen steps
 * (Safari has no install API); Android gets the browser's own install prompt
 * when available, otherwise the ⋮ menu steps. Never shown inside the installed app.
 */
export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;
    const p = detectPlatform();
    if (!p) return;
    setPlatform(p);

    const onPrompt = (ev: Event) => {
      ev.preventDefault();
      setInstallEvent(ev as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") setOpen(false);
    else dismiss();
  };

  const steps =
    platform === "ios"
      ? [
          {
            icon: <DotsIcon />,
            en: "Tap ••• at the bottom (or the Share button), then Share",
            ta: "கீழே உள்ள ••• (அல்லது Share பொத்தான்) ஐத் தொட்டு, பின் Share ஐத் தொடவும்",
          },
          {
            icon: <PlusSquareIcon />,
            en: "Tap “Add to Home Screen” — it may be under View More",
            ta: "“Add to Home Screen” ஐத் தொடவும் — View More-இல் இருக்கலாம்",
          },
          {
            icon: <ToggleIcon />,
            en: "Keep “Open as Web App” on, then tap Add",
            ta: "“Open as Web App” இயக்கத்தில் இருக்கட்டும், பின் Add ஐத் தொடவும்",
          },
        ]
      : [
          {
            icon: <KebabIcon />,
            en: "Tap the ⋮ menu at the top right",
            ta: "மேலே வலதுபுறம் உள்ள ⋮ மெனுவைத் தொடவும்",
          },
          {
            icon: <PlusSquareIcon />,
            en: "Tap “Add to Home screen” or “Install app”",
            ta: "“Add to Home screen” அல்லது “Install app” ஐத் தொடவும்",
          },
          {
            icon: <CheckIcon />,
            en: "Confirm with Install / Add",
            ta: "Install / Add ஐத் தொட்டு உறுதிசெய்யவும்",
          },
        ];

  return (
    <AnimatePresence>
      {open && platform && (
        <>
          <motion.div
            key="install-scrim"
            className="absolute inset-0 z-[60] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            aria-hidden="true"
          />
          <motion.div
            key="install-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
            className="absolute inset-x-0 bottom-0 z-[61] mx-auto w-full max-w-[480px] px-3 pb-[calc(max(env(safe-area-inset-bottom),var(--vv-bottom,0px))+0.75rem)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="rounded-3xl border border-white/10 bg-slate-950/90 backdrop-blur-xl p-5 text-sand-50 shadow-[0_-12px_40px_rgba(0,0,0,0.6)]">
              <div className="flex items-start gap-3.5">
                <img src="/icon.svg" alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <h2 id="install-guide-title" className="text-base font-semibold leading-snug">
                    Add HuDa to your Home Screen
                  </h2>
                  <p className="font-tamil text-sm text-sand-200/90 leading-snug">
                    HuDa-வை முகப்புத் திரையில் சேர்க்கவும்
                  </p>
                  <p className="mt-1 text-xs text-sand-300/80 leading-snug">
                    Opens full-screen like an app — one tap to listen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Close"
                  className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sand-300 hover:bg-white/10"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {installEvent ? (
                <button
                  type="button"
                  onClick={install}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  <PlusSquareIcon />
                  Install app · <span className="font-tamil">நிறுவவும்</span>
                </button>
              ) : (
                <ol className="mt-5 space-y-3">
                  {steps.map((s, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-emerald-400">
                        {s.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="mr-1.5 text-emerald-400 font-semibold">{i + 1}.</span>
                          {s.en}
                        </p>
                        <p className="font-tamil text-xs text-sand-300/85 leading-snug">{s.ta}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="mt-4 h-11 w-full rounded-full border border-white/15 text-sm text-sand-100 hover:bg-white/10"
              >
                {installEvent ? "Not now" : "Got it"} ·{" "}
                <span className="font-tamil">{installEvent ? "பிறகு" : "சரி"}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const iconProps = {
  className: "h-5 w-5",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function DotsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

function PlusSquareIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function ToggleIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="7" width="20" height="10" rx="5" />
      <circle cx="17" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
