import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { websiteJsonLd } from "@/lib/structuredData";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl("/") },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <ImmersiveHomeClient />
    </>
  );
}
