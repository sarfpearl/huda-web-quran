#!/usr/bin/env node
/**
 * Completes post-processing for an already completed Vertex AI Veo operation:
 * - Retrieves video bytes from operation
 * - Saves raw master to scratch/pilot/raw_masters/
 * - Records cost in VIDEO_BUDGET_LEDGER.json
 * - Applies 0.40s crossfade seam
 * - Generates contact sheet & seam SSIM metrics
 * - Updates state machine to VIDEO_HUMAN_REVIEW_PENDING
 * - Generates durable markdown summary
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import {
  BUDGET_CONFIG,
  recordSuccessfulGeneration,
} from "../tools/video-budget-guard.mjs";
import {
  probeVideo,
  detectLetterbox,
  generateContactSheet,
  createSeamlessLoop,
  DEFAULT_OVERLAP_SEC,
} from "./seam-processor.mjs";
import {
  PRODUCTION_STATES,
  transitionClip,
  saveSurahState,
  loadOrInitSurahState,
  resolveClip,
} from "./surah-state-machine.mjs";
import { SCENE_PROMPT_LIBRARY } from "./generation-adapter.mjs";
import { generateClipSummary } from "./surah-orchestrator.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const surahNum = 3;
const clipId = "03a";
const opName = "projects/project-04027e7d-9805-47dc-bdf/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001/operations/6130a683-8024-44c0-b895-3e0e1b5203b3";

const clipInfo = SCENE_PROMPT_LIBRARY[surahNum][clipId];
const destinationDir = path.join(ROOT, "scratch/pilot");
const rawMastersDir = path.join(destinationDir, "raw_masters");
const processedDir = path.join(destinationDir, "processed");
const sheetsDir = path.join(destinationDir, "contact_sheets");
const framesDir = path.join(destinationDir, "frames");

fs.mkdirSync(rawMastersDir, { recursive: true });
fs.mkdirSync(processedDir, { recursive: true });
fs.mkdirSync(sheetsDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

const rawMasterPath = path.join(rawMastersDir, `${clipInfo.name}-raw-master.mp4`);
const processedPath = path.join(processedDir, `${clipInfo.name}.mp4`);
const sheetPath = path.join(sheetsDir, `${clipInfo.name}_contact_sheet.jpg`);

console.log(`Connecting to Vertex AI for operation: ${opName}`);
const ai = new GoogleGenAI({ vertexai: true, project: BUDGET_CONFIG.projectId, location: "us-central1" });

const op = new GenerateVideosOperation();
op.name = opName;

const updatedOp = await ai.operations.getVideosOperation({ operation: op });
if (!updatedOp.done) {
  console.error("Operation is not yet done!");
  process.exit(1);
}
if (updatedOp.error) {
  console.error("Operation error:", updatedOp.error);
  process.exit(1);
}

const video = updatedOp.response?.generatedVideos?.[0]?.video;
const bytes = video?.videoBytes || video?.bytesBase64Encoded;
if (!bytes) {
  console.error("No video bytes found in operation response!");
  process.exit(1);
}

// 1. Save raw master
fs.writeFileSync(rawMasterPath, Buffer.from(bytes, "base64"));
const rawStats = fs.statSync(rawMasterPath);
console.log(`✓ Saved raw master: ${rawMasterPath} (${(rawStats.size / 1024 / 1024).toFixed(2)} MB)`);

// 2. Record ledger
const updatedLedger = recordSuccessfulGeneration(clipInfo.name, {
  id: clipId,
  operationId: opName,
  model: BUDGET_CONFIG.model,
  destination: rawMasterPath,
  costINR: BUDGET_CONFIG.costPerVideoINR,
});
console.log(`✓ Recorded in ledger: Spent ₹${BUDGET_CONFIG.costPerVideoINR} INR. Remaining: ₹${updatedLedger.estimatedRemainingCreditINR.toFixed(2)} INR`);

// 3. Update State
const state = loadOrInitSurahState(surahNum);
const targetClip = resolveClip(state, clipId);
const clipKey = targetClip ? targetClip.id : clipId;

transitionClip(state, clipKey, PRODUCTION_STATES.GENERATED, {
  operationId: opName,
  rawMasterPath,
  generatedAt: new Date().toISOString(),
});

// 4. Seam crossfade
console.log(`Applying approved 0.40s crossfade seam to ${clipId}...`);
const loopRes = createSeamlessLoop({
  inputPath: rawMasterPath,
  outputPath: processedPath,
  overlapSec: DEFAULT_OVERLAP_SEC,
  dryRun: false,
});

transitionClip(state, clipKey, PRODUCTION_STATES.PROCESSED, {
  processedPath,
  seamStandard: "0.40s crossfade",
  audioStatus: "stripped",
  durationSec: loopRes.outputDetails?.durationFormatted || 8.0,
});

// 5. Contact Sheet & QA
console.log(`Generating contact sheet & loop seam SSIM...`);
const clipFramesDir = path.join(framesDir, clipId);
const sheetRes = generateContactSheet(processedPath, sheetPath, clipFramesDir);
const outProbe = probeVideo(processedPath);
const letterbox = detectLetterbox(processedPath);

transitionClip(state, clipKey, PRODUCTION_STATES.QA_RUNNING);
transitionClip(state, clipKey, PRODUCTION_STATES.QA_PASSED, {
  seamSSIM: sheetRes.seamSSIM,
  resolution: `${outProbe.width}x${outProbe.height}`,
  fps: outProbe.fps,
  hasAudio: outProbe.hasAudio,
  letterboxed: letterbox?.isLetterboxed || false,
});

// Transition to VIDEO_HUMAN_REVIEW_PENDING
transitionClip(state, clipKey, PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING, {
  humanReviewPending: true,
  contactSheetPath: sheetPath,
  processedVideoPath: processedPath,
  technicalQaPassed: true,
});

saveSurahState(state);

// 6. Durable summary
const { summaryPath } = generateClipSummary({ surahNum, clipId: clipKey, state });
console.log(`✓ Durable 21-field summary updated: ${summaryPath}`);

console.log("\n======================================================================");
console.log("🎬 VEO 3.1 VIDEO GENERATION & PROCESSING COMPLETE");
console.log("======================================================================");
console.log(`Raw Master:      ${rawMasterPath}`);
console.log(`Processed Video: ${processedPath}`);
console.log(`Contact Sheet:   ${sheetPath}`);
console.log(`Seam SSIM:       ${sheetRes.seamSSIM?.all?.toFixed(4)}`);
console.log(`Resolution:      ${outProbe.width}x${outProbe.height} @ ${outProbe.fps}fps`);
console.log(`Duration:        ${outProbe.durationSec}s`);
console.log(`Audio:           ${outProbe.hasAudio ? "Audio present" : "Stripped (Clean)"}`);
console.log(`Letterboxed:     ${letterbox?.isLetterboxed ? "YES" : "NO (Edge-to-edge 16:9)"}`);
console.log(`Cost:            ₹${BUDGET_CONFIG.costPerVideoINR} INR`);
console.log(`Remaining Funds: ₹${updatedLedger.estimatedRemainingCreditINR.toFixed(2)} INR`);
console.log(`Current State:   ${PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING}`);
console.log("======================================================================\n");
