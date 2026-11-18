import { cn } from "@/lib/utils";
import { CategoryIcon } from "./Icon";

/*
 * Generated abstract Islamic-style cover art. Deterministic per `seed` so a
 * given Bayan always renders the same artwork. Purely original geometry —
 * the HuDa logo (faint) over a calm green gradient and guide circles. Used as a placeholder
 * until real cover images are provided via Supabase Storage.
 */

const PALETTES: Array<[string, string]> = [
  ["#1a5140", "#0f2e25"],
  ["#1f664c", "#153f32"],
  ["#2f8060", "#123a2d"],
  ["#155e4a", "#0b241d"],
  ["#1a5140", "#243b2f"],
  ["#0f5a5a", "#082c2c"], // teal
  ["#2b6f5a", "#10362b"],
  ["#1e5a70", "#0c2733"], // deep blue-green
  ["#3a6f4a", "#16311f"],
  ["#4a6d3a", "#1c2a15"], // olive
  ["#5a5030", "#241f12"], // warm sand-green
  ["#255f4d", "#0a251d"],
];

// Strong avalanche hash (xmur3-style) so even near-identical seeds like
// "quran-surah-1" vs "quran-surah-2" produce wildly different values — every
// derived parameter (palette, geometry, rotation) then varies per item, so
// all 114 Surahs and 30 Juz get visibly distinct generated covers.
function hash(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

export function CoverArt({
  seed,
  icon,
  className,
  rounded = "rounded-2xl",
}: {
  seed: string;
  icon?: string;
  className?: string;
  rounded?: string;
}) {
  const h = hash(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const rotate = h % 90;
  const gid = `g-${h % 100000}`;
  // Seed-derived geometry so each item looks distinct: the two guide-circle
  // radii and the gradient angle vary with the seed.
  const rOuter = 52 + ((h >>> 4) % 24); // 52–75
  const rInner = 22 + ((h >>> 6) % 16); // 22–37
  const angle = (h >>> 8) % 2 === 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-primary-800",
        rounded,
        className
      )}
    >
      <svg
        viewBox="0 0 200 200"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient
            id={gid}
            x1="0"
            y1="0"
            x2={angle ? "1" : "0.3"}
            y2="1"
          >
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#${gid})`} />
        <g
          transform={`rotate(${rotate} 100 100)`}
          stroke="#c69749"
          strokeOpacity="0.22"
          fill="none"
          strokeWidth="1"
        >
          <circle cx="100" cy="100" r={rOuter} strokeOpacity="0.12" />
          <circle cx="100" cy="100" r={rInner} strokeOpacity="0.18" />
        </g>
        <g stroke="#c69749" strokeOpacity="0.10" strokeWidth="1" fill="none">
          <path d="M0 40 H200 M0 100 H200 M0 160 H200 M40 0 V200 M100 0 V200 M160 0 V200" />
        </g>
      </svg>
      {icon ? (
        <div className="absolute inset-0 grid place-items-center">
          <CategoryIcon
            name={icon}
            className="text-4xl text-gold-300/80"
            strokeWidth={1.2}
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/huda-logo.webp?v=3"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-80"
        />
      )}
    </div>
  );
}
