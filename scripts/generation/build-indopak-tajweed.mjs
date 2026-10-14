#!/usr/bin/env node
/**
 * HuDa Web Quran — IndoPak Tajweed colours (PROTOTYPE)
 * ----------------------------------------------------
 * There is no Tajweed-coloured IndoPak text or font to use, so this carries
 * the Uthmani Tajweed rules over onto the IndoPak words:
 *
 *  1. Rules: tarekeldeeb/quran-tajweed-embedded (CC BY 4.0) — each rule as
 *     codepoint offsets into the Tanzil Uthmani text of its ayah.
 *  2. Each Uthmani word and its IndoPak word (public/data/quran-indopak, same
 *     word positions) are split into letter clusters (a letter + its marks)
 *     and the letters aligned (LCS on normalised letters: ٱ / أ / إ / آ → ا,
 *     ک / ڪ → ك, ی / ى → ي …), as the two scripts spell some words apart.
 *  3. A rule on a letter colours the matching IndoPak cluster; a rule on a
 *     mark alone (a madd's small alef ٰ / maddah ٓ) colours the same mark in
 *     IndoPak when it has one, else the cluster.
 *
 * Colours are TAJWEED_LEGEND's (src/lib/data/quranGlyphs.ts), by index.
 *
 * Inputs (not committed, ~7 MB) — download first:
 *   https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.embeded.txt
 *   https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.uthmani-pause-sajdah.json
 *
 * Output:
 *   public/data/quran-indopak-tajweed/<surah>.json
 *     [ { a: ayah, w: [ [ [text, colour | null], ... ], ... ] } ]
 *
 * Usage:
 *   node scripts/generation/build-indopak-tajweed.mjs <data-dir> <surah> [fromAyah] [toAyah]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(ROOT, "public/data/quran-indopak-tajweed");
const INDOPAK = resolve(ROOT, "public/data/quran-indopak");

const [dataDir, surahArg, fromArg, toArg] = process.argv.slice(2);
if (!dataDir || !surahArg) {
  console.error("usage: build-indopak-tajweed.mjs <data-dir> <surah> [fromAyah] [toAyah]");
  process.exit(1);
}
const SURAH = Number(surahArg);
const FROM = Number(fromArg ?? 1);
const TO = Number(toArg ?? 999);

// TAJWEED_LEGEND indexes.
const SILENT = 0, MADD2 = 1, MADD246 = 2, MUTTASIL = 3, MADD6 = 4, GHUNNAH = 5, QALQALAH = 6;
const COLOUR = {
  silent: SILENT,
  hamzat_wasl: SILENT,
  lam_shamsiyyah: SILENT,
  idghaam_no_ghunnah: SILENT,
  idghaam_mutajaanisain: SILENT,
  idghaam_mutaqaaribain: SILENT,
  madd_2: MADD2,
  madd_246: MADD246,
  madd_munfasil: MADD246,
  madd_muttasil: MUTTASIL,
  madd_6: MADD6,
  ghunnah: GHUNNAH,
  idghaam_ghunnah: GHUNNAH,
  idghaam_shafawi: GHUNNAH,
  ikhfa: GHUNNAH,
  ikhfa_shafawi: GHUNNAH,
  iqlab: GHUNNAH,
  qalqalah: QALQALAH,
};

// Letters (cluster heads) and their normalised form for aligning the scripts.
const NORM = {
  "ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ٲ": "ا", "ٳ": "ا",
  "ک": "ك", "ڪ": "ك",
  "ی": "ي", "ى": "ي", "ے": "ي", "ئ": "ي",
  "ہ": "ه", "ھ": "ه", "ة": "ة",
  "ؤ": "و",
};
// Pause marks, spaces and direction / zero-width marks are never coloured.
const isPlain = (c) => /[\s\u06D6-\u06DC\u06DE\u06E9\u200B-\u200F]/.test(c);
const isLetter = (c) => /[ء-غف-يٱ-ۓە]/.test(c);
const norm = (c) => NORM[c] ?? c;
// Marks with an IndoPak counterpart: madd marks.
const MARK_EQ = { "ٰ": ["ٰ"], "ٓ": ["ٓ", "ۤ"] };

/** Letter clusters: [{ base, idx: [char offsets] }] (leading marks join the first). */
function clusters(text, offset = 0) {
  const out = [];
  [...text].forEach((c, i) => {
    if (isLetter(c) || out.length === 0) out.push({ base: isLetter(c) ? norm(c) : "", idx: [offset + i] });
    else out[out.length - 1].idx.push(offset + i);
  });
  return out;
}

/** LCS alignment of two cluster lists by base letter: [[i, j], ...]. */
function align(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i].base && a[i].base === b[j].base ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i].base && a[i].base === b[j].base) pairs.push([i++, j++]);
    else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

const embedded = new Map();
for (const line of (await readFile(resolve(dataDir, "tajweed.hafs.embeded.txt"), "utf8")).split("\n")) {
  const [s, a, text] = line.split("|");
  if (text !== undefined) embedded.set(`${s}:${a}`, text.replace(/[a-z]/g, ""));
}
const bismillahLength = [...embedded.get("1:1")].length + 1;
const rules = new Map();
for (const r of JSON.parse(await readFile(resolve(dataDir, "tajweed.hafs.uthmani-pause-sajdah.json"), "utf8")))
  rules.set(`${r.surah}:${r.ayah}`, r.annotations);
const indoPak = JSON.parse(await readFile(resolve(INDOPAK, `${SURAH}.json`), "utf8"));

const stats = { rules: 0, placed: 0, lost: 0, skippedAyahs: [] };
const out = [];
for (const { a, w: ipWords } of indoPak) {
  if (a < FROM || a > TO) continue;
  const text = embedded.get(`${SURAH}:${a}`) ?? "";
  const chars = [...text];
  // Colour per Uthmani char (a later rule wins where two overlap).
  const charColour = new Array(chars.length).fill(null);
  // An opening ayah's offsets count the Bismillah before it (1:1 is the
  // Bismillah itself; At-Tawbah has none).
  const shift = a === 1 && SURAH !== 1 && SURAH !== 9 ? bismillahLength : 0;
  for (const r of rules.get(`${SURAH}:${a}`) ?? []) {
    const start = r.start - shift, end = r.end - shift;
    if (!(r.rule in COLOUR) || start < 0 || end > chars.length) continue;
    for (let i = start; i < end; i++) if (chars[i] !== " ") charColour[i] = COLOUR[r.rule];
  }
  // Uthmani words with their char offsets.
  const uWords = [];
  let at = 0;
  for (const word of text.split(" ")) {
    if (word) uWords.push({ word, at });
    at += [...word].length + 1;
  }
  if (uWords.length !== ipWords.length) {
    stats.skippedAyahs.push(`${SURAH}:${a} (${uWords.length} Uthmani / ${ipWords.length} IndoPak words)`);
    out.push({ a, w: ipWords.map((t) => [[t, null]]) });
    continue;
  }
  const words = ipWords.map((ip, wi) => {
    const uc = clusters(uWords[wi].word, uWords[wi].at);
    const ipChars = [...ip];
    const ic = clusters(ip);
    const colour = new Array(ipChars.length).fill(null);
    const matched = new Map(align(uc, ic).map(([i, j]) => [i, j]));
    uc.forEach((cl, i) => {
      const coloured = cl.idx.filter((k) => charColour[k] !== null);
      if (coloured.length === 0) return;
      stats.rules++;
      const j = matched.get(i);
      if (j === undefined) return void stats.lost++;
      stats.placed++;
      const target = ic[j].idx;
      const onBase = coloured.includes(cl.idx[0]);
      const c = charColour[coloured[coloured.length - 1]];
      if (!onBase) {
        // A mark alone: the same mark in IndoPak, when it has one.
        const want = coloured.flatMap((k) => MARK_EQ[chars[k]] ?? []);
        const marks = target.filter((k) => want.includes(ipChars[k]));
        if (marks.length) return marks.forEach((k) => (colour[k] = c));
      }
      target.forEach((k) => !isPlain(ipChars[k]) && (colour[k] = c));
    });
    // Runs of one colour.
    const runs = [];
    ipChars.forEach((ch, k) => {
      const last = runs[runs.length - 1];
      if (last && last[1] === colour[k]) last[0] += ch;
      else runs.push([ch, colour[k]]);
    });
    return runs;
  });
  out.push({ a, w: words });
}

await mkdir(OUT, { recursive: true });
await writeFile(resolve(OUT, `${SURAH}.json`), JSON.stringify(out));
console.log(`surah ${SURAH} ayahs ${FROM}–${Math.min(TO, indoPak.length)}:`, {
  ...stats,
  placedPct: stats.rules ? `${((100 * stats.placed) / stats.rules).toFixed(1)}%` : "-",
});
