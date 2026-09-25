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

  // iOS Safari ignores user-scalable=no, so block its pinch gestures directly.
  useEffect(() => {
    const block = (ev: Event) => ev.preventDefault();
    const blockPinch = (ev: TouchEvent) => {
      if (ev.touches.length > 1) ev.preventDefault();
    };
    document.addEventListener("gesturestart", block, { passive: false });
    document.addEventListener("gesturechange", block, { passive: false });
    document.addEventListener("touchmove", blockPinch, { passive: false });
    return () => {
      document.removeEventListener("gesturestart", block);
      document.removeEventListener("gesturechange", block);
      document.removeEventListener("touchmove", blockPinch);
    };
  }, []);

  if (isHome) {
    return (
      // 99% alpha, not opaque: iOS 26 Safari clips opaque fixed layers to the
      // inner viewport, leaving bars above/below; translucent ones go edge to edge.
      // Black, not slate: Safari tints its bars with this colour.
      <div className="fixed inset-0 overflow-hidden font-sans select-none bg-black/[0.99]">
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
