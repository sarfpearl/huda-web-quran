/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Surah Production State Machine & Remediation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Implements a robust, machine-readable lifecycle state machine for Surah
 * video production:
 *
 *   PLANNED
 *     ↓
 *   PROMPTS_READY
 *     ↓
 *   BUDGET_CHECKED
 *     ↓
 *   GENERATION_PENDING_APPROVAL
 *     ↓
 *   GENERATED (or MOCK_GENERATED during testing)
 *     ↓
 *   PROCESSED (0.40s seam crossfade, audio stripped, web-optimized)
 *     ↓
 *   QA_RUNNING
 *     ↓
 *   [NEEDS_REVIEW / QA_PASSED]
 *     ↓
 *   APPROVED_FOR_DEPLOYMENT
 *     ↓
 *   DEPLOYED (Cloudflare R2 active 200 + videoManifest.ts registered)
 *
 * Safety Invariants:
 *   - Never overwrites source masters.
 *   - Never spends budget without explicit budget validation and human approval.
 *   - Tracks each clip independently and computes Surah-level completion.
 *   - Distinguishes AI synthetic loops from authentic licensed real footage.
 *   - Retries are capped (max 2) with deterministic remediation rules.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

import crypto from "node:crypto";

export const PRODUCTION_STATES = {
  // 16 Explicit End-to-End Workflow States
  CLIP_PLAN_PENDING_APPROVAL: "CLIP_PLAN_PENDING_APPROVAL",
  IMAGE_GENERATION_PENDING: "IMAGE_GENERATION_PENDING",
  IMAGE_HUMAN_REVIEW_PENDING: "IMAGE_HUMAN_REVIEW_PENDING",
  VIDEO_GENERATION_PENDING_APPROVAL: "VIDEO_GENERATION_PENDING_APPROVAL",
  VIDEO_GENERATING: "VIDEO_GENERATING",
  VIDEO_HUMAN_REVIEW_PENDING: "VIDEO_HUMAN_REVIEW_PENDING",
  LOCAL_STAGING_PENDING: "LOCAL_STAGING_PENDING",
  LOCAL_QA_PENDING: "LOCAL_QA_PENDING",
  GIT_COMMIT_PENDING: "GIT_COMMIT_PENDING",
  PUSH_PENDING: "PUSH_PENDING",
  PR_PENDING: "PR_PENDING",
  PR_REVIEW_PENDING: "PR_REVIEW_PENDING",
  MERGE_PENDING_APPROVAL: "MERGE_PENDING_APPROVAL",
  PRODUCTION_DEPLOYMENT_PENDING_APPROVAL: "PRODUCTION_DEPLOYMENT_PENDING_APPROVAL",
  LIVE_VERIFICATION_PENDING: "LIVE_VERIFICATION_PENDING",
  COMPLETED: "COMPLETED",

  // Common & Initial
  PLANNED: "PLANNED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",

  // Intermediate & Gate Outcomes
  IMAGE_GENERATED: "IMAGE_GENERATED",
  IMAGE_AI_REVIEW: "IMAGE_AI_REVIEW",
  IMAGE_APPROVED: "IMAGE_APPROVED",
  IMAGE_REJECTED: "IMAGE_REJECTED",
  IMAGE_REVISION_REQUESTED: "IMAGE_REVISION_REQUESTED",
  VIDEO_GENERATED: "VIDEO_GENERATED",
  VIDEO_QA: "VIDEO_QA",
  VIDEO_APPROVED: "VIDEO_APPROVED",
  VIDEO_REJECTED: "VIDEO_REJECTED",
  VIDEO_REVISION_REQUESTED: "VIDEO_REVISION_REQUESTED",

  // Staging & Deployment Reconciled
  LOCAL_STAGING: "LOCAL_STAGING",
  DEPLOYMENT_PENDING_APPROVAL: "DEPLOYMENT_PENDING_APPROVAL",
  APPROVED_FOR_DEPLOYMENT: "APPROVED_FOR_DEPLOYMENT",
  DEPLOYED: "DEPLOYED",

  // Legacy & Compatibility Aliases
  PROMPTS_READY: "PROMPTS_READY",
  BUDGET_CHECKED: "BUDGET_CHECKED",
  GENERATION_PENDING_APPROVAL: "GENERATION_PENDING_APPROVAL",
  GENERATED: "GENERATED",
  MOCK_GENERATED: "MOCK_GENERATED",
  PROCESSED: "PROCESSED",
  QA_RUNNING: "QA_RUNNING",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  QA_PASSED: "QA_PASSED",
};

export const ALLOWED_TRANSITIONS = {
  // ── 1. Initial State & Verse Planning ──────────────────────────────────────
  [PRODUCTION_STATES.PLANNED]: [
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.PROMPTS_READY, // Legacy
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL]: [
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.PLANNED,
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],

  // ── 2. Image Lifecycle ──────────────────────────────────────────────────────
  [PRODUCTION_STATES.IMAGE_GENERATION_PENDING]: [
    PRODUCTION_STATES.IMAGE_GENERATED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.IMAGE_GENERATED]: [
    PRODUCTION_STATES.IMAGE_AI_REVIEW,
    PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.IMAGE_AI_REVIEW]: [
    PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.IMAGE_REVISION_REQUESTED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING]: [
    PRODUCTION_STATES.IMAGE_APPROVED,
    PRODUCTION_STATES.IMAGE_REJECTED,
    PRODUCTION_STATES.IMAGE_REVISION_REQUESTED,
    PRODUCTION_STATES.IMAGE_AI_REVIEW,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.IMAGE_REJECTED]: [
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING, // Restart image cycle
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.CANCELLED,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.IMAGE_REVISION_REQUESTED]: [
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING, // Generate revised still
    PRODUCTION_STATES.CANCELLED,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.IMAGE_APPROVED]: [
    PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL,
    PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING, // Invalidation re-triggers review
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,    // If parameters change
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],

  // ── 3. Video Lifecycle ──────────────────────────────────────────────────────
  [PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL]: [
    PRODUCTION_STATES.VIDEO_GENERATING,
    PRODUCTION_STATES.VIDEO_GENERATED,
    PRODUCTION_STATES.MOCK_GENERATED,
    PRODUCTION_STATES.GENERATED, // Legacy
    PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING, // Invalidation fallback
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_GENERATING]: [
    PRODUCTION_STATES.VIDEO_GENERATED,
    PRODUCTION_STATES.GENERATED,
    PRODUCTION_STATES.VIDEO_QA,
    PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_GENERATED]: [
    PRODUCTION_STATES.VIDEO_QA,
    PRODUCTION_STATES.PROCESSED, // Legacy
    PRODUCTION_STATES.QA_RUNNING, // Legacy
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_QA]: [
    PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.VIDEO_REVISION_REQUESTED,
    PRODUCTION_STATES.QA_PASSED, // Legacy
    PRODUCTION_STATES.NEEDS_REVIEW, // Legacy
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING]: [
    PRODUCTION_STATES.VIDEO_APPROVED,
    PRODUCTION_STATES.VIDEO_REJECTED,
    PRODUCTION_STATES.VIDEO_REVISION_REQUESTED,
    PRODUCTION_STATES.QA_PASSED, // Legacy
    PRODUCTION_STATES.NEEDS_REVIEW, // Legacy
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_REJECTED]: [
    PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL, // Re-try video
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,          // Re-do from image
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_REVISION_REQUESTED]: [
    PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL, // Re-generate video
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,          // Re-do from image if needed
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.VIDEO_APPROVED]: [
    PRODUCTION_STATES.LOCAL_STAGING_PENDING,
    PRODUCTION_STATES.LOCAL_STAGING,
    PRODUCTION_STATES.DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT, // Legacy
    PRODUCTION_STATES.VIDEO_REVISION_REQUESTED,
    PRODUCTION_STATES.VIDEO_REJECTED,
    PRODUCTION_STATES.IMAGE_REVISION_REQUESTED,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],

  // ── 4. Staging, Release & Deployment Gates ──────────────────────────────────
  [PRODUCTION_STATES.LOCAL_STAGING_PENDING]: [
    PRODUCTION_STATES.LOCAL_STAGING,
    PRODUCTION_STATES.LOCAL_QA_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.LOCAL_STAGING]: [
    PRODUCTION_STATES.LOCAL_QA_PENDING,
    PRODUCTION_STATES.GIT_COMMIT_PENDING,
    PRODUCTION_STATES.DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT, // Legacy
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.LOCAL_QA_PENDING]: [
    PRODUCTION_STATES.GIT_COMMIT_PENDING,
    PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.QA_PASSED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.GIT_COMMIT_PENDING]: [
    PRODUCTION_STATES.PUSH_PENDING,
    PRODUCTION_STATES.PR_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.PUSH_PENDING]: [
    PRODUCTION_STATES.PR_PENDING,
    PRODUCTION_STATES.PR_REVIEW_PENDING,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.PR_PENDING]: [
    PRODUCTION_STATES.PR_REVIEW_PENDING,
    PRODUCTION_STATES.MERGE_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.PR_REVIEW_PENDING]: [
    PRODUCTION_STATES.MERGE_PENDING_APPROVAL,
    PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.MERGE_PENDING_APPROVAL]: [
    PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL]: [
    PRODUCTION_STATES.LIVE_VERIFICATION_PENDING,
    PRODUCTION_STATES.DEPLOYED,
    PRODUCTION_STATES.COMPLETED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.DEPLOYMENT_PENDING_APPROVAL]: [
    PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.LIVE_VERIFICATION_PENDING,
    PRODUCTION_STATES.DEPLOYED,
    PRODUCTION_STATES.COMPLETED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT]: [
    PRODUCTION_STATES.PRODUCTION_DEPLOYMENT_PENDING_APPROVAL,
    PRODUCTION_STATES.DEPLOYED,
    PRODUCTION_STATES.COMPLETED,
    PRODUCTION_STATES.QA_PASSED,
    PRODUCTION_STATES.NEEDS_REVIEW,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.LIVE_VERIFICATION_PENDING]: [
    PRODUCTION_STATES.COMPLETED,
    PRODUCTION_STATES.DEPLOYED,
    PRODUCTION_STATES.FAILED,
    PRODUCTION_STATES.CANCELLED,
  ],
  [PRODUCTION_STATES.DEPLOYED]: [
    PRODUCTION_STATES.COMPLETED,
    PRODUCTION_STATES.NEEDS_REVIEW,
  ],
  [PRODUCTION_STATES.COMPLETED]: [
    PRODUCTION_STATES.NEEDS_REVIEW,
  ],

  // ── 5. Legacy & Error Transitions ───────────────────────────────────────────
  [PRODUCTION_STATES.PROMPTS_READY]: [
    PRODUCTION_STATES.BUDGET_CHECKED,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.GENERATION_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.BUDGET_CHECKED]: [
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.GENERATION_PENDING_APPROVAL,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.GENERATION_PENDING_APPROVAL]: [
    PRODUCTION_STATES.GENERATED,
    PRODUCTION_STATES.MOCK_GENERATED,
    PRODUCTION_STATES.VIDEO_GENERATED,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.MOCK_GENERATED]: [
    PRODUCTION_STATES.PROCESSED,
    PRODUCTION_STATES.VIDEO_QA,
    PRODUCTION_STATES.QA_RUNNING,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.GENERATED]: [
    PRODUCTION_STATES.PROCESSED,
    PRODUCTION_STATES.VIDEO_QA,
    PRODUCTION_STATES.QA_RUNNING,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.PROCESSED]: [
    PRODUCTION_STATES.QA_RUNNING,
    PRODUCTION_STATES.VIDEO_QA,
    PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.QA_RUNNING]: [
    PRODUCTION_STATES.QA_PASSED,
    PRODUCTION_STATES.NEEDS_REVIEW,
    PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.NEEDS_REVIEW]: [
    PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT,
    PRODUCTION_STATES.VIDEO_APPROVED,
    PRODUCTION_STATES.PROCESSED,
    PRODUCTION_STATES.FAILED,
  ],
  [PRODUCTION_STATES.QA_PASSED]: [
    PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT,
    PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING,
    PRODUCTION_STATES.VIDEO_APPROVED,
    PRODUCTION_STATES.LOCAL_STAGING,
    PRODUCTION_STATES.DEPLOYED,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
  ],
  [PRODUCTION_STATES.FAILED]: [
    PRODUCTION_STATES.PLANNED,
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
    PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL,
    PRODUCTION_STATES.PROCESSED,
  ],
  [PRODUCTION_STATES.CANCELLED]: [
    PRODUCTION_STATES.PLANNED,
    PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL,
    PRODUCTION_STATES.IMAGE_GENERATION_PENDING,
  ],
};

export const MAX_RETRY_LIMIT = 2;

/**
 * Computes a deterministic SHA-256 hash of a string or file.
 */
export function computeHash(contentOrPath) {
  if (typeof contentOrPath === "string" && fs.existsSync(contentOrPath)) {
    const buffer = fs.readFileSync(contentOrPath);
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }
  return crypto.createHash("sha256").update(String(contentOrPath)).digest("hex");
}

/**
 * Widescreen Landscape Tolerance Policy:
 * Defines acceptable aspect ratio bounds [1.72, 1.82] for candidate still images
 * representing widescreen landscape framing. This range accommodates provider-synthesized
 * grid-aligned landscape presets (e.g. 1344x768 [1.750:1] from gemini-2.5-flash-image
 * and 1920x1080 [1.7778:1]) while strictly blocking square (1.0), portrait (0.56),
 * 4:3 (1.33), or 3:2 (1.50) layouts. Note: 1.72-1.82 is an empirical widescreen
 * tolerance range, not mathematical exact 16:9.
 */
export const ASPECT_RATIO_POLICY = {
  minRatio: 1.72,
  maxRatio: 1.82,
  minWidth: 1280,
  minHeight: 720,
  description: "Widescreen landscape tolerance range [1.72, 1.82]",
  targetRatioName: "16:9",
};

/**
 * Creates an immutable cryptographic record of human image approval.
 */
export function createImageApprovalRecord({
  surahNum,
  clipId,
  imagePath,
  stillPrompt = null,
  videoPrompt = null,
  prompt = null,
  videoConfig = {},
  dimensions = null,
  aspectRatio = "16:9",
  reviewer = "HUMAN_OPERATOR",
  notes = "",
}) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    throw new Error(`Cannot approve image: file does not exist at '${imagePath}'`);
  }
  const imageSha256 = computeHash(imagePath);
  const stillSha = stillPrompt ? computeHash(stillPrompt) : (prompt ? computeHash(prompt) : null);
  const videoSha = videoPrompt ? computeHash(videoPrompt) : (prompt ? computeHash(prompt) : null);
  const configSha256 = computeHash(JSON.stringify(videoConfig));

  return {
    surahNum,
    clipId,
    imagePath,
    imageSha256,
    promptSha256: videoSha || stillSha,
    stillPromptSha256: stillSha,
    videoPromptSha256: videoSha,
    configSha256,
    dimensions,
    aspectRatio,
    approvedAt: new Date().toISOString(),
    reviewer,
    notes,
    isValid: true,
  };
}

/**
 * Validates an existing image approval record against current assets and configuration.
 * Returns { valid: boolean, reason?: string }.
 */
export function validateImageApproval({ clip, prompt = null, videoPrompt = null, stillPrompt = null, videoConfig = {} }) {
  if (!clip.imageApproval) {
    return { valid: false, reason: "No image approval record exists." };
  }
  const approval = clip.imageApproval;
  if (!approval.isValid) {
    return { valid: false, reason: "Image approval was explicitly marked invalid." };
  }
  if (!approval.imagePath || !fs.existsSync(approval.imagePath)) {
    return { valid: false, reason: `Approved image file is missing from disk: ${approval.imagePath}` };
  }
  if (approval.aspectRatio && approval.aspectRatio !== "16:9") {
    return { valid: false, reason: `Approved image aspect ratio '${approval.aspectRatio}' is not required 16:9 landscape format.` };
  }
  if (approval.dimensions && approval.dimensions.width && approval.dimensions.height) {
    const { width, height } = approval.dimensions;
    const aspect = height > 0 ? width / height : 0;
    if (aspect < ASPECT_RATIO_POLICY.minRatio || aspect > ASPECT_RATIO_POLICY.maxRatio) {
      return {
        valid: false,
        reason: `Approved image aspect ratio ${aspect.toFixed(3)}:1 (${width}x${height}) is outside permitted 16:9 landscape range [${ASPECT_RATIO_POLICY.minRatio}, ${ASPECT_RATIO_POLICY.maxRatio}].`,
      };
    }
    if (width < ASPECT_RATIO_POLICY.minWidth || height < ASPECT_RATIO_POLICY.minHeight) {
      return {
        valid: false,
        reason: `Approved image resolution ${width}x${height} is below minimum 720p HD requirement (${ASPECT_RATIO_POLICY.minWidth}x${ASPECT_RATIO_POLICY.minHeight}).`,
      };
    }
  }
  const currentImageSha256 = computeHash(approval.imagePath);
  if (currentImageSha256 !== approval.imageSha256) {
    return { valid: false, reason: "Approved image content has been altered on disk (hash mismatch)." };
  }
  if (stillPrompt && approval.stillPromptSha256 && computeHash(stillPrompt) !== approval.stillPromptSha256) {
    return { valid: false, reason: "Still prompt has changed since image was approved." };
  }
  if (videoPrompt && approval.videoPromptSha256 && computeHash(videoPrompt) !== approval.videoPromptSha256) {
    return { valid: false, reason: "Video prompt has changed since image was approved." };
  }
  if (prompt && !stillPrompt && !videoPrompt) {
    const pHash = computeHash(prompt);
    const matchesStill = approval.stillPromptSha256 && pHash === approval.stillPromptSha256;
    const matchesVideo = approval.videoPromptSha256 && pHash === approval.videoPromptSha256;
    const matchesLegacy = approval.promptSha256 && pHash === approval.promptSha256;
    if (!matchesStill && !matchesVideo && !matchesLegacy) {
      return { valid: false, reason: "Prompt has changed since image was approved." };
    }
  }
  if (videoConfig && Object.keys(videoConfig).length > 0) {
    const currentConfigSha256 = computeHash(JSON.stringify(videoConfig));
    if (currentConfigSha256 !== approval.configSha256) {
      return { valid: false, reason: "Video generation parameters changed since image was approved." };
    }
  }
  return { valid: true };
}

/**
 * Invalidates an approval record if prompt, image, or parameters have diverged.
 */
export function invalidateApprovalIfConfigChanged({ clip, prompt, videoConfig = {} }) {
  if (!clip.imageApproval || !clip.imageApproval.isValid) return false;
  const validation = validateImageApproval({ clip, prompt, videoConfig });
  if (!validation.valid) {
    clip.imageApproval.isValid = false;
    clip.imageApproval.invalidatedAt = new Date().toISOString();
    clip.imageApproval.invalidationReason = validation.reason;
    return true;
  }
  return false;
}

/**
 * Resolves the state file path for a Surah.
 */
export function getStateFilePath(surahNum, customDir = null) {
  const dir = customDir || path.join(ROOT, "scratch/surah_states");
  const pad = String(surahNum).padStart(3, "0");
  return path.join(dir, `surah_${pad}_state.json`);
}

/**
 * Loads an existing state file or initializes a fresh one.
 */
export function loadOrInitSurahState(surahNum, options = {}) {
  const statePath = getStateFilePath(surahNum, options.customDir);
  if (fs.existsSync(statePath) && !options.reset) {
    try {
      const raw = fs.readFileSync(statePath, "utf8");
      return JSON.parse(raw);
    } catch (e) {
      console.warn(`Failed to parse state file ${statePath}: ${e.message}. Re-initializing.`);
    }
  }

  const { visualData, surahMeta, ayahVideosMap } = options;
  const chapters = visualData?.chapters || [];
  const ayahMap = ayahVideosMap || {};

  const clips = {};

  // Register chapters
  for (const ch of chapters) {
    const clipId = String(ch.id);
    clips[clipId] = {
      id: clipId,
      category: "CHAPTER_LOOP",
      name: ch.theme || `Chapter ${ch.id}`,
      verses: `${ch.fromVerse}–${ch.toVerse}`,
      targetPath: ch.videoPath,
      localSourceMaster: null,
      localProcessedMaster: null,
      r2Url: null,
      r2Status: null,
      manifestDeclared: false,
      state: PRODUCTION_STATES.PLANNED,
      operationId: null,
      retryCount: 0,
      errors: [],
      remediationPlan: null,
      qaMetrics: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Register Ayah clips
  for (const [ayahNumStr, ayahData] of Object.entries(ayahMap)) {
    const clipId = `ayah-${ayahNumStr}`;
    clips[clipId] = {
      id: clipId,
      category: "AYAH_REAL_FOOTAGE",
      name: ayahData.theme || `Ayah ${ayahNumStr}`,
      verses: ayahNumStr,
      targetPath: ayahData.videoPath,
      localSourceMaster: null,
      localProcessedMaster: null,
      r2Url: null,
      r2Status: null,
      manifestDeclared: false,
      license: ayahData.license || "Verified Footage License",
      source: ayahData.source || "Camera Production",
      state: PRODUCTION_STATES.PLANNED,
      operationId: null,
      retryCount: 0,
      errors: [],
      remediationPlan: null,
      qaMetrics: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  const state = {
    surahNumber: surahNum,
    surahName: surahMeta?.name || `Surah ${surahNum}`,
    arabicName: surahMeta?.arabicName || "",
    totalVerses: surahMeta?.verses || 0,
    isMultiChapter: Boolean(visualData?.isMultiChapter),
    initializedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    overallState: PRODUCTION_STATES.PLANNED,
    budgetSnapshot: null,
    clips,
    summary: {
      totalClips: Object.keys(clips).length,
      deployedClips: 0,
      qaPassedClips: 0,
      needsReviewClips: 0,
      failedClips: 0,
      completionPercentage: 0,
    },
  };

  saveSurahState(state, options.customDir);
  return state;
}

/**
 * Saves state file atomically.
 */
export function saveSurahState(state, customDir = null) {
  state.lastUpdated = new Date().toISOString();
  updateSurahSummary(state);

  const statePath = getStateFilePath(state.surahNumber, customDir);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const tmpPath = `${statePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(tmpPath, statePath);
  return statePath;
}

/**
 * Resolves a clip within a Surah state by ID, numeric index, or filename slug (e.g. '03a').
 */
export function resolveClip(state, clipId) {
  if (!state || !state.clips || !clipId) return null;
  const strId = String(clipId).trim();
  if (state.clips[strId]) return state.clips[strId];
  const lower = strId.toLowerCase();
  return (
    Object.values(state.clips).find(
      (c) =>
        c.id?.toLowerCase() === lower ||
        c.targetPath?.toLowerCase().includes(`/${lower}-`) ||
        c.targetPath?.toLowerCase().includes(`/${lower}.`) ||
        c.targetPath?.toLowerCase().includes(lower)
    ) || null
  );
}

/**
 * Transitions a clip from one state to another with validation.
 */
export function transitionClip(state, clipId, targetState, metadata = {}) {
  const clip = resolveClip(state, clipId);
  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in Surah ${state.surahNumber} state.`);
  }

  if (clip.state === targetState) {
    clip.lastUpdated = new Date().toISOString();
    for (const [k, v] of Object.entries(metadata)) {
      if (v !== undefined) {
        clip[k] = v;
      }
    }
    return clip;
  }

  const allowed = ALLOWED_TRANSITIONS[clip.state] || [];
  if (!allowed.includes(targetState)) {
    throw new Error(
      `Invalid state transition for clip '${clipId}': cannot move from '${clip.state}' to '${targetState}'. Allowed: [${allowed.join(", ")}]`
    );
  }

  clip.state = targetState;
  clip.lastUpdated = new Date().toISOString();

  // Merge metadata safely
  for (const [k, v] of Object.entries(metadata)) {
    if (v !== undefined) {
      clip[k] = v;
    }
  }

  if (targetState === PRODUCTION_STATES.FAILED && metadata.error) {
    clip.errors.push({
      timestamp: new Date().toISOString(),
      message: metadata.error,
      stage: clip.state,
    });
  }

  return clip;
}

/**
 * Recalculates Surah-level aggregate metrics.
 */
export function updateSurahSummary(state) {
  const clips = Object.values(state.clips);
  const total = clips.length;

  let deployed = 0;
  let qaPassed = 0;
  let needsReview = 0;
  let failed = 0;

  for (const c of clips) {
    if (c.state === PRODUCTION_STATES.DEPLOYED) deployed++;
    else if (c.state === PRODUCTION_STATES.QA_PASSED) qaPassed++;
    else if (c.state === PRODUCTION_STATES.NEEDS_REVIEW) needsReview++;
    else if (c.state === PRODUCTION_STATES.FAILED) failed++;
  }

  state.summary = {
    totalClips: total,
    deployedClips: deployed,
    qaPassedClips: qaPassed,
    needsReviewClips: needsReview,
    failedClips: failed,
    completionPercentage: total > 0 ? Math.round((deployed / total) * 100) : 0,
  };

  // Derive overall Surah state
  if (total === 0) {
    state.overallState = PRODUCTION_STATES.PLANNED;
  } else if (deployed === total) {
    state.overallState = PRODUCTION_STATES.DEPLOYED;
  } else if (failed > 0) {
    state.overallState = PRODUCTION_STATES.FAILED;
  } else if (needsReview > 0) {
    state.overallState = PRODUCTION_STATES.NEEDS_REVIEW;
  } else if (qaPassed === total) {
    state.overallState = PRODUCTION_STATES.QA_PASSED;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.QA_RUNNING)) {
    state.overallState = PRODUCTION_STATES.QA_RUNNING;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.PROCESSED)) {
    state.overallState = PRODUCTION_STATES.PROCESSED;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.GENERATED || c.state === PRODUCTION_STATES.MOCK_GENERATED)) {
    state.overallState = PRODUCTION_STATES.GENERATED;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.GENERATION_PENDING_APPROVAL)) {
    state.overallState = PRODUCTION_STATES.GENERATION_PENDING_APPROVAL;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.BUDGET_CHECKED)) {
    state.overallState = PRODUCTION_STATES.BUDGET_CHECKED;
  } else if (clips.some((c) => c.state === PRODUCTION_STATES.PROMPTS_READY)) {
    state.overallState = PRODUCTION_STATES.PROMPTS_READY;
  } else {
    state.overallState = PRODUCTION_STATES.PLANNED;
  }
}

/**
 * Remediation Rule Engine:
 * Analyzes a clip's QA metrics and failures to prescribe an automated or human-review action.
 */
export function evaluateRemediation(clip) {
  const plan = {
    clipId: clip.id,
    action: "NONE",
    requiresApproval: false,
    reason: "",
    recipe: null,
  };

  // 1. Missing local asset
  if (!clip.localSourceMaster && !clip.localProcessedMaster) {
    if (clip.category === "AYAH_REAL_FOOTAGE") {
      plan.action = "INVESTIGATE_REAL_FOOTAGE";
      plan.requiresApproval = true;
      plan.reason = "Missing authentic real-footage clip. Check REAL_FOOTAGE_LICENSES.md. NEVER synthesize with AI.";
      return plan;
    } else {
      plan.action = "PREPARE_GENERATION";
      plan.requiresApproval = true;
      plan.reason = "Missing chapter loop asset. Check prompt preparation and evaluate budget.";
      return plan;
    }
  }

  const m = clip.qaMetrics;
  if (!m) return plan;

  // 2. Letterboxing defect
  if (m.letterbox && m.letterbox.isLetterboxed) {
    plan.action = "REMEDIATE_LETTERBOX";
    plan.requiresApproval = true;
    plan.reason = `Confirmed letterboxing (active height ${m.letterbox.h} < 95% of nominal).`;
    plan.recipe = `crop=${m.letterbox.w}:${m.letterbox.h}:${m.letterbox.x}:${m.letterbox.y},scale=1920:1080:flags=lanczos`;
    return plan;
  }

  // 3. Audio track on web asset
  if (clip.category === "CHAPTER_LOOP" && m.probe && m.probe.hasAudio) {
    plan.action = "STRIP_AUDIO";
    plan.requiresApproval = false;
    plan.reason = "Chapter master retains audio track; strip audio (-an) during web re-encoding.";
    plan.recipe = "-an";
    return plan;
  }

  // 4. Codec or pixel format non-compliance
  if (m.probe && (m.probe.codec !== "h264" || m.probe.pixFmt !== "yuv420p")) {
    plan.action = "RECODE_STANDARD";
    plan.requiresApproval = false;
    plan.reason = `Non-standard encoding: codec=${m.probe.codec}, pix_fmt=${m.probe.pixFmt}. Re-encode to H.264 yuv420p.`;
    plan.recipe = "-c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20";
    return plan;
  }

  // 5. Seam discontinuity on raw clip
  if (m.seamSSIM && m.seamSSIM.all !== null && m.seamSSIM.all < 0.65) {
    plan.action = "APPLY_SEAM_CROSSFADE";
    plan.requiresApproval = false;
    plan.reason = `Low raw boundary SSIM (${m.seamSSIM.all.toFixed(4)}). Apply canonical 0.40s crossfade seam.`;
    plan.recipe = "crossfade_duration=0.40s";
    return plan;
  }

  return plan;
}
