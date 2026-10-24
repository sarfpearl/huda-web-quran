import localFont from "next/font/local";

/*
 * Self-hosted fonts (next/font/local): served from this site, no
 * render-blocking @import chain to fonts.googleapis.com, and a metric-matched
 * fallback so text doesn't jump when the font arrives (CLS). The woff2 files
 * in ./fonts are built from Google Fonts by
 * scripts/generation/build-self-hosted-fonts.py — next/font/google fetched
 * them at build time and Vercel builds failed now and then when Google served
 * a URL without a file extension. Each exposes a CSS variable; no italics
 * (none are used). Only Poppins (the UI) is preloaded — the others download
 * when their script is on screen (unicode-range: Google Fonts' own subset
 * ranges, as next/font/google served them; next/font needs literal options,
 * hence the repetition).
 */

export const poppins = localFont({
  // latin-ext (ā, ī …) is in the same files.
  src: [
    { path: "./fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-poppins",
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
});

// Tamil UI and meanings.
export const notoSerifTamil = localFont({
  src: [
    { path: "./fonts/noto-serif-tamil-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-serif-tamil-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-serif-tamil-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-serif-tamil-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-tamil",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0964-0965, U+0B82-0BFA, U+200C-200D, U+20B9, U+25CC, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  adjustFontFallback: "Times New Roman",
});

// Arabic fallback behind Uthmanic Hafs (globals.css --font-arabic).
export const amiri = localFont({
  src: [
    { path: "./fonts/amiri-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/amiri-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-amiri",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  adjustFontFallback: "Times New Roman",
});

// Ayah meanings in other scripts (src/lib/data/translations.ts) and the
// IndoPak fallback (globals.css .quran-indopak).
export const notoNastaliqUrdu = localFont({
  src: [
    { path: "./fonts/noto-nastaliq-urdu-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-nastaliq-urdu-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-urdu",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  adjustFontFallback: "Times New Roman",
});
export const notoSansMalayalam = localFont({
  src: [
    { path: "./fonts/noto-sans-malayalam-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-malayalam-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-malayalam",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0307, U+0323, U+0951-0952, U+0964-0965, U+0B83, U+0D00-0D7F, U+1CDA, U+1CF2, U+200C-200D, U+20B9, U+25CC, U+A830-A832, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});
export const notoSansDevanagari = localFont({
  src: [
    { path: "./fonts/noto-sans-devanagari-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-devanagari-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-devanagari",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0900-097F, U+1CD0-1CF4, U+1CF7-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B0A, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});
export const notoSansBengali = localFont({
  src: [
    { path: "./fonts/noto-sans-bengali-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-bengali-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-bengali",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
});
export const notoNaskhArabic = localFont({
  src: [
    { path: "./fonts/noto-naskh-arabic-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-naskh-arabic-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  variable: "--font-naskh",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0600-06FF, U+0750-077F, U+0870-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EC2-10EC7, U+10EC9-10EEE, U+10EF0-10EFF, U+1EE00-1EE03, U+1EE05-1EE1F, U+1EE21-1EE22, U+1EE24, U+1EE27, U+1EE29-1EE32, U+1EE34-1EE37, U+1EE39, U+1EE3B, U+1EE42, U+1EE47, U+1EE49, U+1EE4B, U+1EE4D-1EE4F, U+1EE51-1EE52, U+1EE54, U+1EE57, U+1EE59, U+1EE5B, U+1EE5D, U+1EE5F, U+1EE61-1EE62, U+1EE64, U+1EE67-1EE6A, U+1EE6C-1EE72, U+1EE74-1EE77, U+1EE79-1EE7C, U+1EE7E, U+1EE80-1EE89, U+1EE8B-1EE9B, U+1EEA1-1EEA3, U+1EEA5-1EEA9, U+1EEAB-1EEBB, U+1EEF0-1EEF1, U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
  ],
  adjustFontFallback: "Times New Roman",
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
