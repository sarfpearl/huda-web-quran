import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTER = {
  id: "05c3",
  name: "05c3-universal-dominion-east-west-boundless-horizon",
  verses: "104–123",
  theme: "Universal Dominion: East, West & The Boundless Horizon (Hero Climax - Realism First)",
  model: "veo-3.1-generate-001",
  resolution: "4k",
  duration: 8,
  prompt: (
    "A documentary-grade aerial cinema shot of a rugged, natural limestone plateau in a high-desert landscape reminiscent of Sinai and the Levant. " +
    "Begins grounded near authentic weathered rock formations with natural fractures, loose stones, patchy dry soil, and sparse arid scrub. " +
    "A heavy professional cinema camera rig executes a smooth, gradual vertical aerial ascent while pulling back, exhibiting genuine physical inertia and realistic parallax across foreground rocks, midground valleys, and distant hills. " +
    "The landscape expands continuously into an immense, uninterrupted 360-degree natural horizon under authentic midday sunlight with physically accurate atmospheric perspective and natural haze. " +
    "Thin natural cirrus clouds drift slowly across a clear, natural sky. " +
    "Concludes on a majestic, balanced natural composition of vast earth and boundless open sky in profound stillness. " +
    "Strictly natural color science, neutral exposure, authentic physical lighting, borderless full-frame 8K nature cinematography. " +
    "No people, no faces, no figures, no thrones, no architecture, no Kaaba, no mosques, no monoliths, no text, no graphics, no artificial glow, no fantasy effects, no logos."
  ),
};

async function main() {
  console.log("======================================================================");
  console.log(`🎬 [Al-Baqarah Hero Subchapter 5C-3: ${SUBCHAPTER.name}] (Verses ${SUBCHAPTER.verses})`);
  console.log(`Model:      ${SUBCHAPTER.model} [Target: ${SUBCHAPTER.resolution.toUpperCase()}]`);
  console.log(`Standard:   "REALITY FIRST, BEAUTY SECOND" (Documentary-Cinema Realism)`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log("2. Polling 4K rendering progress...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
  }

  if (operation.error) {
    throw new Error(`Generation failed for ${SUBCHAPTER.name}: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned for ${SUBCHAPTER.name}: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  const masterPath = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}-4k-master.mp4`);
  fs.writeFileSync(masterPath, buffer);
  console.log(`✓ 4K Master saved: ${masterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

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

  // Delivery Web Encodes
  const web4KPath = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}-4k.mp4`);
  const fallback1080Path = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}-1080p.mp4`);
  const defaultWebPath = path.join(OUTPUT_DIR, `${SUBCHAPTER.name}.mp4`);

  console.log("3. Creating optimized delivery web encodes (4K & 1080p fallback)...");
  execSync(
    `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -c:a aac -b:a 192k "${web4KPath}"`,
    { stdio: "ignore" }
  );
  execSync(
    `ffmpeg -y -i "${masterPath}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${fallback1080Path}"`,
    { stdio: "ignore" }
  );
  fs.copyFileSync(fallback1080Path, defaultWebPath);

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

  console.log(`✓ QA frames extracted to: ${qaDir}`);
  console.log(`\n✅ Subchapter 5C-3 generated and encoded successfully!`);
}

main().catch((err) => {
  console.error("❌ Subchapter 5C-3 Error:", err);
  process.exit(1);
});
