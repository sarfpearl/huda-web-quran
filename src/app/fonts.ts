import {
  Amiri,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Malayalam,
  Noto_Serif_Tamil,
  Poppins,
} from "next/font/google";

/*
 * Self-hosted Google fonts (next/font): served from this site, no
 * render-blocking @import chain to fonts.googleapis.com, and a metric-matched
 * fallback so text doesn't jump when the font arrives (CLS). Each exposes a
 * CSS variable; no italics (none are used). Only Poppins (the UI) is preloaded — the others download when
 * their script is on screen (unicode-range).
 */
export const poppins = Poppins({
  // Preloads latin; latin-ext (ā, ī …) is still served, on demand.
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-poppins",
});

// Tamil UI and meanings.
export const notoSerifTamil = Noto_Serif_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-tamil",
  preload: false,
});

// Arabic fallback behind Uthmanic Hafs (globals.css --font-arabic).
export const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-amiri",
  preload: false,
});

// Ayah meanings in other scripts (src/lib/data/translations.ts) and the
// IndoPak fallback (globals.css .quran-indopak).
export const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-urdu",
  preload: false,
});
export const notoSansMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-malayalam",
  preload: false,
});
export const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-devanagari",
  preload: false,
});
export const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-bengali",
  preload: false,
});
export const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-naskh",
  preload: false,
});

export const fontVariables = [
  poppins,
  notoSerifTamil,
  amiri,
  notoNastaliqUrdu,
  notoSansMalayalam,
  notoSansDevanagari,
  notoSansBengali,
  notoNaskhArabic,
]
  .map((f) => f.variable)
  .join(" ");
