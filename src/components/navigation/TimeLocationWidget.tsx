"use client";

import { useEffect, useState } from "react";

interface TimeLocationWidgetProps {
  className?: string;
  defaultLocation?: string;
}

export function TimeLocationWidget({
  className = "",
  defaultLocation = "Gūduvāncheri",
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

  useEffect(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            if (res.ok) {
              const data = await res.json();
              const city =
                data.address?.suburb ||
                data.address?.town ||
                data.address?.city ||
                data.address?.village ||
                data.address?.county;
              if (city) {
                setLocation(city);
              }
            }
          } catch {
            // Keep default location if reverse geocoding fails
          }
        },
        () => {
          // Keep default location if permission denied
        },
        { timeout: 5000 }
      );
    }
  }, []);

  if (!mounted) {
    return (
      <div
        className={`pointer-events-auto flex flex-col items-center justify-center rounded-full bg-black/[0.08] px-2 sm:px-[2rem] py-1 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-md text-center min-w-[70px] sm:min-w-[135px] min-h-[40px] sm:min-h-[52px] ${className}`}
      >
        <span className="text-sm sm:text-lg font-extrabold text-white tracking-tight leading-none">
          --:--
        </span>
        <span className="text-[9px] sm:text-xs font-medium text-slate-300 tracking-wide mt-0.5 sm:mt-1 leading-none truncate max-w-[70px] sm:max-w-none">
          {defaultLocation}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto flex flex-col items-center justify-center rounded-full bg-black/[0.08] px-2 sm:px-[2rem] py-1 sm:py-2 border border-white/15 backdrop-blur-[6px] shadow-lg text-center min-w-[70px] sm:min-w-[135px] min-h-[40px] sm:min-h-[52px] ${className}`}
    >
      <span className="text-sm sm:text-lg font-extrabold text-white tracking-tight leading-tight drop-shadow-sm font-sans">
        {timeStr}
      </span>
      <span className="text-[9px] sm:text-xs font-medium text-slate-200/90 tracking-wide leading-tight mt-0.5 truncate max-w-[70px] sm:max-w-none">
        {location}
      </span>
    </div>
  );
}
