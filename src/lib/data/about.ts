/**
 * The content browser's « About HuDa » view. Fill in the blanks — an empty
 * field hides its row, so nothing half-done shows on the site.
 */
export const ABOUT = {
  tagline: "Guidance for every moment",
  intro:
    "HuDa Web Quran is a thoughtfully crafted Quran experience that brings reading, listening, and understanding together. Explore 114 Surahs and Juz with beautiful recitations, synchronized word-by-word highlighting, translations, and a distraction-free reading experience — created to help you connect with the Quran, one verse at a time.",
  /** The HuDa mobile app: store / landing page link — makes the row a « Get the app » link. */
  appUrl: "",
  /** Shown in the app row while there's no link yet. Empty (and no link) → row hidden. */
  appNote:
    "The HuDa experience is coming to your pocket — with prayer times, prayer tracking, Qada, Quran, and Tasbih, all designed to help you stay connected throughout your day.",
  /** Platforms the mobile app is coming to, shown as chips under the app note. */
  appPlatforms: ["Android", "iOS"],
  /** Who made HuDa (e.g. a name or team). Empty → row hidden. */
  maker: "Sarf Pearl",
  /** Paragraphs under the maker's logo; **text** is highlighted in gold. */
  makerNote: [
    "I’m **Sarf Pearl**, a Product Designer who loves turning thoughtful ideas into simple, meaningful experiences.",
    "Behind this journey are my wife **Afreen** and my daughter **Huda**, whose love, support, and inspiration keep me moving forward.",
    "After years of designing digital products, I’m now bringing that experience into **HuDa Web Quran** — a personal labour of love that brings design, technology, and the Quran together in one meaningful place.",
  ],
  /** The AI tools HuDa was built with, shown at the foot of the maker card. Empty → hidden. */
  builtWith: ["Claude", "Antigravity"],
  /** Maker's logo, from /public. Empty → name only. */
  makerLogo: "/about/sarf-pearl.svg",
  /** Feedback: an email address or a link. Empty → row hidden. */
  contact: "huda.sarf@gmail.com",
  credits: [
    { label: "Recitations", value: "QuranicAudio · EveryAyah · MP3Quran" },
    { label: "Reciter list", value: "SurahQuran.com" },
    { label: "Word timings & Mushaf fonts", value: "Quran.com · King Fahd Complex (QPC)" },
    {
      label: "Translations",
      value:
        "Saheeh International (English) · Jan Trust (Tamil) · Jalandhry (Urdu) · Abdul Hameed & Parappoor (Malayalam) · Suhel Farooq Khan (Hindi) · Indonesian Ministry of Religious Affairs · Muhiuddin Khan (Bengali) · Diyanet (Turkish) · Hamidullah (French) · Basmeih (Malay), via alquran.cloud",
    },
  ],
} as const;
