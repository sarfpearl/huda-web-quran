import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, deepLinkPath, parseSurahLink } from "@/lib/deepLink";
import { deepLinkJsonLd } from "@/lib/structuredData";
import { absoluteUrl, notFoundMetadata, shareMetadata } from "@/lib/site";

type Props = { params: { surah: string } };

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surah: String(i + 1) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const link = parseSurahLink(params.surah);
  if (!link) return notFoundMetadata;
  const { title, description } = deepLinkMeta(link);
  const url = absoluteUrl(deepLinkPath(link));
  return { title, description, alternates: { canonical: url }, ...shareMetadata({ title, description, url }) };
}

export default function SurahPage({ params }: Props) {
  const link = parseSurahLink(params.surah);
  if (!link) notFound();
  return (
    <>
      <JsonLd data={deepLinkJsonLd(link)} />
      <ImmersiveHomeClient deepLink={link} />
    </>
  );
}
