#!/usr/bin/env node
/**
 * HuDa Web Quran — Per-Reciter Word-Timing Generator
 * ---------------------------------------------------
 * Fetches Quran.com (QDC) word-level acoustic segments for every reciter that has
 * them, and caches per-surah timing files that are perfectly paired with the
 * matching quranicaudio.com audio file.
 *
 * Output:  public/data/quran-timings/<reciterId>/<surah>.json
 *   {
 *     surahNumber, durationMs, durationSeconds, audioUrl,
 *     verseTimings: [
 *       { verseKey, ayahNumber, timestampFromSec, timestampToSec, durationSec,
 *         segments: [ { wordIndex, startSec, endSec } ] }
 *     ]
 *   }
 *
 * Also emits public/data/quran-timings/<reciterId>/manifest.json with the
 * synchronous audio URL template (base) so the app can build URLs without a fetch.
 *
 * Usage:
 *   node scripts/generation/fetch-reciter-timings.mjs                 # all mapped reciters
 *   node scripts/generation/fetch-reciter-timings.mjs sudais alafasy  # subset
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT_DIR = resolve(ROOT, "public/data/quran-timings");
const QDC = "https://api.qurancdn.com/api/qdc/audio/reciters";

// app reciter id  ->  QDC recitation id
const RECITER_QDC = {
  sudais: 3,
  alafasy: 7,
  dosari: 97,       // Yasser Ad Dussary
  abdulbaset: 2,    // Murattal
  minshawi: 9,
  hussary: 6,
  shuraim: 10,
  shatri: 4,
  tunaiji: 161,
};

const SURAH_COUNT = 114;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJSON(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(400 * (i + 1));
  }
  throw new Error(`failed: ${url}`);
}

function normalizeAudioUrl(u) {
  if (!u) return u;
  let out = u.startsWith("//") ? `https:${u}` : u;
  // collapse accidental double slashes in the path (keep protocol's //)
  out = out.replace(/([^:])\/\/+/g, "$1/");
  return out;
}

function deriveTemplate(url1, surah) {
  // The trailing filename may be zero-padded ("001.mp3") or bare ("1.mp3").
  // Detect which and emit a placeholder the app understands:
  //   {n}   -> unpadded surah number
  //   {nnn} -> zero-padded to 3 digits
  const norm = normalizeAudioUrl(url1);
  const m = norm.match(/\/([0-9]+)\.mp3$/);
  if (!m) return norm; // unexpected shape
  const numStr = m[1];
  const placeholder = numStr.length >= 3 && numStr.startsWith("0") ? "{nnn}" : "{n}";
  return norm.replace(/\/[0-9]+\.mp3$/, `/${placeholder}.mp3`);
}

function buildFromTemplate(template, n) {
  return template
    .replace("{nnn}", String(n).padStart(3, "0"))
    .replace("{n}", String(n));
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status;
  } catch {
    return 0;
  }
}

async function run() {
  const only = process.argv.slice(2);
  const targets = Object.entries(RECITER_QDC).filter(
    ([id]) => only.length === 0 || only.includes(id)
  );

  for (const [reciterId, qdcId] of targets) {
    const dir = resolve(OUT_DIR, reciterId);
    await mkdir(dir, { recursive: true });
    let template = null;
    let ok = 0;
    let failed = [];

    for (let surah = 1; surah <= SURAH_COUNT; surah++) {
      const url = `${QDC}/${qdcId}/audio_files?chapter=${surah}&segments=true`;
      let data;
      try {
        data = await fetchJSON(url);
      } catch (e) {
        failed.push(surah);
        continue;
      }
      const file = data?.audio_files?.[0];
      if (!file || !Array.isArray(file.verse_timings)) {
        failed.push(surah);
        continue;
      }

      const audioUrl = normalizeAudioUrl(file.audio_url);
      if (surah === 1) template = deriveTemplate(file.audio_url, 1);

      const verseTimings = file.verse_timings.map((vt) => {
        const [s] = vt.verse_key.split(":");
        const ayahNumber = Number(vt.verse_key.split(":")[1]);
        const segs = (vt.segments || [])
          .filter((seg) => Array.isArray(seg) && seg.length >= 3)
          .map((seg) => ({
            wordIndex: Number(seg[0]),
            startSec: Number(seg[1]) / 1000,
            endSec: Number(seg[2]) / 1000,
          }));
        return {
          verseKey: vt.verse_key,
          ayahNumber,
          timestampFromSec: (vt.timestamp_from ?? 0) / 1000,
          timestampToSec: (vt.timestamp_to ?? 0) / 1000,
          durationSec: (vt.duration ?? 0) / 1000,
          segments: segs,
        };
      });

      const payload = {
        surahNumber: surah,
        reciterId,
        qdcId,
        durationMs: file.duration ?? null,
        durationSeconds: file.duration != null ? file.duration / 1000 : null,
        audioUrl,
        verseTimings,
      };
      await writeFile(
        resolve(dir, `${surah}.json`),
        JSON.stringify(payload),
        "utf8"
      );
      ok++;
      await sleep(60); // be gentle to the API
    }

    // Verify the derived template actually resolves for a few surahs
    let templateOk = null;
    if (template) {
      const checks = await Promise.all(
        [1, 36, 114].map((n) => headOk(buildFromTemplate(template, n)))
      );
      templateOk = checks.every((c) => c === 200);
    }

    await writeFile(
      resolve(dir, "manifest.json"),
      JSON.stringify(
        { reciterId, qdcId, audioTemplate: template, templateVerified: templateOk, surahsGenerated: ok, failed },
        null,
        2
      ),
      "utf8"
    );
    console.log(
      `✓ ${reciterId} (qdc ${qdcId}): ${ok}/114 | template=${template} | verified=${templateOk}` +
        (failed.length ? ` | FAILED: ${failed.join(",")}` : "")
    );
  }
  console.log("DONE");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
