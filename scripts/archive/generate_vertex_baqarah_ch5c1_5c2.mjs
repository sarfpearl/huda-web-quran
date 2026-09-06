import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTERS = [
  {
    id: "05c1",
    name: "05c1-the-fragmented-markings-and-transient-dust",
    verses: "75–86",
    theme: "Human Alteration, Fragility of Mortal Markings & The Transient Dust",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    prompt: (
      "An ancient weathered limestone outcrop in a vast barren arid desert landscape. " +
      "Low-angle macro-to-medium continuous cinematic dolly glide along the rock surface. " +
      "Faint, non-readable linear geometric tool grooves and indentations on the rough stone face are shown being continuously obscured and eroded as fine desert sand drifts across them in the wind. " +
      "The underlying limestone bedrock remains physically solid while the superficial marks appear fragile and impermanent. " +
      "Late-afternoon golden desert sunlight casts sharp diagonal shadows across the rock crevices. " +
      "Camera gently widens at the end revealing the solitary stone embedded within an expansive dusty desert horizon. " +
      "Photorealistic 35mm film nature cinematography, physical wind dynamics, fine dust particles. " +
      "No people, no faces, no readable text, no Arabic writing, no scripture, no books, no scrolls, no artifacts, no architecture, no logos."
    ),
  },
  {
    id: "05c2",
    name: "05c2-the-enclosed-corridor-and-return-to-light",
    verses: "87–103",
    theme: "Enclosed Perception, Canyon Shadows & Upward Orientation toward Clarity and Faith",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    prompt: (
      "A cinematic journey from open daylight into an enclosed natural rock gorge. " +
      "Begins in a broad rocky plateau under clear natural daylight, then camera continuously tracks forward into a narrow twisting natural stone slot canyon where towering sheer rock walls rise and enclose the space in deep cool shadows. " +
      "Subtle natural ambient light refracts along the jagged dry rock walls, creating shifting natural shadows. " +
      "A clean slit of bright open sky remains clearly visible high above. " +
      "In the final moments, the camera smoothly tilts upward and pivots directly toward the bright open sky above, reorienting the view toward clear open daylight and clarity. " +
      "Photorealistic nature cinematography, volumetric daylight from above, natural rock textures, genuine camera motion through 3D space. " +
      "No people, no faces, no statues, no occult symbols, no magical effects, no glowing supernatural lights, no text, no architecture, no logos."
    ),
  },
];

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Theme:      "${sub.theme}"`);
  console.log(`Duration:   ${sub.duration} seconds`);
  console.log(`======================================================================`);

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: sub.model,
    source: {
      prompt: sub.prompt,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: sub.duration,
      resolution: sub.resolution,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log("2. Polling rendering progress...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
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
  const masterPath = path.join(OUTPUT_DIR, `${sub.name}-1080p-master.mp4`);

  fs.writeFileSync(masterPath, buffer);
  console.log(`✓ Master saved: ${masterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  // Probe master
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

  // Delivery Web Encode
  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  execSync(
    `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
    { stdio: "ignore" }
  );

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
    masterSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    defaultWebFile: defaultWebPath,
    operationId,
    qaFrames: [
      path.join(qaDir, `${sub.name}_start.png`),
      path.join(qaDir, `${sub.name}_mid.png`),
      path.join(qaDir, `${sub.name}_end.png`),
    ],
  };
}

async function main() {
  console.log("======================================================================");
  console.log("  Huda Bayan — Al-Baqarah Subchapters 5C-1 & 5C-2 Generator            ");
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
  console.log("            AL-BAQARAH 5C-1 & 5C-2 GENERATION COMPLETED               ");
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
    path.join(OUTPUT_DIR, "chapter-5c1-5c2-report.json"),
    JSON.stringify({ projectId: PROJECT_ID, location: LOCATION, subchapters: results }, null, 2)
  );
}

main().catch((err) => {
  console.error("❌ Chapter 5C-1/5C-2 Pipeline Error:", err);
  process.exit(1);
});
