import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const MODEL_NAME = "veo-3.1-fast-generate-001";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/vertex-pilot";
const OUTPUT_FILE = path.join(OUTPUT_DIR, "veo-test-001.mp4");

const PROMPT = (
  "A premium cinematic natural landscape before sunrise. Vast detailed mountain valley with realistic rock textures in the foreground, " +
  "a clear flowing stream, delicate morning mist drifting naturally through the valley, subtle grass movement in the wind, " +
  "layered mountains fading into atmospheric distance, soft golden sunlight gradually appearing behind the mountain ridge, " +
  "physically believable volumetric light, natural color science, high dynamic range cinematic photography, " +
  "slow controlled forward camera movement, realistic environmental motion, deeply immersive and peaceful, " +
  "no people, no faces, no prophets, no angels, no religious figures, no text, no logos, no watermark, no generic mosque, no abstract gradient, no fantasy aesthetic."
);

async function main() {
  console.log("======================================================================");
  console.log("  Huda Bayan — Vertex AI Veo 3.1 Fast Production Validation Test      ");
  console.log("======================================================================");
  console.log(`Google Cloud Project: ${PROJECT_ID}`);
  console.log(`Region / Location:    ${LOCATION}`);
  console.log(`Vertex AI Model:      ${MODEL_NAME}`);
  console.log(`Duration:             8 seconds`);
  console.log(`Aspect Ratio:         16:9`);
  console.log(`Authentication:       Application Default Credentials (ADC)`);
  console.log(`Output File:          ${OUTPUT_FILE}`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  console.log("\n1. Submitting video generation request to Vertex AI Veo...");
  console.log(`Prompt: "${PROMPT}"`);

  let operation = await ai.models.generateVideos({
    model: MODEL_NAME,
    source: {
      prompt: PROMPT,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: 8,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log("2. Polling Vertex AI video rendering status...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
  }

  if (operation.error) {
    console.error("❌ Vertex AI Operation failed with error:", JSON.stringify(operation.error, null, 2));
    process.exit(1);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const downloadUri = videoObj?.uri || videoObj?.videoUri;

  console.log(`✓ Vertex AI Video Generation Complete!`);
  console.log(`Video Resource URI / Cloud URI: ${downloadUri}`);

  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;
  if (rawBytes) {
    console.log("Saving video from base64 encoded videoBytes payload...");
    const buffer = Buffer.from(rawBytes, "base64");
    fs.writeFileSync(OUTPUT_FILE, buffer);
  } else if (downloadUri) {
    console.log(`Downloading video asset from Vertex AI storage: ${downloadUri}...`);
    // When using vertexai: true, download with ADC authorization
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = tokenResponse.token;

    let res = await fetch(downloadUri, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      // If direct fetch didn't need auth or gave error, try standard fetch
      res = await fetch(downloadUri);
    }

    if (!res.ok) {
      throw new Error(`Failed to download Vertex AI video: HTTP ${res.status} ${res.statusText}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(OUTPUT_FILE, buffer);
  } else {
    throw new Error(`No video payload found in Vertex AI response: ${JSON.stringify(response)}`);
  }

  const stats = fs.statSync(OUTPUT_FILE);
  console.log(`✓ MP4 saved successfully: ${OUTPUT_FILE} (${stats.size} bytes / ${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  // Run ffprobe
  console.log("\n3. Running ffprobe inspection...");
  const probeRaw = execSync(`ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${OUTPUT_FILE}"`, { encoding: "utf8" });
  const probe = JSON.parse(probeRaw);
  console.log("ffprobe result:", JSON.stringify(probe, null, 2));

  // Extract 3 representative frames for QA
  console.log("\n4. Extracting representative frames for Visual QA...");
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(probe.format?.duration || 8);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${OUTPUT_FILE}" -vframes 1 "${path.join(qaDir, "frame_start.png")}"`);
  execSync(`ffmpeg -y -ss ${tMid} -i "${OUTPUT_FILE}" -vframes 1 "${path.join(qaDir, "frame_mid.png")}"`);
  execSync(`ffmpeg -y -ss ${tEnd} -i "${OUTPUT_FILE}" -vframes 1 "${path.join(qaDir, "frame_end.png")}"`);

  console.log(`✓ Frames extracted to: ${qaDir}`);

  // Write verification report JSON
  const report = {
    projectId: PROJECT_ID,
    location: LOCATION,
    model: MODEL_NAME,
    operationId,
    downloadUri,
    file: OUTPUT_FILE,
    fileSizeBytes: stats.size,
    fileSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    probe,
    prompt: PROMPT,
    qaFrames: [
      path.join(qaDir, "frame_start.png"),
      path.join(qaDir, "frame_mid.png"),
      path.join(qaDir, "frame_end.png"),
    ],
  };

  fs.writeFileSync(path.join(OUTPUT_DIR, "vertex-test-report.json"), JSON.stringify(report, null, 2));
  console.log("\n✅ Vertex AI Veo 3.1 Fast Pilot Generation completed successfully!");
}

main().catch((err) => {
  console.error("❌ Vertex AI Veo Pilot Error:", err);
  process.exit(1);
});
