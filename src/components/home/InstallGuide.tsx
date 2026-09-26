"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PLAYER_GLASS } from "@/components/ui/ActionSheet";

const DISMISSED_KEY = "huda-install-dismissed";
// After "Not now", ask again in two weeks.
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;
// Let the first recitation screen settle before asking.
const SHOW_DELAY_MS = 4000;
// How long each animated step stays on screen.
const STEP_MS = 3200;
// Fired by InstallGuideButton to bring the guide back after "Got it".
const OPEN_EVENT = "huda:install-guide";

// Chrome / Edge / Samsung Internet fire this before offering their own install.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/*
 * The browser's install prompt, captured once for the whole page as early as
 * possible (it can fire before the home scene mounts) and shared by the guide
 * and the strip icon. It can be shown only once, so it is dropped after use.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
const notifyPrompt = () => promptListeners.forEach((fn) => fn());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (ev) => {
    ev.preventDefault(); // our icon / sheet replaces Chrome's mini-infobar
    deferredPrompt = ev as BeforeInstallPromptEvent;
    notifyPrompt();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyPrompt();
  });
}

function useInstallPrompt() {
  return useSyncExternalStore(
    (fn) => {
      promptListeners.add(fn);
      return () => promptListeners.delete(fn);
    },
    () => deferredPrompt,
    () => null,
  );
}

/** Opens the browser's own Install dialog; resolves true when the user accepts. */
async function promptInstall(): Promise<boolean> {
  const ev = deferredPrompt;
  if (!ev) return false;
  deferredPrompt = null;
  notifyPrompt();
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome === "accepted";
}

/** The browser toolbar drawn in the phone mockup — each puts its menu button somewhere else. */
type Chrome =
  | "safari26" // iOS 26 Safari: floating bar, long-press the address pill
  | "safari" // older Safari: toolbar with Share in the middle
  | "chromeIOS" // Share in the address bar
  | "firefoxIOS" // ☰ at the bottom right
  | "edge" // ••• in the middle of the bottom bar
  | "chromeAndroid" // ⋮ at the top right
  | "samsung" // ≡ at the bottom right
  | "inapp"; // Instagram / Facebook / … webview: ⋯ at the top right

type Scene =
  | { kind: "tap"; hold?: boolean } // tap (or press and hold) the toolbar button
  | { kind: "menu"; at: "top" | "bottom" | "bottomLeft" | "sheet"; items: string[]; hi: number }
  | { kind: "shareSheet" } // iOS 26 share sheet: tap View More
  | { kind: "confirm"; style: "ios" | "iosWebApp" | "android" }
  | { kind: "done" };

interface Step {
  scene: Scene;
  en: string;
  ta: string;
}

interface Env {
  device: string; // "iPhone" | "iPad" | "Android"
  browser: string; // shown to the user, e.g. "Safari"
  chrome: Chrome;
  steps: Step[];
}

const DONE: Step = {
  scene: { kind: "done" },
  en: "Done! Open HuDa from your Home Screen",
  ta: "முடிந்தது! முகப்புத் திரையிலிருந்து HuDa-வைத் திறக்கவும்",
};

const IOS_SHARE_SHEET: Step = {
  scene: { kind: "menu", at: "sheet", items: ["Copy", "Add to Bookmarks", "Add to Favorites", "Add to Home Screen"], hi: 3 },
  en: "Tap “Add to Home Screen” — scroll or tap View More if needed",
  ta: "“Add to Home Screen” ஐத் தொடவும் — தேவையெனில் கீழே நகர்த்தவும் / View More",
};

const IOS_ADD: Step = {
  scene: { kind: "confirm", style: "ios" },
  en: "Tap Add at the top right",
  ta: "மேலே வலதுபுறம் உள்ள Add ஐத் தொடவும்",
};

const ANDROID_ADD: Step = {
  scene: { kind: "confirm", style: "android" },
  en: "Tap Install / Add to confirm",
  ta: "Install / Add ஐத் தொட்டு உறுதிசெய்யவும்",
};

const IN_APP = /FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Snapchat|musical_ly|BytedanceWebview|Twitter/i;

function detectEnv(): Env | null {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac; touch points give it away.
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const ios = ipad || /iPhone|iPod/.test(ua);
  const android = /Android/.test(ua);
  if (!ios && !android) return null;
  const device = ios ? (ipad ? "iPad" : "iPhone") : "Android";
  const home = ios ? "Safari" : "Chrome";

  if (IN_APP.test(ua)) {
    const app = ua.match(/Instagram|Snapchat|LinkedIn|Line|Twitter/i)?.[0] ?? "Facebook";
    return {
      device,
      browser: `${app} app`,
      chrome: "inapp",
      steps: [
        {
          scene: { kind: "tap" },
          en: `Apps can't be added from inside ${app}. Tap ⋯ at the top right`,
          ta: `${app}-க்குள் இருந்து சேர்க்க முடியாது. மேலே வலதுபுறம் உள்ள ⋯ ஐத் தொடவும்`,
        },
        {
          scene: { kind: "menu", at: "top", items: ["Copy link", `Open in ${home}`, "Report"], hi: 1 },
          en: `Tap “Open in ${home}” — this guide shows there`,
          ta: `“Open in ${home}” ஐத் தொடவும் — அங்கே இந்த வழிகாட்டி வரும்`,
        },
      ],
    };
  }

  if (ios) {
    if (/CriOS/.test(ua)) {
      return {
        device,
        browser: "Chrome",
        chrome: "chromeIOS",
        steps: [
          { scene: { kind: "tap" }, en: "Tap the Share button in the address bar", ta: "முகவரிப் பட்டையில் உள்ள Share பொத்தானைத் தொடவும்" },
          IOS_SHARE_SHEET,
          IOS_ADD,
          DONE,
        ],
      };
    }
    if (/FxiOS/.test(ua)) {
      return {
        device,
        browser: "Firefox",
        chrome: "firefoxIOS",
        steps: [
          { scene: { kind: "tap" }, en: "Tap the ☰ menu at the bottom right", ta: "கீழே வலதுபுறம் உள்ள ☰ மெனுவைத் தொடவும்" },
          { scene: { kind: "menu", at: "bottom", items: ["Bookmarks", "History", "Share"], hi: 2 }, en: "Tap Share", ta: "Share ஐத் தொடவும்" },
          IOS_SHARE_SHEET,
          IOS_ADD,
          DONE,
        ],
      };
    }
    if (/EdgiOS/.test(ua)) {
      return {
        device,
        browser: "Edge",
        chrome: "edge",
        steps: [
          { scene: { kind: "tap" }, en: "Tap ••• in the middle of the bottom bar", ta: "கீழ்ப் பட்டையின் நடுவில் உள்ள ••• ஐத் தொடவும்" },
          { scene: { kind: "menu", at: "sheet", items: ["Add to favorites", "Share", "Settings"], hi: 1 }, en: "Tap Share", ta: "Share ஐத் தொடவும்" },
          IOS_SHARE_SHEET,
          IOS_ADD,
          DONE,
        ],
      };
    }
    // Safari. iOS 26 freezes the OS version in the UA; Safari's own Version/ still moves.
    const safariMajor = Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0);
    if (safariMajor >= 26) {
      return {
        device,
        browser: "Safari",
        chrome: "safari26",
        steps: [
          {
            scene: { kind: "tap", hold: true },
            en: "Press and hold the address bar at the bottom",
            ta: "கீழே உள்ள முகவரிப் பட்டையை அழுத்திப் பிடிக்கவும்",
          },
          {
            scene: { kind: "menu", at: "bottomLeft", items: ["Translate", "Share", "Add to Bookmarks", "Mute This Tab", "Find on Page"], hi: 1 },
            en: "Tap Share",
            ta: "Share ஐத் தொடவும்",
          },
          { scene: { kind: "shareSheet" }, en: "Tap View More", ta: "View More ஐத் தொடவும்" },
          {
            scene: { kind: "menu", at: "sheet", items: ["Add Bookmark to…", "Add to Favorites", "Add to Quick Note", "Find on Page", "Add to Home Screen"], hi: 4 },
            en: "Tap “Add to Home Screen”",
            ta: "“Add to Home Screen” ஐத் தொடவும்",
          },
          {
            scene: { kind: "confirm", style: "iosWebApp" },
            en: "Keep “Open as Web App” on, then tap Add",
            ta: "“Open as Web App” இயக்கத்தில் இருக்கட்டும், பின் Add ஐத் தொடவும்",
          },
          DONE,
        ],
      };
    }
    return {
      device,
      browser: "Safari",
      chrome: "safari",
      steps: [
        { scene: { kind: "tap" }, en: "Tap the Share button at the bottom", ta: "கீழே உள்ள Share பொத்தானைத் தொடவும்" },
        IOS_SHARE_SHEET,
        IOS_ADD,
        DONE,
      ],
    };
  }

  // Android
  if (/SamsungBrowser/.test(ua)) {
    return {
      device,
      browser: "Samsung Internet",
      chrome: "samsung",
      steps: [
        { scene: { kind: "tap" }, en: "Tap ≡ at the bottom right", ta: "கீழே வலதுபுறம் உள்ள ≡ ஐத் தொடவும்" },
        { scene: { kind: "menu", at: "sheet", items: ["Bookmarks", "Add page to", "Settings"], hi: 1 }, en: "Tap “Add page to”", ta: "“Add page to” ஐத் தொடவும்" },
        { scene: { kind: "menu", at: "sheet", items: ["Bookmarks", "Quick access", "Home screen"], hi: 2 }, en: "Choose “Home screen”", ta: "“Home screen” ஐத் தேர்ந்தெடுக்கவும்" },
        ANDROID_ADD,
        DONE,
      ],
    };
  }
  if (/EdgA/.test(ua)) {
    return {
      device,
      browser: "Edge",
      chrome: "edge",
      steps: [
        { scene: { kind: "tap" }, en: "Tap ••• in the middle of the bottom bar", ta: "கீழ்ப் பட்டையின் நடுவில் உள்ள ••• ஐத் தொடவும்" },
        { scene: { kind: "menu", at: "sheet", items: ["Add to favorites", "Add to phone", "Share"], hi: 1 }, en: "Tap “Add to phone”", ta: "“Add to phone” ஐத் தொடவும்" },
        ANDROID_ADD,
        DONE,
      ],
    };
  }
  const firefox = /Firefox/.test(ua);
  return {
    device,
    browser: firefox ? "Firefox" : "Chrome",
    chrome: "chromeAndroid",
    steps: [
      { scene: { kind: "tap" }, en: "Tap ⋮ at the top right", ta: "மேலே வலதுபுறம் உள்ள ⋮ ஐத் தொடவும்" },
      {
        scene: { kind: "menu", at: "top", items: ["New tab", "History", "Bookmarks", firefox ? "Add to Home screen" : "Add to home screen"], hi: 3 },
        en: "Tap “Add to home screen” (or “Install app”)",
        ta: "“Add to home screen” (அல்லது “Install app”) ஐத் தொடவும்",
      },
      ANDROID_ADD,
      DONE,
    ],
  };
}

/** Desktop browsers: how to install HuDa as an app on this computer. */
interface DesktopEnv {
  browser: string;
  steps: { en: string; ta: string }[];
}

function detectDesktop(): DesktopEnv {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) {
    return {
      browser: "Edge",
      steps: [
        { en: "Click ••• at the top right", ta: "மேலே வலதுபுறம் உள்ள ••• ஐ அழுத்தவும்" },
        { en: "Choose Apps → Install HuDa", ta: "Apps → Install HuDa ஐத் தேர்ந்தெடுக்கவும்" },
      ],
    };
  }
  if (/Chrome\//.test(ua)) {
    return {
      browser: "Chrome",
      steps: [
        { en: "Click the install icon at the right of the address bar", ta: "முகவரிப் பட்டியின் வலதுபுறம் உள்ள install icon ஐ அழுத்தவும்" },
        { en: "Or ⋮ → Cast, save and share → Install page as app", ta: "அல்லது ⋮ → Cast, save and share → Install page as app" },
      ],
    };
  }
  if (/Safari\//.test(ua) && !/Firefox\//.test(ua)) {
    return {
      browser: "Safari",
      steps: [
        { en: "In the menu bar, choose File → Add to Dock", ta: "மெனு பட்டியில் File → Add to Dock ஐத் தேர்ந்தெடுக்கவும்" },
        { en: "Click Add — HuDa opens from the Dock like an app", ta: "Add ஐ அழுத்தவும் — Dock-இலிருந்து ஆப் போலத் திறக்கும்" },
      ],
    };
  }
  return {
    browser: "this browser",
    steps: [
      { en: "This browser can't install web apps — open HuDa in Chrome, Edge or Safari", ta: "இந்த browser-இல் நிறுவ முடியாது — Chrome, Edge அல்லது Safari-இல் HuDa-வைத் திறக்கவும்" },
      { en: "Or open it on your phone and add it to the Home Screen", ta: "அல்லது உங்கள் phone-இல் திறந்து முகப்புத் திரையில் சேர்க்கவும்" },
    ],
  };
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
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
 * opens full-screen like an app. It detects the device and browser and plays
 * an animated phone mockup of that browser, pointing at each button to tap.
 * Android browsers that offer their own install prompt get a single Install
 * button instead. Never shown inside the installed app.
 */
export function InstallGuide() {
  const [env, setEnv] = useState<Env | null>(null);
  const [desk, setDesk] = useState<DesktopEnv | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const installEvent = useInstallPrompt();

  useEffect(() => {
    if (isStandalone()) return;
    const detected = detectEnv();
    // Desktop: only opened from the strip icon, never popped up by itself.
    if (detected) setEnv(detected);
    else setDesk(detectDesktop());

    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    const onInstalled = () => setOpen(false);
    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener("appinstalled", onInstalled);
    const timer = !detected || snoozed() ? 0 : window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Auto-play the steps in a loop; picking a dot restarts the clock from there.
  const stepCount = env?.steps.length ?? 0;
  useEffect(() => {
    if (!open || !stepCount || installEvent) return;
    const t = window.setTimeout(() => setStep((s) => (s + 1) % stepCount), STEP_MS);
    return () => window.clearTimeout(t);
  }, [open, step, stepCount, installEvent]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    if (await promptInstall()) setOpen(false);
    else dismiss();
  };

  const current = env?.steps[step];

  return (
    <AnimatePresence>
      {open && ((env && current) || desk) && (
        <>
          <motion.div
            key="install-scrim"
            className="absolute inset-0 z-[60] bg-black/55"
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
            <div className={`rounded-[28px] ${PLAYER_GLASS} p-4 text-sand-50`}>
              <div className="flex items-start gap-3">
                <img src="/icon-192.png" alt="" className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <h2 id="install-guide-title" className="text-[15px] font-semibold leading-snug">
                    {env ? "Add HuDa to your Home Screen" : "Install HuDa on this computer"}
                  </h2>
                  <p className="font-tamil text-[13px] text-sand-200/90 leading-snug">
                    {env ? "HuDa-வை முகப்புத் திரையில் சேர்க்கவும்" : "HuDa-வை இந்தக் கணினியில் நிறுவவும்"}
                  </p>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-0.5 text-[11px] text-sand-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    {env ? `${env.device} · ${env.browser}` : `Desktop · ${desk?.browser}`}
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
                <>
                  <p className="mt-4 text-sm text-sand-200">Opens full-screen like an app — one tap to listen.</p>
                  <p className="font-tamil text-xs text-sand-300/85">ஒரே தொடுதலில், முழுத் திரையில் ஆப் போலத் திறக்கும்.</p>
                  <button
                    type="button"
                    onClick={install}
                    className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    Install app · <span className="font-tamil">நிறுவவும்</span>
                  </button>
                </>
              ) : !env || !current ? (
                <ol className="mt-4 space-y-3">
                  {desk?.steps.map((st, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-400">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug">{st.en}</p>
                        <p className="font-tamil mt-0.5 text-xs text-sand-300/85 leading-snug">{st.ta}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <>
                  <div className="mt-3 flex justify-center">
                    <PhoneDemo chrome={env.chrome} scene={current.scene} sceneKey={step} />
                  </div>

                  <div className="mt-3 min-h-[64px]" aria-live="polite">
                    <p className="text-sm leading-snug">
                      <span className="mr-1.5 font-semibold text-emerald-400">
                        {step + 1}/{env.steps.length}
                      </span>
                      {current.en}
                    </p>
                    <p className="font-tamil mt-0.5 text-xs text-sand-300/85 leading-snug">{current.ta}</p>
                  </div>

                  <div className="mt-1 flex justify-center gap-1" role="tablist" aria-label="Steps">
                    {env.steps.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === step}
                        aria-label={`Step ${i + 1}`}
                        onClick={() => setStep(i)}
                        className="flex h-6 w-6 items-center justify-center"
                      >
                        <span className={`block h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-emerald-400" : "w-1.5 bg-white/30"}`} />
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="mt-2 h-11 w-full rounded-full border border-white/15 text-sm text-sand-100 hover:bg-white/10"
              >
                {installEvent ? "Not now" : "Got it"} · <span className="font-tamil">{installEvent ? "பிறகு" : "சரி"}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Strip icon: installs in one tap where the browser allows it, otherwise
 * opens the guide (phone steps, or desktop steps on a computer). Renders
 * nothing when already running as the installed app.
 */
export function InstallGuideButton({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);
  const installEvent = useInstallPrompt();
  useEffect(() => {
    setShow(!isStandalone());
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);
  if (!show || installed) return null;
  // Where the browser allows it (Chrome / Edge / Samsung on Android) one tap
  // opens its own Install dialog; everywhere else (all of iOS) the guide opens.
  const onClick = () => {
    if (installEvent) void promptInstall();
    else window.dispatchEvent(new Event(OPEN_EVENT));
  };
  return (
    <button
      type="button"
      onClick={onClick}
      data-tooltip="Add to Home Screen"
      aria-label="How to add HuDa to your Home Screen"
      className={className}
    >
      <svg className="h-[1.1em] w-[1.1em]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 11C3 7.25 3 5.375 3.955 4.061a4.5 4.5 0 0 1 1.106-1.106C6.375 2 8.25 2 12 2s5.625 0 6.939.955a4.5 4.5 0 0 1 1.106 1.106C21 5.375 21 7.25 21 11v2c0 3.75 0 5.625-.955 6.939a4.5 4.5 0 0 1-1.106 1.106C17.625 22 15.75 22 12 22s-5.625 0-6.939-.955a4.5 4.5 0 0 1-1.106-1.106C3 18.625 3 16.75 3 13v-2Z" />
        <path
          fill="currentColor"
          stroke="none"
          d="M12.25 15.6c.21 0 .45 0 .65.03.22.03.5.1.73.34.24.23.31.52.34.73.03.2.03.44.03.65v.5c0 .21 0 .45-.03.65-.03.22-.1.5-.34.73-.23.24-.51.31-.73.34-.2.03-.44.03-.65.03h-.5c-.21 0-.45 0-.65-.03-.22-.03-.5-.1-.73-.34-.24-.23-.31-.51-.34-.73-.03-.2-.03-.44-.03-.65v-.5c0-.21 0-.45.03-.65.03-.22.1-.5.34-.73.23-.24.51-.31.73-.34.2-.03.44-.03.65-.03h.5ZM12 5c.41 0 .75.34.75.75v5.21l1.72-1.69a.75.75 0 0 1 1.06 1.07l-3 2.95a.75.75 0 0 1-1.05 0l-3-2.95a.75.75 0 0 1 1.05-1.07l1.72 1.69V5.75c0-.41.34-.75.75-.75Z"
        />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Animated phone mockup                                               */
/* ------------------------------------------------------------------ */

/** Pulsing tap marker drawn over whatever should be tapped; `hold` = press and hold. */
function Tap({ className = "", hold = false }: { className?: string; hold?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span className={`pointer-events-none absolute z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 ${className}`} aria-hidden="true">
      {!reduce &&
        (hold ? (
          // The finger stays down: the ring closes in slowly, then lets go.
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-emerald-300"
            initial={{ scale: 1.9, opacity: 0 }}
            animate={{ scale: [1.9, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.6, times: [0, 0.75, 1], repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-emerald-300"
            initial={{ scale: 0.6, opacity: 1 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          />
        ))}
      <motion.span
        className="absolute inset-[9px] rounded-full bg-emerald-300/60 shadow-[0_0_10px_rgba(110,231,183,0.8)]"
        initial={reduce ? false : { scale: 1.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      />
    </span>
  );
}

/** A toolbar button; `hot` marks the one to tap. */
function Btn({ children, hot }: { children: ReactNode; hot?: boolean }) {
  return (
    <span
      className={`relative flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none ${
        hot ? "bg-emerald-400/25 text-emerald-200" : "text-white/60"
      }`}
    >
      {children}
      {hot && <Tap className="left-1/2 top-1/2" />}
    </span>
  );
}

const SHARE = (
  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

function UrlPill({ children }: { children?: ReactNode }) {
  return (
    <span className="flex h-5 min-w-0 flex-1 items-center gap-1 rounded-full bg-white/10 px-2 text-[8px] text-white/60">
      <span className="truncate">huda-web-quran.vercel.app</span>
      {children}
    </span>
  );
}

/** The browser's top and bottom bars; the menu button is `hot` on the tap step. */
function Toolbars({ chrome, hot, hold = false }: { chrome: Chrome; hot: boolean; hold?: boolean }) {
  const top = "absolute inset-x-0 top-5 z-10 flex items-center gap-1 bg-[#1c1c1e] px-2 py-1.5";
  const bottom = "absolute inset-x-0 bottom-0 z-10 flex items-center justify-around bg-[#1c1c1e] px-2 pb-3 pt-1.5";
  switch (chrome) {
    case "safari26":
      return (
        // ‹ · address pill (≡ url ↻) · tabs — the pill is what gets held
        <div className="absolute inset-x-2 bottom-3 z-10 flex items-center gap-1.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] text-white/70">‹</span>
          <span
            className={`relative flex h-6 min-w-0 flex-1 items-center gap-1 rounded-full px-2 text-[8px] ${
              hot ? "bg-emerald-400/25 text-emerald-100" : "bg-white/15 text-white/70"
            }`}
          >
            <span className="shrink-0">≡</span>
            <span className="truncate">huda-web-quran.vercel.app</span>
            <span className="ml-auto shrink-0">↻</span>
            {hot && <Tap hold={hold} className="left-1/2 top-1/2" />}
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-[10px] text-white/70">⧉</span>
        </div>
      );
    case "safari":
      return (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-[#1c1c1e] px-2 pb-3 pt-1.5">
          <UrlPill />
          <div className="mt-1.5 flex items-center justify-around">
            <Btn>‹</Btn>
            <Btn>›</Btn>
            <Btn hot={hot}>{SHARE}</Btn>
            <Btn>▯</Btn>
            <Btn>⧉</Btn>
          </div>
        </div>
      );
    case "chromeIOS":
      return (
        <>
          <div className={top}>
            <UrlPill>
              <span className="ml-auto">
                <Btn hot={hot}>{SHARE}</Btn>
              </span>
            </UrlPill>
          </div>
          <div className={bottom}>
            <Btn>‹</Btn>
            <Btn>›</Btn>
            <Btn>+</Btn>
            <Btn>⧉</Btn>
            <Btn>•••</Btn>
          </div>
        </>
      );
    case "firefoxIOS":
      return (
        <>
          <div className={top}>
            <UrlPill />
          </div>
          <div className={bottom}>
            <Btn>‹</Btn>
            <Btn>›</Btn>
            <Btn>+</Btn>
            <Btn>⧉</Btn>
            <Btn hot={hot}>☰</Btn>
          </div>
        </>
      );
    case "edge":
      return (
        <>
          <div className={top}>
            <UrlPill />
          </div>
          <div className={bottom}>
            <Btn>‹</Btn>
            <Btn>›</Btn>
            <Btn hot={hot}>•••</Btn>
            <Btn>⧉</Btn>
            <Btn>☰</Btn>
          </div>
        </>
      );
    case "samsung":
      return (
        <>
          <div className={top}>
            <UrlPill />
          </div>
          <div className={bottom}>
            <Btn>‹</Btn>
            <Btn>›</Btn>
            <Btn>⌂</Btn>
            <Btn>⧉</Btn>
            <Btn hot={hot}>≡</Btn>
          </div>
        </>
      );
    case "chromeAndroid":
      return (
        <div className={top}>
          <Btn>⌂</Btn>
          <UrlPill />
          <Btn>⧉</Btn>
          <Btn hot={hot}>⋮</Btn>
        </div>
      );
    case "inapp":
      return (
        <div className={top}>
          <Btn>✕</Btn>
          <span className="min-w-0 flex-1 truncate text-center text-[8px] text-white/70">HuDa Web Quran</span>
          <Btn hot={hot}>⋯</Btn>
        </div>
      );
  }
}

function MenuPanel({ at, items, hi }: { at: "top" | "bottom" | "bottomLeft" | "sheet"; items: string[]; hi: number }) {
  const place =
    at === "top"
      ? "right-1.5 top-12 w-[70%] rounded-xl"
      : at === "bottom"
        ? "right-1.5 bottom-12 w-[70%] rounded-xl"
        : at === "bottomLeft"
          ? "left-3 bottom-11 w-[72%] rounded-xl"
          : "inset-x-0 bottom-0 rounded-t-2xl pb-3 pt-2";
  return (
    <motion.div
      className={`absolute z-30 overflow-hidden bg-[#2c2c2e] shadow-2xl ${place}`}
      initial={{ opacity: 0, y: at === "top" ? -12 : 16, scale: at === "sheet" ? 1 : 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 24, stiffness: 300 }}
      style={{ transformOrigin: at === "top" ? "top right" : at === "bottomLeft" ? "bottom center" : "bottom right" }}
    >
      {at === "sheet" && <div className="mx-auto mb-1.5 h-1 w-6 rounded-full bg-white/25" />}
      {items.map((label, i) => (
        <div
          key={label}
          className={`relative flex items-center justify-between border-b border-white/5 px-2.5 py-[7px] text-[9px] last:border-0 ${
            i === hi ? "bg-emerald-400/20 font-semibold text-emerald-100" : "text-white/75"
          }`}
        >
          <span className="truncate">{label}</span>
          {i === hi && <Tap className="right-2 top-1/2 translate-x-1/2" />}
        </div>
      ))}
    </motion.div>
  );
}

function ConfirmPanel({ style }: { style: "ios" | "iosWebApp" | "android" }) {
  if (style === "android") {
    return (
      <motion.div
        className="absolute inset-x-3 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-[#2c2c2e] p-3 shadow-2xl"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
      >
        <p className="text-[10px] font-semibold text-white">Add to home screen</p>
        <div className="mt-2 flex items-center gap-2">
          <img src="/icon-192.png" alt="" className="h-6 w-6 rounded-md" />
          <span className="border-b border-emerald-400 text-[9px] text-white/80">HuDa</span>
        </div>
        <div className="mt-3 flex justify-end gap-3 text-[9px] font-semibold">
          <span className="text-white/50">Cancel</span>
          <span className="relative text-emerald-300">
            Install
            <Tap className="left-1/2 top-1/2" />
          </span>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 top-8 z-30 rounded-t-2xl bg-[#1c1c1e] px-2.5 pt-2.5 shadow-2xl"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
    >
      <div className="flex items-center justify-between gap-1 whitespace-nowrap text-[7.5px]">
        {style === "iosWebApp" ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60">✕</span>
        ) : (
          <span className="text-white/50">Cancel</span>
        )}
        <span className="min-w-0 flex-1 truncate text-center font-semibold text-white">Add to Home Screen</span>
        <span className="relative shrink-0 rounded-full bg-sky-500 px-2 py-0.5 font-semibold text-white">
          Add
          <Tap className="left-1/2 top-1/2" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.06] p-2">
        <img src="/icon-192.png" alt="" className="h-6 w-6 rounded-md" />
        <span className="text-[9px] text-white/85">HuDa</span>
      </div>
      {style === "iosWebApp" && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-white/[0.06] p-2 text-[9px] text-white/85">
          Open as Web App
          <span className="relative h-3.5 w-6 rounded-full bg-emerald-500">
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        </div>
      )}
    </motion.div>
  );
}

/** iOS 26 share sheet: people, apps, then actions — View More opens the full list. */
function ShareSheet() {
  const actions = ["Copy", "Bookmark", "Reading List", "View More"];
  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-30 rounded-t-2xl bg-[#2c2c2e] px-2 pb-4 pt-2 shadow-2xl"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
    >
      <div className="flex items-center gap-1.5 border-b border-white/5 pb-1.5">
        <img src="/icon-192.png" alt="" className="h-5 w-5 rounded-md" />
        <span className="min-w-0 truncate text-[8px] font-semibold text-white">HuDa Web Quran</span>
      </div>
      <div className="mt-2 flex justify-around">
        {["bg-sky-400", "bg-emerald-400", "bg-sky-500", "bg-amber-300"].map((c) => (
          <span key={c} className={`h-5 w-5 rounded-lg ${c} opacity-70`} />
        ))}
      </div>
      <div className="mt-2.5 flex justify-around">
        {actions.map((label, i) => {
          const hi = i === actions.length - 1;
          return (
            <div key={label} className="flex w-7 flex-col items-center gap-0.5">
              <span
                className={`relative flex h-6 w-6 items-center justify-center rounded-full text-[9px] ${
                  hi ? "bg-emerald-400/25 text-emerald-100" : "bg-white/10 text-white/60"
                }`}
              >
                {hi ? "⌃" : "·"}
                {hi && <Tap className="left-1/2 top-1/2" />}
              </span>
              <span className={`text-center text-[6px] leading-tight ${hi ? "font-semibold text-emerald-100" : "text-white/60"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function HomeScreenDone() {
  return (
    <div className="absolute inset-0 z-30 bg-gradient-to-b from-[#3a3f55] via-[#6b5a70] to-[#b58a6a] px-3 pt-9">
      <div className="grid grid-cols-4 gap-x-2 gap-y-3">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="h-6 w-6 rounded-md bg-white/25" />
            <span className="h-1 w-4 rounded bg-white/25" />
          </div>
        ))}
        <motion.div
          className="flex flex-col items-center gap-0.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35, type: "spring", damping: 12, stiffness: 260 }}
        >
          <img src="/icon-192.png" alt="" className="h-6 w-6 rounded-md ring-2 ring-emerald-300/80" />
          <span className="text-[7px] font-semibold text-white">HuDa</span>
        </motion.div>
      </div>
    </div>
  );
}

function PhoneDemo({ chrome, scene, sceneKey }: { chrome: Chrome; scene: Scene; sceneKey: number }) {
  return (
    <div
      className="relative h-[250px] w-[136px] overflow-hidden rounded-[26px] border-[3px] border-white/15 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
      aria-hidden="true"
    >
      {/* The HuDa page behind the browser bars */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2b2a22] via-[#4a3f25] to-[#1b1a14]">
        <div className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-1.5">
          <span className="h-1.5 w-16 rounded-full bg-amber-200/50" />
          <span className="h-1.5 w-10 rounded-full bg-amber-200/35" />
        </div>
        <div className="absolute inset-x-3 bottom-14 h-9 rounded-xl border border-white/10 bg-black/30" />
      </div>
      {/* Status bar / dynamic island */}
      <div className="absolute left-1/2 top-1.5 z-40 h-3 w-10 -translate-x-1/2 rounded-full bg-black" />

      <AnimatePresence mode="wait">
        <motion.div
          key={sceneKey}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {scene.kind !== "done" && (
            <Toolbars chrome={chrome} hot={scene.kind === "tap"} hold={scene.kind === "tap" && scene.hold} />
          )}
          {scene.kind !== "tap" && scene.kind !== "done" && <div className="absolute inset-0 z-20 bg-black/40" />}
          {scene.kind === "menu" && <MenuPanel at={scene.at} items={scene.items} hi={scene.hi} />}
          {scene.kind === "shareSheet" && <ShareSheet />}
          {scene.kind === "confirm" && <ConfirmPanel style={scene.style} />}
          {scene.kind === "done" && <HomeScreenDone />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
