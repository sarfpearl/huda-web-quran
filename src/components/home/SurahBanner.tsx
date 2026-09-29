"use client";

import { SURAH_NAMES } from "@/lib/data/surahNames";

// Surah header: the neon sign frame (public/surah-frame-neon.svg) with the
// vocalised Arabic title centred in its lit inner panel, in the Mushaf face.
// The frame is an <img>, so its glow filters are rasterised once instead of
// being redrawn as the reader scrolls (iOS Safari's GPU memory, see
// globals.css); a small backdrop blur fills the tube. The name sits in the
// inner panel (viewBox 1000×260: x 94–906).
export default function SurahBanner({ surah }: { surah: number }) {
  const arabic = SURAH_NAMES[surah - 1]?.[0] ?? "";
  return (
    <div
      className="relative mx-auto w-full max-w-[560px] [container-type:inline-size]"
      style={{ aspectRatio: "1000 / 260" }}
    >
      {/* Glass inside the outer neon tube only (viewBox x 42–958, y 40–220, rx 64 — rounded as the player card) */}
      <div
        className="absolute bg-white/[0.06] backdrop-blur-md"
        style={{ left: "4.2%", right: "4.2%", top: "15.4%", bottom: "15.4%", borderRadius: "6.99% / 35.6%" }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- static SVG frame */}
      <img src="/surah-frame-neon.svg?v=2" alt="" aria-hidden className="absolute inset-0 h-full w-full select-none" draggable={false} />
      <h2
        lang="ar"
        dir="rtl"
        className="absolute inset-x-[10%] top-1/2 -translate-y-1/2 whitespace-nowrap text-center font-arabic text-[7.8cqw] leading-[1.9] text-white"
        style={{ textShadow: "0 0 6px rgba(217, 184, 113, 0.85), 0 0 14px rgba(47, 211, 154, 0.35)" }}
      >
        {arabic}
      </h2>
    </div>
  );
}
