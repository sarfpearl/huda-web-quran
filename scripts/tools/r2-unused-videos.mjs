#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — R2 videos the app never asks for (read-only audit)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The app requests only the clips in src/lib/data/videoManifest.ts (hasVideo);
 * every other object under videos/ on R2 is never shown, but still counts
 * against the 10 GB free tier. This lists the bucket and reports those objects
 * with their sizes, grouped by folder. It changes nothing on R2.
 *
 *   node scripts/tools/r2-unused-videos.mjs
 *
 * Writes .media-work/r2-unused.md (summary + every key) and r2-unused.json.
 * Needs the same R2 credentials as upload-to-r2.mjs (.env.local).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORK = path.join(ROOT, ".media-work");

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
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
const BUCKET = process.env.R2_BUCKET_NAME || "huda-quran-media";
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.error("✗ R2 credentials missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local).");
  process.exit(1);
}

const mb = (n) => (n / 1e6).toFixed(1) + " MB";
const gb = (n) => (n / 1e9).toFixed(2) + " GB";

// What the app can request: the manifest's "/videos/…" keys.
const manifest = fs.readFileSync(path.join(ROOT, "src/lib/data/videoManifest.ts"), "utf8");
// .mp4 only: the file's own comments mention "/videos/…" too.
const used = new Set([...manifest.matchAll(/"\/(videos\/[^"]+\.mp4)"/g)].map((m) => m[1]));
if (!used.size) {
  console.error("✗ no keys found in videoManifest.ts — refusing to call everything unused.");
  process.exit(1);
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

const all = [];
let token;
do {
  const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }));
  for (const o of res.Contents ?? []) all.push({ key: o.Key, size: o.Size });
  token = res.IsTruncated ? res.NextContinuationToken : undefined;
} while (token);

const total = all.reduce((a, o) => a + o.size, 0);
const videos = all.filter((o) => o.key.startsWith("videos/"));
const unused = videos.filter((o) => !used.has(o.key)).sort((a, b) => a.key.localeCompare(b.key));
const missing = [...used].filter((k) => !videos.some((o) => o.key === k));
const unusedBytes = unused.reduce((a, o) => a + o.size, 0);

// Group by folder (videos/surah_19/…, videos/surah/002-al-baqarah/…).
const groups = new Map();
for (const o of unused) {
  const dir = o.key.slice(0, o.key.lastIndexOf("/"));
  const g = groups.get(dir) ?? { count: 0, bytes: 0 };
  g.count++;
  g.bytes += o.size;
  groups.set(dir, g);
}
const byTop = [...groups].sort((a, b) => b[1].bytes - a[1].bytes);

const lines = [
  "# R2 videos the app never asks for",
  "",
  `Bucket \`${BUCKET}\`: ${all.length} objects, ${gb(total)}. Under videos/: ${videos.length} objects; the manifest names ${used.size}.`,
  "",
  `**${unused.length} unused video objects: ${gb(unusedBytes)}** (R2 after removing them: ${gb(total - unusedBytes)}).`,
  "",
  ...(missing.length ? [`⚠️ ${missing.length} manifest keys are NOT on R2: ${missing.join(", ")}`, ""] : []),
  "| Folder | Objects | Size |",
  "|---|---|---|",
  ...byTop.map(([dir, g]) => `| ${dir}/ | ${g.count} | ${mb(g.bytes)} |`),
  "",
  "## Every unused key",
  "",
  ...unused.map((o) => `- ${o.key}  ${mb(o.size)}`),
];
fs.mkdirSync(WORK, { recursive: true });
fs.writeFileSync(path.join(WORK, "r2-unused.md"), lines.join("\n") + "\n");
fs.writeFileSync(path.join(WORK, "r2-unused.json"), JSON.stringify({ bucket: BUCKET, totalBytes: total, unusedBytes, missing, unused }, null, 2));

console.log(lines.slice(0, 8 + (missing.length ? 2 : 0) + byTop.length).join("\n"));
console.log(`\nFull list: ${path.relative(ROOT, path.join(WORK, "r2-unused.md"))}  ·  nothing was changed on R2.`);
