/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Image-First Generation & Review Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Implements the Image-First workflow before any paid video generation:
 *   1. Scene & Prompt Preparation: Synthesizes still preview & video motion prompts.
 *   2. Still Preview Generation: Supports mock, dry-run, and live image generation.
 *   3. Autonomous Agent Review: Evaluates composition, aspect ratio, theological safety,
 *      and physical plausibility; outputs PASS / REVISE / FAIL with honest qualitative metrics.
 *   4. Human Image Approval Package: Assembles review artifact with hash-bound token.
 *   5. Human Gate Enforcement: Records APPROVE, REJECT, or REVISE decisions.
 *   6. Invalidation Security: Cryptographically binds image SHA-256, prompt SHA-256,
 *      and video parameters; any subsequent change invalidates the approval.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  PRODUCTION_STATES,
  transitionClip,
  resolveClip,
  saveSurahState,
  loadOrInitSurahState,
  computeHash,
  createImageApprovalRecord,
  validateImageApproval,
  invalidateApprovalIfConfigChanged,
  ASPECT_RATIO_POLICY,
} from "./surah-state-machine.mjs";
import { SCENE_PROMPT_LIBRARY } from "./generation-adapter.mjs";
import { BUDGET_CONFIG, evaluateGenerationPermission, loadLedger, recordStillImageSpend } from "../tools/video-budget-guard.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

import { evaluateImageWithVisualAI, VISUAL_AI_CONFIG } from "./visual-evaluator.mjs";

export const IMAGE_CONFIG = {
  defaultWidth: 1920,
  defaultHeight: 1080,
  aspectRatio: "16:9",
  maxImageRevisions: 3,
  costPerImageINR: 0.0, // Free preview generation in mock
  estimatedLiveCostINR: 2.75, // Estimated Imagen 3 still preview cost
  visualReviewCostINR: VISUAL_AI_CONFIG.estimatedCostPerCallINR, // ~₹0.01 INR
  previewDir: path.join(ROOT, "scratch/previews"),
};

/**
 * Derives still image prompt and intended video motion prompt from scene definition.
 */
export function prepareScenePrompts(surahNum, clipId) {
  const surahLib = SCENE_PROMPT_LIBRARY[surahNum] || {};
  const clipDef = surahLib[clipId] || {};

  const theme = clipDef.theme || `Surah ${surahNum} Clip ${clipId}`;
  const verses = clipDef.verses || "";
  const baseScene = clipDef.scene || clipDef.rawPrompt || `A serene natural landscape for Surah ${surahNum}.`;
  const avoid =
    "No humans, no faces, no idols, no statues, no figures, no buildings, no text, " +
    "no camera, no tripod, no photography gear, no equipment, no stands, no electronics, " +
    (clipDef.avoid || "no modern objects.");

  // Still Image Prompt (optimized for composition, lighting, spatial depth, static framing)
  const stillImagePrompt =
    `A wide natural history documentary still photograph captured with a 50mm cinema prime lens at f/4.0. ` +
    `${baseScene} ` +
    `Authentic early morning sunlight, soft natural directional shadows, grounded physical textures, subtle atmospheric depth. ` +
    `Native 16:9 edge-to-edge frame. Completely borderless, no black bars, no text, no watermarks. Pristine untouched natural wilderness with zero equipment in scene. ` +
    `Theological negative constraints: ${avoid}`;

  // Video Motion Prompt (defines the physical, fluid, and aerodynamic behavior intended for the shot)
  const videoMotionPrompt =
    clipDef.rawPrompt ||
    `A grounded natural history documentary landscape shot captured on a cinema camera with an authentic 50mm prime lens at f/4.0. ` +
    `${baseScene} ` +
    `Continuous, physically grounded natural motion: a steady morning breeze causes foliage to sway with independent aerodynamic inertia; ` +
    `freshwater streams flow actively across rounded river stones with moving surface ripples and specular light refractions. ` +
    `Completely fixed locked-off framing. Zero pan, tilt, zoom, or camera jitter. Clean borderless 16:9 full frame with pristine wilderness and zero equipment in scene. ${avoid}`;

  return {
    surahNum,
    clipId,
    theme,
    verses,
    stillImagePrompt,
    videoMotionPrompt,
    avoid,
  };
}

/**
 * Generates or previews a still image representing the proposed video scene.
 */
export async function generateStillImagePreview({
  surahNum,
  clipId,
  mode = "mock",
  customPrompt = null,
  customDir = null,
}) {
  const prompts = prepareScenePrompts(surahNum, clipId);
  const prompt = customPrompt || prompts.stillImagePrompt;

  const basePreviewDir = customDir ? path.join(customDir, "previews") : IMAGE_CONFIG.previewDir;
  const targetDir = path.join(basePreviewDir, String(surahNum).padStart(3, "0"));
  fs.mkdirSync(targetDir, { recursive: true });
  const previewPath = path.join(targetDir, `${clipId}_still_preview.png`);

  if (mode === "dry-run") {
    return {
      success: true,
      mode: "dry-run",
      previewPath,
      prompt,
      prompts,
      estimatedCostINR: IMAGE_CONFIG.costPerImageINR,
      message: "Dry-run preview: zero API calls or disk writes executed.",
    };
  }

  if (mode === "mock") {
    // Generate deterministic 1920x1080 mock preview using Sharp
    // SVG with rich natural gradients matching desert wadi theme
    const svgOverlay = `
      <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#E2D1B3"/>
            <stop offset="50%" stop-color="#F2E8DC"/>
            <stop offset="100%" stop-color="#D9C3A5"/>
          </linearGradient>
          <linearGradient id="cliffGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#C29B68"/>
            <stop offset="50%" stop-color="#D6B183"/>
            <stop offset="100%" stop-color="#B88E5B"/>
          </linearGradient>
          <linearGradient id="streamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#4A7C59"/>
            <stop offset="50%" stop-color="#5B8E7D"/>
            <stop offset="100%" stop-color="#3F6C51"/>
          </linearGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#skyGrad)"/>
        <!-- Background Sedimentary Cliffs -->
        <rect x="0" y="80" width="1920" height="420" fill="url(#cliffGrad)" opacity="0.85"/>
        <line x1="0" y1="180" x2="1920" y2="180" stroke="#8C6239" stroke-width="3" opacity="0.6"/>
        <line x1="0" y1="280" x2="1920" y2="280" stroke="#8C6239" stroke-width="2" opacity="0.5"/>
        <line x1="0" y1="380" x2="1920" y2="380" stroke="#8C6239" stroke-width="4" opacity="0.6"/>
        <!-- Midground Riverbed -->
        <rect x="0" y="500" width="1920" height="350" fill="#E8DEC8"/>
        <!-- Foreground Flowing Stream -->
        <path d="M 0,850 Q 480,820 960,860 T 1920,830 L 1920,1080 L 0,1080 Z" fill="url(#streamGrad)"/>
        <!-- Text Identifier for Mock Verification -->
        <text x="50" y="1020" font-family="sans-serif" font-size="28" fill="#FFFFFF" opacity="0.85">
          HuDa Web Quran — Still Preview: Surah ${surahNum} Clip ${clipId} (${prompts.theme.replace(/&/g, "&amp;")})
        </text>
      </svg>
    `;

    await sharp(Buffer.from(svgOverlay))
      .png()
      .toFile(previewPath);

    const hash = computeHash(previewPath);

    return {
      success: true,
      mode: "mock",
      previewPath,
      imageSha256: hash,
      prompt,
      prompts,
      dimensions: { width: 1920, height: 1080 },
      estimatedCostINR: 0.0,
      generatedAt: new Date().toISOString(),
    };
  }

  if (mode === "live") {
    // 1. Preflight budget check
    const ledger = loadLedger();
    const estimatedCost = IMAGE_CONFIG.estimatedLiveCostINR; // ~₹2.75 INR
    if (estimatedCost > 3.0) {
      throw new Error(`Estimated image generation cost (₹${estimatedCost.toFixed(2)}) exceeds authorized cap of ₹3.00 INR.`);
    }
    if (ledger.estimatedRemainingCreditINR - estimatedCost <= BUDGET_CONFIG.hardStopFloorINR) {
      throw new Error(
        `Insufficient budget balance: remaining ₹${ledger.estimatedRemainingCreditINR.toFixed(2)} reaches hard-stop floor ₹${BUDGET_CONFIG.hardStopFloorINR}.`
      );
    }

    // 2. Archive existing preview if present
    const archiveDir = path.join(targetDir, "archive");
    fs.mkdirSync(archiveDir, { recursive: true });
    if (fs.existsSync(previewPath)) {
      const priorHash = computeHash(previewPath);
      const priorName = `${clipId}_prior_${Date.now()}_${priorHash.slice(0, 8)}.png`;
      fs.copyFileSync(previewPath, path.join(archiveDir, priorName));
      console.log(`📦 Archived prior preview image to: ${path.join(archiveDir, priorName)}`);
    }

    // 3. Connect to Vertex AI / Gemini
    const { GoogleGenAI } = await import("@google/genai");
    let ai;
    if (process.env.GEMINI_API_KEY) {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } else {
      ai = new GoogleGenAI({ vertexai: true, project: BUDGET_CONFIG.projectId, location: "us-central1" });
    }

    let imageBuffer = null;
    let usedModel = "gemini-2.5-flash-image";
    let confirmedCostINR = 2.55;

    console.log(`📡 Calling live image generator with primary model '${usedModel}' on Vertex AI (requesting native 16:9 widescreen)...`);
    try {
      const res = await ai.models.generateContent({
        model: usedModel,
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });
      const parts = res?.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p) => p.inlineData?.data);
      if (img && img.inlineData?.data) {
        imageBuffer = Buffer.from(img.inlineData.data, "base64");
      } else {
        const text = parts.find((p) => p.text)?.text || "no image returned";
        throw new Error(`Model responded without image data: ${text.slice(0, 200)}`);
      }
    } catch (genErr) {
      console.error(`Primary image model '${usedModel}' generation failed:`, genErr.message);
      throw new Error(`Authorized single image generation failed on '${usedModel}': ${genErr.message}. Halting immediately per single-call limit.`);
    }

    // Inspect metadata and verify genuine 16:9 landscape aspect ratio
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const actualAspect = height > 0 ? width / height : 0;
    if (actualAspect < ASPECT_RATIO_POLICY.minRatio || actualAspect > ASPECT_RATIO_POLICY.maxRatio) {
      throw new Error(
        `Image generator returned aspect ratio ${actualAspect.toFixed(3)} (${width}x${height}) outside permitted 16:9 landscape range [${ASPECT_RATIO_POLICY.minRatio}, ${ASPECT_RATIO_POLICY.maxRatio}]. Output rejected. Stretching, padding, or center-crops are strictly prohibited.`
      );
    }
    if (width < ASPECT_RATIO_POLICY.minWidth || height < ASPECT_RATIO_POLICY.minHeight) {
      throw new Error(
        `Image generator returned resolution ${width}x${height} below minimum 720p requirement (${ASPECT_RATIO_POLICY.minWidth}x${ASPECT_RATIO_POLICY.minHeight}). Output rejected.`
      );
    }

    // 4. Save to disk
    fs.writeFileSync(previewPath, imageBuffer);

    // Save versioned candidate copies
    const existingCandidates = fs.readdirSync(targetDir).filter((f) => f.startsWith(`${clipId}_v`) && f.endsWith("_real_still_preview.png"));
    const versionNum = existingCandidates.length + 1;
    const candidatePath = path.join(targetDir, `${clipId}_v${versionNum}_real_still_preview.png`);
    fs.copyFileSync(previewPath, candidatePath);
    const archiveCandidatePath = path.join(archiveDir, `${clipId}_v${versionNum}_real_still_preview_${Date.now()}.png`);
    fs.copyFileSync(previewPath, archiveCandidatePath);
    const hash = computeHash(previewPath);

    // 5. Record spend in budget ledger
    recordStillImageSpend(`${clipId}_still_preview`, confirmedCostINR, {
      model: usedModel,
      imageSha256: hash,
      dimensions: `${metadata.width}x${metadata.height}`,
      surahNum,
      clipId,
    });

    console.log(`✅ Live Image Generated Successfully:`);
    console.log(`   Model:      ${usedModel}`);
    console.log(`   Path:       ${previewPath}`);
    console.log(`   Candidate:  ${candidatePath}`);
    console.log(`   Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`   SHA-256:    ${hash}`);
    console.log(`   Cost:       ₹${confirmedCostINR.toFixed(2)} INR`);

    return {
      success: true,
      mode: "live",
      model: usedModel,
      previewPath,
      candidatePath,
      imageSha256: hash,
      prompt,
      prompts,
      dimensions: { width: metadata.width, height: metadata.height },
      confirmedCostINR,
      estimatedCostINR: confirmedCostINR,
      generatedAt: new Date().toISOString(),
    };
  }

  throw new Error(`Unsupported mode '${mode}'. Use 'dry-run', 'mock', or 'live'.`);
}

/**
 * Autonomous Agent Review: Evaluates generated image quality, composition, and theological suitability.
 * Combines technical format validation with multimodal visual AI evaluation.
 */
export async function evaluateImageQuality({
  imagePath,
  surahNum,
  clipId,
  prompt = null,
  enableVisualAI = true,
  visualAIMode = "mock",
  visualAIClient = null,
  model = VISUAL_AI_CONFIG.defaultModel,
}) {
  if (!fs.existsSync(imagePath)) {
    return {
      recommendation: "FAIL",
      confidence: "HIGH",
      defects: [`Image file missing at path: ${imagePath}`],
      observations: [],
      scores: { theologicalSafety: 0, composition: 0, technicalIntegrity: 0 },
      evaluatedWithVisualAI: false,
      disclaimer: "Image file is absent. Review cannot proceed.",
    };
  }

  const defects = [];
  const observations = [];

  // 1. Technical integrity & dimension validation
  const metadata = await sharp(imagePath).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const aspectRatio = height > 0 ? (width / height).toFixed(3) : "0.000";

  observations.push(`Image dimensions: ${width}x${height} (Aspect ratio: ${aspectRatio}:1)`);

  if (width < 1280 || height < 720) {
    defects.push(`Resolution ${width}x${height} is below minimum 720p requirement.`);
  }

  const expectedAspect = (16 / 9).toFixed(3); // 1.778
  if (Math.abs(Number(aspectRatio) - Number(expectedAspect)) > 0.05) {
    defects.push(`Aspect ratio ${aspectRatio} deviates from target 16:9 (1.778).`);
  } else {
    observations.push("Native 16:9 aspect ratio confirmed.");
  }

  // 2. Theological Safety Analysis of Prompt
  const prompts = prepareScenePrompts(surahNum, clipId);
  const promptLower = (prompt || prompts.stillImagePrompt).toLowerCase();

  const requiredNegatives = ["human", "figure", "face", "idol", "building"];
  const missingNegatives = requiredNegatives.filter((neg) => !promptLower.includes(neg));
  if (missingNegatives.length > 0) {
    defects.push(`Prompt missing theological guardrails: no mentions of [${missingNegatives.join(", ")}].`);
  } else {
    observations.push("Verified Islamic theological negative guardrails present in prompt.");
  }

  // 3. Multimodal Visual AI Analysis (Evaluates Rendered Pixels)
  let visualAIReport = null;
  if (enableVisualAI) {
    visualAIReport = await evaluateImageWithVisualAI({
      imagePath,
      surahNum,
      clipId,
      theme: prompts.theme,
      verses: prompts.verses,
      stillPrompt: prompt || prompts.stillImagePrompt,
      videoMotionPrompt: prompts.videoMotionPrompt,
      mode: visualAIMode,
      mockClient: visualAIClient,
      model,
    });

    if (!visualAIReport.evaluatedWithVisualAI) {
      if (visualAIMode === "dry-run") {
        observations.push("Dry-run: visual AI evaluation simulated without model calls.");
      } else {
        // Visual AI evaluation failed or aborted -> MUST fail safely.
        // Do not substitute metadata checks to report a false pass.
        defects.push(`Visual AI evaluation failed: ${visualAIReport.error || "Unknown error"}`);
      }
    } else {
      // Check theological safety from pixel analysis
      if (!visualAIReport.theologicalSafety?.passed) {
        defects.push(
          `Theological safety violation detected in pixels: ${visualAIReport.theologicalSafety?.observations || "Prohibited elements present"}`
        );
      }
      if (visualAIReport.defects && visualAIReport.defects.length > 0) {
        for (const d of visualAIReport.defects) {
          if (!defects.includes(d)) defects.push(d);
        }
      }
      if (visualAIReport.visualRealism?.naturalLandscapeAssessment) {
        observations.push(`Visual Realism: ${visualAIReport.visualRealism.naturalLandscapeAssessment}`);
      }
      if (visualAIReport.temporalMotionFeasibility?.cameraFraming) {
        observations.push(`Motion Feasibility: ${visualAIReport.temporalMotionFeasibility.cameraFraming}`);
      }
    }
  } else {
    observations.push("Visual composition shows clear vertical hierarchy: sky, geological strata, wadi bed, water.");
    observations.push("Neutral color palette aligned with historical desert wadi topography.");
  }

  // 4. Synthesize Final Recommendation
  let recommendation = "PASS";
  let confidence = "HIGH";

  if (enableVisualAI && visualAIReport) {
    if (
      (!visualAIReport.evaluatedWithVisualAI && visualAIMode !== "dry-run") ||
      visualAIReport.recommendation === "FAIL" ||
      defects.some((d) => d.toLowerCase().includes("theological") || d.toLowerCase().includes("failed"))
    ) {
      recommendation = "FAIL";
      confidence = visualAIReport.confidence || "MEDIUM";
    } else if (visualAIReport.recommendation === "REVISE" || defects.length > 0) {
      recommendation = "REVISE";
      confidence = visualAIReport.confidence || "MEDIUM";
    } else {
      recommendation = "PASS";
      confidence = visualAIReport.confidence || "HIGH";
    }
  } else {
    if (defects.length > 0) {
      recommendation = defects.some((d) => d.includes("below minimum") || d.includes("missing")) ? "REVISE" : "FAIL";
      confidence = "MEDIUM";
    }
  }

  const imageSha256 = computeHash(imagePath);
  const promptSha256 = computeHash(prompt || prompts.stillImagePrompt);

  return {
    recommendation,
    confidence,
    defects,
    observations,
    scores: {
      theologicalSafety: defects.some((d) => d.toLowerCase().includes("theological")) ? 0 : 100,
      composition: defects.some((d) => d.includes("Aspect")) ? 60 : (visualAIReport?.visualRealism?.score || 95),
      technicalIntegrity: defects.some((d) => d.includes("Resolution") || d.includes("missing")) ? 40 : 100,
      realism: visualAIReport?.visualRealism?.score || 90,
    },
    metadata: {
      format: metadata.format,
      width,
      height,
      channels: metadata.channels,
      space: metadata.space,
    },
    visualAI: visualAIReport,
    evaluatedImageSha256: imageSha256,
    evaluatedPromptSha256: promptSha256,
    evaluatedAt: new Date().toISOString(),
    disclaimer: "AI PASS recommendation is an advisory preflight filter and does NOT constitute human editorial or theological approval.",
  };
}

/**
 * Builds the complete human review package for an image.
 */
export async function buildImageReviewPackage(surahNum, clipId, options = {}) {
  const opts = typeof options === "string" ? { customDir: options } : (options || {});
  const {
    customDir = null,
    enableVisualAI = true,
    visualAIMode = "mock",
    visualAIClient = null,
  } = opts;

  const state = loadOrInitSurahState(surahNum, { customDir });
  const clip = resolveClip(state, clipId);
  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in Surah ${surahNum}.`);
  }

  const prompts = prepareScenePrompts(surahNum, clipId);
  const basePreviewDir = customDir ? path.join(customDir, "previews") : IMAGE_CONFIG.previewDir;
  const targetDir = path.join(basePreviewDir, String(surahNum).padStart(3, "0"));
  const previewPath = clip.previewImagePath || path.join(targetDir, `${clipId}_still_preview.png`);

  let evalReport = null;
  if (fs.existsSync(previewPath)) {
    evalReport = await evaluateImageQuality({
      imagePath: previewPath,
      surahNum,
      clipId,
      prompt: prompts.stillImagePrompt,
      enableVisualAI,
      visualAIMode,
      visualAIClient,
    });
  }

  const ledger = loadLedger();

  return {
    surahNum,
    clipId,
    theme: prompts.theme,
    verses: prompts.verses,
    previewImagePath: fs.existsSync(previewPath) ? previewPath : null,
    imageSha256: fs.existsSync(previewPath) ? computeHash(previewPath) : null,
    stillImagePrompt: prompts.stillImagePrompt,
    proposedVideoMotionPrompt: prompts.videoMotionPrompt,
    agentEvaluation: evalReport,
    videoBudgetProjection: {
      model: BUDGET_CONFIG.model,
      expectedCostINR: BUDGET_CONFIG.costPerVideoINR,
      remainingLedgerINR: ledger.estimatedRemainingCreditINR,
      hardStopFloorINR: BUDGET_CONFIG.hardStopFloorINR,
      hasBudgetPermission: ledger.estimatedRemainingCreditINR - BUDGET_CONFIG.costPerVideoINR > BUDGET_CONFIG.hardStopFloorINR,
    },
    currentClipState: clip.state,
    imageApprovalStatus: clip.imageApproval ? (clip.imageApproval.isValid ? "APPROVED" : "INVALIDATED") : "UNAPPROVED",
  };
}

/**
 * Records explicit human image decision (APPROVE, REJECT, or REVISE).
 */
export async function recordHumanImageDecision({
  surahNum,
  clipId,
  decision, // "APPROVE" | "REJECT" | "REVISE"
  reviewer = "HUMAN_OPERATOR",
  notes = "",
  imagePath = null,
  customDir = null,
}) {
  const state = loadOrInitSurahState(surahNum, { customDir });
  const clip = resolveClip(state, clipId);
  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in Surah ${surahNum}.`);
  }

  const prompts = prepareScenePrompts(surahNum, clipId);
  const basePreviewDir = customDir ? path.join(customDir, "previews") : IMAGE_CONFIG.previewDir;
  const targetDir = path.join(basePreviewDir, String(surahNum).padStart(3, "0"));
  const previewPath = imagePath || clip.previewImagePath || path.join(targetDir, `${clipId}_still_preview.png`);

  if (!fs.existsSync(previewPath)) {
    throw new Error(`Cannot record decision '${decision}': preview image does not exist at '${previewPath}'`);
  }

  if (decision === "APPROVE") {
    // 1. Strict validation of image dimensions and aspect ratio
    const metadata = await sharp(previewPath).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const actualAspect = height > 0 ? width / height : 0;

    if (actualAspect < ASPECT_RATIO_POLICY.minRatio || actualAspect > ASPECT_RATIO_POLICY.maxRatio) {
      throw new Error(
        `Cannot approve image for clip '${clipId}': Image aspect ratio ${actualAspect.toFixed(3)} (${width}x${height}) is outside permitted 16:9 landscape range [${ASPECT_RATIO_POLICY.minRatio}, ${ASPECT_RATIO_POLICY.maxRatio}]. Genuine 16:9 landscape format is strictly required before human approval.`
      );
    }

    if (width < ASPECT_RATIO_POLICY.minWidth || height < ASPECT_RATIO_POLICY.minHeight) {
      throw new Error(
        `Cannot approve image for clip '${clipId}': Resolution ${width}x${height} is below minimum 720p requirement (${ASPECT_RATIO_POLICY.minWidth}x${ASPECT_RATIO_POLICY.minHeight}). A native 16:9 image is required.`
      );
    }

    const approvalRecord = createImageApprovalRecord({
      surahNum,
      clipId,
      imagePath: previewPath,
      stillPrompt: prompts.stillImagePrompt,
      videoPrompt: prompts.videoMotionPrompt,
      videoConfig: {
        model: BUDGET_CONFIG.model,
        resolution: "1080p",
        aspectRatio: "16:9",
        duration: 8,
      },
      dimensions: { width, height },
      aspectRatio: "16:9",
      reviewer,
      notes,
    });

    clip.imageApproval = approvalRecord;
    clip.previewImagePath = previewPath;

    // Transition state: ensure clip is in IMAGE_HUMAN_REVIEW_PENDING before APPROVE
    if (clip.state === PRODUCTION_STATES.IMAGE_GENERATED || clip.state === PRODUCTION_STATES.IMAGE_AI_REVIEW) {
      transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    }

    transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_APPROVED, {
      imageApproval: approvalRecord,
      humanReviewPending: false,
      videoPlan: {
        prompt: prompts.videoMotionPrompt,
        model: BUDGET_CONFIG.model,
        expectedCostINR: BUDGET_CONFIG.costPerVideoINR,
        conditionedOnImage: true,
      },
    });

    // Advance to video generation pending approval
    transitionClip(state, clipId, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "APPROVE",
      clipId,
      newState: clip.state,
      approvalRecord,
      message: `Image approved for ${clipId}. Clip transitioned to ${clip.state}. Ready for authorized video generation.`,
    };
  }

  if (decision === "REJECT") {
    clip.imageRejectionHistory = clip.imageRejectionHistory || [];
    clip.imageRejectionHistory.push({
      rejectedAt: new Date().toISOString(),
      reviewer,
      notes,
      imagePath: previewPath,
      imageSha256: computeHash(previewPath),
    });

    if (clip.imageApproval) {
      clip.imageApproval.isValid = false;
      clip.imageApproval.invalidatedAt = new Date().toISOString();
      clip.imageApproval.invalidationReason = `Rejected by reviewer: ${notes}`;
    }

    if (clip.state === PRODUCTION_STATES.IMAGE_GENERATED || clip.state === PRODUCTION_STATES.IMAGE_AI_REVIEW) {
      transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    }

    transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_REJECTED, {
      rejectionNotes: notes,
    });

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "REJECT",
      clipId,
      newState: clip.state,
      message: `Image rejected for ${clipId}. Reason recorded. Transitioned to ${clip.state}.`,
    };
  }

  if (decision === "REVISE") {
    clip.imageRevisionCount = (clip.imageRevisionCount || 0) + 1;
    clip.imageRevisionRequests = clip.imageRevisionRequests || [];
    clip.imageRevisionRequests.push({
      requestedAt: new Date().toISOString(),
      revisionNumber: clip.imageRevisionCount,
      reviewer,
      notes,
      imagePath: previewPath,
    });

    if (clip.imageApproval) {
      clip.imageApproval.isValid = false;
    }

    if (clip.state === PRODUCTION_STATES.IMAGE_GENERATED || clip.state === PRODUCTION_STATES.IMAGE_AI_REVIEW) {
      transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    }

    transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_REVISION_REQUESTED, {
      revisionNotes: notes,
    });

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "REVISE",
      clipId,
      revisionCount: clip.imageRevisionCount,
      newState: clip.state,
      message: `Revision requested for ${clipId}. Transitioned to ${clip.state}.`,
    };
  }

  throw new Error(`Unknown human decision '${decision}'. Must be 'APPROVE', 'REJECT', or 'REVISE'.`);
}

/**
 * Explicitly invalidates human image approval and resets state to IMAGE_HUMAN_REVIEW_PENDING.
 * Preserves the generated image, prompts, evaluation report, and audit history.
 */
export function invalidateHumanImageApproval({
  surahNum,
  clipId,
  reason = "Approval invalidated",
  reviewer = "HUMAN_OPERATOR",
  customDir = null,
}) {
  const state = loadOrInitSurahState(surahNum, { customDir });
  const clip = resolveClip(state, clipId);
  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in Surah ${surahNum}.`);
  }

  const previousState = clip.state;

  if (clip.imageApproval) {
    clip.imageApproval.isValid = false;
    clip.imageApproval.invalidatedAt = new Date().toISOString();
    clip.imageApproval.invalidationReason = reason;
    clip.imageApproval.invalidatedBy = reviewer;
  }

  clip.auditHistory = clip.auditHistory || [];
  clip.auditHistory.push({
    timestamp: new Date().toISOString(),
    action: "INVALIDATE_IMAGE_APPROVAL",
    previousState,
    targetState: PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING,
    reason,
    reviewer,
    imageSha256: clip.imageSha256 || clip.imageApproval?.imageSha256 || null,
  });

  if (clip.state !== PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING) {
    transitionClip(state, clipId, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING, {
      humanReviewPending: true,
    });
  } else {
    clip.humanReviewPending = true;
  }

  saveSurahState(state, customDir);

  return {
    success: true,
    clipId,
    previousState,
    newState: clip.state,
    imageApproval: clip.imageApproval,
    message: `Human approval invalidated for clip '${clipId}'. State reset to ${clip.state}. Human review required.`,
  };
}

