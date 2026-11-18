import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, deepLinkSearchMeta, parseSurahLink } from "@/lib/deepLink";
import { deepLinkJsonLd } from "@/lib/structuredData";
import { absoluteUrl, notFoundMetadata, shareMetadata } from "@/lib/site";

type Props = { params: Promise<{ surah: string; ayah: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const link = parseSurahLink(p.surah, p.ayah);
  if (!link) return notFoundMetadata;
  const { title, description } = deepLinkMeta(link);
  const search = deepLinkSearchMeta(link);
  // One page per Surah in search: an ayah link is canonical to its Surah.
  return {
    title: search.title,
    description: search.description,
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
      {/* The page's heading for search engines and screen readers; the app shows its own. */}
      <h1 className="sr-only">{deepLinkSearchMeta(link).heading}</h1>
      {/* The Surah's text page (Arabic, Tamil, English) for search engines and screen readers. */}
      <a href={`/surah/${Number(p.surah)}/read`} className="sr-only">
        Read the full text in Arabic, Tamil and English
      </a>
      <ImmersiveHomeClient deepLink={link} />
    </>
  );
}
