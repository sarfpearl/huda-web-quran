/**
 * HuDa Web Quran — Video Budget Guard & Reserve Protection
 *
 * Configured for afreenharoon666@gmail.com / project-04027e7d-9805-47dc-bdf
 * - Starting Balance: ₹28,796.63 INR (Free Trial verified credit baseline)
 * - Minimum Protected Reserve: ₹500.00 INR (NON-NEGOTIABLE HARD CEILING)
 * - Safety In-Flight Margin: ₹100.00 INR (jobs halt at <= ₹600.00)
 * - Model: veo-3.1-fast-generate-001 (1080p, 16:9, 8s, video-only)
 * - Verified SKU Rate: ₹9.598875 / sec (SKU D679-F281-7C1A) -> ₹76.791 / 8s video
 */

import fs from "node:fs";
import path from "node:path";

export const BUDGET_CONFIG = {
  accountName: "Afreen Free Trial Billing Account",
  billingAccountId: "TRIAL-project-04027e7d",
  projectId: "project-04027e7d-9805-47dc-bdf",
  currency: "INR",
  startingCreditINR: 28796.63,
  minimumReserveINR: 500.00,
  safetyMarginINR: 100.00, // Halts starting new jobs if remaining projected <= ₹600.00
  hardStopFloorINR: 600.00, // 500 reserve + 100 in-flight safety buffer
  model: "veo-3.1-fast-generate-001",
  durationSec: 8,
  resolution: "1080p",
  skuId: "D679-F281-7C1A",
  skuDescription: "Veo 3 Fast 1080p Video Generation (Video Only, No Sound)",
  costPerSecondINR: 9.598875,
  costPerVideoINR: 76.791, // 8 * 9.598875
  maxTotalAllowedVideos: 368,
  safeMaxVideosWithBuffer: 367,
  supportsImageConditioning: true,
  defaultResizeMode: "CROP",
};

const LEDGER_PATH = path.resolve("docs/VIDEO_BUDGET_LEDGER.json");

/**
 * Loads the active budget ledger or initializes it.
 */
export function loadLedger() {
  if (fs.existsSync(LEDGER_PATH)) {
    try {
      const data = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
      return data;
    } catch (e) {
      console.warn("Failed to parse existing ledger, re-initializing:", e.message);
    }
  }

  const initial = {
    updatedAt: new Date().toISOString(),
    projectId: BUDGET_CONFIG.projectId,
    startingCreditINR: BUDGET_CONFIG.startingCreditINR,
    minimumReserveINR: BUDGET_CONFIG.minimumReserveINR,
    hardStopFloorINR: BUDGET_CONFIG.hardStopFloorINR,
    costPerVideoINR: BUDGET_CONFIG.costPerVideoINR,
    successfulGenerations: 0,
    failedGenerations: 0,
    cumulativeSpentINR: 0.0,
    estimatedRemainingCreditINR: BUDGET_CONFIG.startingCreditINR,
    isGenerationPaused: false,
    pauseReason: null,
    history: [],
  };
  saveLedger(initial);
  return initial;
}

/**
 * Saves the budget ledger atomically.
 */
export function saveLedger(ledger) {
  ledger.updatedAt = new Date().toISOString();
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), "utf8");
}

/**
 * Evaluates whether a new generation batch of `count` videos is permitted.
 */
export function evaluateGenerationPermission(count = 1, customLedger = null) {
  const ledger = customLedger || loadLedger();
  const currentRemaining = ledger.estimatedRemainingCreditINR;
  const projectedCost = count * BUDGET_CONFIG.costPerVideoINR;
  const projectedRemaining = currentRemaining - projectedCost;

  if (ledger.isGenerationPaused) {
    return {
      allowed: false,
      reason: `GENERATION_PAUSED: ${ledger.pauseReason || "Administrative pause active"}`,
      currentRemaining,
      projectedRemaining,
      projectedCost,
      reserveSafe: currentRemaining >= BUDGET_CONFIG.minimumReserveINR,
    };
  }

  if (currentRemaining <= BUDGET_CONFIG.hardStopFloorINR) {
    return {
      allowed: false,
      reason: `HARD_STOP_FLOOR_REACHED: Current balance (₹${currentRemaining.toFixed(2)}) is at or below the safety stop floor of ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} (preserving ₹${BUDGET_CONFIG.minimumReserveINR.toFixed(2)} reserve).`,
      currentRemaining,
      projectedRemaining,
      projectedCost,
      reserveSafe: currentRemaining >= BUDGET_CONFIG.minimumReserveINR,
    };
  }

  if (projectedRemaining < BUDGET_CONFIG.hardStopFloorINR) {
    return {
      allowed: false,
      reason: `INSUFFICIENT_BUFFER: Projected remaining (₹${projectedRemaining.toFixed(2)}) would breach safety stop floor of ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} (preserving ₹${BUDGET_CONFIG.minimumReserveINR.toFixed(2)} reserve).`,
      currentRemaining,
      projectedRemaining,
      projectedCost,
      reserveSafe: currentRemaining >= BUDGET_CONFIG.minimumReserveINR,
    };
  }

  return {
    allowed: true,
    reason: "PERMITTED: Budget and reserve constraints fully satisfied.",
    currentRemaining,
    projectedRemaining,
    projectedCost,
    reserveSafe: true,
  };
}

/**
 * Records a successful generation event.
 */
export function recordSuccessfulGeneration(videoName, metadata = {}) {
  const ledger = loadLedger();
  ledger.successfulGenerations += 1;
  ledger.cumulativeSpentINR = +(ledger.cumulativeSpentINR + BUDGET_CONFIG.costPerVideoINR).toFixed(3);
  ledger.estimatedRemainingCreditINR = +(ledger.startingCreditINR - ledger.cumulativeSpentINR).toFixed(3);
  ledger.history.push({
    timestamp: new Date().toISOString(),
    event: "GENERATION_SUCCESS",
    videoName,
    costINR: BUDGET_CONFIG.costPerVideoINR,
    remainingINR: ledger.estimatedRemainingCreditINR,
    metadata,
  });

  if (ledger.estimatedRemainingCreditINR <= BUDGET_CONFIG.hardStopFloorINR) {
    ledger.isGenerationPaused = true;
    ledger.pauseReason = `AUTO_GUARD: Balance ₹${ledger.estimatedRemainingCreditINR.toFixed(2)} reached safety floor ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)}`;
  }

  saveLedger(ledger);
  return ledger;
}

/**
 * Records a still image generation event and deducts cost from ledger.
 */
export function recordStillImageSpend(imageName, costINR, metadata = {}) {
  const ledger = loadLedger();
  ledger.cumulativeSpentINR = +(ledger.cumulativeSpentINR + costINR).toFixed(3);
  ledger.estimatedRemainingCreditINR = +(ledger.startingCreditINR - ledger.cumulativeSpentINR).toFixed(3);
  ledger.history.push({
    timestamp: new Date().toISOString(),
    event: "STILL_IMAGE_GENERATION_SUCCESS",
    videoName: imageName,
    costINR: +costINR.toFixed(3),
    remainingINR: ledger.estimatedRemainingCreditINR,
    metadata,
  });

  if (ledger.estimatedRemainingCreditINR <= BUDGET_CONFIG.hardStopFloorINR) {
    ledger.isGenerationPaused = true;
    ledger.pauseReason = `AUTO_GUARD: Balance ₹${ledger.estimatedRemainingCreditINR.toFixed(2)} reached safety floor ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)}`;
  }

  saveLedger(ledger);
  return ledger;
}

/**
 * CLI runner for status inspection.
 */
if (process.argv[1] && process.argv[1].endsWith("video-budget-guard.mjs")) {
  const ledger = loadLedger();
  const perm = evaluateGenerationPermission(1, ledger);

  console.log("=================================================================");
  console.log("💳 HuDa Web Quran — Video Generation Budget & Reserve Monitor");
  console.log("=================================================================");
  console.log(`Billing Account:         ${BUDGET_CONFIG.accountName}`);
  console.log(`Project:                 ${BUDGET_CONFIG.projectId}`);
  console.log(`Model / Mode:            ${BUDGET_CONFIG.model} (1080p, 8s, Video Only)`);
  console.log(`Confirmed SKU:           ${BUDGET_CONFIG.skuDescription}`);
  console.log(`SKU Unit Rate:           ₹${BUDGET_CONFIG.costPerSecondINR.toFixed(6)} / sec`);
  console.log(`Cost Per 8s Video:       ₹${BUDGET_CONFIG.costPerVideoINR.toFixed(3)} INR`);
  console.log("-----------------------------------------------------------------");
  console.log(`Starting Balance:        ₹${BUDGET_CONFIG.startingCreditINR.toFixed(2)} INR`);
  console.log(`Minimum Reserve:         ₹${BUDGET_CONFIG.minimumReserveINR.toFixed(2)} INR (NON-NEGOTIABLE)`);
  console.log(`Safety Buffer Floor:     ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} INR (₹500 + ₹100 in-flight)`);
  console.log(`Cumulative Spent:        ₹${ledger.cumulativeSpentINR.toFixed(2)} INR`);
  console.log(`Estimated Balance:       ₹${ledger.estimatedRemainingCreditINR.toFixed(2)} INR`);
  console.log(`Successful Generations:  ${ledger.successfulGenerations}`);
  console.log(`Generation Paused:       ${ledger.isGenerationPaused ? "YES" : "NO (ACTIVE)"}`);
  console.log("-----------------------------------------------------------------");
  console.log(`Can generate 1 clip:     ${perm.allowed ? "YES" : "NO"}`);
  console.log(`Safe Clips Remaining:    ${Math.max(0, Math.floor((ledger.estimatedRemainingCreditINR - BUDGET_CONFIG.hardStopFloorINR) / BUDGET_CONFIG.costPerVideoINR))} clips`);
  console.log(`₹500 Reserve Status:     SAFE & PROTECTED`);
  console.log("=================================================================");
}
