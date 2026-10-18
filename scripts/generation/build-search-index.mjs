/*
 * Builds the content browser's offline verse-search index, SPLIT BY LANGUAGE so
 * a search downloads only what it needs instead of one 16 MB file.
 *
 *   public/data/search-index.json        core, always loaded:
 *                                         [key, displayArabic, arBlob+enBlob]
 *   public/data/search-index-<lang>.json one blob string per ayah (Mushaf
 *                                         order), loaded only when the UI is in
 *                                         that language (ta, ur, ml, …).
 *
 * The core carries Arabic (the recitation script + transliteration folding) and
 * English (the universal fallback). Every other language sits in its own file;
 * verseSearch.ts fetches the one matching the UI language on demand and folds
 * the query with the same normalizers (searchNormalize.mjs) so spelling and
 * diacritics don't matter.
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
const DATA_DIR = path.join(root, "public/data");
const CORE_OUT = path.join(DATA_DIR, "search-index.json");
const langOut = (id) => path.join(DATA_DIR, `search-index-${id}.json`);

// Languages kept in their own lazily-loaded file. en & ta ride inside the verse
// files; the 8 others each have a per-Surah translation file. Each carries the
// normalizer that fits its script.
const EXTRA_LANGS = [
  { id: "ta", norm: normIndic, field: "textTamil" },
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
/** Unique normalized tokens of a string (keeps each blob small, no repeats). */
const dedupe = (s) => [...new Set(s.split(" ").filter(Boolean))].join(" ");

const core = [];
const extra = Object.fromEntries(EXTRA_LANGS.map(({ id }) => [id, []]));
let verseCount = 0;

for (let surah = 1; surah <= 114; surah++) {
  const verses = readJson(path.join(VERSES_DIR, `${surah}.json`));
  // Per-language arrays for this Surah (ayah order); missing file → skip that lang.
  const extraArr = Object.fromEntries(
    EXTRA_LANGS.map(({ id, field }) => {
      if (field) return [id, null]; // rides inside the verse file
      const file = path.join(TRANS_DIR, id, `${surah}.json`);
      return [id, fs.existsSync(file) ? readJson(file) : null];
    }),
  );

  verses.forEach((v, i) => {
    const coreBlob = dedupe(`${normArabic(v.textArabic)} ${normLatin(v.textEnglish)}`.replace(/\s+/g, " ").trim());
    core.push([`${surah}:${v.ayahNumber}`, v.textArabic, coreBlob]);
    for (const { id, norm, field } of EXTRA_LANGS) {
      const txt = field ? v[field] : extraArr[id]?.[i];
      extra[id].push(typeof txt === "string" ? dedupe(norm(txt)) : "");
    }
    verseCount++;
  });
}

const mb = (p) => (fs.statSync(p).size / 1e6).toFixed(2);
fs.writeFileSync(CORE_OUT, JSON.stringify(core));
console.log(`Wrote ${verseCount} ayah entries → ${path.relative(root, CORE_OUT)} (${mb(CORE_OUT)} MB)`);
for (const { id } of EXTRA_LANGS) {
  const p = langOut(id);
  fs.writeFileSync(p, JSON.stringify(extra[id]));
  console.log(`  + ${path.relative(root, p)} (${mb(p)} MB)`);
}
const sample = core.find((e) => e[0] === "2:255");
console.log("Sample 2:255 core tokens:", sample ? sample[2].split(" ").length : "MISSING");
