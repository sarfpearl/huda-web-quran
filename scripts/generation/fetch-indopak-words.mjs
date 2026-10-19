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

const LETTER = /[\u0621-\u064A\u066E-\u06D3\u06D5\u06EE\u06EF]/;
/** The letters of a word, to check a new word is the same word as before. */
const skeleton = (t) => [...t].filter((c) => LETTER.test(c)).join("");

// The API has text_indopak_nastaleeq per verse only (not per word), and some
// words are written in two parts (وَ يُقِيۡمُوۡنَ). Split on spaces — a token
// without a letter (a waqf mark, ۞, ۩) joins the one before it, or after it at
// the start; the ayah number is dropped — then group the parts as the previous
// word text (text_indopak, same positions) groups them.
function parts(text) {
  const out = [];
  let lead = "";
  for (const tok of text.trim().split(/\s+/)) {
    if (/^[\u0660-\u0669\u06F0-\u06F9\u06DD]+$/.test(tok)) continue;
    if (LETTER.test(tok)) {
      out.push(lead + tok);
      lead = "";
    } else if (out.length) out[out.length - 1] += tok;
    else lead += tok;
  }
  return out;
}
const sizes = (old) => old.map((w) => w.trim().split(/\s+/).filter((t) => LETTER.test(t)).length);
function group(p, n) {
  let i = 0;
  return n.map((k) => p.slice(i, (i += k)).join(" "));
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
    const p = parts(v.text_indopak_nastaleeq);
    const n = sizes(old);
    const g = glyphs[i];
    if (!g || g.a !== a || old.length !== g.w.length || n.reduce((x, y) => x + y, 0) !== p.length) {
      throw new Error(`${v.verse_key}: ${p.length} parts, ${n.join("+")} before, ${g?.w.length} glyph words\n${v.text_indopak_nastaleeq}`);
    }
    const w = group(p, n);
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
