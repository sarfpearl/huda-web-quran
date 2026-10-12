import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, parseSurahLink } from "@/lib/deepLink";
import { deepLinkJsonLd } from "@/lib/structuredData";
import { absoluteUrl, notFoundMetadata, shareMetadata } from "@/lib/site";

type Props = { params: Promise<{ surah: string; ayah: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const link = parseSurahLink(p.surah, p.ayah);
  if (!link) return notFoundMetadata;
  const { title, description } = deepLinkMeta(link);
  // One page per Surah in search: an ayah link is canonical to its Surah.
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/surah/${p.surah}`) },
    ...shareMetadata({ title, description, url: absoluteUrl(`/surah/${p.surah}/${p.ayah}`) }),
  };
}

export default async function SurahAyahPage({ params }: Props) {
  const p = await params;
  const link = parseSurahLink(p.surah, p.ayah);
  if (!link) notFound();
  return (
    <>
      <JsonLd data={deepLinkJsonLd(link)} />
      <ImmersiveHomeClient deepLink={link} />
    </>
  );
}
