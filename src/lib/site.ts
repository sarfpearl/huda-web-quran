/** Central site configuration used for SEO, share links, and branding. */
export const siteConfig = {
  name: "HuDa",
  fullName: "HuDa Web Quran",
  tagline: "Listen. Reflect. Improve.",
  description:
    "Discover and listen to the Holy Quran, Islamic Bayan and reminders in Tamil that inspire faith and reflection. Listen to lectures by topic and speaker.",
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
