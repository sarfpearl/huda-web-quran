#!/usr/bin/env node
// Live highlight check: how closely the gold word on screen follows the voice.
//
// Input: a recording made in the browser by scripts/qa/highlight-probe.js —
// every change of the highlighted word, with the reciter stream's
// currentTime at that frame. Each change is matched to the reciter's own QDC
// word segments (the timings the app ships): a word lit at time t should be
// the segment containing t. Reports, per run:
//   - how many lit words are the right word (at the moment they lit up);
//   - lag = lit time − segment start, for every word change (median, p95, max).
//
// A recording with mode "clip" (per-ayah Juz clips from everyayah.com, each
// event with the clip's `dur`) is mapped onto the Surah timeline the way the
// app maps it (getAyahClipWordSync): clip 0…dur = the ayah's dataset window.
//
// Usage: node scripts/qa/highlight-lag.cjs <recording.json> [...]
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

function timings(reciter, surah) {
  const file = path.join(ROOT, `public/data/quran-timings/${reciter}/${surah}.json`);
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  return d.verseTimings;
}

const pct = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

for (const file of process.argv.slice(2)) {
  const rec = JSON.parse(fs.readFileSync(file, "utf8"));
  const cache = {};
  const segOf = (surah, ayah) => {
    const verses = (cache[surah] ??= timings(rec.reciter, surah));
    const v = verses.find((x) => x.ayahNumber === ayah);
    return (v?.segments ?? []).map((s) =>
      ({ w: s.wordIndex, from: s.startSec, to: s.endSec }),
    );
  };
  let right = 0;
  let wrong = [];
  const lags = [];
  for (let ev of rec.events) {
    // Not a Surah word (prelude Isti'adhah / Bismillah clip) or nothing lit.
    if (ev.idx < 0 || !ev.ayah || ev.paused || !(ev.surah ?? rec.surah) || /prelude/.test(ev.src ?? "")) continue;
    const segs = segOf(ev.surah ?? rec.surah, ev.ayah);
    if (rec.mode === "clip") {
      const v = (cache[ev.surah] ??= timings(rec.reciter, ev.surah)).find((x) => x.ayahNumber === ev.ayah);
      const win = v.timestampToSec - v.timestampFromSec;
      ev = { ...ev, t: v.timestampFromSec + ev.t * (win / (ev.dur || win)) };
    }
    if (!segs.length) continue;
    // The segment for this word nearest the lit time (a word can repeat).
    const mine = segs.filter((s) => s.w === ev.idx + 1);
    const inside = segs.find((s) => ev.t >= s.from - 0.05 && ev.t < s.to + 0.05 && s.w === ev.idx + 1);
    if (inside) right++;
    else wrong.push({ t: +ev.t.toFixed(3), ayah: ev.ayah, lit: ev.idx + 1, voice: segs.find((s) => ev.t >= s.from && ev.t < s.to)?.w ?? "pause" });
    if (mine.length && !ev.jump) {
      const near = mine.reduce((a, b) => (Math.abs(b.from - ev.t) < Math.abs(a.from - ev.t) ? b : a));
      lags.push(Math.round((ev.t - near.from) * 1000));
    }
  }
  const total = right + wrong.length;
  console.log(
    JSON.stringify(
      {
        run: rec.label ?? path.basename(file),
        reciter: rec.reciter,
        surahs: [...new Set(rec.events.map((e) => e.surah ?? rec.surah).filter(Boolean))],
        wordChanges: total,
        rightWord: total ? `${((100 * right) / total).toFixed(1)}%` : null,
        lagMs: { median: pct(lags, 50), p95: pct(lags, 95), max: lags.length ? Math.max(...lags.map(Math.abs)) : null },
        wrong: wrong.slice(0, 10),
      },
      null,
      1,
    ),
  );
}
