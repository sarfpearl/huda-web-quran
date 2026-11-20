import type { MetadataRoute } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { READ_LANGUAGES } from "@/lib/readLanguages";

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
    // The Surah reading pages: the full Arabic text with Tamil and English.
    ...Array.from({ length: 114 }, (_, i) => ({
      url: absoluteUrl(`/surah/${i + 1}/read`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    // The same reading pages per meaning language (/surah/<n>/read/<lang>).
    ...Array.from({ length: 114 }, (_, i) =>
      READ_LANGUAGES.map((l) => ({
        url: absoluteUrl(`/surah/${i + 1}/read/${l.id}`),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ).flat(),
    ...Array.from({ length: 30 }, (_, i) => ({
      url: absoluteUrl(`/juz/${i + 1}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
