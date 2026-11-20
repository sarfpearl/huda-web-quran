/**
 * Well-known ayat and short passages people search for by name ("Ayatul
 * Kursi", "ஆயத்துல் குர்ஸி", "Rabbana atina"…). Each gets its own reading
 * page at /ayah/<slug> (src/app/ayah/[slug]/page.tsx), listed in the sitemap
 * and linked from its Surah's /surah/<n>/read page next to the first ayah.
 *
 * Keep entries factual: a name, where it is (Surah and ayah numbers) and the
 * spellings people type. The page shows the Quran text and translation only.
 */
export interface FamousAyah {
  /** URL slug: /ayah/<slug>. */
  slug: string;
  /** English name, as people search it. */
  name: string;
  /** Tamil name. */
  tamil: string;
  /** Other common spellings (English transliterations and Tamil), used in the page's description and keywords. */
  aka: string[];
  surah: number;
  /** First and last ayah of the passage (the same for a single ayah). */
  from: number;
  to: number;
}

export const FAMOUS_AYAT: FamousAyah[] = [
  { slug: "surah-al-fatiha", name: "Surah Al-Fatiha", tamil: "சூரத்துல் ஃபாத்திஹா", aka: ["Al Fatihah", "Alhamdu", "Surah Fatiha", "அல்ஹம்து சூரா"], surah: 1, from: 1, to: 7 },
  { slug: "ayat-al-kursi", name: "Ayat al-Kursi", tamil: "ஆயத்துல் குர்ஸி", aka: ["Ayatul Kursi", "Ayat ul Kursi", "Ayatal Kursi", "Throne Verse", "ஆயதுல் குர்ஸி"], surah: 2, from: 255, to: 255 },
  { slug: "la-ikraha-fid-din", name: "La Ikraha fid-Din", tamil: "லா இக்ராஹ ஃபித்தீன்", aka: ["No compulsion in religion", "La ikraha fiddeen"], surah: 2, from: 256, to: 256 },
  { slug: "last-two-ayat-of-al-baqarah", name: "Last Two Ayat of Al-Baqarah", tamil: "அல்-பகராவின் கடைசி இரண்டு வசனங்கள்", aka: ["Amanar Rasul", "Aamanar Rasoolu", "Last 2 verses of Surah Baqarah", "ஆமனர் ரஸூல்"], surah: 2, from: 285, to: 286 },
  { slug: "inna-lillahi-wa-inna-ilayhi-rajiun", name: "Inna Lillahi wa Inna Ilayhi Raji'un", tamil: "இன்னா லில்லாஹி வஇன்னா இலைஹி ராஜிஊன்", aka: ["Inna lillahi wa inna ilaihi rajioon", "Istirja"], surah: 2, from: 156, to: 156 },
  { slug: "ayah-of-fasting", name: "Ayah of Fasting", tamil: "நோன்பு வசனம்", aka: ["Ya ayyuhal ladhina amanu kutiba alaykumus siyam", "Kutiba alaikumus siyam", "Fasting verse", "Ramadan verse"], surah: 2, from: 183, to: 183 },
  { slug: "rabbana-taqabbal-minna", name: "Rabbana Taqabbal Minna", tamil: "ரப்பனா தகப்பல் மின்னா", aka: ["Rabbana taqabbal minna innaka antas samiul aleem"], surah: 2, from: 127, to: 127 },
  { slug: "rabbana-atina-fid-dunya-hasanah", name: "Rabbana Atina fid-Dunya Hasanah", tamil: "ரப்பனா ஆதினா ஃபித்துன்யா ஹஸனா", aka: ["Rabbana aatina", "Rabbana atina fiddunya", "ரப்பனா ஆத்தினா"], surah: 2, from: 201, to: 201 },
  { slug: "rabbana-la-tuzigh-qulubana", name: "Rabbana La Tuzigh Qulubana", tamil: "ரப்பனா லா துஸிஃக் குலூபனா", aka: ["Rabbana la tuzigh quloobana"], surah: 3, from: 8, to: 8 },
  { slug: "hasbunallahu-wa-nimal-wakil", name: "Hasbunallahu wa Ni'mal Wakil", tamil: "ஹஸ்புனல்லாஹு வநிஃமல் வகீல்", aka: ["Hasbunallah wa nimal wakeel", "Hasbunallahu wanimal wakeel"], surah: 3, from: 173, to: 173 },
  { slug: "dua-of-adam", name: "Dua of Adam (Rabbana Zalamna Anfusana)", tamil: "ஆதம் நபியின் துஆ (ரப்பனா ழலம்னா அன்ஃபுஸனா)", aka: ["Rabbana zalamna anfusana", "Rabbana dhalamna"], surah: 7, from: 23, to: 23 },
  { slug: "last-two-ayat-of-at-tawbah", name: "Last Two Ayat of At-Tawbah (Hasbiyallahu)", tamil: "அத்-தவ்பாவின் கடைசி இரண்டு வசனங்கள் (ஹஸ்பியல்லாஹு)", aka: ["Laqad jaakum rasulun", "Hasbiyallahu la ilaha illa huwa"], surah: 9, from: 128, to: 129 },
  { slug: "ala-bi-dhikrillahi-tatmainnul-qulub", name: "Ala bi Dhikrillahi Tatma'innul Qulub", tamil: "அலா பிதிக்ரில்லாஹி தத்மஇன்னுல் குலூப்", aka: ["Ala bizikrillahi tatmainnul quloob", "Hearts find rest in the remembrance of Allah"], surah: 13, from: 28, to: 28 },
  { slug: "rabbij-alni-muqimas-salah", name: "Rabbij'alni Muqimas-Salah", tamil: "ரப்பிஜ்அல்னீ முகீமஸ் ஸலாத்", aka: ["Rabbij alni muqimas salati", "Rabbana wa taqabbal dua"], surah: 14, from: 40, to: 41 },
  { slug: "rabbir-hamhuma", name: "Rabbir-Hamhuma (Dua for Parents)", tamil: "ரப்பிர் ஹம்ஹுமா (பெற்றோருக்கான துஆ)", aka: ["Rabbirhamhuma kama rabbayani sagheera", "Dua for parents"], surah: 17, from: 24, to: 24 },
  { slug: "dua-of-musa", name: "Dua of Musa (Rabbish-rah Li Sadri)", tamil: "மூஸா நபியின் துஆ (ரப்பிஷ்ரஹ் லீ ஸத்ரீ)", aka: ["Rabbi ishrah li sadri", "Rabbishrahli sadri", "ரப்பிஷ் ரஹ்லீ ஸத்ரீ"], surah: 20, from: 25, to: 28 },
  { slug: "rabbi-zidni-ilma", name: "Rabbi Zidni Ilma", tamil: "ரப்பி ஸித்னீ இல்மா", aka: ["Rabbi zidni ilman", "Dua for knowledge"], surah: 20, from: 114, to: 114 },
  { slug: "dua-of-yunus", name: "Dua of Yunus (La Ilaha Illa Anta Subhanaka)", tamil: "யூனுஸ் நபியின் துஆ (லா இலாஹ இல்லா அன்த ஸுப்ஹானக)", aka: ["Ayat-e-Karima", "Ayat Karimah", "La ilaha illa anta subhanaka inni kuntu minaz zalimin"], surah: 21, from: 87, to: 87 },
  { slug: "ayat-an-nur", name: "Ayat an-Nur (Verse of Light)", tamil: "ஆயத்துந் நூர் (ஒளி வசனம்)", aka: ["Ayatun Nur", "Ayah of Light", "Allahu nurus samawati wal ard"], surah: 24, from: 35, to: 35 },
  { slug: "rabbana-hab-lana", name: "Rabbana Hab Lana min Azwajina", tamil: "ரப்பனா ஹப் லனா மின் அஸ்வாஜினா", aka: ["Rabbana hablana min azwajina wa dhurriyyatina", "Dua for spouse and children"], surah: 25, from: 74, to: 74 },
  { slug: "last-three-ayat-of-al-hashr", name: "Last Three Ayat of Al-Hashr", tamil: "அல்-ஹஷ்ரின் கடைசி மூன்று வசனங்கள்", aka: ["Huwallahul ladhi la ilaha illa huwa", "Last 3 verses of Surah Hashr"], surah: 59, from: 22, to: 24 },
  { slug: "wa-man-yattaqillah", name: "Wa Man Yattaqillah", tamil: "வமன் யத்தகில்லாஹ்", aka: ["Wa man yattaqillaha yajal lahu makhraja", "Ayah of provision"], surah: 65, from: 2, to: 3 },
  { slug: "inna-maal-usri-yusra", name: "Inna Ma'al Usri Yusra", tamil: "இன்ன மஅல் உஸ்ரி யுஸ்ரா", aka: ["Fa inna maal usri yusra", "With hardship comes ease"], surah: 94, from: 5, to: 6 },
  { slug: "surah-al-qadr", name: "Surah Al-Qadr (Laylat al-Qadr)", tamil: "சூரத்துல் கத்ர் (லைலத்துல் கத்ர்)", aka: ["Inna anzalnahu", "Laylatul Qadr", "Surah Qadr"], surah: 97, from: 1, to: 5 },
  { slug: "surah-al-asr", name: "Surah Al-Asr", tamil: "சூரத்துல் அஸ்ர்", aka: ["Wal Asr", "Surah Asr"], surah: 103, from: 1, to: 3 },
  { slug: "surah-al-kawthar", name: "Surah Al-Kawthar", tamil: "சூரத்துல் கவ்ஸர்", aka: ["Inna aatayna kal kawthar", "Surah Kausar"], surah: 108, from: 1, to: 3 },
  { slug: "surah-al-kafirun", name: "Surah Al-Kafirun", tamil: "சூரத்துல் காஃபிரூன்", aka: ["Qul ya ayyuhal kafirun", "Surah Kafiroon"], surah: 109, from: 1, to: 6 },
  { slug: "surah-al-ikhlas", name: "Surah Al-Ikhlas", tamil: "சூரத்துல் இக்லாஸ்", aka: ["Qul huwallahu ahad", "Surah Ikhlas", "குல் ஹுவல்லாஹு அஹத்"], surah: 112, from: 1, to: 4 },
  { slug: "surah-al-falaq", name: "Surah Al-Falaq", tamil: "சூரத்துல் ஃபலக்", aka: ["Qul audhu bi rabbil falaq", "Surah Falaq"], surah: 113, from: 1, to: 5 },
  { slug: "surah-an-nas", name: "Surah An-Nas", tamil: "சூரத்துந் நாஸ்", aka: ["Qul audhu bi rabbin nas", "Surah Naas"], surah: 114, from: 1, to: 6 },
];

/** "2:255" or "2:285–286". */
export function famousAyahRef(a: FamousAyah): string {
  return a.from === a.to ? `${a.surah}:${a.from}` : `${a.surah}:${a.from}–${a.to}`;
}

export function famousAyahBySlug(slug: string): FamousAyah | undefined {
  return FAMOUS_AYAT.find((a) => a.slug === slug);
}

/** The famous passages that begin at this Surah's ayah, for links on the /read page. */
export function famousAyatStartingAt(surah: number, ayah: number): FamousAyah[] {
  return FAMOUS_AYAT.filter((a) => a.surah === surah && a.from === ayah);
}
