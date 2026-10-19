#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Automated Letterbox Remover & 16:9 Full Screen Enforcer
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Scans video files for top/bottom black bars (letterbox/pillarbox).
 * If detected, automatically crops the active content to true 16:9 and scales
 * to 1920x1080 edge-to-edge full screen with zero black bars, compressed with CRF 21.
 *
 * Usage:
 *   node scripts/tools/fix-letterboxing.mjs --surah=4 --execute
 *   node scripts/tools/fix-letterboxing.mjs --surah=4-9 --execute
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const VIDEOS_DIR = path.join(ROOT_DIR, "public/videos");

const FFMPEG = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const surahArg = args.find((a) => a.startsWith("--surah="));

let targetSurahs = [];
if (surahArg) {
  const val = surahArg.split("=")[1];
  if (val.toLowerCase() === "all") {
    targetSurahs = null;
  } else if (val.includes("-")) {
    const [start, end] = val.split("-").map((v) => parseInt(v.trim(), 10));
    for (let s = start; s <= end; s++) targetSurahs.push(s);
  } else {
    targetSurahs = val.split(",").map((v) => parseInt(v.trim(), 10));
  }
} else {
  console.log("Usage: node scripts/tools/fix-letterboxing.mjs --surah=4 --execute");
  process.exit(1);
}

console.log("================================================================================");
console.log(" 🔍 HuDa Web Quran — Letterbox Remover & 16:9 Full-Screen Enforcer");
console.log("================================================================================");
console.log(` Mode: ${isExecute ? "🚨 LIVE EXECUTE (Cropping & Scaling)" : "🛡️ DRY-RUN PREVIEW"}`);
console.log(` Target Surahs: ${targetSurahs ? targetSurahs.join(", ") : "ALL"}`);
console.log("--------------------------------------------------------------------------------");

const surahDirs = fs
  .readdirSync(VIDEOS_DIR)
  .filter((d) => d.startsWith("surah_"))
  .sort((a, b) => parseInt(a.replace("surah_", ""), 10) - parseInt(b.replace("surah_", ""), 10));

let fixedCount = 0;
let cleanCount = 0;

for (const dirName of surahDirs) {
  const surahNum = parseInt(dirName.replace("surah_", ""), 10);
  if (targetSurahs && !targetSurahs.includes(surahNum)) continue;

  const surahPath = path.join(VIDEOS_DIR, dirName);
  const setFiles = fs
    .readdirSync(surahPath)
    .filter((f) => f.startsWith("set_") && f.endsWith(".mp4") && !f.startsWith("tmp_") && !f.startsWith("raw_"))
    .sort();

  console.log(`\n📁 Checking Surah ${surahNum} (${setFiles.length} Master Sets)...`);

  for (const file of setFiles) {
    const filePath = path.join(surahPath, file);

    // Run cropdetect across multiple sample points
    let cropStr = "1920:1080:0:0";
    try {
      const out = execSync(
        `"${FFMPEG}" -ss 00:00:02 -i "${filePath}" -vframes 15 -vf cropdetect=24:2:0 -f null - 2>&1`,
        { stdio: "pipe" }
      ).toString();
      const matches = [...out.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)];
      if (matches.length > 0) {
        cropStr = matches[matches.length - 1][1];
      }
    } catch (e) {
      console.warn(`   ⚠️ Error detecting crop on ${file}:`, e.message);
      continue;
    }

    const [w, h, x, y] = cropStr.split(":").map(Number);
    const topBottomBars = 1080 - h;

    if (topBottomBars <= 16) {
      // Clean full-frame video
      cleanCount++;
      continue;
    }

    console.log(`   🚨 [Letterboxed] ${file.padEnd(35)} Active Area: ${w}x${h} (Top/Bottom bars: ${topBottomBars}px, y=${y})`);
    fixedCount++;

    if (!isExecute) {
      console.log(`      [DRY-RUN] Would crop to 16:9 and scale to 1920x1080 full frame`);
      continue;
    }

    // Calculate optimal 16:9 crop from the active content
    // Target ratio: 16:9
    const activeHeight = h;
    const neededWidth = Math.round((activeHeight * 16) / 9);
    // Ensure even width
    const evenWidth = neededWidth % 2 === 0 ? neededWidth : neededWidth - 1;
    const cropX = Math.max(0, Math.round(x + (w - evenWidth) / 2));
    const cropY = y;

    const filter = `crop=${evenWidth}:${activeHeight}:${cropX}:${cropY},scale=1920:1080:flags=lanczos`;
    const tempOut = path.join(surahPath, `fixed_${file}`);

    process.stdout.write(`      🔄 Cropping & Scaling to 100% borderless 16:9... `);
    const startTime = Date.now();

    try {
      execSync(
        `"${FFMPEG}" -y -i "${filePath}" -vf "${filter}" -c:v libx264 -crf 21 -preset slow -movflags +faststart -an "${tempOut}"`,
        { stdio: "pipe" }
      );

      const compStat = fs.statSync(tempOut);
      if (compStat.size > 0) {
        fs.renameSync(tempOut, filePath);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ Fixed! ${(compStat.size / 1024 / 1024).toFixed(2)} MB in ${elapsed}s`);

        // Relink ayah files
        const match = file.match(/set_\d+_ayah_(\d+)-(\d+)\.mp4/);
        if (match) {
          const startAyah = parseInt(match[1], 10);
          const endAyah = parseInt(match[2], 10);
          for (let a = startAyah; a <= endAyah; a++) {
            const ayahFile = path.join(surahPath, `ayah_${a}.mp4`);
            try {
              fs.copyFileSync(filePath, ayahFile);
            } catch {}
          }
        }
      }
    } catch (fixErr) {
      console.log(`❌ Failed: ${fixErr.message}`);
      try { fs.unlinkSync(tempOut); } catch {}
    }
  }
}

console.log("\n================================================================================");
console.log(" 📊 SUMMARY");
console.log("================================================================================");
console.log(` Clean 16:9 Full Frame Videos : ${cleanCount}`);
console.log(` Letterboxed Videos Found      : ${fixedCount}`);
console.log("================================================================================");
