import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";

const BASE_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran";
const PUBLIC_JUZ_DIR = path.join(BASE_DIR, "public/videos/juz");
const QA_DIR = path.join(PUBLIC_JUZ_DIR, "qa_frames");
const MASTER_DIR = path.join(BASE_DIR, "assets/video-masters/juz/master");
const REPORTS_DIR = path.join(BASE_DIR, "assets/video-masters/juz/reports");

// Ensure directories exist
fs.mkdirSync(PUBLIC_JUZ_DIR, { recursive: true });
fs.mkdirSync(QA_DIR, { recursive: true });
fs.mkdirSync(MASTER_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });

const FFMPEG = fs.existsSync("/opt/homebrew/bin/ffmpeg") ? "/opt/homebrew/bin/ffmpeg" : "ffmpeg";
const FFPROBE = fs.existsSync("/opt/homebrew/bin/ffprobe") ? "/opt/homebrew/bin/ffprobe" : "ffprobe";

const JUZ_01_V2_CONFIG = {
  juzNumber: 1,
  id: "juz-01-v2",
  title: "Juz 1: The Quranic Journey — Guidance, Choice, Stewardship & Foundations",
  theme: "The Path of Guidance, Natural Fork, Ancient Stewardship & Primordial Hijazi Foundations (Surah Al-Fatihah & Al-Baqarah 1–141)",
  model: "veo-3.1-generate-001",
  resolution: "4k",
  duration: 8,
  prompt: (
    "A majestic, authentic 65mm documentary landscape cinematography continuous tracking shot through an ancient Western Arabian Hijazi valley at early dawn. " +
    "The camera moves forward with slow, weighted, continuous linear dolly inertia along a clearly defined ancient worn stone pathway. " +
    "The path begins in soft pre-dawn twilight bordered by subtle evidence of ancient stewardship: weathered dry-stone boundary terraces, an ancient stone irrigation channel, and a modest grove of hardy native date palms and sparse desert shrubs rooted in dark wadi silt. " +
    "As natural directional morning sunlight breaks across rugged dark granite peaks, the path reaches a believable natural fork in the terrain: one route diverges into a parched, loose scree slope obscured by drifting dust, while the primary firm stone road continues steadily forward, bathed in clear morning light. " +
    "The path leads toward an authentic stark rocky mountain basin where simple ancient dry-laid stone foundation courses and weathered stone monoliths stand in solemn permanence against the luminous dawn horizon. " +
    "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy structures, no modern elements."
  ),
};

async function generateJuzVideoWithRetry(ai, config, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n======================================================================`);
    console.log(`🎬 Generating Candidate [${config.id.toUpperCase()}: ${config.title}] [Attempt ${attempt}/${maxRetries}]`);
    console.log(`Model:       ${config.model} [Target: ${config.resolution.toUpperCase()}]`);
    console.log(`Theme:       ${config.theme}`);
    console.log(`Standard:    Clean Borderless Frame + Documentary Realism + Meaning-First`);
    console.log(`Duration:    ${config.duration} seconds @ 24 fps`);
    console.log(`======================================================================`);

    try {
      console.log("1. Submitting generation request to Vertex AI...");
      let operation = await ai.models.generateVideos({
        model: config.model,
        source: { prompt: config.prompt },
        config: {
          aspectRatio: "16:9",
          durationSeconds: config.duration,
          resolution: config.resolution,
        },
      });

      const operationId = operation.name;
      console.log(`✓ Vertex AI Operation Created: ${operationId}`);
      console.log(`2. Polling rendering progress (Native 4K Veo 3.1)...`);

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
        throw new Error(`Generation failed for ${config.id}: ${JSON.stringify(operation.error, null, 2)}`);
      }

      const response = operation.response;
      const videoObj = response?.generatedVideos?.[0]?.video;
      const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

      if (!rawBytes) {
        throw new Error(`No video bytes returned for ${config.id}: ${JSON.stringify(response)}`);
      }

      const rawMasterPath = path.join(MASTER_DIR, `${config.id}-4k-raw-master.mp4`);
      const buffer = Buffer.from(rawBytes, "base64");
      fs.writeFileSync(rawMasterPath, buffer);
      console.log(`✓ Raw 4K Master saved: ${rawMasterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

      return { rawMasterPath, operationId };
    } catch (err) {
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log("Waiting 10s before retry...");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

function processAndEncode(config, rawMasterPath, operationId) {
  const probeRaw = execSync(
    `"${FFPROBE}" -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || config.duration);

  console.log(`\nTechnical Analysis of Raw Stream:`);
  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);

  const candidateWebPath = path.join(PUBLIC_JUZ_DIR, `${config.id}.mp4`);
  const master4KPath = path.join(MASTER_DIR, `${config.id}-4k.mp4`);
  const overlap = 0.6;
  const cutPoint = (totalDuration - overlap).toFixed(3);

  console.log(`\n3. Encoding seamless loop with subtle ${overlap}s crossfade seam...`);

  // 4K Master encode
  const filterGraph4K = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `"${FFMPEG}" -y -i "${rawMasterPath}" -filter_complex "${filterGraph4K}" -map "[outv]" -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -an "${master4KPath}"`,
    { stdio: "ignore" }
  );
  console.log(`✓ 4K Master Encoded: ${master4KPath}`);

  // High-bitrate 1080p web delivery candidate
  const filterGraph1080p = `[0:v]scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `"${FFMPEG}" -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an "${candidateWebPath}"`,
    { stdio: "ignore" }
  );
  console.log(`✓ Web Candidate Encoded: ${candidateWebPath}`);

  // Extract QA frames: 0s, 2s, 4s, 6s, 8s (final)
  console.log("\n4. Extracting QA verification frames (0s, 2s, 4s, 6s, 8s)...");
  execSync(`"${FFMPEG}" -y -ss 0.0 -i "${candidateWebPath}" -vframes 1 "${path.join(QA_DIR, `${config.id}_0s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 2.0 -i "${candidateWebPath}" -vframes 1 "${path.join(QA_DIR, `${config.id}_2s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 4.0 -i "${candidateWebPath}" -vframes 1 "${path.join(QA_DIR, `${config.id}_4s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 6.0 -i "${candidateWebPath}" -vframes 1 "${path.join(QA_DIR, `${config.id}_6s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -sseof -0.05 -i "${candidateWebPath}" -vframes 1 "${path.join(QA_DIR, `${config.id}_final.png`)}"`, { stdio: "ignore" });
  console.log(`✓ QA frames extracted to: ${QA_DIR}`);

  // Generate 3x continuous loop verification video
  console.log("\n5. Generating 3x continuous loop test file...");
  const loop3xPath = path.join(QA_DIR, `${config.id}_loop_3x_test.mp4`);
  execSync(`"${FFMPEG}" -y -stream_loop 2 -i "${candidateWebPath}" -c copy "${loop3xPath}"`, { stdio: "ignore" });
  console.log(`✓ Loop 3x verification video created: ${loop3xPath}`);

  const rawStats = fs.statSync(rawMasterPath);
  const masterStats = fs.statSync(master4KPath);
  const webStats = fs.statSync(candidateWebPath);
  const loopStats = fs.statSync(loop3xPath);

  const resultData = {
    id: config.id,
    title: config.title,
    theme: config.theme,
    model: config.model,
    targetResolution: config.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: "8.00s",
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    rawMasterFile: rawMasterPath,
    rawMasterSizeMB: (rawStats.size / 1024 / 1024).toFixed(2),
    master4KFile: master4KPath,
    master4KSizeMB: (masterStats.size / 1024 / 1024).toFixed(2),
    webFile: candidateWebPath,
    webSizeMB: (webStats.size / 1024 / 1024).toFixed(2),
    loop3xFile: loop3xPath,
    loop3xSizeMB: (loopStats.size / 1024 / 1024).toFixed(2),
    operationId: operationId,
    qaFrames: [
      path.join(QA_DIR, `${config.id}_0s.png`),
      path.join(QA_DIR, `${config.id}_2s.png`),
      path.join(QA_DIR, `${config.id}_4s.png`),
      path.join(QA_DIR, `${config.id}_6s.png`),
      path.join(QA_DIR, `${config.id}_final.png`),
    ],
  };

  const reportPath = path.join(REPORTS_DIR, `${config.id}-report.json`);
  fs.writeFileSync(reportPath, JSON.stringify(resultData, null, 2));
  console.log(`✓ Comprehensive report saved to: ${reportPath}`);

  return resultData;
}

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const { rawMasterPath, operationId } = await generateJuzVideoWithRetry(ai, JUZ_01_V2_CONFIG, 3);
  const result = processAndEncode(JUZ_01_V2_CONFIG, rawMasterPath, operationId);

  console.log(`\n======================================================================`);
  console.log(`🎉 JUZ 1 V2 GENERATION COMPLETE`);
  console.log(`Operation ID:   ${result.operationId}`);
  console.log(`Web Video Path: ${result.webFile} (${result.webSizeMB} MB)`);
  console.log(`Master 4K:      ${result.master4KFile} (${result.master4KSizeMB} MB)`);
  console.log(`Native Spec:    ${result.nativeResolution} @ ${result.fps} fps (${result.codec})`);
  console.log(`======================================================================\n`);
}

main().catch((err) => {
  console.error("❌ Juz 1 V2 Generation Fatal Error:", err);
  process.exit(1);
});
