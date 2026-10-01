#!/usr/bin/env node
// HuDa Word-Sync / Voice-Sync regression suite.
//
// Runs the app's REAL data code (quranVerses.ts, quranReciters.ts, quran.ts,
// surahTrimming.ts) for every Word Sync reciter × Surah × ayah × word, plus the
// Juz, prelude and Audio Only rules, and writes scripts/qa/results/suite-result.json:
//   { summary: {...metrics}, failures: [{ category, severity, reciter, surah,
//     ayah, word, expected, actual, detail }] }
// If scripts/qa/results/audio-sources.json and voice-match.json exist (from
// audio-sources.cjs / voice-match.cjs), their HTTP / duration / acoustic
// results are folded into the summary.
//
// Usage: node scripts/qa/sync-suite.cjs          (exit code 1 on CRITICAL/HIGH)
const fs = require("fs");
const path = require("path");
const { V, R, Q, T, ROOT, requests } = require("./lib/load.cjs");

const OUT = path.join(ROOT, "scripts/qa/results");
fs.mkdirSync(OUT, { recursive: true });
const STEP = 0.02; // 20ms sweep
const readJSON = (rel) => { const p = path.join(ROOT, rel); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const SYNC = R.QURAN_RECITERS.filter((r) => R.reciterHasWordTiming(r));
const ONLY = R.QURAN_RECITERS.filter((r) => !R.reciterHasWordTiming(r));
const glyphs = {};
const verseText = {};
for (let s = 1; s <= 114; s++) {
  glyphs[s] = readJSON(`public/data/quran-glyphs/${s}.json`);
  verseText[s] = readJSON(`public/data/quran-verses/${s}.json`);
}
const G = (s, a) => (glyphs[s]?.find((x) => x.a === a)?.w ?? []);
const ayahCount = (s) => Q.QURAN_SURAHS.find((x) => x.number === s).verses;

const failures = [];
const fail = (category, severity, o) => failures.push({ category, severity, ...o });
const m = {
  totalAyahs: 0, totalWords: 0, totalSegments: 0, wordTextMatch: 0, wordTextMismatch: 0,
  wordsSyncedMeasured: 0, wordsSyncedEstimated: 0, wordsUnsynced: 0, unsyncedReasons: {},
  ayahsWithoutWordTiming: 0, invalidTimingRanges: 0, voiceSamples: 0, voiceMatch: 0,
  preludeChecks: 0, preludeMismatches: 0, seekChecks: 0, seekFailures: 0,
  transitionChecks: 0, transitionFailures: 0,
};
const perReciter = {};

const skel = (t) => t.normalize("NFC").replace(/\p{Mn}/gu, "").replace(/[ـ۞ۥۦ۩]/g, "")
  .replace(/[ء-اٱ-ٳىيیوهة]/g, "").replace(/\s+/g, "");

(async () => {
  const t0 = Date.now();
  const unavailable = {}; // reciter -> [surah]

  // ── 1. Quran text + glyph data (reciter-independent) ──────────────────
  for (let s = 1; s <= 114; s++) {
    const n = ayahCount(s);
    if (!verseText[s] || verseText[s].length !== n) fail("text-local-file", "CRITICAL", { surah: s, expected: n, actual: verseText[s]?.length ?? 0, detail: "public/data/quran-verses file missing or incomplete" });
    if (!glyphs[s] || glyphs[s].length !== n) fail("glyph-ayah-count", "CRITICAL", { surah: s, expected: n, actual: glyphs[s]?.length ?? 0 });
    m.totalAyahs += n;
    for (let a = 1; a <= n; a++) m.totalWords += G(s, a).length;
  }

  // ── 2. Word Sync reciters: data + real code, every ayah and word ───────
  for (const rec of SYNC) {
    const pr = (perReciter[rec.id] = { surahs: 0, wordSyncSurahs: 0, ayahs: 0, ayahsNoWordTiming: 0, words: 0, measured: 0, estimated: 0, unsynced: 0, voiceSamples: 0, voiceMatch: 0 });
    unavailable[rec.id] = [];
    for (let s = 1; s <= 114; s++) {
      pr.surahs++;
      const where = { reciter: rec.id, surah: s };
      const raw = readJSON(`public/data/quran-timings/${rec.id}/${s}.json`);
      if (!raw) { fail("timing-file", "CRITICAL", { ...where, detail: "missing timing file" }); continue; }
      if (raw.audioUrl !== R.buildReciterSurahUrl(rec, s)) fail("audio-timing-pair", "HIGH", { ...where, expected: raw.audioUrl, actual: R.buildReciterSurahUrl(rec, s) });
      const n = ayahCount(s);
      if (raw.verseTimings.length !== n) fail("timing-ayah-count", "HIGH", { ...where, expected: n, actual: raw.verseTimings.length });
      for (const v of raw.verseTimings) m.totalSegments += (v.segments || []).length;

      const why = R.wordSyncUnavailableReason(rec, s);
      const cap = R.getReciterTimingCapability(rec, s);
      if (why) { unavailable[rec.id].push(s); if (cap.hasWordTiming) fail("capability", "CRITICAL", { ...where, detail: "unavailable Surah still claims word timing" }); }
      else pr.wordSyncSurahs++;

      // Prelude rules (surah 1: Isti'adhah clip; 9: none; own-Bismillah recordings: none; else Bismillah clip)
      m.preludeChecks++;
      const pc = T.getSurahPreludeConfig(s, rec);
      const embeds = R.reciterEmbedsOwnBismillah(rec, s);
      const exp = s === 1 ? "fatihah" : s === 9 || embeds ? "none" : "bismillah";
      if (pc.type !== exp) { m.preludeMismatches++; fail("prelude-config", "HIGH", { ...where, expected: exp, actual: pc.type }); }

      const verses = await V.fetchSurahVerses(s, rec.id);
      if (V.isFallbackVerses(verses)) { fail("verses-fallback", "CRITICAL", { ...where, detail: "fell back to a lone Bismillah" }); continue; }
      const realDur = raw.durationSeconds || 0;
      const segs = V.getRecitationTimeline(s, verses, false, realDur, rec);
      const ayahSegs = segs.filter((x) => x.type === "ayah");
      if (ayahSegs.length !== n) fail("timeline-ayah-count", "HIGH", { ...where, expected: n, actual: ayahSegs.length });
      const preSegs = segs.filter((x) => x.type !== "ayah");
      if (s === 9 && preSegs.some((x) => x.type === "bismillah")) { m.preludeMismatches++; fail("prelude-tawbah", "CRITICAL", { ...where, detail: "Bismillah in At-Tawbah" }); }
      if (embeds && !why && !preSegs.some((x) => x.type === "bismillah")) { m.preludeMismatches++; fail("prelude-embedded", "HIGH", { ...where, detail: "own-Bismillah recording without a Bismillah segment" }); }
      if (preSegs.some((x) => x.words?.length)) fail("prelude-fake-words", "HIGH", { ...where, detail: "embedded prelude claims per-word timing" });
      if (preSegs.filter((x) => x.type === "bismillah").length > 1) fail("prelude-double-bismillah", "CRITICAL", where);
      // No overlap between consecutive timeline windows (word-sync Surahs).
      if (!why) for (let i = 0; i + 1 < segs.length; i++) if (segs[i].endTime > segs[i + 1].startTime + 1e-6) {
        m.invalidTimingRanges++;
        fail("timeline-overlap", "HIGH", { ...where, ayah: segs[i + 1].ayahNumber ?? 0, expected: `≤ ${segs[i + 1].startTime}`, actual: segs[i].endTime, detail: `${segs[i].id} overlaps ${segs[i + 1].id}` });
      }

      for (const v of verses) {
        const a = v.ayahNumber;
        const gw = G(s, a);
        const w = { ...where, ayah: a };
        pr.ayahs++;
        pr.words += gw.length;
        // Word text: timed word i ↔ glyph word i (positions the timings address).
        if (v.words) {
          if (v.words.length !== gw.length) fail("word-count", "HIGH", { ...w, expected: gw.length, actual: v.words.length });
          if (rec.id === SYNC[0].id) v.words.forEach((x, k) => {
            if (!gw[k]) return;
            if (skel(x.word) === skel(gw[k][2])) m.wordTextMatch++;
            else { m.wordTextMismatch++; fail("word-text", "MEDIUM", { ...w, word: k + 1, expected: gw[k][2], actual: x.word }); }
          });
        }
        if (why) continue; // audio-only Surah: nothing highlighted, by design
        if (v.noWordTiming) {
          pr.ayahsNoWordTiming++;
          m.ayahsWithoutWordTiming++;
          pr.unsynced += gw.length;
          const bucket = v.noWordTiming.replace(/[-+]?\d+(\.\d+)?s\b/g, "Xs");
          m.unsyncedReasons[bucket] = (m.unsyncedReasons[bucket] || 0) + gw.length;
          fail("ayah-no-word-timing", "INFO", { ...w, detail: v.noWordTiming });
          continue;
        }
        const est = new Set((v.wordSegments || []).filter((x) => x.estimated).map((x) => x.wordIndex));
        const measured = new Set((v.wordSegments || []).filter((x) => !x.estimated).map((x) => x.wordIndex));
        for (const k of measured) est.delete(k);
        pr.measured += measured.size;
        pr.estimated += est.size;
        for (const x of v.wordSegments || []) if (!(x.endTime > x.startTime) || x.wordIndex < 1 || x.wordIndex > gw.length) {
          m.invalidTimingRanges++;
          fail("segment-invalid", "HIGH", { ...w, word: x.wordIndex, actual: `${x.startTime}-${x.endTime}` });
        }
      }
      if (why) continue;

      // ── Live sweep: audio clock → ayah → word, exactly as the UI resolves it.
      const hit = new Map();
      let lastA = 0;
      for (let t = 0; t < Math.max(realDur, ayahSegs.at(-1)?.endTime ?? 0) + 1; t += STEP) {
        const { segment } = V.getActiveRecitationSegment(segs, t, realDur);
        if (!segment || segment.type !== "ayah") continue;
        const a = segment.ayahNumber;
        if (a < lastA) fail("ayah-went-back", "HIGH", { ...where, ayah: a, expected: `≥ ${lastA}`, actual: a, detail: `t=${t.toFixed(2)}` });
        lastA = Math.max(lastA, a);
        const p = V.getVoiceProgressInSegment(segment, t, true);
        const gn = G(s, a).length;
        if (p.activeWordIndex >= gn) fail("word-index-overflow", "HIGH", { ...where, ayah: a, word: p.activeWordIndex + 1, expected: `≤ ${gn}`, actual: p.activeWordIndex + 1 });
        if (realDur > 0 && t >= realDur && p.activeWordIndex >= 0) fail("highlight-after-audio-end", "HIGH", { ...where, ayah: a, word: p.activeWordIndex + 1, detail: `t=${t.toFixed(2)} ≥ audio ${realDur}` });
        if (p.activeWordIndex >= 0) (hit.get(a) || hit.set(a, new Set()).get(a)).add(p.activeWordIndex);
        const voiced = (segment.wordSegments || []).find((g) => t >= g.startTime && t < g.endTime);
        if (voiced) {
          pr.voiceSamples++;
          if (p.activeWordIndex === voiced.wordIndex - 1) pr.voiceMatch++;
          else if (failures.filter((f) => f.category === "voice-mismatch").length < 200) fail("voice-mismatch", "MEDIUM", { ...where, ayah: a, word: p.activeWordIndex + 1, expected: voiced.wordIndex, actual: p.activeWordIndex + 1, detail: `t=${t.toFixed(2)}` });
        }
      }
      for (const v of verses) {
        if (v.noWordTiming) continue;
        const gn = G(s, v.ayahNumber).length;
        const h = hit.get(v.ayahNumber) || new Set();
        for (let k = 0; k < gn; k++) if (!h.has(k)) {
          pr.unsynced++;
          // A word the timings place after the recording's end isn't in the audio.
          const ws = (v.wordSegments || []).filter((x) => x.wordIndex === k + 1);
          const afterEnd = realDur > 0 && ws.length > 0 && ws.every((x) => x.startTime >= realDur - 0.05);
          const why = afterEnd ? "timed after the recording ends" : "never highlighted in sweep";
          m.unsyncedReasons[why] = (m.unsyncedReasons[why] || 0) + 1;
          if (!afterEnd) fail("word-never-highlighted", "MEDIUM", { reciter: rec.id, surah: s, ayah: v.ayahNumber, word: k + 1, expected: "highlighted", actual: "never" });
        }
      }
      // ── Ayah transitions + seek: first word / last word / next ayah's first word.
      for (let i = 0; i < ayahSegs.length; i++) {
        const sg = ayahSegs[i];
        const v = verses.find((x) => x.ayahNumber === sg.ayahNumber);
        m.seekChecks++;
        const land = V.getActiveRecitationSegment(segs, sg.startTime + 0.05, realDur).segment;
        if (land?.id !== sg.id) { m.seekFailures++; fail("seek-ayah", "HIGH", { ...where, ayah: sg.ayahNumber, expected: sg.id, actual: land?.id }); }
        if (!v || v.noWordTiming || !sg.words?.length) continue;
        m.transitionChecks++;
        const w0 = sg.words[0];
        const tapAt = Math.max(w0.startTime, sg.startTime + 0.02);
        const p0 = V.getVoiceProgressInSegment(V.getActiveRecitationSegment(segs, tapAt + 0.01, realDur).segment, tapAt + 0.01, true);
        if (p0.activeWordIndex !== 0) { m.transitionFailures++; fail("first-word", "HIGH", { ...where, ayah: sg.ayahNumber, word: 1, expected: 1, actual: p0.activeWordIndex + 1 }); }
        const last = sg.wordSegments?.at(-1);
        if (last) {
          const tl = (last.startTime + last.endTime) / 2;
          const seg = V.getActiveRecitationSegment(segs, tl, realDur).segment;
          const pl = V.getVoiceProgressInSegment(seg, tl, true);
          if (seg?.id !== sg.id || pl.activeWordIndex !== last.wordIndex - 1) { m.transitionFailures++; fail("last-word", "HIGH", { ...where, ayah: sg.ayahNumber, word: last.wordIndex, expected: `${sg.id} w${last.wordIndex}`, actual: `${seg?.id} w${pl.activeWordIndex + 1}` }); }
        }
        const next = ayahSegs[i + 1];
        if (next && next.words?.length) {
          const tn = next.startTime + 0.01;
          const segN = V.getActiveRecitationSegment(segs, tn, realDur).segment;
          if (segN?.id !== next.id) { m.transitionFailures++; fail("next-ayah-first-word", "HIGH", { ...where, ayah: next.ayahNumber, word: 1, expected: next.id, actual: segN?.id, detail: "previous ayah still on screen at the next ayah's first word" }); }
        }
      }
    }
    m.wordsSyncedMeasured += pr.measured;
    m.wordsSyncedEstimated += pr.estimated;
    m.wordsUnsynced += pr.unsynced;
    m.voiceSamples += pr.voiceSamples;
    m.voiceMatch += pr.voiceMatch;
    console.error(`${rec.id} ✓ ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }

  // ── 3. Targeted regressions ────────────────────────────────────────────
  // 37:130 — «إِلۡ يَاسِينَ» is two timed words: every word shown and lit, none extra.
  for (const rec of SYNC) {
    const v = (await V.fetchSurahVerses(37, rec.id)).find((x) => x.ayahNumber === 130);
    const gw = G(37, 130);
    const where = { reciter: rec.id, surah: 37, ayah: 130 };
    if (gw.length !== 4) fail("regression-37:130", "CRITICAL", { ...where, expected: 4, actual: gw.length, detail: "glyph words" });
    if (v.words?.length !== gw.length) fail("regression-37:130", "CRITICAL", { ...where, expected: gw.length, actual: v.words?.length, detail: "timed words" });
    if (R.wordSyncUnavailableReason(rec, 37) || v.noWordTiming) continue;
    const segs = V.getRecitationTimeline(37, await V.fetchSurahVerses(37, rec.id), false, 0, rec);
    const sg = segs.find((x) => x.ayahNumber === 130);
    const lit = new Set();
    for (let t = sg.startTime; t < sg.endTime; t += 0.01) { const p = V.getVoiceProgressInSegment(sg, t, true); if (p.activeWordIndex >= 0) lit.add(p.activeWordIndex); }
    if (lit.size !== 4 || [...lit].some((k) => k > 3)) fail("regression-37:130", "CRITICAL", { ...where, expected: "words 1-4 lit", actual: [...lit].map((k) => k + 1).join(",") });
  }
  // Juz per-ayah word sync: clip time → word via the ayah's own segments (repeats followed).
  const juz = { ayahs: 0, pairsOk: true, withWordSync: 0, samples: 0, match: 0 };
  const all = new Set();
  for (let j = 1; j <= 30; j++) {
    const pairs = Q.getJuzAyahPairs(j);
    for (const [s, a] of pairs) { const k = `${s}:${a}`; if (all.has(k)) fail("juz-duplicate", "HIGH", { surah: s, ayah: a, detail: `juz ${j}` }); all.add(k); }
    const pre = Q.buildJuzPreludes(j, "alafasy");
    pairs.forEach(([s, a], i) => {
      const exp = a === 1 && s !== 9 ? (s === 1 ? "istiadhah" : "bismillah") : null;
      if ((pre[i]?.[0]?.type ?? null) !== exp) fail("juz-prelude", "HIGH", { surah: s, ayah: a, expected: exp, actual: pre[i]?.[0]?.type ?? null, detail: `juz ${j}` });
    });
    juz.ayahs += pairs.length;
  }
  if (all.size !== 6236) fail("juz-coverage", "CRITICAL", { expected: 6236, actual: all.size });
  const juzReciters = {};
  for (const rec of R.QURAN_RECITERS) {
    const hasJuz = Boolean(Q.buildJuzAyahUrls(1, rec.id));
    juzReciters[rec.id] = hasJuz;
  }
  for (const rec of SYNC) {
    if (!juzReciters[rec.id]) { fail("juz-unavailable", "INFO", { reciter: rec.id, detail: "no per-ayah recording: Juz shows an unavailable notice (no substitute voice)" }); continue; }
    for (let s = 1; s <= 114; s++) {
      const verses = await V.fetchSurahVerses(s, rec.id);
      for (const v of verses) {
        const win = V.ayahClipWindow(v);
        if (!win) continue;
        juz.withWordSync++;
        const dur = win.end - win.start;
        for (let t = 0; t < dur; t += 0.05) {
          const r = V.getAyahClipWordSync(v, t, dur);
          const voiced = v.wordSegments.find((g) => win.start + t >= g.startTime && win.start + t < g.endTime);
          if (!voiced) continue;
          juz.samples++;
          if (r.activeWordIndex === voiced.wordIndex - 1) juz.match++;
        }
        // A clip of another length is not stretched onto the timings.
        if (V.getAyahClipWordSync(v, 0.1, dur * 3).hasWordTiming) fail("juz-stretch-guard", "HIGH", { reciter: rec.id, surah: s, ayah: v.ayahNumber });
      }
    }
  }

  // ── 4. Audio Only reciters: no word highlight, no prelude, availability honoured.
  const onlyCov = { reciters: ONLY.length, unavailableReciters: [], partial: {} };
  for (const rec of ONLY) {
    if (R.reciterIsUnavailable(rec)) onlyCov.unavailableReciters.push(rec.id);
    const missing = Array.from({ length: 114 }, (_, i) => i + 1).filter((s) => !R.reciterHasSurah(rec, s));
    if (missing.length && missing.length < 114) onlyCov.partial[rec.id] = missing.length;
    for (const s of [1, 9, 36, 114]) {
      const cap = R.getReciterTimingCapability(rec, s);
      if (cap.hasWordTiming) fail("audio-only-word-timing", "CRITICAL", { reciter: rec.id, surah: s });
      if (T.getSurahPreludeConfig(s, rec).hasPrelude) fail("audio-only-prelude", "HIGH", { reciter: rec.id, surah: s });
    }
  }

  // ── 5. Network: normal operation never leaves the site ────────────────
  if (requests.external.length) fail("external-requests", "HIGH", { expected: 0, actual: requests.external.length, detail: requests.external.slice(0, 5).join(" ") });
  if (requests.missing.length) fail("local-404", "HIGH", { expected: 0, actual: requests.missing.length, detail: [...new Set(requests.missing)].slice(0, 5).join(" ") });

  // ── 6. External evidence (audio HTTP / duration / acoustic), when present.
  const repairs = {};
  for (const rec of SYNC) for (let s = 1; s <= 114; s++) for (const x of readJSON(`public/data/quran-timings/${rec.id}/${s}.json`)?.repairs ?? []) repairs[x.kind] = (repairs[x.kind] || 0) + 1;
  const audio = readJSON("scripts/qa/results/audio-sources.json")?.summary ?? null;
  const voice = readJSON("scripts/qa/results/voice-match.json")?.summary ?? null;

  const bySev = {};
  for (const f of failures) { const k = `${f.severity} ${f.category}`; bySev[k] = (bySev[k] || 0) + 1; }
  const summary = {
    generated: new Date().toISOString(),
    secs: Math.round((Date.now() - t0) / 1000),
    totals: {
      ayahs: m.totalAyahs, words: m.totalWords, timingSegments: m.totalSegments,
      wordTextMatch: m.wordTextMatch, wordTextMismatch: m.wordTextMismatch,
    },
    wordSync: {
      reciters: SYNC.length,
      wordSyncSurahs: Object.fromEntries(SYNC.map((r) => [r.id, perReciter[r.id].wordSyncSurahs])),
      audioOnlySurahs: unavailable,
      wordsSyncedMeasured: m.wordsSyncedMeasured, wordsSyncedEstimated: m.wordsSyncedEstimated, wordsUnsynced: m.wordsUnsynced,
      unsyncedReasons: m.unsyncedReasons, ayahsWithoutWordTiming: m.ayahsWithoutWordTiming,
      voiceMatchPct: m.voiceSamples ? +((100 * m.voiceMatch) / m.voiceSamples).toFixed(4) : null,
      invalidTimingRanges: m.invalidTimingRanges,
      transitions: { checks: m.transitionChecks, failures: m.transitionFailures },
      seek: { checks: m.seekChecks, failures: m.seekFailures },
    },
    preludes: { checks: m.preludeChecks, mismatches: m.preludeMismatches },
    timingRepairsApplied: repairs,
    juz: { ayahsCovered: all.size, ayahsWithWordSync: juz.withWordSync, voiceMatchPct: juz.samples ? +((100 * juz.match) / juz.samples).toFixed(4) : null, reciterJuzSupport: juzReciters },
    audioOnly: onlyCov,
    network: { localRequests: requests.local, localMissing: requests.missing.length, external: requests.external.length },
    audioSources: audio && { wordSyncHttpFailures: audio.wordSyncHttpFailures.length, wordSyncDurationDrift2s: audio.wordSyncDurationDrift2s.length, audioOnlyChecked: audio.audioOnlyChecked, audioOnly404: audio.audioOnlyBad, audioOnlyUnavailable: audio.audioOnlyUnavailable, juzChecked: audio.juzChecked, juzHttpFailures: audio.juzHttpFailures.length },
    acoustic: voice && { scanned: voice.scanned, match: voice.match, inconclusive: voice.inconclusive, mismatch: voice.mismatch, boundaries: voice.boundaries, badBoundaries: voice.badBoundaries },
    perReciter,
    failuresBySeverity: bySev,
  };
  fs.writeFileSync(path.join(OUT, "suite-result.json"), JSON.stringify({ summary, failures }, null, 1));
  console.log(JSON.stringify(summary, null, 1));
  process.exit(failures.some((f) => f.severity === "CRITICAL" || f.severity === "HIGH") ? 1 : 0);
})();
