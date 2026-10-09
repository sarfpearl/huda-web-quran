#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VBR → CBR re-host of Word Sync reciter streams.
 *
 * Chromium (Chrome, Edge, Android) seeks a VBR MP3 through its 100-point Xing
 * table: after a seek `currentTime` says T while the voice plays up to ~14s
 * away (Abdul Basit 2 at 1229.86s played 1243.78s). The highlight follows
 * currentTime, so it ran ahead of / behind the voice after every jump (next
 * ayah, tap-to-seek, deep links). Safari seeks them exactly. A CBR file seeks
 * exactly everywhere, so the VBR masters are re-encoded to CBR — the same
 * recording, so the word timings stay valid — and served from R2 at
 * /audio/quran-cbr/<reciter>/<surah>.mp3.
 *
 * "VBR" = a Xing/VBRI header (18 of the 1026 Word Sync masters). Masters
 * tagged "Info" mix frame bitrates too (most of Hussary and Tunaiji) but
 * Chromium seeks them within 0.05s, measured — they need no copy.
 *
 *   1. node scripts/tools/cbr-audio.mjs                    inventory: which masters are VBR
 *   2. node scripts/tools/cbr-audio.mjs --encode           download + encode + verify (local only)
 *   3. node scripts/tools/cbr-audio.mjs --upload           (dry run)
 *      node scripts/tools/cbr-audio.mjs --upload --execute (uploads)
 *   4. node scripts/tools/cbr-audio.mjs --manifest         src/lib/data/cbrAudio.ts + timing audioUrl
 *      node scripts/tools/cbr-audio.mjs --prune [--execute]   delete R2 copies no longer needed
 *
 * Verify (step 2): the CBR file's duration matches the master's (±0.06s) and
 * its waveform lines up with the master's at three points (lag ≤ 50 ms,
 * corr ≥ 0.9), else it is not uploaded. Then re-run scripts/qa voice-match → repair-timings → sync-suite.
 *
 * Options: --only=hussary/2,tunaiji   --jobs=4   --force
 * Work files: .media-work/audio-cbr/ (git-ignored). R2 credentials as
 * upload-to-r2.mjs in .env.local. Each upload needs the owner's go-ahead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const WORK = path.join(ROOT, ".media-work", "audio-cbr");
const SRC_DIR = path.join(WORK, "vbr");
const OUT_DIR = path.join(WORK, "cbr");
const REPORT_JSON = path.join(WORK, "report.json");
const MANIFEST = path.join(ROOT, "src/lib/data/cbrAudio.ts");
const KEY = (r, s) => `/audio/quran-cbr/${r}/${s}.mp3`;

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const MODE = flag("upload") ? "upload" : flag("encode") ? "encode" : flag("manifest") ? "manifest" : flag("prune") ? "prune" : "inventory";
const EXECUTE = flag("execute");
const FORCE = flag("force");
const ONLY = opt("only", "") ? opt("only", "").split(",") : null;
const JOBS = Math.max(1, Number(opt("jobs", "4")));

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
// The app's own reciter data (the loader swaps global fetch for a test double;
// use the real one it keeps).
const { nativeFetch } = require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const fetch = nativeFetch;
const R = require(path.join(ROOT, "src/lib/data/quranReciters.ts"));
const { mediaUrl } = require(path.join(ROOT, "src/lib/media.ts"));

const mb = (n) => (n / 1e6).toFixed(1) + " MB";
const wanted = (r, s) => !ONLY || ONLY.some((o) => o === r || o === `${r}/${s}`);
const loadReport = () => (fs.existsSync(REPORT_JSON) ? JSON.parse(fs.readFileSync(REPORT_JSON, "utf8")) : {});
const saveReport = (rep) => {
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(rep, null, 1));
};

async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) await fn(items[i++]);
  }));
}

function run(cmd, args, { binary = false } = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args);
    const out = [];
    let err = "";
    p.stdout.on("data", (c) => out.push(c));
    p.stderr.on("data", (c) => (err += c));
    p.on("close", (code) => (code === 0 ? res(binary ? Buffer.concat(out) : Buffer.concat(out).toString()) : rej(new Error(`${cmd} ${code}: ${err.slice(0, 300)}`))));
  });
}

async function head(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok ? Number(r.headers.get("content-length")) : null;
  } catch {
    return null;
  }
}

// ── VBR detection: the Xing / VBRI / Info tag of the first frame ────────────
const BITRATES = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
async function inspect(url) {
  const r = await fetch(url, { headers: { Range: "bytes=0-131071" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const b = Buffer.from(await r.arrayBuffer());
  let off = 0;
  if (b.subarray(0, 3).toString() === "ID3") off = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  const rates = new Set();
  let i = off;
  let frames = 0;
  while (i < b.length - 4 && frames < 300) {
    if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) {
      const bi = (b[i + 2] >> 4) & 0xf;
      const si = (b[i + 2] >> 2) & 3;
      if (bi > 0 && bi < 15 && si < 3) {
        const sr = [44100, 48000, 32000][si];
        if (frames > 0) rates.add(BITRATES[bi]); // frame 0 carries the Xing/Info tag
        i += Math.floor((144000 * BITRATES[bi]) / sr) + ((b[i + 2] >> 1) & 1);
        frames++;
        continue;
      }
    }
    i++;
  }
  const tagArea = b.subarray(off, off + 3000).toString("latin1");
  const tag = tagArea.includes("Xing") ? "Xing" : tagArea.includes("VBRI") ? "VBRI" : tagArea.includes("Info") ? "Info" : "none";
  // Only a Xing/VBRI (VBR) header makes Chromium seek through the coarse TOC.
  // Masters tagged "Info" (Hussary, Tunaiji) mix frame bitrates too, yet
  // Chromium seeks them within 0.05s (measured): they stay on quranicaudio.
  return { vbr: tag === "Xing" || tag === "VBRI", tag, rates: [...rates].sort((x, y) => x - y) };
}

function jobs() {
  const out = [];
  for (const rec of R.QURAN_RECITERS) {
    if (!R.reciterHasWordTiming(rec)) continue;
    for (let s = 1; s <= 114; s++) if (wanted(rec.id, s)) out.push({ r: rec.id, s, url: R.reciterSourceUrl(rec, s) });
  }
  return out;
}

// ── encode + verify ──────────────────────────────────────────────────────────
async function probe(file) {
  const j = JSON.parse(await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,bit_rate:stream=sample_rate,channels", "-of", "json", file]));
  return { dur: Number(j.format.duration), br: Number(j.format.bit_rate), sr: Number(j.streams[0].sample_rate), ch: Number(j.streams[0].channels) };
}

/** [t, t+len) decoded by ffmpeg at 8 kHz mono. */
async function samples(file, t, len) {
  const raw = await run("ffmpeg", ["-v", "error", "-i", file, "-ss", String(t), "-t", String(len), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { binary: true });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
}

/**
 * Waveform lag of `b` against `a` (samples at 8 kHz, ±maxLag): the CBR copy of
 * the same decoded audio peaks at lag 0 with corr ≈ 1. Unlike an energy
 * envelope this also holds in quiet stretches.
 */
function waveLag(a, b, maxLag = 800) {
  const n = Math.min(a.length, b.length) - 2 * maxLag;
  if (n < 8000) return { lag: 0, corr: 1, quiet: true };
  let ea = 0;
  for (let k = maxLag; k < maxLag + n; k++) ea += a[k] * a[k];
  let best = { lag: 0, corr: -2 };
  for (let d = -maxLag; d <= maxLag; d++) {
    let c = 0;
    let eb = 0;
    for (let k = maxLag; k < maxLag + n; k++) {
      c += a[k] * b[k + d];
      eb += b[k + d] * b[k + d];
    }
    const r = c / Math.sqrt(ea * eb || 1);
    if (r > best.corr) best = { lag: d, corr: r };
  }
  if (ea / n < 1e-7) return { ...best, quiet: true }; // digital silence: nothing to compare
  return { lag: best.lag, corr: +best.corr.toFixed(4) };
}

async function encodeOne(job, rep) {
  const id = `${job.r}/${job.s}`;
  const x = rep[id];
  if (!x?.vbr) return;
  if (x.verified && !FORCE) return;
  const src = path.join(SRC_DIR, job.r, `${job.s}.mp3`);
  const out = path.join(OUT_DIR, job.r, `${job.s}.mp3`);
  fs.mkdirSync(path.dirname(src), { recursive: true });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!fs.existsSync(src) || FORCE) {
    const r = await fetch(job.url);
    if (!r.ok) throw new Error(`download HTTP ${r.status}`);
    fs.writeFileSync(src, Buffer.from(await r.arrayBuffer()));
  }
  const p = await probe(src);
  // The CBR rate at or above the master's average (re-encoding below it would
  // audibly lose quality), 96–192 kbps.
  const kbps = [96, 128, 160, 192].find((k) => k * 1000 >= p.br * 0.98) ?? 192;
  if (!fs.existsSync(out) || FORCE) {
    await run("ffmpeg", ["-v", "error", "-y", "-i", src, "-map_metadata", "-1", "-c:a", "libmp3lame", "-b:a", `${kbps}k`, "-ar", String(p.sr), "-ac", String(p.ch), "-write_xing", "1", out]);
  }
  const q = await probe(out);
  // Same timeline: waveforms peak within 50 ms (400 samples) at three points,
  // corr ≥ 0.9 (a lossy re-encode of the same audio is ≈ 0.99). Nearly every
  // file peaks at lag 0; a master with damaged frames (Hussary 6) drifts by
  // up to ~40 ms late in the file — below the timings' own 20–40 ms grain.
  const checks = [];
  for (const frac of [0.1, 0.5, 0.9]) {
    const t = Math.max(0, Math.min(p.dur - 10, p.dur * frac - 5));
    const [a, b] = await Promise.all([samples(src, t, 10), samples(out, t, 10)]);
    checks.push(waveLag(a, b));
  }
  const durDiff = +(q.dur - p.dur).toFixed(3);
  const ok = Math.abs(durDiff) <= 0.06 && checks.every((c) => c.quiet || (Math.abs(c.lag) <= 400 && c.corr >= 0.9));
  Object.assign(x, {
    kbps, srcBitrate: Math.round(p.br / 1000), srcSize: fs.statSync(src).size, size: fs.statSync(out).size,
    dur: +q.dur.toFixed(3), durDiff, checks, verified: ok, why: ok ? undefined : "timeline check failed",
  });
  console.log(`${ok ? "✓" : "✗"} ${id}  ${Math.round(p.br / 1000)} kbps VBR → ${kbps} kbps CBR  ${mb(x.srcSize)} → ${mb(x.size)}  Δdur ${durDiff}s  lag ${checks.map((c) => (c.quiet ? "quiet" : `${c.lag}@${c.corr}`)).join(" ")}`);
}

// ── upload ───────────────────────────────────────────────────────────────────
async function upload(rep) {
  const base = mediaUrl("/").replace(/\/$/, "");
  if (!/^https?:/.test(base)) {
    console.error("✗ NEXT_PUBLIC_MEDIA_BASE_URL is not set — nowhere to verify uploads.");
    process.exit(1);
  }
  const ready = Object.entries(rep).filter(([id, x]) => x.verified && (FORCE || !x.uploaded) && wanted(...id.split("/")));
  if (!ready.length) return console.log("Nothing to upload (run --encode first, or all uploaded).");
  console.log(`${ready.length} CBR files, ${mb(ready.reduce((a, [, x]) => a + x.size, 0))}${EXECUTE ? "" : " — DRY RUN (add --execute to upload)"}`);
  if (!EXECUTE) {
    for (const [id] of ready.slice(0, 10)) console.log(`  ${KEY(...id.split("/"))}`);
    if (ready.length > 10) console.log(`  … and ${ready.length - 10} more`);
    return;
  }
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("✗ R2 credentials missing in .env.local.");
    process.exit(1);
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const bucket = process.env.R2_BUCKET_NAME || "huda-quran-media";
  await pool(ready, 4, async ([id, x]) => {
    const [r, s] = id.split("/");
    const key = KEY(r, s);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key.replace(/^\//, ""),
      Body: fs.readFileSync(path.join(OUT_DIR, r, `${s}.mp3`)),
      ContentType: "audio/mpeg",
      CacheControl: "public, max-age=31536000, immutable", // as upload-to-r2.mjs
    }));
    x.uploaded = (await head(base + key)) === x.size;
    console.log(`  ${x.uploaded ? "✓" : "✗ size mismatch on R2"} ${key}`);
    saveReport(rep);
  });
}

// ── prune: remove R2 copies of masters that turned out not to need one ───────
async function prune(rep) {
  const extra = Object.entries(rep).filter(([id, x]) => x.uploaded && !x.vbr && wanted(...id.split("/")));
  if (!extra.length) return console.log("Nothing to prune.");
  console.log(`${extra.length} R2 copies of non-VBR masters${EXECUTE ? "" : " — DRY RUN (add --execute to delete)"}`);
  if (!EXECUTE) return extra.slice(0, 10).forEach(([id]) => console.log(`  ${KEY(...id.split("/"))}`));
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const bucket = process.env.R2_BUCKET_NAME || "huda-quran-media";
  const base = mediaUrl("/").replace(/\/$/, "");
  await pool(extra, 6, async ([id, x]) => {
    const key = KEY(...id.split("/"));
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key.replace(/^\//, "") }));
    x.uploaded = false;
    console.log(`  ${(await head(base + key)) === null ? "✓ removed" : "✗ still served (CDN cache?)"} ${key}`);
    saveReport(rep);
  });
}

// ── manifest: the app's list + each timing file's audioUrl ───────────────────
function manifest(rep) {
  const by = {};
  for (const [id, x] of Object.entries(rep)) {
    if (!x.uploaded || !x.vbr) continue;
    const [r, s] = id.split("/");
    (by[r] ??= []).push(Number(s));
  }
  for (const r of Object.keys(by)) by[r].sort((a, b) => a - b);
  const body = Object.keys(by).sort().map((r) => `  ${JSON.stringify(r)}: [${by[r].join(", ")}]`).join(",\n");
  fs.writeFileSync(MANIFEST, `/**
 * GENERATED by scripts/tools/cbr-audio.mjs — do not edit by hand.
 * Word Sync reciter × Surah streams whose master is a VBR MP3, re-encoded to
 * CBR and served from R2 at /audio/quran-cbr/<reciter>/<surah>.mp3 (Chromium
 * seeks VBR MP3s only approximately). Listed only once uploaded and verified.
 */
export const CBR_AUDIO: Record<string, number[]> = {${body ? `\n${body}\n` : ""}};
`);
  // The timing files name the stream they describe (QA streams audioUrl, and
  // sync-suite checks it equals the app's URL): point them at the CBR copy.
  let n = 0;
  for (const [r, list] of Object.entries(by)) {
    for (const s of list) {
      const f = path.join(ROOT, "public/data/quran-timings", r, `${s}.json`);
      const d = JSON.parse(fs.readFileSync(f, "utf8"));
      const url = mediaUrl(KEY(r, s));
      if (d.audioUrl === url) continue;
      d.sourceAudioUrl ??= d.audioUrl;
      d.audioUrl = url;
      fs.writeFileSync(f, JSON.stringify(d));
      n++;
    }
  }
  // A stream no longer listed goes back to its master.
  let back = 0;
  for (const [id, x] of Object.entries(rep)) {
    const [r, s] = id.split("/");
    if (by[r]?.includes(Number(s))) continue;
    const f = path.join(ROOT, "public/data/quran-timings", r, `${s}.json`);
    if (!fs.existsSync(f)) continue;
    const d = JSON.parse(fs.readFileSync(f, "utf8"));
    if (!d.sourceAudioUrl) continue;
    d.audioUrl = d.sourceAudioUrl;
    delete d.sourceAudioUrl;
    fs.writeFileSync(f, JSON.stringify(d));
    back++;
  }
  console.log(`cbrAudio.ts: ${Object.values(by).reduce((a, l) => a + l.length, 0)} streams · ${n} timing files repointed · ${back} back on their master.`);
}

// ── main ─────────────────────────────────────────────────────────────────────
const rep = loadReport();
if (MODE === "inventory") {
  const list = jobs();
  await pool(list, 16, async (j) => {
    try {
      const i = await inspect(j.url);
      rep[`${j.r}/${j.s}`] = { ...(rep[`${j.r}/${j.s}`] ?? {}), url: j.url, ...i };
    } catch (e) {
      rep[`${j.r}/${j.s}`] = { url: j.url, error: e.message };
    }
  });
  saveReport(rep);
  const by = {};
  for (const [id, x] of Object.entries(rep)) if (x.vbr) (by[id.split("/")[0]] ??= []).push(Number(id.split("/")[1]));
  for (const [r, l] of Object.entries(by)) console.log(`${r.padEnd(11)} ${l.length} VBR: ${l.sort((a, b) => a - b).join(" ")}`);
  console.log(`${Object.values(rep).filter((x) => x.vbr).length} VBR masters of ${list.length}. Next: --encode`);
} else if (MODE === "encode") {
  const list = jobs().filter((j) => rep[`${j.r}/${j.s}`]?.vbr);
  await pool(list, JOBS, async (j) => {
    try {
      await encodeOne(j, rep);
    } catch (e) {
      rep[`${j.r}/${j.s}`].why = `error: ${e.message.split("\n")[0]}`;
      console.log(`✗ ${j.r}/${j.s} ${e.message.split("\n")[0]}`);
    }
    saveReport(rep);
  });
  const v = Object.values(rep).filter((x) => x.vbr);
  console.log(`${v.filter((x) => x.verified).length}/${v.length} verified · CBR ${mb(v.reduce((a, x) => a + (x.size ?? 0), 0))}. Next: --upload`);
} else if (MODE === "upload") {
  await upload(rep);
} else if (MODE === "prune") {
  await prune(rep);
} else {
  manifest(rep);
}
