import { deepLinkMeta, deepLinkPath, type DeepLink } from "@/lib/deepLink";
import { absoluteUrl, siteConfig } from "@/lib/site";

/** Home: the site's name for search results ("HuDa Web Quran", not the URL). */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.fullName,
    alternateName: siteConfig.name,
    url: absoluteUrl("/"),
    description: siteConfig.description,
    inLanguage: "en",
  };
}

/** A Surah / Juz page: Home › Ya-Sin (an ayah link breadcrumbs to its Surah). */
export function deepLinkJsonLd(link: DeepLink) {
  const page = link.kind === "surah" ? { ...link, ayah: 1 } : link;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteConfig.fullName, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: deepLinkMeta(page).title, item: absoluteUrl(deepLinkPath(page)) },
    ],
  };
}
