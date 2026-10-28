#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Thematic set registry (writes src/lib/data/surahSetVideos.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each pipeline Surah has thematic clips named
 *   videos/surah_<N>/set_<NN>_ayah_<from>-<to>.mp4
 * on R2. The app's resolvers never named them, so they were never shown. This
 * script reads the keys, takes each set's ayah range from its file name, and
 * writes the registry the background uses (getSetVideo). The same sets serve
 * a Juz too: the Juz background asks by Surah + ayah.
 *
 * A Surah is written only when its sets cover ayah 1 to its last ayah with no
 * gap and no overlap (verse counts from public/data/quran-verses/<N>.json);
 * otherwise it is reported and left out, so a half-uploaded Surah never ships.
 *
 *   node scripts/tools/surah-set-registry.mjs                  # keys from R2 (needs .env.local)
 *   node scripts/tools/surah-set-registry.mjs --source=local   # keys from public/videos/
 *   node scripts/tools/surah-set-registry.mjs --source=manifest # keys in videoManifest.ts
 *   … --check   exit 1 if the registry is out of date (writes nothing)
 *
 * After it changes: re-run video-manifest.mjs, then reencode-videos.mjs for
 * the new clips.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(ROOT, "src/lib/data/surahSetVideos.ts");
const argv = process.argv.slice(2);
const SOURCE = (argv.find((a) => a.startsWith("--source=")) ?? "--source=r2").slice(9);
const CHECK = argv.includes("--check");
const SET_KEY = /^videos\/surah_(\d+)\/set_(\d+)_ayah_(\d+)-(\d+)\.mp4$/;

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

async function r2Keys() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("✗ R2 credentials missing (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.local).");
    process.exit(1);
  }
  const { S3Client, ListObjectsV2Command } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME || "huda-quran-media",
      Prefix: "videos/surah_",
      ContinuationToken: token,
    }));
    for (const o of res.Contents ?? []) keys.push(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

function localKeys() {
  const base = path.join(ROOT, "public/videos");
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .filter((d) => /^surah_\d+$/.test(d))
    .flatMap((d) => fs.readdirSync(path.join(base, d)).map((f) => `videos/${d}/${f}`));
}

function manifestKeys() {
  const src = fs.readFileSync(path.join(ROOT, "src/lib/data/videoManifest.ts"), "utf8");
  return [...src.matchAll(/"\/(videos\/[^"]+\.mp4)"/g)].map((m) => m[1]);
}

const keys = SOURCE === "local" ? localKeys() : SOURCE === "manifest" ? manifestKeys() : await r2Keys();

// Group the set keys by Surah.
const bySurah = new Map();
for (const key of keys) {
  const m = key.match(SET_KEY);
  if (!m) continue;
  const [surah, set, from, to] = m.slice(1).map(Number);
  if (!bySurah.has(surah)) bySurah.set(surah, []);
  bySurah.get(surah).push({ set, from, to, path: `/${key}` });
}

function verseCount(surah) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, `public/data/quran-verses/${surah}.json`), "utf8")).length;
  } catch {
    return null;
  }
}

// Keep a Surah only when its sets tile 1..last ayah exactly.
const registry = {};
const skipped = [];
for (const surah of [...bySurah.keys()].sort((a, b) => a - b)) {
  const sets = bySurah.get(surah).sort((a, b) => a.from - b.from);
  const last = verseCount(surah);
  const problems = [];
  if (!last) problems.push("no verse data");
  let next = 1;
  for (const s of sets) {
    if (s.from > s.to) problems.push(`set ${s.set}: ${s.from}-${s.to} runs backwards`);
    else if (s.from > next) problems.push(`ayahs ${next}-${s.from - 1} have no set`);
    else if (s.from < next) problems.push(`set ${s.set} (${s.from}-${s.to}) overlaps ayah ${s.from}`);
    next = Math.max(next, s.to + 1);
  }
  if (last && next - 1 !== last) problems.push(next - 1 < last ? `ayahs ${next}-${last} have no set` : `sets run past ayah ${last}`);
  if (problems.length) {
    skipped.push({ surah, problems });
    continue;
  }
  registry[surah] = sets.map(({ from, to, path: p }) => ({ from, to, path: p }));
}

const surahs = Object.keys(registry).map(Number);
const clipCount = surahs.reduce((a, s) => a + registry[s].length, 0);
const body = `// GENERATED by scripts/tools/surah-set-registry.mjs — do not edit by hand.
// Thematic background sets per Surah (${surahs.length} Surahs, ${clipCount} clips): each covers an
// ayah range, and together they cover the whole Surah. The Surah and Juz
// backgrounds ask getSetVideo(surah, ayah). Re-run the script after uploading sets.

export interface SurahSetVideo {
  from: number;
  to: number;
  path: string;
}

export const SURAH_SET_VIDEOS: Readonly<Record<number, readonly SurahSetVideo[]>> = {
${surahs.map((s) => `  ${s}: [\n${registry[s].map((v) => `    { from: ${v.from}, to: ${v.to}, path: "${v.path}" },`).join("\n")}\n  ],`).join("\n")}
};

/** The set clip ("/videos/…" path) covering this ayah, or null when the Surah has no sets. */
export function getSetVideo(surah: number, ayah: number | null | undefined): string | null {
  const sets = SURAH_SET_VIDEOS[surah];
  if (!sets) return null;
  const a = ayah && ayah > 0 ? ayah : 1;
  return sets.find((s) => a >= s.from && a <= s.to)?.path ?? null;
}
`;

for (const { surah, problems } of skipped) console.log(`✗ Surah ${surah} left out: ${problems.join("; ")}`);
console.log(`${surahs.length} Surahs, ${clipCount} set clips (source: ${SOURCE}): ${surahs.join(", ") || "none"}`);

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
if (CHECK) {
  if (current !== body) {
    console.error("✗ src/lib/data/surahSetVideos.ts is out of date — re-run without --check.");
    process.exit(1);
  }
  console.log("✓ registry up to date");
} else if (current === body) {
  console.log("✓ registry unchanged");
} else {
  fs.writeFileSync(OUT, body);
  console.log(`✓ wrote ${path.relative(ROOT, OUT)}. Next: node scripts/tools/video-manifest.mjs`);
}
