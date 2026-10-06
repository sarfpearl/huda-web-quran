/** Central site configuration used for SEO, share links, and branding. */
export const siteConfig = {
  name: "HuDa",
  fullName: "HuDa Web Quran",
  tagline: "Read. Listen. Reflect.",
  // The home page's title and the share-card (link preview) title.
  title: "HuDa Web Quran — Read. Listen. Reflect.",
  description:
    "Read and listen to the Holy Quran — 114 Surahs, 30 Juz, 51 reciters, word-by-word sync, Tajweed colours, and multilingual translations.",
  // Prefer the env value; fall back to localhost for dev.
  url: (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, ""),
  locale: "ta_IN",
  themeColor: "#1a5140",
} as const;

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${clean}`;
}
