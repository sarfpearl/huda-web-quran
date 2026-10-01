// Shared acoustic helpers for the QA scripts: 20ms energy envelopes (Int8 dB)
// and the timing ↔ recording alignment test.
const fs = require("fs");
const path = require("path");

const FR = 0.02;

/** Int8 envelope file → Int8Array (a small file's Buffer is a slice of a shared pool). */
function readInt8(f) {
  const b = fs.readFileSync(f);
  return new Int8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}

/** Envelope with prefix sums for fast window means, or null when not cached. */
function loadEnvelope(envDir, r, s) {
  const f = path.join(envDir, `${r}_${s}.i8`);
  if (!fs.existsSync(f)) return null;
  const db = readInt8(f);
  const sorted = Array.from(db).sort((a, b) => a - b);
  const P = new Float64Array(db.length + 1);
  for (let i = 0; i < db.length; i++) P[i + 1] = P[i] + db[i];
  const mean = (t, h) => {
    const a = Math.max(0, Math.floor((t - h) / FR));
    const b = Math.min(db.length, Math.ceil((t + h) / FR));
    return b > a ? (P[b] - P[a]) / (b - a) : 0;
  };
  return {
    db, dur: db.length * FR, mean,
    floor: sorted[Math.floor(sorted.length * 0.1)],
    voiced: sorted[Math.floor(sorted.length * 0.6)],
    at: (t) => db[Math.max(0, Math.min(db.length - 1, Math.floor(t / FR)))],
  };
}

/** Energy dip at a boundary: the 80ms around it vs 180ms either side (dB, <0 = dip). */
const dip = (E, t) => E.mean(t, 0.04) - (E.mean(t - 0.18, 0.06) + E.mean(t + 0.18, 0.06)) / 2;

/**
 * Timing ↔ recording alignment. Word boundaries of a recitation are special
 * points of its energy envelope — usually dips, but in reverberant recordings
 * (the Haram) sometimes consistent peaks. If the timings describe THIS
 * recording, the mean envelope contrast at the boundaries is extreme at shift
 * ≈0 and unremarkable elsewhere within ±range. S(d) = mean dip at B+d;
 * z(d) = standardised S(d). Returns z near 0 (|d| ≤ 0.12s: segment starts sit
 * a few frames before the onset) and the most extreme shift overall.
 */
function alignment(E, boundaries, range = 3) {
  const B = boundaries.filter((x) => x > 0.3 && x < E.dur - 0.3);
  if (B.length < 8) return null;
  const S = [];
  for (let d = -range; d <= range + 1e-9; d += FR) {
    let a = 0, n = 0;
    for (const x of B) { const t = x + d; if (t < 0.3 || t > E.dur - 0.3) continue; a += dip(E, t); n++; }
    S.push({ d, v: n ? a / n : 0 });
  }
  const mu = S.reduce((p, q) => p + q.v, 0) / S.length;
  const sd = Math.sqrt(S.reduce((p, q) => p + (q.v - mu) ** 2, 0) / S.length) || 1;
  const Z = S.map((x) => ({ d: x.d, z: (x.v - mu) / sd }));
  const best = Z.reduce((m, x) => (Math.abs(x.z) > Math.abs(m.z) ? x : m));
  const zNear0 = Z.filter((x) => Math.abs(x.d) <= 0.12).reduce((m, x) => (Math.abs(x.z) > Math.abs(m.z) ? x : m));
  return { bestShift: +best.d.toFixed(2), zBest: +best.z.toFixed(2), z0: +zNear0.z.toFixed(2), n: B.length };
}

/** "match" | "mismatch" | "inconclusive" for one alignment result. */
function judge(al, minN, zMismatch = 3.5) {
  if (!al || al.n < minN) return "inconclusive";
  if (Math.abs(al.z0) >= 2) return "match";
  if (Math.abs(al.z0) < 1.5 && Math.abs(al.zBest) >= zMismatch && Math.abs(al.bestShift) > 0.3) return "mismatch";
  return "inconclusive";
}

/**
 * Ayah-boundary test: does each dataset boundary (last word end → next ayah's
 * first word) sit in one of the recording's pauses, or within 0.4s of the
 * voice onset after the nearest pause? Returns the boundaries that don't.
 */
function badBoundaries(E, data) {
  const vt = data.verseTimings, bad = [];
  for (let i = 0; i + 1 < vt.length; i++) {
    const a = vt[i], b = vt[i + 1];
    const aEnd = a.segments?.length ? Math.max(...a.segments.map((x) => x.endSec)) : a.timestampToSec;
    const bStart = b.segments?.length ? b.segments[0].startSec : b.timestampFromSec;
    if (bStart > E.dur) { bad.push({ ayah: b.ayahNumber, off: null }); continue; }
    let best = { t: bStart, e: Infinity };
    for (let t = bStart - 2.5; t <= bStart + 2.5; t += FR) { const e = E.mean(t, 0.1); if (e < best.e) best = { t, e }; }
    const thr = (best.e + E.voiced) / 2;
    let on = best.t;
    for (let t = best.t; t < best.t + 3; t += FR) if (E.at(t) > thr) { on = t; break; }
    let gap = Infinity;
    for (let t = Math.min(aEnd, bStart) - 0.1; t <= Math.max(aEnd, bStart) + 0.1; t += FR) gap = Math.min(gap, E.at(t));
    if (!(gap < E.floor + 0.5 * (E.voiced - E.floor)) && Math.abs(on - bStart) > 0.4) bad.push({ ayah: b.ayahNumber, off: +(on - bStart).toFixed(2) });
  }
  return { bad, total: Math.max(0, vt.length - 1) };
}

/**
 * Verdict for one stream. MATCH when the file's word boundaries align with the
 * recording at shift ≈0; MISMATCH when they clearly align only elsewhere (an
 * offset or different recording), or — with no clear alignment — the length
 * differs by more than maxDriftS or over a quarter of its ayah boundaries miss
 * the recording's pauses; INCONCLUSIVE when too few boundaries / too
 * little contrast to tell (then the timings stay in use). Long files are also
 * judged per third, catching recordings that drift part-way.
 */
function streamVerdict(E, data, { maxDriftS = 2 } = {}) {
  const bounds = [];
  for (const v of data.verseTimings) for (const s of v.segments || []) bounds.push(s.startSec);
  const whole = alignment(E, bounds);
  const thirds = [];
  if (bounds.length >= 180) {
    for (let k = 0; k < 3; k++) {
      const a = (E.dur * k) / 3, b = (E.dur * (k + 1)) / 3;
      thirds.push(alignment(E, bounds.filter((x) => x >= a && x < b)));
    }
  }
  const drift = +(E.dur - data.durationSeconds).toFixed(2);
  const wj = judge(whole, 30);
  const tj = thirds.map((t) => judge(t, 60));
  // A clear whole-file alignment wins (local trouble is left to the per-ayah
  // check); otherwise the whole file, or at least two of its thirds, must
  // align clearly elsewhere. One noisy third (flat envelopes, e.g. Abdul
  // Basit's long vowels) is not evidence of another recording.
  const thirdsOff = tj.filter((x) => x === "mismatch").length;
  let status = wj === "match" ? "match" : wj === "mismatch" || thirdsOff >= 2 ? "mismatch" : "inconclusive";
  let reason = null;
  if (status === "mismatch") {
    const off = [whole, ...thirds].filter((x, i) => (i === 0 ? wj : tj[i - 1]) === "mismatch").map((x) => `${x.bestShift > 0 ? "+" : ""}${x.bestShift}s`);
    reason = `the streamed recording doesn't match its word timings (their word boundaries line up with it only at ${off.join(" / ")})`;
  }
  // No clear alignment and many ayah boundaries off the pauses: a recording
  // drifting against its timings (e.g. Alafasy 37: −0.4s → −2s over the Surah).
  const bb = badBoundaries(E, data);
  if (status === "inconclusive" && bb.total >= 10 && bb.bad.length / bb.total > 0.25) {
    status = "mismatch";
    reason = `${bb.bad.length} of ${bb.total} ayah boundaries miss the streamed recording's pauses (drifting recording)`;
  }
  // A length drift is only harmless when every part of the file still aligns
  // (e.g. extra silence at the end: Dosari 20, +2.8s).
  const allAlign = status === "match" && tj.every((x) => x === "match");
  if (!allAlign && Math.abs(drift) > maxDriftS) {
    status = "mismatch";
    reason = `the streamed recording is ${Math.abs(drift).toFixed(0)}s ${drift > 0 ? "longer" : "shorter"} than the one its word timings describe`;
  }
  return { status, reason, drift, whole, thirds, badBoundaries: bb.bad.length, boundaries: bb.total };
}

/**
 * Local check inside a stream that isn't a mismatch overall: runs of
 * consecutive ayahs (≥ 20 word boundaries each) whose boundaries align with
 * the recording only at a shift ≥ 0.6s are misaligned data (e.g. the opening
 * of Alafasy 78, or displaced single ayahs). Returns those ayah numbers.
 */
function misalignedAyahs(E, data, minBoundaries = 20) {
  const out = [];
  const vt = data.verseTimings;
  let i = 0;
  while (i < vt.length) {
    const block = [];
    let n = 0;
    while (i < vt.length && n < minBoundaries) { block.push(vt[i]); n += (vt[i].segments || []).length; i++; }
    if (n < minBoundaries) break;
    const al = alignment(E, block.flatMap((v) => (v.segments || []).map((x) => x.startSec)), 1.5);
    // Local blocks are noisier than a whole file (reverb makes small ±0.4s
    // extremes): flag only a clear, noticeable offset.
    if (al && Math.abs(al.z0) < 1.5 && Math.abs(al.zBest) >= 3.5 && Math.abs(al.bestShift) >= 0.6) {
      for (const v of block) out.push({ ayah: v.ayahNumber, ...al });
    }
  }
  return out;
}

module.exports = { FR, readInt8, loadEnvelope, alignment, judge, streamVerdict, misalignedAyahs, badBoundaries, dip };
