import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, parseSurahLink } from "@/lib/deepLink";
import { deepLinkJsonLd } from "@/lib/structuredData";
import { absoluteUrl, shareMetadata } from "@/lib/site";

type Props = { params: { surah: string; ayah: string } };

export function generateMetadata({ params }: Props): Metadata {
  const link = parseSurahLink(params.surah, params.ayah);
  if (!link) return {};
  const { title, description } = deepLinkMeta(link);
  // One page per Surah in search: an ayah link is canonical to its Surah.
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/surah/${params.surah}`) },
    ...shareMetadata({ title, description, url: absoluteUrl(`/surah/${params.surah}/${params.ayah}`) }),
  };
}

export default function SurahAyahPage({ params }: Props) {
  const link = parseSurahLink(params.surah, params.ayah);
  if (!link) notFound();
  return (
    <>
      <JsonLd data={deepLinkJsonLd(link)} />
      <ImmersiveHomeClient deepLink={link} />
    </>
  );
}
