import type { Metadata } from "next";
import { IndoPakTajweedPreview } from "./IndoPakTajweedPreview";

export const metadata: Metadata = {
  title: "IndoPak Tajweed (prototype)",
  robots: { index: false, follow: false },
};

// Prototype: Uthmani Tajweed rules carried onto the IndoPak text
// (scripts/generation/build-indopak-tajweed.py) — Al-Baqarah 1–20 only.
export default function Page() {
  return <IndoPakTajweedPreview />;
}
