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
 * step with src/lib/data/translations.ts). Text is copied verbatim.
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
  hi: "hi.hindi",
  id: "id.indonesian",
  bn: "bn.bengali",
  tr: "tr.diyanet",
  fr: "fr.hamidullah",
  ms: "ms.basmeih",
};

async function edition(name) {
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
  const dir = resolve(OUT, lang);
  await mkdir(dir, { recursive: true });
  for (let s = 1; s <= 114; s++) {
    const ayahs = surahs[s - 1].ayahs;
    if (ayahs.length !== reference[s - 1].ayahs.length) throw new Error(`${name}: ayah count differs in ${s}`);
    await writeFile(resolve(dir, `${s}.json`), JSON.stringify(ayahs.map((a) => a.text.trim())));
  }
  console.log(`${lang} (${name}): 114 surahs → ${dir}`);
}
