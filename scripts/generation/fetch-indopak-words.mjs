#!/usr/bin/env node
/**
 * HuDa Web Quran — IndoPak Word Text
 * ----------------------------------
 * The IndoPak script (South Asia's Mushaf style: its own harakat, sukun and
 * madd marks) per word, at the same word positions as the QPC V4 glyph data
 * (public/data/quran-glyphs) and so as the reciters' word timings — the word
 * highlight and tap-to-seek work unchanged.
 *
 * Source: Quran.com `text_indopak`, copied verbatim. It is encoded for the
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

/** Same split as fetch-qpc-v4.mjs: one Quran.com position timed as two words. */
const SPLIT_POSITIONS = new Set(["37:130:3"]);

async function get(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(`failed: ${url}`);
}

await mkdir(OUT, { recursive: true });
for (let n = 1; n <= 114; n++) {
  const json = await get(
    `https://api.quran.com/api/v4/verses/by_chapter/${n}?words=true&per_page=300&word_fields=text_indopak`
  );
  const glyphs = JSON.parse(await readFile(resolve(GLYPHS, `${n}.json`), "utf8"));
  const verses = json.verses.map((v, i) => {
    const words = v.words
      .filter((w) => w.char_type_name === "word")
      .flatMap((w) => {
        const text = w.text_indopak.trim();
        if (!SPLIT_POSITIONS.has(`${n}:${v.verse_number}:${w.position}`)) return [text];
        return text.split(/\s+/);
      });
    const g = glyphs[i];
    if (!g || g.a !== v.verse_number || g.w.length !== words.length) {
      throw new Error(`${n}:${v.verse_number}: ${words.length} IndoPak words, ${g?.w.length} glyph words`);
    }
    return { a: v.verse_number, w: words };
  });
  await writeFile(resolve(OUT, `${n}.json`), JSON.stringify(verses));
  process.stdout.write(`${n} `);
}
process.stdout.write("\ndone\n");
