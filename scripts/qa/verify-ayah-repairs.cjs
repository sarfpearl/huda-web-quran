#!/usr/bin/env node
// Independent check of the ayahs re-measured by align-ayah-timings.py: do their
// new word boundaries sit on the recording's own pauses (energy envelope from
// voice-match.cjs, $QA_CACHE/env), i.e. does the dip contrast peak at shift ≈0?
// Each run of consecutive re-measured ayahs is judged on its own boundaries
// (the neighbours' Quran.com timings may carry their own offset): S(d) = mean
// dip at boundary+d for |d| ≤ 1.5s, standardised. "off" = the boundaries
// clearly line up only ≥ 0.3s away; "ok" = the dip is extreme at d ≈ 0.
// The dip mean is noisy for a few boundaries or connected recitation (one
// stray dip moves it), so each run also gets the pause test: every real pause
// inside it (≥ 0.25s quiet) must be followed, within 0.35s of the voice coming
// back, by a word start. Most decisive is the ayah-onset test: an ayah's first
// word must start where the voice returns after the pause before it (≤ 0.3s);
// it is measured for the new and the old (Quran.com) first word alike.
// Verdict: the onset test when the ayah has a pause before it (else, recited
// straight on, the pause test with ≥ 2 pauses, else the dip test).
//
// Usage: node scripts/qa/verify-ayah-repairs.cjs
const fs = require("fs");
const path = require("path");
const A = require("./lib/acoustic.cjs");
const ROOT = path.resolve(__dirname, "../..");
const ENV = path.join(process.env.QA_CACHE || path.join(ROOT, ".qa-cache"), "env");

/** lib/acoustic.cjs alignment() for a handful of boundaries (≥ 3), ±1.5s. */
function align(E, B) {
  B = B.filter((x) => x > 0.3 && x < E.dur - 0.3);
  if (B.length < 3) return null;
  const S = [];
  for (let d = -1.5; d <= 1.5 + 1e-9; d += A.FR) S.push({ d, v: B.reduce((p, x) => p + A.dip(E, x + d), 0) / B.length });
  const mu = S.reduce((p, q) => p + q.v, 0) / S.length;
  const sd = Math.sqrt(S.reduce((p, q) => p + (q.v - mu) ** 2, 0) / S.length) || 1;
  const Z = S.map((x) => ({ d: x.d, z: (x.v - mu) / sd }));
  const best = Z.reduce((m, x) => (Math.abs(x.z) > Math.abs(m.z) ? x : m));
  const z0 = Z.filter((x) => Math.abs(x.d) <= 0.12).reduce((m, x) => (Math.abs(x.z) > Math.abs(m.z) ? x : m));
  return { bestShift: +best.d.toFixed(2), zBest: +best.z.toFixed(2), z0: +z0.z.toFixed(2), n: B.length };
}

/** Voice onsets after the pauses (≥ 0.25s quiet) inside [from, to]: share with a word start ≤ 0.35s away. */
function pauses(E, from, to, starts) {
  const thr = E.floor + 0.35 * (E.voiced - E.floor);
  const on = [];
  let q = 0;
  for (let t = from + 0.1; t < to - 0.1; t += A.FR) {
    if (E.mean(t, 0.02) < thr) q += A.FR;
    else { if (q >= 0.25) on.push(t); q = 0; }
  }
  const hit = on.filter((t) => starts.some((x) => Math.abs(x - t) <= 0.35)).length;
  return { pauses: on.length, pauseHits: hit };
}

/** Voice onset after the quiet run (≥ 0.2s) nearest to t (±1.5s): t − onset, or null. */
function onsetOffset(E, t) {
  const thr = E.floor + 0.35 * (E.voiced - E.floor);
  let best = null, q = 0;
  for (let x = t - 1.5; x < t + 1.5; x += A.FR) {
    if (E.mean(x, 0.02) < thr) q += A.FR;
    else { if (q >= 0.2 && (best === null || Math.abs(t - x) < Math.abs(best))) best = t - x; q = 0; }
  }
  return best === null ? null : +best.toFixed(2);
}

const rows = [];
const dir = path.join(ROOT, "public/data/quran-timings");
for (const r of fs.readdirSync(dir)) {
  if (!fs.statSync(path.join(dir, r)).isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(dir, r))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, r, f), "utf8"));
    const fixed = (data.repairs || []).filter((x) => x.kind === "forced-alignment-ayah");
    if (!fixed.length) continue;
    const s = parseInt(f, 10);
    const E = A.loadEnvelope(ENV, r, s);
    const vt = data.verseTimings;
    const nums = new Set(fixed.map((x) => x.ayah));
    const runs = [];
    for (const a of [...nums].sort((x, y) => x - y)) {
      if (runs.length && runs.at(-1).at(-1) === a - 1) runs.at(-1).push(a);
      else runs.push([a]);
    }
    for (const run of runs) {
      const B = vt.filter((v) => run.includes(v.ayahNumber)).flatMap((v) => (v.segments || []).slice(1).map((x) => x.startSec));
      const al = E ? align(E, B) : null;
      const vs = vt.filter((v) => run.includes(v.ayahNumber));
      const starts = vs.flatMap((v) => v.segments.map((x) => x.startSec));
      const pz = E ? pauses(E, vs[0].segments[0].startSec, Math.max(...vs.at(-1).segments.map((x) => x.endSec)), starts) : { pauses: 0, pauseHits: 0 };
      const off = al && Math.abs(al.z0) < 1.5 && Math.abs(al.zBest) >= 3.5 && Math.abs(al.bestShift) >= 0.3;
      const dipVerdict = !E ? "no-envelope" : !al ? "too-few" : off ? "off" : Math.abs(al.z0) >= 2 ? "ok" : "unclear";
      const pauseVerdict = pz.pauses >= 2 ? (pz.pauseHits / pz.pauses >= 0.75 ? "ok" : "off") : dipVerdict;
      for (const a of run) {
        const v = vt.find((x) => x.ayahNumber === a);
        const fx = fixed.find((x) => x.ayah === a);
        const onset = E ? onsetOffset(E, v.segments[0].startSec) : null;
        const oldOnset = E && fx.evidence.oldSpanSec ? onsetOffset(E, fx.evidence.oldSpanSec[0]) : null;
        const verdict = onset !== null ? (Math.abs(onset) <= 0.3 ? "ok" : "off") : pauseVerdict;
        rows.push({ r, s, a, match: fx.evidence.transcriptMatch, run: run.length, onset, oldOnset, ...(al || { n: B.length }), ...pz, dipVerdict, pauseVerdict, verdict });
      }
    }
  }
}
const out = path.join(ROOT, "scripts/qa/results/ayah-repairs-verify.json");
fs.writeFileSync(out, JSON.stringify(rows, null, 1));
const by = rows.reduce((m, x) => ((m[x.verdict] = (m[x.verdict] || 0) + 1), m), {});
console.log(JSON.stringify({ ayahs: rows.length, ...by, off: rows.filter((x) => x.verdict === "off").map((x) => `${x.r}/${x.s}:${x.a} (onset ${x.onset}s, pauses ${x.pauseHits}/${x.pauses}, dip best ${x.bestShift}s)`) }, null, 1));
