#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Surah Production Pipeline Orchestrator (Phase 5)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Coordinates the end-to-end Surah video production lifecycle:
 *   - Planning & Dry-Run: Previews stages, state machine, prompts, and budget gates.
 *   - Local Staging: Non-destructively processes, crossfades, and stages local derivatives.
 *   - State Persistence: Tracks clip states and Surah-level completion in scratch/.
 *   - Mock Generation: Tests state transitions safely without calling Veo or spending credits.
 *   - Composite QA: Invokes surah-qa-composite.mjs and transitions clip states.
 *   - Real Generation Gate: Strictly protected by mandatory explicit human approval.
 *
 * Usage:
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number>                      # Plan / Dry-run preview
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --stage-local        # Execute local staging
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --stage-local --dry-run # Preview staging
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --qa                 # Execute full QA review
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --clips=01a,02c,10a  # Filter to specific clips
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --mock-gen           # Test state transitions safely
 *   node scripts/pipeline/surah-pipeline.mjs <surah-number> --reset-state        # Re-initialize state file
 *   node scripts/pipeline/surah-pipeline.mjs --help                              # Show options
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  loadOrInitSurahState,
  saveSurahState,
  transitionClip,
  resolveClip,
  PRODUCTION_STATES,
  evaluateRemediation,
} from "./surah-state-machine.mjs";
import { buildGenerationPlan, executeControlledPilot, recordHumanVideoDecision } from "./generation-adapter.mjs";
import {
  generateStillImagePreview,
  buildImageReviewPackage,
  recordHumanImageDecision,
  invalidateHumanImageApproval,
} from "./image-generation-adapter.mjs";
import { runLocalStaging } from "./surah-staging.mjs";
import {
  getProjectWorkflowStatus,
  advanceWorkflow,
  advanceToNextSurah,
  generateClipSummary,
  runProjectWideValidation,
  buildClipVersePlan,
  recordHumanPlanDecision,
} from "./surah-orchestrator.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const require = createRequire(import.meta.url);
const { Q, nativeFetch } = require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
if (nativeFetch) {
  global.fetch = nativeFetch;
}
const { SURAH_CHAPTERS_REGISTRY, getSurahVisualData } = require(
  path.join(ROOT, "src/lib/data/surahChapters.ts")
);
const { SURAH_VERSE_VIDEOS_REGISTRY } = require(
  path.join(ROOT, "src/lib/data/surahVerseVideos.ts")
);
const { evaluateGenerationPermission, BUDGET_CONFIG, loadLedger } = require(
  path.join(ROOT, "scripts/tools/video-budget-guard.mjs")
);

// ── 1. PARSE ARGUMENTS ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h") || args.length === 0) {
  console.log(`
🕌 HuDa Web Quran — Surah Production Pipeline Orchestrator (Phase 5)

Usage:
  node scripts/pipeline/surah-pipeline.mjs <surah-number> [options]

Modes:
  --plan                Preview pipeline plan, state machine, and budget (Default)
  --plan-clip[=<id>]    Generate authoritative verse plan (Arabic, Tamil, English)
  --approve-plan        Explicit human approval of verse plan (gate to image gen)
  --reject-plan         Reject verse plan with --notes="<reason>"
  --revise-plan         Request revision of verse plan with --notes="<feedback>"
  --stage-local         Stage local assets non-destructively into scratch/staging/
  --qa                  Run the composite QA review suite (FFprobe, sync, R2)
  --mock-gen            Execute mock generation to verify state transitions safely
  --generate            Real generation (Requires explicit approval gate)
  --poll-resume[=<id>]  Resume polling existing in-flight Veo video operation

Options:
  --dry-run             Dry-run preview (can be combined with --stage-local or --plan)
  --clips=<c1,c2,...>   Filter operation to specific clip identifiers (e.g. 01a,02c,10a)
  --reset-state         Re-initialize the state file from scratch
  --json                Output results as JSON
  --help, -h            Show this documentation

Safety Invariants:
  - Local staging writes strictly to scratch/staging/ and never alters source files.
  - Real generation with Veo is strictly blocked unless explicit approval is confirmed.
  - Zero credits will be spent in mock, staging, or plan modes.
`);
  process.exit(0);
}

let surahArg = args.find((a) => !a.startsWith("--"));
if (!surahArg) {
  const match = args.find((a) => a.startsWith("--surah="));
  if (match) surahArg = match.split("=")[1];
}

const surahNum = Number(surahArg);
if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
  console.error(`❌ Error: Invalid Surah number '${surahArg}'. Must be an integer between 1 and 114.`);
  process.exit(1);
}

const isQa = args.includes("--qa");
const isMockGen = args.includes("--mock-gen");
const isGenerate = args.includes("--generate");
const isGenerateApproved = args.includes("--generate-approved");
const isResetState = args.includes("--reset-state");
const isStageLocal = args.includes("--stage-local");
const isPilot = args.includes("--pilot");
const isLive = args.includes("--live");
const isMock = args.includes("--mock") || (!isLive && !args.includes("--dry-run") && !args.includes("--plan") && isPilot);
const isSimulateFailure = args.includes("--simulate-failure");
const isForce = args.includes("--force");
const isJson = args.includes("--json");
const isDryRun = args.includes("--dry-run") || args.includes("--plan");
const isPlanClip = args.some((a) => a.startsWith("--plan-clip"));
const planClipArg = args.find((a) => a.startsWith("--plan-clip="))?.split("=")[1] || null;
const isApprovePlan = args.includes("--approve-plan");
const isRejectPlan = args.includes("--reject-plan");
const isRevisePlan = args.includes("--revise-plan");
const pollResumeRaw = args.find((a) => a.startsWith("--poll-resume"));
const pollResumeArg = args.find((a) => a.startsWith("--poll-resume="))?.split("=")[1] || (pollResumeRaw ? "auto" : null);
const isImageGen = args.includes("--image-gen") || args.includes("--preview-image");
const isReviewImage = args.includes("--review-image");
const isApproveImage = args.includes("--approve-image");
const isRejectImage = args.includes("--reject-image");
const isReviseImage = args.includes("--revise-image");
const isInvalidateImageApproval = args.includes("--invalidate-image-approval");
const isApproveVideo = args.includes("--approve-video");
const isRejectVideo = args.includes("--reject-video");
const isReviseVideo = args.includes("--revise-video");
const notesArg = args.find((a) => a.startsWith("--notes="))?.slice(8) || "";
const reviewerArg = args.find((a) => a.startsWith("--reviewer="))?.split("=")[1] || "HUMAN_OPERATOR";
const confirmArg = args.find((a) => a.startsWith("--confirm="))?.split("=")[1];
const isStatus = args.includes("--status");
const isAdvance = args.includes("--advance");
const isAutoNextSurah = args.includes("--auto-next-surah");
const isSummary = args.includes("--summary");
const isAuditAll = args.includes("--audit-all");

const singleClipArg = args.find((a) => a.startsWith("--clip="))?.split("=")[1] || "03a";
const clipsArg = args.find((a) => a.startsWith("--clips="))?.split("=")[1];
const targetClips = clipsArg ? clipsArg.split(",").map((c) => c.trim().toLowerCase()) : null;

const surahMeta = Q.QURAN_SURAHS.find((s) => s.number === surahNum);
if (!surahMeta) {
  console.error(`❌ Error: Surah ${surahNum} not found in metadata registry.`);
  process.exit(1);
}

const visualData = SURAH_CHAPTERS_REGISTRY[surahNum] || getSurahVisualData(surahNum);
const ayahVideosMap = SURAH_VERSE_VIDEOS_REGISTRY[surahNum] || {};

// ── 2. STATE MACHINE INITIALIZATION / LOADING ────────────────────────────────

const state = loadOrInitSurahState(surahNum, {
  visualData,
  surahMeta,
  ayahVideosMap,
  reset: isResetState,
});

// Evaluate budget
let budgetEvaluation = null;
let ledger = null;
try {
  ledger = loadLedger();
  budgetEvaluation = evaluateGenerationPermission(1, ledger);
  state.budgetSnapshot = {
    evaluatedAt: new Date().toISOString(),
    allowed: budgetEvaluation.allowed,
    costPerVideoINR: BUDGET_CONFIG.costPerVideoINR,
    currentRemainingINR: ledger.estimatedRemainingCreditINR,
    hardStopFloorINR: BUDGET_CONFIG.hardStopFloorINR,
    minimumReserveINR: BUDGET_CONFIG.minimumReserveINR,
    safetyMarginINR: BUDGET_CONFIG.safetyMarginINR,
  };
} catch (err) {
  state.budgetSnapshot = { error: err.message };
}

saveSurahState(state);

// ── 2.0 ORCHESTRATOR & AUTONOMOUS WORKFLOW DISPATCH ─────────────────────────

if (isAuditAll) {
  const audit = runProjectWideValidation();
  if (isJson) {
    console.log(JSON.stringify(audit, null, 2));
    process.exit(0);
  }
  console.log(`\n======================================================================`);
  console.log(`📋 HuDa Web Quran — Master 114 Surah Production Audit`);
  console.log(`======================================================================`);
  console.log(`Completed Surahs:  ${audit.completedSurahs} / 114`);
  console.log(`Completed Clips:   ${audit.completedClips} / ${audit.totalClips} (${audit.projectCompletionPercentage}%)`);
  console.log(`======================================================================\n`);
  process.exit(0);
}

if (isStatus) {
  const status = getProjectWorkflowStatus({ surahNum, clipId: singleClipArg });
  if (isJson) {
    console.log(JSON.stringify(status, null, 2));
    process.exit(0);
  }
  console.log(`\n======================================================================`);
  console.log(`🕌 HuDa Production Workflow Status: Surah ${status.surahNum} (${status.surahName})`);
  console.log(`======================================================================`);
  console.log(`Overall State:          ${status.overallState}`);
  console.log(`Completion Progress:    ${status.completionPercentage}%`);
  console.log(`Active Clip:            ${status.activeClipId || "None (All complete)"}`);
  console.log(`Active Clip State:      ${status.activeClipState || "N/A"}`);
  console.log(`Image Approval Status:  ${status.hasImageApproval ? `VALID (SHA-256: ${status.imageSha256?.slice(0, 12)}...)` : "PENDING / NONE"}`);
  console.log(`Next Eligible Action:   ${status.nextEligibleAction}`);
  console.log(`Remaining Funds:        ₹${status.budget.remainingFundsINR?.toFixed(2) || "N/A"} INR (Floor: ₹${status.budget.hardStopFloorINR.toFixed(2)})`);
  console.log(`======================================================================\n`);
  process.exit(0);
}

if (isSummary) {
  const clip = resolveClip(state, singleClipArg);
  if (!clip) {
    console.error(`Clip ${singleClipArg} not found in Surah ${surahNum}.`);
    process.exit(1);
  }
  const { summaryPath } = generateClipSummary({ surahNum, clipId: clip.id, state });
  console.log(`✅ Durable summary generated at: ${summaryPath}`);
  process.exit(0);
}

if (isAdvance) {
  const res = await advanceWorkflow({
    surahNum,
    clipId: singleClipArg,
    options: { mockAiClient: isMock ? {} : null },
  });
  if (isJson) {
    console.log(JSON.stringify(res, null, 2));
    process.exit(0);
  }
  console.log(`\n[Advance Result] ${res.status}: ${res.message}`);
  if (res.summaryPath) {
    console.log(`📄 Durable summary: ${path.relative(ROOT, res.summaryPath)}`);
  }
  if (res.status === "SURAH_COMPLETE" && isAutoNextSurah) {
    const nextRes = advanceToNextSurah({ currentSurahNum: surahNum });
    console.log(`\n${nextRes.message}`);
  }
  process.exit(0);
}

// ── 2.0.1 VERSE PLANNING & PLAN APPROVAL DISPATCH ───────────────────────────

if (isPlanClip) {
  const clipTarget = planClipArg || singleClipArg;
  console.log(`\n📖 Building Authoritative Verse Plan: Surah ${surahNum} [${clipTarget}]...`);
  const planRes = buildClipVersePlan({ surahNum, clipId: clipTarget });
  if (isJson) {
    console.log(JSON.stringify(planRes.plan, null, 2));
  } else {
    console.log(`✅ Verse Plan Generated: ${planRes.planPath}`);
    console.log(`   Clip:   ${planRes.plan.clipId} (${planRes.plan.clipName})`);
    console.log(`   Ayahs:  ${planRes.plan.fromVerse}–${planRes.plan.toVerse} (${planRes.plan.totalAyahs} ayahs)`);
    console.log(`   Theme:  ${planRes.plan.theme}`);
    console.log(`   State:  ${PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL}`);
    console.log(`\nReview Plan Markdown: ${planRes.planPath}`);
    console.log(`To approve plan: node scripts/pipeline/surah-pipeline.mjs ${surahNum} --approve-plan --clip=${clipTarget}`);
    console.log(`To reject plan:  node scripts/pipeline/surah-pipeline.mjs ${surahNum} --reject-plan --clip=${clipTarget} --notes="<reason>"`);
  }
  process.exit(0);
}

if (isApprovePlan) {
  const res = recordHumanPlanDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "APPROVE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`✅ ${res.message}`);
  process.exit(0);
}

if (isRejectPlan) {
  const res = recordHumanPlanDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REJECT",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🛑 ${res.message}`);
  process.exit(0);
}

if (isRevisePlan) {
  const res = recordHumanPlanDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REVISE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🔄 ${res.message}`);
  process.exit(0);
}

// ── 2.1 IMAGE-FIRST WORKFLOW DISPATCH ────────────────────────────────────────

if (isImageGen) {
  const mode = isLive ? "live" : isDryRun ? "dry-run" : "mock";
  console.log(`\n🖼️  Generating Still Image Preview: Surah ${surahNum} [${singleClipArg}] [${mode.toUpperCase()}]...`);
  
  const targetClip = resolveClip(state, singleClipArg);
  const clipKey = targetClip ? targetClip.id : singleClipArg;

  if (targetClip) {
    transitionClip(state, clipKey, PRODUCTION_STATES.IMAGE_GENERATION_PENDING);
  }
  
  const imgRes = await generateStillImagePreview({
    surahNum,
    clipId: singleClipArg,
    mode,
  });

  if (targetClip && imgRes.previewPath) {
    transitionClip(state, clipKey, PRODUCTION_STATES.IMAGE_GENERATED, {
      previewImagePath: imgRes.previewPath,
      imageSha256: imgRes.imageSha256,
      stillPrompt: imgRes.prompt,
    });
    saveSurahState(state);
  }

  if (isJson) {
    console.log(JSON.stringify(imgRes, null, 2));
  } else {
    console.log(`✅ Still Preview Generated Successfully:`);
    console.log(`   Path:       ${imgRes.previewPath}`);
    console.log(`   SHA-256:    ${imgRes.imageSha256 || "N/A"}`);
    const costVal = imgRes.confirmedCostINR ?? imgRes.estimatedCostINR ?? 0;
    console.log(`   Cost:       ₹${Number(costVal).toFixed(2)} INR`);
    console.log(`\nNext Step: Run --review-image --clip=${singleClipArg} to perform autonomous AI review.`);
  }
  process.exit(0);
}

if (isReviewImage) {
  console.log(`\n🔍 Performing Autonomous AI Image Review: Surah ${surahNum} [${singleClipArg}]...`);
  
  const targetClip = resolveClip(state, singleClipArg);
  const clipKey = targetClip ? targetClip.id : singleClipArg;

  if (targetClip) {
    transitionClip(state, clipKey, PRODUCTION_STATES.IMAGE_AI_REVIEW);
  }

  const visualAIMode = isLive ? "live" : isDryRun ? "dry-run" : "mock";
  const pkg = await buildImageReviewPackage(surahNum, singleClipArg, {
    visualAIMode,
    enableVisualAI: true,
  });

  if (targetClip) {
    transitionClip(state, clipKey, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING, {
      aiEvaluation: pkg.agentEvaluation,
      humanReviewPending: true,
    });
    saveSurahState(state);
  }

  if (isJson) {
    console.log(JSON.stringify(pkg, null, 2));
  } else {
    console.log(`======================================================================`);
    console.log(`🖼️  IMAGE REVIEW PACKAGE: Surah ${pkg.surahNum} Clip [${pkg.clipId}]`);
    console.log(`======================================================================`);
    console.log(`Theme:            ${pkg.theme} (${pkg.verses})`);
    console.log(`Preview Image:    ${pkg.previewImagePath || "None"}`);
    console.log(`SHA-256:          ${pkg.imageSha256 || "None"}`);
    console.log(`Approval Status:  ${pkg.imageApprovalStatus}`);
    console.log(`\nAgent AI Review:`);
    console.log(`   Recommendation: ${pkg.agentEvaluation?.recommendation || "N/A"}`);
    console.log(`   Confidence:     ${pkg.agentEvaluation?.confidence || "N/A"}`);
    if (pkg.agentEvaluation?.visualAI?.evaluatedWithVisualAI) {
      const v = pkg.agentEvaluation.visualAI;
      console.log(`   Visual AI Model: ${v.model} (${v.mode})`);
      console.log(`   Theological:    ${v.theologicalSafety?.passed ? "✅ VERIFIED CLEAN (No humans/idols in pixels)" : "❌ FAILED"}`);
      console.log(`   Visual Realism: ${v.visualRealism?.score}/100`);
      console.log(`   Thematic Match: ${v.thematicRelevance?.score}/100`);
      console.log(`   Motion Suitability: ${v.temporalMotionFeasibility?.suitableForVideoMotion ? "YES" : "NO"}`);
    }
    console.log(`   Defects:        ${pkg.agentEvaluation?.defects?.length ? pkg.agentEvaluation.defects.join("; ") : "None detected"}`);
    console.log(`   Observations:   ${pkg.agentEvaluation?.observations?.join("; ") || "None"}`);
    if (pkg.agentEvaluation?.disclaimer) {
      console.log(`   Notice:         ${pkg.agentEvaluation.disclaimer}`);
    }
    console.log(`\nProposed Video Motion:`);
    console.log(`   Prompt:         "${pkg.proposedVideoMotionPrompt}"`);
    console.log(`   Expected Cost:  ₹${pkg.videoBudgetProjection.expectedCostINR} INR`);
    console.log(`   Ledger Balance: ₹${pkg.videoBudgetProjection.remainingLedgerINR.toFixed(2)} INR`);
    console.log(`======================================================================`);
    console.log(`Human Actions Available:`);
    console.log(`   Approve: node scripts/pipeline/surah-pipeline.mjs ${surahNum} --approve-image --clip=${singleClipArg}`);
    console.log(`   Reject:  node scripts/pipeline/surah-pipeline.mjs ${surahNum} --reject-image --clip=${singleClipArg} --notes="<reason>"`);
    console.log(`   Revise:  node scripts/pipeline/surah-pipeline.mjs ${surahNum} --revise-image --clip=${singleClipArg} --notes="<feedback>"`);
  }
  process.exit(0);
}

if (isApproveImage) {
  const res = await recordHumanImageDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "APPROVE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`✅ ${res.message}`);
  process.exit(0);
}

if (isRejectImage) {
  const res = await recordHumanImageDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REJECT",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🛑 ${res.message}`);
  process.exit(0);
}

if (isReviseImage) {
  const res = await recordHumanImageDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REVISE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🔄 ${res.message}`);
  process.exit(0);
}

if (isInvalidateImageApproval) {
  const res = invalidateHumanImageApproval({
    surahNum,
    clipId: singleClipArg,
    reason: notesArg || "Human image approval invalidated; reset to pending human review.",
    reviewer: reviewerArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🛡️  ${res.message}`);
  process.exit(0);
}

if (isApproveVideo) {
  const res = recordHumanVideoDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "APPROVE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`✅ ${res.message}`);
  process.exit(0);
}

if (isRejectVideo) {
  const res = recordHumanVideoDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REJECT",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🛑 ${res.message}`);
  process.exit(0);
}

if (isReviseVideo) {
  const res = recordHumanVideoDecision({
    surahNum,
    clipId: singleClipArg,
    decision: "REVISE",
    reviewer: reviewerArg,
    notes: notesArg,
  });
  if (isJson) console.log(JSON.stringify(res, null, 2));
  else console.log(`🔄 ${res.message}`);
  process.exit(0);
}

// ── 3. REAL GENERATION SAFETY GATE ───────────────────────────────────────────

if (isGenerate) {
  if (!isGenerateApproved) {
    console.error(`
🛑 SAFETY GATE HALTED REAL GENERATION:
   Real video generation with Vertex AI Veo requires explicit approval.
   Expected cost per 8-second video: ₹${BUDGET_CONFIG.costPerVideoINR.toFixed(2)} INR
   Current remaining trial credit:   ₹${ledger?.estimatedRemainingCreditINR?.toFixed(2) || "Unknown"} INR
   Hard-stop floor:                 ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} INR
   Protected reserve:               ₹${BUDGET_CONFIG.minimumReserveINR.toFixed(2)} INR (Untouchable ceiling)
   In-flight safety buffer:         ₹${BUDGET_CONFIG.safetyMarginINR.toFixed(2)} INR

To proceed with real generation, you must obtain explicit human approval and pass:
   --generate --generate-approved
`);
    process.exit(1);
  }

  console.error("❌ Real generation execution is protected in Phase 6. Use --pilot --mock for testing.");
  process.exit(1);
}

// ── 3.1 CONTROLLED GENERATION PILOT MODE ──────────────────────────────────────

if (isPilot) {
  const mode = isLive ? "live" : isDryRun ? "plan" : "mock";

  console.log(`\n======================================================================`);
  console.log(`🛫 Running Single-Clip Controlled Generation Pilot: Surah ${surahNum} [${singleClipArg}] [${mode.toUpperCase()}]`);
  console.log(`======================================================================\n`);

  // Build valid approval token
  const approvalToken = {
    surah: surahNum,
    clipIds: [singleClipArg],
    model: BUDGET_CONFIG.model,
    expectedCostINR: BUDGET_CONFIG.costPerVideoINR,
    timestamp: new Date().toISOString(),
  };

  let confirmation = confirmArg;
  if (isLive && !confirmation) {
    const clipPromptInfo = SCENE_PROMPT_LIBRARY[surahNum]?.[singleClipArg];
    console.log(`======================================================================`);
    console.log(`⚠️  EXPLICIT LIVE GENERATION CONFIRMATION REQUIRED`);
    console.log(`======================================================================`);
    console.log(`Operation:       Vertex AI Veo 3 Video Generation`);
    console.log(`Surah:           ${surahNum} (${surahMeta.name})`);
    console.log(`Clip ID:         ${singleClipArg}`);
    console.log(`Model:           ${BUDGET_CONFIG.model}`);
    console.log(`Target:          1080p @ 24fps, 16:9, 8s duration, silent`);
    console.log(`Estimated Cost:  ₹${BUDGET_CONFIG.costPerVideoINR} INR (Max Authorized: ₹80.00 INR)`);
    console.log(`Current Balance: ₹${ledger?.estimatedRemainingCreditINR?.toFixed(2)} INR`);
    console.log(`Destination:     scratch/pilot/raw_masters/`);
    if (clipPromptInfo) {
      console.log(`\nApproved Prompt:\n"${buildPromptText(clipPromptInfo.scene, clipPromptInfo.avoid)}"`);
    }
    console.log(`======================================================================`);
    console.log(`To proceed with paid video generation, pass --confirm=APPROVE or type APPROVE below:`);

    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = await rl.question("\nEnter 'APPROVE' to confirm: ");
    rl.close();
    confirmation = ans.trim();
  }

  const pilotResult = await executeControlledPilot({
    surahNum,
    clipId: singleClipArg,
    mode,
    approval: approvalToken,
    confirmation,
    resumeOperationId: pollResumeArg && pollResumeArg !== "auto" ? pollResumeArg : undefined,
    simulateFailure: isSimulateFailure,
    force: isForce,
    state,
    surahMeta,
    visualData,
    ayahVideosMap,
  });

  if (isJson) {
    console.log(JSON.stringify(pilotResult, null, 2));
    process.exit(pilotResult.success ? 0 : 1);
  }

  if (!pilotResult.success) {
    console.error(`❌ Pilot Failed at step [${pilotResult.step}]:`);
    console.error(`   ${pilotResult.error}`);
    process.exit(1);
  }

  if (pilotResult.step === "PLAN") {
    console.log(`📋 Pilot Plan & Verification Overview:`);
    console.log(`   Clip ID:         ${pilotResult.clipId} (${pilotResult.clipInfo.name})`);
    console.log(`   Verses:          ${pilotResult.clipInfo.verses}`);
    console.log(`   Model SKU:       ${pilotResult.verifiedInvocation.model}`);
    console.log(`   Estimated Cost:  ₹${pilotResult.plan.totalEstimatedCostINR.toFixed(2)} INR (Limit: ₹80.00 INR)`);
    console.log(`   Current Balance: ₹${pilotResult.plan.budgetEvaluation.currentRemainingINR.toFixed(2)} INR`);
    console.log(`   Post-Gen Funds:  ₹${pilotResult.plan.budgetEvaluation.projectedRemainingINR.toFixed(2)} INR (Safety Floor: ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)})`);
    console.log(`   Budget Status:   ${pilotResult.plan.budgetEvaluation.allowed ? "PERMITTED" : "BLOCKED"}`);
    console.log(`   Output Target:   ${pilotResult.verifiedInvocation.outputTarget}`);
    console.log(`\nVerified CLI Command:`);
    console.log(`   ${pilotResult.verifiedInvocation.executable} ${pilotResult.verifiedInvocation.script} ${pilotResult.verifiedInvocation.args.join(" ")}\n`);
    process.exit(0);
  }

  if (pilotResult.skippedDuplicate) {
    console.log(`⚠️  DUPLICATE DETECTED:`);
    console.log(`   ${pilotResult.reason}`);
    console.log(`   Processed Path: ${pilotResult.processedPath}`);
    process.exit(0);
  }

  console.log(`✅ Pilot Execution Succeeded:`);
  console.log(`   Clip ID:         ${pilotResult.clipId} (${pilotResult.clipInfo.name})`);
  console.log(`   Operation ID:    ${pilotResult.operationId}`);
  console.log(`   Raw Master:      ${pilotResult.rawMasterPath}`);
  console.log(`   Processed Clip:  ${pilotResult.processedPath}`);
  console.log(`   Contact Sheet:   ${pilotResult.contactSheetPath}`);
  console.log(`   Seam SSIM:       ${pilotResult.seamSSIM?.all?.toFixed(4) || "N/A"}`);
  console.log(`   Resolution:      ${pilotResult.probe?.width}x${pilotResult.probe?.height} @ ${pilotResult.probe?.fps}fps`);
  console.log(`   Audio:           ${pilotResult.probe?.hasAudio ? "WARNING: Audio present" : "Stripped (Clean)"}`);
  console.log(`   Letterbox:       ${pilotResult.letterbox?.isLetterboxed ? "WARNING: Letterbox detected" : "None (16:9 Full Frame)"}`);
  console.log(`\nVerified Invocation Arguments for live generation:`);
  console.log(`   Command:         ${pilotResult.verifiedInvocation.executable} ${pilotResult.verifiedInvocation.script} ${pilotResult.verifiedInvocation.args.join(" ")}`);
  console.log(`   Target Model:    ${pilotResult.verifiedInvocation.model}`);
  console.log(`   Cost Estimate:   ₹${pilotResult.plan.totalEstimatedCostINR.toFixed(2)} INR`);
  console.log(`   Budget Balance:  ₹${pilotResult.plan.budgetEvaluation.currentRemainingINR.toFixed(2)} INR`);
  console.log(`   Post-Gen Funds:  ₹${pilotResult.plan.budgetEvaluation.projectedRemainingINR.toFixed(2)} INR\n`);
  process.exit(0);
}

// ── 4. LOCAL STAGING MODE ────────────────────────────────────────────────────

if (isStageLocal) {
  console.log(`\n======================================================================`);
  console.log(`📦 Running Local Staging for Surah ${surahNum} (${surahMeta.name}) [${isDryRun ? "DRY-RUN" : "EXECUTE"}]`);
  console.log(`======================================================================\n`);

  const stagingResult = await runLocalStaging(surahNum, {
    visualData,
    ayahVideosMap,
    targetClips,
    dryRun: isDryRun,
  });

  if (isJson) {
    console.log(JSON.stringify(stagingResult, null, 2));
    process.exit(0);
  }

  console.log(`Staging Destination: ${stagingResult.stagingRoot}`);
  console.log(`Total Assets Planned: ${stagingResult.totalPlanned}`);
  if (!isDryRun) {
    console.log(`Successfully Staged:  ${stagingResult.totalStaged}`);
    console.log(`Staging Report:       ${stagingResult.reportPath}`);
  }

  console.log(`\n--- Proposed Manifest Diff ---`);
  console.log(stagingResult.manifestDiff);
  console.log(`\n✅ Local staging operation completed without external side effects.\n`);
  process.exit(0);
}

// ── 5. MOCK GENERATION MODE (Safe Testing) ───────────────────────────────────

if (isMockGen) {
  console.log(`\n======================================================================`);
  console.log(`🧪 Running Mock Generation Pipeline for Surah ${surahNum} (${surahMeta.name})`);
  console.log(`======================================================================\n`);

  const clipsToProcess = Object.values(state.clips).filter((c) => {
    if (!targetClips) return true;
    return targetClips.some((tc) => c.id.toLowerCase() === tc || c.targetPath.toLowerCase().includes(tc));
  });

  console.log(`Processing ${clipsToProcess.length} clips in mock mode (Zero API credits used):\n`);

  for (const c of clipsToProcess) {
    console.log(`👉 Clip '${c.id}' [${c.category}]: ${c.name}`);

    // Transition 1: PLANNED -> PROMPTS_READY
    if (c.state === PRODUCTION_STATES.PLANNED) {
      transitionClip(state, c.id, PRODUCTION_STATES.PROMPTS_READY);
      console.log(`   [State] -> PROMPTS_READY`);
    }

    // Transition 2: PROMPTS_READY -> BUDGET_CHECKED
    if (c.state === PRODUCTION_STATES.PROMPTS_READY) {
      transitionClip(state, c.id, PRODUCTION_STATES.BUDGET_CHECKED, {
        budgetApproved: budgetEvaluation?.allowed ?? false,
      });
      console.log(`   [State] -> BUDGET_CHECKED (Budget OK: ${budgetEvaluation?.allowed})`);
    }

    // Transition 3: BUDGET_CHECKED -> GENERATION_PENDING_APPROVAL
    if (c.state === PRODUCTION_STATES.BUDGET_CHECKED) {
      transitionClip(state, c.id, PRODUCTION_STATES.GENERATION_PENDING_APPROVAL);
      console.log(`   [State] -> GENERATION_PENDING_APPROVAL`);
    }

    // Transition 4: GENERATION_PENDING_APPROVAL -> MOCK_GENERATED
    if (c.state === PRODUCTION_STATES.GENERATION_PENDING_APPROVAL) {
      const mockOpId = `mock-op-${c.id}-${Date.now().toString(36)}`;
      transitionClip(state, c.id, PRODUCTION_STATES.MOCK_GENERATED, {
        operationId: mockOpId,
        mockGeneratedAt: new Date().toISOString(),
      });
      console.log(`   [State] -> MOCK_GENERATED (Simulated op: ${mockOpId})`);
    }

    // Transition 5: MOCK_GENERATED -> PROCESSED
    if (c.state === PRODUCTION_STATES.MOCK_GENERATED) {
      transitionClip(state, c.id, PRODUCTION_STATES.PROCESSED, {
        processedSeamStandard: "0.40s crossfade",
        audioStatus: "stripped",
      });
      console.log(`   [State] -> PROCESSED (0.40s seam crossfade simulated)`);
    }

    // Remediation check
    const plan = evaluateRemediation(c);
    c.remediationPlan = plan;
    console.log(`   [Remediation Plan] ${plan.action}: ${plan.reason || "Standard progression"}`);
    console.log("");
  }

  saveSurahState(state);
  console.log(`✅ Mock generation cycle completed successfully.`);
  console.log(`   State file updated: scratch/surah_states/surah_${String(surahNum).padStart(3, "0")}_state.json\n`);
  process.exit(0);
}

// ── 6. QA MODE INVOCATION ────────────────────────────────────────────────────

if (isQa) {
  console.log(`\n🚀 Delegating to Composite QA Runner for Surah ${surahNum} (${surahMeta.name})...\n`);
  const qaScript = path.join(__dirname, "surah-qa-composite.mjs");
  const forwardArgs = args.filter((a) => a !== "--qa");
  const child = spawnSync("node", [qaScript, ...forwardArgs], {
    stdio: "inherit",
    cwd: ROOT,
  });

  // After QA completes, synchronize state file with QA results
  try {
    if (child.status === 0) {
      for (const [id, c] of Object.entries(state.clips)) {
        if (targetClips && !targetClips.some((tc) => id.toLowerCase() === tc || c.targetPath.toLowerCase().includes(tc))) {
          continue;
        }
        if (c.state !== PRODUCTION_STATES.DEPLOYED) {
          c.state = PRODUCTION_STATES.QA_PASSED;
          c.lastUpdated = new Date().toISOString();
        }
      }
    } else {
      for (const [id, c] of Object.entries(state.clips)) {
        if (targetClips && !targetClips.some((tc) => id.toLowerCase() === tc || c.targetPath.toLowerCase().includes(tc))) {
          continue;
        }
        if (c.state !== PRODUCTION_STATES.DEPLOYED) {
          c.state = PRODUCTION_STATES.NEEDS_REVIEW;
          c.lastUpdated = new Date().toISOString();
        }
      }
    }
    saveSurahState(state);
  } catch (err) {
    console.warn("Could not sync state from QA run:", err.message);
  }

  process.exit(child.status ?? 1);
}

// ── 7. DRY-RUN / PLANNING MODE ───────────────────────────────────────────────

const genPlan = buildGenerationPlan(surahNum, {
  visualData,
  ayahVideosMap,
  targetClips,
});

if (isJson) {
  console.log(JSON.stringify({ state, generationPlan: genPlan }, null, 2));
  process.exit(0);
}

console.log(`\n======================================================================`);
console.log(`📋 HuDa Pipeline Plan & Readiness Overview: Surah ${surahNum} (${surahMeta.name})`);
console.log(`======================================================================`);
console.log(`Arabic Name:    ${surahMeta.arabicName}`);
console.log(`Revelation:     ${surahMeta.revelation}`);
console.log(`Total Verses:   ${surahMeta.verses}`);
console.log(`Multi-Chapter:  ${visualData.isMultiChapter ? `YES (${visualData.chapters.length} chapters)` : "NO (Single Surah loop)"}`);
console.log(`Ayah Videos:    ${Object.keys(ayahVideosMap).length} curated real-footage clips`);
if (clipsArg) {
  console.log(`Target Clips:   ${clipsArg} (Filtered subset inspection)`);
}

console.log(`\n--- Production State Summary ---`);
console.log(`Overall State:  ${state.overallState}`);
console.log(`Total Clips:    ${state.summary.totalClips}`);
console.log(`Deployed:       ${state.summary.deployedClips}`);
console.log(`QA Passed:      ${state.summary.qaPassedClips}`);
console.log(`Needs Review:   ${state.summary.needsReviewClips}`);
console.log(`Failed:         ${state.summary.failedClips}`);
console.log(`Completion:     ${state.summary.completionPercentage}%`);

console.log(`\n--- Planned Pipeline Execution Stages ---`);

console.log(`1. [STAGE 1] Asset Identification & Registry Verification`);
console.log(`   - Master Path:   ${visualData.masterVideoPath}`);
console.log(`   - Chapters:      ${visualData.chapters.length} thematic chapters defined in surahChapters.ts`);
console.log(`   - Ayah Clips:    ${Object.keys(ayahVideosMap).length} clips defined in surahVerseVideos.ts`);
console.log(`   - Needing Gen:   ${genPlan.clipsNeedingGeneration} clips`);

console.log(`2. [STAGE 2] Financial Budget & Safety Gate (Vertex AI Veo)`);
if (budgetEvaluation && ledger) {
  console.log(`   - Status:        ${budgetEvaluation.allowed ? "PERMITTED" : "BLOCKED"}`);
  console.log(`   - Current Funds: ₹${ledger.estimatedRemainingCreditINR.toFixed(2)} INR`);
  console.log(`   - Projected Cost:₹${genPlan.totalEstimatedCostINR.toFixed(2)} INR (${genPlan.clipsNeedingGeneration} clips @ ₹${BUDGET_CONFIG.costPerVideoINR.toFixed(2)})`);
  console.log(`   - Hard-Stop Floor: ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} INR (Halts jobs if balance falls to floor)`);
  console.log(`   - Protected Reserve: ₹${BUDGET_CONFIG.minimumReserveINR.toFixed(2)} INR (Untouchable ceiling)`);
  console.log(`   - In-Flight Buffer:  ₹${BUDGET_CONFIG.safetyMarginINR.toFixed(2)} INR`);
} else {
  console.log(`   - Budget Guard:  Ledger not evaluated`);
}

console.log(`3. [STAGE 3] Video Engineering & Seam Standard`);
console.log(`   - Standard:      0.40s crossfade overlap seam (9.6 frames @ 24fps)`);
console.log(`   - Spec Target:   1920x1080 @ 24fps, H.264 High Profile, audio stripped`);
console.log(`   - Safety Rule:   Preserve source master; outputs directed to scratch/staging/`);

console.log(`4. [STAGE 4] Composite Quality Assurance Review`);
console.log(`   - Video QA:      FFprobe metadata, letterbox detection, loop seam SSIM`);
console.log(`   - Sync QA:       Word boundaries timeline walk across all 9 Word Sync reciters`);
console.log(`   - Text QA:       Verse rasm, Tajweed glyphs, IndoPak script, 10 translation languages`);
console.log(`   - Human Gate:    Visual aesthetics, camera stability, and theological appropriateness`);

console.log(`5. [STAGE 5] Distribution & Cloudflare R2 Delivery`);
console.log(`   - R2 Bucket:     huda-quran-media`);
console.log(`   - Manifest:      src/lib/data/videoManifest.ts`);
console.log(`   - Status:        Dry-run only (upload disabled in Phase 5)`);

console.log(`\n======================================================================`);
console.log(`🔒 SAFE MODE ACTIVE (Phase 5):`);
console.log(`   - State file:     scratch/surah_states/surah_${String(surahNum).padStart(3, "0")}_state.json`);
console.log(`   - Local Staging:  node scripts/pipeline/surah-pipeline.mjs ${surahNum} --stage-local`);
console.log(`   - Staging Dry-Run:node scripts/pipeline/surah-pipeline.mjs ${surahNum} --stage-local --dry-run`);
console.log(`   - Composite QA:   node scripts/pipeline/surah-pipeline.mjs ${surahNum} --qa`);
console.log(`   - Mock Gen Test:  node scripts/pipeline/surah-pipeline.mjs ${surahNum} --mock-gen`);
console.log(`======================================================================\n`);
