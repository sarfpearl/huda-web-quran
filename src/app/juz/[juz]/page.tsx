import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, deepLinkPath, parseJuzLink } from "@/lib/deepLink";
import { deepLinkJsonLd } from "@/lib/structuredData";
import { absoluteUrl, notFoundMetadata, shareMetadata } from "@/lib/site";

type Props = { params: { juz: string } };

export function generateStaticParams() {
  return Array.from({ length: 30 }, (_, i) => ({ juz: String(i + 1) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const link = parseJuzLink(params.juz);
  if (!link) return notFoundMetadata;
  const { title, description } = deepLinkMeta(link);
  const url = absoluteUrl(deepLinkPath(link));
  return { title, description, alternates: { canonical: url }, ...shareMetadata({ title, description, url }) };
}

export default function JuzPage({ params }: Props) {
  const link = parseJuzLink(params.juz);
  if (!link) notFound();
  return (
    <>
      <JsonLd data={deepLinkJsonLd(link)} />
      <ImmersiveHomeClient deepLink={link} />
    </>
  );
}
