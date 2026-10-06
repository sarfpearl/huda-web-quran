// Browser probe for scripts/qa/highlight-lag.cjs — paste into the page (or run
// through the browser tool) while a Word Sync Surah plays. Every animation
// frame it reads the highlighted word (.quran-word--active: data-word-idx,
// and data-word-id "surah:ayah:word") and the reciter stream's currentTime,
// and records each change of word or ayah.
//
//   window.__hlProbe.start({ reciter: "alafasy", label: "…" })
//   window.__hlProbe.mark("seek")   // the next change is after a jump
//   window.__hlProbe.stop()         // → recording (JSON) for highlight-lag.cjs
(() => {
  const stream = () =>
    [...document.querySelectorAll("audio")].find((a) => !a.paused && /quranicaudio|qurancdn|mp3quran/.test(a.src)) ??
    [...document.querySelectorAll("audio")].find((a) => /quranicaudio|qurancdn/.test(a.src));
  let rec = null;
  let raf = 0;
  let last = "";
  let jump = false;
  const tick = () => {
    const a = stream();
    const el = document.querySelector(".quran-word--active");
    const idx = el ? Number(el.dataset.wordIdx) : -1;
    // data-word-id = "surah:ayah:word" of the ayah on screen.
    const [surah, ayah] = (el ?? document.querySelector("[data-word-id]"))?.dataset.wordId?.split(":").map(Number) ?? [0, 0];
    const key = `${surah}:${ayah}:${idx}`;
    if (a && key !== last) {
      rec.events.push({ t: a.currentTime, surah, ayah, idx, ...(jump ? { jump: true } : {}), paused: a.paused || undefined });
      last = key;
      jump = false;
    }
    raf = requestAnimationFrame(tick);
  };
  window.__hlProbe = {
    start(meta) {
      rec = { ...meta, startedAt: new Date().toISOString(), events: [] };
      last = "";
      jump = true;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
      return "recording";
    },
    mark() {
      jump = true;
    },
    stop() {
      cancelAnimationFrame(raf);
      return rec;
    },
  };
})();
