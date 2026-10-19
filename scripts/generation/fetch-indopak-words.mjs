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
 * Usage: node scripts/generation/fetch-indopak-words.mjs [previous word text dir]
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

// Letters (no tatweel, no superscript alef): what a word is made of, to place the new text's
// letters on the same words as before.
const LETTER = /[\u0621-\u063F\u0641-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06EE\u06EF]/;
const skeleton = (t) => [...t].filter((c) => LETTER.test(c)).join("");

// The same letter written with another code point in one of the texts
// (ى / ی / ي, ك / ک, ه / ہ / ھ, the alef forms …): one class, to align them.
const CLASS = { "ی": "ي", "ى": "ي", "ے": "ي", "ۍ": "ي", "ې": "ي", "ئ": "ي", "ٮ": "ي", "ک": "ك", "ڪ": "ك", "ہ": "ه", "ھ": "ه", "ۃ": "ة",
  "ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ٲ": "ا", "ٳ": "ا", "ؤ": "و" };
const same = (x, y) => (CLASS[x] ?? x) === (CLASS[y] ?? y);

// The ayah-end sign: U+06DF and the number, a private-use glyph of the font
// (U+F500 = 1 …; U+F631–F63D and U+F681–F693 number a few marked ayahs, the
// sajdahs among them) — the app draws its own number. The other signs there
// (U+06E0, U+F64C … the ruku, U+F68F) stay, as text_indopak's did.
const AYAH_END = /\u06DF|[\uF500-\uF61E\uF631-\uF63D\uF681-\uF68E\uF690-\uF693]/gu;
const PUA = /[\uE000-\uF8FF]/;

// The API has text_indopak_nastaleeq per verse only (not per word), and it
// doesn't space words as text_indopak did (some are joined, some split), so
// the words are found by their letters: the new verse's letters are aligned
// (LCS) with the previous text's letters, each with its word (same positions);
// a letter goes to its partner's word, an unpaired one to the word of the
// letter before it (or the next word after a space when the next paired
// letter is there); marks, waqf signs and spaces go with the letter before
// them. A word the font draws as one private-use glyph (73:20 ثُلُثَىِ) has no
// letters: a letterless token with such a glyph takes the word left empty
// between its neighbours. Letters that differ are counted and listed.
const tails = new Map(); // what follows a verse's last letter — check it's no ayah number
let unpaired = 0;
const unpairedAt = [];
const glyphWords = [];
// Word by word when the tokens are the words: a token with letters, or one
// private-use glyph alone (a word drawn as one glyph); other letterless tokens
// (waqf signs) join the token before. Else letter by letter (align, below).
let byToken = 0;
/** Shared letters (LCS) over the longer skeleton: 1 = same letters. */
function likeness(a, b) {
  const x = [...skeleton(a)], y = [...skeleton(b)];
  if (!x.length || !y.length) return x.length === y.length ? 1 : 0;
  const L = Array.from({ length: x.length + 1 }, () => new Array(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      L[i][j] = same(x[i], y[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  return L[0][0] / Math.max(x.length, y.length);
}
const unlike = [];
function tokenWords(toks, old) {
  const words = [];
  for (const [i, t] of toks.entries()) {
    // (What is left of the ayah-end token is signs, never a word.)
    const glyph = t.length === 1 && PUA.test(t) && i < toks.length - 1;
    const word = [...t].some((c) => LETTER.test(c)) || glyph;
    if (word || !words.length) words.push(t);
    else words[words.length - 1] += " " + t;
  }
  if (words.length !== old.length) return null;
  // Each word must share a letter with its old word (or be a glyph word).
  const ok = words.every((w, i) => !skeleton(w) || !skeleton(old[i]) ||
    [...skeleton(w)].some((c) => [...skeleton(old[i])].some((d) => same(c, d))));
  return ok ? words : null;
}

function split(key, text, old) {
  const toks = text.trim().split(/\s+/);
  toks[toks.length - 1] = toks.at(-1).replace(AYAH_END, "");
  const direct = tokenWords(toks.filter(Boolean), old);
  if (direct) {
    byToken++;
    direct.forEach((t, i) => t.length === 1 && PUA.test(t) && glyphWords.push(`${key}:${i + 1} ${old[i]}`));
    return direct;
  }
  return align(key, text, toks, old);
}

function align(key, text, toks, old) {
  const chars = [...toks.filter(Boolean).join(" ")];
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
    if (unpairedAt.length < 40) unpairedAt.push(`${key} ${A[i][0]}`);
    const prev = i > 0 ? wordOf[i - 1] : 0;
    const next = wordOf.slice(i + 1).find((x) => x !== -1) ?? prev;
    const spaced = chars.slice(i > 0 ? A[i - 1][1] : 0, A[i][1]).includes(" ");
    wordOf[i] = spaced && next > prev ? Math.min(prev + 1, next) : Math.max(prev, 0);
  }
  // Each char's word; a letterless private-use token may fill an empty word.
  const used = new Set(wordOf);
  const charWord = new Array(chars.length);
  let li = 0, w = 0;
  for (let ci = 0; ci < chars.length; ci++) {
    if (li < n && A[li][1] === ci) w = wordOf[li++];
    const start = ci === 0 || chars[ci - 1] === " ";
    if (start && chars[ci] !== " ") {
      let end = ci;
      while (end < chars.length && chars[end] !== " ") end++;
      const tok = chars.slice(ci, end);
      const next = li < n ? wordOf[li] : old.length;
      const empty = old.findIndex((_, k) => k > (ci === 0 ? -1 : w) && k < next && !used.has(k));
      if (!tok.some((c) => LETTER.test(c)) && tok.some((c) => PUA.test(c)) && empty !== -1) {
        used.add(empty);
        glyphWords.push(`${key}:${empty + 1} ${old[empty]}`);
        for (let k = ci; k < end; k++) charWord[k] = empty;
        w = empty;
        ci = end - 1;
        continue;
      }
    }
    charWord[ci] = w;
  }
  const out = old.map(() => "");
  chars.forEach((c, ci) => (out[charWord[ci]] += c));
  out.forEach((x, wi) => {
    if (!x.trim()) throw new Error(`${key}: word ${wi + 1} (${old[wi]}) got nothing\n${text}`);
  });
  const last = [...out[out.length - 1]];
  const tail = last.slice(last.findLastIndex((c) => LETTER.test(c)) + 1).join("").trim();
  const t = [...tail].map((c) => "U+" + c.codePointAt(0).toString(16).toUpperCase()).join(" ") || "(none)";
  tails.set(t, (tails.get(t) ?? 0) + 1);
  return out.map((x) => x.trim());
}

// Offline: the verse text saved by dump-indopak-nastaleeq.mjs, when it's there.
const RAW = resolve(__dirname, "fixtures/indopak-nastaleeq");
const verseText = (n) =>
  readFile(resolve(RAW, `${n}.json`), "utf8").then(JSON.parse, () =>
    get(`https://api.quran.com/api/v4/quran/verses/indopak_nastaleeq?chapter_number=${n}`)
  );
// The previous word text (text_indopak), to report what changed.
const BEFORE = process.argv[2] ? resolve(process.argv[2]) : OUT;

await mkdir(OUT, { recursive: true });
let changed = 0;
const differ = [];
for (let n = 1; n <= 114; n++) {
  const json = await verseText(n);
  const glyphs = JSON.parse(await readFile(resolve(GLYPHS, `${n}.json`), "utf8"));
  const before = JSON.parse(await readFile(resolve(BEFORE, `${n}.json`), "utf8").catch(() => "[]"));
  const verses = json.verses.map((v, i) => {
    const a = Number(v.verse_key.split(":")[1]);
    const old = before.find((x) => x.a === a)?.w ?? [];
    const g = glyphs[i];
    if (!g || g.a !== a) throw new Error(`${v.verse_key}: no glyph verse`);
    // Matched against the glyph data's Uthmani words: the positions the word
    // timings use (the previous IndoPak text had a few verses shifted).
    const w = split(v.verse_key, v.text_indopak_nastaleeq, g.w.map((x) => x[2]));
    w.forEach((t, j) => {
      const r = likeness(t, g.w[j][2]);
      if (r < 0.5 && !(t.length === 1 && PUA.test(t))) unlike.push(`${v.verse_key}:${j + 1} ${g.w[j][2]} ↔ ${t} (${r.toFixed(2)})`);
    });
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
// A word whose letters are far from its Uthmani word: check by eye.
process.stdout.write(`unlike their Uthmani word: ${unlike.length}\n${unlike.slice(0, 40).join("\n")}\n`);
process.stdout.write(`verses split by token: ${byToken}, by letters: ${6236 - byToken}\n`);
process.stdout.write(`words drawn as one glyph: ${glyphWords.length}\n${glyphWords.join(", ")}\n`);
process.stdout.write(`unpaired letters: ${unpaired}\n${unpairedAt.join(", ")}\n`);
// After each verse's last letter (its marks, a waqf sign) — check none is an ayah number.
process.stdout.write(`verse ends: ${[...tails].sort((x, y) => y[1] - x[1]).slice(0, 15).map(([k, c]) => `${k} ×${c}`).join(", ")}\n`);
