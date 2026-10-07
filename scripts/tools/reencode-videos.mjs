#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Background video re-encode for R2
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The scene clips are muted background loops, but many were uploaded as
 * render masters: Al-Baqarah / Juz 1 clips are 8 s of 1080p at 7–58 Mbps
 * (up to 58 MB for 8 s), Al-Fatihah 20 MB for 19 s of 720p. A phone needs a
 * fraction of that. This re-encodes every clip the app references to H.264
 * (plays everywhere, iOS included), strips the unused audio track and puts the
 * index first (faststart). Each clip climbs a bitrate ladder until it still
 * looks like its source (VMAF ≥ 88 — a calm sky stops at the first rung,
 * palm leaves in wind need more), and only clips that end up much smaller and
 * pass are uploaded — to the SAME R2 keys, so no app change is needed.
 *
 * Steps (each one safe to re-run; finished files are skipped):
 *   1. node scripts/tools/reencode-videos.mjs
 *        Inventory only: every /videos/*.mp4 the app references (src/), its
 *        source (local public/videos master, else the R2 copy), size, bitrate,
 *        and the refs that exist nowhere (404s). Writes nothing.
 *   2. node scripts/tools/reencode-videos.mjs --encode
 *        Downloads R2-only sources to .media-work/originals/ (kept: the backup
 *        of what R2 had), encodes into .media-work/encoded/, measures VMAF, and
 *        writes .media-work/report.json + report.md. Uploads nothing.
 *        Review report.md, and open a few files in .media-work/encoded/.
 *   3. node scripts/tools/reencode-videos.mjs --upload            (dry run)
 *      node scripts/tools/reencode-videos.mjs --upload --execute  (uploads)
 *        Uploads the encoded files that passed (≥ 20% smaller + VMAF ≥ --vmaf).
 *
 * New clips (rendered masters in public/videos/, not on R2 yet):
 *   node scripts/tools/reencode-videos.mjs --new            inventory
 *   node scripts/tools/reencode-videos.mjs --new --encode
 *   node scripts/tools/reencode-videos.mjs --new --upload [--execute]
 *     Keys = every clip path the video registries can resolve (as
 *     video-manifest.mjs) that has a local master and is either missing on R2
 *     or only a placeholder there (R2 copy < 1 MB while the master is > 2 MB).
 *     The master is the source; it passes on VMAF alone. Then re-run
 *     video-manifest.mjs so the app starts asking for them.
 *
 * Options:
 *   --only=<substring>     only paths containing it (e.g. --only=002-al-baqarah)
 *   --vmaf=88              quality target (VMAF 0–100, vs the source); default 88
 *   --ladder-1080=3M,4M,6M,8M,12M,16M   bitrate caps tried in order (1080p)
 *   --ladder-720=1.5M,2M,3M,4M,6M        … for ≤720p sources
 *   --crf=24               x264 quality inside each cap; default 24
 *   --max-height=1080      downscale anything taller (e.g. 720 for smaller files)
 *   --jobs=2               parallel encodes; default 2
 *   --force                re-encode / re-upload even if done before
 *
 * Needs ffmpeg + ffprobe on PATH (brew install ffmpeg). Upload needs the same
 * R2 credentials as upload-to-r2.mjs (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env.local).
 *
 * Cache note: R2 serves these with "max-age=31536000, immutable". Browsers
 * that already cached a clip keep the old (heavier, same-looking) copy; new
 * visitors get the small one. Nothing breaks either way — but when an upload
 * changes what a clip SHOWS (a placeholder → the real scene), add or bump its
 * key in src/lib/data/videoVersions.ts so everyone gets the new URL.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

// The real fetch: registryVideos() loads scripts/qa/lib/load.cjs, which
// replaces the global one (see video-manifest.mjs's nativeFetch).
const nativeFetch = globalThis.fetch;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORK = path.join(ROOT, ".media-work");
const ORIGINALS = path.join(WORK, "originals");
const ENCODED = path.join(WORK, "encoded");
const REPORT_JSON = path.join(WORK, "report.json");
const REPORT_MD = path.join(WORK, "report.md");

// ── options ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : def;
};
const MODE = flag("upload") ? "upload" : flag("encode") ? "encode" : "inventory";
const NEW = flag("new");
const EXECUTE = flag("execute");
const FORCE = flag("force");
const ONLY = opt("only", "");
const CRF = Number(opt("crf", "24"));
const LADDER_1080 = opt("ladder-1080", "3M,4M,6M,8M,12M,16M").split(",");
const LADDER_720 = opt("ladder-720", "1.5M,2M,3M,4M,6M").split(",");
const MAX_HEIGHT = Number(opt("max-height", "1080"));
const MIN_VMAF = Number(opt("vmaf", "88"));
const JOBS = Math.max(1, Number(opt("jobs", "2")));

// ── env (same loader as upload-to-r2.mjs) ────────────────────────────────────
for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const k = t.slice(0, t.indexOf("=")).trim();
    let v = t.slice(t.indexOf("=") + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
const PUBLIC_R2 = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev").replace(/\/+$/, "");

// ── helpers ──────────────────────────────────────────────────────────────────
const mb = (n) => (n / 1e6).toFixed(1) + " MB";
const mbps = (n) => (n / 1e6).toFixed(1) + " Mbps";

function need(bin) {
  try {
    execFileSync(bin, ["-version"], { stdio: "ignore" });
  } catch {
    console.error(`✗ ${bin} not found — install it (brew install ffmpeg).`);
    process.exit(1);
  }
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => (code === 0 ? resolve({ out, err }) : reject(new Error(`${bin} exited ${code}: ${err.slice(-600)}`))));
  });
}

async function probe(src) {
  const { out } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,bit_rate,size:stream=codec_type,codec_name,width,height,r_frame_rate", "-of", "json", src]);
  const j = JSON.parse(out);
  const v = j.streams.find((s) => s.codec_type === "video");
  return {
    duration: Number(j.format.duration),
    bitrate: Number(j.format.bit_rate),
    width: v?.width,
    height: v?.height,
    codec: v?.codec_name,
    fps: v?.r_frame_rate,
    audio: j.streams.some((s) => s.codec_type === "audio"),
  };
}

/** Every /videos/…mp4 string literal in src/ — what the app can actually request. */
function referencedVideos() {
  const found = new Set();
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) {
        for (const m of fs.readFileSync(p, "utf8").matchAll(/["'`](\/videos\/[^"'`]+?\.mp4)["'`]/g)) found.add(m[1]);
      }
    }
  };
  walk(path.join(ROOT, "src"));
  // Template literals (`/videos/surah/${pad}…`) are resolvers, not files.
  return [...found].filter((p) => !p.includes("${") && (!ONLY || p.includes(ONLY))).sort();
}

/** Every clip path the video registries can resolve (same set as video-manifest.mjs). */
function registryVideos() {
  const require = createRequire(import.meta.url);
  require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
  const { SURAH_CHAPTERS_REGISTRY, getSurahVisualData } = require(path.join(ROOT, "src/lib/data/surahChapters.ts"));
  const { SURAH_VERSE_VIDEOS_REGISTRY } = require(path.join(ROOT, "src/lib/data/surahVerseVideos.ts"));
  const { JUZ_VIDEOS } = require(path.join(ROOT, "src/lib/data/quranJuzVideos.ts"));
  const found = new Set();
  const add = (p) => p && p.startsWith("/videos/") && found.add(p);
  for (let s = 1; s <= 114; s++) {
    const d = SURAH_CHAPTERS_REGISTRY[s] ?? getSurahVisualData(s);
    add(d.masterVideoPath);
    d.chapters.forEach((c) => add(c.videoPath));
  }
  for (const ayahs of Object.values(SURAH_VERSE_VIDEOS_REGISTRY)) for (const v of Object.values(ayahs)) add(v.videoPath);
  for (const j of Object.values(JUZ_VIDEOS)) {
    add(j.videoPath);
    (j.playlist ?? []).forEach(add);
  }
  return [...found].filter((p) => !ONLY || p.includes(ONLY)).sort();
}

async function remoteSize(key) {
  const res = await nativeFetch(PUBLIC_R2 + key, { method: "HEAD" });
  return res.ok ? Number(res.headers.get("content-length")) : null;
}

async function download(key, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await nativeFetch(PUBLIC_R2 + key);
  if (!res.ok) throw new Error(`download ${key}: HTTP ${res.status}`);
  const tmp = dest + ".part";
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

function loadReport() {
  try {
    return JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
  } catch {
    return {};
  }
}

function saveReport(report) {
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));
  const rows = Object.entries(report).sort(([a], [b]) => a.localeCompare(b));
  const done = rows.filter(([, r]) => r.encoded);
  const before = done.reduce((a, [, r]) => a + r.srcSize, 0);
  const after = done.reduce((a, [, r]) => a + r.outSize, 0);
  const lines = [
    "# Video re-encode report",
    "",
    `Settings: VMAF ≥ ${MIN_VMAF}, ladder ${LADDER_1080.join("/")} (1080p) · ${LADDER_720.join("/")} (≤720p), CRF ${CRF}, max height ${MAX_HEIGHT}.`,
    "",
    `**${done.length} clips: ${mb(before)} → ${mb(after)} (${before ? Math.round((1 - after / before) * 100) : 0}% smaller).**`,
    "",
    "| Clip | Source | Before | After | Cap | VMAF | Upload |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(([key, r]) =>
      r.encoded
        ? `| ${key.replace("/videos/", "")} | ${r.width}×${r.height} ${mbps(r.srcBitrate)}${r.audio ? " +audio" : ""} | ${mb(r.srcSize)} | ${mb(r.outSize)} | ${r.rate} | ${r.vmaf?.toFixed(1) ?? "?"} | ${r.pass ? (r.uploaded ? "✓ uploaded" : "ready") : `✗ ${r.why}`} |`
        : `| ${key.replace("/videos/", "")} | ${r.width ? `${r.width}×${r.height} ${mbps(r.srcBitrate)}` : "—"} | ${r.srcSize ? mb(r.srcSize) : "—"} | — | — | — | – ${r.why ?? "not encoded"} |`,
    ),
  ];
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n");
}

// ── 1. inventory ─────────────────────────────────────────────────────────────
async function inventory() {
  const keys = NEW ? registryVideos() : referencedVideos();
  const rows = [];
  for (const key of keys) {
    const local = path.join(ROOT, "public", key);
    const localSize = fs.existsSync(local) ? fs.statSync(local).size : null;
    if (NEW && localSize === null) continue;
    const r2Size = await remoteSize(key);
    // --new: only what R2 lacks, or holds just a placeholder of.
    if (NEW && r2Size !== null && !(r2Size < 1e6 && localSize > 2e6)) continue;
    rows.push({ key, local: localSize !== null ? local : null, localSize, r2Size });
  }
  return rows;
}

// ── 2. encode ────────────────────────────────────────────────────────────────
/** Encode `src` capped at `maxrate`; returns { file, size, vmaf }. */
async function encodeAt(src, info, maxrate, out) {
  const tall = info.height > MAX_HEIGHT;
  const tmp = out.replace(/\.mp4$/, `.${maxrate}.part.mp4`);
  await run("ffmpeg", [
    "-y", "-v", "error", "-i", src,
    "-map", "0:v:0", "-an", // muted background loop: the audio track is never heard
    "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-crf", String(CRF), "-maxrate", maxrate, "-bufsize", `${parseFloat(maxrate) * 2}M`,
    ...(tall ? ["-vf", `scale=-2:${MAX_HEIGHT}:flags=lanczos`] : []),
    "-movflags", "+faststart", "-tag:v", "avc1",
    tmp,
  ]);
  // VMAF (perceptual, 0–100) against the source, at the source's size.
  const { err } = await run("ffmpeg", [
    "-v", "info", "-i", tmp, "-i", src, "-lavfi",
    `[0:v]scale=${info.width}:${info.height}:flags=bicubic,setpts=PTS-STARTPTS[d];[1:v]setpts=PTS-STARTPTS[r];[d][r]libvmaf=n_threads=4`,
    "-f", "null", "-",
  ]);
  const vmaf = Number((err.match(/VMAF score: ([\d.]+)/) || [])[1]);
  return { file: tmp, size: fs.statSync(tmp).size, vmaf };
}

async function encodeOne(row, report) {
  const { key } = row;
  const out = path.join(ENCODED, key);
  const prev = report[key];
  if (!FORCE && prev?.encoded && fs.existsSync(out)) return;
  if (row.r2Size === null && !NEW) {
    report[key] = { why: "not on R2 (the app gets a 404)" };
    return;
  }
  // Source: the local master if it is the file R2 has (or, --new, the master
  // being added), else R2's copy (kept in .media-work/originals as the backup
  // of what is being replaced).
  const src = row.local && (NEW || row.localSize === row.r2Size) ? row.local : path.join(ORIGINALS, key);
  if (src !== row.local && !fs.existsSync(src)) {
    process.stdout.write(`↓ ${key}\n`);
    await download(key, src);
  }
  const info = await probe(src);
  const outH = Math.min(info.height, MAX_HEIGHT);
  const srcSize = fs.statSync(src).size;
  fs.mkdirSync(path.dirname(out), { recursive: true });

  // Quality ladder: the lowest cap whose result still looks like the source
  // (VMAF ≥ target). Detailed, fast-moving scenes (palm leaves, grass) need
  // more; calm skies settle at the first rung.
  const ladder = (outH > 720 ? LADDER_1080 : LADDER_720).filter((r) => parseFloat(r) * 1e6 < info.bitrate * 0.9);
  process.stdout.write(`⚙ ${key}  ${info.width}×${info.height} ${mbps(info.bitrate)}  ladder ${ladder.join(" ") || "—"}\n`);
  let best = null;
  for (const rate of ladder) {
    const r = await encodeAt(src, info, rate, out);
    process.stdout.write(`    ${rate.padEnd(5)} ${mb(r.size).padStart(8)}  VMAF ${r.vmaf.toFixed(1)}\n`);
    if (best) fs.rmSync(best.file, { force: true });
    best = { ...r, rate };
    if (r.vmaf >= MIN_VMAF) break;
  }
  if (!best && NEW && info.codec === "h264") {
    // Already light: ship the master itself, just muted and faststart.
    await run("ffmpeg", ["-y", "-v", "error", "-i", src, "-map", "0:v:0", "-an", "-c:v", "copy", "-movflags", "+faststart", "-tag:v", "avc1", out]);
    const size = fs.statSync(out).size;
    report[key] = { encoded: true, src: path.relative(ROOT, src), width: info.width, height: info.height, duration: info.duration, audio: info.audio, srcBitrate: info.bitrate, srcSize, rate: "copy", outSize: size, outBitrate: Math.round((size * 8) / info.duration), vmaf: 100, pass: true, uploaded: false };
    process.stdout.write(`  ✓ already light: ${mb(srcSize)} → ${mb(size)} (copied, muted)\n`);
    return;
  }
  if (!best) {
    report[key] = { encoded: false, srcSize, srcBitrate: info.bitrate, width: info.width, height: info.height, why: "already light (no rung below its bitrate)" };
    process.stdout.write("  – already light, kept as is\n");
    return;
  }
  fs.renameSync(best.file, out);
  // A new clip replaces nothing worth keeping: it only has to look right.
  const smaller = NEW || best.size < srcSize * 0.8;
  const pass = smaller && best.vmaf >= MIN_VMAF;
  report[key] = {
    encoded: true,
    src: path.relative(ROOT, src),
    width: info.width,
    height: info.height,
    duration: info.duration,
    audio: info.audio,
    srcBitrate: info.bitrate,
    srcSize,
    rate: best.rate,
    outSize: best.size,
    outBitrate: Math.round((best.size * 8) / info.duration),
    vmaf: best.vmaf,
    pass,
    why: pass ? undefined : !smaller ? "under 20% smaller — not worth replacing" : `VMAF ${best.vmaf.toFixed(1)} < ${MIN_VMAF} even at ${best.rate}`,
    uploaded: false,
  };
  process.stdout.write(`  ${pass ? "✓" : "✗"} ${mb(srcSize)} → ${mb(best.size)} at ${best.rate}  VMAF ${best.vmaf.toFixed(1)}\n`);
}

// ── 3. upload ────────────────────────────────────────────────────────────────
async function upload(report) {
  const ready = Object.entries(report).filter(([key, r]) => r.pass && (FORCE || !r.uploaded) && (!ONLY || key.includes(ONLY)));
  if (!ready.length) {
    console.log("Nothing to upload (run --encode first, or everything is uploaded).");
    return;
  }
  const total = ready.reduce((a, [, r]) => a + r.outSize, 0);
  console.log(`${ready.length} clips, ${mb(total)} to upload${EXECUTE ? "" : " — DRY RUN (add --execute to upload)"}:`);
  for (const [key, r] of ready) console.log(`  ${key}  ${mb(r.srcSize)} → ${mb(r.outSize)}`);
  if (!EXECUTE) return;

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  const BUCKET = process.env.R2_BUCKET_NAME || "huda-quran-media";
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("✗ R2 credentials missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local).");
    process.exit(1);
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  for (const [key, r] of ready) {
    const file = path.join(ENCODED, key);
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key.replace(/^\//, ""),
        Body: fs.createReadStream(file),
        ContentLength: fs.statSync(file).size,
        ContentType: "video/mp4",
        CacheControl: "public, max-age=31536000, immutable", // same as upload-to-r2.mjs
      }),
    );
    // Confirm the public copy is the new file before marking it done.
    const live = await remoteSize(key);
    r.uploaded = live === r.outSize;
    console.log(`  ${r.uploaded ? "✓" : "✗ size mismatch on R2"} ${key}`);
    saveReport(report);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
need("ffprobe");
const rows = await inventory();
const missing = rows.filter((r) => r.r2Size === null);

if (MODE === "inventory") {
  let total = 0;
  if (NEW) {
    for (const r of rows) console.log(`${mb(r.localSize).padStart(9)}  ${r.r2Size === null ? "new        " : `R2 ${mb(r.r2Size)} placeholder`}  ${r.key}`);
    console.log(`\n${rows.length} new clips (local masters), ${mb(rows.reduce((a, r) => a + r.localSize, 0))}. Next: --new --encode.`);
    process.exit(0);
  }
  for (const r of rows) {
    if (r.r2Size === null) continue;
    total += r.r2Size;
    let info = "";
    try {
      const p = await probe(PUBLIC_R2 + r.key);
      info = `${p.width}×${p.height} ${p.duration.toFixed(0)}s ${mbps(p.bitrate)}${p.audio ? " +audio" : ""}`;
    } catch {
      info = "(probe failed)";
    }
    console.log(`${mb(r.r2Size).padStart(9)}  ${info.padEnd(30)} ${r.local ? "local" : "R2 only"}  ${r.key}`);
  }
  console.log(`\n${rows.length - missing.length} clips on R2, ${mb(total)} in total.`);
  if (missing.length) {
    console.log(`\n${missing.length} referenced in src/ but NOT on R2 (404 — the scene stays on its image):`);
    for (const r of missing) console.log(`  ${r.key}`);
  }
  console.log("\nNext: --encode (writes only to .media-work/).");
} else if (MODE === "encode") {
  need("ffmpeg");
  if (!execFileSync("ffmpeg", ["-hide_banner", "-filters"]).toString().includes("libvmaf")) {
    console.error("✗ this ffmpeg has no libvmaf (Homebrew's ffmpeg includes it).");
    process.exit(1);
  }
  const report = loadReport();
  await pool(rows, JOBS, async (row) => {
    try {
      await encodeOne(row, report);
    } catch (e) {
      report[row.key] = { why: `error: ${e.message.split("\n")[0]}` };
      console.error(`✗ ${row.key}: ${e.message}`);
    }
    saveReport(report);
  });
  saveReport(report);
  console.log(`\nReport: ${path.relative(ROOT, REPORT_MD)}  ·  encoded files: ${path.relative(ROOT, ENCODED)}/`);
  console.log("Next: review, then --upload (dry run) and --upload --execute.");
} else {
  await upload(loadReport());
}
