"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { t, uiLocale, useUiLang, type UiLang } from "@/lib/uiLang";
import { OPEN_INSTALL_GUIDE_EVENT } from "@/lib/settingsEvents";
import { MAX_REMINDERS, nextReminderTime, sortReminders, formatReminderTime, type ReminderState, type ReminderTime } from "@/lib/reminders/store";
import { REMINDER_MESSAGES } from "@/lib/reminders/messages";
import {
  applyReminders,
  enablePush,
  loadReminders,
  pushSupport,
  showTestNotification,
  storeReminders,
  type PushSupport,
  type ReminderError,
} from "@/lib/reminders/push";

/*
 * Settings › Reminders: the times to be reminded to read the Quran, each
 * with its own on / off. Permission is asked only when one is turned on (or
 * added). On iPhone / iPad Safari (not installed) it says to install the app
 * first and opens the install guide. Storage and push: lib/reminders.
 */

const GROUP = "rounded-2xl border border-white/10 bg-white/5 px-4 py-3";
const SCROLL = "no-scrollbar flex-1 overflow-y-auto pt-4 pr-1 space-y-2.5 text-sand-100";

const ERROR_TEXT: Record<ReminderError, string> = {
  denied: "Notifications are blocked for HuDa. Allow them in your browser or phone settings, then try again.",
  unconfigured: "Reminders aren't available yet. Please try again later.",
  failed: "Couldn't save the reminder. Check your connection and try again.",
  offline: "Couldn't save the reminder. Check your connection and try again.",
};

export const BellIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M6 9.5a6 6 0 0 1 12 0c0 3.6 1 5.6 2 6.8H4c1-1.2 2-3.2 2-6.8Z" />
    <path d="M10 19.5a2 2 0 0 0 4 0" />
  </svg>
);

/** The Settings row's value: "Off", "6:30 AM" or "2 on". */
export function useReminderSummary(lang: UiLang): string {
  const [summary, setSummary] = useState("");
  useEffect(() => {
    const on = sortReminders(loadReminders().times).filter((r) => r.on);
    setSummary(
      pushSupport() !== "ok" || !on.length
        ? t(lang, "Off")
        : on.length === 1
          ? formatReminderTime(on[0].time, uiLocale(lang))
          : t(lang, "{n} on", { n: on.length }),
    );
  }, [lang]);
  return summary;
}

function Toggle({ on, label, onToggle, disabled }: { on: boolean; label: string; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center disabled:cursor-wait"
    >
      <span aria-hidden="true" className={cn("relative h-6 w-11 rounded-full transition-colors", on ? "bg-amber-400/90" : "bg-white/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left]", on ? "left-[1.375rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function RemindersPage({ onLeave }: { onLeave: (event: string) => void }) {
  const lang = useUiLang();
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [state, setState] = useState<ReminderState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReminderError | null>(null);
  const [tested, setTested] = useState(false);
  const [granted, setGranted] = useState(false);
  const timeTimer = useRef(0);

  useEffect(() => {
    setSupport(pushSupport());
    setState(loadReminders());
    setGranted(typeof Notification !== "undefined" && Notification.permission === "granted");
    return () => window.clearTimeout(timeTimer.current);
  }, []);

  /** Saves `times`; `turningOn` (an id) first needs the permission + push. */
  const commit = async (times: ReminderTime[], turningOn?: string) => {
    if (!state) return;
    setError(null);
    setTested(false);
    let next: ReminderState = { ...state, times: sortReminders(times), updatedAt: Date.now() };
    setState(next);
    setBusy(true);
    try {
      let sub: PushSubscription | undefined;
      if (turningOn) {
        const r = await enablePush();
        setGranted(typeof Notification !== "undefined" && Notification.permission === "granted");
        if (typeof r === "string") {
          // Kept in the list, switched off, until it can be turned on.
          next = { ...next, times: next.times.map((x) => (x.id === turningOn ? { ...x, on: false } : x)) };
          setState(next);
          storeReminders(next);
          setError(r);
          return;
        }
        sub = r;
      }
      const saved = await applyReminders(next, sub);
      if (typeof saved === "string") setError(saved);
      else setState(saved);
    } finally {
      setBusy(false);
    }
  };

  if (!support || !state) return <div className={SCROLL} />;

  if (support !== "ok") {
    return (
      <div className={SCROLL}>
        <div className={cn(GROUP, "flex gap-3 py-4")}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xl text-amber-200">
            <BellIcon />
          </span>
          <div className="min-w-0">
            {support === "install" ? (
              <>
                <p className="text-sm font-semibold text-white">{t(lang, "Install the app to turn on reminders")}</p>
                <p className="mt-1 text-xs leading-relaxed text-sand-200/80">
                  {t(lang, "On iPhone and iPad, notifications work once HuDa is added to the Home Screen. Then open HuDa from the Home Screen and set your reminder here.")}
                </p>
                <button
                  type="button"
                  onClick={() => onLeave(OPEN_INSTALL_GUIDE_EVENT)}
                  className="mt-3 h-10 rounded-full bg-emerald-500 px-5 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  {t(lang, "How to install")}
                </button>
              </>
            ) : (
              <p className="text-sm text-sand-100">{t(lang, "This browser can't show notifications. Try Chrome, Edge, Firefox or Safari, or install the app.")}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const locale = uiLocale(lang);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const times = state.times;
  const askHint = !granted && typeof Notification !== "undefined" && Notification.permission === "default";

  return (
    <div className={SCROLL}>
      <div className={cn(GROUP, "flex gap-3")}>
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-amber-300/30 bg-amber-300/10 text-lg text-amber-200">
          <BellIcon />
        </span>
        <div className="min-w-0 text-xs leading-relaxed text-sand-200/80">
          <p className="text-sm text-sand-100">{t(lang, "Get a notification to read the Quran at the times you choose.")}</p>
          {tz && <p className="mt-1">{t(lang, "Times are in your time zone ({tz}).", { tz })}</p>}
        </div>
      </div>

      {times.length > 0 && (
        <ul className="space-y-1.5" aria-label={t(lang, "Reminders")}>
          {times.map((r) => (
            <li key={r.id} className={cn("flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-1 pl-4 pr-1", !r.on && "opacity-70")}>
              <label className="flex min-w-0 flex-1 flex-col py-1.5">
                <span className="sr-only">{t(lang, "Reminder time")}</span>
                <input
                  type="time"
                  value={r.time}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    // The wheel / keyboard fires many changes: save once it settles.
                    const changed = times.map((x) => (x.id === r.id ? { ...x, time: v } : x));
                    setState({ ...state, times: changed });
                    window.clearTimeout(timeTimer.current);
                    timeTimer.current = window.setTimeout(() => void commit(changed), 700);
                  }}
                  className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none [color-scheme:dark] focus-visible:text-amber-200"
                />
              </label>
              <Toggle
                on={r.on}
                label={`${t(lang, "Reminder time")} ${formatReminderTime(r.time, locale)}`}
                disabled={busy}
                onToggle={() => void commit(times.map((x) => (x.id === r.id ? { ...x, on: !x.on } : x)), r.on ? undefined : r.id)}
              />
              <button
                type="button"
                onClick={() => void commit(times.filter((x) => x.id !== r.id))}
                disabled={busy}
                aria-label={`${t(lang, "Remove reminder")} ${formatReminderTime(r.time, locale)}`}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-lg text-sand-200/70 hover:bg-white/10 hover:text-white disabled:cursor-wait"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {times.length < MAX_REMINDERS && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const id = Math.random().toString(36).slice(2, 10);
            void commit([...times, { id, time: nextReminderTime(times), on: true }], id);
          }}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-amber-300/40 px-4 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-300/10 disabled:cursor-wait"
        >
          <PlusIcon className="text-base" />
          {t(lang, "Add a reminder")}
        </button>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-300/30 bg-rose-400/10 px-4 py-2.5 text-xs leading-relaxed text-rose-100">
          {t(lang, ERROR_TEXT[error])}
        </p>
      )}
      {askHint && !error && <p className="px-1 text-[11px] leading-relaxed text-sand-200/60">{t(lang, "Turning a reminder on asks you to allow notifications.")}</p>}

      {granted && times.some((r) => r.on) && (
        <button
          type="button"
          onClick={async () => {
            const m = REMINDER_MESSAGES[lang] ?? REMINDER_MESSAGES.en;
            setTested(await showTestNotification(m.title, m.body));
          }}
          className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm text-sand-100 hover:bg-white/10"
        >
          {tested ? t(lang, "Test notification sent") : t(lang, "Send a test notification")}
        </button>
      )}
    </div>
  );
}
