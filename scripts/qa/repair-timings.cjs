#!/usr/bin/env node
// Evidence-based repair of the cached QDC word timings, using the recordings'
// energy envelopes from voice-match.cjs ($QA_CACHE/env). Every change is
// written into the timing file's `repairs` list (what, why, evidence), so it is
// auditable and never repeated.
//
//  1. 0-based word positions (one ayah) → 1-based.
//  2. Displaced ayah segments — the ayah's words sit seconds away from its own
//     window (e.g. Alafasy 60:12, 60:13, 6:93): re-placed by the one rigid shift
//     that puts their word boundaries on the recording's real energy dips,
//     inside the ayah's window. Accepted only when that fit is clearly better
//     than every other shift; otherwise left alone (the app then shows the ayah
//     without word highlight — never guessed words).
//  3. Preludes recited inside the reciter's own audio before ayah 1 (Dosari
//     2–78, and his Isti'adhah before 9:1): the Isti'adhah / Bismillah bounds
//     measured from the recording → `embeddedPrelude`.
//  4. Per-Surah verdict: a stream whose recording doesn't match its timings
//     (word boundaries line up with the recording's pauses only at a shift of
//     ±0.3s or more, or an inconclusive fit with > 2s length drift) is listed
//     in src/lib/data/wordSyncAvailability.ts and plays audio-only.
//
// Usage: node scripts/qa/repair-timings.cjs [--dry]
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const CACHE = process.env.QA_CACHE || path.join(ROOT, ".qa-cache");
const ENV = path.join(CACHE, "env");
const DRY = process.argv.includes("--dry");
const FR = 0.02;
const SYNC = ["sudais", "alafasy", "dosari", "abdulbaset", "minshawi", "hussary", "shuraim", "shatri", "tunaiji"];
const MAX_DRIFT_S = 2;

const glyphCount = {};
for (let s = 1; s <= 114; s++) for (const v of JSON.parse(fs.readFileSync(path.join(ROOT, `public/data/quran-glyphs/${s}.json`), "utf8"))) glyphCount[`${s}:${v.a}`] = v.w.length;

const A = require("./lib/acoustic.cjs");
function envelope(r, s) {
  const E = A.loadEnvelope(ENV, r, s);
  if (E) E.sm = (t, h = 0.1) => E.mean(t, h);
  return E;
}

/** Mean energy dip at word boundaries (more negative = boundaries on pauses). */
function dipScore(E, segs, shift) {
  let a = 0, n = 0;
  for (let k = 1; k < segs.length; k++) {
    const b = segs[k].startSec + shift;
    if (b < 0.2 || b > E.dur - 0.2) continue;
    a += E.sm(b, 0.04) - (E.sm(b - 0.18, 0.06) + E.sm(b + 0.18, 0.06)) / 2;
    n++;
  }
  return n ? a / n : 0;
}

const report = { zeroBased: [], shifted: [], shiftRejected: [], preludes: [], misaligned: [], unavailable: {}, verdicts: {}, streams: 0, missingEnvelopes: [] };

for (const r of SYNC) {
  for (let s = 1; s <= 114; s++) {
    const file = path.join(ROOT, "public/data/quran-timings", r, `${s}.json`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const repairs = data.repairs ?? [];
    const has = (kind, ayah) => repairs.some((x) => x.kind === kind && x.ayah === ayah);
    let changed = false;
    const vt = data.verseTimings;

    // 1. 0-based word positions.
    for (const v of vt) {
      const G = glyphCount[`${s}:${v.ayahNumber}`];
      const idx = (v.segments || []).map((x) => x.wordIndex);
      if (idx.length && Math.min(...idx) === 0 && Math.max(...idx) === G - 1 && !has("zero-based-index", v.ayahNumber)) {
        v.segments.forEach((x) => (x.wordIndex += 1));
        repairs.push({ kind: "zero-based-index", ayah: v.ayahNumber, detail: "word positions 0..n-1 → 1..n" });
        report.zeroBased.push(`${r}/${s}:${v.ayahNumber}`);
        changed = true;
      }
    }

    const E = envelope(r, s);
    if (!E) { report.missingEnvelopes.push(`${r}/${s}`); continue; }
    report.streams++;

    // 2. Displaced ayah segments.
    for (let i = 0; i < vt.length; i++) {
      const v = vt[i];
      const segs = v.segments || [];
      if (segs.length < 3 || has("displaced-shift", v.ayahNumber)) continue;
      const from = v.timestampFromSec, to = v.timestampToSec;
      const inside = segs.filter((x) => x.startSec >= from - 0.5 && x.startSec < to + 0.5).length / segs.length;
      if (inside >= 0.8) continue;
      const span = Math.max(...segs.map((x) => x.endSec)) - segs[0].startSec;
      const base = from - segs[0].startSec;
      const prev = vt[i - 1], next = vt[i + 1];
      const prevEnd = prev?.segments?.length ? Math.max(...prev.segments.map((x) => x.endSec)) : prev?.timestampToSec ?? 0;
      const nextStart = next?.segments?.length ? next.segments[0].startSec : next?.timestampFromSec ?? E.dur;
      const scores = [];
      for (let d = base - 1.5; d <= base + 1.5; d += FR) {
        const st = segs[0].startSec + d, en = st + span;
        if (st < prevEnd - 0.3 || en > Math.min(nextStart, to + 1) + 0.3) continue;
        scores.push({ d, score: dipScore(E, segs, d) });
      }
      if (scores.length < 10) { report.shiftRejected.push(`${r}/${s}:${v.ayahNumber} (no room in window)`); continue; }
      scores.sort((a, b) => a.score - b.score);
      const best = scores[0];
      const rest = scores.filter((x) => Math.abs(x.d - best.d) > 0.3).map((x) => x.score);
      const mean = rest.reduce((a, b) => a + b, 0) / Math.max(1, rest.length);
      const sd = Math.sqrt(rest.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, rest.length));
      const z = sd > 0 ? (best.score - mean) / sd : 0;
      if (!(z < -2.5 && best.score < -1)) {
        report.shiftRejected.push(`${r}/${s}:${v.ayahNumber} (no clear acoustic fit: z=${z.toFixed(2)})`);
        continue;
      }
      const d = +best.d.toFixed(3);
      for (const x of segs) { x.startSec = +(x.startSec + d).toFixed(3); x.endSec = +(x.endSec + d).toFixed(3); }
      repairs.push({ kind: "displaced-shift", ayah: v.ayahNumber, shiftSec: d, evidence: { boundaryDipDb: +best.score.toFixed(2), zVsOtherShifts: +z.toFixed(2) } });
      report.shifted.push(`${r}/${s}:${v.ayahNumber} ${d > 0 ? "+" : ""}${d}s (z ${z.toFixed(1)})`);
      changed = true;
    }

    // 3. Preludes inside the reciter's own audio (Dosari 2–78 and 9).
    if (r === "dosari" && (s === 9 || (s >= 2 && s <= 78)) && !repairs.some((x) => x.kind === "embedded-prelude")) {
      const onset = vt[0].segments?.[0]?.startSec ?? vt[0].timestampFromSec;
      const thr = E.floor + 0.35 * (E.voiced - E.floor);
      // Voiced runs before ayah 1, pauses shorter than 0.25s merged.
      const runs = [];
      let cur = null;
      for (let t = 0; t < onset - 0.1; t += FR) {
        const v = E.sm(t, 0.04) > thr;
        if (v) { if (cur && t - cur.end <= 0.25) cur.end = t; else { cur = { start: t, end: t }; runs.push(cur); } }
      }
      const voicedRuns = runs.filter((x) => x.end - x.start > 0.3);
      let pre = null;
      if (voicedRuns.length) {
        const vStart = +Math.max(0, voicedRuns[0].start - 0.05).toFixed(2);
        const span = onset - vStart;
        // Isti'adhah + Bismillah together run ~6–8s; the Bismillah alone ~3–4s.
        if (s !== 9 && span > 5.2 && voicedRuns.length >= 2) {
          let split = null;
          for (let k = 0; k + 1 < voicedRuns.length; k++) {
            const gap = voicedRuns[k + 1].start - voicedRuns[k].end;
            const mid = (voicedRuns[k].end + voicedRuns[k + 1].start) / 2;
            if (mid > vStart + span * 0.25 && mid < vStart + span * 0.75 && (!split || gap > split.gap)) split = { gap, mid };
          }
          if (split) pre = [
            { type: "istiadhah", startTime: vStart, endTime: +split.mid.toFixed(2) },
            { type: "bismillah", startTime: +split.mid.toFixed(2), endTime: +onset.toFixed(2) },
          ];
        } else if (span > 1.5) {
          pre = [{ type: s === 9 ? "istiadhah" : "bismillah", startTime: vStart, endTime: +onset.toFixed(2) }];
        }
      }
      if (pre) {
        data.embeddedPrelude = pre;
        repairs.push({ kind: "embedded-prelude", ayah: 0, detail: pre.map((p) => `${p.type} ${p.startTime}–${p.endTime}s`).join(", "), evidence: { ayah1VoiceOnset: onset } });
        report.preludes.push(`${r}/${s}: ${pre.map((p) => `${p.type} ${p.startTime}–${p.endTime}`).join(" + ")}`);
        changed = true;
      } else {
        report.preludes.push(`${r}/${s}: none found before ayah 1 (onset ${onset}s)`);
      }
    }

    // 4. Stream verdict on the (repaired) data: do its word boundaries line up
    //    with this recording's pauses (see lib/acoustic.cjs streamVerdict)?
    const verdict = A.streamVerdict(E, data, { maxDriftS: MAX_DRIFT_S });
    report.verdicts[`${r}/${s}`] = { status: verdict.status, drift: verdict.drift, badBoundaries: verdict.badBoundaries, boundaries: verdict.boundaries, whole: verdict.whole, thirds: verdict.thirds };
    if (verdict.status === "mismatch") (report.unavailable[r] ??= {})[s] = verdict.reason;
    else {
      // 5. Misaligned stretches inside an otherwise matching stream: those
      //    ayahs keep their text but lose word highlight (`misaligned`).
      const mis = A.misalignedAyahs(E, data);
      // A Surah misaligned in more than a fifth of its ayahs is a different
      // recording (e.g. Alafasy 37 drifting −0.3s → −1.5s): audio-only.
      if (mis.length > vt.length * 0.2) {
        (report.unavailable[r] ??= {})[s] = `${mis.length} of ${vt.length} ayahs' word boundaries are off the streamed recording (drifting recording)`;
        report.verdicts[`${r}/${s}`].status = "mismatch";
        mis.length = 0;
      }
      for (const m of mis) {
        const v = vt.find((x) => x.ayahNumber === m.ayah);
        if (!v || v.misaligned) continue;
        v.misaligned = `word boundaries line up with the recording only at ${m.bestShift > 0 ? "+" : ""}${m.bestShift}s`;
        repairs.push({ kind: "misaligned", ayah: m.ayah, evidence: { bestShift: m.bestShift, zBest: m.zBest, z0: m.z0, n: m.n } });
        report.misaligned.push(`${r}/${s}:${m.ayah} (${m.bestShift}s)`);
        changed = true;
      }
    }

    if (changed && !DRY) {
      data.repairs = repairs;
      fs.writeFileSync(file, JSON.stringify(data));
    }
  }
}

const ts = `/**
 * GENERATED by scripts/qa/repair-timings.cjs — do not edit by hand.
 * Word Sync reciter × Surah pairs whose STREAMED recording doesn't match the
 * recording their Quran.com word timings were measured on (checked acoustically
 * against the real audio). These Surahs play audio-only for that reciter:
 * highlighting from mismatched timings would show the wrong words.
 */
export const WORD_SYNC_UNAVAILABLE: Record<string, Record<number, string>> = ${JSON.stringify(report.unavailable, null, 2)};
`;
if (!DRY) fs.writeFileSync(path.join(ROOT, "src/lib/data/wordSyncAvailability.ts"), ts);
fs.mkdirSync(path.join(ROOT, "scripts/qa/results"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "scripts/qa/results/repairs.json"), JSON.stringify({ generated: new Date().toISOString(), dry: DRY, ...report }, null, 1));
console.log(JSON.stringify({
  streamsWithEnvelope: report.streams, missingEnvelopes: report.missingEnvelopes.length,
  zeroBased: report.zeroBased, shifted: report.shifted.length, shiftRejected: report.shiftRejected.length,
  verdicts: Object.values(report.verdicts).reduce((a, v) => ((a[v.status] = (a[v.status] || 0) + 1), a), {}),
  preludes: report.preludes.length, misaligned: report.misaligned.length, unavailable: Object.fromEntries(Object.entries(report.unavailable).map(([k, v]) => [k, Object.keys(v).map(Number)])),
}, null, 1));
