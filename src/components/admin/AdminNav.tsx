"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GridIcon,
  HomeIcon,
  CompassIcon,
  QueueIcon,
  MoonIcon,
  CommentIcon,
} from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", Icon: HomeIcon, exact: true },
  { href: "/admin/bayan", label: "Bayan", Icon: QueueIcon },
  { href: "/admin/categories", label: "Categories", Icon: GridIcon },
  { href: "/admin/speakers", label: "Speakers", Icon: CompassIcon },
  { href: "/admin/media", label: "Media", Icon: MoonIcon },
  { href: "/admin/comments", label: "Comments", Icon: CommentIcon },
  { href: "/admin/settings", label: "Settings", Icon: GridIcon },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {LINKS.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary-700 text-sand-50"
                : "text-muted hover:surface-muted hover:text-primary-700"
            )}
          >
            <Icon className="text-lg" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
