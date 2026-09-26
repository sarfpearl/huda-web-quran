#!/usr/bin/env node
/**
 * HuDa Web Quran — Tajweed (QPC V4) Word Glyphs + Page Fonts
 * ----------------------------------------------------------
 * Tajweed mode renders each Quran word as ONE glyph of the King Fahd Complex
 * V4 Tajweed colour fonts (COLRv1): the Tajweed colours are drawn inside the
 * font, per letter and per mark, exactly as in the printed Madinah Mushaf.
 * Each of the 604 Mushaf pages has its own font; a word's glyph is its
 * `code_v2` character in the font of its `v2_page`. Word positions are the
 * same Quran.com (QDC) positions the reciter word timings use, so a timing's
 * wordIndex addresses its glyph directly.
 *
 * Output:
 *   public/data/quran-glyphs/<surah>.json
 *     [ { a: ayah, w: [ [code, page, textUthmani], ... ], e: [code, page] } ]
 *     (w = spoken words in order; e = the end-of-ayah ornament glyph)
 *   public/fonts/qpc-v4/p<page>.woff2   (skipped when already present)
 *
 * Usage:
 *   node scripts/generation/fetch-qpc-v4.mjs            # words + fonts
 *   node scripts/generation/fetch-qpc-v4.mjs words      # words only
 *   node scripts/generation/fetch-qpc-v4.mjs fonts      # fonts only
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const WORDS_OUT = resolve(ROOT, "public/data/quran-glyphs");
const FONTS_OUT = resolve(ROOT, "public/fonts/qpc-v4");

const mode = process.argv[2] ?? "all";

async function get(url, as = "json") {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url);
    if (res.ok) return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  throw new Error(`failed: ${url}`);
}

if (mode === "all" || mode === "words") {
  await mkdir(WORDS_OUT, { recursive: true });
  for (let n = 1; n <= 114; n++) {
    const json = await get(
      `https://api.quran.com/api/v4/verses/by_chapter/${n}?words=true&per_page=300&word_fields=code_v2,v2_page,text_uthmani`
    );
    const verses = json.verses.map((v) => {
      const spoken = v.words.filter((w) => w.char_type_name === "word");
      const end = v.words.find((w) => w.char_type_name === "end");
      return {
        a: v.verse_number,
        w: spoken.map((w) => [w.code_v2, w.v2_page, w.text_uthmani]),
        ...(end ? { e: [end.code_v2, end.v2_page] } : {}),
      };
    });
    await writeFile(resolve(WORDS_OUT, `${n}.json`), JSON.stringify(verses));
    process.stdout.write(`${n} `);
  }
  process.stdout.write("\nwords done\n");
}

if (mode === "all" || mode === "fonts") {
  await mkdir(FONTS_OUT, { recursive: true });
  for (let p = 1; p <= 604; p++) {
    const file = resolve(FONTS_OUT, `p${p}.woff2`);
    try {
      await access(file);
      continue;
    } catch {
      /* not downloaded yet */
    }
    await writeFile(file, await get(`https://quran.com/fonts/quran/hafs/v4/colrv1/woff2/p${p}.woff2`, "buffer"));
    if (p % 50 === 0) process.stdout.write(`${p} `);
  }
  process.stdout.write("\nfonts done\n");
}
