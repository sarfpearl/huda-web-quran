import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, deepLinkPath, parseSurahLink } from "@/lib/deepLink";
import { absoluteUrl } from "@/lib/site";

type Props = { params: { surah: string } };

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surah: String(i + 1) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const link = parseSurahLink(params.surah);
  if (!link) return {};
  const { title, description } = deepLinkMeta(link);
  const url = absoluteUrl(deepLinkPath(link));
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

export default function SurahPage({ params }: Props) {
  const link = parseSurahLink(params.surah);
  if (!link) notFound();
  return <ImmersiveHomeClient deepLink={link} />;
}
