import type { Strings } from "@/lib/uiLang";

/** UI strings shared across the app: English key → other languages (missing → English). */
const strings: Strings = {
  Surah: { ta: "சூரா", ur: "سورۃ", ml: "സൂറ", hi: "सूरह", id: "Surah", bn: "সূরা", tr: "Sure", fr: "Sourate", ms: "Surah" },
  Juz: { ta: "ஜுஸ்உ", ur: "پارہ", ml: "ജുസ്‌അ്", hi: "पारा", id: "Juz", bn: "পারা", tr: "Cüz", fr: "Juz", ms: "Juzuk" },
  Ayah: { ta: "ஆயத்", ur: "آیت", ml: "ആയത്ത്", hi: "आयत", id: "Ayat", bn: "আয়াত", tr: "Ayet", fr: "Verset", ms: "Ayat" },
  Page: { ta: "பக்கம்", ur: "صفحہ", ml: "പേജ്", hi: "पृष्ठ", id: "Halaman", bn: "পৃষ্ঠা", tr: "Sayfa", fr: "Page", ms: "Halaman" },
  Verses: { ta: "வசனங்கள்", ur: "آیات", ml: "ആയത്തുകൾ", hi: "आयतें", id: "Ayat", bn: "আয়াত", tr: "Ayet", fr: "Versets", ms: "Ayat" },
  Meccan: { ta: "மக்கீ", ur: "مکی", ml: "മക്കി", hi: "मक्की", id: "Makkiyah", bn: "মাক্কী", tr: "Mekki", fr: "Mecquoise", ms: "Makkiyah" },
  Medinan: { ta: "மதனீ", ur: "مدنی", ml: "മദനി", hi: "मदनी", id: "Madaniyah", bn: "মাদানী", tr: "Medeni", fr: "Médinoise", ms: "Madaniyah" },
  Bookmark: { ta: "புக்மார்க்", ur: "بُک مارک", ml: "ബുക്ക്മാർക്ക്", hi: "बुकमार्क", id: "Penanda", bn: "বুকমার্ক", tr: "Yer imi", fr: "Signet", ms: "Penanda" },
  Reciter: { ta: "காரி", ur: "قاری", ml: "ഖാരി", hi: "क़ारी", id: "Qari", bn: "ক্বারী", tr: "Kârî", fr: "Récitateur", ms: "Qari" },
};
export default strings;
