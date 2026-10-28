#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────
//  Meaning stops QA: is each stop in meaningStops.json really in the pause
//  between two ayahs, on the recording the app streams?
//
//  For every stop (reciter × Surah × ayah boundary), on the 10 ms energy
//  envelope (80 ms smoothing, like build-meaning-stops.mjs):
//    quiet   the stop's level is at least QUIET_DB below the recitation's
//            speech level (its 90th percentile): a stop inside a word cuts it
//    floor   the stop lies within RISE_DB of the quietest point ±0.3 s around
//            it: the voice of either ayah is not already sounding there
//  Flagged stops are listed; nothing is written.
//
//    node scripts/qa/meaning-stops-qa.mjs --surah=67-114 [--reciter=sudais]
// ─────────────────────────────────────────────────────────────────────────

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const STOPS = JSON.parse(readFileSync(path.join(ROOT, "src/lib/data/meaningStops.json"), "utf8"));
const TIMINGS = path.join(ROOT, "public/data/quran-timings");
const RATE = 16000;
const FRAME = 0.01;
const SMOOTH = 8;
const QUIET_DB = 15;
const RISE_DB = 12;
const AROUND = 0.3;

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const [a, b] = String(args.surah ?? "1-114").split("-").map(Number);
const surahs = Array.from({ length: (Number.isFinite(b) ? b : a) - a + 1 }, (_, i) => a + i);
const reciters = args.reciter ? args.reciter.split(",") : Object.keys(STOPS);

function decode(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn("curl", ["-sSfL", "--retry", "3", url]);
    const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-ac", "1", "-ar", String(RATE), "-f", "s16le", "pipe:1"]);
    curl.stdout.pipe(ff.stdin);
    curl.on("close", (code) => code !== 0 && reject(new Error(`curl exited ${code} for ${url}`)));
    const chunks = [];
    ff.stdout.on("data", (d) => chunks.push(d));
    ff.on("close", (code) => {
      if (code !== 0) return reject(new Error("ffmpeg failed"));
      const buf = Buffer.concat(chunks);
      resolve(new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1));
    });
  });
}

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

let checked = 0;
const flags = [];
for (const reciter of reciters) {
  for (const surah of surahs) {
    const stops = STOPS[reciter]?.[surah];
    if (!stops) continue;
    let t;
    try {
      t = JSON.parse(readFileSync(path.join(TIMINGS, reciter, `${surah}.json`), "utf8"));
    } catch {
      continue;
    }
    let db;
    try {
      db = envelope(await decode(t.audioUrl));
    } catch (e) {
      flags.push(`${reciter}/${surah}: not checked (${e.message})`);
      continue;
    }
    const speech = [...db].sort((x, y) => x - y)[Math.floor(db.length * 0.9)];
    stops.forEach((stop, k) => {
      checked++;
      const f = Math.min(db.length - 1, Math.round(stop / FRAME));
      const lo = Math.max(0, f - AROUND / FRAME);
      const hi = Math.min(db.length - 1, f + AROUND / FRAME);
      let floor = Infinity;
      for (let i = lo; i <= hi; i++) floor = Math.min(floor, db[i]);
      const why = [];
      if (speech - db[f] < QUIET_DB) why.push(`only ${(speech - db[f]).toFixed(0)} dB below speech`);
      // (Deep in a silence the level still falls a lot: not a voice.)
      if (db[f] - floor > RISE_DB && speech - db[f] < 2 * QUIET_DB) why.push(`${(db[f] - floor).toFixed(0)} dB above the pause`);
      if (why.length) flags.push(`${reciter}/${surah}: after ayah ${k + 1} at ${stop}s — ${why.join(", ")}`);
    });
    process.stdout.write(`  ${reciter}/${surah} ✓\r`);
  }
}
console.log(`\n${checked} stops checked, ${flags.length} flagged`);
for (const l of flags) console.log(`  ⚠️  ${l}`);
