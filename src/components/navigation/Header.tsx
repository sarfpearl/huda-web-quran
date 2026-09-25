"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "./SearchBar";
import { TimeLocationWidget } from "./TimeLocationWidget";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/categories", label: "Categories" },
  { href: "/speakers", label: "Speakers" },
];

export function Header() {
  const pathname = usePathname();

  // Hide the public header inside the admin area (admin has its own chrome).
  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] border-b surface/80 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--surface))]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <TimeLocationWidget />

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/60 dark:text-primary-200"
                    : "text-muted hover:text-primary-700 dark:hover:text-primary-200"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden w-full max-w-xs lg:block">
          <SearchBar />
        </div>
      </div>
    </header>
  );
}
