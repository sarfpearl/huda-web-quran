import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const CHAPTER = {
  index: 4,
  name: "04-primordial-trust-and-repentance",
  verses: "30–39",
  theme: "Human Responsibility, The Primordial Garden, Repentance & Divine Forgiveness",
  model: "veo-3.1-fast-generate-001",
  resolution: "1080p",
  duration: 8,
  is4K: false,
  prompt: (
    "An ancient serene mountain terrace garden overlooking a vast misty wilderness at dawn. " +
    "Towering ancient olive and cedar trees with deep mossy textures surround a clear, pristine natural spring that gently cascades over weathered stone steps and flows outward into the open valleys below. " +
    "Soft volumetric morning mist rises from the lush vegetation, gently illuminated by warm golden sunbeams breaking through parting clouds. " +
    "Slow, contemplative camera glide following the crystal water stream as it journeys toward the peaceful horizon. " +
    "Deep atmospheric perspective, photorealistic 35mm film nature cinematography, gentle breeze moving leaves and mist. " +
    "No people, no faces, no angels, no religious figures, no architecture, no text, no logos."
  ),
};

async function main() {
  console.log("======================================================================");
  console.log(`🎬 [Al-Baqarah Chapter ${CHAPTER.index}/11: ${CHAPTER.name}] (Verses ${CHAPTER.verses})`);
  console.log(`Model:      ${CHAPTER.model} [Target: ${CHAPTER.resolution.toUpperCase()}]`);
  console.log(`Theme:      "${CHAPTER.theme}"`);
  console.log(`Duration:   ${CHAPTER.duration} seconds`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: CHAPTER.model,
    source: {
      prompt: CHAPTER.prompt,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: CHAPTER.duration,
      resolution: CHAPTER.resolution,
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
    throw new Error(`Generation failed for ${CHAPTER.name}: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned for ${CHAPTER.name}: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  const masterPath = path.join(OUTPUT_DIR, `${CHAPTER.name}-1080p-master.mp4`);
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
  console.log(`  • Duration:   ${Number(fmt.duration || CHAPTER.duration).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  // Fast 1080p Web encode
  const defaultWebPath = path.join(OUTPUT_DIR, `${CHAPTER.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  execSync(
    `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
    { stdio: "ignore" }
  );

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || CHAPTER.duration);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${CHAPTER.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${CHAPTER.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${CHAPTER.name}_end.png`)}"`, { stdio: "ignore" });

  console.log(`✓ QA frames extracted to: ${qaDir}`);
  console.log(`\n✅ Chapter 4 generated and encoded successfully!`);
}

main().catch((err) => {
  console.error("❌ Chapter 4 Pipeline Error:", err);
  process.exit(1);
});
