import type { MetadataRoute } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteConfig.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...Array.from({ length: 114 }, (_, i) => ({
      url: absoluteUrl(`/surah/${i + 1}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      url: absoluteUrl(`/juz/${i + 1}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
