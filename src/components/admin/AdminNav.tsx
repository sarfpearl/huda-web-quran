"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CommentIcon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

// Only live (Supabase-backed) tools are listed. The demo Bayan pages
// (Dashboard, Bayan, Categories, Speakers, Media, Settings) are hidden until
// their content moves to Supabase — add them back here then.
const LINKS: { href: string; label: string; Icon: (p: { className?: string }) => JSX.Element; exact?: boolean }[] = [
  { href: "/admin/comments", label: "Comments", Icon: CommentIcon },
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
