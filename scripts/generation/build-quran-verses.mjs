#!/usr/bin/env node
/**
 * HuDa Web Quran — Local Verse Text Bundle
 * ----------------------------------------
 * Writes public/data/quran-verses/<surah>.json for Surahs 2–114 so the app
 * never has to call api.alquran.cloud at runtime (a Juz opens up to 37 Surahs
 * at once; the API answers such bursts with 429 and no CORS header).
 *
 * Source: the SAME editions the app used to fetch live —
 *   quran-uthmani (Arabic), en.sahih (English), ta.tamil (Tamil).
 * Text is copied verbatim. The only transform is the one the app applied at
 * runtime: ayah 1 of Surahs 2–114 (except 9) drops its leading Bismillah, which
 * the app recites/shows as its own prelude segment.
 *
 * Each ayah also carries the default ayah-level timestamps from
 * public/data/quran-timings/<surah>.json (used only as a rough Juz clock
 * estimate). Word timings are NOT included: they belong to one reciter and
 * must never stand in for another reciter's missing word segments.
 *
 * Surah 1 is left as is (hand-tuned file).
 *
 * Usage: node scripts/generation/build-quran-verses.mjs
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(ROOT, "public/data/quran-verses");
const API = "https://api.alquran.cloud/v1/quran";

async function edition(name) {
  for (let i = 1; i <= 5; i++) {
    const res = await fetch(`${API}/${name}`);
    if (res.ok) return (await res.json()).data.surahs;
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`failed: ${name}`);
}

// Same skeleton match as quranVerses.ts (stripLeadingBismillah).
const skeleton = (t) =>
  t.normalize("NFC").replace(/\p{Mn}/gu, "").replace(/ـ/g, "")
    .replace(/[آأإٱٲٳ]/g, "ا").replace(/\s+/g, "");
const BISMILLAH = skeleton("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ");
function stripLeadingBismillah(text, surah) {
  if (surah === 1 || surah === 9) return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= 4) return text;
  return skeleton(words.slice(0, 4).join("")) === BISMILLAH ? words.slice(4).join(" ").trim() : text;
}

const [ar, en, ta] = [await edition("quran-uthmani"), await edition("en.sahih"), await edition("ta.tamil")];
await mkdir(OUT, { recursive: true });
let ayahs = 0;
for (let s = 2; s <= 114; s++) {
  const A = ar[s - 1].ayahs, E = en[s - 1].ayahs, T = ta[s - 1].ayahs;
  if (A.length !== E.length || A.length !== T.length) throw new Error(`edition length mismatch in ${s}`);
  let timings = [];
  try {
    timings = JSON.parse(await readFile(resolve(ROOT, "public/data/quran-timings", `${s}.json`), "utf8")).verseTimings ?? [];
  } catch {
    /* no default timings */
  }
  const verses = A.map((a, i) => {
    const vt = timings[i];
    return {
      surahNumber: s,
      ayahNumber: a.numberInSurah,
      textArabic: i === 0 ? stripLeadingBismillah(a.text, s) : a.text,
      textEnglish: E[i].text,
      textTamil: T[i].text,
      verseKey: `${s}:${a.numberInSurah}`,
      ...(vt ? { timestampFrom: vt.timestampFromSec, timestampTo: vt.timestampToSec } : {}),
    };
  });
  ayahs += verses.length;
  await writeFile(resolve(OUT, `${s}.json`), JSON.stringify(verses));
}
console.log(`wrote 113 surahs, ${ayahs} ayahs → ${OUT}`);
