import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTERS = [
  {
    id: "05a",
    name: "05a-deliverance-and-water-from-granite",
    verses: "40–60",
    theme: "Covenant, Remembrance, Deliverance & The Emergence of Water in the Desert",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A monumental desert canyon with towering red sandstone and weathered granite cliffs under crisp morning light. " +
      "Clear, pristine spring water forcefully surges from a deep natural rock crevice, streaming rapidly across the arid stony canyon floor and forming a life-giving clear river. " +
      "Fine atmospheric dust motes float through volumetric sunbeams cutting between the narrow canyon walls. " +
      "Slow, steady forward camera travel following the swift, sparkling water current as it flows through the dry canyon. " +
      "Photorealistic 35mm nature cinematography, realistic water ripples, reflections, and wind blowing sparse desert vegetation. " +
      "No people, no faces, no religious figures, no architecture, no text, no logos."
    ),
  },
  {
    id: "05b",
    name: "05b-parable-of-the-living-stone",
    verses: "61–74",
    theme: "The Parable of Stone That Softens, Splits & Yields Living Water (Hero Scene)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "Massive ancient weathered stone formations in a towering natural mountain canyon. " +
      "The camera slowly approaches a monumental dark granite rock face with deep organic geological textures. " +
      "Natural fissures in the solid stone reveal clear, pure water emerging from deep within the rock, cascading down the cliff face in graceful natural waterfalls into the peaceful valley below. " +
      "Dramatic clouds drift overhead as warm volumetric sunlight breaks through the canyon rim, illuminating glistening wet rock and mist. " +
      "Slow, reverent forward push. Supreme cinematic depth, photorealistic geological textures, natural water physics, and dignified spiritual atmosphere. " +
      "No people, no faces, no hearts, no angels, no fantasy effects, no text, no logos."
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
  const masterPath = path.join(
    OUTPUT_DIR,
    sub.is4K ? `${sub.name}-4k-master.mp4` : `${sub.name}-1080p-master.mp4`
  );

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
  console.log("  HuDa Web Quran — Al-Baqarah Subchapters 5A & 5B Generator               ");
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
  console.log("            AL-BAQARAH 5A & 5B GENERATION COMPLETED                   ");
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
    path.join(OUTPUT_DIR, "chapter-5ab-report.json"),
    JSON.stringify({ projectId: PROJECT_ID, location: LOCATION, subchapters: results }, null, 2)
  );
}

main().catch((err) => {
  console.error("❌ Chapter 5AB Pipeline Error:", err);
  process.exit(1);
});
