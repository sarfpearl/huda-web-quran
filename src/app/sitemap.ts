import type { MetadataRoute } from "next";
import { siteConfig, absoluteUrl } from "@/lib/site";
import { FAMOUS_AYAT } from "@/lib/data/famousAyat";

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
    ...Array.from({ length: 30 }, (_, i) => ({
      url: absoluteUrl(`/juz/${i + 1}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    // Well-known ayat and passages searched by name (Ayat al-Kursi…).
    ...FAMOUS_AYAT.map((a) => ({
      url: absoluteUrl(`/ayah/${a.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
