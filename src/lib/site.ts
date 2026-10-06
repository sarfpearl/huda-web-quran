/** Central site configuration used for SEO, share links, and branding. */
export const siteConfig = {
  name: "HuDa",
  fullName: "HuDa Web Quran",
  tagline: "Listen. Reflect. Improve.",
  description:
    "Listen to and read the Holy Quran — 114 Surahs and 30 Juz, 51 reciters, word-by-word sync, Tajweed colours, Tamil and English translations.",
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
