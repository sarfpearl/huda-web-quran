#!/usr/bin/env node
// Word-boundary clock check. The player updates its clock on the frame the
// voice crosses `nextTimelineBoundary` (AudioPlayerContext setTimeBoundary),
// so the highlight can only change at those moments. This walks the app's
// real timeline boundary to boundary for every Word Sync reciter and checks,
// sampling every 20ms, that the active word never changes between two
// boundaries — a change there would light late (up to ~250ms, the old
// timeupdate rate).
//
// Usage: node scripts/qa/word-boundaries.cjs [surah,…]   (default 1,18,36,67,112)
const { V, R } = require("./lib/load.cjs");

const SURAHS = (process.argv[2] ?? "1,18,36,67,112").split(",").map(Number);
const STEP = 0.02;

(async () => {
  let failures = 0;
  for (const rec of R.QURAN_RECITERS.filter((r) => R.reciterHasWordTiming(r))) {
    for (const s of SURAHS) {
      if (!R.reciterHasWordTimingFor(rec, s)) continue;
      const verses = await V.fetchSurahVerses(s, rec.id);
      const dur = (verses.at(-1)?.timestampTo ?? 0) + 2;
      const tl = V.getRecitationTimeline(s, verses, false, dur, rec);
      const wordAt = (x) => {
        const { segment } = V.getActiveRecitationSegment(tl, x, dur);
        return `${segment?.id}:${V.getVoiceProgressInSegment(segment, x, true).activeWordIndex}`;
      };
      let t = 0;
      let steps = 0;
      const missed = [];
      while (t < dur) {
        const { segment } = V.getActiveRecitationSegment(tl, t, dur);
        const nb = V.nextTimelineBoundary(tl, segment, t);
        if (nb === null) break;
        const w0 = wordAt(t + 0.0005);
        for (let x = t + STEP; x < nb - 0.0005; x += STEP)
          if (wordAt(x) !== w0) {
            missed.push(`${x.toFixed(2)}s ${w0} → ${wordAt(x)} (boundary ${nb.toFixed(2)}s)`);
            break;
          }
        t = nb;
        steps++;
      }
      // The walk must reach the end of the recitation.
      const short = t < (verses.at(-1)?.timestampTo ?? 0) - 0.01;
      failures += missed.length + (short ? 1 : 0);
      console.log(`${missed.length || short ? "FAIL" : "ok  "} ${rec.id}/${s}: ${steps} boundaries${short ? `, stopped at ${t.toFixed(1)}s` : ""}`);
      for (const m of missed.slice(0, 5)) console.log("     ", m);
    }
  }
  process.exit(failures ? 1 : 0);
})();
