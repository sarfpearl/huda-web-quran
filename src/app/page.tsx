import type { Metadata } from "next";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteConfig.title },
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl("/") },
};

export default function HomePage() {
  return <ImmersiveHomeClient />;
}
