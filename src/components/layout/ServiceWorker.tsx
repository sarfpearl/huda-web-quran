"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js (public/sw.js) so the site opens and reads offline.
 * Production only: in `next dev` a worker would serve stale chunks over HMR.
 * Registered after load so it never competes with the first paint.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
