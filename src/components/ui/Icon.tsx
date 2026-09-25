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

/** Video mode (ai-video). */
export const VideoCameraIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M14.4531 12.8948C14.3016 13.5215 13.5857 13.9644 12.1539 14.8502C10.7697 15.7064 10.0777 16.1346 9.51993 15.9625C9.28934 15.8913 9.07925 15.7562 8.90982 15.57C8.5 15.1198 8.5 14.2465 8.5 12.5C8.5 10.7535 8.5 9.88018 8.90982 9.42995C9.07925 9.24381 9.28934 9.10868 9.51993 9.03753C10.0777 8.86544 10.7697 9.29357 12.1539 10.1498C13.5857 11.0356 14.3016 11.4785 14.4531 12.1052C14.5156 12.3639 14.5156 12.6361 14.4531 12.8948Z" />
    <path d="M20.9977 11C21 11.4701 21 11.9693 21 12.5C21 16.9783 21 19.2175 19.6088 20.6088C18.2175 22 15.9783 22 11.5 22C7.02166 22 4.78249 22 3.39124 20.6088C2 19.2175 2 16.9783 2 12.5C2 8.02166 2 5.78249 3.39124 4.39124C4.78249 3 7.02166 3 11.5 3C12.0307 3 12.5299 3 13 3.00231" />
    <path d="M18.5 2L18.7579 2.69703C19.0961 3.61102 19.2652 4.06802 19.5986 4.40139C19.932 4.73477 20.389 4.90387 21.303 5.24208L22 5.5L21.303 5.75792C20.389 6.09613 19.932 6.26524 19.5986 6.59861C19.2652 6.93198 19.0961 7.38898 18.7579 8.30297L18.5 9L18.2421 8.30297C17.9039 7.38898 17.7348 6.93198 17.4014 6.59861C17.068 6.26524 16.611 6.09613 15.697 5.75792L15 5.5L15.697 5.24208C16.611 4.90387 17.068 4.73477 17.4014 4.40139C17.7348 4.06802 17.9039 3.61102 18.2421 2.69703L18.5 2Z" />
  </Base>
);

/** Image mode (ai-image). */
export const ImageIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <circle cx="7" cy="8" r="1.5" />
    <path d="M20.9977 11C21 11.4701 21 11.9693 21 12.5C21 16.9783 21 19.2175 19.6088 20.6088C18.2175 22 15.9783 22 11.5 22C7.02166 22 4.78249 22 3.39124 20.6088C2 19.2175 2 16.9783 2 12.5C2 8.02166 2 5.78249 3.39124 4.39124C4.78249 3 7.02166 3 11.5 3C12.0307 3 12.5299 3 13 3.00231" />
    <path d="M18.5 2L18.7579 2.69703C19.0961 3.61102 19.2652 4.06802 19.5986 4.40139C19.932 4.73477 20.389 4.90387 21.303 5.24208L22 5.5L21.303 5.75792C20.389 6.09613 19.932 6.26524 19.5986 6.59861C19.2652 6.93198 19.0961 7.38898 18.7579 8.30297L18.5 9L18.2421 8.30297C17.9039 7.38898 17.7348 6.93198 17.4014 6.59861C17.068 6.26524 16.611 6.09613 15.697 5.75792L15 5.5L15.697 5.24208C16.611 4.90387 17.068 4.73477 17.4014 4.40139C17.7348 4.06802 17.9039 3.61102 18.2421 2.69703L18.5 2Z" />
    <path d="M4.5 21.4999C8.87246 16.275 13.7741 9.384 20.9975 14.0424" />
  </Base>
);

/** Content browser / menu (sidebar-right). */
export const TvMenuIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M2 12C2 8.31087 2 6.4663 2.81382 5.15877C3.1149 4.67502 3.48891 4.25427 3.91891 3.91554C5.08116 3 6.72077 3 10 3H14C17.2792 3 18.9188 3 20.0811 3.91554C20.5111 4.25427 20.8851 4.67502 21.1862 5.15877C22 6.4663 22 8.31087 22 12C22 15.6891 22 17.5337 21.1862 18.8412C20.8851 19.325 20.5111 19.7457 20.0811 20.0845C18.9188 21 17.2792 21 14 21H10C6.72077 21 5.08116 21 3.91891 20.0845C3.48891 19.7457 3.1149 19.325 2.81382 18.8412C2 17.5337 2 15.6891 2 12Z" />
    <path d="M14.5 3L14.5 21" />
    <path d="M18 7H19M18 10H19" />
  </Base>
);

/** Translate (A / அ) — Ayah translation toggle; `slashed` when hidden. */
export const TranslateIcon = ({ slashed, ...p }: IconProps & { slashed?: boolean }) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M21.75 20.25L16.5 9.75L11.25 20.25" />
    <path d="M12.75 17.25H20.25" />
    <path d="M8.25 3V5.25" />
    <path d="M2.25 5.25H14.25" />
    <path d="M11.25 5.25C11.25 7.63695 10.3018 9.92613 8.61396 11.614C6.92613 13.3018 4.63695 14.25 2.25 14.25" />
    <path d="M5.76367 8.25C6.38514 10.004 7.53484 11.5224 9.0546 12.5963C10.5744 13.6702 12.3895 14.2468 14.2504 14.2468" />
    {slashed && <path d="M3 3l18 18" />}
  </Base>
);
/** Open book (book-open-02) — Ayah meaning toggle. */
export const BookOpenIcon = ({ slashed, ...p }: IconProps & { slashed?: boolean }) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M17.5055 2.01874C12.8289 2.83455 12 7.5 12 7.5V22C12 22 12.8867 17.1272 18.0004 16.5588C18.5493 16.4978 19 16.0576 19 15.5058V3.39309C19 2.5654 18.3216 1.87638 17.5055 2.01874Z" />
    <path d="M5.33333 5.00001C7.79379 4.99657 10.1685 5.88709 12 7.5V22C10.1685 20.3871 7.79379 19.4966 5.33333 19.5C3.77132 19.5 2.99032 19.5 2.64526 19.2792C2.4381 19.1466 2.35346 19.0619 2.22086 18.8547C2 18.5097 2 17.8941 2 16.6629V8.40322C2 6.97543 2 6.26154 2.54874 5.68286C3.09748 5.10418 3.65923 5.07432 4.78272 5.0146C4.965 5.00491 5.14858 5.00001 5.33333 5.00001Z" />
    <path d="M12 22.001C13.8315 20.3881 16.2062 19.4976 18.6667 19.501C20.2287 19.501 21.0097 19.501 21.3547 19.2802C21.5619 19.1476 21.6465 19.0629 21.7791 18.8558C22 18.5107 22 17.8951 22 16.6639V8.40424C22 6.97645 22 6.26256 21.4513 5.68388C20.9025 5.1052 20.1235 5.05972 19 5" />
    {slashed && <path d="M3 3l18 18" />}
  </Base>
);
/** Favourite (heart) — outline, or filled when `filled`. */
export const FavouriteIcon = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Base strokeWidth={1.5} {...p}>
    <path
      d="M10.4107 19.9677C7.58942 17.858 2 13.0348 2 8.69444C2 5.82563 4.10526 3.5 7 3.5C8.5 3.5 10 4 12 6C14 4 15.5 3.5 17 3.5C19.8947 3.5 22 5.82563 22 8.69444C22 13.0348 16.4106 17.858 13.5893 19.9677C12.6399 20.6776 11.3601 20.6776 10.4107 19.9677Z"
      fill={filled ? "currentColor" : "none"}
    />
  </Base>
);

// ── Category icons ──────────────────────────────────────────────────────────
/** Comment (speech bubble with lines) — comment-03. */
export const CommentIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M2 10.5C2 5.5 6 3 12 3C18 3 22 5.5 22 10.5C22 15.5 18 18 12 18V21C12 21 2 18 2 10.5Z" />
    <path d="M8 8.5H16M8 12.5H12" />
  </Base>
);
/** View count (three bars). */
export const ViewCountIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M10 6L10 18C10 18.465 10 18.6975 10.0511 18.8882C10.1898 19.4059 10.5941 19.8102 11.1118 19.9489C11.3025 20 11.535 20 12 20C12.465 20 12.6975 20 12.8882 19.9489C13.4059 19.8102 13.8102 19.4059 13.9489 18.8882C14 18.6975 14 18.465 14 18L14 6C14 5.53502 14 5.30252 13.9489 5.11177C13.8102 4.59414 13.4059 4.18981 12.8882 4.05111C12.6975 4 12.465 4 12 4C11.535 4 11.3025 4 11.1118 4.05111C10.5941 4.18981 10.1898 4.59414 10.0511 5.11177C10 5.30252 10 5.53502 10 6Z" />
    <path d="M3 16L3 18C3 18.465 3 18.6975 3.05111 18.8882C3.18981 19.4059 3.59413 19.8102 4.11177 19.9489C4.30252 20 4.53501 20 5 20C5.46499 20 5.69748 20 5.88823 19.9489C6.40587 19.8102 6.81019 19.4059 6.94889 18.8882C7 18.6975 7 18.465 7 18L7 16C7 15.535 7 15.3025 6.94889 15.1118C6.81019 14.5941 6.40587 14.1898 5.88823 14.0511C5.69748 14 5.46499 14 5 14C4.53501 14 4.30252 14 4.11177 14.0511C3.59413 14.1898 3.18981 14.5941 3.05111 15.1118C3 15.3025 3 15.535 3 16Z" />
    <path d="M17 12L17 18C17 18.465 17 18.6975 17.0511 18.8882C17.1898 19.4059 17.5941 19.8102 18.1118 19.9489C18.3025 20 18.535 20 19 20C19.465 20 19.6975 20 19.8882 19.9489C20.4059 19.8102 20.8102 19.4059 20.9489 18.8882C21 18.6975 21 18.465 21 18L21 12C21 11.535 21 11.3025 20.9489 11.1118C20.8102 10.5941 20.4059 10.1898 19.8882 10.0511C19.6975 10 19.465 10 19 10C18.535 10 18.3025 10 18.1118 10.0511C17.5941 10.1898 17.1898 10.5941 17.0511 11.1118C17 11.3025 17 11.535 17 12Z" />
  </Base>
);
/** Quran on a rehal (book stand) — Surah / Juz. */
export const QuranIcon = (p: IconProps) => (
  <Base strokeWidth={1.5} {...p}>
    <path d="M19.6475 5.43668L18.9895 4.39419C18.6252 3.81704 18.443 3.52846 18.2044 3.50178C17.9657 3.4751 17.6993 3.74896 17.1664 4.29667C15.4443 6.06689 13.7221 5.80537 12 8.98839C10.2779 5.80537 8.55571 6.06689 6.83356 4.29667C6.30071 3.74896 6.03429 3.4751 5.79565 3.50178C5.557 3.52846 5.37485 3.81704 5.01054 4.39419L4.35251 5.43668C4.09827 5.83945 3.97115 6.04084 4.00553 6.2528C4.03991 6.46476 4.22324 6.60998 4.58991 6.90042L10.7724 11.7977C11.3634 12.2659 11.659 12.5 12 12.5C12.341 12.5 12.6366 12.2659 13.2276 11.7977L19.4101 6.90042C19.7768 6.60998 19.9601 6.46476 19.9945 6.2528C20.0288 6.04084 19.9017 5.83945 19.6475 5.43668Z" />
    <path d="M22 8.5L6 20.5V15.8043M2 8.5L18 20.5V15.8043" />
  </Base>
);

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
  quran: (p) => <QuranIcon {...p} />,
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
