import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";

const REGENERATIONS = [
  {
    id: "08b",
    name: "08b-month-of-guidance-and-dawn-discipline",
    verses: "183–188",
    theme: "The Month of Ramadan in which the Qur’an was revealed as guidance for humanity (Hero 1 - Clean Full Frame)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary landscape cinematography shot capturing the physical arrival of true astronomical dawn over a high desert mountain plateau in Western Arabia. " +
      "The scene starts in natural starlit darkness over rugged mountain bedrock. " +
      "The point of view steadily ascends upward as a distinct, razor-sharp horizontal white band of true dawn light emerges cleanly across the dark horizon, separating the dark sky from the earth. " +
      "Natural morning illumination softly washes over the mountain ridges and silent desert valley below with authentic exposure. " +
      "Natural cool breeze moving sparse desert scrub in rock fissures. Natural rock erosion, authentic fading stars, subtle atmospheric mountain haze. " +
      "Completely clean, unobstructed, borderless edge-to-edge 16:9 full-screen frame. No black bars, no pillarboxing, no letterboxing, no borders, no artificial bloom, no fake rays. " +
      "No humans, no prayer mats, no mosques, no text, no logos."
    ),
  },
  {
    id: "08d",
    name: "08d-sacred-rites-arafat-and-sacred-monument",
    verses: "196–203",
    theme: "The Sacred Rites: Arafat, The Sacred Monument & Balanced Supplication (Hero 2 - Clean Full Frame)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A wide landscape documentary view gliding smoothly over the vast, authentic granite plain of Arafat in the Hijaz at late golden hour. " +
      "The point of view moves forward over open rocky desert terrain, capturing the natural geographic transition toward the rugged, sheltering rocky hills of the mountain pass. " +
      "Warm low-angle natural sunlight illuminates weathered granite boulders and rocky scree slopes, casting soft natural shadows across the valley floor under a quiet, vast evening sky. " +
      "Gentle desert wind carrying fine golden dust across the plain; sparse wild scrub. Authentic geological weathering, unpaved natural earth. " +
      "Completely clean, unobstructed, borderless edge-to-edge 16:9 full-screen frame. No camera equipment, no lens hood, no black corner artifacts, no vignetting, no black bars, no letterboxing. " +
      "No humans, no crowds, no modern pilgrim infrastructure, no tents, no roads, no text, no logos."
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
  };
}

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Regenerating [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   Clean Borderless Frame + Documentary Realism`);
  console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
  console.log(`======================================================================`);

  const masterPath = path.join(
    OUTPUT_DIR,
    sub.is4K ? `${sub.name}-4k-master.mp4` : `${sub.name}-1080p-master.mp4`
  );

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
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  for (const sub of REGENERATIONS) {
    await generateSubchapter(ai, sub);
  }
}

main().catch((err) => {
  console.error("❌ Regeneration Error:", err);
  process.exit(1);
});
