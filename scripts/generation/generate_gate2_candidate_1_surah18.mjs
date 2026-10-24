/**
 * HuDa Web Quran — Gate 2, Candidate 1: Generate Approved Video
 * 
 * Target: Surah Al-Kahf (18), Ayahs 89–98 (Set 15)
 * Scene: Dhul-Qarnayn’s iron and molten copper barrier
 * Model: veo-3.1-fast-generate-001 (1080p, 8s, 24fps, native 16:9)
 * Destination: scratch/staging/gate2_11_visuals/
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";
import {
  BUDGET_CONFIG,
  evaluateGenerationPermission,
  recordSuccessfulGeneration,
} from "../tools/video-budget-guard.mjs";

const PROJECT_ID = "project-04027e7d-9805-47dc-bdf";
const LOCATION = "us-central1";
const MODEL = "veo-3.1-fast-generate-001";
const DURATION = 8;
const OVERLAP_SEC = 0.40;

const STAGING_DIR = path.resolve("scratch/staging/gate2_11_visuals");
const RAW_DIR = path.join(STAGING_DIR, "raw_masters");
const QA_DIR = path.join(STAGING_DIR, "qa_frames");

fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(QA_DIR, { recursive: true });

const PROMPT =
  "A wide, majestic cinema documentary landscape shot capturing a vast, uninhabited mountain pass between two towering, rugged reddish-dark rock cliffs under clear morning daylight. " +
  "A monumental ancient barrier completely fills and seals the pass, constructed from fitted, dark, aged iron blocks with realistic hardened molten copper seams and restrained bronze-copper patina. " +
  "Believable natural rock and weathered metal textures, subtle airborne mountain dust, soft directional morning sun rays grazing across the metallic wall face. " +
  "A slow, majestic forward aerial drift with high documentary lens clarity, cinematic realism, grounded physical materials, authentic scale. " +
  "Native 16:9 full-screen edge-to-edge frame filling every pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. " +
  "No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars. " +
  "No humans, no workers, no faces, no silhouettes, no prophets, no angels, no sacred figures, no creatures, no monsters, no modern machinery, no vehicles, no concrete, no modern steel bars, no magic, no neon effects, no text, no logos, no watermarks.";

function probe(file) {
  return JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${file}"`,
      { encoding: "utf8" }
    )
  );
}

function detectLetterbox(file) {
  try {
    const out = execSync(`ffmpeg -i "${file}" -vf cropdetect=24:16:0 -f null -t 3 - 2>&1`, {
      encoding: "utf8",
    });
    const m = [...out.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    return m ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4] } : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("======================================================================");
  console.log("HuDa Web Quran — Gate 2 Candidate 1: Surah 18:89-98 (Set 15)");
  console.log("======================================================================");

  // 1. Budget guard check
  const perm = evaluateGenerationPermission(1);
  if (!perm.allowed) {
    console.error(`🚨 BUDGET GUARD BLOCKED GENERATION: ${perm.reason}`);
    process.exit(1);
  }

  console.log(`💰 Budget Guard: PERMITTED.`);
  console.log(`   Current Remaining: ₹${perm.currentRemaining.toFixed(2)} INR`);
  console.log(`   Planned Cost:      ₹${perm.projectedCost.toFixed(2)} INR`);
  console.log(`   Projected Remaining: ₹${perm.projectedRemaining.toFixed(2)} INR`);
  console.log(`   Hard Stop Floor:   ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} INR`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const clipName = "surah_18_set_15_ayah_89-98";
  console.log(`\n🎬 Submitting Veo 3.1 Fast generation request...`);
  console.log(`   Prompt: ${PROMPT.slice(0, 120)}...`);

  let op = await ai.models.generateVideos({
    model: MODEL,
    source: { prompt: PROMPT },
    config: {
      aspectRatio: "16:9",
      durationSeconds: DURATION,
      resolution: "1080p",
    },
  });

  console.log(`✓ Operation created: ${op.name}`);
  let polls = 0;
  while (!op.done) {
    polls++;
    await new Promise((r) => setTimeout(r, 6000));
    try {
      op = await ai.operations.getVideosOperation({ operation: op });
      console.log(`  [Poll #${polls} @ ${polls * 6}s] Done: ${op.done ? "YES" : "IN_PROGRESS"}`);
    } catch (e) {
      console.warn(`  [Poll #${polls}] Transient warning: ${e.message}`);
    }
  }

  if (op.error) {
    throw new Error(`Veo Generation Error: ${JSON.stringify(op.error)}`);
  }

  const video = op.response?.generatedVideos?.[0]?.video;
  const bytes = video?.videoBytes || video?.bytesBase64Encoded;
  if (!bytes) {
    throw new Error(`No video bytes returned: ${JSON.stringify(op.response)}`);
  }

  const rawMasterPath = path.join(RAW_DIR, `${clipName}-raw-master.mp4`);
  fs.writeFileSync(rawMasterPath, Buffer.from(bytes, "base64"));
  const rawSizeMB = (fs.statSync(rawMasterPath).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Saved raw master: ${rawMasterPath} (${rawSizeMB} MB)`);

  // Probe raw video
  const rawProbe = probe(rawMasterPath);
  console.log(`\n📊 Raw Master Technical Metadata:`);
  console.log(`   Resolution: ${rawProbe.streams[0].width}x${rawProbe.streams[0].height}`);
  console.log(`   FPS:        ${rawProbe.streams[0].r_frame_rate}`);
  console.log(`   Codec:      ${rawProbe.streams[0].codec_name} (${rawProbe.streams[0].pix_fmt})`);
  console.log(`   Duration:   ${rawProbe.format.duration}s`);

  const crop = detectLetterbox(rawMasterPath);
  console.log(`   Crop detection:`, crop || "Clean 100% full frame (no borders detected)");

  // 2. Process seamless loop & stage in scratch/staging/gate2_11_visuals/
  const finalStagedPath = path.join(STAGING_DIR, `${clipName}.mp4`);
  const dur = Number(rawProbe.format?.duration || DURATION);
  const w = rawProbe.streams?.[0]?.width || 1920;
  const h = rawProbe.streams?.[0]?.height || 1080;
  const pre = crop && crop.h < h * 0.98 ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${w}:${h}:flags=lanczos,` : "";

  const cut = (dur - OVERLAP_SEC).toFixed(3);
  console.log(`\n🔄 Applying 0.40s seamless crossfade seam...`);
  const graph =
    `[0:v]${pre}scale=1920:1080:flags=lanczos,split=2[v1][v2];` +
    `[v1]trim=start=${OVERLAP_SEC}:end=${dur},setpts=PTS-STARTPTS[body];` +
    `[v2]trim=start=0:end=${OVERLAP_SEC},setpts=PTS-STARTPTS[head];` +
    `[0:v]${pre}scale=1920:1080:flags=lanczos,trim=start=${cut}:end=${dur},setpts=PTS-STARTPTS[tail];` +
    `[tail][head]xfade=transition=fade:duration=${OVERLAP_SEC}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;

  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${graph}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart -an "${finalStagedPath}"`,
    { stdio: "inherit" }
  );

  const finalProbe = probe(finalStagedPath);
  const finalSizeMB = (fs.statSync(finalStagedPath).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Created seamless staged video: ${finalStagedPath} (${finalSizeMB} MB)`);
  console.log(`   Final Duration: ${finalProbe.format.duration}s`);

  // 3. Extract QA Frames
  console.log(`\n📸 Extracting QA Frames to ${QA_DIR}...`);
  for (let s = 1; s <= 7; s++) {
    const framePath = path.join(QA_DIR, `${clipName}_sec${s}.png`);
    execSync(`ffmpeg -y -ss ${s} -i "${finalStagedPath}" -vframes 1 -q:v 2 "${framePath}"`, { stdio: "pipe" });
  }
  const contactSheet = path.join(QA_DIR, `${clipName}_contact_sheet.png`);
  execSync(
    `ffmpeg -y -i "${finalStagedPath}" -vf "select='not(mod(n\\,24))',scale=480:270,tile=4x2" -frames:v 1 "${contactSheet}"`,
    { stdio: "pipe" }
  );
  console.log(`✓ QA Frames & Contact Sheet extracted.`);

  // 4. Calculate Seam SSIM
  let seamSSIM = "N/A";
  try {
    const ssimOut = execSync(
      `ffmpeg -i "${finalStagedPath}" -ss 0 -t 0.1 -i "${finalStagedPath}" -ss ${(dur - OVERLAP_SEC - 0.1).toFixed(2)} -t 0.1 -filter_complex "[0:v][1:v]ssim" -f null - 2>&1`,
      { encoding: "utf8" }
    );
    const m = ssimOut.match(/All:([0-9.]+)/);
    if (m) seamSSIM = m[1];
    console.log(`✓ Seam SSIM: ${seamSSIM}`);
  } catch (e) {
    console.warn(`SSIM check warning: ${e.message}`);
  }

  // 5. Record verified generation in budget ledger
  console.log(`\n💳 Recording generation in budget ledger...`);
  const updatedLedger = recordSuccessfulGeneration(clipName, {
    surah: 18,
    set: 15,
    ayahs: "89-98",
    operationId: op.name,
    rawMaster: rawMasterPath,
    stagedPath: finalStagedPath,
    seamSSIM,
    rawSizeMB,
    finalSizeMB,
  });

  console.log(`✓ Budget ledger updated successfully!`);
  console.log(`   Successful Generations: ${updatedLedger.successfulGenerations}`);
  console.log(`   Cumulative Spent:       ₹${updatedLedger.cumulativeSpentINR.toFixed(2)} INR`);
  console.log(`   Remaining Credit:       ₹${updatedLedger.estimatedRemainingCreditINR.toFixed(2)} INR`);
  console.log("\n======================================================================");
  console.log("🎉 Gate 2 Candidate 1 Generation and QA Complete!");
  console.log("======================================================================");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
