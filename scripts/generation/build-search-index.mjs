/*
 * Builds public/data/search-index.json — one compact entry per ayah so the
 * content browser's Verse tab can search the whole Quran offline, across every
 * shipped language, forgiving of spelling.
 *
 * Each entry is a 3-tuple [key, displayArabic, searchBlob]:
 *   key          "2:255"
 *   displayArabic original Uthmani text (shown in the result row)
 *   searchBlob    normalized Arabic + English + Tamil + the 8 translation
 *                 languages, folded by src/lib/data/searchNormalize.mjs so the
 *                 query folds the same way (see verseSearch.ts).
 *
 * Run: node scripts/generation/build-search-index.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normLatin, normArabic, normIndic } from "../../src/lib/data/searchNormalize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VERSES_DIR = path.join(root, "public/data/quran-verses");
const TRANS_DIR = path.join(root, "public/data/quran-translations");
const OUT = path.join(root, "public/data/search-index.json");

// The 8 per-Surah translation languages (en & ta ride inside the verse files),
// each with the normalizer that fits its script.
const TRANS_LANGS = [
  { id: "ur", norm: normIndic },
  { id: "ml", norm: normIndic },
  { id: "hi", norm: normIndic },
  { id: "id", norm: normLatin },
  { id: "bn", norm: normIndic },
  { id: "tr", norm: normLatin },
  { id: "fr", norm: normLatin },
  { id: "ms", norm: normLatin },
];

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
/** Unique normalized tokens of a string (keeps the blob small, no repeats). */
const dedupe = (s) => [...new Set(s.split(" ").filter(Boolean))].join(" ");

const index = [];
let verseCount = 0;

for (let surah = 1; surah <= 114; surah++) {
  const verses = readJson(path.join(VERSES_DIR, `${surah}.json`));
  // Per-language arrays for this Surah (ayah order); missing file → skip that lang.
  const trans = TRANS_LANGS.map(({ id, norm }) => {
    const file = path.join(TRANS_DIR, id, `${surah}.json`);
    return { arr: fs.existsSync(file) ? readJson(file) : null, norm };
  });

  verses.forEach((v, i) => {
    const parts = [
      normArabic(v.textArabic),
      normLatin(v.textEnglish),
      normIndic(v.textTamil),
    ];
    for (const { arr, norm } of trans) {
      if (arr && typeof arr[i] === "string") parts.push(norm(arr[i]));
    }
    const blob = dedupe(parts.join(" ").replace(/\s+/g, " ").trim());
    index.push([`${surah}:${v.ayahNumber}`, v.textArabic, blob]);
    verseCount++;
  });
}

fs.writeFileSync(OUT, JSON.stringify(index));
const mb = (fs.statSync(OUT).size / 1e6).toFixed(2);
console.log(`Wrote ${verseCount} ayah entries → ${path.relative(root, OUT)} (${mb} MB)`);
const sample = index.find((e) => e[0] === "2:255");
console.log("Sample 2:255 blob tokens:", sample ? sample[2].split(" ").length : "MISSING");
