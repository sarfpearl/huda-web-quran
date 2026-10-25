/**
 * HuDa Web Quran — which Surah clips need the real Ayah timing
 * (surahClipFollowsAyah in src/components/home/SurahCinematicBackground.tsx)
 *
 * An audio-only reciter's Ayah is estimated, so a Surah whose clip changes
 * with the Ayah shows its image for them; a single whole-Surah clip stays.
 *
 *   node --test tests/video/surah-clip-follows-ayah.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const { surahClipFollowsAyah, resolveSurahClip } = require(path.join(ROOT, "src/components/home/SurahCinematicBackground.tsx"));

const verseCount = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `public/data/quran-verses/${s}.json`), "utf8")).length;

test("sets, chapters and per-Ayah clips follow the Ayah; one whole-Surah clip doesn't", () => {
  for (const s of [2, 3, 4, 19, 32]) assert.equal(surahClipFollowsAyah(s), true, `Surah ${s}`);
  for (const s of [1, 50, 114]) assert.equal(surahClipFollowsAyah(s), false, `Surah ${s}`);
});

test("a Surah whose clip differs between Ayahs is always marked", () => {
  for (let s = 1; s <= 114; s++) {
    const clips = new Set();
    for (let a = 1; a <= verseCount(s); a++) clips.add(resolveSurahClip(s, a));
    if (clips.size > 1) assert.equal(surahClipFollowsAyah(s), true, `Surah ${s} has ${clips.size} clips`);
  }
});
