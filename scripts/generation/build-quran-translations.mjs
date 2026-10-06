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
 * step with src/lib/data/translations.ts), or Quran.com's API for an edition
 * written "qurancom:<id>" (footnote markers removed). Text is copied verbatim
 * apart from PATCHES. Check the result with scripts/qa/translations.cjs.
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
};

// Ayahs an edition has wrong, replaced from Quran.com's copy of the same
// translation. tr.diyanet 3:177 carries the first half of 3:178 (and 3:178
// only its second half).
const PATCHES = {
  tr: { from: 77, ayahs: ["3:177", "3:178"] },
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

async function edition(name) {
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
  const dir = resolve(OUT, lang);
  await mkdir(dir, { recursive: true });
  for (let s = 1; s <= 114; s++) {
    const ayahs = surahs[s - 1].ayahs;
    if (ayahs.length !== reference[s - 1].ayahs.length) throw new Error(`${name}: ayah count differs in ${s}`);
    await writeFile(resolve(dir, `${s}.json`), JSON.stringify(ayahs.map((a) => a.text.trim())));
  }
  console.log(`${lang} (${name}): 114 surahs → ${dir}`);
}
