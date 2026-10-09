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
    // iPhone home-screen app: the player sits 1rem off the screen's rounded
    // bottom corners — give its bottom corners the concentric radius.
    const corner = iPhoneAppCorner();
    if (corner) {
      root.classList.add("iphone-app");
      root.style.setProperty("--screen-corner", `${corner}px`);
    }
    if (!isSafari26Tab()) return () => root.classList.remove("screen-locked", "iphone-app");

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
      root.classList.remove("screen-locked", "safari-bleed", "iphone-app");
      window.scrollTo(0, 0);
    };
  }, [isHome]);

  // iOS Safari ignores user-scalable=no, so block its pinch gestures directly
  // — in the capture phase, so a control that stops a touch's propagation
  // (seek ring, sheet handle, reading view) can't let a pinch through.
  // Should the page still end up zoomed in (a pinch that began during a
  // rotation, the keyboard closing), it is put back at 1× by re-applying the
  // viewport tag, which makes Safari re-fit the page.
  useEffect(() => {
    const opts = { passive: false, capture: true } as const;
    const block = (ev: Event) => ev.preventDefault();
    const blockPinch = (ev: TouchEvent) => {
      if (ev.touches.length > 1) ev.preventDefault();
    };
    document.addEventListener("gesturestart", block, opts);
    document.addEventListener("gesturechange", block, opts);
    document.addEventListener("touchstart", blockPinch, opts);
    document.addEventListener("touchmove", blockPinch, opts);

    const vv = window.visualViewport;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    let t: ReturnType<typeof setTimeout> | undefined;
    const refit = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (!vv || !meta || vv.scale <= 1.01) return;
        // Not while typing: the keyboard's own scroll would jump.
        const el = document.activeElement;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
        const content = meta.content;
        meta.content = `${content.replace(/,?\s*maximum-scale=[^,]*/i, "")}, maximum-scale=1.0001`;
        requestAnimationFrame(() => (meta.content = content));
      }, 250);
    };
    vv?.addEventListener("resize", refit);
    window.addEventListener("orientationchange", refit);
    window.addEventListener("focusout", refit);
    return () => {
      document.removeEventListener("gesturestart", block, opts);
      document.removeEventListener("gesturechange", block, opts);
      document.removeEventListener("touchstart", blockPinch, opts);
      document.removeEventListener("touchmove", blockPinch, opts);
      vv?.removeEventListener("resize", refit);
      window.removeEventListener("orientationchange", refit);
      window.removeEventListener("focusout", refit);
      clearTimeout(t);
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

/** Display corner radius (pt) of the iPhone running the home-screen app, by
 *  screen size; 0 elsewhere (Safari tab, iPad, Android, Home-button iPhones). */
function iPhoneAppCorner(): number {
  if (!/iPhone/.test(navigator.userAgent)) return 0;
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (!standalone) return 0;
  const w = Math.min(screen.width, screen.height);
  const h = Math.max(screen.width, screen.height);
  if (h / w < 2) return 0; // SE / 8: square corners, Home button
  const radii: Record<string, number> = {
    "375x812": 39, // X, XS, 11 Pro, 12 / 13 mini
    "414x896": 41.5, // XR, XS Max, 11, 11 Pro Max
    "390x844": 47.33, // 12, 13, 14, 12 / 13 Pro
    "428x926": 53.33, // 12 / 13 Pro Max, 14 Plus
    "393x852": 55, // 14 Pro, 15, 15 Pro, 16
    "430x932": 55, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  };
  return radii[`${w}x${h}`] ?? 62; // 16 Pro and later, Air
}
