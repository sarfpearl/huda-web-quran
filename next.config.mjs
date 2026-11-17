/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No Next.js "N" badge in dev either (it sat over screens being reviewed).
  devIndicators: false,
  // A local production build for QA (NEXT_DIST_DIR=.next-prod) must not
  // overwrite the running dev server's .next ("Cannot find module './161.js'").
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    formats: ["image/avif", "image/webp"],
    // Only our R2 bucket's images (NEXT_PUBLIC_MEDIA_BASE_URL); every next/image
    // source goes through mediaUrl() → /assets/images/… on it.
    remotePatterns: [
      { protocol: "https", hostname: "media.hudaguidance.com", pathname: "/assets/images/**" },
    ],
  },
  // Record (src/lib/record): the canvas and Web Audio need CORS media, and R2
  // sends no CORS headers — the recorder loads R2 files through this
  // same-origin path instead (src/lib/record/corsMedia.ts).
  async rewrites() {
    const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").trim().replace(/\/+$/, "");
    return base ? [{ source: "/media-cors/:path*", destination: `${base}/:path*` }] : [];
  },
  // Never cached by Vercel: its cache ignores Range, so Safari's first 2-byte
  // probe (bytes=0-1) was stored and then served for every range after it —
  // Safari's recitation stalled, and the poisoned file broke Chrome too.
  // (R2 / Cloudflare in front of it still cache the files.)
  async headers() {
    return [{ source: "/media-cors/:path*", headers: [{ key: "x-vercel-enable-rewrite-caching", value: "0" }] }];
  },
  // The old Vercel address sends visitors to www.hudaguidance.com, keeping the
  // path. /api stays put so the keepalive cron isn't redirected. Preview
  // deployments have their own hosts and are untouched.
  async redirects() {
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "huda-web-quran.vercel.app" }],
        destination: "https://www.hudaguidance.com/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
