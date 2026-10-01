/**
 * The content browser's « About HuDa » view. Fill in the blanks — an empty
 * field hides its row, so nothing half-done shows on the site.
 */
export const ABOUT = {
  tagline: "Guidance for every moment",
  intro:
    "An immersive way to listen to and read the Quran — every Surah and Juz from renowned reciters, with each word lit as it is recited.",
  /** The HuDa mobile app: store / landing page link — makes the row a « Get the app » link. */
  appUrl: "",
  /** Shown in the app row while there's no link yet. Empty (and no link) → row hidden. */
  appNote: "The HuDa mobile app is on its way — coming soon.",
  /** Who made HuDa (e.g. a name or team). Empty → row hidden. */
  maker: "Sarf Pearl",
  makerNote: "HuDa is designed and built by one person, as a labour of love for the Quran.",
  /** Maker's logo, from /public. Empty → name only. */
  makerLogo: "/about/sarf-pearl.svg",
  /** Feedback: an email address or a link. Empty → row hidden. */
  contact: "huda.sarf@gmail.com",
  credits: [
    { label: "Recitations", value: "QuranicAudio · EveryAyah · MP3Quran" },
    { label: "Word timings & Mushaf fonts", value: "Quran.com · King Fahd Complex (QPC)" },
    { label: "Translations", value: "Saheeh International (English) · Jan Trust (Tamil), via alquran.cloud" },
  ],
} as const;
