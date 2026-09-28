"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BayanSort } from "@/types/bayan";
import { cn } from "@/lib/utils";

const OPTIONS: { value: BayanSort; label: string }[] = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Popular" },
  { value: "duration", label: "Duration" },
];

export function SortTabs({ current }: { current: BayanSort }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: BayanSort) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "latest") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div
      role="tablist"
      aria-label="Sort"
      className="inline-flex items-center gap-1 rounded-full border surface-muted p-1"
    >
      {OPTIONS.map((o) => {
        const active = o.value === current;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => select(o.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-700 text-sand-50"
                : "text-muted hover:text-primary-700 dark:hover:text-primary-200"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
