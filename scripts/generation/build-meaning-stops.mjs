#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
//  Meaning-audio stop points (where the recitation pauses for a meaning)
//
//  The QDC word timings don't say where an ayah's voice really ends: some
//  reciters' last word runs on up to ~1.8 s past its timed end (Minshawi,
//  Hussary, Abdul Basit, Shatri), for others the next ayah starts before the
//  timed boundary (Tunaiji, Dosari). Stopping on the timings either cut the
//  ayah short or let the next one start before its meaning.
//
//  This measures it on the recording itself: between ayah k and k+1, the
//  quietest point of the voice (80 ms energy) near where the next ayah's
//  first word is timed to start (0.45 s before it to 1 s after, the nearer
//  the better — a stop consonant inside the last word dips too), kept after
//  the voice has faded and before the next ayah comes in. The last ayah has
//  none: its meaning follows the track's end.
//
//    src/lib/data/meaningStops.json
//      { "<reciter>": { "<surah>": [stop after 1:1, after 1:2, …] } }   (s)
//
//  Usage (ffmpeg; the reciters' audio from download.quranicaudio.com):
//    node scripts/generation/build-meaning-stops.mjs                  # Surahs with meaning clips
//    node scripts/generation/build-meaning-stops.mjs --surah=1-3 --reciter=hussary,shatri
// ─────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const TIMINGS = path.join(ROOT, "public/data/quran-timings");
const OUT = path.join(ROOT, "src/lib/data/meaningStops.json");
const MEANING_MANIFEST = path.join(ROOT, "src/lib/data/meaningAudioManifest.json");

// The Word Sync reciters (src/lib/data/quranReciters.ts, QDC_TIMING_RECITERS).
const RECITERS = ["sudais", "alafasy", "dosari", "abdulbaset", "minshawi", "hussary", "shuraim", "shatri", "tunaiji"];

const RATE = 16000;
const FRAME = 0.01; // s
const SMOOTH = 8; // frames (80 ms)
const BEFORE = 0.45; // s searched before the next ayah's timed start
const AFTER = 1.0; // …and after it
const DB_PER_S = 10; // farther from it counts as this much louder
const RISE_DB = 12; // above the valley floor = voice
const BEFORE_ONSET = 0.06; // s: stop this far ahead of the next ayah's voice

// ── args ───────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
function surahList() {
  if (args.surah) {
    const [a, b] = String(args.surah).split("-").map(Number);
    return range(a, Number.isFinite(b) ? b : a);
  }
  // Surahs with any meaning clip uploaded.
  const m = JSON.parse(readFileSync(MEANING_MANIFEST, "utf8"));
  return [...new Set(Object.values(m.surahs).flatMap((langs) => Object.values(langs).flat()))].sort((a, b) => a - b);
}
const surahs = surahList();
const reciters = args.reciter ? String(args.reciter).split(",") : RECITERS;

// ── audio ──────────────────────────────────────────────────────────────────
/** Mono 16 kHz samples of a URL (curl: it follows HTTPS_PROXY, ffmpeg doesn't). */
function decode(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn("curl", ["-sSfL", "--retry", "3", url]);
    const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", String(RATE), "-f", "s16le", "pipe:1"]);
    curl.stdout.pipe(ff.stdin);
    curl.on("error", reject);
    curl.on("close", (code) => code !== 0 && reject(new Error(`curl exited ${code} for ${url}`)));
    const chunks = [];
    let err = "";
    ff.stdout.on("data", (d) => chunks.push(d));
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg: ${err.trim()}`));
      const buf = Buffer.concat(chunks);
      resolve(new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1));
    });
  });
}

/** Energy (dB) per 10 ms frame, smoothed over 80 ms. */
function envelope(samples) {
  const n = Math.round(RATE * FRAME);
  const frames = Math.floor(samples.length / n);
  const power = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    for (let i = f * n; i < (f + 1) * n; i++) s += (samples[i] / 32768) ** 2;
    power[f] = s / n;
  }
  const db = new Float64Array(frames);
  const half = SMOOTH >> 1;
  for (let f = 0; f < frames; f++) {
    let s = 0;
    let c = 0;
    for (let k = Math.max(0, f - half); k < Math.min(frames, f + half); k++, c++) s += power[k];
    db[f] = 10 * Math.log10(s / c + 1e-12);
  }
  return db;
}

/** The stop between two ayahs: in the valley, after the voice, before the next. */
function stopBetween(db, nextStart) {
  const lo = Math.max(0, Math.floor((nextStart - BEFORE) / FRAME));
  const hi = Math.min(db.length - 1, Math.ceil((nextStart + AFTER) / FRAME));
  const score = (f) => db[f] + DB_PER_S * Math.abs(f * FRAME - nextStart);
  let v = lo;
  for (let f = lo; f <= hi; f++) if (score(f) < score(v)) v = f;
  let fade = v;
  while (fade > 0 && db[fade - 1] < db[v] + RISE_DB) fade--;
  let onset = v;
  while (onset < db.length - 1 && db[onset + 1] < db[v] + RISE_DB) onset++;
  const t = Math.max(fade * FRAME, Math.min(v * FRAME, onset * FRAME - BEFORE_ONSET));
  return Number(t.toFixed(2));
}

// ── run ────────────────────────────────────────────────────────────────────
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
for (const reciter of reciters) {
  for (const surah of surahs) {
    const file = path.join(TIMINGS, reciter, `${surah}.json`);
    if (!existsSync(file)) {
      console.warn(`  – ${reciter}/${surah}: no timings`);
      continue;
    }
    const t = JSON.parse(readFileSync(file, "utf8"));
    const verses = t.verseTimings;
    if (verses.length < 2) continue;
    try {
      const db = envelope(await decode(t.audioUrl));
      const stops = [];
      for (let k = 0; k < verses.length - 1; k++) {
        const nextStart = verses[k + 1].segments?.[0]?.startSec ?? verses[k + 1].timestampFromSec;
        stops.push(stopBetween(db, nextStart));
      }
      (out[reciter] ??= {})[surah] = stops;
      console.log(`  ✓ ${reciter}/${surah}: ${stops.join(" ")}`);
    } catch (e) {
      console.error(`  ❌ ${reciter}/${surah}: ${e.message}`);
    }
  }
}
const sorted = Object.fromEntries(Object.keys(out).sort().map((r) => [r, out[r]]));
await writeFile(OUT, JSON.stringify(sorted, null, 1).replace(/\[\n\s+([^\]]*?)\n\s+\]/g, (_, s) => `[${s.replace(/\s+/g, " ")}]`) + "\n");
console.log(`\n✅ Wrote ${path.relative(ROOT, OUT)}\n`);
