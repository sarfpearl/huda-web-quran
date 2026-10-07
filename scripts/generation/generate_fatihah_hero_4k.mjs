import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah";
const QA_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/qa_fatihah_hero";

fs.mkdirSync(QA_DIR, { recursive: true });

const CONFIG = {
  name: "001-al-fatihah",
  model: "veo-3.1-generate-001",
  resolution: "4k",
  duration: 8,
  prompt: (
    "A majestic, serene natural landscape view steadily moving forward at 1.8 meters height with slow, continuous physical travel through an ancient untouched mountain valley in Western Arabia at tranquil early dawn. " +
    "Foreground features weathered granite boulders, fine river gravel, sparse native desert grasses swaying gently in a cool mountain breeze, and subtle traces of dawn moisture. " +
    "A clear, shallow natural freshwater stream winds naturally through the midground over smooth irregular stones with soft ripples reflecting the gentle ambient sky. " +
    "Grand, rugged layered mountain ridges fade into soft atmospheric morning haze in the background beneath a serene sky as the earliest subtle warm dawn light delicately touches the highest peaks. " +
    "Soft pre-dawn indigo and cool blue tones harmoniously transition into delicate pale golden light at the distant horizon with authentic atmospheric scattering and realistic color temperature. " +
    "The point of view glides with perfectly stable horizon, natural physical weight, and subtle organic parallax across the peaceful, expansive valley. " +
    "Completely clean, unobstructed, borderless edge-to-edge full frame. No film frame, no film border, no film slate, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No humans, no faces, no religious figures, no architecture, no mosques, no artificial god rays, no neon colors, no excessive bloom, no hyper-HDR, no fantasy glowing water, no sudden light changes, no camera cuts."
  ),
};

async function generateWithRetry(ai, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n--- Attempt ${attempt} of ${maxRetries} ---`);
    try {
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
      console.log("2. Polling rendering progress (Native 4K)...");

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

      return { rawBytes, operationId };
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log("Waiting 10s before retry...");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

async function main() {
  console.log("======================================================================");
  console.log("🎬 Generating Surah 001 Al-Fatihah Hero 4K (Clean Borderless Full Frame)");
  console.log(`Model:      ${CONFIG.model}`);
  console.log(`Resolution: ${CONFIG.resolution.toUpperCase()} (3840x2160 Native)`);
  console.log(`Duration:   ${CONFIG.duration} seconds @ 24 fps`);
  console.log("======================================================================");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const rawMasterPath = path.join(OUTPUT_DIR, `${CONFIG.name}-4k-raw-master.mp4`);
  const final4KPath = path.join(OUTPUT_DIR, `${CONFIG.name}-4k.mp4`);
  const finalWebPath = path.join(OUTPUT_DIR, `${CONFIG.name}.mp4`);

  const { rawBytes, operationId } = await generateWithRetry(ai, 3);

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(rawMasterPath, buffer);
  console.log(`✓ Raw 4K Master saved: ${rawMasterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

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

  const filterGraph4K = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;

  console.log("  • Encoding 4K Master Loop...");
  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph4K}" -map "[outv]" -c:v libx264 -preset medium -crf 20 -movflags +faststart -an "${final4KPath}"`,
    { stdio: "ignore" }
  );

  console.log("  • Encoding 1080p Standard Web Delivery Loop...");
  const filterGraph1080p = `[0:v]scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -preset medium -crf 21 -movflags +faststart -an "${finalWebPath}"`,
    { stdio: "ignore" }
  );

  console.log(`✓ Seamless 4K Loop encoded:   ${final4KPath}`);
  console.log(`✓ Seamless Web Loop encoded:  ${finalWebPath}`);

  console.log("4. Extracting QA frames for visual verification...");
  execSync(`ffmpeg -y -ss 0.0 -i "${finalWebPath}" -vframes 1 "${path.join(QA_DIR, "frame_0s_start.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 2.0 -i "${finalWebPath}" -vframes 1 "${path.join(QA_DIR, "frame_2s.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 4.0 -i "${finalWebPath}" -vframes 1 "${path.join(QA_DIR, "frame_4s_mid.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 6.0 -i "${finalWebPath}" -vframes 1 "${path.join(QA_DIR, "frame_6s.png")}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -sseof -0.05 -i "${finalWebPath}" -vframes 1 "${path.join(QA_DIR, "frame_8s_end.png")}"`, { stdio: "ignore" });

  console.log("5. Generating 3x continuous loop playback verification file...");
  const loop3xPath = path.join(QA_DIR, "loop_3x_playback_test.mp4");
  execSync(`ffmpeg -y -stream_loop 2 -i "${finalWebPath}" -c copy "${loop3xPath}"`, { stdio: "ignore" });

  const stats4K = fs.statSync(final4KPath);
  const statsWeb = fs.statSync(finalWebPath);

  const report = {
    name: CONFIG.name,
    model: CONFIG.model,
    resolution: "3840x2160 (Native 4K)",
    duration: "8.00s",
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    size4KMB: (stats4K.size / 1024 / 1024).toFixed(2),
    sizeWebMB: (statsWeb.size / 1024 / 1024).toFixed(2),
    operationId: operationId,
  };

  fs.writeFileSync(path.join(QA_DIR, "fatihah_hero_qa_report.json"), JSON.stringify(report, null, 2));
  console.log("✓ Hero 4K regeneration and QA extraction complete!");
}

main().catch((err) => {
  console.error("❌ Generation Error:", err);
  process.exit(1);
});
