#!/usr/bin/env node
// Juz per-ayah clips (everyayah.com) vs the reciter's QDC ayah voice window.
// A Juz highlights words by mapping clip time onto the QDC word segments, which
// is only right when the clip is the same recording cut at the same ayah
// bounds (length ≈ the QDC window). This measures that for a random sample of
// ayahs per Word Sync reciter (plus known outliers) and reports which clips the
// app will (and won't) word-sync under JUZ_CLIP_TOLERANCE.
//
// Usage: node scripts/qa/juz-clips.cjs [perReciter=120]
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { V, R, Q, ROOT } = require("./lib/load.cjs");

const N = Number(process.argv[2] || 120);
const probe = (url) =>
  new Promise((res) => execFile("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", url], { timeout: 60000 }, (e, o) => res(e ? null : Number(String(o).trim()) || null)));
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

(async () => {
  const all = [];
  for (let j = 1; j <= 30; j++) all.push(...Q.getJuzAyahPairs(j));
  const known = [[78, 40], [36, 1], [36, 5], [2, 255], [112, 1], [67, 1], [1, 1]];
  const jobs = [];
  for (const rec of R.QURAN_RECITERS.filter((r) => R.reciterHasWordTiming(r) && R.getEveryAyahFolder(r.id))) {
    const pick = new Set(known.map(([s, a]) => `${s}:${a}`));
    while (pick.size < N + known.length) { const [s, a] = all[Math.floor(rand() * all.length)]; pick.add(`${s}:${a}`); }
    for (const k of pick) { const [s, a] = k.split(":").map(Number); jobs.push({ r: rec.id, s, a }); }
  }
  const verses = {};
  for (const j of jobs) verses[`${j.r}/${j.s}`] ??= await V.fetchSurahVerses(j.s, j.r);
  const rows = await pool(jobs, 12, async (j) => {
    const v = verses[`${j.r}/${j.s}`].find((x) => x.ayahNumber === j.a);
    const win = V.ayahClipWindow(v);
    const url = `https://everyayah.com/data/${R.getEveryAyahFolder(j.r)}/${String(j.s).padStart(3, "0")}${String(j.a).padStart(3, "0")}.mp3`;
    const clip = await probe(url);
    const qdc = win ? win.end - win.start : null;
    const ratio = clip && qdc ? +(clip / qdc).toFixed(3) : null;
    const synced = win && clip ? V.getAyahClipWordSync(v, 0.01, clip).hasWordTiming : false;
    return { ...j, clip, qdc: qdc && +qdc.toFixed(2), ratio, synced, noWordTiming: v?.noWordTiming ?? null };
  });
  const summary = {};
  for (const r of [...new Set(rows.map((x) => x.r))]) {
    const x = rows.filter((y) => y.r === r && y.ratio !== null);
    const d = x.map((y) => Math.abs(y.ratio - 1)).sort((a, b) => a - b);
    summary[r] = {
      sampled: rows.filter((y) => y.r === r).length, measured: x.length,
      within5pct: x.filter((y) => Math.abs(y.ratio - 1) <= 0.05).length,
      within10pct: x.filter((y) => Math.abs(y.ratio - 1) <= 0.1).length,
      within20pct: x.filter((y) => Math.abs(y.ratio - 1) <= V.JUZ_CLIP_TOLERANCE).length,
      p95Deviation: d.length ? +d[Math.floor(d.length * 0.95)].toFixed(3) : null,
      rejected: x.filter((y) => !y.synced).map((y) => `${y.s}:${y.a} clip ${y.clip?.toFixed(2)}s vs ${y.qdc}s`),
    };
  }
  const out = path.join(ROOT, "scripts/qa/results/juz-clips.json");
  fs.writeFileSync(out, JSON.stringify({ generated: new Date().toISOString(), tolerance: V.JUZ_CLIP_TOLERANCE, summary, rows }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
})();
