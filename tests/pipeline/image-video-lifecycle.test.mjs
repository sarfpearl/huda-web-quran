/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Image-First Lifecycle & Gate Enforcement Tests
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Verifies:
 *   1. Full Lifecycle Flow:
 *      PLANNED -> IMAGE_GENERATION_PENDING -> IMAGE_GENERATED -> IMAGE_AI_REVIEW ->
 *      IMAGE_HUMAN_REVIEW_PENDING -> IMAGE_APPROVED -> VIDEO_GENERATION_PENDING_APPROVAL ->
 *      VIDEO_GENERATED -> VIDEO_QA -> VIDEO_HUMAN_REVIEW_PENDING -> VIDEO_APPROVED -> LOCAL_STAGING
 *   2. Image Gate Enforcement: Video generation BLOCKED if image is unapproved.
 *   3. Invalidation Security: Changing prompt or modifying image on disk invalidates approval.
 *   4. Image Rejection & Revision: Records reasons and tracks revision counters.
 *   5. Video Rejection & Revision: Preserves masters while recording defect feedback.
 *   6. Deployment Isolation: Video approval NEVER implies deployment approval.
 *   7. Offline Safety: All tests run in isolated temporary scratch directories with zero paid calls.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import {
  PRODUCTION_STATES,
  ALLOWED_TRANSITIONS,
  transitionClip,
  loadOrInitSurahState,
  saveSurahState,
  computeHash,
  createImageApprovalRecord,
  validateImageApproval,
  invalidateApprovalIfConfigChanged,
  resolveClip,
  getStateFilePath,
} from "../../scripts/pipeline/surah-state-machine.mjs";
import {
  generateStillImagePreview,
  evaluateImageQuality,
  buildImageReviewPackage,
  recordHumanImageDecision,
  invalidateHumanImageApproval,
  prepareScenePrompts,
} from "../../scripts/pipeline/image-generation-adapter.mjs";
import {
  executeControlledPilot,
  recordHumanVideoDecision,
  constructVeoVideoRequest,
  detectImageMimeType,
} from "../../scripts/pipeline/generation-adapter.mjs";
import { GoogleGenAI } from "@google/genai";
import {
  getProjectWorkflowStatus,
  determineNextEligibleClip,
  generateClipSummary,
  verifySurahCompletion,
  advanceWorkflow,
  advanceToNextSurah,
  runProjectWideValidation,
  getSurahMetadata,
  loadSurahState,
  buildClipVersePlan,
  recordHumanPlanDecision,
} from "../../scripts/pipeline/surah-orchestrator.mjs";

test("HuDa Image-First Lifecycle Test Suite", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-test-lifecycle-"));

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test("1. Initializes fresh state with PLANNED for all clips", () => {
    const state = loadOrInitSurahState(3, {
      customDir: tmpDir,
      visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
    });
    assert.equal(state.clips["03a"].state, PRODUCTION_STATES.PLANNED);
  });

  await t.test("2. Generates still image preview in mock mode and verifies dimensions", async () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATION_PENDING);

    const imgRes = await generateStillImagePreview({
      surahNum: 3,
      clipId: "03a",
      mode: "mock",
      customDir: tmpDir,
    });

    assert.equal(imgRes.success, true);
    assert.equal(imgRes.dimensions.width, 1920);
    assert.equal(imgRes.dimensions.height, 1080);
    assert.ok(fs.existsSync(imgRes.previewPath), "Mock preview image must exist on disk");
    assert.ok(imgRes.imageSha256, "SHA-256 hash must be generated");

    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATED, {
      previewImagePath: imgRes.previewPath,
      imageSha256: imgRes.imageSha256,
    });
    saveSurahState(state, tmpDir);

    const updatedState = loadOrInitSurahState(3, { customDir: tmpDir });
    assert.equal(updatedState.clips["03a"].state, PRODUCTION_STATES.IMAGE_GENERATED);
    assert.equal(updatedState.clips["03a"].previewImagePath, imgRes.previewPath);
  });

  await t.test("3. Autonomous Agent AI Review evaluates image and produces structured report", async () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_AI_REVIEW);

    const pkg = await buildImageReviewPackage(3, "03a", tmpDir);
    assert.ok(pkg.agentEvaluation, "Agent evaluation must be present");
    assert.equal(pkg.agentEvaluation.recommendation, "PASS");
    assert.equal(pkg.agentEvaluation.confidence, "HIGH");
    assert.equal(pkg.agentEvaluation.scores.theologicalSafety, 100);
    assert.equal(pkg.agentEvaluation.scores.technicalIntegrity, 100);
    assert.ok(pkg.videoBudgetProjection.expectedCostINR > 0, "Budget projection must be present");

    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING, {
      aiEvaluation: pkg.agentEvaluation,
      humanReviewPending: true,
    });
    saveSurahState(state, tmpDir);

    const updatedState = loadOrInitSurahState(3, { customDir: tmpDir });
    assert.equal(updatedState.clips["03a"].state, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
  });

  await t.test("4. Enforces Image Approval Gate: Video generation BLOCKED without image approval", async () => {
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

    assert.equal(pilotRes.success, false, "Video generation must fail when image is unapproved");
    assert.equal(pilotRes.step, "IMAGE_APPROVAL_GATE");
    assert.match(pilotRes.error, /Image approval gate failed/);
  });

  await t.test("5. Records explicit human image approval and binds SHA-256 hash", async () => {
    const decision = await recordHumanImageDecision({
      surahNum: 3,
      clipId: "03a",
      decision: "APPROVE",
      reviewer: "CHIEF_EDITOR",
      notes: "Landscape composition is serene, reverent, and geologically sound.",
      customDir: tmpDir,
    });

    assert.equal(decision.success, true);
    assert.equal(decision.newState, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);

    const updatedState = loadOrInitSurahState(3, { customDir: tmpDir });
    const clip = updatedState.clips["03a"];
    assert.ok(clip.imageApproval, "Approval record must be saved in state");
    assert.equal(clip.imageApproval.isValid, true);
    assert.equal(clip.imageApproval.reviewer, "CHIEF_EDITOR");
    assert.ok(clip.imageApproval.imageSha256, "Cryptographic hash must be recorded");
  });

  await t.test("6. Invalidation Security: Altering image content or prompt invalidates approval", () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    const clip = state.clips["03a"];
    const prompts = prepareScenePrompts(3, "03a");

    // Validation passes when untampered
    const validCheck = validateImageApproval({
      clip,
      prompt: prompts.stillImagePrompt,
      videoConfig: { model: "veo-3.1-fast-generate-001", resolution: "1080p", aspectRatio: "16:9", duration: 8 },
    });
    assert.equal(validCheck.valid, true);

    // Tampering test: different prompt invalidates approval
    const invalidCheck = validateImageApproval({
      clip,
      prompt: "A completely altered scene prompt with different elements",
      videoConfig: { model: "veo-3.1-fast-generate-001", resolution: "1080p", aspectRatio: "16:9", duration: 8 },
    });
    assert.equal(invalidCheck.valid, false, "Altered prompt must invalidate approval");
    assert.match(invalidCheck.reason, /Prompt has changed/);

    // Verify invalidation helper
    const invalidated = invalidateApprovalIfConfigChanged({
      clip,
      prompt: "Changed prompt",
      videoConfig: {},
    });
    assert.equal(invalidated, true);
    assert.equal(clip.imageApproval.isValid, false);
  });

  await t.test("7. Generates mock video and runs Video QA after valid approval", async () => {
    // Re-create approval cleanly
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    const prompts = prepareScenePrompts(3, "03a");
    const previewPath = state.clips["03a"].previewImagePath;

    state.clips["03a"].imageApproval = createImageApprovalRecord({
      surahNum: 3,
      clipId: "03a",
      imagePath: previewPath,
      prompt: prompts.stillImagePrompt,
      videoConfig: { model: "veo-3.1-fast-generate-001", resolution: "1080p", aspectRatio: "16:9", duration: 8 },
      reviewer: "CHIEF_EDITOR",
      notes: "Valid re-approval",
    });
    state.clips["03a"].state = PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL;
    saveSurahState(state, tmpDir);

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
      requireImageApproval: false, // Testing video mock execution with approved state
    });

    assert.equal(pilotRes.success, true);
    assert.ok(fs.existsSync(pilotRes.rawMasterPath), "Raw master must exist");
    assert.ok(fs.existsSync(pilotRes.processedPath), "Processed clip must exist");
    assert.ok(fs.existsSync(pilotRes.contactSheetPath), "Contact sheet must exist");

    const postState = loadOrInitSurahState(3, { customDir: tmpDir });
    const clip = postState.clips["03a"];
    assert.equal(clip.state, PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING);
    assert.equal(clip.deploymentApproval, "BLOCKED", "Deployment must remain blocked pending separate approval");
  });

  await t.test("8. Video Human Approval Gate: Supports APPROVE, REJECT, and REVISE", () => {
    // Test Revision from VIDEO_HUMAN_REVIEW_PENDING
    const reviseRes = recordHumanVideoDecision({
      surahNum: 3,
      clipId: "03a",
      decision: "REVISE",
      reviewer: "DIRECTOR",
      notes: "Increase water ripple frequency slightly.",
      customDir: tmpDir,
    });
    assert.equal(reviseRes.success, true);
    assert.equal(reviseRes.newState, PRODUCTION_STATES.VIDEO_REVISION_REQUESTED);

    // Transition back for approval test
    const midState = loadOrInitSurahState(3, { customDir: tmpDir });
    transitionClip(midState, "03a", PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);
    transitionClip(midState, "03a", PRODUCTION_STATES.MOCK_GENERATED);
    transitionClip(midState, "03a", PRODUCTION_STATES.VIDEO_QA);
    transitionClip(midState, "03a", PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING);
    saveSurahState(midState, tmpDir);

    // Test Approval
    const approveRes = recordHumanVideoDecision({
      surahNum: 3,
      clipId: "03a",
      decision: "APPROVE",
      reviewer: "DIRECTOR",
      notes: "Movement and seam are authentic and reverent.",
      customDir: tmpDir,
    });
    assert.equal(approveRes.success, true);
    assert.equal(approveRes.newState, PRODUCTION_STATES.VIDEO_APPROVED);
    assert.equal(approveRes.eligibleForStaging, true);
    assert.equal(approveRes.deploymentApproval, "BLOCKED_PENDING_SEPARATE_AUTHORIZATION");
  });

  await t.test("9. Deployment Safety Gate: Video approval does NOT deploy to production", () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    transitionClip(state, "03a", PRODUCTION_STATES.LOCAL_STAGING);
    saveSurahState(state, tmpDir);

    const postStagingState = loadOrInitSurahState(3, { customDir: tmpDir });
    assert.equal(postStagingState.clips["03a"].state, PRODUCTION_STATES.LOCAL_STAGING);
    assert.notEqual(postStagingState.clips["03a"].state, PRODUCTION_STATES.DEPLOYED);

    // Transitioning directly to DEPLOYED from LOCAL_STAGING without approval throws error
    assert.throws(
      () => transitionClip(postStagingState, "03a", PRODUCTION_STATES.DEPLOYED),
      /Invalid state transition/
    );
  });

  await t.test("10. Image Rejection Gate: Rejected images cannot proceed to video generation", async () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    state.clips["03a"].imageApproval = null;
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATION_PENDING);
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATED);
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    saveSurahState(state, tmpDir);

    const rejectRes = await recordHumanImageDecision({
      surahNum: 3,
      clipId: "03a",
      decision: "REJECT",
      reviewer: "CURATOR",
      notes: "Composition lacks natural landscape variety.",
      customDir: tmpDir,
    });

    assert.equal(rejectRes.success, true);
    assert.equal(rejectRes.newState, PRODUCTION_STATES.IMAGE_REJECTED);

    // Verify video pilot is blocked for rejected image
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

  await t.test("11. Physical Image & Setting Tampering: Altering image bytes or video config invalidates approval", async () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    const previewPath = state.clips["03a"].previewImagePath;
    const prompts = prepareScenePrompts(3, "03a");

    // Establish clean approval
    state.clips["03a"].imageApproval = createImageApprovalRecord({
      surahNum: 3,
      clipId: "03a",
      imagePath: previewPath,
      stillPrompt: prompts.stillImagePrompt,
      videoPrompt: prompts.videoMotionPrompt,
      videoConfig: { model: "veo-3.1-fast-generate-001", resolution: "1080p", aspectRatio: "16:9", duration: 8 },
      reviewer: "CHIEF_EDITOR",
      notes: "Tamper baseline",
    });
    saveSurahState(state, tmpDir);

    // 1. Parameter tampering (changing model or duration)
    const paramTamperCheck = validateImageApproval({
      clip: state.clips["03a"],
      stillPrompt: prompts.stillImagePrompt,
      videoPrompt: prompts.videoMotionPrompt,
      videoConfig: { model: "veo-3.1-generate-unauthorized", resolution: "4k", aspectRatio: "16:9", duration: 15 },
    });
    assert.equal(paramTamperCheck.valid, false);
    assert.match(paramTamperCheck.reason, /Video generation parameters changed/);

    // 2. Image byte tampering on disk
    const originalBytes = fs.readFileSync(previewPath);
    try {
      fs.appendFileSync(previewPath, Buffer.from("TAMPERED_PIXELS"));
      const byteTamperCheck = validateImageApproval({
        clip: state.clips["03a"],
        stillPrompt: prompts.stillImagePrompt,
        videoPrompt: prompts.videoMotionPrompt,
        videoConfig: { model: "veo-3.1-fast-generate-001", resolution: "1080p", aspectRatio: "16:9", duration: 8 },
      });
      assert.equal(byteTamperCheck.valid, false);
      assert.match(byteTamperCheck.reason, /altered on disk \(hash mismatch\)/);
    } finally {
      // Restore clean bytes
      fs.writeFileSync(previewPath, originalBytes);
    }
  });

  await t.test("12. Failure and Cancellation Safety: Failures and cancellations do not bypass approval gates", () => {
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    
    // Move to FAILED
    transitionClip(state, "03a", PRODUCTION_STATES.FAILED, { error: "Simulated network failure" });
    saveSurahState(state, tmpDir);

    // Attempting to jump directly to VIDEO_GENERATED or DEPLOYED must throw
    assert.throws(
      () => transitionClip(state, "03a", PRODUCTION_STATES.VIDEO_GENERATED),
      /Invalid state transition/
    );
    assert.throws(
      () => transitionClip(state, "03a", PRODUCTION_STATES.DEPLOYED),
      /Invalid state transition/
    );

    // Cancellation safety
    transitionClip(state, "03a", PRODUCTION_STATES.PLANNED);
    transitionClip(state, "03a", PRODUCTION_STATES.CANCELLED);
    saveSurahState(state, tmpDir);

    assert.throws(
      () => transitionClip(state, "03a", PRODUCTION_STATES.APPROVED_FOR_DEPLOYMENT),
      /Invalid state transition/
    );
  });

  await t.test("13. Invalidation & State Correction Safety: Invalidating approval resets state and strictly blocks video generation", async () => {
    // 1. Setup approved state
    const state = loadOrInitSurahState(3, { customDir: tmpDir });
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATION_PENDING);
    const imgRes = await generateStillImagePreview({ surahNum: 3, clipId: "03a", mode: "mock", customDir: tmpDir });
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATED, { previewImagePath: imgRes.previewPath, imageSha256: imgRes.imageSha256 });
    transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    saveSurahState(state, tmpDir);

    // Record initial approval
    await recordHumanImageDecision({
      surahNum: 3,
      clipId: "03a",
      decision: "APPROVE",
      reviewer: "TEST_REVIEWER",
      customDir: tmpDir,
    });

    const approvedState = loadOrInitSurahState(3, { customDir: tmpDir });
    assert.equal(approvedState.clips["03a"].state, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);
    assert.equal(approvedState.clips["03a"].imageApproval.isValid, true);

    // 2. Invalidate approval and correct state
    const invRes = invalidateHumanImageApproval({
      surahNum: 3,
      clipId: "03a",
      reason: "User clarified that approval was not explicitly granted.",
      reviewer: "HUMAN_OPERATOR",
      customDir: tmpDir,
    });

    assert.equal(invRes.success, true);
    assert.equal(invRes.newState, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);

    const correctedState = loadOrInitSurahState(3, { customDir: tmpDir });
    assert.equal(correctedState.clips["03a"].state, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
    assert.equal(correctedState.clips["03a"].humanReviewPending, true);
    assert.equal(correctedState.clips["03a"].imageApproval.isValid, false);
    assert.ok(correctedState.clips["03a"].imageApproval.invalidatedAt);
    assert.match(correctedState.clips["03a"].imageApproval.invalidationReason, /User clarified/);

    // 3. Verify audit history is preserved
    assert.ok(Array.isArray(correctedState.clips["03a"].auditHistory));
    assert.equal(correctedState.clips["03a"].auditHistory.length, 1);
    assert.equal(correctedState.clips["03a"].auditHistory[0].action, "INVALIDATE_IMAGE_APPROVAL");

    // 4. Verify video generation is strictly blocked by IMAGE_APPROVAL_GATE
    const pilotApproval = {
      surah: 3,
      clipIds: ["03a"],
      model: "veo-3.1-fast-generate-001",
      expectedCostINR: 76.791,
      timestamp: new Date().toISOString(),
      approvedBy: "HUMAN_OPERATOR",
    };

    const pilotRes = await executeControlledPilot({
      surahNum: 3,
      clipId: "03a",
      mode: "mock",
      approval: pilotApproval,
      customDir: tmpDir,
    });

    assert.equal(pilotRes.success, false);
    assert.equal(pilotRes.step, "IMAGE_APPROVAL_GATE");
    assert.match(pilotRes.error, /Image approval was explicitly marked invalid/);
  });

  await t.test("14. Aspect Ratio & Resolution Enforcement: 1.72-1.82 tolerance accepts 1344x768 and 1920x1080; strictly blocks square, portrait, and low-res", async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-test-aspect-"));
    try {
      const state = loadOrInitSurahState(3, {
        customDir: testDir,
        visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
      });
      const previewDir = path.join(testDir, "previews/003");
      fs.mkdirSync(previewDir, { recursive: true });
      const previewPath = path.join(previewDir, "03a_still_preview.png");

      // Case A: Create a 1024x1024 square image (aspect ratio 1.000)
      await sharp({
        create: {
          width: 1024,
          height: 1024,
          channels: 3,
          background: { r: 180, g: 150, b: 120 },
        },
      })
        .png()
        .toFile(previewPath);

      transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATION_PENDING);
      transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_GENERATED, {
        previewImagePath: previewPath,
        imageSha256: computeHash(previewPath),
      });
      transitionClip(state, "03a", PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
      saveSurahState(state, testDir);

      // Attempting to approve a 1:1 square image MUST throw and be blocked
      await assert.rejects(
        async () => {
          await recordHumanImageDecision({
            surahNum: 3,
            clipId: "03a",
            decision: "APPROVE",
            customDir: testDir,
          });
        },
        /outside permitted 16:9 landscape range/
      );

      const stateAfterSquareBlocked = loadOrInitSurahState(3, { customDir: testDir });
      assert.equal(stateAfterSquareBlocked.clips["03a"].state, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
      assert.equal(Boolean(stateAfterSquareBlocked.clips["03a"].imageApproval?.isValid), false);

      // Case B: Create 768x1344 portrait image (aspect ratio 0.571:1)
      await sharp({
        create: {
          width: 768,
          height: 1344,
          channels: 3,
          background: { r: 150, g: 130, b: 110 },
        },
      })
        .png()
        .toFile(previewPath);

      await assert.rejects(
        async () => {
          await recordHumanImageDecision({
            surahNum: 3,
            clipId: "03a",
            decision: "APPROVE",
            customDir: testDir,
          });
        },
        /outside permitted 16:9 landscape range/
      );

      // Case C: Create low-resolution image below minimum 720p (640x360)
      await sharp({
        create: {
          width: 640,
          height: 360,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .png()
        .toFile(previewPath);

      await assert.rejects(
        async () => {
          await recordHumanImageDecision({
            surahNum: 3,
            clipId: "03a",
            decision: "APPROVE",
            customDir: testDir,
          });
        },
        /below minimum 720p requirement/
      );

      // Case D: Create below-minimum HD resolution (1200x675)
      await sharp({
        create: {
          width: 1200,
          height: 675,
          channels: 3,
          background: { r: 120, g: 120, b: 120 },
        },
      })
        .png()
        .toFile(previewPath);

      await assert.rejects(
        async () => {
          await recordHumanImageDecision({
            surahNum: 3,
            clipId: "03a",
            decision: "APPROVE",
            customDir: testDir,
          });
        },
        /below minimum 720p requirement/
      );

      // Case E: Valid native 1344x768 widescreen image (aspect ratio 1.750 in [1.72, 1.82]) SUCCEEDS
      await sharp({
        create: {
          width: 1344,
          height: 768,
          channels: 3,
          background: { r: 140, g: 170, b: 130 },
        },
      })
        .png()
        .toFile(previewPath);

      const approval1344 = await recordHumanImageDecision({
        surahNum: 3,
        clipId: "03a",
        decision: "APPROVE",
        customDir: testDir,
      });

      assert.equal(approval1344.success, true);
      assert.equal(approval1344.newState, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);

      const state1344 = loadOrInitSurahState(3, { customDir: testDir });
      assert.equal(state1344.clips["03a"].imageApproval.dimensions.width, 1344);
      assert.equal(state1344.clips["03a"].imageApproval.dimensions.height, 768);
      assert.equal(state1344.clips["03a"].imageApproval.aspectRatio, "16:9");

      // Verify validateImageApproval passes for 1344x768
      const val1344 = validateImageApproval({
        clip: state1344.clips["03a"],
        videoPrompt: state1344.clips["03a"].imageApproval.videoPromptSha256 ? null : undefined,
      });
      assert.equal(val1344.valid, true);

      // Case F: Valid 1920x1080 widescreen image (aspect ratio 1.778 in [1.72, 1.82]) SUCCEEDS
      transitionClip(state1344, "03a", PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);
      saveSurahState(state1344, testDir);

      await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 140, g: 180, b: 120 },
        },
      })
        .png()
        .toFile(previewPath);

      const approval1920 = await recordHumanImageDecision({
        surahNum: 3,
        clipId: "03a",
        decision: "APPROVE",
        customDir: testDir,
      });

      assert.equal(approval1920.success, true);
      const state1920 = loadOrInitSurahState(3, { customDir: testDir });
      assert.equal(state1920.clips["03a"].imageApproval.dimensions.width, 1920);
      assert.equal(state1920.clips["03a"].imageApproval.dimensions.height, 1080);

      // Case G: Direct validateImageApproval rejection when dimensions are invalid
      const corruptedClip = {
        imageApproval: {
          ...state1920.clips["03a"].imageApproval,
          dimensions: { width: 1000, height: 1000 },
        },
      };
      const directValResult = validateImageApproval({ clip: corruptedClip });
      assert.equal(directValResult.valid, false);
      assert.match(directValResult.reason, /outside permitted 16:9 landscape range/);
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  await t.test("15. Prompt Hardening: Verifies Surah 3 Clip 03a prompts eliminate grass repetition and palm sheen", async () => {
    const prompts = prepareScenePrompts(3, "03a");

    // 1. Verify botanical matte surface and zero plastic sheen
    assert.match(prompts.stillImagePrompt, /matte botanical surfaces/i);
    assert.match(prompts.stillImagePrompt, /weathered fibrous leaflets/i);
    assert.match(prompts.stillImagePrompt, /zero plastic sheen/i);
    assert.match(prompts.videoMotionPrompt, /dry, matte, non-reflective botanical surfaces/i);
    assert.match(prompts.videoMotionPrompt, /completely free of waxy gloss, plastic sheen/i);

    // 2. Verify non-repeating wadi ground cover replacing uniform green grass
    assert.match(prompts.stillImagePrompt, /arid wadi bank/i);
    assert.match(prompts.stillImagePrompt, /damp gravel/i);
    assert.match(prompts.stillImagePrompt, /sparse, irregular tufts of wild riverside sedge/i);
    assert.match(prompts.stillImagePrompt, /without manicured lawn or repeating turf patterns/i);
    assert.match(prompts.videoMotionPrompt, /without repetitive lawn or cloned grass patches/i);

    // 3. Verify negative constraints include anti-repetition and anti-gloss tokens
    assert.match(prompts.avoid, /no manicured lawns/i);
    assert.match(prompts.avoid, /no turf/i);
    assert.match(prompts.avoid, /no repeating grass patches/i);
    assert.match(prompts.avoid, /no waxy glossy leaves/i);
    assert.match(prompts.avoid, /no plastic sheen/i);
    assert.match(prompts.avoid, /no CGI reflection/i);

    // 4. Verify obsolete terms are not in prompt
    assert.doesNotMatch(prompts.stillImagePrompt, /fresh green grass/i);
  });

  await t.test("16. Image-Conditioned Veo 3.1 Request Construction & Safety Gates", async (st) => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-veo-req-"));

    try {
      // Create synthetic test images (PNG, JPEG, WebP)
      const pngPath = path.join(testDir, "test_landscape.png");
      const jpgPath = path.join(testDir, "test_landscape.jpg");
      const webpPath = path.join(testDir, "test_landscape.webp");

      await sharp({
        create: { width: 1344, height: 768, channels: 3, background: { r: 180, g: 150, b: 120 } },
      }).png().toFile(pngPath);

      await sharp({
        create: { width: 1344, height: 768, channels: 3, background: { r: 180, g: 150, b: 120 } },
      }).jpeg().toFile(jpgPath);

      await sharp({
        create: { width: 1344, height: 768, channels: 3, background: { r: 180, g: 150, b: 120 } },
      }).webp().toFile(webpPath);

      const promptText = "Gentle morning light over ancient stone sanctuary courtyard with weathered limestone";

      // ── Sub-test 16.1: Source image bytes and MIME type detection ───────────
      await st.test("16.1 Source image bytes and MIME type are passed correctly", () => {
        // PNG
        const reqPng = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: pngPath,
        });
        const expectedPngBytes = fs.readFileSync(pngPath).toString("base64");
        assert.equal(reqPng.source.image.imageBytes, expectedPngBytes);
        assert.equal(reqPng.source.image.mimeType, "image/png");
        assert.equal(reqPng.source.prompt, promptText);

        // JPEG
        const reqJpg = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: jpgPath,
        });
        const expectedJpgBytes = fs.readFileSync(jpgPath).toString("base64");
        assert.equal(reqJpg.source.image.imageBytes, expectedJpgBytes);
        assert.equal(reqJpg.source.image.mimeType, "image/jpeg");

        // WebP
        const reqWebp = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: webpPath,
        });
        const expectedWebpBytes = fs.readFileSync(webpPath).toString("base64");
        assert.equal(reqWebp.source.image.imageBytes, expectedWebpBytes);
        assert.equal(reqWebp.source.image.mimeType, "image/webp");

        // detectImageMimeType helper
        assert.equal(detectImageMimeType("sample.png"), "image/png");
        assert.equal(detectImageMimeType("sample.jpg"), "image/jpeg");
        assert.equal(detectImageMimeType("sample.jpeg"), "image/jpeg");
        assert.equal(detectImageMimeType("sample.webp"), "image/webp");
        assert.equal(detectImageMimeType("unknown.xyz"), "image/png");
      });

      // ── Sub-test 16.2: Explicit resizeMode is configured and defaults to CROP
      await st.test("16.2 Selected resizeMode is explicit ('CROP' or 'PAD')", () => {
        // Default when omitted must be explicit 'CROP'
        const reqDefault = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: pngPath,
        });
        assert.equal(reqDefault.config.resizeMode, "CROP", "Default resizeMode must be explicit 'CROP'");
        assert.equal(reqDefault.config.aspectRatio, "16:9");
        assert.equal(reqDefault.config.resolution, "1080p");
        assert.equal(reqDefault.config.durationSeconds, 8);

        // Explicit PAD
        const reqPad = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: pngPath,
          resizeMode: "PAD",
        });
        assert.equal(reqPad.config.resizeMode, "PAD");

        // Explicit CROP
        const reqCrop = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: pngPath,
          resizeMode: "CROP",
        });
        assert.equal(reqCrop.config.resizeMode, "CROP");

        // Invalid resizeMode must throw
        assert.throws(
          () => constructVeoVideoRequest({ prompt: promptText, imagePath: pngPath, resizeMode: "STRETCH" }),
          /INVALID_RESIZE_MODE/
        );
      });

      // ── Sub-test 16.3: SDK and Vertex AI contract serialization ─────────────
      await st.test("16.3 Google GenAI SDK serializes exact Vertex AI parameters", async () => {
        const ai = new GoogleGenAI({ vertexai: true, project: "test-project-huda", location: "us-central1" });
        let capturedRequest = null;

        ai.apiClient.request = async (opts) => {
          capturedRequest = opts;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              name: "projects/test-project-huda/locations/us-central1/operations/test-op-456",
              done: true,
              response: { generatedVideos: [] },
            }),
            headers: new Headers(),
          };
        };

        const request = constructVeoVideoRequest({
          prompt: promptText,
          imagePath: pngPath,
          resizeMode: "CROP",
        });

        await ai.models.generateVideos(request);

        assert.ok(capturedRequest, "Request must be sent to apiClient");
        assert.match(capturedRequest.path, /publishers\/google\/models\/veo-3.1-fast-generate-001:predictLongRunning/);

        const body = JSON.parse(capturedRequest.body);
        assert.equal(body.instances.length, 1);
        assert.equal(body.instances[0].prompt, promptText);
        assert.ok(body.instances[0].image, "image must be present in instances[0]");
        assert.equal(body.instances[0].image.bytesBase64Encoded, fs.readFileSync(pngPath).toString("base64"));
        assert.equal(body.instances[0].image.mimeType, "image/png");

        assert.equal(body.parameters.durationSeconds, 8);
        assert.equal(body.parameters.aspectRatio, "16:9");
        assert.equal(body.parameters.resolution, "1080p");
        assert.equal(body.parameters.resizeMode, "CROP", "resizeMode in Vertex AI body must be 'CROP'");
      });

      // ── Sub-test 16.4: Text-only fallback structurally blocked for image-first clip
      await st.test("16.4 Text-only requests cannot accidentally be used for an image-first clip", () => {
        // Direct constructVeoVideoRequest with isImageFirst: true and no image
        assert.throws(
          () => constructVeoVideoRequest({ prompt: promptText, isImageFirst: true }),
          /IMAGE_FIRST_TEXT_FALLBACK_BLOCKED/,
          "Must throw when image-first clip has no image provided"
        );

        // Missing file on disk
        assert.throws(
          () => constructVeoVideoRequest({ prompt: promptText, imagePath: "/nonexistent/path/image.png" }),
          /IMAGE_FILE_NOT_FOUND/,
          "Must throw when specified image file does not exist"
        );

        // Missing prompt
        assert.throws(
          () => constructVeoVideoRequest({ prompt: "", imagePath: pngPath }),
          /MISSING_PROMPT/,
          "Must throw when prompt is empty"
        );
      });

      // ── Sub-test 16.5: Image approval and hash validation required before video call
      await st.test("16.5 Image approval and hash validation are required before any video call", async () => {
        const state = loadOrInitSurahState(3, {
          customDir: testDir,
          visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
        });

        // Setup clip with unapproved image
        state.clips["03a"].state = PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING;
        saveSurahState(state, testDir);

        // Attempt generation with unapproved image -> BLOCKED
        const unapprovedPilot = await executeControlledPilot({
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
          destinationDir: path.join(testDir, "pilot_unapproved"),
          customDir: testDir,
          requireImageApproval: true,
        });

        assert.equal(unapprovedPilot.success, false);
        assert.equal(unapprovedPilot.step, "IMAGE_APPROVAL_GATE");
        assert.match(unapprovedPilot.error, /Image approval gate failed/);

        // Setup approval record with valid hash
        const imageSha = computeHash(pngPath);
        state.clips["03a"].imageApproval = createImageApprovalRecord({
          surahNum: 3,
          clipId: "03a",
          imagePath: pngPath,
          prompt: "prompt",
          dimensions: { width: 1344, height: 768 },
          aspectRatio: "16:9",
          reviewer: "HUMAN_OPERATOR",
        });
        state.clips["03a"].state = PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL;
        saveSurahState(state, testDir);

        // Tamper with image file on disk (overwrite with different content)
        const tamperedPath = path.join(testDir, "tampered_still.png");
        await sharp({
          create: { width: 1344, height: 768, channels: 3, background: { r: 10, g: 20, b: 30 } },
        }).png().toFile(tamperedPath);

        fs.copyFileSync(tamperedPath, pngPath);

        // Attempt generation after file tampering -> BLOCKED
        const tamperedPilot = await executeControlledPilot({
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
          destinationDir: path.join(testDir, "pilot_tampered"),
          customDir: testDir,
          requireImageApproval: true,
        });

        assert.equal(tamperedPilot.success, false);
        assert.equal(tamperedPilot.step, "IMAGE_APPROVAL_GATE");
        assert.match(tamperedPilot.error, /hash mismatch/);
      });

      // ── Sub-test 16.6: Rejected, modified, or unapproved images remain blocked
      await st.test("16.6 Rejected, revision-requested, or unapproved images remain strictly blocked", async () => {
        const state = loadOrInitSurahState(3, {
          customDir: testDir,
          visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
        });

        // Case A: IMAGE_REJECTED state
        state.clips["03a"].state = PRODUCTION_STATES.IMAGE_REJECTED;
        state.clips["03a"].imageApproval = {
          isValid: false,
          rejectionReason: "Too synthetic, palm leaves glossy",
          imagePath: pngPath,
        };
        saveSurahState(state, testDir);

        const rejectedRes = await executeControlledPilot({
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
          destinationDir: path.join(testDir, "pilot_rejected"),
          customDir: testDir,
          requireImageApproval: true,
        });

        assert.equal(rejectedRes.success, false);
        assert.equal(rejectedRes.step, "IMAGE_APPROVAL_GATE");
        assert.match(rejectedRes.error, /Image approval was explicitly marked invalid|Image is unapproved/);

        // Case B: IMAGE_REVISION_REQUESTED state
        state.clips["03a"].state = PRODUCTION_STATES.IMAGE_REVISION_REQUESTED;
        state.clips["03a"].imageApproval = null;
        saveSurahState(state, testDir);

        const revisionRes = await executeControlledPilot({
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
          destinationDir: path.join(testDir, "pilot_revision"),
          customDir: testDir,
          requireImageApproval: true,
        });

        assert.equal(revisionRes.success, false);
        assert.equal(revisionRes.step, "IMAGE_APPROVAL_GATE");
      });

      // ── Sub-test 16.7: Mock AI client live-mode simulation verifies end-to-end request
      await st.test("16.7 Mock AI client in live mode passes image conditioning and resizeMode", async () => {
        const liveTestDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-veo-live-mock-"));
        try {
          const liveImgPath = path.join(liveTestDir, "approved_still.png");
          await sharp({
            create: { width: 1344, height: 768, channels: 3, background: { r: 160, g: 140, b: 110 } },
          }).png().toFile(liveImgPath);

          const prompts = prepareScenePrompts(3, "03a");
          const fullPrompt = prompts.videoMotionPrompt || prompts.stillImagePrompt;

          const state = loadOrInitSurahState(3, {
            customDir: liveTestDir,
            visualData: { chapters: [{ id: "03a", theme: "Sanctuary", fromVerse: 33, toVerse: 44, videoPath: "/videos/03a.mp4" }] },
          });

          state.clips["03a"].imageApproval = createImageApprovalRecord({
            surahNum: 3,
            clipId: "03a",
            imagePath: liveImgPath,
            videoPrompt: fullPrompt,
            videoConfig: {
              model: "veo-3.1-fast-generate-001",
              resolution: "1080p",
              aspectRatio: "16:9",
              duration: 8,
            },
            dimensions: { width: 1344, height: 768 },
            aspectRatio: "16:9",
            reviewer: "HUMAN_OPERATOR",
          });
          state.clips["03a"].state = PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL;
          saveSurahState(state, liveTestDir);

          let interceptedRequest = null;
          const mockAiClient = {
            models: {
              generateVideos: async (req) => {
                interceptedRequest = req;
                // Generate a dummy valid 2-second mp4 for post-processing pipeline
                const testRawMp4 = path.join(liveTestDir, "dummy_raw.mp4");
                const { spawnSync } = await import("node:child_process");
                spawnSync(
                  "ffmpeg",
                  [
                    "-y",
                    "-f", "lavfi",
                    "-i", "color=c=gray:s=1280x720:d=2:r=24",
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    testRawMp4,
                  ],
                  { stdio: "pipe" }
                );
                const dummyVideoBase64 = fs.readFileSync(testRawMp4).toString("base64");
                return {
                  name: "projects/test-huda/locations/us-central1/operations/test-live-mock-op",
                  done: true,
                  response: {
                    generatedVideos: [
                      {
                        video: {
                          bytesBase64Encoded: dummyVideoBase64,
                        },
                      },
                    ],
                  },
                };
              },
            },
            operations: {
              getVideosOperation: async ({ operation }) => operation,
            },
          };

          const liveMockRes = await executeControlledPilot({
            surahNum: 3,
            clipId: "03a",
            mode: "live",
            confirmation: "APPROVE",
            approval: {
              surah: 3,
              clipIds: ["03a"],
              model: "veo-3.1-fast-generate-001",
              expectedCostINR: 76.791,
              timestamp: new Date().toISOString(),
            },
            destinationDir: path.join(liveTestDir, "pilot_live"),
            customDir: liveTestDir,
            mockAiClient,
            requireImageApproval: true,
          });

          assert.equal(liveMockRes.success, true);
          assert.ok(interceptedRequest, "Mock AI client must have intercepted the generateVideos call");
          assert.ok(interceptedRequest.source.image.imageBytes, "Image bytes must be present in request");
          assert.equal(interceptedRequest.source.image.mimeType, "image/png");
          assert.equal(interceptedRequest.config.resizeMode, "CROP", "Explicit resizeMode must be CROP");
          assert.equal(interceptedRequest.config.aspectRatio, "16:9");
          assert.equal(interceptedRequest.config.resolution, "1080p");
          assert.equal(interceptedRequest.config.durationSeconds, 8);
        } finally {
          fs.rmSync(liveTestDir, { recursive: true, force: true });
        }
      });
    } finally {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  await t.test("17. Master Production Orchestrator: Resumable execution, durable summaries, and automatic next-clip & next-Surah progression", async (st) => {
    const orchTestDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-orch-test-"));
    const summaryTestDir = path.join(orchTestDir, "summaries/surah_003");
    fs.mkdirSync(summaryTestDir, { recursive: true });

    try {
      // 17.1 Workflow Status Inspection
      await st.test("17.1 Accurately reports workflow status, approvals, and next eligible action", () => {
        const state = loadSurahState(3, { customDir: orchTestDir });
        const status = getProjectWorkflowStatus({ surahNum: 3, customDir: orchTestDir });

        assert.equal(status.surahNum, 3);
        assert.equal(status.surahName, "Aal-Imran");
        assert.equal(status.verses, 200);
        assert.ok(status.activeClipId, "Active clip must be identified");
        assert.equal(status.hasImageApproval, false);
        assert.equal(status.nextEligibleAction, "AUTHORIZE_IMAGE_PREVIEW");
      });

      // 17.2 Durable Summary Generation with all 21 fields
      await st.test("17.2 Generates durable markdown summary containing all 21 required fields", () => {
        const state = loadSurahState(3, { customDir: orchTestDir });
        const clip = resolveClip(state, "03a");

        const { summaryPath, summaryMarkdown } = generateClipSummary({
          surahNum: 3,
          clipId: clip.id,
          state,
          customDir: orchTestDir,
          customSummaryDir: summaryTestDir,
        });

        assert.ok(fs.existsSync(summaryPath), "Summary file must exist on disk");

        // Verify required sections (1 through 21)
        for (let i = 1; i <= 21; i++) {
          assert.ok(
            summaryMarkdown.includes(`## ${i}. `),
            `Summary must contain Section ${i}`
          );
        }
        assert.ok(summaryMarkdown.includes("IMAGE_FIRST_VEO_3_1"));
        assert.ok(summaryMarkdown.includes("veo-3.1-fast-generate-001"));
        assert.ok(summaryMarkdown.includes("Widescreen Tolerance"));
        assert.ok(summaryMarkdown.includes("Word-Sync Compatibility"));
        assert.ok(summaryMarkdown.includes("Financial Cost Breakdown"));
      });

      // 17.3 Next Eligible Clip Determination
      await st.test("17.3 determineNextEligibleClip finds incomplete clips in sequential order", () => {
        const state = loadSurahState(3, { customDir: orchTestDir });
        const first = determineNextEligibleClip(3, state);
        assert.equal(first.clipId, "1");
        assert.equal(first.isComplete, false);

        // Mark clip 1 complete
        state.clips["1"].state = PRODUCTION_STATES.QA_PASSED;
        const second = determineNextEligibleClip(3, state);
        assert.equal(second.clipId, "2");
      });

      // 17.4 Resumable Stepper: Mock AI preview generation and halting at image human gate
      await st.test("17.4 advanceWorkflow generates preview with mock AI and halts at human image approval gate", async () => {
        const mockAiClient = {
          models: {
            generateImages: async () => {
              const buf = await sharp({
                create: { width: 1344, height: 768, channels: 3, background: { r: 120, g: 150, b: 100 } },
              }).png().toBuffer();
              return {
                generatedImages: [{ image: { imageBytes: buf.toString("base64") } }],
              };
            },
            generateContent: async () => ({
              text: JSON.stringify({
                theologicalSafety: {
                  passed: true,
                  humanFiguresDetected: false,
                  facesDetected: false,
                  propheticOrAngelicDepictions: false,
                  idolsOrReligiousShrines: false,
                  observations: "Pure natural landscape with zero human figures.",
                },
                visualRealism: {
                  score: 95,
                  naturalLandscapeAssessment: "Authentic wadi terrain with limestone rocks.",
                  lightingAndColorAssessment: "Soft natural morning light.",
                  visibleArtifacts: [],
                },
                thematicRelevance: {
                  score: 94,
                  verseScopeRelevance: "Matches sanctuary contemplation mood.",
                  sceneDescriptionMatch: "Matches intended wadi oasis.",
                },
                temporalMotionFeasibility: {
                  suitableForVideoMotion: true,
                  cameraFraming: "Grounded tripod shot.",
                  potentialMotionIssues: [],
                },
                synthesis: {
                  recommendation: "PASS",
                  confidence: "HIGH",
                  criticalDefects: [],
                },
              }),
            }),
          },
        };

        const res = await advanceWorkflow({
          surahNum: 3,
          clipId: "03a",
          customDir: orchTestDir,
          customSummaryDir: summaryTestDir,
          options: { mockAiClient },
        });

        assert.equal(res.status, "HALTED_AT_IMAGE_APPROVAL_GATE");
        assert.equal(res.clipState, PRODUCTION_STATES.IMAGE_HUMAN_REVIEW_PENDING);

        const state = loadSurahState(3, { customDir: orchTestDir });
        const clip = resolveClip(state, "03a");
        assert.ok(clip.visualAiEvaluation);
        assert.equal(clip.visualAiEvaluation.recommendation, "PASS");
      });

      // 17.5 Resumable Stepper: Halting strictly at video generation gate when image approved
      await st.test("17.5 advanceWorkflow halts strictly at video generation gate without authorization", async () => {
        // Record human approval for the image
        await recordHumanImageDecision({
          surahNum: 3,
          clipId: "03a",
          decision: "APPROVE",
          reviewer: "HUMAN_OPERATOR",
          customDir: orchTestDir,
        });

        const res = await advanceWorkflow({
          surahNum: 3,
          clipId: "03a",
          customDir: orchTestDir,
          customSummaryDir: summaryTestDir,
          options: { mockAiClient: null }, // No video authorization
        });

        assert.equal(res.status, "HALTED_AT_VIDEO_GENERATION_GATE");
        const state = loadSurahState(3, { customDir: orchTestDir });
        const clip = resolveClip(state, "03a");
        assert.equal(clip.state, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);
      });

      // 17.6 Surah Completion Verification (8 criteria)
      await st.test("17.6 verifySurahCompletion enforces all 8 criteria before marking Surah complete", () => {
        const state = loadSurahState(3, { customDir: orchTestDir });
        const initialVerify = verifySurahCompletion(3, state);
        assert.equal(initialVerify.isComplete, false);
        assert.equal(initialVerify.criteria.allClipsApprovedOrDeployed.passed, false);

        // Simulate full completion of Surah 108 (Al-Kawthar, 1 chapter clip)
        const surah108Dir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-s108-test-"));
        const s108SummaryDir = path.join(surah108Dir, "summaries/surah_108");
        fs.mkdirSync(s108SummaryDir, { recursive: true });

        try {
          const s108State = loadSurahState(108, { customDir: surah108Dir });

          // Mark all clips in s108 as QA_PASSED and generate summaries
          for (const clip of Object.values(s108State.clips)) {
            clip.state = PRODUCTION_STATES.QA_PASSED;
            clip.localProcessedMaster = "/path/to/staged.mp4";
            generateClipSummary({
              surahNum: 108,
              clipId: clip.id,
              state: s108State,
              customDir: surah108Dir,
              customSummaryDir: s108SummaryDir,
            });
          }
          s108State.overallState = "COMPLETED";
          saveSurahState(s108State, surah108Dir);

          const s108Verify = verifySurahCompletion(108, s108State, { customSummaryDir: s108SummaryDir });
          assert.equal(s108Verify.criteria.allClipsApprovedOrDeployed.passed, true);
          assert.equal(s108Verify.criteria.zeroFailedOrRejected.passed, true);
          assert.equal(s108Verify.criteria.overallStateCompleted.passed, true);
          assert.equal(s108Verify.criteria.wordSyncAligned.passed, true);
        } finally {
          fs.rmSync(surah108Dir, { recursive: true, force: true });
        }
      });

      // 17.7 Automatic Next-Surah Progression
      await st.test("17.7 advanceToNextSurah increments to Surah N+1 upon verified completion", () => {
        const mockDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-advance-test-"));
        try {
          // Surah 113 (Al-Falaq)
          const s113SummaryDir = path.join(mockDir, "summaries/surah_113");
          fs.mkdirSync(s113SummaryDir, { recursive: true });
          const s113State = loadSurahState(113, { customDir: mockDir });

          // Incomplete cannot advance
          const incompleteRes = advanceToNextSurah({ currentSurahNum: 113, customDir: mockDir, customSummaryDir: s113SummaryDir });
          assert.equal(incompleteRes.advanced, false);
          assert.equal(incompleteRes.reason, "CURRENT_SURAH_INCOMPLETE");

          // Complete s113 clips & summaries
          for (const clip of Object.values(s113State.clips)) {
            clip.state = PRODUCTION_STATES.QA_PASSED;
            clip.localProcessedMaster = "/path/to/staged.mp4";
            generateClipSummary({
              surahNum: 113,
              clipId: clip.id,
              state: s113State,
              customDir: mockDir,
              customSummaryDir: s113SummaryDir,
            });
          }
          s113State.overallState = "COMPLETED";
          saveSurahState(s113State, mockDir);

          // Now advanceToNextSurah succeeds and initializes Surah 114
          const advanceRes = advanceToNextSurah({ currentSurahNum: 113, customDir: mockDir, customSummaryDir: s113SummaryDir });
          assert.equal(advanceRes.advanced, true);
          assert.equal(advanceRes.nextSurahNum, 114);
          assert.equal(advanceRes.nextSurahMeta.name, "An-Nas");
          assert.ok(fs.existsSync(getStateFilePath(114, mockDir)));
        } finally {
          fs.rmSync(mockDir, { recursive: true, force: true });
        }
      });

      // 17.8 Project-Wide Validation Audit
      await st.test("17.8 runProjectWideValidation returns 114 Surahs and metrics", () => {
        const audit = runProjectWideValidation({ customDir: orchTestDir });
        assert.equal(audit.totalSurahs, 114);
        assert.equal(audit.surahs.length, 114);
        assert.ok(audit.totalClips >= 114);
      });
    } finally {
      fs.rmSync(orchTestDir, { recursive: true, force: true });
    }
  });

  await t.test("18. Authoritative Verse Planning & Resumption Suite", async (vt) => {
    const vPlanDir = fs.mkdtempSync(path.join(os.tmpdir(), "huda-verse-plan-test-"));
    const vCustomPlansDir = path.join(vPlanDir, "plans");

    vt.after(() => {
      fs.rmSync(vPlanDir, { recursive: true, force: true });
    });

    await vt.test("18.1 buildClipVersePlan loads authoritative Arabic, Tamil, and English text", () => {
      const planRes = buildClipVersePlan({
        surahNum: 3,
        clipId: "04a",
        customDir: vPlanDir,
        customPlansDir: vCustomPlansDir,
      });

      assert.ok(planRes.plan);
      assert.equal(planRes.plan.surahNumber, 3);
      assert.equal(planRes.plan.clipId, "04a");
      assert.equal(planRes.plan.fromVerse, 45);
      assert.equal(planRes.plan.toVerse, 51);
      assert.equal(planRes.plan.totalAyahs, 7);
      assert.equal(planRes.plan.verses.length, 7);

      // Verify authentic verse texts
      const firstAyah = planRes.plan.verses[0];
      assert.equal(firstAyah.ayahNumber, 45);
      assert.ok(firstAyah.textArabic.includes("مَرْيَمَ") || firstAyah.textArabic.includes("مَرْيَمُ"));
      assert.ok(firstAyah.textTamil.includes("மர்யமே!"));
      assert.ok(firstAyah.textEnglish.includes("Mary"));

      // Verify file created on disk
      assert.ok(fs.existsSync(planRes.planPath));
      const content = fs.readFileSync(planRes.planPath, "utf8");
      assert.ok(content.includes("Surah 3"));
      assert.ok(content.includes("Human Plan Approval Gate"));

      // Verify state was set to CLIP_PLAN_PENDING_APPROVAL
      const state = loadSurahState(3, { customDir: vPlanDir });
      const clip04a = resolveClip(state, "04a");
      assert.equal(clip04a.state, PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL);
      assert.equal(clip04a.planApproved, false);
    });

    await vt.test("18.2 recordHumanPlanDecision APPROVE unlocks image generation", () => {
      const res = recordHumanPlanDecision({
        surahNum: 3,
        clipId: "04a",
        decision: "APPROVE",
        reviewer: "CHIEF_REVIEWER",
        notes: "Approved verse plan with verified Tamil and Arabic texts.",
        customDir: vPlanDir,
      });

      assert.equal(res.success, true);
      assert.equal(res.state, PRODUCTION_STATES.IMAGE_GENERATION_PENDING);

      const state = loadSurahState(3, { customDir: vPlanDir });
      const clip04a = resolveClip(state, "04a");
      assert.equal(clip04a.state, PRODUCTION_STATES.IMAGE_GENERATION_PENDING);
      assert.equal(clip04a.planApproved, true);
      assert.equal(clip04a.planApproval.reviewer, "CHIEF_REVIEWER");
      assert.equal(clip04a.planApproval.isValid, true);
    });

    await vt.test("18.3 recordHumanPlanDecision REJECT transitions to FAILED", () => {
      buildClipVersePlan({
        surahNum: 3,
        clipId: "04b",
        customDir: vPlanDir,
        customPlansDir: vCustomPlansDir,
      });

      const res = recordHumanPlanDecision({
        surahNum: 3,
        clipId: "04b",
        decision: "REJECT",
        reviewer: "CHIEF_REVIEWER",
        notes: "Verse text boundary mismatch.",
        customDir: vPlanDir,
      });

      assert.equal(res.success, true);
      assert.equal(res.state, PRODUCTION_STATES.FAILED);

      const state = loadSurahState(3, { customDir: vPlanDir });
      const clip04b = resolveClip(state, "04b");
      assert.equal(clip04b.state, PRODUCTION_STATES.FAILED);
      assert.equal(clip04b.planApproved, false);
      assert.equal(clip04b.planApproval.isValid, false);
    });

    await vt.test("18.4 recordHumanPlanDecision REVISE holds at CLIP_PLAN_PENDING_APPROVAL", () => {
      const res = recordHumanPlanDecision({
        surahNum: 3,
        clipId: "04b",
        decision: "REVISE",
        reviewer: "CHIEF_REVIEWER",
        notes: "Please update visual negative constraints.",
        customDir: vPlanDir,
      });

      assert.equal(res.success, true);
      assert.equal(res.state, PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL);

      const state = loadSurahState(3, { customDir: vPlanDir });
      const clip04b = resolveClip(state, "04b");
      assert.equal(clip04b.state, PRODUCTION_STATES.CLIP_PLAN_PENDING_APPROVAL);
      assert.equal(clip04b.planApproved, false);
    });
  });
});
