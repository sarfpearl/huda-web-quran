#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Targeted Rework for Surah 4 (Sets 15 & 25)
 *  Removes filmstrip borders and purple artifacts, with optimal compression
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SURAH_MEANING_OVERRIDES } from "./surah-meaning-overrides.mjs";
import { PIPELINE_CONFIG, buildReviewPage } from "./automated-quran-video-pipeline.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const SURAH_NUM = 4;
const TARGET_SETS = [15, 25];

const surah4Overrides = SURAH_MEANING_OVERRIDES[SURAH_NUM];
if (!surah4Overrides) {
  console.error("❌ Surah 4 overrides not found!");
  process.exit(1);
}

const setsToRework = surah4Overrides.filter((s) => TARGET_SETS.includes(s.setIndex));

console.log("======================================================================");
console.log(`🎬 Reworking Surah ${SURAH_NUM} Sets: ${TARGET_SETS.join(", ")}`);
console.log("======================================================================");

const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
const ai = new GoogleGenAI({
  vertexai: true,
  project: PIPELINE_CONFIG.projectId,
  location: PIPELINE_CONFIG.location,
});

const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${SURAH_NUM}`);
const ffmpegPath = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";

const activeOps = [];

for (const s of setsToRework) {
  const fileName = `set_${String(s.setIndex).padStart(2, "0")}_ayah_${s.startAyah}-${s.endAyah}.mp4`;
  const rawTargetFile = path.join(surahDir, `raw_${fileName}`);
  const finalTargetFile = path.join(surahDir, fileName);

  console.log(`\n🚀 Submitting Veo 3.1 Fast for Set ${s.setIndex} (Ayahs ${s.startAyah}-${s.endAyah})...`);
  console.log(`   Theme: ${s.name}`);
  console.log(`   Prompt: ${s.prompt.slice(0, 110)}...`);

  try {
    const op = await ai.models.generateVideos({
      model: PIPELINE_CONFIG.model,
      source: { prompt: s.prompt },
      config: {
        aspectRatio: PIPELINE_CONFIG.aspectRatio,
        durationSeconds: PIPELINE_CONFIG.durationSec,
        resolution: PIPELINE_CONFIG.resolution,
      },
    });

    console.log(`   ✓ Submitted! Operation Name: ${op.name}`);
    activeOps.push({
      set: s,
      fileName,
      rawTargetFile,
      finalTargetFile,
      operationName: op.name,
      done: false,
    });
  } catch (err) {
    console.error(`   ❌ Failed to submit Set ${s.setIndex}:`, err.message);
  }

  await new Promise((r) => setTimeout(r, 600));
}

console.log(`\n⏳ Polling progress for ${activeOps.length} set operations concurrently...`);
let pollRound = 0;
const startTime = Date.now();

while (activeOps.some((o) => !o.done)) {
  pollRound++;
  await new Promise((r) => setTimeout(r, 7000));
  const pendingCount = activeOps.filter((o) => !o.done).length;
  process.stdout.write(`  [Poll #${pollRound} @ ${pollRound * 7}s] ${pendingCount}/${activeOps.length} rendering in background... \r`);

  for (const item of activeOps) {
    if (item.done) continue;
    try {
      const queryOp = new GenerateVideosOperation();
      queryOp.name = item.operationName;
      const updated = await ai.operations.getVideosOperation({ operation: queryOp });

      if (updated.done) {
        item.done = true;
        if (updated.error) {
          console.error(`\n  ❌ Set ${item.set.setIndex} failed:`, updated.error);
        } else {
          const vid = updated.response?.generatedVideos?.[0]?.video;
          const rawBytes = vid?.videoBytes || vid?.bytesBase64Encoded;
          if (rawBytes) {
            const buf = Buffer.from(rawBytes, "base64");
            fs.writeFileSync(item.rawTargetFile, buf);
            console.log(`\n  ✅ Raw Set ${item.set.setIndex} received! (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);

            // Compress with FFmpeg: H.264 CRF 21, preset slow, faststart (visually lossless, 80% smaller)
            console.log(`     🔄 Compressing with FFmpeg (CRF 21, web-optimized)...`);
            try {
              execSync(
                `"${ffmpegPath}" -y -i "${item.rawTargetFile}" -c:v libx264 -crf 21 -preset slow -movflags +faststart -an "${item.finalTargetFile}"`,
                { stdio: "pipe" }
              );
              const compSize = fs.statSync(item.finalTargetFile).size;
              console.log(`     ✅ Compressed Set ${item.set.setIndex} ready: ${(compSize / 1024 / 1024).toFixed(2)} MB (Saved ${(((buf.length - compSize) / buf.length) * 100).toFixed(1)}%)`);
              // Clean up raw
              try { fs.unlinkSync(item.rawTargetFile); } catch {}
            } catch (cmpErr) {
              console.warn(`     ⚠️ Compression failed, using raw:`, cmpErr.message);
              fs.renameSync(item.rawTargetFile, item.finalTargetFile);
            }

            // Link to ayahs
            for (let a = item.set.startAyah; a <= item.set.endAyah; a++) {
              const ayahPath = path.join(surahDir, `ayah_${a}.mp4`);
              try {
                fs.copyFileSync(item.finalTargetFile, ayahPath);
              } catch {}
            }
            console.log(`     ↳ Linked updated video to Ayahs ${item.set.startAyah}-${item.set.endAyah}.`);
          }
        }
      }
    } catch (pollErr) {
      // transient network retry
    }
  }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n✨ All reworked sets completed in ${elapsed}s!`);

// Rebuild review_surah_4.html
console.log("\n📄 Rebuilding review_surah_4.html...");
const versesFile = path.join(PIPELINE_CONFIG.quranVersesDir, `surah_${SURAH_NUM}.json`);
if (fs.existsSync(versesFile)) {
  const versesData = JSON.parse(fs.readFileSync(versesFile, "utf8"));
  const verses = versesData.verses || versesData;
  buildReviewPage(SURAH_NUM, verses, {});
  console.log(`   ✓ Updated: file://${path.join(ROOT_DIR, `review_surah_${SURAH_NUM}.html`)}`);
}

console.log("\n🎉 Surah 4 Rework Complete!");
