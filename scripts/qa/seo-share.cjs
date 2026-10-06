#!/usr/bin/env node
// SEO / share-card check: every page kind (home, Surah, ayah link, Juz) has
// its own title / description / canonical, the full Open Graph + X card
// (image, site name, large card — Next drops these when a page overrides
// `openGraph`), valid JSON-LD; the icons, manifest, robots and sitemap are
// served; bad links are 404 + noindex.
//
// Usage: node scripts/qa/seo-share.cjs [base-url]   (default: the live site)
// Locally: NEXT_PUBLIC_SITE_URL=https://huda-web-quran.vercel.app next build,
// then `next start -p 3100` and pass http://localhost:3100.
const BASE = (process.argv[2] || "https://huda-web-quran.vercel.app").replace(/\/$/, "");
const SITE = "https://huda-web-quran.vercel.app";

const PAGES = [
  { path: "/", canonical: SITE, ld: "WebSite" },
  { path: "/surah/36", canonical: `${SITE}/surah/36`, ld: "BreadcrumbList", title: /Ya-Sin/ },
  { path: "/surah/36/3", canonical: `${SITE}/surah/36`, ogUrl: `${SITE}/surah/36/3`, ld: "BreadcrumbList", title: /Ya-Sin 36:3/ },
  { path: "/surah/114", canonical: `${SITE}/surah/114`, ld: "BreadcrumbList", title: /An-Nas/ },
  { path: "/juz/30", canonical: `${SITE}/juz/30`, ld: "BreadcrumbList", title: /Juz 30/ },
];
const FILES = [
  ["/favicon.ico", "image/x-icon"],
  ["/favicon.png", "image/png"],
  ["/apple-touch-icon.png", "image/png"],
  ["/icon-192.png", "image/png"],
  ["/opengraph-image.jpg", "image/jpeg"],
  ["/manifest.webmanifest", "application/manifest+json"],
  ["/robots.txt", "text/plain"],
  ["/sitemap.xml", "application/xml"],
];

let failures = 0;
const fail = (where, msg) => { failures++; console.log(`✗ ${where}: ${msg}`); };
const decode = (s) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const meta = (html, key) => {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`));
  return m ? decode(m[1]) : null;
};

(async () => {
  for (const p of PAGES) {
    const res = await fetch(BASE + p.path);
    const html = await res.text();
    if (res.status !== 200) { fail(p.path, `status ${res.status}`); continue; }
    const title = decode((html.match(/<title>([^<]*)/) || [])[1] || "");
    const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
    if (p.title && !p.title.test(title)) fail(p.path, `title "${title}"`);
    if (canonical !== p.canonical) fail(p.path, `canonical ${canonical}`);
    if (meta(html, "og:url") !== (p.ogUrl || p.canonical)) fail(p.path, `og:url ${meta(html, "og:url")}`);
    for (const k of ["description", "og:title", "og:description", "og:site_name", "og:type", "og:image", "og:image:alt", "twitter:title", "twitter:image"]) {
      if (!meta(html, k)) fail(p.path, `missing ${k}`);
    }
    if (p.title && !p.title.test(meta(html, "og:title") || "")) fail(p.path, `og:title "${meta(html, "og:title")}"`);
    if (meta(html, "og:locale") !== "en_US") fail(p.path, `og:locale ${meta(html, "og:locale")}`);
    if (meta(html, "twitter:card") !== "summary_large_image") fail(p.path, `twitter:card ${meta(html, "twitter:card")}`);
    if (meta(html, "og:image:width") !== "1200" || meta(html, "og:image:height") !== "675") fail(p.path, "og:image size");
    if (!/rel="apple-touch-icon"/.test(html) || !/rel="icon" href="\/favicon\.ico"/.test(html)) fail(p.path, "icon links");
    const img = meta(html, "og:image");
    if (img && !img.startsWith(SITE)) fail(p.path, `og:image not absolute on the site: ${img}`);
    const lds = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    if (lds.length !== 1 || lds[0]["@type"] !== p.ld) fail(p.path, `JSON-LD ${lds.map((l) => l["@type"])}`);
    console.log(`✓ ${p.path} — ${title}`);
  }

  for (const [path, type] of FILES) {
    const res = await fetch(BASE + path);
    const body = Buffer.from(await res.arrayBuffer());
    if (res.status !== 200 || !(res.headers.get("content-type") || "").startsWith(type) || !body.length) {
      fail(path, `${res.status} ${res.headers.get("content-type")}`);
    } else if (path === "/opengraph-image.jpg" && body.length > 300_000) {
      fail(path, `${body.length} bytes — WhatsApp skips previews over ~300 KB`);
    } else if (path === "/sitemap.xml") {
      const n = (body.toString().match(/<loc>/g) || []).length;
      if (n !== 145) fail(path, `${n} URLs (want 1 + 114 Surahs + 30 Juz)`);
    } else if (path === "/robots.txt" && !/Disallow: \/admin/.test(body.toString())) {
      fail(path, "admin not disallowed");
    }
  }
  console.log(`✓ ${FILES.length} files served`);

  for (const path of ["/surah/0", "/surah/115", "/surah/36/84", "/juz/31", "/nope"]) {
    const res = await fetch(BASE + path);
    const html = await res.text();
    if (res.status !== 404) fail(path, `status ${res.status}`);
    if (!/<meta name="robots" content="noindex"/.test(html)) fail(path, "no noindex");
  }
  console.log("✓ bad links → 404 + noindex");

  console.log(failures ? `\n${failures} failure(s)` : "\n0 failures");
  process.exit(failures ? 1 : 0);
})();
