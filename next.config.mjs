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
    // Only our R2 bucket's images (NEXT_PUBLIC_MEDIA_BASE_URL); every next/image
    // source goes through mediaUrl() → /assets/images/… on it.
    remotePatterns: [
      { protocol: "https", hostname: "pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev", pathname: "/assets/images/**" },
    ],
  },
};

export default nextConfig;
