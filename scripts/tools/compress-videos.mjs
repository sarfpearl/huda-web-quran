#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — High-Fidelity Video Compressor (FFmpeg libx264 CRF 21)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Compresses raw Veo MP4 videos (20-30 Mbps) down to web-optimized 3-5 Mbps
 * using H.264 CRF 21, preset slow, faststart.
 * Achieves ~75-85% size reduction while maintaining visually lossless 1080p quality.
 *
 * Usage:
 *   node scripts/tools/compress-videos.mjs --surah=4-9 --dry-run
 *   node scripts/tools/compress-videos.mjs --surah=4-9 --execute
 *   node scripts/tools/compress-videos.mjs --surah=4 --execute
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

const FFMPEG = fs.existsSync("/opt/homebrew/bin/ffmpeg")
  ? "/opt/homebrew/bin/ffmpeg"
  : fs.existsSync("/usr/local/bin/ffmpeg")
  ? "/usr/local/bin/ffmpeg"
  : "ffmpeg";

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const isDryRun = !isExecute;
const surahArg = args.find((a) => a.startsWith("--surah="));

let targetSurahs = [];
if (surahArg) {
  const val = surahArg.split("=")[1];
  if (val.toLowerCase() === "all") {
    targetSurahs = null; // all found
  } else if (val.includes("-")) {
    const [start, end] = val.split("-").map((v) => parseInt(v.trim(), 10));
    for (let s = start; s <= end; s++) targetSurahs.push(s);
  } else {
    targetSurahs = val.split(",").map((v) => parseInt(v.trim(), 10));
  }
} else {
  console.log("Please specify target surah(s), e.g. --surah=4-9 or --surah=all");
  process.exit(1);
}

console.log("================================================================================");
console.log(" 🎬 HuDa Web Quran — High-Fidelity Video Compression Tool (libx264 CRF 21)");
console.log("================================================================================");
console.log(` Mode: ${isDryRun ? "🛡️ DRY-RUN PREVIEW (No Changes)" : "🚨 LIVE EXECUTE (Compressing in-place)"}`);
console.log(` Target Surahs: ${targetSurahs ? targetSurahs.join(", ") : "ALL"}`);
console.log(` FFmpeg Binary: ${FFMPEG}`);
console.log("--------------------------------------------------------------------------------");

const surahDirs = fs
  .readdirSync(VIDEOS_DIR)
  .filter((d) => d.startsWith("surah_"))
  .sort((a, b) => parseInt(a.replace("surah_", ""), 10) - parseInt(b.replace("surah_", ""), 10));

let totalOriginalBytes = 0;
let totalCompressedBytes = 0;
let totalProcessedFiles = 0;

for (const dirName of surahDirs) {
  const surahNum = parseInt(dirName.replace("surah_", ""), 10);
  if (targetSurahs && !targetSurahs.includes(surahNum)) continue;

  const surahPath = path.join(VIDEOS_DIR, dirName);
  const setFiles = fs
    .readdirSync(surahPath)
    .filter((f) => f.startsWith("set_") && f.endsWith(".mp4") && !f.startsWith("raw_") && !f.startsWith("tmp_"))
    .sort();

  if (setFiles.length === 0) continue;

  console.log(`\n📁 Surah ${surahNum}: Found ${setFiles.length} Master Set Videos`);

  for (const file of setFiles) {
    const filePath = path.join(surahPath, file);
    const stat = fs.statSync(filePath);
    const origSize = stat.size;
    totalOriginalBytes += origSize;

    if (isDryRun) {
      // Estimate ~75% compression based on benchmarks
      const estComp = Math.round(origSize * 0.22);
      totalCompressedBytes += estComp;
      totalProcessedFiles++;
      console.log(
        `   [DRY-RUN] ${file.padEnd(35)} ${(origSize / 1024 / 1024).toFixed(2)} MB  →  ~${(estComp / 1024 / 1024).toFixed(2)} MB (Est. -78%)`
      );
      continue;
    }

    // Live compression
    const tempOut = path.join(surahPath, `tmp_${file}`);
    process.stdout.write(`   🔄 Compressing ${file} (${(origSize / 1024 / 1024).toFixed(2)} MB)... `);
    const startTime = Date.now();

    try {
      execSync(
        `"${FFMPEG}" -y -i "${filePath}" -c:v libx264 -crf 21 -preset slow -movflags +faststart -an "${tempOut}"`,
        { stdio: "pipe" }
      );

      const compStat = fs.statSync(tempOut);
      const compSize = compStat.size;

      if (compSize > 0 && compSize < origSize) {
        fs.renameSync(tempOut, filePath);
        totalCompressedBytes += compSize;
        const savedPct = (((origSize - compSize) / origSize) * 100).toFixed(1);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`✅ ${(compSize / 1024 / 1024).toFixed(2)} MB (-${savedPct}%) in ${elapsed}s`);

        // Parse set ayah range and update duplicate ayah files
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
      } else {
        console.log(`⚠️ No size benefit, keeping original.`);
        try { fs.unlinkSync(tempOut); } catch {}
        totalCompressedBytes += origSize;
      }
      totalProcessedFiles++;
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
      try { fs.unlinkSync(tempOut); } catch {}
      totalCompressedBytes += origSize;
    }
  }
}

console.log("\n================================================================================");
console.log(" 📊 COMPRESSION SUMMARY");
console.log("================================================================================");
console.log(` Total Files Checked       : ${totalProcessedFiles}`);
console.log(` Original Total Storage    : ${(totalOriginalBytes / 1024 / 1024 / 1024).toFixed(3)} GB (${(totalOriginalBytes / 1024 / 1024).toFixed(1)} MB)`);
console.log(` Compressed Total Storage  : ${(totalCompressedBytes / 1024 / 1024 / 1024).toFixed(3)} GB (${(totalCompressedBytes / 1024 / 1024).toFixed(1)} MB)`);
const totalSaved = totalOriginalBytes - totalCompressedBytes;
const totalSavedPct = totalOriginalBytes > 0 ? ((totalSaved / totalOriginalBytes) * 100).toFixed(1) : 0;
console.log(` Total Storage Saved       : ${(totalSaved / 1024 / 1024 / 1024).toFixed(3)} GB (${(totalSaved / 1024 / 1024).toFixed(1)} MB) [${totalSavedPct}% Saved]`);
console.log("================================================================================");
if (isDryRun) {
  console.log(" 🛡️  DRY-RUN COMPLETE — No files were modified.");
  console.log(" To perform the live compression in-place, run:");
  console.log(`   node scripts/tools/compress-videos.mjs --surah=${surahArg ? surahArg.split("=")[1] : "4-9"} --execute`);
  console.log("================================================================================");
}
