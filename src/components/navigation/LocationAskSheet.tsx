"use client";

import { ActionSheet } from "@/components/ui/ActionSheet";
import { t, useUiLang } from "@/lib/uiLang";

/**
 * Shown before the browser's own location prompt, which only names the site:
 * what the location is for (the prayer times and the place name in the
 * top-left pill) and what happens to it. Allow then asks the browser.
 */
export function LocationAskSheet({
  open,
  blocked,
  onAllow,
  onLater,
}: {
  open: boolean;
  /** The browser has location turned off for the site: say where to turn it on. */
  blocked: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const lang = useUiLang();
  const title = t(lang, "Use your location for prayer times?");
  return (
    <ActionSheet open={open} onClose={onLater} label={title} flush>
      <div className="px-5 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300" aria-hidden="true">
            <PinIcon />
          </span>
          <h2 className="text-base font-bold leading-snug text-sand-50">{title}</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-sand-100">{t(lang, "The current prayer and its start – end time for where you are, and your place name in the time pill at the top left.")}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-sand-200/60">{t(
            lang,
            "Your browser asks next. The location stays on this device; only its place name is looked up once (OpenStreetMap). Nothing is sent to HuDa.",
          )}</p>
        {blocked && (
          <p role="alert" className="mt-3 rounded-2xl bg-amber-300/10 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200">
            {/* iPhone / iPad: both switches count — Location Services for Safari
                Websites is the master one (the per-site Safari setting alone wasn't enough). */}
            {t(
              lang,
              "Location is turned off for this site. iPhone / iPad: Settings › Privacy & Security › Location Services › Safari Websites › While Using the App, and Settings › Apps › Safari › Location › Ask or Allow. Then come back — HuDa tries again on its own (Home Screen app: if not, close and reopen it).",
            )}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="h-11 flex-1 rounded-full font-semibold text-sand-200/80 transition-colors hover:bg-white/10 hover:text-sand-50"
          >
            {t(lang, "Not now")}
          </button>
          <button
            type="button"
            onClick={onAllow}
            className="h-11 flex-[1.4] rounded-full bg-emerald-500 font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            {t(lang, "Allow location")}
          </button>
        </div>
      </div>
    </ActionSheet>
  );
}

function PinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
