"use client";

import { useEffect, useState } from "react";
import { afterSplash, finishStage } from "@/lib/onboarding";
import { PLACE_EVENT, type PlaceDetail } from "@/lib/data/translations";

// Place names as plain letters: "Gūduvāncheri" → "Guduvancheri" — the macrons
// read as stray lines over the small label.
const plain = (name: string) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

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
    let cancelled = false;
    let status: PermissionStatus | undefined;
    const done = () => finishStage("location");
    // Allow / Don't Allow flips the permission state, even when the position
    // itself is slow to come or fails.
    const onChange = () => {
      if (status && status.state !== "prompt") done();
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
            }
          } catch {
            // Keep default location if reverse geocoding fails
          }
        },
        () => {
          // Keep default location if permission denied. Without a timeout an
          // error only comes once the prompt has been answered.
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
        ask(status?.state === "granted" || status?.state === "denied");
      });
    return () => {
      cancelled = true;
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
