// Browser probe for reading mode's follow-scroll — paste into the page while a
// Surah or Juz plays in reading mode. Every 200ms it checks that the recited
// word (aria-current, inside the reading pane) is on screen: inside the pane,
// out of its faded top (4rem) / bottom (2rem) edges, and above the visible
// player (the expanded player stays in the DOM at opacity 0 — skipped).
//
//   readingFollowProbe("label", seconds)   → window.__readRes when done
(() => {
  window.readingFollowProbe = (label, secs) => {
    const pane = [...document.querySelectorAll("*")].find((e) => {
      const s = getComputedStyle(e);
      return /(auto|scroll)/.test(s.overflowY) && e.querySelector("[data-key]") && e.scrollHeight > e.clientHeight;
    });
    if (!pane) return "no reading pane";
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const playerTop = () => {
      const tops = [...document.querySelectorAll("[data-player-dock] *")]
        .filter((e) => {
          const c = getComputedStyle(e);
          return e.offsetParent && c.visibility !== "hidden" && parseFloat(c.opacity) > 0.05 && !e.closest(".opacity-0") && e.getBoundingClientRect().height > 40;
        })
        .map((e) => e.getBoundingClientRect().top);
      return Math.min(innerHeight, ...tops);
    };
    const out = { label, samples: 0, visible: 0, faded: 0, underPlayer: 0, offscreen: 0, noWord: 0, ayahs: new Set(), examples: [] };
    window.__readRes = null;
    const iv = setInterval(() => {
      out.samples++;
      const w = pane.querySelector('[aria-current="true"][data-word-idx]');
      if (!w) return out.noWord++;
      const key = w.closest("[data-key]")?.dataset.key;
      out.ayahs.add(key);
      const r = w.getBoundingClientRect();
      const p = pane.getBoundingClientRect();
      let state = "visible";
      if (r.bottom < p.top || r.top > p.bottom) state = "offscreen";
      else if (r.bottom > playerTop()) state = "underPlayer";
      else if (r.top < p.top + 4 * rem || r.bottom > p.bottom - 2 * rem) state = "faded";
      out[state]++;
      if (state !== "visible" && out.examples.length < 5) out.examples.push({ state, key, top: Math.round(r.top - p.top) });
    }, 200);
    setTimeout(() => {
      clearInterval(iv);
      window.__readRes = { ...out, ayahs: [...out.ayahs] };
    }, secs * 1000);
    return "probing";
  };
})();
