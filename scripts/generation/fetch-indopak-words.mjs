#!/usr/bin/env node
/**
 * HuDa Web Quran — IndoPak Word Text
 * ----------------------------------
 * The IndoPak script (South Asia's Mushaf style: its own harakat, sukun and
 * madd marks) per word, at the same word positions as the QPC V4 glyph data
 * (public/data/quran-glyphs) and so as the reciters' word timings — the word
 * highlight and tap-to-seek work unchanged.
 *
 * Source: Quran.com / Quran Foundation API `text_indopak_nastaleeq`, copied
 * verbatim — the text QuranWBW asked us to use (2026-10-19: `text_indopak` is
 * the older, deprecated IndoPak of legacy Quran.com). It is encoded for the
 * "AlQuran IndoPak by QuranWBW" font (it uses that font's private-use
 * characters), which may only be used with QuranWBW's written permission —
 * see docs/TODO.md before shipping it.
 *
 * Output:
 *   public/data/quran-indopak/<surah>.json   [ { a: ayah, w: [text, ...] } ]
 *
 * Usage: node scripts/generation/fetch-indopak-words.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(ROOT, "public/data/quran-indopak");
const GLYPHS = resolve(ROOT, "public/data/quran-glyphs");

async function get(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(`failed: ${url}`);
}

// Letters (no tatweel): what a word is made of, to place the new text's
// letters on the same words as before.
const LETTER = /[\u0621-\u063F\u0641-\u064A\u066E-\u06D3\u06D5\u06EE\u06EF]/;
const skeleton = (t) => [...t].filter((c) => LETTER.test(c)).join("");

// The API has text_indopak_nastaleeq per verse only (not per word), and it
// doesn't always space words as text_indopak did (وَ يُقِيۡمُوۡنَ is one word;
// some are joined). So the words are found by their letters: each letter of
// the new verse goes, in order, to the word whose letters it continues (the
// words of the previous text, same positions); marks, waqf signs and spaces go
// with the letter before them. The ayah number is dropped. Any letter that
// doesn't match stops the run.
const tails = new Map(); // what follows a verse's last letter — check it's no ayah number
function split(key, text, old) {
  const chars = [...text.trim().split(/\s+/).filter((t) => !/^[\p{Nd}\u06DD]+$/u.test(t)).join(" ")];
  const want = old.map(skeleton);
  const out = old.map(() => "");
  let w = 0, k = 0; // word, letter within it
  for (const c of chars) {
    if (LETTER.test(c)) {
      if (k === want[w].length) (w++, (k = 0));
      if (w >= want.length || want[w][k] !== c) {
        throw new Error(`${key} word ${w + 1}: expected ${want[w]?.[k] ?? "end"} got ${c}\n${text}`);
      }
      k++;
    }
    out[w] += c;
  }
  if (w !== want.length - 1 || k !== want[w].length) throw new Error(`${key}: ended in word ${w + 1}\n${text}`);
  const last = [...out[w]];
  const tail = last.slice(last.findLastIndex((c) => LETTER.test(c)) + 1).join("").trim();
  const t = [...tail].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ") || "(none)";
  tails.set(t, (tails.get(t) ?? 0) + 1);
  return out.map((x) => x.trim());
}

await mkdir(OUT, { recursive: true });
let changed = 0;
const differ = [];
for (let n = 1; n <= 114; n++) {
  const json = await get(`https://api.quran.com/api/v4/quran/verses/indopak_nastaleeq?chapter_number=${n}`);
  const glyphs = JSON.parse(await readFile(resolve(GLYPHS, `${n}.json`), "utf8"));
  const before = JSON.parse(await readFile(resolve(OUT, `${n}.json`), "utf8").catch(() => "[]"));
  const verses = json.verses.map((v, i) => {
    const a = Number(v.verse_key.split(":")[1]);
    const old = before.find((x) => x.a === a)?.w ?? [];
    const g = glyphs[i];
    if (!g || g.a !== a || old.length !== g.w.length) {
      throw new Error(`${v.verse_key}: ${old.length} words before, ${g?.w.length} glyph words`);
    }
    const w = split(v.verse_key, v.text_indopak_nastaleeq, old);
    w.forEach((t, j) => {
      if (old[j] !== t) changed++;
      if (old[j] && skeleton(old[j]) !== skeleton(t)) differ.push(`${v.verse_key}:${j + 1} ${old[j]} → ${t}`);
    });
    return { a, w };
  });
  if (verses.length !== glyphs.length) throw new Error(`${n}: ${verses.length} verses, ${glyphs.length} glyph verses`);
  await writeFile(resolve(OUT, `${n}.json`), JSON.stringify(verses));
  process.stdout.write(`${n} `);
}
process.stdout.write(`\ndone — ${changed} words changed\n`);
// Letters that differ from the old text: expected none (only marks change).
process.stdout.write(`letters differ: ${differ.length}\n${differ.slice(0, 30).join("\n")}\n`);
// After each verse's last letter (its marks, a waqf sign) — check none is an ayah number.
process.stdout.write(`verse ends: ${[...tails].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k, c]) => `${k} ×${c}`).join(", ")}\n`);
