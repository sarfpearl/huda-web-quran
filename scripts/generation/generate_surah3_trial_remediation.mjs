/**
 * HuDa Web Quran — Generate & QA 3 Remediated Clips for Surah 3 (Aal-Imran)
 * 
 * Target Clips:
 *   1. 10a (Verses 190-195): Static Milky Way & desert plateau (fixing rotating sky SSIM 0.423)
 *   2. 01a (Verses 1-9): Completely static tripod rock strata (fixing camera drift SSIM 0.594)
 *   3. 02c (Verses 26-32): Constant civil twilight gravel plateau (fixing exposure ramp SSIM 0.661)
 *
 * Rules:
 *   - Project: project-04027e7d-9805-47dc-bdf
 *   - Model: veo-3.1-fast-generate-001 (1080p, 8s, 24fps)
 *   - Isolated in scratch/surah3_trial_generation/
 *   - Approved 0.40s crossfade seam
 *   - Budget Guard enforced per generation
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

const SCRATCH_DIR = path.resolve("scratch/surah3_trial_generation");
const RAW_DIR = path.join(SCRATCH_DIR, "raw_masters");
const QA_DIR = path.join(SCRATCH_DIR, "qa_frames");

const OPENING =
  "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position with all filming equipment completely outside the visible composition";
const CAMERA =
  "The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, orbit, rotation, drone movement, or artificial parallax. " +
  "Completely consistent ambient illumination throughout the entire 8-second shot, with no moving sun, no time-lapse progression, no shifting shadows, and no exposure change. " +
  "Completely motionless camera framing ensures absolute visual stability, zero parallax shift, and clean loop compatibility. " +
  "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame.";
const NEGATIVE =
  "No black bars, no letterboxing, no pillarboxing, no black bands, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no numbers, no symbols, no text, no logos. " +
  "No camera equipment, no tripod, no tripod legs, no equipment shadow, no filming gear, no modern objects, no roads, no vehicles, no power lines. " +
  "No humans, no faces, no hands, no feet, no bodies, no silhouettes, no footprints, no human traces, no divine figures, no angels, no prophets, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, no casualties, no hellfire, no demons, no souls, no corpses, no graves, no skeletons, no resurrection imagery, " +
  "no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no tents, no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no cosmic portals, no magical particles.";

const TARGET_CLIPS = [
  {
    id: "10a",
    name: "10a-ulul-albab-and-contemplation-of-creation",
    verses: "190–195",
    theme: "Contemplation of the Creation of the Heavens and the Earth ('Ulul-Albab')",
    scene:
      "capturing a clear, dark night sky over a quiet, motionless sandstone desert plateau in the AlUla region, far from any artificial light. " +
      "The Milky Way arcs across the upper frame among countless steady stars; below, the dark silhouettes of low, natural weathered sandstone rock outcrops sit completely still on a flat, starlit desert floor. " +
      "The night sky and horizon remain completely static and frozen in place across the entire 8 seconds with only natural faint star twinkling, with absolutely zero planetary rotation, zero sky spinning, and zero camera movement.",
    avoid: "No star trails, no rotating sky, no time-lapse, no meteors, no shooting stars, no auroras, no planets close-up, no glowing ground.",
  },
  {
    id: "01a",
    name: "01a-the-immutable-foundation-and-muhkamat",
    verses: "1–9",
    theme: "The Immutable Foundation, Muhkamat & Steadfast Faith",
    scene:
      "capturing an authentic, majestic Western Arabian weathered granite rock formation and ancient exposed geological strata standing firm and enduring across a broad, quiet mountain plateau beneath a calm dawn sky. " +
      "Subtle natural morning mist rests low in distant mountain valleys while crisp, pale dawn sunlight grazes the weathered stone facets and scattered natural gravel. " +
      "Natural atmospheric depth and realistic geological erosion convey an immutable physical foundation, timeless stillness, and solemn permanence. The entire geological formation and foreground remain 100% stationary with zero camera drift and zero forward movement.",
    avoid: "No forward tracking, no dolly movement, no zoom, no floating mist close to camera, no modern structures.",
  },
  {
    id: "02c",
    name: "02c-the-supreme-sovereign-and-cosmic-order",
    verses: "26–32",
    theme: "The Supreme Sovereign, Cosmic Order & True Devotion",
    scene:
      "capturing the monumental, towering natural cliffs of the Jebel Tuwaiq escarpment in central Arabia standing majestically above an immense, quiet desert expanse during calm, steady civil twilight. " +
      "The massive horizontal sedimentary limestone cliff wall stretches across the upper composition, with sheer rocky precipices, natural ledges, and quiet desert floor far below catching soft, uniform rose and indigo twilight illumination. " +
      "The horizon is vast, open, and still beneath an expansive, clear dusk sky, perfectly evoking majestic cosmic order and divine sovereignty. " +
      "The entire escarpment and distant valley remain 100% stationary with completely constant illumination throughout the entire 8 seconds with zero exposure change, zero camera motion, and zero sun movement.",
    avoid: "No flat gravel flats, no vertical pinnacles, no thumb rocks, no modern buildings, no roads, no fences, no exposure brightening, no sunrise flare, no sunset dip.",
  },
];

const promptFor = (c) => `${OPENING}, ${c.scene} ${CAMERA} ${NEGATIVE} ${c.avoid}`;

const sh = (cmd) => execSync(cmd, { stdio: "pipe" });

function probe(file) {
  return JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${file}"`,
      { encoding: "utf8" }
    )
  );
}

function letterbox(file) {
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

async function renderVeo(ai, c) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Submitting Vertex AI Veo Generation: ${c.id} (${c.name})`);
  console.log(`   Verses:   ${c.verses}`);
  console.log(`   Model:    ${MODEL} (1080p, 8s, 16:9)`);
  console.log(`   Project:  ${PROJECT_ID}`);
  console.log(`======================================================================`);

  let op = await ai.models.generateVideos({
    model: MODEL,
    source: { prompt: promptFor(c) },
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

  const rawMasterPath = path.join(RAW_DIR, `${c.name}-raw-master.mp4`);
  fs.writeFileSync(rawMasterPath, Buffer.from(bytes, "base64"));
  console.log(`✓ Saved raw master: ${rawMasterPath} (${(fs.statSync(rawMasterPath).size / 1024 / 1024).toFixed(2)} MB)`);

  return { rawMasterPath, operationId: op.name };
}

function processAndQA(c, rawMasterPath) {
  const p = probe(rawMasterPath);
  const dur = Number(p.format?.duration || DURATION);
  const w = p.streams?.[0]?.width || 1920;
  const h = p.streams?.[0]?.height || 1080;
  const crop = letterbox(rawMasterPath);
  const pre = crop && crop.h < h * 0.98 ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${w}:${h}:flags=lanczos,` : "";

  const cut = (dur - OVERLAP_SEC).toFixed(3);
  const finalSeamlessPath = path.join(SCRATCH_DIR, `${c.name}.mp4`);

  console.log(`Applying approved 0.40s crossfade seam to ${c.id}...`);
  const graph =
    `[0:v]${pre}scale=1920:1080:flags=lanczos,split=2[v1][v2];` +
    `[v1]trim=start=${OVERLAP_SEC}:end=${dur},setpts=PTS-STARTPTS[body];` +
    `[v2]trim=start=0:end=${OVERLAP_SEC},setpts=PTS-STARTPTS[head];` +
    `[0:v]${pre}scale=1920:1080:flags=lanczos,trim=start=${cut}:end=${dur},setpts=PTS-STARTPTS[tail];` +
    `[tail][head]xfade=transition=fade:duration=${OVERLAP_SEC}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;

  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${graph}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart -an "${finalSeamlessPath}"`
  );

  // Extract multi-timestamp QA frames
  for (const t of [0, 2, 4, 6]) {
    execSync(`ffmpeg -y -ss ${t} -i "${finalSeamlessPath}" -vframes 1 "${path.join(QA_DIR, `${c.name}_${t}s.png`)}"`);
  }
  execSync(`ffmpeg -y -sseof -0.05 -i "${finalSeamlessPath}" -vframes 1 "${path.join(QA_DIR, `${c.name}_8s.png`)}"`);

  // Render 3-cycle loop test
  const loop3xPath = path.join(QA_DIR, `${c.name}_loop_3x_test.mp4`);
  execSync(`ffmpeg -y -stream_loop 2 -i "${finalSeamlessPath}" -c copy "${loop3xPath}"`);

  // Measure seam SSIM between first frame and last frame
  const seamFrame1 = path.join(QA_DIR, `${c.name}_0s.png`);
  const seamFrame2 = path.join(QA_DIR, `${c.name}_8s.png`);
  let ssimMetric = "N/A";
  try {
    const ssimOut = execSync(
      `ffmpeg -i "${seamFrame1}" -i "${seamFrame2}" -lavfi ssim -f null - 2>&1`,
      { encoding: "utf8" }
    );
    const m = ssimOut.match(/All:([0-9.]+)/);
    if (m) ssimMetric = m[1];
  } catch (err) {
    console.warn(`SSIM measurement warning: ${err.message}`);
  }

  const f = probe(finalSeamlessPath);
  const outDur = Number(f.format.duration).toFixed(2);
  const sizeMB = (f.format.size / 1048576).toFixed(2);

  console.log(`✓ Produced seamless loop: ${finalSeamlessPath}`);
  console.log(`  Dimensions: ${f.streams[0].width}x${f.streams[0].height}`);
  console.log(`  Duration:   ${outDur}s`);
  console.log(`  Size:       ${sizeMB} MB`);
  console.log(`  Seam SSIM:  ${ssimMetric}`);

  return {
    finalSeamlessPath,
    loop3xPath,
    duration: outDur,
    sizeMB,
    seamSSIM: ssimMetric,
  };
}

async function main() {
  const onlyArg = process.argv.slice(2).find((a) => a.startsWith("--only="))?.slice(7);
  const target = onlyArg ? TARGET_CLIPS.filter((c) => c.id === onlyArg) : [TARGET_CLIPS[0]];

  if (target.length === 0) {
    console.error(`Clip ${onlyArg} not found. Available: ${TARGET_CLIPS.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }

  const c = target[0];

  // 1. Budget check
  const perm = evaluateGenerationPermission(1);
  if (!perm.allowed) {
    console.error(`🚨 BUDGET GUARD BLOCKED GENERATION: ${perm.reason}`);
    process.exit(1);
  }

  console.log(`💰 Budget Guard: PERMITTED. Remaining balance: ₹${perm.currentRemaining.toFixed(2)} INR`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  try {
    const { rawMasterPath, operationId } = await renderVeo(ai, c);
    const qaResult = processAndQA(c, rawMasterPath);

    // Record in budget guard
    recordSuccessfulGeneration(c.name, {
      id: c.id,
      operationId,
      seamSSIM: qaResult.seamSSIM,
      sizeMB: qaResult.sizeMB,
    });

    console.log(`\n🎉 Successfully completed generation and QA for ${c.id}!`);
  } catch (err) {
    console.error(`\n❌ Generation failed for ${c.id}: ${err.message}`);
    process.exit(1);
  }
}

main();
