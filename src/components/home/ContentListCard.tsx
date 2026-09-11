"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/Icon";

export interface ContentListCardProps {
  /** Padded index number string e.g. "01", "02", ... "114" */
  number: string;
  /** Image source url */
  imageSrc: string;
  /** Main primary title (e.g. "Al-Fatihah", "Alif Lam Meem", "Iman & Taqwa") */
  title: string;
  /** Secondary highlight label (e.g. "الفاتحة", "Para 1", "ஈமான் & தக்வா") */
  secondaryLabel?: string;
  /** If true, formats secondary label as Arabic text with dir="rtl" and font-arabic */
  isArabicLabel?: boolean;
  /** Subtitle / metadata description underneath title */
  subtitle: string;
  /** Trailing icon name (e.g. "book", "heart", "moon", etc.) */
  iconName?: string;
  /** Whether this card represents the currently active/selected item */
  isActive?: boolean;
  /** Whether audio is actively playing for this item (displays 3-bar equalizer) */
  isPlaying?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Custom extra classes */
  className?: string;
}

/**
 * Unified ContentListCard component for HuDa Web Quran.
 * Renders an identical, visually consistent card structure for:
 * - Surah (114 chapters)
 * - Quran (30 Juz)
 * - Bayan (Categories)
 */
export function ContentListCard({
  number,
  imageSrc,
  title,
  secondaryLabel,
  isArabicLabel = false,
  subtitle,
  iconName = "book",
  isActive = false,
  isPlaying = false,
  onClick,
  className,
}: ContentListCardProps) {
  const [imgSrc, setImgSrc] = React.useState(imageSrc);

  React.useEffect(() => {
    setImgSrc(imageSrc);
  }, [imageSrc]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-all border select-none",
        isActive
          ? "bg-emerald-950/80 border-emerald-400/90 text-white shadow-[0_0_24px_rgba(52,211,153,0.25)]"
          : "bg-white/5 border-white/5 text-sand-100 hover:bg-white/10 hover:border-white/20 active:scale-[0.99]",
        className
      )}
    >
      {/* 1. Leading Number (Mono font, green when active) */}
      <span
        className={cn(
          "w-5 text-center text-xs font-mono font-bold shrink-0 transition-colors",
          isActive ? "text-emerald-300" : "text-sand-200/40 group-hover:text-sand-200/70"
        )}
      >
        {number}
      </span>

      {/* 2. Rounded Landscape Thumbnail */}
      <div className="relative h-12 w-16 md:h-14 md:w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900 border border-white/10 shadow-sm">
        <Image
          src={imgSrc}
          alt={title}
          fill
          quality={95}
          sizes="(max-width: 768px) 128px, 160px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgSrc("/assets/images/bayan/quran.jpg")}
        />
      </div>

      {/* 3. Main Title & Subtitle Metadata */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="truncate text-xs md:text-sm font-bold text-white tracking-tight">
            {title}
          </span>
          {secondaryLabel && (
            <span
              lang={isArabicLabel ? "ar" : undefined}
              dir={isArabicLabel ? "rtl" : undefined}
              className={cn(
                "shrink-0 font-semibold text-emerald-300/90",
                isArabicLabel
                  ? "font-arabic text-xs md:text-sm"
                  : "text-[10px] md:text-[11px]"
              )}
            >
              · {secondaryLabel}
            </span>
          )}
        </div>
        <p className="line-clamp-1 mt-0.5 text-[11px] text-sand-200/60 font-normal">
          {subtitle}
        </p>
      </div>

      {/* 4. Trailing Action Button / Icon / Equalizer */}
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm transition-all",
          isActive
            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40"
            : "bg-white/5 text-sand-200/50 group-hover:bg-white/10 group-hover:text-sand-200/80"
        )}
      >
        {isActive && isPlaying ? (
          <span className="flex items-end gap-0.5" aria-label="Playing">
            <span className="h-3 w-0.5 animate-[equalizer_0.6s_ease-in-out_infinite] bg-emerald-300" />
            <span className="h-4 w-0.5 animate-[equalizer_0.8s_ease-in-out_infinite] bg-emerald-300" />
            <span className="h-2.5 w-0.5 animate-[equalizer_0.5s_ease-in-out_infinite] bg-emerald-300" />
          </span>
        ) : (
          <CategoryIcon name={iconName} />
        )}
      </div>
    </button>
  );
}
