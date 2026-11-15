#!/usr/bin/env node
// Moves an ayah's word segments onto the voice when they all lead it by the
// same amount. Input: scripts/qa/results/word-lead/<reciter>.jsonl from
// word-lead.py (per word: CTC-measured onset − startSec). Quran.com's starts
// sit ~0.08s before the onset by convention, so an ayah whose words read
// lead ≈ L is shifted by L − 0.08, rigidly (every word the same), only when
//  - at least 60% of its words (and 2) were measured,
//  - they agree (median absolute deviation ≤ 0.1s: one rigid offset, not a
//    different recitation),
//  - and the shift is ≥ 0.15s (smaller = inside the convention's spread).
// Ayahs the app already shows without word highlight (`noWordTiming`) and
// ayahs with an earlier repair are left alone. A shifted last word is clipped
// so it never runs into the next ayah's first word. Each change is written to
// the file's `repairs` list with its evidence.
//
// Usage: node scripts/qa/fix-word-lead.cjs alafasy [--dry]
const fs = require("fs");
const path = require("path");
const { V } = require("./lib/load.cjs");

const ROOT = path.resolve(__dirname, "../..");
const reciter = process.argv[2];
const DRY = process.argv.includes("--dry");
const CONVENTION = 0.08;
const MIN_SHIFT = 0.15;
const MAX_MAD = 0.1;
const MIN_MEASURED = 0.6;

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const r3 = (x) => Math.round(x * 1000) / 1000;

(async () => {
  const rows = fs.readFileSync(path.join(ROOT, "scripts/qa/results/word-lead", `${reciter}.jsonl`), "utf8")
    .split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const report = { shifted: [], skippedNoTiming: [], skippedRepaired: [], skippedSpread: [], lagging: [] };
  for (const row of rows) {
    if (!row.ayahs) continue;
    const s = row.surah;
    const file = path.join(ROOT, "public/data/quran-timings", reciter, `${s}.json`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const repairs = data.repairs ?? [];
    if (repairs.some((x) => x.kind === "forced-alignment")) continue; // our own measured timings
    const noTiming = new Set((await V.fetchSurahVerses(s, reciter)).filter((v) => v.noWordTiming).map((v) => v.ayahNumber));
    const vt = data.verseTimings;
    let changed = false;
    for (const a of row.ayahs) {
      const got = a.lead.filter((x) => x !== null);
      if (got.length < Math.max(2, MIN_MEASURED * a.lead.length) && !(a.lead.length === 1 && got.length === 1)) continue;
      const L = median(got);
      const mad = median(got.map((x) => Math.abs(x - L)));
      const shift = L - CONVENTION;
      const key = `${s}:${a.a}`;
      if (shift <= -MIN_SHIFT && mad <= MAX_MAD) report.lagging.push(`${key} ${r3(shift)}s`);
      if (shift < MIN_SHIFT) continue;
      if (noTiming.has(a.a)) { report.skippedNoTiming.push(`${key} +${r3(shift)}s`); continue; }
      if (repairs.some((x) => x.ayah === a.a && x.kind !== "zero-based-index")) { report.skippedRepaired.push(key); continue; }
      if (mad > MAX_MAD) { report.skippedSpread.push(`${key} lead ${r3(L)} mad ${r3(mad)}`); continue; }
      const i = vt.findIndex((v) => v.ayahNumber === a.a);
      const v = vt[i];
      const nextStart = Math.min(...(vt[i + 1]?.segments ?? []).map((x) => x.startSec), Infinity);
      for (const seg of v.segments) {
        seg.startSec = r3(seg.startSec + shift);
        seg.endSec = r3(Math.min(seg.endSec + shift, nextStart));
      }
      repairs.push({
        kind: "lead-shift", ayah: a.a,
        detail: `word segments led the voice by ${r3(shift)}s (rigid): moved onto the recording`,
        evidence: { method: "CTC forced alignment (scripts/qa/word-lead.py)", medianLeadSec: r3(L), madSec: r3(mad), wordsMeasured: got.length, words: a.lead.length, shiftSec: r3(shift) },
      });
      report.shifted.push({ key, shift: r3(shift), mad: r3(mad), n: got.length });
      changed = true;
    }
    if (changed && !DRY) {
      data.repairs = repairs;
      fs.writeFileSync(file, JSON.stringify(data));
    }
  }
  const sh = report.shifted.map((x) => x.shift).sort((a, b) => a - b);
  console.log(`${reciter}: shifted ${sh.length} ayahs (median ${sh.length ? median(sh) : 0}s, max ${sh.at(-1) ?? 0}s); ` +
    `left: ${report.skippedNoTiming.length} no-highlight, ${report.skippedRepaired.length} repaired, ${report.skippedSpread.length} inconsistent; ` +
    `${report.lagging.length} lag ≥ ${MIN_SHIFT}s (not touched)`);
  fs.writeFileSync(path.join(ROOT, "scripts/qa/results/word-lead", `${reciter}-fix.json`), JSON.stringify(report, null, 1));
})();
