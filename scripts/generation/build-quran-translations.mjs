#!/usr/bin/env node
/**
 * HuDa Web Quran — Extra Translation Bundles
 * ------------------------------------------
 * Writes public/data/quran-translations/<lang>/<surah>.json for the
 * translations beyond English and Tamil (those two live inside
 * public/data/quran-verses). Each file is the Surah's ayah meanings in order —
 * index 0 is ayah 1 — so a language is fetched only when someone picks it.
 *
 * Source: api.alquran.cloud, one edition per language (see EDITIONS, kept in
 * step with src/lib/data/translations.ts), Quran.com's API for an edition
 * written "qurancom:<id>", or QuranEnc.com's API (King Fahd Complex / Rowwad
 * Translation Center, free to use with attribution, unchanged) for
 * "quranenc:<key>". Footnote markers and leading ayah numbers are removed;
 * otherwise the text is copied verbatim apart from PATCHES. Check the result
 * with scripts/qa/translations.cjs.
 *
 * Usage: node scripts/generation/build-quran-translations.mjs [lang…]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../../public/data/quran-translations");
const API = "https://api.alquran.cloud/v1/quran";

const EDITIONS = {
  ur: "ur.jalandhry",
  ml: "ml.abdulhameed",
  // Quran.com's Hindi (King Fahd Complex, Azizul Haque al-Umari). alquran.cloud's
  // hi.hindi (Suhel Farooq Khan) runs ayahs into each other — 69:34 held
  // 69:35's meaning, 26:107 held 26:108's.
  hi: "qurancom:122",
  id: "id.indonesian",
  bn: "bn.bengali",
  tr: "tr.diyanet",
  fr: "fr.hamidullah",
  ms: "ms.basmeih",
  // Indian languages
  kn: "quranenc:kannada_hamza",
  te: "quranenc:telugu_muhammad",
  gu: "quranenc:gujarati_omari",
  mr: "qurancom:226",
  as: "quranenc:assamese_rafeeq",
  ne: "qurancom:108",
  sd: "sd.amroti",
  // Big world languages
  es: "quranenc:spanish_garcia",
  // Ma Jian in Simplified characters (alquran.cloud's zh.majian is Traditional).
  zh: "qurancom:56",
  ru: "ru.kuliev",
  pt: "quranenc:portuguese_nasr",
  de: "quranenc:german_bubenheim",
  fa: "fa.fooladvand",
  ja: "quranenc:japanese_saeedsato",
  ko: "qurancom:219",
  it: "it.piccardo",
  nl: "nl.siregar",
  // Muslim-majority regions
  sw: "sw.barwani",
  ha: "ha.gumi",
  so: "so.abduh",
  yo: "quranenc:yoruba_mikail",
  am: "quranenc:amharic_sadiq",
  // Quran.com's Zakaria Abulsalam: QuranEnc's Rowwad Pashto repeats 6:7 at 6:8.
  ps: "qurancom:118",
  // Sorani. alquran.cloud's ku.asan has notes in place of some ayahs (26:174)
  // and an empty 108:3.
  ku: "quranenc:kurdish_bamoki",
  uz: "qurancom:55",
  kk: "qurancom:222",
  tg: "quranenc:tajik_arifi",
  az: "az.musayev",
  bs: "bs.korkut",
  sq: "sq.ahmeti",
  tt: "tt.nugman",
  ug: "ug.saleh",
  // Quran.com's copy: alquran.cloud's repeats the ayah before where the
  // translator gives one meaning for two ayahs (107:4 = 107:3).
  dv: "qurancom:86",
  si: "quranenc:sinhalese_mahir",
  th: "th.thai",
  vi: "quranenc:vietnamese_rwwad",
  tl: "quranenc:tagalog_rwwad",
};

// Ayahs an edition has wrong, replaced from Quran.com's copy of the same
// translation. tr.diyanet 3:177 carries the first half of 3:178 (and 3:178
// only its second half).
const PATCHES = {
  tr: { from: 77, ayahs: ["3:177", "3:178"] },
  // QuranEnc's copies repeat the ayah before (Quran.com has these right).
  gu: { from: 225, ayahs: ["3:30"] },
  si: { from: 228, ayahs: ["2:162", "4:10", "18:16"] },
};

// Gumi's Hausa (every copy) runs 27:48 and 27:49 together, so 27:49–54 hold
// the meanings of 27:50–55 and 27:55 is empty: split 27:48 where 27:49 begins
// ("Suka ce: …", "They said: …") and move the rest back.
const FIXES = {
  ha: (surahs) => {
    const a = surahs[26].ayahs;
    const at = a[47].text.indexOf(" Suka ce:");
    if (at < 0 || !/^\s*\d*\.?\s*$/.test(a[54].text)) throw new Error("ha 27:48–55 changed upstream: check FIXES");
    const texts = a.slice(47, 54).map((x) => x.text);
    a[47].text = texts[0].slice(0, at);
    a[48].text = texts[0].slice(at + 1);
    for (let i = 1; i < 7; i++) a[48 + i].text = texts[i];
  },
};

const QURAN_COM = "https://api.quran.com/api/v4/quran/translations";
const stripNotes = (t) => t.replace(/<sup[^>]*>.*?<\/sup>/g, "").replace(/<[^>]+>/g, "").trim();

/** All 6,236 meanings of a Quran.com translation, in Quran order. */
async function quranCom(id) {
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${QURAN_COM}/${id}`);
    if (res.ok) {
      const list = (await res.json()).translations.map((x) => stripNotes(x.text));
      if (list.length !== 6236) throw new Error(`qurancom:${id}: ${list.length} ayahs`);
      return list;
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`failed: qurancom:${id}`);
}

const QURAN_ENC = "https://quranenc.com/api/v1/translation/sura";
// Footnote markers ("[1]", "*"), a leading ayah number ("2. …", "૧. …", in any
// script's digits) are removed from every edition; spaces are collapsed.
const clean = (t, aya) =>
  t
    .replace(/\[\d+\]/g, "")
    .replace(new RegExp(`^\\(?${aya}\\)?[.)\\-]?\\s+`), "")
    .replace(/^\(?\p{Nd}{1,3}\)?\s?[.)]\s*/u, "")
    // Saeed Sato's Japanese marks glossary words with "*".
    .replace(/\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

async function quranEncSurah(key, s) {
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${QURAN_ENC}/${key}/${s}`);
    if (res.ok) return (await res.json()).result.map((x) => ({ text: x.translation }));
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`failed: quranenc:${key} ${s}`);
}

async function edition(name) {
  if (name.startsWith("quranenc:")) {
    const key = name.slice("quranenc:".length);
    const surahs = [];
    for (let s = 1; s <= 114; s++) surahs.push({ ayahs: await quranEncSurah(key, s) });
    return surahs;
  }
  if (name.startsWith("qurancom:")) {
    // Split Quran.com's flat list by the reference Surahs' ayah counts.
    const flat = await quranCom(name.slice("qurancom:".length));
    let i = 0;
    return reference.map((s) => ({ ayahs: s.ayahs.map(() => ({ text: flat[i++] })) }));
  }
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${API}/${name}`);
    if (res.ok) return (await res.json()).data.surahs;
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`failed: ${name}`);
}

// The ayah count of every Surah, to check each edition against.
const reference = await edition("quran-uthmani");
const langs = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(EDITIONS);

for (const lang of langs) {
  const name = EDITIONS[lang];
  if (!name) throw new Error(`unknown language: ${lang}`);
  const surahs = await edition(name);
  const patch = PATCHES[lang];
  if (patch) {
    const flat = await quranCom(patch.from);
    const index = (s, a) => reference.slice(0, s - 1).reduce((n, x) => n + x.ayahs.length, 0) + a - 1;
    for (const key of patch.ayahs) {
      const [s, a] = key.split(":").map(Number);
      surahs[s - 1].ayahs[a - 1].text = flat[index(s, a)];
    }
  }
  FIXES[lang]?.(surahs);
  const dir = resolve(OUT, lang);
  await mkdir(dir, { recursive: true });
  for (let s = 1; s <= 114; s++) {
    const ayahs = surahs[s - 1].ayahs;
    if (ayahs.length !== reference[s - 1].ayahs.length) throw new Error(`${name}: ayah count differs in ${s}`);
    await writeFile(resolve(dir, `${s}.json`), JSON.stringify(ayahs.map((a, i) => clean(a.text, i + 1))));
  }
  console.log(`${lang} (${name}): 114 surahs → ${dir}`);
}
