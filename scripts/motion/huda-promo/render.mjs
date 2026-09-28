// Renders index.html with Playwright.
//   node render.mjs stills   → out/beats/bNN.png (one frame per beat) + out/beats.png contact sheet
//   node render.mjs full     → out/video.mp4 (60 fps, 4 subframes per frame blended with tmix)
//   node render.mjs cues     → out/cues.json only (sound cue list for sounds.py)
import { createRequire } from "node:module";
import { execSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(join(execSync("npm root -g").toString().trim(), "playwright")); }

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const URL = pathToFileURL(join(HERE, "index.html")).href + "?render";
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FPS = 60, SUB = 4, SIZE = 1440, WORKERS = +(process.env.WORKERS || 4);
const mode = process.argv[2] || "stills";

mkdirSync(OUT, { recursive: true });

const browser = await playwright.chromium.launch();
async function openPage() {
  const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE }, deviceScaleFactor: 1 });
  await page.goto(URL);
  await page.evaluate(() => window.ready);
  return page;
}
const stage = page => page.locator("#stage");
async function frame(page, t, type = "png") {
  await page.evaluate(t => window.seek(t), t);
  return stage(page).screenshot({ type, quality: type === "jpeg" ? 95 : undefined, animations: "disabled" });
}

const first = await openPage();
const T = await first.evaluate(() => window.T);
const cues = await first.evaluate(() => window.CUES);
writeFileSync(join(OUT, "cues.json"), JSON.stringify({ T, cues }, null, 1));
console.log(`cues.json: ${cues.length} cues, T=${T}s`);

if (mode === "stills") {
  const dir = join(OUT, "beats");
  mkdirSync(dir, { recursive: true });
  const BEAT = 0.5, names = [];
  for (let n = 1; n <= 28; n++) {
    const t = (n - 1) * BEAT + 0.35;              // mid-beat, after the action lands
    const file = `b${String(n).padStart(2, "0")}.png`;
    writeFileSync(join(dir, file), await frame(first, t));
    names.push([file, n, t]);
  }
  // Loop check: the last subframe must sit right next to frame 0.
  const seam = await first.evaluate(T => {
    const h = 1e-4, a = window.probe(T - 1e-7), b = window.probe(0);
    const vL = window.probe(T - h).map((x, i) => (a[i] - x) / h), vR = window.probe(h).map((x, i) => (x - b[i]) / h);
    return { value: Math.max(...a.map((x, i) => Math.abs(x - b[i]))), velocity: Math.max(...vL.map((x, i) => Math.abs(x - vR[i]))) };
  }, T);
  console.log(`loop seam: Δvalue ${seam.value.toExponential(1)} px, Δvelocity ${seam.velocity.toExponential(1)} px/s`);

  // Contact sheet: 4 beats per row, 7 bars.
  const cells = names.map(([f, n, t]) =>
    `<figure><img src="beats/${f}"><figcaption><b>${Math.ceil(n / 4)}.${((n - 1) % 4) + 1}</b> · beat ${n} · ${t.toFixed(2)}s</figcaption></figure>`).join("");
  writeFileSync(join(OUT, "beats.html"), `<!doctype html><meta charset="utf-8"><style>
    body{margin:0;background:#e9e2d3;font:500 15px/1 system-ui;color:#141716}
    main{display:grid;grid-template-columns:repeat(4,360px);gap:14px;padding:14px;width:max-content}
    figure{margin:0}img{width:360px;height:360px;display:block;border-radius:6px}
    figcaption{padding:7px 2px 0;color:#5a625e}b{color:#141716}</style><main>${cells}</main>`);
  const sheet = await browser.newPage({ viewport: { width: 4 * 360 + 5 * 14, height: 800 } });
  await sheet.goto(pathToFileURL(join(OUT, "beats.html")).href);
  await sheet.screenshot({ path: join(OUT, "beats.png"), fullPage: true });
  console.log("wrote out/beats.png");
}

if (mode === "at") {                               // node render.mjs at 7.56 8.6 …
  for (const t of process.argv.slice(3).map(Number)) {
    writeFileSync(join(OUT, `at-${t.toFixed(2)}.png`), await frame(first, t));
  }
  console.log("wrote out/at-*.png");
}

if (mode === "full") {
  const total = Math.round(T * FPS) * SUB;          // subframes
  const ff = spawn(FFMPEG, [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS * SUB), "-c:v", "mjpeg", "-i", "-",
    // blend 4 consecutive subframes, keep every 4th blended frame → 60 fps with motion blur
    "-vf", `tmix=frames=${SUB}:weights='1 1 1 1',select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)`,
    "-r", String(FPS), "-c:v", "libx264", "-preset", "slow", "-crf", "14", "-pix_fmt", "yuv420p",
    join(OUT, "video.mp4"),
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const pages = [first, ...(await Promise.all(Array.from({ length: WORKERS - 1 }, openPage)))];
  const done = new Map();
  let next = 0, written = 0;
  // Subframe i is centred on its output frame: t = (i − 1.5) / 240.
  const tOf = i => (i - (SUB - 1) / 2) / (FPS * SUB);
  const flush = async () => {
    while (done.has(written)) {
      const buf = done.get(written); done.delete(written);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      written++;
      if (written % 240 === 0) console.log(`  ${written}/${total} subframes`);
    }
  };
  await Promise.all(pages.map(async page => {
    while (next < total) {
      const i = next++;
      done.set(i, await frame(page, tOf(i), "jpeg"));
      await flush();
    }
  }));
  await flush();
  ff.stdin.end();
  await new Promise((res, rej) => ff.on("close", c => c ? rej(new Error(`ffmpeg ${c}`)) : res()));
  console.log("wrote out/video.mp4");
}

await browser.close();
