/**
 * HuDa Web Quran — Thematic set registry (src/lib/data/surahSetVideos.ts)
 *
 * Verifies, on the generated registry the app ships:
 *   1. Each Surah's sets cover ayah 1 to its last ayah, with no gap or overlap.
 *   2. Every set clip is in videoManifest.ts (so the app requests it).
 *   3. getSetVideo picks the covering set, set 1 before any ayah, null elsewhere.
 *
 *   node --test tests/video/surah-set-videos.test.mjs
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
const { SURAH_SET_VIDEOS, getSetVideo } = require(path.join(ROOT, "src/lib/data/surahSetVideos.ts"));
const { hasVideo } = require(path.join(ROOT, "src/lib/data/videoManifest.ts"));

const verseCount = (s) => JSON.parse(fs.readFileSync(path.join(ROOT, `public/data/quran-verses/${s}.json`), "utf8")).length;

test("each Surah's sets cover every ayah exactly once", () => {
  for (const [surah, sets] of Object.entries(SURAH_SET_VIDEOS)) {
    let next = 1;
    for (const s of sets) {
      assert.equal(s.from, next, `Surah ${surah}: set ${s.path} should start at ayah ${next}`);
      assert.ok(s.to >= s.from, `Surah ${surah}: ${s.path} runs backwards`);
      next = s.to + 1;
    }
    assert.equal(next - 1, verseCount(Number(surah)), `Surah ${surah}: sets should end at its last ayah`);
  }
});

test("every set clip is in the video manifest", () => {
  for (const sets of Object.values(SURAH_SET_VIDEOS)) {
    for (const s of sets) assert.ok(hasVideo(s.path), `${s.path} is not in videoManifest.ts`);
  }
});

test("getSetVideo picks the covering set", () => {
  const [surah, sets] = Object.entries(SURAH_SET_VIDEOS)[0];
  const n = Number(surah);
  assert.equal(getSetVideo(n, null), sets[0].path, "no ayah yet: set 1");
  assert.equal(getSetVideo(n, 1), sets[0].path);
  const last = sets[sets.length - 1];
  assert.equal(getSetVideo(n, last.to), last.path);
  assert.equal(getSetVideo(n, last.to + 1), null, "past the last ayah");
  assert.equal(getSetVideo(1, 1), null, "a Surah without sets");
});
