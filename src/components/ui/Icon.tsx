import type { SVGProps } from "react";

/*
 * Inline SVG icon set. Keeping icons local avoids an icon-library dependency
 * and keeps the bundle small. All icons inherit `currentColor` and a
 * consistent 24x24 viewbox with round line joins.
 */

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Base({ children, title, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" />
  </Base>
);
export const PauseIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
  </Base>
);
export const NextIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5l10 7-10 7V5Z" fill="currentColor" stroke="none" />
    <rect x="17" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </Base>
);
export const PrevIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M19 5L9 12l10 7V5Z" fill="currentColor" stroke="none" />
    <rect x="4.5" y="5" width="2.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </Base>
);
export const SearchIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Base>
);
export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 11.5 12 4l8 7.5" />
    <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
  </Base>
);
export const CompassIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
  </Base>
);
export const GridIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Base>
);
export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="17" cy="6" r="2.5" />
    <circle cx="17" cy="18" r="2.5" />
    <path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6" />
  </Base>
);
export const VolumeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="M15.5 9a3.5 3.5 0 0 1 0 6M18 6.5a7 7 0 0 1 0 11" />
  </Base>
);
export const MuteIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path d="m16 9 5 6M21 9l-5 6" />
  </Base>
);
export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);
export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Base>
);
export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const MenuIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Base>
);
export const ChevronDownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
);
export const YouTubeIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <path d="M10 9.5v5l4-2.5-4-2.5Z" fill="currentColor" stroke="none" />
  </Base>
);
export const ShuffleIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 7h4l10 10h4M3 17h4l3-3M14 7h3M18 4l3 3-3 3M18 14l3 3-3 3" />
  </Base>
);
export const RepeatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </Base>
);
export const EqualizerIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  </Base>
);
export const HeartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" fill="currentColor" stroke="none" />
  </Base>
);
export const PlaylistAddIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h11M4 12h11M4 18h6M16 16h6M19 13v6" />
  </Base>
);
export const QueueIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 6h11M4 12h11M4 18h7" />
    <path d="M17 13v6l4-2-4-2Z" fill="currentColor" stroke="none" />
  </Base>
);
export const SpeedIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 13a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8Z" />
    <path d="m12 13 4-4" />
  </Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12 4.5 4.5L19 7" />
  </Base>
);
export const TrashIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </Base>
);
export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const EditIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4l6 6-11 11H3v-6L14 4Z" />
  </Base>
);
export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);
export const LogoIcon = (p: IconProps) => (
  // Crescent + subtle star — original mark for "Huda".
  <Base {...p} strokeWidth={1.6}>
    <path d="M18.5 15.2A7 7 0 1 1 12 4.6a5.6 5.6 0 1 0 6.5 10.6Z" fill="currentColor" stroke="none" />
    <path d="M17.5 4.5l.7 1.6 1.8.2-1.3 1.2.4 1.7-1.6-.9-1.6.9.4-1.7-1.3-1.2 1.8-.2.7-1.6Z" fill="currentColor" stroke="none" opacity="0.9" />
  </Base>
);
export const YouTubeMusicIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    {...p}
  >
    <circle cx="12" cy="12" r="11" fill="#FF0000" />
    <circle cx="12" cy="12" r="5.5" stroke="white" strokeWidth="1.3" fill="none" />
    <polygon points="10.5,8.8 15.5,12 10.5,15.2" fill="white" />
  </svg>
);

export const ImamQuranIcon = (p: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="none"
    {...p}
  >
    {/* Subtle emerald circular background disc matching glassmorphism */}
    <circle cx="12" cy="12" r="11" fill="#047857" fillOpacity="0.8" />
    <circle cx="12" cy="12" r="11" stroke="#34D399" strokeWidth="1" strokeOpacity="0.5" />

    {/* Voice / Recitation soundwaves emanating from the Quran */}
    <path
      d="M9 4a4.2 4.2 0 0 1 6 0"
      stroke="#A7F3D0"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
    <path
      d="M7.4 2.2a6.4 6.4 0 0 1 9.2 0"
      stroke="#D1FAE5"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeOpacity="0.8"
    />

    {/* Open Holy Quran Pages */}
    <path
      d="M4.6 15.2c2.2-1.3 4.8-1.1 7.4.4 2.6-1.5 5.2-1.7 7.4-.4V8.5c-2.2-1.3-4.8-1.1-7.4.4-2.6-1.5-5.2-1.7-7.4-.4v6.7Z"
      fill="#FEF3C7"
      stroke="#F59E0B"
      strokeWidth="0.85"
      strokeLinejoin="round"
    />
    {/* Central book spine divider */}
    <line x1="12" y1="8.9" x2="12" y2="15.6" stroke="#D97706" strokeWidth="1" strokeLinecap="round" />

    {/* Small emerald recitation play badge at book heart */}
    <polygon points="10.8,11.2 13.6,12.5 10.8,13.8" fill="#047857" />

    {/* Traditional wooden Rehal (X-bookstand) */}
    <path
      d="M7.2 16.2l9.6 4.2M16.8 16.2l-9.6 4.2"
      stroke="#FBBF24"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

export const VideoCameraIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={1.8}>
    <rect x="2.5" y="5" width="13" height="14" rx="2.5" />
    <path d="M15.5 10l5.5-3.5v11L15.5 14" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="12" r="1.8" fill="#34d399" stroke="none" />
  </Base>
);

export const ImageIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={1.8}>
    <rect width="18" height="18" x="3" y="3" rx="3.5" />
    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
    <path
      d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Base>
);

export const TvMenuIcon = (p: IconProps) => (
  <Base {...p} strokeWidth={1.8}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" />
    <line x1="16" y1="4.5" x2="16" y2="19.5" />
    <circle cx="18.5" cy="8" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="12" r="0.75" fill="currentColor" stroke="none" />
    <circle cx="18.5" cy="16" r="0.75" fill="currentColor" stroke="none" />
  </Base>
);

// ── Category icons ──────────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  heart: (p) => (
    <Base {...p}>
      <path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10Z" />
    </Base>
  ),
  book: (p) => (
    <Base {...p}>
      <path d="M12 6c-1.8-1.2-4-1.5-6-1v13c2-.5 4.2-.2 6 1 1.8-1.2 4-1.5 6-1V5c-2-.5-4.2-.2-6 1Z" />
      <path d="M12 6v13" />
    </Base>
  ),
  moon: (p) => <MoonIcon {...p} />,
  hands: (p) => (
    <Base {...p}>
      <path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V5a1.5 1.5 0 0 1 3 0v6" />
      <path d="M14 11V7a1.5 1.5 0 0 1 3 0v7a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.6-3L5 14a1.6 1.6 0 0 1 3-1" />
    </Base>
  ),
  sparkle: (p) => (
    <Base {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </Base>
  ),
  home: (p) => <HomeIcon {...p} />,
  rings: (p) => (
    <Base {...p}>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M9 4l1.5 3h-3L9 4ZM15 4l1.5 3h-3L15 4Z" />
    </Base>
  ),
  child: (p) => (
    <Base {...p}>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M12 8.5V15M8 11h8M9 20l3-5 3 5" />
    </Base>
  ),
  star: (p) => (
    <Base {...p}>
      <path d="m12 4 2.4 5 5.6.5-4.2 3.7 1.3 5.4L12 20.8 6.9 23.6l1.3-5.4L4 14.5 9.6 14 12 4Z" transform="translate(0 -2)" />
    </Base>
  ),
  lantern: (p) => (
    <Base {...p}>
      <path d="M9 4h6M10 4v2M14 4v2" />
      <rect x="7" y="6" width="10" height="12" rx="4" />
      <path d="M10 20h4" />
    </Base>
  ),
  kaaba: (p) => (
    <Base {...p}>
      <path d="M12 3l8 4v10l-8 4-8-4V7l8-4Z" />
      <path d="M4 7h16M9 20V9M15 20V9M4 11h16" />
    </Base>
  ),
  path: (p) => (
    <Base {...p}>
      <path d="M6 21c0-6 3-9 3-12a3 3 0 0 1 6 0c0 3 3 6 3 12" />
      <path d="M9 21h6" />
    </Base>
  ),
  scroll: (p) => (
    <Base {...p}>
      <path d="M6 4h10a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6" />
      <path d="M9 8h6M9 12h6M4 6a2 2 0 0 0 2 2" />
    </Base>
  ),
  growth: (p) => (
    <Base {...p}>
      <path d="M12 21V9" />
      <path d="M12 12C9 12 6 10 6 6c4 0 6 2 6 6ZM12 10c3 0 6-1.5 6-5-4 0-6 1.5-6 5Z" />
    </Base>
  ),
  flower: (p) => (
    <Base {...p}>
      <circle cx="12" cy="10" r="2" />
      <path d="M12 8c0-2 1-4 0-5-1 1 0 3 0 5ZM12 12c0 2-1 4 0 5 1-1 0-3 0-5ZM10 10c-2 0-4-1-5 0 1 1 3 0 5 0ZM14 10c2 0 4-1 5 0-1 1-3 0-5 0ZM12 12v9" />
    </Base>
  ),
  mic: (p) => (
    <Base {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
    </Base>
  ),
};

export function CategoryIcon({ name, ...props }: IconProps & { name: string }) {
  const Cmp = CATEGORY_ICONS[name] ?? CATEGORY_ICONS.mic;
  return <Cmp {...props} />;
}
