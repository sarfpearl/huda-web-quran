import Link from "next/link";
import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { LogoIcon } from "@/components/ui/Icon";
import { isWriteEnabled } from "@/lib/data/service";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {!isWriteEnabled ? (
        <div className="border-b border-gold-400/40 bg-gold-400/10 px-4 py-2 text-center text-sm text-gold-600 dark:text-gold-300">
          Demo mode — content is read-only. Connect Supabase
          (<code className="font-mono">NEXT_PUBLIC_DATA_SOURCE=supabase</code>) to
          enable saving, uploads and auth.
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <Link href="/" className="mb-5 hidden items-center gap-2 md:flex">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-700 text-xl text-gold-300">
              <LogoIcon />
            </span>
            <span className="text-sm font-semibold">
              HuDa Admin
              <span className="block text-[10px] font-normal uppercase tracking-widest text-muted">
                Admin Portal
              </span>
            </span>
          </Link>
          <div className="md:sticky md:top-6">
            <AdminNav />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
