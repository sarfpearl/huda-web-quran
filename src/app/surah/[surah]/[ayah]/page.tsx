import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, parseSurahLink } from "@/lib/deepLink";
import { absoluteUrl } from "@/lib/site";

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
    openGraph: { title, description, url: absoluteUrl(`/surah/${params.surah}/${params.ayah}`) },
    twitter: { title, description },
  };
}

export default function SurahAyahPage({ params }: Props) {
  const link = parseSurahLink(params.surah, params.ayah);
  if (!link) notFound();
  return <ImmersiveHomeClient deepLink={link} />;
}
