#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Scene images to WebP for R2
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The Surah / Juz scene images on R2 are 2560×1440 JPEGs of ~1 MB, shown full
 * screen behind the ayah (and preloaded for the next / previous Surah). WebP
 * holds the same picture in far fewer bytes, and every browser HuDa supports
 * decodes it (Safari 14+, 2020). This makes a .webp beside every .jpg the app
 * uses — same key, new extension — and uploads it. The JPEGs stay on R2
 * untouched (old caches, link previews); the app switches by pointing
 * quranImageUrl / quranThumbUrl (src/lib/data/quran.ts) at .webp, which must
 * only deploy AFTER the upload.
 *
 * Images: 114 Surah + 30 Juz scenes, and their 320px list thumbnails — the
 * exact URLs from the app's own quranImageUrl / quranThumbUrl.
 *
 * Steps (safe to re-run; finished files are skipped):
 *   1. node scripts/tools/webp-images.mjs
 *        Inventory: each JPEG's size on R2, and whether a .webp exists yet.
 *   2. node scripts/tools/webp-images.mjs --encode
 *        Downloads the JPEGs to .media-work/images/jpg/, encodes WebP into
 *        .media-work/images/webp/, checks each against its JPEG (SSIM), writes
 *        .media-work/images/report.md. Uploads nothing.
 *   3. node scripts/tools/webp-images.mjs --upload            (dry run)
 *      node scripts/tools/webp-images.mjs --upload --execute  (uploads)
 *        Uploads the .webp files that passed (smaller + SSIM ≥ --min-ssim).
 *
 * Options:
 *   --only=<substring>   e.g. --only=thumbs, --only=036-ya-sin
 *   --q=82               WebP quality for scenes; default 82
 *   --q-thumb=85         … for thumbnails; default 85 (80 dipped under SSIM 0.97)
 *   --min-ssim=0.97      upload threshold; default 0.97
 *   --jobs=4             parallel encodes; default 4
 *   --force              redo encodes / uploads
 *
 * Needs: sharp (devDependency), ffmpeg (SSIM). Upload: the R2 credentials of
 * upload-to-r2.mjs in .env.local.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const WORK = path.join(ROOT, ".media-work", "images");
const JPG_DIR = path.join(WORK, "jpg");
const WEBP_DIR = path.join(WORK, "webp");
const REPORT_JSON = path.join(WORK, "report.json");
const REPORT_MD = path.join(WORK, "report.md");

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => {
  const a = argv.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : d;
};
const MODE = flag("upload") ? "upload" : flag("encode") ? "encode" : "inventory";
const EXECUTE = flag("execute");
const FORCE = flag("force");
const ONLY = opt("only", "");
const Q = Number(opt("q", "82"));
const Q_THUMB = Number(opt("q-thumb", "85"));
const MIN_SSIM = Number(opt("min-ssim", "0.97"));
const JOBS = Math.max(1, Number(opt("jobs", "4")));

// The app's own URL builders (loads .env.local's NEXT_PUBLIC_MEDIA_BASE_URL).
// The loader swaps global fetch for a test double (external URLs → 503); use
// the real one it keeps.
const { nativeFetch } = require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const fetch = nativeFetch;
const { quranImageUrl, quranThumbUrl } = require(path.join(ROOT, "src/lib/data/quran.ts"));
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

const kb = (n) => (n / 1024).toFixed(0) + " KB";
const mb = (n) => (n / 1e6).toFixed(1) + " MB";

/** [{ key: "/assets/images/surah/036-ya-sin.jpg", url, thumb }] */
function images() {
  const out = [];
  // The app asks for .webp now; the source is the .jpg beside it.
  const add = (url, thumb) => {
    const u = new URL(url);
    const key = u.pathname.replace(/\.webp$/i, ".jpg");
    out.push({ key, url: u.origin + key, base: u.origin, thumb });
  };
  for (let n = 1; n <= 114; n++) {
    add(quranImageUrl("surah", n), false);
    add(quranThumbUrl("surah", n), true);
  }
  for (let n = 1; n <= 30; n++) {
    add(quranImageUrl("juz", n), false);
    add(quranThumbUrl("juz", n), true);
  }
  return out.filter((i) => !ONLY || i.key.includes(ONLY));
}
const webpKey = (key) => key.replace(/\.jpe?g$/i, ".webp");

async function head(url) {
  const res = await fetch(url, { method: "HEAD" });
  return res.ok ? Number(res.headers.get("content-length")) : null;
}

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (c) => (c === 0 ? resolve(err) : reject(new Error(err.slice(-400)))));
  });
}

async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (q.length) await fn(q.shift());
  }));
}

const loadReport = () => {
  try {
    return JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
  } catch {
    return {};
  }
};
function saveReport(r) {
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(r, null, 2));
  const rows = Object.entries(r).sort(([a], [b]) => a.localeCompare(b));
  const done = rows.filter(([, x]) => x.webpSize);
  const sum = (k, f) => done.filter(([key]) => f(key)).reduce((a, [, x]) => a + x[k], 0);
  const scene = (k) => !k.includes("/thumbs/");
  const lines = [
    "# Scene images → WebP",
    "",
    `Settings: q ${Q} (scenes) / ${Q_THUMB} (thumbs), SSIM ≥ ${MIN_SSIM} to upload.`,
    "",
    `**Scenes: ${mb(sum("jpgSize", scene))} → ${mb(sum("webpSize", scene))} · thumbnails: ${mb(sum("jpgSize", (k) => !scene(k)))} → ${mb(sum("webpSize", (k) => !scene(k)))}** (${done.length} images)`,
    "",
    "| Image | JPEG | WebP | SSIM | Upload |",
    "|---|---|---|---|---|",
    ...rows.map(([k, x]) =>
      x.webpSize
        ? `| ${k.replace("/assets/images/", "")} | ${kb(x.jpgSize)} | ${kb(x.webpSize)} | ${x.ssim.toFixed(4)} | ${x.pass ? (x.uploaded ? "✓ uploaded" : "ready") : `✗ ${x.why}`} |`
        : `| ${k.replace("/assets/images/", "")} | — | — | — | ✗ ${x.why} |`,
    ),
  ];
  fs.writeFileSync(REPORT_MD, lines.join("\n") + "\n");
}

async function encodeOne(img, report) {
  const jpg = path.join(JPG_DIR, img.key);
  const webp = path.join(WEBP_DIR, webpKey(img.key));
  if (!FORCE && report[img.key]?.webpSize && fs.existsSync(webp)) return;
  if (!fs.existsSync(jpg)) {
    const res = await fetch(img.url);
    if (!res.ok) {
      report[img.key] = { why: `JPEG not on R2 (HTTP ${res.status})` };
      return;
    }
    fs.mkdirSync(path.dirname(jpg), { recursive: true });
    fs.writeFileSync(jpg, Buffer.from(await res.arrayBuffer()));
  }
  const sharp = require("sharp");
  fs.mkdirSync(path.dirname(webp), { recursive: true });
  // Same pixels, same size; smart_subsample keeps colour edges (gold, sky) crisp.
  await sharp(jpg).webp({ quality: img.thumb ? Q_THUMB : Q, effort: 6, smartSubsample: true }).toFile(webp);
  const err = await run("ffmpeg", ["-v", "info", "-i", webp, "-i", jpg, "-lavfi", "ssim", "-f", "null", "-"]);
  const ssim = Number((err.match(/All:([\d.]+)/) || [])[1]);
  const jpgSize = fs.statSync(jpg).size;
  const webpSize = fs.statSync(webp).size;
  const pass = webpSize < jpgSize && ssim >= MIN_SSIM;
  report[img.key] = {
    jpgSize,
    webpSize,
    ssim,
    pass,
    why: pass ? undefined : webpSize >= jpgSize ? "not smaller" : `SSIM ${ssim.toFixed(4)} < ${MIN_SSIM}`,
    uploaded: false,
  };
  process.stdout.write(`${pass ? "✓" : "✗"} ${img.key}  ${kb(jpgSize)} → ${kb(webpSize)}  SSIM ${ssim.toFixed(4)}\n`);
}

async function upload(report, base) {
  const ready = Object.entries(report).filter(([k, x]) => x.pass && (FORCE || !x.uploaded) && (!ONLY || k.includes(ONLY)));
  if (!ready.length) return console.log("Nothing to upload (run --encode first, or all uploaded).");
  console.log(`${ready.length} WebP files, ${mb(ready.reduce((a, [, x]) => a + x.webpSize, 0))}${EXECUTE ? "" : " — DRY RUN (add --execute to upload)"}`);
  if (!EXECUTE) {
    for (const [k, x] of ready.slice(0, 10)) console.log(`  ${webpKey(k)}  ${kb(x.webpSize)}`);
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
  await pool(ready, 6, async ([k, x]) => {
    const key = webpKey(k);
    const file = path.join(WEBP_DIR, key);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key.replace(/^\//, ""),
      Body: fs.readFileSync(file),
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable", // as upload-to-r2.mjs
    }));
    x.uploaded = (await head(base + key)) === x.webpSize;
    console.log(`  ${x.uploaded ? "✓" : "✗ size mismatch on R2"} ${key}`);
    saveReport(report);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
const list = images();
const base = list[0]?.base;
if (MODE === "inventory") {
  let jpgTotal = 0;
  let missing = 0;
  let haveWebp = 0;
  for (const img of list) {
    const [j, w] = await Promise.all([head(img.url), head(img.base + webpKey(img.key))]);
    if (j === null) missing++;
    else jpgTotal += j;
    if (w !== null) haveWebp++;
  }
  console.log(`${list.length} images (${list.filter((i) => !i.thumb).length} scenes, ${list.filter((i) => i.thumb).length} thumbnails): JPEG ${mb(jpgTotal)} on R2.`);
  console.log(`${missing} JPEGs missing on R2 · ${haveWebp} already have a .webp.`);
  console.log("Next: --encode (writes only to .media-work/images/).");
} else if (MODE === "encode") {
  const report = loadReport();
  await pool(list, JOBS, async (img) => {
    try {
      await encodeOne(img, report);
    } catch (e) {
      report[img.key] = { why: `error: ${e.message.split("\n")[0]}` };
      console.error(`✗ ${img.key}: ${e.message}`);
    }
  });
  saveReport(report);
  console.log(`\nReport: ${path.relative(ROOT, REPORT_MD)}`);
} else {
  await upload(loadReport(), base);
}
