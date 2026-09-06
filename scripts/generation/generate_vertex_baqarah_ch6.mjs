import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTERS = [
  {
    id: "06a",
    name: "06a-valley-of-peace-security-and-sustenance",
    verses: "124–126",
    theme: "The Valley of Peace, Security & Sustenance",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema ground-level tracking shot of an authentic arid Arabian wadi valley. " +
      "The scene begins in harsh, sun-baked dry terrain with cracked desert earth, weathered sedimentary rocks, and loose gravel, " +
      "then smoothly glides toward a quiet, sheltered basin floor where a modest natural spring feeds sparse, healthy wild date palms and indigenous arid scrub. " +
      "Atmosphere of quiet stillness, security, and natural sustenance without being an overly lush fantasy oasis. " +
      "Slow, continuous ground-level documentary dolly movement. " +
      "Authentic early-morning desert sunlight, natural soft shadows, subtle wind swaying palm fronds, gentle water ripples on the spring pool, and real drifting dust. " +
      "Borderless, unobstructed, clean full-frame nature cinematography, neutral natural color science. " +
      "No people, no faces, no silhouettes, no fortress walls, no military elements, no buildings, no text, no logos."
    ),
  },
  {
    id: "06b",
    name: "06b-raising-the-ancient-foundations",
    verses: "127–129",
    theme: "Raising the Ancient Stone Foundations (Hero Scene)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary-grade archaeological cinema shot of ancient dry-stone foundation courses partially raised in a barren desert valley basin. " +
      "Begins focused close on authentic, irregular, hand-hewn local stone blocks embedded in natural desert bedrock and soil, showing chipped rock corners, uneven dry masonry joints, and windblown dust settled in crevices. " +
      "A heavy cinema jib smoothly tilts upward and gradually pulls back to reveal the simple, solemn rectangular stone foundation resting firmly in the vast rocky landscape under an open desert sky. " +
      "Focus is entirely on authentic ancient stone, raw bedrock, weathered textures, and natural sky. " +
      "Authentic late-morning natural desert sun, realistic hard shadows in stone crevices, natural color grading, genuine heat haze along distant hills. " +
      "Clean, unobstructed, borderless edge-to-edge frame. " +
      "No people, no workers, no hands, no tools, no modern equipment, no modern architecture, no ornate mosques, no fantasy structures, no text, no logos."
    ),
  },
  {
    id: "06c",
    name: "06c-the-unbroken-path-of-submission",
    verses: "130–137",
    theme: "The Unbroken Path of Submission",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary tracking shot following a natural, weathered desert stone path alongside a clear shallow stream flowing over natural pebbles and gravel. " +
      "The terrain is organically irregular with eroded rocks, natural silt deposits, and hardy wild desert weeds swaying in the breeze. " +
      "The camera moves steadily forward along the unpaved natural pathway as the stream curves gently beside it, leading toward an open sunlit desert valley in the distance. " +
      "Authentic afternoon daylight, natural light reflections on clear moving water, realistic fluid dynamics, and true-to-life desert environment. " +
      "Clean full-frame borderless documentary cinematography, neutral color science. " +
      "No people, no travellers, no camels, no caravans, no animals, no artificial markings, no religious symbols, no text, no logos."
    ),
  },
  {
    id: "06d",
    name: "06d-sincerity-purity-and-passage-of-generations",
    verses: "138–141",
    theme: "Sincerity, Purity & The Flowing Waters of Accountability",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A contemplative documentary cinema shot of a pure, clear natural spring water stream flowing smoothly over bare, weathered desert bedrock. " +
      "The clear water moves naturally through a shallow rock channel and spreads outward across an expansive, quiet desert plain toward the distant horizon. " +
      "Natural golden-hour late afternoon light reflects softly across the moving water surface with realistic ripples and natural fluid turbulence. " +
      "Slow, smooth camera tracking following the water flow out toward the vast, quiet evening horizon under a natural gradient sky. " +
      "Ordinary real-world clear water, authentic stone textures, natural dust, and genuine environmental stillness. " +
      "Borderless, clean edge-to-edge frame. " +
      "No people, no faces, no monuments, no graves, no colored water, no glowing effects, no mystical VFX, no text, no logos."
    ),
  },
];

function probeAndEncode(sub, masterPath, opId = "") {
  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${masterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const fmt = probe.format || {};

  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${Number(fmt.duration || sub.duration).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  if (sub.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${sub.name}-1080p.mp4`);

    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -c:a aac -b:a 192k "${web4KPath}"`,
      { stdio: "ignore" }
    );
    execSync(
      `ffmpeg -y -i "${masterPath}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${fallback1080Path}"`,
      { stdio: "ignore" }
    );
    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
      { stdio: "ignore" }
    );
  }

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || sub.duration);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_end.png`)}"`, { stdio: "ignore" });

  const stats = fs.statSync(masterPath);

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: sub.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: Number(fmt.duration || sub.duration).toFixed(2),
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    masterFile: masterPath,
    masterSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    defaultWebFile: defaultWebPath,
    operationId: opId,
    qaFrames: [
      path.join(qaDir, `${sub.name}_start.png`),
      path.join(qaDir, `${sub.name}_mid.png`),
      path.join(qaDir, `${sub.name}_end.png`),
    ],
  };
}

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   "REALITY FIRST, BEAUTY SECOND" (Documentary Realism)`);
  console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
  console.log(`======================================================================`);

  const masterPath = path.join(
    OUTPUT_DIR,
    sub.is4K ? `${sub.name}-4k-master.mp4` : `${sub.name}-1080p-master.mp4`
  );

  // If master already exists and valid, skip generation
  if (fs.existsSync(masterPath) && fs.statSync(masterPath).size > 1000000) {
    console.log(`✓ Master file already exists on disk: ${masterPath}`);
    return probeAndEncode(sub, masterPath);
  }

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: sub.model,
    source: { prompt: sub.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: sub.duration,
      resolution: sub.resolution,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log(`2. Polling rendering progress (${sub.is4K ? "4K Standard" : "1080p Fast"})...`);

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    try {
      operation = await ai.operations.getVideosOperation({ operation });
      console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
    } catch (pollErr) {
      console.warn(`  [Poll #${pollCount} @ ${pollCount * 7}s] Transient poll warning: ${pollErr.message}`);
    }
  }

  if (operation.error) {
    throw new Error(`Generation failed for ${sub.name}: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned for ${sub.name}: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(masterPath, buffer);
  console.log(`✓ Master saved: ${masterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  return probeAndEncode(sub, masterPath, operationId);
}

async function main() {
  console.log("======================================================================");
  console.log("  Huda Bayan — Al-Baqarah Chapter 6 (6A, 6B, 6C, 6D) Production Pipeline");
  console.log("======================================================================");
  console.log(`Google Cloud Project: ${PROJECT_ID}`);
  console.log(`Location:             ${LOCATION}`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const results = [];
  for (const sub of SUBCHAPTERS) {
    const res = await generateSubchapter(ai, sub);
    results.push(res);
  }

  console.log("\n======================================================================");
  console.log("            AL-BAQARAH CHAPTER 6 GENERATION COMPLETED                 ");
  console.log("======================================================================");
  results.forEach((r) => {
    console.log(`\nSubchapter ${r.id.toUpperCase()}: ${r.name} (Verses ${r.verses})`);
    console.log(`  • Model:             ${r.model}`);
    console.log(`  • Target vs Native:  ${r.targetResolution.toUpperCase()} → ${r.nativeResolution}`);
    console.log(`  • Duration:          ${r.duration}s @ ${r.fps}`);
    console.log(`  • Master Size:       ${r.masterSizeMB} MB`);
    console.log(`  • Operation ID:      ${r.operationId}`);
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "chapter-6-report.json"),
    JSON.stringify({ projectId: PROJECT_ID, location: LOCATION, subchapters: results }, null, 2)
  );
}

main().catch((err) => {
  console.error("❌ Chapter 6 Pipeline Error:", err);
  process.exit(1);
});
