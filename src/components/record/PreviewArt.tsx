/**
 * Record › Preview: the screen's ornaments, drawn as SVG (no image files) —
 * the Islamic arch behind the title (its emblem is Hugeicons' Quran01, in
 * Icon.tsx), and the mosque
 * skyline with two lit lanterns at the foot. Colours: midnight navy and gold.
 */

export const GOLD = "#e3b65a";

/** A faint eight-point-star lattice for the screen's top. */
export const PATTERN_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23e3b65a' stroke-opacity='0.09' stroke-width='1'%3E%3Cpath d='M28 4l7 17 17 7-17 7-7 17-7-17-17-7 17-7z'/%3E%3Cpath d='M28 14l14 14-14 14-14-14z'/%3E%3C/g%3E%3C/svg%3E\")";

/** The arch over the header: a pointed, stepped dome outline in gold. */
export function ArchHeader({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="arch-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="arch-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={GOLD} stopOpacity="0" />
          <stop offset="0.2" stopColor={GOLD} stopOpacity="0.8" />
          <stop offset="0.5" stopColor="#f6d999" />
          <stop offset="0.8" stopColor={GOLD} stopOpacity="0.8" />
          <stop offset="1" stopColor={GOLD} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 200 C2 120 20 92 70 86 C110 82 120 62 148 54 C172 47 186 28 200 4 C214 28 228 47 252 54 C280 62 290 82 330 86 C380 92 398 120 400 200 Z"
        fill="url(#arch-fill)"
      />
      <path
        d="M0 200 C2 120 20 92 70 86 C110 82 120 62 148 54 C172 47 186 28 200 4 C214 28 228 47 252 54 C280 62 290 82 330 86 C380 92 398 120 400 200"
        fill="none"
        stroke="url(#arch-gold)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Lantern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 70" className={className} aria-hidden>
      <defs>
        <radialGradient id="lantern-glow" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#ffd77a" />
          <stop offset="0.55" stopColor="#f0a53a" />
          <stop offset="1" stopColor="#a35a12" />
        </radialGradient>
      </defs>
      <path d="M16 0V10" stroke={GOLD} strokeWidth="1.2" />
      <path d="M11 14L16 9L21 14Z" fill={GOLD} />
      <path d="M8 18H24L22 14H10Z" fill="#b98a3c" />
      <path d="M9 18C8 30 8 40 10 50H22C24 40 24 30 23 18Z" fill="url(#lantern-glow)" stroke={GOLD} strokeWidth="1.2" />
      <path d="M16 18V50M12 18C11 30 11 40 12.5 50M20 18C21 30 21 40 19.5 50" stroke="#7a4a14" strokeWidth="0.8" opacity="0.7" />
      <path d="M8 50H24L21 56H11Z" fill="#b98a3c" />
      <path d="M14 56H18L16 66Z" fill={GOLD} />
    </svg>
  );
}

/** The foot of the screen: a mosque skyline at dusk between two lanterns. */
export function MosqueFooter({ className }: { className?: string }) {
  return (
    <div className={`pointer-events-none ${className ?? "relative"}`} aria-hidden>
      {/* Dusk glow behind the skyline */}
      <div className="absolute inset-x-0 bottom-0 h-full bg-[radial-gradient(ellipse_at_50%_100%,rgba(240,165,58,0.32),rgba(240,165,58,0)_60%)]" />
      <svg viewBox="0 0 400 70" preserveAspectRatio="xMidYMax meet" className="absolute inset-x-0 bottom-0 h-full w-full">
        <g fill="#060a14">
          <path d="M0 70V60C40 56 80 58 110 54C130 51 150 53 160 50V70Z" />
          <path d="M240 50C250 53 270 51 290 54C320 58 360 56 400 60V70H240Z" />
          {/* Minarets */}
          <path d="M150 70V28L152 22L154 28V70Z" />
          <path d="M246 70V28L248 22L250 28V70Z" />
          <path d="M148.5 34H155.5V36H148.5Z M244.5 34H251.5V36H244.5Z" />
          {/* Side domes and the hall */}
          <path d="M160 70V50C160 42 168 38 172 38C176 38 184 42 184 50V70Z" />
          <path d="M216 70V50C216 42 224 38 228 38C232 38 240 42 240 50V70Z" />
          <path d="M170 70V48H230V70Z" />
          {/* The main dome with its crescent */}
          <path d="M178 50C178 34 190 26 200 22C210 26 222 34 222 50Z" />
          <path d="M199.2 22V14H200.8V22Z" />
        </g>
        <path d="M200 7.5A3.2 3.2 0 1 0 202.6 12.4A2.6 2.6 0 1 1 200 7.5Z" fill={GOLD} opacity="0.9" />
      </svg>
      <Lantern className="absolute left-3 bottom-1 h-11 w-6 drop-shadow-[0_0_14px_rgba(255,190,90,0.75)]" />
      <Lantern className="absolute right-3 bottom-1 h-11 w-6 drop-shadow-[0_0_14px_rgba(255,190,90,0.75)]" />
    </div>
  );
}
