/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A local production build for QA (NEXT_DIST_DIR=.next-prod) must not
  // overwrite the running dev server's .next ("Cannot find module './161.js'").
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev" },
      { protocol: "https", hostname: "*.r2.dev" },
    ],
  },
};

export default nextConfig;
