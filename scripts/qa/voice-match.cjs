#!/usr/bin/env node
// Acoustic voice-match: does each Word Sync reciter's timing dataset describe
// the recording the app actually streams? For every reciter × Surah the audio
// is streamed through ffmpeg (not stored) into a 20ms energy envelope, then
// every ayah boundary of the dataset is checked against the real pauses:
//   - a boundary sitting in a real pause (or within 0.4s of the voice onset
//     after the nearest pause) passes; anything else is a "bad boundary";
//   - the real audio length is compared with the dataset's.
// Envelopes are cached (Int8 dB per 20ms) in $QA_CACHE/env for repair-timings.
//
// Output: scripts/qa/results/voice-match.jsonl (one row per stream, resumable)
//         scripts/qa/results/voice-match.json  (summary + verdicts)
// Usage:  node scripts/qa/voice-match.cjs [--par=20] [--only=alafasy/78,...]
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.resolve(__dirname, "../..");
const CACHE = process.env.QA_CACHE || path.join(ROOT, ".qa-cache");
const ENV = path.join(CACHE, "env");
const RES = path.join(ROOT, "scripts/qa/results");
const JSONL = path.join(RES, "voice-match.jsonl");
fs.mkdirSync(ENV, { recursive: true });
fs.mkdirSync(RES, { recursive: true });
const FR = 0.02;
const SYNC = ["sudais", "alafasy", "dosari", "abdulbaset", "minshawi", "hussary", "shuraim", "shatri", "tunaiji"];
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const PAR = Number(arg("par") || 20);
const ONLY = arg("only")?.split(",") ?? null;

/** Length drift (s) that, without a clean alignment, marks another recording. */
const MAX_DRIFT_S = 2;

function streamEnvelope(url) {
  return new Promise((res) => {
    const p = spawn("ffmpeg", ["-v", "error", "-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5", "-i", url, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"]);
    const per = 8000 * FR, db = [];
    let carry = Buffer.alloc(0), err = "";
    p.stdout.on("data", (c) => {
      const b = Buffer.concat([carry, c]);
      const n = Math.floor(b.length / (per * 2));
      for (let f = 0; f < n; f++) {
        let s = 0;
        for (let i = 0; i < per; i++) { const v = b.readInt16LE((f * per + i) * 2) / 32768; s += v * v; }
        db.push(Math.max(-127, Math.min(0, Math.round(10 * Math.log10(s / per + 1e-10)))));
      }
      carry = b.subarray(n * per * 2);
    });
    p.stderr.on("data", (c) => (err += c));
    p.on("close", () => res({ db: Int8Array.from(db), err: err.slice(0, 300) }));
  });
}
/** Int8 envelope file → Int8Array (a small file's Buffer is a slice of a shared pool). */
function readInt8(f) {
  const b = fs.readFileSync(f);
  return new Int8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
function loadEnvelope(r, s) {
  const f = path.join(ENV, `${r}_${s}.i8`);
  return fs.existsSync(f) ? readInt8(f) : null;
}
const pct = (a, q) => { const s = Array.from(a).sort((x, y) => x - y); return s[Math.floor(q * (s.length - 1))]; };

/** Boundary check of one dataset against one envelope. */
function analyse(db, data) {
  const realDur = db.length * FR, voiced = pct(db, 0.6), floor = pct(db, 0.1);
  const win = (t0, t1) => { let m = Infinity; for (let i = Math.max(0, Math.floor(t0 / FR)); i < Math.min(db.length, Math.ceil(t1 / FR)); i++) m = Math.min(m, db[i]); return m; };
  const sm = (t) => { let a = 0, k = 0; for (let i = Math.floor((t - 0.1) / FR); i < Math.floor((t + 0.1) / FR); i++) if (i >= 0 && i < db.length) { a += db[i]; k++; } return k ? a / k : 0; };
  const vt = data.verseTimings, offs = [], bad = [];
  for (let i = 0; i + 1 < vt.length; i++) {
    const a = vt[i], b = vt[i + 1];
    const aEnd = a.segments?.length ? Math.max(...a.segments.map((x) => x.endSec)) : a.timestampToSec;
    const bStart = b.segments?.length ? b.segments[0].startSec : b.timestampFromSec;
    if (bStart > realDur) { bad.push({ ayah: b.ayahNumber, why: "past-audio-end", dataOnset: bStart }); continue; }
    let best = { t: bStart, e: Infinity };
    for (let t = bStart - 2.5; t <= bStart + 2.5; t += FR) { const e = sm(t); if (e < best.e) best = { t, e }; }
    const thr = (best.e + voiced) / 2;
    let on = best.t;
    for (let t = best.t; t < best.t + 3; t += FR) if (db[Math.floor(t / FR)] > thr) { on = t; break; }
    const gapE = win(Math.min(aEnd, bStart) - 0.1, Math.max(aEnd, bStart) + 0.1);
    const pauseAtData = gapE < floor + 0.5 * (voiced - floor);
    const off = on - bStart;
    offs.push(off);
    if (!pauseAtData && Math.abs(off) > 0.4) bad.push({ ayah: b.ayahNumber, dataOnset: +bStart.toFixed(2), realOnset: +on.toFixed(2), off: +off.toFixed(2) });
  }
  const abs = offs.map(Math.abs).sort((x, y) => x - y);
  const open = [];
  for (let t = 0; t < Math.min(15, realDur); t += 0.1) { const e = sm(t + 0.05); open.push(e < floor + 0.25 * (voiced - floor) ? 0 : e < floor + 0.5 * (voiced - floor) ? 1 : e < voiced ? 2 : 3); }
  return {
    realDur: +realDur.toFixed(2), dataDur: data.durationSeconds, lastTo: vt.at(-1).timestampToSec,
    boundaries: vt.length - 1, badCount: bad.length, bad,
    medianOff: offs.length ? +[...offs].sort((x, y) => x - y)[Math.floor(offs.length / 2)].toFixed(3) : null,
    p90Abs: abs.length ? +abs[Math.floor(abs.length * 0.9)].toFixed(2) : null, open: open.join(""),
  };
}
(async () => {
  const done = new Map();
  if (fs.existsSync(JSONL)) for (const l of fs.readFileSync(JSONL, "utf8").split("\n").filter(Boolean)) { const j = JSON.parse(l); done.set(`${j.r}/${j.s}`, j); }
  const jobs = [];
  for (const r of SYNC) for (let s = 1; s <= 114; s++) {
    const k = `${r}/${s}`;
    if (ONLY ? !ONLY.includes(k) : done.has(k)) continue;
    jobs.push({ r, s });
  }
  let i = 0;
  await Promise.all(Array.from({ length: PAR }, async () => {
    while (i < jobs.length) {
      const j = jobs[i++];
      const data = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/quran-timings", j.r, `${j.s}.json`), "utf8"));
      let db = loadEnvelope(j.r, j.s), err = "";
      if (!db) {
        let e = await streamEnvelope(data.audioUrl);
        if (e.db.length < 50) e = await streamEnvelope(data.audioUrl);
        db = e.db.length >= 50 ? e.db : null;
        err = e.err;
        if (db) fs.writeFileSync(path.join(ENV, `${j.r}_${j.s}.i8`), Buffer.from(db.buffer));
      }
      const row = db ? { r: j.r, s: j.s, url: data.audioUrl, ...analyse(db, data) } : { r: j.r, s: j.s, url: data.audioUrl, err: err || "no audio" };
      done.set(`${j.r}/${j.s}`, row);
      fs.appendFileSync(JSONL, JSON.stringify(row) + "\n");
      console.error(`${j.r}/${j.s} ${row.err || `bad ${row.badCount}/${row.boundaries} real ${row.realDur} data ${row.dataDur}`}`);
    }
  }));
  // Summary + verdicts over everything scanned so far, on the CURRENT
  // (repaired) timing data — the same verdict repair-timings.cjs uses.
  const A = require("./lib/acoustic.cjs");
  const rows = [...done.values()];
  const streams = rows.map((row) => {
    const E = A.loadEnvelope(ENV, row.r, row.s);
    if (!E) return { r: row.r, s: row.s, status: "no-audio", reason: row.err || "no envelope" };
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, "public/data/quran-timings", row.r, `${row.s}.json`), "utf8"));
    const v = A.streamVerdict(E, data, { maxDriftS: MAX_DRIFT_S });
    return { r: row.r, s: row.s, status: v.status, reason: v.reason, drift: v.drift, badBoundaries: v.badBoundaries, boundaries: v.boundaries, whole: v.whole };
  });
  const mismatched = streams.filter((x) => x.status === "mismatch" || x.status === "no-audio");
  const count = (st) => streams.filter((x) => x.status === st).length;
  const summary = {
    generated: new Date().toISOString(),
    rules: { maxDurationDriftSeconds: MAX_DRIFT_S, verdict: "scripts/qa/lib/acoustic.cjs streamVerdict" },
    scanned: rows.length, expected: SYNC.length * 114,
    match: count("match"), inconclusive: count("inconclusive"), mismatch: count("mismatch"), noAudio: count("no-audio"),
    boundaries: streams.reduce((a, r) => a + (r.boundaries || 0), 0),
    badBoundaries: streams.reduce((a, r) => a + (r.badBoundaries || 0), 0),
    streamsMismatched: mismatched.map((x) => `${x.r}/${x.s}: ${x.reason}`),
  };
  fs.writeFileSync(path.join(RES, "voice-match.json"), JSON.stringify({ summary, streams }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
})();
