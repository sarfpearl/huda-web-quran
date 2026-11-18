import { deepLinkMeta, deepLinkPath, type DeepLink } from "@/lib/deepLink";
import { absoluteUrl, siteConfig } from "@/lib/site";

/**
 * Home: the site's name for search results ("HuDa Web Quran", not the URL),
 * and the Organization with its logo so Google can show HuDa's logo
 * (knowledge panel, brand results) instead of a blank globe.
 */
export function websiteJsonLd() {
  const orgId = absoluteUrl("/#organization");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: siteConfig.fullName,
        alternateName: [siteConfig.name, "HuDa Guidance"],
        url: absoluteUrl("/"),
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon-512.png"),
          width: 512,
          height: 512,
        },
      },
      {
        "@type": "WebSite",
        name: siteConfig.fullName,
        alternateName: [siteConfig.name, "HuDa Guidance"],
        url: absoluteUrl("/"),
        description: siteConfig.description,
        inLanguage: "en",
        publisher: { "@id": orgId },
      },
    ],
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
