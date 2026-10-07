// Browser check for responsive layout — paste into the page at a given
// viewport (open a modal first to check it). Reports:
//   - hScroll: the page scrolls sideways
//   - outside: visible, clickable elements poking out of the viewport (inside
//     a scrolling / clipping strip that itself fits is fine)
//   - arabicOverflow: Quran words past the screen edge
//   - playerFits: the visible player inside the viewport
//   - smallTargets: controls whose *tap area* is under 44×44 px — tested by
//     hit-testing 21px left / right / above / below the centre, so an
//     invisible hit area (.tap-44, before:-inset-2) counts. A miss can also
//     be a neighbour's hit area overlapping (dense rows).
//
//   responsiveCheck("label")
(() => {
  window.responsiveCheck = (label) => {
    const W = innerWidth;
    const H = innerHeight;
    const shown = (e) => {
      for (let p = e; p; p = p.parentElement) {
        const c = getComputedStyle(p);
        if (parseFloat(c.opacity) < 0.05 || c.visibility === "hidden" || c.display === "none") return false;
      }
      const r = e.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const inView = (r) => r.right > 0 && r.left < W && r.bottom > 0 && r.top < H;
    const name = (e) => (e.getAttribute("aria-label") || e.innerText || e.getAttribute("alt") || e.tagName).trim().slice(0, 40).replace(/\n/g, " ");
    const clipped = (e) => {
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const c = getComputedStyle(p);
        if (/(hidden|auto|scroll|clip)/.test(c.overflowX)) {
          const pr = p.getBoundingClientRect();
          if (pr.left >= -1 && pr.right <= W + 1) return true;
        }
      }
      return false;
    };
    const outside = [...document.querySelectorAll("body *")]
      .filter((e) => !(e instanceof SVGElement && e.tagName !== "svg") && e.tagName !== "SCRIPT")
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return (r.right > W + 1 || r.left < -1) && r.width < W * 3 && shown(e) && !clipped(e) && getComputedStyle(e).pointerEvents !== "none";
      })
      .map((e) => `${name(e)} [${Math.round(e.getBoundingClientRect().left)}…${Math.round(e.getBoundingClientRect().right)}]`)
      .slice(0, 12);
    const arabicOverflow = [...document.querySelectorAll("[data-word-idx]")].filter((w) => {
      const r = w.getBoundingClientRect();
      return shown(w) && (r.right > W + 1 || r.left < -1);
    }).length;
    const dock = document.querySelector("[data-player-dock]");
    const playerFits = !dock || [...dock.querySelectorAll("*")]
      .filter((e) => shown(e) && e.getBoundingClientRect().height > 30)
      .every((e) => {
        const r = e.getBoundingClientRect();
        return r.left >= -1 && r.right <= W + 1 && r.bottom <= H + 1;
      });
    const smallTargets = [...document.querySelectorAll('button, a[href], [role="button"], input[type="range"], select')]
      .filter((e) => shown(e) && inView(e.getBoundingClientRect()) && !/Skip to content/.test(e.innerText))
      .flatMap((e) => {
        const r = e.getBoundingClientRect();
        if (r.width >= 44 && r.height >= 44) return [];
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const miss = [[cx - 21, cy], [cx + 21, cy], [cx, cy - 21], [cx, cy + 21]].filter(([x, y]) => {
          if (x < 0 || y < 0 || x >= W || y >= H) return false;
          const t = document.elementFromPoint(x, y);
          return !(t && (t === e || e.contains(t)));
        }).length;
        return miss ? [`${name(e)} ${Math.round(r.width)}×${Math.round(r.height)} (misses ${miss}/4)`] : [];
      });
    return { label, width: W, height: H, hScroll: document.documentElement.scrollWidth > W + 1, outside, arabicOverflow, playerFits, smallTargets };
  };
})();
