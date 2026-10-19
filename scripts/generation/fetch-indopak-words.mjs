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

// The same letter written with another code point in one of the texts
// (ى / ی / ي, ك / ک, ه / ہ / ھ, the alef forms …): one class, to align them.
const CLASS = { "ی": "ي", "ى": "ي", "ے": "ي", "ۍ": "ي", "ې": "ي", "ئ": "ي", "ک": "ك", "ڪ": "ك", "ہ": "ه", "ھ": "ه", "ۃ": "ة",
  "ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ٲ": "ا", "ٳ": "ا", "ؤ": "و" };
const same = (x, y) => (CLASS[x] ?? x) === (CLASS[y] ?? y);

// The API has text_indopak_nastaleeq per verse only (not per word), and it
// doesn't space words as text_indopak did (some are joined), so the words are
// found by their letters: the new verse's letters are aligned (LCS) with the
// previous text's letters, each with its word (same positions); a letter goes
// to its partner's word, an unpaired one to the word of the letter before it
// (or the next word after a space when the next paired letter is there);
// marks, waqf signs and spaces go with the letter before them. The ayah number
// is dropped. Letters that differ are counted and listed, not guessed away.
const tails = new Map(); // what follows a verse's last letter — check it's no ayah number
let unpaired = 0;
const unpairedAt = [];
function split(key, text, old) {
  const chars = [...text.trim().split(/\s+/).filter((t) => !/^[\p{Nd}\u06DD]+$/u.test(t)).join(" ")];
  const B = old.flatMap((wd, wi) => [...skeleton(wd)].map((c) => [c, wi]));
  const A = chars.map((c, i) => [c, i]).filter(([c]) => LETTER.test(c));
  const n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = same(A[i][0], B[j][0]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const wordOf = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (same(A[i][0], B[j][0]) && L[i][j] === L[i + 1][j + 1] + 1) (wordOf[i++] = B[j++][1]);
    else if (L[i + 1][j] >= L[i][j + 1]) i++;
    else j++;
  }
  // Unpaired letters: the word before, or the next paired letter's word after a space.
  for (let i = 0; i < n; i++) {
    if (wordOf[i] !== -1) continue;
    unpaired++;
    if (unpairedAt.length < 30) unpairedAt.push(`${key} ${A[i][0]}`);
    const prev = i > 0 ? wordOf[i - 1] : 0;
    const next = wordOf.slice(i + 1).find((x) => x !== -1) ?? prev;
    const spaced = chars.slice(i > 0 ? A[i - 1][1] : 0, A[i][1]).includes(" ");
    wordOf[i] = spaced && next > prev ? Math.min(prev + 1, next) : Math.max(prev, 0);
  }
  const out = old.map(() => "");
  let li = 0, w = 0;
  chars.forEach((c, ci) => {
    if (li < n && A[li][1] === ci) w = wordOf[li++];
    out[w] += c;
  });
  out.forEach((x, wi) => {
    if (!skeleton(x)) throw new Error(`${key}: word ${wi + 1} (${old[wi]}) got no letters\n${text}`);
  });
  const last = [...out[out.length - 1]];
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
      const k = (x) => [...skeleton(x)].map((c) => CLASS[c] ?? c).join("");
      if (old[j] && k(old[j]) !== k(t)) differ.push(`${v.verse_key}:${j + 1} ${old[j]} → ${t}`);
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
process.stdout.write(`unpaired letters: ${unpaired}\n${unpairedAt.join(", ")}\n`);
// After each verse's last letter (its marks, a waqf sign) — check none is an ayah number.
process.stdout.write(`verse ends: ${[...tails].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k, c]) => `${k} ×${c}`).join(", ")}\n`);
