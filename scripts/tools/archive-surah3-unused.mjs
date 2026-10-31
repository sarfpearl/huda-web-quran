#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — move Surah 3's unused videos out of public/videos
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Keeps in public/videos only the Surah 3 clips the app really requests (the
 * ones in src/lib/data/videoManifest.ts) and moves every other Surah 3 video
 * to `Unused Items/archive/Inbox/`, keeping its folder path (so
 * public/videos/surah_3/ayah_5.mp4 → Unused Items/archive/Inbox/surah_3/
 * ayah_5.mp4, where the pipeline still finds it — existingAyahClip()).
 *
 *   node scripts/tools/archive-surah3-unused.mjs             # list only (default)
 *   node scripts/tools/archive-surah3-unused.mjs --execute   # move them
 *
 * "Surah 3" = a folder named surah_3, 003 or 003-… anywhere under
 * public/videos. Never touched: the manifest's clips, public/videos/Inbox,
 * other Surahs, scratch/. Nothing is overwritten (a name already in the
 * archive is reported and skipped) and nothing is deleted: files are moved.
 * Ledger of a run: .media-work/surah3-archive-ledger.json.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const VIDEOS = path.join(ROOT, "public/videos");
const ARCHIVE = path.join(ROOT, "Unused Items/archive/Inbox");
const MANIFEST = path.join(ROOT, "src/lib/data/videoManifest.ts");
const LEDGER = path.join(ROOT, ".media-work/surah3-archive-ledger.json");
const execute = process.argv.includes("--execute");

const isSurah3 = (rel) =>
  rel.split(path.sep).some((s) => s === "surah_3" || s === "003" || s.startsWith("003-"));
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

if (!fs.existsSync(VIDEOS)) {
  console.error(`No ${VIDEOS} — run this on the Mac, inside the repo.`);
  process.exit(1);
}

// The clips the app requests: "/videos/…" paths in the generated manifest.
const live = new Set(
  [...fs.readFileSync(MANIFEST, "utf8").matchAll(/"\/videos\/([^"]+)"/g)].map((m) => m[1].split("/").join(path.sep)),
);
const liveSurah3 = [...live].filter(isSurah3);
if (liveSurah3.length === 0) {
  console.error("The manifest names no Surah 3 clip — stopping, nothing would be kept.");
  process.exit(1);
}

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (dir === VIDEOS && e.name === "Inbox") continue;
      yield* walk(full);
    } else if (e.isFile()) yield full;
  }
}

const keep = [];
const move = [];
const missing = liveSurah3.filter((rel) => !fs.existsSync(path.join(VIDEOS, rel)));
for (const full of walk(VIDEOS)) {
  const rel = path.relative(VIDEOS, full);
  if (!isSurah3(rel)) continue;
  (live.has(rel) ? keep : move).push({ rel, size: fs.statSync(full).size });
}

const total = move.reduce((a, f) => a + f.size, 0);
console.log(`Live Surah 3 clips in the manifest: ${liveSurah3.length}`);
console.log(`  kept in public/videos:           ${keep.length}${missing.length ? `  (${missing.length} missing locally — fine, they are on R2)` : ""}`);
console.log(`  to move to ${path.relative(ROOT, ARCHIVE)}: ${move.length} files, ${mb(total)}`);

const byFolder = new Map();
for (const f of move) {
  const d = path.dirname(f.rel);
  const g = byFolder.get(d) ?? { n: 0, size: 0 };
  g.n++;
  g.size += f.size;
  byFolder.set(d, g);
}
for (const [d, g] of [...byFolder].sort()) console.log(`    ${d}/  ${g.n} files, ${mb(g.size)}`);

if (!execute) {
  console.log("\nNothing moved. Run again with --execute to move these files.");
  process.exit(0);
}

const done = [];
const skipped = [];
for (const f of move) {
  const from = path.join(VIDEOS, f.rel);
  const to = path.join(ARCHIVE, f.rel);
  if (fs.existsSync(to)) {
    skipped.push({ rel: f.rel, why: "already in the archive" });
    continue;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch (e) {
    if (e.code !== "EXDEV") throw e; // another disk: copy, check the size, then remove
    fs.copyFileSync(from, to);
    if (fs.statSync(to).size !== f.size) throw new Error(`size mismatch copying ${f.rel}`);
    fs.unlinkSync(from);
  }
  if (!fs.existsSync(to) || fs.statSync(to).size !== f.size) throw new Error(`${f.rel} not at the destination`);
  done.push(f.rel);
}

// Folders the move left empty.
let removedDirs = 0;
for (const d of [...byFolder.keys()].sort((a, b) => b.length - a.length)) {
  const full = path.join(VIDEOS, d);
  if (fs.existsSync(full) && fs.readdirSync(full).length === 0) {
    fs.rmdirSync(full);
    removedDirs++;
  }
}

fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
fs.writeFileSync(LEDGER, JSON.stringify({ at: new Date().toISOString(), kept: keep.map((f) => f.rel), moved: done, skipped }, null, 2));
console.log(`\nMoved ${done.length} files (${mb(total)}), skipped ${skipped.length}, removed ${removedDirs} empty folders.`);
if (skipped.length) for (const s of skipped) console.log(`  skipped ${s.rel}: ${s.why}`);
console.log(`Ledger: ${path.relative(ROOT, LEDGER)}`);
