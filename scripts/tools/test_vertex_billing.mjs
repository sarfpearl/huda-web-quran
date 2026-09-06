import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_FILE = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/vertex-pilot/veo-billing-reconnect-test.mp4";

async function main() {
  console.log("======================================================================");
  console.log("  Vertex AI Minimal Connectivity & Billing Test                      ");
  console.log("======================================================================");
  console.log(`Project:  ${PROJECT_ID}`);
  console.log(`Location: ${LOCATION}`);
  console.log(`Model:    veo-3.1-fast-generate-001 (1080p, 8s)`);
  console.log("======================================================================");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const prompt = (
    "A peaceful pristine mountain lake at sunrise, gentle water ripples reflecting soft golden light, " +
    "distant misty pine trees, photorealistic 35mm nature cinematography, no people, no text, no logos."
  );

  console.log("Submitting test generation request to Vertex AI...");
  let operation;
  try {
    operation = await ai.models.generateVideos({
      model: "veo-3.1-fast-generate-001",
      source: { prompt },
      config: {
        aspectRatio: "16:9",
        durationSeconds: 8,
        resolution: "1080p",
      },
    });
  } catch (err) {
    console.error("❌ Submission Failed with Error:");
    console.error(err);
    process.exit(1);
  }

  const operationId = operation.name;
  console.log(`✓ Operation Created: ${operationId}`);
  console.log("Polling rendering progress...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
  }

  if (operation.error) {
    console.error("❌ Operation failed:", JSON.stringify(operation.error, null, 2));
    process.exit(1);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    console.error("❌ No video bytes returned:", JSON.stringify(response));
    process.exit(1);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, buffer);
  console.log(`✓ Test video saved to: ${OUTPUT_FILE} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${OUTPUT_FILE}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const fmt = probe.format || {};

  console.log("\n======================================================================");
  console.log("                 TEST COMPLETED SUCCESSFULLY                          ");
  console.log("======================================================================");
  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${Number(fmt.duration || 8).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • File Size:  ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  • Op ID:      ${operationId}`);
}

main().catch((err) => {
  console.error("❌ Test Script Error:", err);
  process.exit(1);
});
