"use client";

import { useEffect, useState } from "react";
import { afterSplash, finishStage } from "@/lib/onboarding";
import { PLACE_EVENT, type PlaceDetail } from "@/lib/data/translations";

// Place names as plain letters: "Gūduvāncheri" → "Guduvancheri" — the macrons
// read as stray lines over the small label.
const plain = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// The last place found, kept so a reload doesn't ask again: iOS Safari
// forgets a site's location permission between loads and would prompt every
// time. Asked again only after a week, and never once denied.
const PLACE_KEY = "huda-place";
const PLACE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
interface SavedPlace {
  city?: string;
  detail?: PlaceDetail;
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
  defaultLocation = "Guduvancheri",
}: TimeLocationWidgetProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [location, setLocation] = useState<string>(defaultLocation);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      setTimeStr(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
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
    if (saved && (saved.denied || Date.now() - saved.at < PLACE_MAX_AGE)) {
      if (saved.city) setLocation(saved.city);
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
        async (position) => {
          done();
          try {
            const { latitude, longitude } = position.coords;
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
              const city =
                data.address?.suburb ||
                data.address?.town ||
                data.address?.city ||
                data.address?.village ||
                data.address?.county;
              if (city) {
                setLocation(plain(city));
              }
              savePlace({ city: city ? plain(city) : undefined, detail, at: Date.now() });
            }
          } catch {
            // Keep default location if reverse geocoding fails
          }
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
        // Android Chrome doesn't always fire "change", and once allowed the
        // position can take a long time (no GPS fix indoors), so check the
        // state every second while the prompt may be up.
        if (status && !answered)
          poll = setInterval(() => {
            navigator.permissions
              .query({ name: "geolocation" })
              .then((s) => s.state === "granted" && done())
              .catch(() => {});
          }, 1000);
        ask(answered);
      });
    return () => {
      cancelled = true;
      clearInterval(poll);
      status?.removeEventListener("change", onChange);
    };
  }, []);

  if (!mounted) {
    return (
      <div
        className={`pointer-events-auto flex flex-col items-center justify-center shrink-0 rounded-full bg-black/[0.08] px-4 sm:px-[2rem] py-1.5 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-md text-center min-w-[70px] sm:min-w-[135px] min-h-11 sm:min-h-12 ${className}`}
      >
        <span className="whitespace-nowrap text-sm sm:text-lg font-extrabold text-white tracking-tight leading-none">
          --:--
        </span>
        <span className="text-[9px] sm:text-xs font-medium text-slate-300 tracking-wide mt-0.5 sm:mt-1 leading-none whitespace-nowrap">
          {defaultLocation}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex flex-col items-center justify-center shrink-0 rounded-full bg-black/[0.08] px-4 sm:px-[2rem] py-1.5 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-lg text-center min-w-[70px] sm:min-w-[135px] min-h-11 sm:min-h-12 ${className}`}
    >
      <span className="whitespace-nowrap text-sm sm:text-lg font-extrabold text-white tracking-tight leading-tight drop-shadow-sm font-sans">
        {timeStr}
      </span>
      <span className="text-[9px] sm:text-xs font-medium text-slate-200/90 tracking-wide leading-tight mt-0.5 whitespace-nowrap">
        {location}
      </span>
    </div>
  );
}
