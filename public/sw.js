/*
 * HuDa service worker: the site opens and reads offline.
 *
 * - Pages: network first; offline → the same page from cache, else the
 *   cached home ("/"), else a small "You're offline" page.
 * - /_next/static (hashed) and the Mushaf page fonts (versioned): cache first.
 * - /data (verses, translations, timings, glyphs): network first, so a fix
 *   reaches everyone at once; offline → the cached copy.
 * - Images (scenes, thumbnails, icons): cache first, the newest IMAGE_MAX kept.
 * - Audio, video, Supabase, location: not touched (streams with ranges, live data).
 *
 * Bump VERSION to drop every cache on the next visit.
 */
const VERSION = "v1";
const PAGES = `huda-pages-${VERSION}`;
const STATIC = `huda-static-${VERSION}`;
const DATA = `huda-data-${VERSION}`;
const IMAGES = `huda-images-${VERSION}`;
const CACHES = [PAGES, STATIC, DATA, IMAGES];
const STATIC_MAX = 400;
const DATA_MAX = 600;
const IMAGE_MAX = 80;
const PAGE_MAX = 40;

// The home page (it can open any Surah) and what its first paint needs.
const PRECACHE_PAGES = ["/", "/manifest.webmanifest"];
const PRECACHE_STATIC = ["/fonts/UthmanicHafs1Ver18.woff2"];
const PRECACHE_IMAGES = ["/huda-logo.webp?v=3", "/icon-192.png"];

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · HuDa</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e100f;color:#f3eee4;font:16px/1.5 system-ui,sans-serif;text-align:center;padding:24px}button{margin-top:16px;height:44px;padding:0 24px;border-radius:999px;border:0;background:#1a5140;color:#fff;font:inherit;font-weight:600}</style></head><body><div><h1 style="font-size:20px;margin:0 0 8px">You're offline</h1><p style="margin:0;opacity:.8">Connect to the internet to open HuDa.<br>இணையத்துடன் இணைந்து HuDa-வைத் திறக்கவும்.</p><button onclick="location.reload()">Try again</button></div></body></html>`;

self.addEventListener("install", (event) => {
  const add = (name, urls) => caches.open(name).then((cache) => cache.addAll(urls)).catch(() => {});
  event.waitUntil(
    Promise.all([add(PAGES, PRECACHE_PAGES), add(STATIC, PRECACHE_STATIC), add(IMAGES, PRECACHE_IMAGES)]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("huda-") && !CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Keep a cache to its newest `max` entries (keys come back oldest first).
async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function put(name, max, request, response) {
  try {
    const cache = await caches.open(name);
    // Re-adding moves it to the end (newest).
    await cache.delete(request);
    await cache.put(request, response);
    await trim(name, max);
  } catch {
    /* quota or storage blocked */
  }
}

async function networkFirst(event, name, max, fallback) {
  const { request } = event;
  try {
    const response = await fetch(request);
    if (response.ok) event.waitUntil(put(name, max, request, response.clone()));
    return response;
  } catch (err) {
    const cached = await (await caches.open(name)).match(request, { ignoreVary: true });
    if (cached) return cached;
    if (fallback) return fallback();
    throw err;
  }
}

async function cacheFirst(event, name, max) {
  const { request } = event;
  const cached = await (await caches.open(name)).match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  // Opaque (cross-origin <img>, status 0) is fine to keep for images.
  if (response.ok || response.type === "opaque") event.waitUntil(put(name, max, request, response.clone()));
  return response;
}

async function offlinePage(request) {
  const url = new URL(request.url);
  const cache = await caches.open(PAGES);
  // The page itself, ignoring ?query; then the home, which can open any Surah.
  const page = (await cache.match(url.pathname, { ignoreSearch: true })) || (await cache.match("/"));
  if (page) return page;
  return new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Audio / video: ranged streams; leave to the browser.
  if (request.destination === "audio" || request.destination === "video" || request.headers.has("range")) return;

  if (request.mode === "navigate") {
    if (!sameOrigin || url.pathname.startsWith("/admin")) return;
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          // Cache by path: /surah/36/3 and /surah/36/4 are different pages.
          if (response.ok && response.type === "basic") {
            const key = new Request(url.origin + url.pathname);
            event.waitUntil(put(PAGES, PAGE_MAX, key, response.clone()));
          }
          return response;
        } catch {
          return offlinePage(request);
        }
      })(),
    );
    return;
  }

  if (sameOrigin) {
    // App-router data requests and API routes: always live.
    if (request.headers.has("RSC") || url.searchParams.has("_rsc") || url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/")) {
      event.respondWith(cacheFirst(event, STATIC, STATIC_MAX));
      return;
    }
    if (url.pathname.startsWith("/data/")) {
      event.respondWith(networkFirst(event, DATA, DATA_MAX));
      return;
    }
    if (url.pathname === "/manifest.webmanifest") {
      event.respondWith(networkFirst(event, PAGES, PAGE_MAX));
      return;
    }
  }

  if (request.destination === "image" && (sameOrigin || url.hostname.endsWith(".r2.dev"))) {
    event.respondWith(cacheFirst(event, IMAGES, IMAGE_MAX));
  }
});
