import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { deepLinkMeta, deepLinkPath, parseJuzLink } from "@/lib/deepLink";
import { absoluteUrl } from "@/lib/site";

type Props = { params: { juz: string } };

export function generateStaticParams() {
  return Array.from({ length: 30 }, (_, i) => ({ juz: String(i + 1) }));
}

export function generateMetadata({ params }: Props): Metadata {
  const link = parseJuzLink(params.juz);
  if (!link) return {};
  const { title, description } = deepLinkMeta(link);
  const url = absoluteUrl(deepLinkPath(link));
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url }, twitter: { title, description } };
}

export default function JuzPage({ params }: Props) {
  const link = parseJuzLink(params.juz);
  if (!link) notFound();
  return <ImmersiveHomeClient deepLink={link} />;
}
