"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/navigation/Header";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { GlobalAudioPlayer } from "@/components/player/GlobalAudioPlayer";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAdmin = pathname?.startsWith("/admin");

  // The immersive home is a fixed full-screen view — lock the document so
  // mobile browsers can't scroll or rubber-band it.
  useEffect(() => {
    if (!isHome) return;
    const root = document.documentElement;
    root.classList.add("screen-locked");
    return () => root.classList.remove("screen-locked");
  }, [isHome]);

  if (isHome) {
    return (
      <div className="fixed inset-0 overflow-hidden font-sans select-none bg-slate-950">
        {/* Full-screen homepage content */}
        {children}
      </div>
    );
  }

  return (
    <>
      {!isAdmin && <Header />}
      <main id="main" className="app-shell mx-auto min-h-screen max-w-6xl px-4 sm:px-6">
        {children}
      </main>
      <GlobalAudioPlayer />
      {!isAdmin && <MobileBottomNav />}
    </>
  );
}
