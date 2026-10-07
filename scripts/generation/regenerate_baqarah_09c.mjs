import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";

const REGENERATION = {
  id: "09c",
  name: "09c-the-sovereign-horizon-and-irresistible-dawn",
  verses: "258 (ONLY)",
  theme: "The Sovereign Horizon & The Irresistible Dawn (Clean Full Frame - No HUD)",
  model: "veo-3.1-fast-generate-001",
  resolution: "1080p",
  duration: 8,
  is4K: false,
  prompt: (
    "A documentary landscape view looking directly toward the eastern desert horizon in Western Arabia as the morning sun crests over distant layered mountain ridges. " +
    "Natural low-angle sunlight with authentic exposure and soft atmospheric haze. " +
    "The morning sun illuminates wide desert sand dunes and textured bedrock with natural long shadows and subtle thermal air shimmer. " +
    "The camera glides gently forward over the desert rock, observing the sun rising steadily in the clear sky. " +
    "Completely clean, unobstructed, borderless edge-to-edge full frame. No black bars, no letterboxing, no pillarboxing. " +
    "No viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No lens flare overlays, no artificial rays, no humans, no kings, no thrones."
  ),
};

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

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const sub = REGENERATION;
  console.log(`\n======================================================================`);
  console.log(`🎬 Regenerating [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   Clean Borderless Frame + Zero HUD/Graphics`);
  console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
  console.log(`======================================================================`);

  const masterPath = path.join(OUTPUT_DIR, `${sub.name}-1080p-master.mp4`);

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
  console.log(`2. Polling rendering progress (1080p Fast)...`);

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

  const res = probeAndEncode(sub, masterPath, operationId);
  const summaryPath = path.join(OUTPUT_DIR, "chapter_9_generation_results_09c_regen.json");
  fs.writeFileSync(summaryPath, JSON.stringify(res, null, 2));
  console.log(`\n🎉 Regeneration complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Regeneration Error:", err);
  process.exit(1);
});
