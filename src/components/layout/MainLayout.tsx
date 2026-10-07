"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The immersive home is also served at its deep links (/surah/36, /juz/30),
  // and the address follows playback there (lib/deepLink) — so after the
  // first play "/" becomes /surah/1 and must stay locked.
  const isHome = pathname === "/" || /^\/(surah|juz)\//.test(pathname);

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
      <main className="bleed-clear fixed inset-0 overflow-hidden font-sans select-none bg-black/[0.99]">
        <SkipLink href="#player">Skip to player</SkipLink>
        {/* Full-screen homepage content */}
        {children}
      </main>
    );
  }

  // Only the 404 / error pages render outside the immersive home.
  return (
    <>
      <SkipLink href="#main">Skip to content</SkipLink>
      <main id="main" tabIndex={-1} className="app-shell mx-auto min-h-screen max-w-6xl px-4 sm:px-6 outline-none">
        {children}
      </main>
    </>
  );
}

/** First Tab stop: hidden until focused, then jumps past the header. */
function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(ev) => {
        // Move focus too (not only scroll): the home screen never scrolls.
        const target = document.querySelector<HTMLElement>(href);
        if (!target) return;
        ev.preventDefault();
        target.focus();
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-sand-50"
    >
      {children}
    </a>
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
