#!/usr/bin/env node
// Stray audio check (WebKit): only one voice ever plays, and it is the one the
// screen shows. The Surah stream fails once (r2.dev throttles under rapid
// switching; a network drop) and its retry is due in 1 s; meanwhile:
//   juz     a Juz is picked: the old Surah's stream must not come back
//           under the Juz screen
//   cued    nothing is pressed (the Surah is only cued / was paused): the
//           retry must not start it by itself
//   surah   the next Surah is picked: only that Surah plays
// After each, every <audio>/<video> the page ever started is checked: at most
// one is audibly playing (time moving, not muted), it belongs to what the
// screen shows, and none plays while the button shows Play.
//
// Needs a running app (npm run dev) and playwright-core with its WebKit
// (npx playwright-core install webkit); PLAYWRIGHT_CORE=<path> if it isn't
// installed in this repo.
//
// Usage: node scripts/qa/stray-audio.cjs [--base=http://localhost:3000] [--only=juz,pause]
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || d;
const BASE = arg("base", "http://localhost:3000");
const ONLY = arg("only", "");
const { webkit } = require(process.env.PLAYWRIGHT_CORE || "playwright-core");

// Every media element the page starts (in the DOM or not), and which of them
// are heard: playing, not muted, time moving.
function probe() {
  const all = [];
  const t0 = performance.now();
  window.__events = [];
  for (const ev of ["play", "playing", "pause", "ended", "error", "loadstart"])
    document.addEventListener(ev, (e) => {
      if (e.target instanceof HTMLAudioElement)
        window.__events.push(`${((performance.now() - t0) / 1000).toFixed(2)} ${ev} #${[...document.querySelectorAll("audio")].indexOf(e.target)} ${(e.target.getAttribute("src") || "").split("/").pop().slice(0, 40)}`);
    }, true);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!all.includes(this)) all.push(this);
    return play.apply(this, arguments);
  };
  const snap = () =>
    [...new Set([...all, ...document.querySelectorAll("audio,video")])]
      .filter((e) => !e.paused && !e.muted && e.volume > 0 && (e.getAttribute("src") || "") && !e.getAttribute("src").startsWith("data:"))
      .map((e) => ({ e, t: e.currentTime }));
  window.__heard = () =>
    new Promise((res) => {
      const a = snap();
      setTimeout(() => {
        const b = snap();
        res(b.filter((x) => a.some((y) => y.e === x.e && x.t > y.t + 0.05)).map((x) => (x.e.getAttribute("src") || "").replace(/^blob:.*/, "blob")));
      }, 900);
    });
  window.__button = () =>
    [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-label")).find((l) => l === "Play" || l === "Pause") ?? null;
}

const SURAH_STREAM = (n) => new RegExp(`(quran-cbr/[^/]+/${n}|murattal/0*${n})\\.mp3`);

async function scenario(browser, name, { start, failSurah, prepare, act, expect, thenPlay }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  // The Surah's stream (cued on open) is held until the page is ready, then
  // fails — its error schedules a retry in 1 s — and works again after `act`.
  let fail;
  const armed = new Promise((res) => (fail = res));
  let failing = true;
  await ctx.route(SURAH_STREAM(failSurah), async (route) => {
    if (!failing) return route.continue();
    await armed;
    route.abort("failed").catch(() => {});
  });
  const page = await ctx.newPage();
  await page.addInitScript(probe);
  if (process.env.VERBOSE) page.on("console", (m) => console.log("   console:", m.text().slice(0, 160)));
  if (process.env.VERBOSE) page.on("request", (r) => /\.mp3/.test(r.url()) && console.log("   req:", r.url().slice(-70)));
  // (The held stream keeps "load" from firing: wait for the player instead.)
  await page.goto(`${BASE}${start}?debug=audio`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector('button[aria-label="Play"]', { state: "attached", timeout: 120000 });
  await page.waitForTimeout(3000);
  const click = (re) =>
    page.evaluate((s) => {
      const r = new RegExp(s);
      const el = [...document.querySelectorAll("button,[role=tab]")].filter((b) => r.test((b.getAttribute("aria-label") || b.textContent).trim())).pop();
      el?.click();
      return !!el;
    }, re);
  await click("^Not now$");
  if (prepare) await prepare(click, page);
  const failed = page.waitForEvent("console", { predicate: (m) => m.text().includes("Stream error — retry 1/"), timeout: 30000 });
  fail();
  await failed; // its retry is due in 1 s
  if (act) await act(click, page);
  failing = false;
  await page.waitForTimeout(6000); // past every retry (1 s, 2 s, 3 s)
  let heard = await page.evaluate(() => window.__heard());
  // (A clip change — the Bismillah to the ayah — can fall in one sample.)
  for (let i = 0; i < 3 && expect.mustHear && !heard.length; i++) heard = await page.evaluate(() => window.__heard());
  const button = await page.evaluate(() => window.__button());
  const problems = [];
  if (heard.length > 1) problems.push(`${heard.length} voices at once: ${heard.join(" + ")}`);
  if (heard.length && button === "Play") problems.push(`heard with the button on Play: ${heard.join(" + ")}`);
  const wrong = heard.filter((src) => !expect(src));
  if (wrong.length) problems.push(`not what the screen shows: ${wrong.join(" + ")}`);
  if (!problems.length && expect.mustHear && !heard.length) problems.push("nothing playing");
  // Still plays when asked to: Play then starts it (its prelude first).
  if (!problems.length && thenPlay) {
    await click("^Play$");
    let after = [];
    for (let i = 0; i < 5 && after.length !== 1; i++) {
      after = await page.evaluate(() => window.__heard());
      if (after.length > 1) break;
    }
    if (after.length !== 1) problems.push(`after Play: ${after.length} voices ${after.join(" + ")}`);
  }
  console.log(`${problems.length ? "FAIL" : "ok  "} ${name}${problems.length ? ` — ${problems.join("; ")}` : ` (${heard.join(" + ") || "silent"}, button ${button})`}`);
  // What each <audio> did, last first-hand events.
  if (problems.length) {
    const log = await page.evaluate(() => window.__events.slice(-30));
    console.log(log.map((l) => `     ${l}`).join("\n"));
  }
  await ctx.close();
  return problems.length === 0;
}

// The content browser's Juz list, open before Play so the pick is one tap.
const JUZ_30 = "^30.*Juz 30";
const openJuzList = async (click, page) => {
  await click("^Open Content Browser$");
  await page.waitForFunction(() => [...document.querySelectorAll("button,[role=tab]")].some((b) => b.textContent.trim() === "Juz"), null, { timeout: 30000 });
  await click("^Juz$");
  await page.waitForFunction((s) => [...document.querySelectorAll("button")].some((b) => new RegExp(s).test(b.textContent.trim())), JUZ_30, { timeout: 30000 });
};

const SCENARIOS = {
  juz: {
    start: "/surah/2",
    failSurah: 2,
    prepare: openJuzList,
    act: async (click) => {
      if (!(await click(JUZ_30))) throw new Error("Juz 30 not in the list");
    },
    // Juz 30 per-ayah clips (078001…), its preludes — never Surah 2's stream.
    expect: Object.assign((src) => !SURAH_STREAM(2).test(src), { mustHear: true }),
  },
  // Nothing pressed: the Surah is only cued (or was paused) — nothing may start.
  cued: {
    start: "/surah/2",
    failSurah: 2,
    expect: () => false,
    thenPlay: true,
  },
  surah: {
    start: "/surah/2",
    failSurah: 2,
    act: (click) => click("^Next Surah$"),
    expect: Object.assign((src) => !SURAH_STREAM(2).test(src), { mustHear: true }),
  },
};

(async () => {
  const browser = await webkit.launch();
  let ok = true;
  for (const [name, s] of Object.entries(SCENARIOS)) {
    if (ONLY && !ONLY.split(",").includes(name)) continue;
    ok = (await scenario(browser, name, s)) && ok;
  }
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
