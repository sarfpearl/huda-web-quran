import type { Metadata } from "next";
import { ImmersiveHomeClient } from "@/components/home/ImmersiveHomeClient";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "HuDa Web Quran · Listen & Read the Holy Quran",
  description:
    "Listen to and read the Holy Quran — 114 Surahs and 30 Juz, 51 reciters, word-by-word sync, Tajweed colours, Tamil and English translations.",
  alternates: { canonical: absoluteUrl("/") },
};

export default function HomePage() {
  return <ImmersiveHomeClient />;
}
