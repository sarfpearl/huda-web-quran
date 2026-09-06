import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTER = {
  id: "05c1",
  name: "05c1-the-fragmented-markings-and-transient-dust",
  verses: "75–86",
  theme: "Human Alteration, Fragility of Mortal Markings & The Transient Dust (Regenerated - Clean Borderless)",
  model: "veo-3.1-fast-generate-001",
  resolution: "1080p",
  duration: 8,
  prompt: (
    "An ancient weathered limestone outcrop in a vast barren arid desert landscape. " +
    "Low-angle macro-to-medium continuous cinematic dolly glide along the textured rock surface. " +
    "Faint, non-readable linear geometric tool grooves and indentations on the rough stone face are shown being continuously obscured and eroded as fine desert sand drifts across them in the wind. " +
    "The underlying limestone bedrock remains physically solid while the superficial marks appear fragile and impermanent. " +
    "Late-afternoon golden desert sunlight casts sharp diagonal shadows across the rock crevices. " +
    "Camera gently widens at the end revealing the solitary stone embedded within an expansive dusty desert horizon. " +
    "Clean full-frame borderless cinematic nature photography, physical wind dynamics, fine drifting sand particles. " +
    "No people, no faces, no readable text, no Arabic writing, no scripture, no books, no scrolls, no artifacts, no architecture, no film slates, no borders, no text overlays, no logos."
  ),
};

async function main() {
  console.log("======================================================================");
  console.log(`🎬 Regenerating [Al-Baqarah Subchapter 5C-1: ${SUBCHAPTER.name}] (Verses ${SUBCHAPTER.verses})`);
  console.log(`Model:      ${SUBCHAPTER.model} [Target: ${SUBCHAPTER.resolution.toUpperCase()}]`);
  console.log("======================================================================");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: SUBCHAPTER.model,
    source: { prompt: SUBCHAPTER.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: SUBCHAPTER.duration,
      resolution: SUBCHAPTER.resolution,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Operation Created: ${operationId}`);
  console.log("2. Polling rendering progress...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
  }

  if (operation.error) {
    throw new Error(`Generation failed: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  const masterPath = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}-1080p-master.mp4`);
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
  console.log(`  • Duration:   ${Number(fmt.duration || 8).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  // Delivery Web Encode
  const defaultWebPath = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  execSync(
    `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
    { stdio: "ignore" }
  );

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || 8);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${SUBCHAPTER.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${SUBCHAPTER.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${SUBCHAPTER.name}_end.png`)}"`, { stdio: "ignore" });

  console.log("✓ New QA frames extracted.");
  console.log("✅ 5C-1 regeneration complete!");
}

main().catch((err) => {
  console.error("❌ 5C-1 Regeneration Error:", err);
  process.exit(1);
});
