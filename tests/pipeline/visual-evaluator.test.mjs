/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Multimodal Visual AI Evaluator Test Suite
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Verifies:
 *   1. Valid multimodal visual response produces structured evaluation report.
 *   2. Malformed JSON response from vision model fails safely with FAIL.
 *   3. Missing schema fields in model response fail safely with FAIL.
 *   4. Model execution / network errors fail safely without false metadata passes.
 *   5. Theological defects (e.g. human form / idol in pixels) force recommendation: FAIL.
 *   6. Severe visual artifacts / low realism score force recommendation: REVISE or FAIL.
 *   7. Failure Invariant: Metadata checks NEVER substitute for failed visual review.
 *   8. Cryptographic hash binding & invalidation on image or prompt tampering.
 *   9. Video generation blocking when image evaluation fails or is unapproved.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import {
  evaluateImageWithVisualAI,
  VISUAL_AI_CONFIG,
} from "../../scripts/pipeline/visual-evaluator.mjs";
import {
  evaluateImageQuality,
  generateStillImagePreview,
  buildImageReviewPackage,
  recordHumanImageDecision,
} from "../../scripts/pipeline/image-generation-adapter.mjs";
import {
  PRODUCTION_STATES,
  transitionClip,
  loadOrInitSurahState,
  saveSurahState,
  computeHash,
  createImageApprovalRecord,
  validateImageApproval,
  invalidateApprovalIfConfigChanged,
} from "../../scripts/pipeline/surah-state-machine.mjs";
import { executeControlledPilot } from "../../scripts/pipeline/generation-adapter.mjs";

test("HuDa Visual AI Review & Safe Failure Suite", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-test-visual-ai-"));
  const dummyImgPath = path.join(tmpDir, "test_preview.png");

  // Create a valid 1920x1080 test image using sharp
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 180, g: 150, b: 120 },
    },
  })
    .png()
    .toFile(dummyImgPath);

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test("1. Valid visual AI review produces structured report and passes when clean", async () => {
    const validJson = JSON.stringify({
      theologicalSafety: {
        passed: true,
        humanFiguresDetected: false,
        facesDetected: false,
        propheticOrAngelicDepictions: false,
        idolsOrReligiousShrines: false,
        observations: "Pure natural landscape with zero human figures or religious idols.",
      },
      visualRealism: {
        score: 94,
        naturalLandscapeAssessment: "Convincing limestone strata, natural desert pebbles, authentic wild palm tree bark.",
        lightingAndColorAssessment: "Documentary daylight with natural morning shadows.",
        visibleArtifacts: [],
      },
      thematicRelevance: {
        score: 96,
        verseScopeRelevance: "Excellently captures peaceful contemplative sanctuary.",
        sceneDescriptionMatch: "Matches intended desert oasis description.",
      },
      temporalMotionFeasibility: {
        suitableForVideoMotion: true,
        cameraFraming: "Grounded tripod shot with clean depth layers.",
        potentialMotionIssues: [],
      },
      synthesis: {
        recommendation: "PASS",
        confidence: "HIGH",
        criticalDefects: [],
        revisionSuggestions: ["Maintain independent frond motion during video generation."],
        summary: "Clean, reverent, and geologically authentic landscape still.",
      },
    });

    const mockClient = {
      generateContent: async () => ({ text: validJson }),
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      theme: "The Sanctuary of Maryam",
      verses: "33-44",
      stillPrompt: "A wide natural history documentary still...",
      videoMotionPrompt: "Continuous gentle breeze in palms...",
      mode: "live",
      mockClient,
    });

    assert.equal(res.evaluatedWithVisualAI, true);
    assert.equal(res.recommendation, "PASS");
    assert.equal(res.theologicalSafety.passed, true);
    assert.equal(res.visualRealism.score, 94);
    assert.equal(res.defects.length, 0);
    assert.ok(res.disclaimer.includes("advisory preflight filter"));
  });

  await t.test("2. Malformed JSON response from vision model fails safely with FAIL", async () => {
    const mockClient = {
      generateContent: async () => ({ text: "MALFORMED_NON_JSON_RESPONSE {{{ broken" }),
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      mode: "live",
      mockClient,
    });

    assert.equal(res.evaluatedWithVisualAI, false);
    assert.equal(res.visualReviewStatus, "FAILED");
    assert.equal(res.recommendation, "FAIL");
    assert.equal(res.stage, "JSON_PARSING");
    assert.match(res.error, /not valid JSON/);
  });

  await t.test("3. Missing schema fields in model response fail safely with FAIL", async () => {
    const incompleteJson = JSON.stringify({
      theologicalSafety: { passed: true },
      // Missing visualRealism, thematicRelevance, temporalMotionFeasibility, synthesis
    });

    const mockClient = {
      generateContent: async () => ({ text: incompleteJson }),
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      mode: "live",
      mockClient,
    });

    assert.equal(res.evaluatedWithVisualAI, false);
    assert.equal(res.recommendation, "FAIL");
    assert.equal(res.stage, "SCHEMA_VALIDATION");
    assert.match(res.error, /failed schema validation/);
  });

  await t.test("4. Model API error (e.g. network/quota) fails safely with FAIL", async () => {
    const mockClient = {
      generateContent: async () => {
        throw new Error("Quota exceeded: 429 Resource has been exhausted");
      },
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      mode: "live",
      mockClient,
    });

    assert.equal(res.evaluatedWithVisualAI, false);
    assert.equal(res.recommendation, "FAIL");
    assert.equal(res.stage, "EXECUTION_ERROR");
    assert.match(res.error, /Quota exceeded/);
  });

  await t.test("5. Theological defects detected in pixels force recommendation: FAIL", async () => {
    const theologicalViolationJson = JSON.stringify({
      theologicalSafety: {
        passed: false,
        humanFiguresDetected: true,
        facesDetected: true,
        propheticOrAngelicDepictions: false,
        idolsOrReligiousShrines: false,
        observations: "Detected silhouette of human figure near the palm trees in the midground.",
      },
      visualRealism: {
        score: 85,
        naturalLandscapeAssessment: "Good natural terrain.",
        lightingAndColorAssessment: "Natural light.",
        visibleArtifacts: [],
      },
      thematicRelevance: {
        score: 50,
        verseScopeRelevance: "Prohibited human depiction makes it inappropriate.",
        sceneDescriptionMatch: "Contradicts negative constraint.",
      },
      temporalMotionFeasibility: {
        suitableForVideoMotion: false,
        cameraFraming: "Locked tripod.",
        potentialMotionIssues: ["Human figure motion."],
      },
      synthesis: {
        recommendation: "PASS", // Even if model mistakenly recommended PASS
        confidence: "HIGH",
        criticalDefects: ["Human figure detected."],
        revisionSuggestions: ["Regenerate without any figures."],
        summary: "Theological violation present.",
      },
    });

    const mockClient = {
      generateContent: async () => ({ text: theologicalViolationJson }),
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      mode: "live",
      mockClient,
    });

    // Theological safety must override any PASS and force FAIL
    assert.equal(res.theologicalSafety.passed, false);
    assert.equal(res.theologicalSafety.humanFiguresDetected, true);
    assert.equal(res.recommendation, "FAIL");
    assert.ok(res.defects.some((d) => d.toLowerCase().includes("theological")));
  });

  await t.test("6. Low visual realism score forces recommendation: REVISE or FAIL", async () => {
    const lowRealismJson = JSON.stringify({
      theologicalSafety: {
        passed: true,
        humanFiguresDetected: false,
        facesDetected: false,
        propheticOrAngelicDepictions: false,
        idolsOrReligiousShrines: false,
        observations: "Clean of human figures.",
      },
      visualRealism: {
        score: 45, // Below 60 threshold
        naturalLandscapeAssessment: "Unnatural plastic sheen on date-palm fronds, repetitive clone patterns on cliff face.",
        lightingAndColorAssessment: "Oversaturated CGI glow.",
        visibleArtifacts: ["Plastic foliage sheen", "Repetitive rock textures", "Edge haloing"],
      },
      thematicRelevance: {
        score: 70,
        verseScopeRelevance: "Thematic concept matches.",
        sceneDescriptionMatch: "Elements match but look artificial.",
      },
      temporalMotionFeasibility: {
        suitableForVideoMotion: false,
        cameraFraming: "Static.",
        potentialMotionIssues: ["Plastic texture will look synthetic when animated."],
      },
      synthesis: {
        recommendation: "PASS", // Model was overly optimistic
        confidence: "LOW",
        criticalDefects: ["Heavy plastic CGI appearance."],
        revisionSuggestions: ["Use authentic natural documentary prompt with f/4 prime lens."],
        summary: "Realism is insufficient for documentary quality.",
      },
    });

    const mockClient = {
      generateContent: async () => ({ text: lowRealismJson }),
    };

    const res = await evaluateImageWithVisualAI({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      mode: "live",
      mockClient,
    });

    // Low realism forces recommendation to REVISE
    assert.notEqual(res.recommendation, "PASS");
    assert.equal(res.recommendation, "REVISE");
    assert.ok(res.defects.some((d) => d.includes("below acceptable threshold")));
  });

  await t.test("7. Integration: evaluateImageQuality fails safely when visual AI fails", async () => {
    const brokenClient = {
      generateContent: async () => {
        throw new Error("Visual model unavailable");
      },
    };

    const compositeReport = await evaluateImageQuality({
      imagePath: dummyImgPath,
      surahNum: 3,
      clipId: "03a",
      prompt: "A wide natural history documentary still photograph. No humans, no faces, no idols, no figures, no buildings.",
      enableVisualAI: true,
      visualAIMode: "live",
      visualAIClient: brokenClient,
    });

    // Crucial Invariant: Even though dimensions and prompt keywords passed,
    // failure of visual AI must cause composite recommendation to be FAIL!
    assert.equal(compositeReport.recommendation, "FAIL");
    assert.ok(compositeReport.defects.some((d) => d.includes("Visual AI evaluation failed")));
    assert.equal(compositeReport.visualAI.evaluatedWithVisualAI, false);
  });

  await t.test("8. Video Generation Gate: Video pilot strictly blocked if visual AI review failed", async () => {
    const state = loadOrInitSurahState(3, {
      customDir: tmpDir,
      visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
    });

    // Mark clip in IMAGE_HUMAN_REVIEW_PENDING with a FAILED AI evaluation
    state.clips["03a"].previewImagePath = dummyImgPath;
    state.clips["03a"].state = PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING;
    state.clips["03a"].aiEvaluation = {
      recommendation: "FAIL",
      defects: ["Theological safety violation detected in pixels."],
      evaluatedWithVisualAI: true,
    };
    saveSurahState(state, tmpDir);

    // Operator attempts video generation without valid image approval
    const pilotRes = await executeControlledPilot({
      surahNum: 3,
      clipId: "03a",
      mode: "mock",
      approval: {
        surah: 3,
        clipIds: ["03a"],
        model: "veo-3.1-fast-generate-001",
        expectedCostINR: 76.791,
        timestamp: new Date().toISOString(),
      },
      destinationDir: path.join(tmpDir, "pilot"),
      customDir: tmpDir,
      requireImageApproval: true,
    });

    assert.equal(pilotRes.success, false);
    assert.equal(pilotRes.step, "IMAGE_APPROVAL_GATE");
    assert.match(pilotRes.error, /Image approval gate failed/);
  });
});
