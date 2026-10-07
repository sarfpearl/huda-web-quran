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
  // The UI and share text are English (translations are per-visitor).
  locale: "en_US",
  themeColor: "#1a5140",
} as const;

/** The link-preview card (src/app/opengraph-image.jpg, 1200×675). */
const shareImage = {
  url: "/opengraph-image.jpg",
  width: 1200,
  height: 675,
  type: "image/jpeg",
  alt: "HuDa Web Quran — Guidance for every moment",
};

/**
 * Open Graph + X card for a page. Next replaces a parent's `openGraph` /
 * `twitter` object wholesale (no deep merge), so a page that sets only its
 * title would lose the image, site name and large card — always build both here.
 */
export function shareMetadata(page: { title: string; description: string; url: string }) {
  return {
    openGraph: {
      type: "website" as const,
      siteName: siteConfig.fullName,
      locale: siteConfig.locale,
      title: page.title,
      description: page.description,
      url: page.url,
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: page.title,
      description: page.description,
      images: [shareImage],
    },
  };
}

/** Build an absolute URL from a site-relative path. */
export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${clean}`;
}
