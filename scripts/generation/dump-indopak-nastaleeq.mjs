#!/usr/bin/env node
/**
 * Saves the API's text_indopak_nastaleeq (per verse) for all 114 Surahs as it
 * comes, so the word split (fetch-indopak-words.mjs) can be worked on without
 * the network: scripts/generation/fixtures/indopak-nastaleeq/<surah>.json.
 * Usage: node scripts/generation/dump-indopak-nastaleeq.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "fixtures/indopak-nastaleeq");
await mkdir(OUT, { recursive: true });
for (let n = 1; n <= 114; n++) {
  let res;
  for (let attempt = 1; attempt <= 5; attempt++) {
    res = await fetch(`https://api.quran.com/api/v4/quran/verses/indopak_nastaleeq?chapter_number=${n}`);
    if (res.ok) break;
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
  if (!res.ok) throw new Error(`${n}: HTTP ${res.status}`);
  await writeFile(resolve(OUT, `${n}.json`), JSON.stringify(await res.json()));
  process.stdout.write(`${n} `);
}
process.stdout.write("\ndone\n");
