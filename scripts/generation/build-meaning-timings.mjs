#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
//  Meaning audio word-timings generator (Forced Alignment)
//
//  For every ayah that HAS meaning audio per src/lib/data/meaningAudioManifest.json,
//  aligns the clip to its exact translation text from public/data/quran-verses/<surah>.json
//  and emits per-word timings [word, begin, end] in compact per-surah JSON files:
//
//    public/data/meaning-timings/<voice>/<lang>/<surah>.json
//      { "<ayah>": [["word", begin, end], ...] }
//
//  Usage:
//    node scripts/generation/build-meaning-timings.mjs --estimate
//    node scripts/generation/build-meaning-timings.mjs --surah=1,112,114 --voice=cruz --lang=en,ta   # pilot
//    node scripts/generation/build-meaning-timings.mjs --surah=1,67-114 --voice=all --lang=all       # all manifest surahs
//    node scripts/generation/build-meaning-timings.mjs --force                                        # overwrite existing
//
//  Flags:
//    --surah=N | N-M | N,M   Surahs to process (default: all manifest surahs)
//    --voice=cruz|lora|all   Voices (default: all)
//    --lang=en|ta|all        Languages (default: all)
//    --concurrency=N         Parallel aligner workers (default: 4)
//    --force                 Overwrite existing timings (default: resume / skip done)
//    --estimate              Print counts and estimated time without running
// ─────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const MANIFEST_PATH = path.join(ROOT, "src/lib/data/meaningAudioManifest.json");
const VERSES_DIR = path.join(ROOT, "public/data/quran-verses");
const OUT_DIR = path.join(ROOT, "public/data/meaning-timings");
const LOCAL_AUDIO_DIR = path.join(ROOT, "assets/audio/meaning/v1");
const ALIGNER_PY = path.join(ROOT, "docs/meaning-word-sync-spike/aligner.py");
const R2_BASE = "https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev";

const PYTHON_BIN =
  process.env.PYTHON ||
  (existsSync(path.join(ROOT, ".venv/bin/python"))
    ? path.join(ROOT, ".venv/bin/python")
    : "python3");

// ── CLI Args ──────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

const VOICES = args.voice === "cruz" ? ["cruz"] : args.voice === "lora" ? ["lora"] : ["cruz", "lora"];
const LANGS = args.lang === "en" ? ["en"] : args.lang === "ta" ? ["ta"] : ["en", "ta"];
const CONCURRENCY = Number(args.concurrency) || 8;
const FORCE = Boolean(args.force);

function parseSurahList() {
  if (args.surah) {
    return String(args.surah)
      .split(",")
      .flatMap((part) => {
        const [a, b] = part.split("-").map(Number);
        return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
      });
  }
  // Default: union of all manifest surahs
  const s = new Set();
  for (const v of Object.values(manifest.surahs)) {
    for (const list of Object.values(v)) {
      for (const num of list) s.add(num);
    }
  }
  return [...s].sort((a, b) => a - b);
}

const targetSurahs = parseSurahList();

function pad3(n) {
  return String(n).padStart(3, "0");
}

function loadSurahVerses(surahNum) {
  const p = path.join(VERSES_DIR, `${surahNum}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

// ── Estimate mode ─────────────────────────────────────────────────────────
if (args.estimate) {
  console.log("=== Meaning Audio Word-Timings Estimation ===");
  console.log(`Voices: ${VOICES.join(", ")}`);
  console.log(`Languages: ${LANGS.join(", ")}`);
  console.log(`Surahs (${targetSurahs.length}): ${targetSurahs.join(", ")}`);

  let totalAyahs = 0;
  let totalClips = 0;
  for (const surah of targetSurahs) {
    const verses = loadSurahVerses(surah);
    if (!verses) continue;
    totalAyahs += verses.length;
    for (const voice of VOICES) {
      for (const lang of LANGS) {
        if (manifest.surahs[voice]?.[lang]?.includes(surah)) {
          totalClips += verses.length;
        }
      }
    }
  }
  console.log(`Total Ayahs across selected Surahs: ${totalAyahs}`);
  console.log(`Total Meaning Audio Clips to align: ${totalClips}`);
  console.log(`Estimated time (at ~0.3s/clip, 4 workers): ~${Math.round((totalClips * 0.3) / 4)} seconds`);
  console.log(`Cost: $0.00 (Forced alignment runs locally with aeneas)`);
  process.exit(0);
}

// ── Worker Pool for Aligner ───────────────────────────────────────────────
class AlignerPool {
  constructor(size) {
    this.size = size;
    this.workers = [];
    this.freeWorkers = [];
    this.queue = [];
    this.pendingCallbacks = new Map();
    this.seq = 0;
  }

  start() {
    for (let i = 0; i < this.size; i++) {
      const proc = spawn(PYTHON_BIN, [ALIGNER_PY, "--worker"], {
        stdio: ["pipe", "pipe", "inherit"],
      });
      const worker = { id: i, proc };

      const rl = readline.createInterface({ input: proc.stdout });
      rl.on("line", (line) => {
        if (!line.trim()) return;
        try {
          const res = JSON.parse(line);
          const cb = this.pendingCallbacks.get(res.id);
          if (cb) {
            this.pendingCallbacks.delete(res.id);
            cb(null, res);
          }
        } catch (err) {
          console.error(`Worker ${i} JSON parse error:`, err, line);
        }
        this.freeWorkers.push(worker);
        this.pump();
      });

      proc.on("error", (err) => {
        console.error(`Worker ${i} error:`, err);
      });

      this.workers.push(worker);
      this.freeWorkers.push(worker);
    }
  }

  pump() {
    while (this.freeWorkers.length > 0 && this.queue.length > 0) {
      const worker = this.freeWorkers.pop();
      const task = this.queue.shift();
      this.pendingCallbacks.set(task.id, task.cb);
      worker.proc.stdin.write(JSON.stringify(task.req) + "\n");
    }
  }

  align(mp3, lang, text) {
    return new Promise((resolve, reject) => {
      const id = String(++this.seq);
      this.queue.push({
        id,
        req: { id, mp3, lang, text },
        cb: (err, res) => {
          if (err) return reject(err);
          if (res.error) return reject(new Error(res.error));
          resolve(res);
        },
      });
      this.pump();
    });
  }

  stop() {
    for (const w of this.workers) {
      try {
        w.proc.stdin.end();
      } catch {}
    }
  }
}

// ── Audio Download / Cache Helper ─────────────────────────────────────────
async function ensureLocalAudio(voice, lang, surah, ayah) {
  const filename = `${pad3(surah)}${pad3(ayah)}.mp3`;
  // Check local assets first
  const localAsset = path.join(LOCAL_AUDIO_DIR, voice, lang, filename);
  if (existsSync(localAsset)) return localAsset;

  // Temp cache directory
  const cacheDir = path.join(ROOT, "node_modules/.cache/huda-meaning-audio", voice, lang);
  await mkdir(cacheDir, { recursive: true });
  const cachedFile = path.join(cacheDir, filename);
  if (existsSync(cachedFile)) return cachedFile;

  // Fetch from R2
  const url = `${R2_BASE}/audio/meaning/v1/${voice}/${lang}/${filename}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(cachedFile, buf);
  return cachedFile;
}

// ── Main Processing Loop ──────────────────────────────────────────────────
async function main() {
  console.log(`Starting meaning audio alignment...`);
  console.log(`Python binary: ${PYTHON_BIN}`);
  console.log(`Voices: ${VOICES.join(", ")}`);
  console.log(`Languages: ${LANGS.join(", ")}`);
  console.log(`Surahs: ${targetSurahs.length}`);

  const pool = new AlignerPool(CONCURRENCY);
  pool.start();

  let completedSurahs = 0;
  let totalWordsAligned = 0;

  try {
    for (const voice of VOICES) {
      for (const lang of LANGS) {
        const outVoiceLangDir = path.join(OUT_DIR, voice, lang);
        await mkdir(outVoiceLangDir, { recursive: true });

        const manifestSurahs = new Set(manifest.surahs[voice]?.[lang] ?? []);

        for (const surah of targetSurahs) {
          if (!manifestSurahs.has(surah)) {
            continue; // Not in manifest for this voice/lang
          }

          const outFile = path.join(outVoiceLangDir, `${surah}.json`);
          const verses = loadSurahVerses(surah);
          if (!verses || verses.length === 0) continue;

          // Check resume
          if (!FORCE && existsSync(outFile)) {
            try {
              const existing = JSON.parse(readFileSync(outFile, "utf8"));
              const allPresent = verses.every((v) => existing[String(v.ayahNumber ?? v.verseNumber)]?.length > 0);
              if (allPresent) {
                // console.log(`✓ Surah ${surah} (${voice}/${lang}): already aligned (skipped)`);
                continue;
              }
            } catch {}
          }

          process.stdout.write(`Aligning Surah ${surah} (${voice}/${lang}, ${verses.length} ayahs)... `);
          const t0 = performance.now();

          const surahTimings = {};

          const results = await Promise.all(
            verses.map(async (v) => {
              const ayah = v.ayahNumber ?? v.verseNumber;
              const text = lang === "ta" ? v.textTamil : v.textEnglish;
              if (!text || !text.trim()) return null;

              const mp3Path = await ensureLocalAudio(voice, lang, surah, ayah);
              const aligned = await pool.align(mp3Path, lang, text);

              const words = (aligned.words || []).map(([w, b, e]) => [
                w,
                Math.round(b * 1000) / 1000,
                Math.round(e * 1000) / 1000,
              ]);
              return { ayah: String(ayah), words };
            })
          );

          for (const item of results) {
            if (item) {
              surahTimings[item.ayah] = item.words;
              totalWordsAligned += item.words.length;
            }
          }

          writeFileSync(outFile, JSON.stringify(surahTimings), "utf8");
          const elapsed = ((performance.now() - t0) / 1000).toFixed(1);
          console.log(`done in ${elapsed}s`);
          completedSurahs++;
        }
      }
    }
    console.log(`\n🎉 Alignment finished successfully!`);
    console.log(`Surahs processed/updated: ${completedSurahs}`);
    console.log(`Total words timed: ${totalWordsAligned}`);
  } finally {
    pool.stop();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
