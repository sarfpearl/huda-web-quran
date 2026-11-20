#!/usr/bin/env node
/**
 * HuDa Web Quran — Surah names in each meaning language
 * -----------------------------------------------------
 * Writes src/lib/data/surahNamesLocal.json: per language, the Surah's name in
 * that language's own script (`name`) and/or the meaning of the name
 * (`meaning`), index = Surah number − 1. The per-language reading pages
 * (/surah/<n>/read/<lang>) use it for their titles, so a Malayalam reader
 * searching "സൂറ യാസീൻ" finds the Malayalam page.
 *
 * Sources:
 *   - Quran.com's chapter list (translated_name per language) — for ml and tr
 *     it is the transliterated name, for ur/bn/id/ms/fr the meaning;
 *   - Urdu names: the Arabic name in src/lib/data/surahNames.ts (vowel marks
 *     dropped, letters in their Urdu forms);
 *   - Hindi and Bengali names: written out below (Quran.com has none).
 * English and Tamil come from surahNames.ts directly and aren't written here.
 * A language missing here falls back to the Latin name on its page.
 *
 * Usage: node scripts/generation/build-surah-names-local.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(ROOT, "src/lib/data/surahNamesLocal.json");

// What Quran.com's translated_name holds for each language.
const FROM_QURAN_COM = { ml: "name", tr: "name", ur: "meaning", bn: "meaning", id: "meaning", ms: "meaning", fr: "meaning" };

const HI = "अल-फ़ातिहा|अल-बक़रह|आल-ए-इमरान|अन-निसा|अल-माइदह|अल-अनआम|अल-आराफ़|अल-अनफ़ाल|अत-तौबह|यूनुस|हूद|यूसुफ़|अर-रअद|इब्राहीम|अल-हिज्र|अन-नहल|अल-इसरा|अल-कहफ़|मरयम|ता-हा|अल-अंबिया|अल-हज|अल-मुमिनून|अन-नूर|अल-फ़ुरक़ान|अश-शुअरा|अन-नम्ल|अल-क़सस|अल-अनकबूत|अर-रूम|लुक़मान|अस-सजदह|अल-अहज़ाब|सबा|फ़ातिर|यासीन|अस-साफ़्फ़ात|साद|अज़-ज़ुमर|ग़ाफ़िर|फ़ुस्सिलत|अश-शूरा|अज़-ज़ुख़रुफ़|अद-दुख़ान|अल-जासियह|अल-अहक़ाफ़|मुहम्मद|अल-फ़तह|अल-हुजुरात|क़ाफ़|अज़-ज़ारियात|अत-तूर|अन-नज्म|अल-क़मर|अर-रहमान|अल-वाक़िआ|अल-हदीद|अल-मुजादिलह|अल-हश्र|अल-मुम्तहिनह|अस-सफ़्फ़|अल-जुमुआ|अल-मुनाफ़िक़ून|अत-तग़ाबुन|अत-तलाक़|अत-तहरीम|अल-मुल्क|अल-क़लम|अल-हाक़्क़ह|अल-मआरिज|नूह|अल-जिन्न|अल-मुज़्ज़म्मिल|अल-मुद्दस्सिर|अल-क़ियामह|अल-इंसान|अल-मुरसलात|अन-नबा|अन-नाज़िआत|अबस|अत-तकवीर|अल-इन्फ़ितार|अल-मुतफ़्फ़िफ़ीन|अल-इन्शिक़ाक़|अल-बुरूज|अत-तारिक़|अल-आला|अल-ग़ाशियह|अल-फ़ज्र|अल-बलद|अश-शम्स|अल-लैल|अज़-ज़ुहा|अश-शरह|अत-तीन|अल-अलक़|अल-क़द्र|अल-बय्यिनह|अज़-ज़लज़लह|अल-आदियात|अल-क़ारिअह|अत-तकासुर|अल-अस्र|अल-हुमज़ह|अल-फ़ील|क़ुरैश|अल-माऊन|अल-कौसर|अल-काफ़िरून|अन-नस्र|अल-मसद|अल-इख़लास|अल-फ़लक़|अन-नास".split("|");

const BN = "আল-ফাতিহা|আল-বাকারা|আলে ইমরান|আন-নিসা|আল-মায়িদা|আল-আনআম|আল-আরাফ|আল-আনফাল|আত-তাওবা|ইউনুস|হুদ|ইউসুফ|আর-রাদ|ইবরাহীম|আল-হিজর|আন-নাহল|আল-ইসরা|আল-কাহফ|মারইয়াম|ত্বা-হা|আল-আম্বিয়া|আল-হাজ্জ|আল-মুমিনুন|আন-নূর|আল-ফুরকান|আশ-শুআরা|আন-নামল|আল-কাসাস|আল-আনকাবুত|আর-রূম|লুকমান|আস-সাজদা|আল-আহযাব|সাবা|ফাতির|ইয়াসীন|আস-সাফফাত|সোয়াদ|আয-যুমার|গাফির|ফুসসিলাত|আশ-শূরা|আয-যুখরুফ|আদ-দুখান|আল-জাসিয়া|আল-আহকাফ|মুহাম্মাদ|আল-ফাতহ|আল-হুজুরাত|কাফ|আয-যারিয়াত|আত-তূর|আন-নাজম|আল-কামার|আর-রাহমান|আল-ওয়াকিয়া|আল-হাদীদ|আল-মুজাদালা|আল-হাশর|আল-মুমতাহিনা|আস-সাফ|আল-জুমুআ|আল-মুনাফিকুন|আত-তাগাবুন|আত-তালাক|আত-তাহরীম|আল-মুলক|আল-কলম|আল-হাক্কাহ|আল-মাআরিজ|নূহ|আল-জিন|আল-মুযযাম্মিল|আল-মুদ্দাসসির|আল-কিয়ামাহ|আল-ইনসান|আল-মুরসালাত|আন-নাবা|আন-নাযিয়াত|আবাসা|আত-তাকভীর|আল-ইনফিতার|আল-মুতাফফিফীন|আল-ইনশিকাক|আল-বুরূজ|আত-তারিক|আল-আলা|আল-গাশিয়াহ|আল-ফাজর|আল-বালাদ|আশ-শামস|আল-লাইল|আদ-দুহা|আশ-শারহ|আত-তীন|আল-আলাক|আল-কদর|আল-বাইয়্যিনাহ|আয-যিলযাল|আল-আদিয়াত|আল-কারিয়া|আত-তাকাসুর|আল-আসর|আল-হুমাযাহ|আল-ফীল|কুরাইশ|আল-মাউন|আল-কাউসার|আল-কাফিরুন|আন-নাসর|আল-মাসাদ|আল-ইখলাস|আল-ফালাক|আন-নাস".split("|");

/** "سُورَةُ يُونُسَ" → "یونس": drop "Surah", vowel marks and tatweel; Urdu letter forms. */
function urduName(arabic) {
  return arabic
    .replace(/^سُورَةُ\s+/, "")
    .replace(/[ً-ٰٟۖ-ۭـ]/g, "")
    .replace(/ٱ/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ہ")
    .replace(/ۡ/g, "")
    .trim();
}

async function quranComNames(lang) {
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`https://api.quran.com/api/v4/chapters?language=${lang}`);
    if (res.ok) {
      const list = (await res.json()).chapters;
      if (list.length !== 114) throw new Error(`${lang}: ${list.length} chapters`);
      if (list.some((c) => c.translated_name.language_name === "english")) throw new Error(`${lang}: English fallback`);
      return list.map((c) => c.translated_name.name.replace(/\s+/g, " ").trim());
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`failed: ${lang}`);
}

const src = await readFile(resolve(ROOT, "src/lib/data/surahNames.ts"), "utf8");
const arabic = [...src.matchAll(/^\s*\["([^"]+)",/gm)].map((m) => m[1]);
if (arabic.length !== 114) throw new Error(`surahNames.ts: ${arabic.length} names`);
if (HI.length !== 114 || BN.length !== 114) throw new Error(`hi ${HI.length}, bn ${BN.length}`);

const out = { hi: { name: HI }, bn: { name: BN }, ur: { name: arabic.map(urduName) } };
for (const [lang, field] of Object.entries(FROM_QURAN_COM)) {
  out[lang] = { ...(out[lang] ?? {}), [field]: await quranComNames(lang) };
}
await writeFile(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${OUT}: ${Object.keys(out).join(", ")}`);
