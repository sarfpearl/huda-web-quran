"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { afterSplash, finishStage } from "@/lib/onboarding";
import { PLACE_EVENT, type PlaceDetail } from "@/lib/data/translations";
import { clock, currentWaqt, PRAYER_LABELS, regionDefaults, type AsrMadhab, type MethodId } from "@/lib/prayerTimes";
import { PrayerTimesSheet, readPrayerPrefs, type PrayerPrefs } from "./PrayerTimesSheet";
import { LocationAskSheet } from "./LocationAskSheet";

// Place names as plain letters: "Gūduvāncheri" → "Guduvancheri" — the macrons
// read as stray lines over the small label.
const plain = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Great-circle distance in km.
function km(lat1: number, lon1: number, lat2: number, lon2: number) {
  const r = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// The last place found, kept so a reload doesn't ask again: iOS Safari
// forgets a site's location permission between loads and would prompt every
// time. Refreshed silently when the permission is still granted (below);
// asked again only after a week, and never on its own once denied or
// "Not now" (a tap on the time pill asks again).
const PLACE_KEY = "huda-place";
const PLACE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
interface SavedPlace {
  city?: string;
  detail?: PlaceDetail;
  /** For the prayer times (saved since 2026-10-07; older saves lack it). */
  coords?: { lat: number; lon: number };
  denied?: boolean;
  at: number;
}
function readPlace(): SavedPlace | null {
  try {
    const p = JSON.parse(localStorage.getItem(PLACE_KEY) ?? "null") as SavedPlace | null;
    return p && typeof p.at === "number" ? p : null;
  } catch {
    return null;
  }
}
function savePlace(p: SavedPlace) {
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
}

interface TimeLocationWidgetProps {
  className?: string;
  defaultLocation?: string;
}

export function TimeLocationWidget({
  className = "",
  defaultLocation = "",
}: TimeLocationWidgetProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [now, setNow] = useState<Date | null>(null);
  const [location, setLocation] = useState<string>(defaultLocation);
  const [mounted, setMounted] = useState<boolean>(false);
  // Prayer times: where the device is, and the method / Asr madhab (the
  // region's, unless chosen in the sheet).
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [region, setRegion] = useState<PlaceDetail | null>(null);
  const [prefs, setPrefs] = useState<PrayerPrefs>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  // The "what it's for" sheet before the browser's prompt; Allow / Not now go
  // to the waiting first-open flow, or (a tap on the pill) ask right away.
  const [askOpen, setAskOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const askAnswer = useRef<((allow: boolean) => void) | null>(null);
  const [ta, setTa] = useState(false);

  useEffect(() => {
    setMounted(true);

    setPrefs(readPrayerPrefs());
    try {
      setTa(localStorage.getItem("huda-translation-lang") === "ta");
    } catch {
      /* storage unavailable */
    }
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setTimeStr(formatted);
      // The waqt is worked out again once a minute (a new Date each second
      // would redo it every second).
      setNow((prev) => (prev && prev.getMinutes() === now.getMinutes() && prev.getHours() === now.getHours() ? prev : now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // Where the device is → prayer times; its place name (OpenStreetMap) → the
  // pill and the first-visit translation language.
  const applyPosition = useCallback(async (position: GeolocationPosition) => {
    try {
      const { latitude, longitude } = position.coords;
      const here = { lat: latitude, lon: longitude };
      setCoords(here);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      );
      if (res.ok) {
        const data = await res.json();
        // Where they are, for the first-visit translation language
        // (country; in India the state, as an ISO 3166-2 code).
        const detail: PlaceDetail = {
          countryCode: data.address?.country_code,
          stateCode: data.address?.["ISO3166-2-lvl4"],
        };
        window.dispatchEvent(new CustomEvent(PLACE_EVENT, { detail }));
        setRegion(detail);
        const city =
          data.address?.suburb ||
          data.address?.town ||
          data.address?.city ||
          data.address?.village ||
          data.address?.county;
        if (city) {
          setLocation(plain(city));
        }
        savePlace({ city: city ? plain(city) : undefined, detail, coords: here, at: Date.now() });
        return true;
      }
    } catch {
      // Keep default location if reverse geocoding fails
    }
    return false;
  }, []);

  // Asked only once the splash is gone, and the next onboarding step (the
  // install guide, then the content browser) waits for the actual answer, so
  // nothing opens while the browser's permission prompt is still on screen.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      finishStage("location");
      return;
    }
    const saved = readPlace();
    // A save from before prayer times has no coordinates: ask once more.
    if (saved && (saved.denied || (Date.now() - saved.at < PLACE_MAX_AGE && saved.coords))) {
      if (saved.city) setLocation(saved.city);
      if (saved.coords) setCoords(saved.coords);
      if (saved.detail) setRegion(saved.detail);
      finishStage("location");
      if (saved.detail) {
        // After the home screen's listeners are attached.
        const detail = saved.detail;
        const t = setTimeout(() =>
          window.dispatchEvent(new CustomEvent(PLACE_EVENT, { detail })),
        );
        return () => clearTimeout(t);
      }
      return;
    }
    let cancelled = false;
    let status: PermissionStatus | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    const done = () => {
      clearInterval(poll);
      finishStage("location");
    };
    // Allow flips the permission state to "granted" even while the position
    // itself is slow to come. Only "granted" counts: Safari reports a passing
    // "denied" while its own app-level prompt is still up, and a real denial
    // reaches the error callback at once anyway.
    const onChange = () => {
      if (status?.state === "granted") done();
    };
    const ask = (wasAnswered: boolean) => {
      if (cancelled) return;
      if (wasAnswered) done();
      navigator.geolocation.getCurrentPosition(
        (position) => {
          done();
          void applyPosition(position);
        },
        (err) => {
          // Keep default location if permission denied. Without a timeout an
          // error only comes once the prompt has been answered.
          if (err.code === err.PERMISSION_DENIED)
            savePlace({ denied: true, at: Date.now() });
          done();
        },
        // No timeout while the prompt can still be up: Safari counts it
        // against the prompt and would fail before the user answers.
        wasAnswered ? { timeout: 5000 } : {},
      );
    };
    afterSplash()
      .then(() =>
        navigator.permissions
          ?.query({ name: "geolocation" })
          .catch(() => undefined),
      )
      .then((s) => {
        if (cancelled) return;
        status = s;
        status?.addEventListener("change", onChange);
        const answered = status?.state === "granted" || status?.state === "denied";
        if (answered) {
          ask(true);
          return;
        }
        // Not answered yet: first say what it's for (LocationAskSheet).
        askAnswer.current = (allow) => {
          if (!allow) {
            savePlace({ denied: true, at: Date.now() });
            done();
            return;
          }
          // Android Chrome doesn't always fire "change", and once allowed the
          // position can take a long time (no GPS fix indoors), so check the
          // state every second while the prompt may be up.
          if (status)
            poll = setInterval(() => {
              navigator.permissions
                .query({ name: "geolocation" })
                .then((s) => s.state === "granted" && done())
                .catch(() => {});
            }, 1000);
          ask(false);
        };
        setAskOpen(true);
      });
    return () => {
      cancelled = true;
      clearInterval(poll);
      status?.removeEventListener("change", onChange);
    };
  }, [applyPosition]);

  // Moved since the saved place (travel, or a PWA left open): look again —
  // on load and on coming back to the app, at most every 10 min — but only
  // where the permission is already granted, so it never prompts. A new name
  // only past ~2 km, to spare Nominatim.
  const coordsRef = useRef(coords);
  coordsRef.current = coords;
  useEffect(() => {
    if (!("geolocation" in navigator) || !navigator.permissions) return;
    let last = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 10 * 60 * 1000) return;
      const had = coordsRef.current;
      if (!had) return;
      last = Date.now();
      navigator.permissions
        .query({ name: "geolocation" })
        .then((s) => {
          if (s.state !== "granted") return;
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              if (km(had.lat, had.lon, latitude, longitude) > 2) void applyPosition(position);
            },
            () => {},
            { timeout: 15000, maximumAge: 5 * 60 * 1000 },
          );
        })
        .catch(() => {});
    };
    // The saved place shows first; this follows.
    const t = setTimeout(refresh, 1500);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [applyPosition]);

  // "Update location" in the prayer sheet: a fresh fix (no cached position),
  // renamed whatever the distance. A tap, so it may prompt.
  const [locating, setLocating] = useState<"idle" | "busy" | "done" | "failed" | "unnamed">("idle");
  const locateNow = () => {
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyPosition(position).then((ok) => setLocating(ok ? "done" : "unnamed"));
      },
      () => setLocating("failed"),
      { timeout: 15000, maximumAge: 0 },
    );
  };

  // A tap on the time pill while there's no location ("Not now", denied, or
  // the lookup failed): the same sheet, then the browser's prompt. If the
  // browser has it blocked, the sheet comes back saying where to turn it on.
  const allowFromPill = (allow: boolean) => {
    if (!allow) return;
    navigator.geolocation.getCurrentPosition(
      (position) => void applyPosition(position),
      (err) => {
        if (err.code !== err.PERMISSION_DENIED) return;
        setBlocked(true);
        askAnswer.current = allowFromPill;
        setAskOpen(true);
      },
    );
  };
  // Sent to Settings by the « turned off » sheet: on coming back, try again
  // without another tap, and close the sheet once the location comes.
  useEffect(() => {
    if (!blocked || !askOpen) return;
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAskOpen(false);
          setBlocked(false);
          askAnswer.current = null;
          void applyPosition(position);
        },
        () => {},
        { timeout: 10000 },
      );
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [blocked, askOpen, applyPosition]);
  const askFromPill = () => {
    setBlocked(false);
    askAnswer.current = allowFromPill;
    setAskOpen(true);
  };
  const answerAsk = (allow: boolean) => {
    setAskOpen(false);
    const answer = askAnswer.current;
    askAnswer.current = null;
    // Synchronously, inside the tap: Safari only prompts from a user gesture.
    answer?.(allow);
  };
  const askSheet = (
    <LocationAskSheet open={askOpen} ta={ta} blocked={blocked} onAllow={() => answerAsk(true)} onLater={() => answerAsk(false)} />
  );

  // The waqt now (owner's choice: the current prayer, from – to); the clock
  // when there's no location yet, or the sun doesn't rise / set (polar days).
  const method: MethodId = prefs.method ?? regionDefaults(region?.countryCode, region?.stateCode).method;
  const asr: AsrMadhab = prefs.asr ?? regionDefaults(region?.countryCode, region?.stateCode).asr;
  const waqt = useMemo(
    () => (coords && now ? currentWaqt(coords.lat, coords.lon, now, method, asr) : null),
    [coords, now, method, asr],
  );
  if (!mounted) {
    return (
      <div
        className={`pointer-events-auto flex flex-col items-center justify-center shrink-0 rounded-full bg-black/[0.08] px-4 max-[359px]:px-2.5 sm:px-[2rem] py-1.5 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-md text-center min-w-[70px] sm:min-w-[135px] min-h-11 sm:min-h-12 ${className}`}
      >
        <span className="whitespace-nowrap text-sm sm:text-lg font-extrabold text-white tracking-tight leading-none">
          --:--
        </span>
        {defaultLocation && (
          <span className="text-[9px] sm:text-xs font-medium text-slate-300 tracking-wide mt-0.5 sm:mt-1 leading-none whitespace-nowrap">
            {defaultLocation}
          </span>
        )}
      </div>
    );
  }

  const pill = `pointer-events-auto flex flex-col items-center justify-center shrink-0 rounded-full bg-black/[0.08] px-4 max-[359px]:px-2.5 sm:px-[2rem] py-1.5 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-lg text-center min-w-[70px] sm:min-w-[135px] min-h-11 sm:min-h-12 ${className}`;

  if (!waqt || !coords) {
    const content = (
      <>
        <span className="whitespace-nowrap text-sm sm:text-lg font-extrabold text-white tracking-tight leading-tight drop-shadow-sm font-sans">
          {timeStr}
        </span>
        {location && (
          <span className="text-[9px] sm:text-xs font-medium text-slate-200/90 tracking-wide leading-tight mt-0.5 whitespace-nowrap">
            {location}
          </span>
        )}
      </>
    );
    // No location: a tap explains and asks (prayer times + the place name).
    if (!coords && "geolocation" in navigator)
      return (
        <>
          <button
            type="button"
            onClick={askFromPill}
            aria-label={`${timeStr}${location ? `, ${location}` : ""} — use my location for prayer times`}
            className={`${pill} cursor-pointer hover:bg-black/20 active:scale-95 transition-all`}
          >
            {content}
          </button>
          {askSheet}
        </>
      );
    return (
      <>
        <div className={pill}>{content}</div>
        {askSheet}
      </>
    );
  }

  const name = PRAYER_LABELS[waqt.prayer].en;
  const range = waqt.upcoming ? (
    <>
      from <Clock d={waqt.start} />
    </>
  ) : (
    <TimeRange a={waqt.start} b={waqt.end} />
  );
  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={`${name} ${waqt.upcoming ? "starts at " + clock(waqt.start) : `${clock(waqt.start)} to ${clock(waqt.end)}`}${location ? `, ${location}` : ""} — prayer times`}
        className={`${pill.replace("sm:px-[2rem]", "md:px-[2rem]")} cursor-pointer hover:bg-black/20 active:scale-95 transition-all`}
      >
        {/* Below md: the prayer, then its times (the place is in the sheet) —
            on one line "Maghrib 12:59 PM – 12:59 AM" would push the header's
            buttons off the screen (390px, and 640px with their labels).
            md+: prayer + times, then the place. */}
        <span className="whitespace-nowrap text-sm sm:text-base text-white tracking-tight leading-tight drop-shadow-sm font-sans">
          <span className="font-extrabold">{name}</span>
          <span className="max-md:hidden font-semibold text-sand-100/95"> {range}</span>
        </span>
        <span className="md:hidden text-[11px] sm:text-xs font-semibold text-sand-100/90 tabular-nums leading-tight mt-0.5 whitespace-nowrap">
          {range}
        </span>
        {location && (
          <span className="max-md:hidden text-xs font-medium text-slate-200/90 tracking-wide leading-tight mt-0.5 whitespace-nowrap">
            {location}
          </span>
        )}
      </button>
      <PrayerTimesSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setLocating("idle");
        }}
        coords={coords}
        place={location}
        now={now ?? new Date()}
        method={method}
        asr={asr}
        prefs={prefs}
        onPrefs={setPrefs}
        current={waqt}
        onLocate={locateNow}
        locating={locating}
      />
    </>
  );
}

// AM / PM only from sm up: on a phone the pill must leave the header's
// buttons room (390px: "Isha 7:07 – 4:49").
const Meridiem = ({ m }: { m: string }) => <span className="max-sm:hidden"> {m}</span>;

function Clock({ d }: { d: Date }) {
  const [t, m] = clock(d).split(" ");
  return (
    <>
      {t}
      <Meridiem m={m} />
    </>
  );
}

/** "3:18 – 5:56 PM" (one AM / PM when both share it), else "7:06 PM – 4:49 AM". */
function TimeRange({ a, b }: { a: Date; b: Date }) {
  const [ta, pa] = clock(a).split(" ");
  const [tb, pb] = clock(b).split(" ");
  return (
    <>
      {ta}
      {pa !== pb && <Meridiem m={pa} />} – {tb}
      <Meridiem m={pb} />
    </>
  );
}
