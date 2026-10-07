import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah";
const QA_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/qa_fatihah";

fs.mkdirSync(QA_DIR, { recursive: true });

const CONFIG = {
  name: "001-al-fatihah",
  model: "veo-3.1-generate-001",
  resolution: "1080p",
  duration: 8,
  prompt: (
    "A documentary nature cinematography tracking shot moving steadily forward at 1.5 meters height through an expansive, serene mountain valley in Western Arabia in early morning. " +
    "A clear natural stone pathway extends straight ahead between weathered bedrock and gentle desert grass swaying in a continuous light breeze. " +
    "Soft, diffused, consistent morning daylight with gentle atmospheric mist drifting slowly across distant layered mountain ridges. " +
    "Perfectly stable horizon, unwavering forward camera movement, and uniform, continuous natural ambient lighting from start to finish. " +
    "Completely clean, unobstructed, borderless edge-to-edge full frame. No black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No humans, no faces, no angels, no religious figures, no architecture, no sunburst explosions, no sudden light flares, no sudden weather changes, no camera cuts, no scene changes."
  ),
};

async function main() {
  console.log("======================================================================");
  console.log("🎬 Generating Loop-Safe Cinematic Background: Surah 001 (Al-Fatihah)");
  console.log(`Model:      ${CONFIG.model}`);
  console.log(`Resolution: ${CONFIG.resolution.toUpperCase()}`);
  console.log(`Duration:   ${CONFIG.duration} seconds @ 24 fps`);
  console.log("======================================================================");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const rawMasterPath = path.join(OUTPUT_DIR, `${CONFIG.name}-raw-master.mp4`);
  const seamlessWebPath = path.join(OUTPUT_DIR, `${CONFIG.name}.mp4`);

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: CONFIG.model,
    source: { prompt: CONFIG.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: CONFIG.duration,
      resolution: CONFIG.resolution,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log("2. Polling rendering progress...");

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
    throw new Error(`Generation failed: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(rawMasterPath, buffer);
  console.log(`✓ Raw Master saved: ${rawMasterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || CONFIG.duration);

  console.log(`  • Raw Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Raw Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS:      ${stream.codec_name} @ ${stream.r_frame_rate}`);

  const overlap = 0.6;
  const cutPoint = (totalDuration - overlap).toFixed(3);
  console.log(`3. Encoding seamless loop with ${overlap}s subtle overlap crossfade...`);

  const filterGraph = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;

  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph}" -map "[outv]" -c:v libx264 -preset medium -crf 20 -movflags +faststart -an "${seamlessWebPath}"`,
    { stdio: "inherit" }
  );

  console.log(`✓ Seamless Web Video encoded: ${seamlessWebPath}`);

  const loopProbeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate -of json "${seamlessWebPath}"`,
    { encoding: "utf8" }
  );
  const loopProbe = JSON.parse(loopProbeRaw);
  const loopDuration = Number(loopProbe.format?.duration || (totalDuration - overlap));

  console.log(`  • Looped Duration: ${loopDuration.toFixed(2)}s`);
  console.log("4. Extracting QA frames for visual loop verification...");

  execSync(`ffmpeg -y -ss 0.0 -i "${seamlessWebPath}" -vframes 1 "${path.join(QA_DIR, "loop_first_frame.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${(loopDuration / 2).toFixed(2)} -i "${seamlessWebPath}" -vframes 1 "${path.join(QA_DIR, "loop_mid_frame.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -sseof -0.05 -i "${seamlessWebPath}" -vframes 1 "${path.join(QA_DIR, "loop_last_frame.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${(loopDuration - 0.5).toFixed(2)} -i "${seamlessWebPath}" -vframes 1 "${path.join(QA_DIR, "loop_seam_approach.png")}"`, { stdio: "ignore" });

  const finalStats = fs.statSync(seamlessWebPath);
  console.log(`✓ Final Looped Size: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`✓ Operation ID: ${operationId}`);
}

main().catch((err) => {
  console.error("❌ Generation Error:", err);
  process.exit(1);
});
