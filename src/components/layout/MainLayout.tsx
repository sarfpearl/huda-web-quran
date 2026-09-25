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
    if (!isSafari26Tab()) return () => root.classList.remove("screen-locked");

    // iOS 26 Safari shows the scene behind its bars only once the page has
    // scrolled; hold it on the 64px runway (see .safari-bleed in globals.css).
    root.classList.add("safari-bleed");
    const hold = () => {
      if (window.scrollY < 1) window.scrollTo(0, 64);
    };
    hold();
    window.addEventListener("scroll", hold, { passive: true });
    window.addEventListener("pageshow", hold);
    return () => {
      window.removeEventListener("scroll", hold);
      window.removeEventListener("pageshow", hold);
      root.classList.remove("screen-locked", "safari-bleed");
      window.scrollTo(0, 0);
    };
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
      <div className="bleed-clear fixed inset-0 overflow-hidden font-sans select-none bg-black/[0.99]">
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

/** Safari 26+ in a normal iPhone / iPad tab (not the home-screen app, not Chrome / Firefox / Edge). */
function isSafari26Tab(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios || /CriOS|FxiOS|EdgiOS/.test(ua)) return false;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone && Number(ua.match(/Version\/(\d+)/)?.[1] ?? 0) >= 26;
}
