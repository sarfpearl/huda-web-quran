/**
 * HuDa Web Quran — Record video (src/lib/record)
 *
 *   1. Frame sizes: the short side is the quality, shapes are exact.
 *   2. corsUrl sends R2 files through the same-origin /media-cors rewrite
 *      (R2 has no CORS) and leaves CORS hosts, data: and blob: alone.
 *   3. Every Record label has all nine translations.
 *
 *   node --test tests/record/record.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const { frameSize } = require(path.join(ROOT, "src/lib/record/recorder.ts"));
const { corsUrl } = require(path.join(ROOT, "src/lib/record/corsMedia.ts"));
const record = require(path.join(ROOT, "src/lib/i18n/record.ts")).default;

test("frame sizes", () => {
  assert.deepEqual(frameSize("9:16", "1080"), { width: 1080, height: 1920 });
  assert.deepEqual(frameSize("9:16", "720"), { width: 720, height: 1280 });
  assert.deepEqual(frameSize("16:9", "1080"), { width: 1920, height: 1080 });
  assert.deepEqual(frameSize("1:1", "720"), { width: 720, height: 720 });
});

test("corsUrl proxies R2 only", () => {
  const r2 = "https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev/videos/surah_97/set_01_ayah_1-5.mp4";
  assert.equal(corsUrl(r2), "/media-cors/videos/surah_97/set_01_ayah_1-5.mp4");
  const base = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").replace(/\/+$/, "");
  if (base) assert.equal(corsUrl(`${base}/audio/meaning/v1/a.mp3`), "/media-cors/audio/meaning/v1/a.mp3");
  for (const u of [
    "https://server8.mp3quran.net/afs/001.mp3",
    "https://everyayah.com/data/Alafasy_128kbps/001001.mp3",
    "data:audio/wav;base64,AAAA",
    "blob:http://localhost/abc",
    "/huda-logo.webp",
  ]) assert.equal(corsUrl(u), u);
});

test("Record labels are translated", () => {
  for (const [key, tr] of Object.entries(record)) {
    for (const lang of ["ta", "ur", "ml", "hi", "id", "bn", "tr", "fr", "ms"]) {
      assert.ok(tr[lang], `"${key}" has no ${lang}`);
    }
  }
});
