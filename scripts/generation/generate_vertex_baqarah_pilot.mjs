import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const PILOT_CHAPTERS = [
  {
    index: 1,
    name: "01-the-book-of-guidance",
    verses: "1–5",
    theme: "The Book of Guidance & The God-Conscious Believers",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A vast ancient desert plateau slowly emerging from deep pre-dawn indigo darkness into crystal morning light. " +
      "A single clearly defined bedrock stone pathway cuts straight through soft undulating dunes, leading directly toward the sharp horizon. " +
      "Foreground features dew-laden desert shrubs and sharp stone textures; midground features wind-swept sand ridges; background shows grand distant mountains. " +
      "Slow, steady forward dolly tracking shot along the center of the solid path. Lighting evolves from cool starlight to a serene, crisp dawn glow. " +
      "Atmosphere of absolute certainty, quiet conviction, and profound guidance. Photorealistic 35mm film nature cinematography, subtle sand drift in breeze. " +
      "No people, no faces, no religious figures, no architecture, no text, no logos."
    ),
  },
  {
    index: 2,
    name: "02-storm-and-illumination",
    verses: "6–20",
    theme: "The Parable of the Sudden Storm, Heavy Rain, Darkness & Lightning",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A dramatic and solemn mountain plateau beneath a colossal, churning dark thunderstorm canopy. " +
      "Intense sheets of realistic rain lash against rugged dark stone formations and desert canyons. " +
      "Sudden natural branches of lightning illuminate the landscape with brilliant silver flashes, casting deep fleeting shadows before returning to heavy gloom. " +
      "Slow deliberate camera push forward through the atmospheric downpour. High dynamic range cinematography with reflective wet rocks and falling rain droplets. " +
      "Atmosphere of immense tension, awe, and cautionary solemnity. True environmental depth with swirling storm clouds and wind-blown vegetation. " +
      "No people, no faces, no angels, no fire, no architecture, no text, no logos."
    ),
  },
  {
    index: 3,
    name: "03-signs-in-earth-and-sky",
    verses: "21–29",
    theme: "Universal Signs — The Rain from Above Bringing Life to the Fertile Earth",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "The thunderstorm disperses into a luminous golden afternoon as gentle rain continues to fall onto fertile red-brown mountain soil. " +
      "Fresh green shoots and olive trees emerge from the soaked earth as crystal-clear rainwater flows rapidly through natural stone channels. " +
      "Warm golden sunlight pierces the parting clouds, creating radiant volumetric rays and rainbow mist in the clean air. " +
      "Slow sweeping crane descent from the clearing sky down to glistening leaves and flowing water. " +
      "Atmosphere of profound gratitude, divine provision, life-giving mercy, and natural harmony. Photorealistic nature documentary aesthetic. " +
      "No people, no faces, no religious figures, no buildings, no text, no logos."
    ),
  },
];

async function generateChapter(ai, chapter) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Al-Baqarah Chapter ${chapter.index}/11: ${chapter.name}] (Verses ${chapter.verses})`);
  console.log(`Model:      ${chapter.model} [Target: ${chapter.resolution.toUpperCase()}]`);
  console.log(`Theme:      "${chapter.theme}"`);
  console.log(`Duration:   ${chapter.duration} seconds`);
  console.log(`======================================================================`);

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: chapter.model,
    source: {
      prompt: chapter.prompt,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: chapter.duration,
      resolution: chapter.resolution,
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
    throw new Error(`Generation failed for ${chapter.name}: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned for ${chapter.name}: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  const masterPath = path.join(
    OUTPUT_DIR,
    chapter.is4K ? `${chapter.name}-4k-master.mp4` : `${chapter.name}-1080p-master.mp4`
  );

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
  console.log(`  • Duration:   ${Number(fmt.duration || chapter.duration).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  // Delivery Pipeline Encodes
  console.log("3. Creating optimized delivery versions with FFmpeg...");

  const defaultWebPath = path.join(OUTPUT_DIR, `${chapter.name}.mp4`);
  if (chapter.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${chapter.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${chapter.name}-1080p.mp4`);

    // Web 4K (H.264 CRF 20, faststart)
    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -c:a aac -b:a 192k "${web4KPath}"`,
      { stdio: "ignore" }
    );
    // Web 1080p Fallback (Scale to 1920x1080)
    execSync(
      `ffmpeg -y -i "${masterPath}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${fallback1080Path}"`,
      { stdio: "ignore" }
    );
    // Copy 1080p to default web path for standard devices
    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    // Fast 1080p Web encode
    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
      { stdio: "ignore" }
    );
  }

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || chapter.duration);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${chapter.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${chapter.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${chapter.name}_end.png`)}"`, { stdio: "ignore" });

  return {
    chapter: chapter.name,
    index: chapter.index,
    verses: chapter.verses,
    theme: chapter.theme,
    model: chapter.model,
    targetResolution: chapter.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: Number(fmt.duration || chapter.duration).toFixed(2),
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    masterFile: masterPath,
    masterSizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    defaultWebFile: defaultWebPath,
    operationId,
    qaFrames: [
      path.join(qaDir, `${chapter.name}_start.png`),
      path.join(qaDir, `${chapter.name}_mid.png`),
      path.join(qaDir, `${chapter.name}_end.png`),
    ],
  };
}

async function main() {
  console.log("======================================================================");
  console.log("  HuDa Web Quran — Al-Baqarah Hybrid 4K / 1080p Pilot (Chapters 1–3)      ");
  console.log("======================================================================");
  console.log(`Google Cloud Project: ${PROJECT_ID}`);
  console.log(`Location:             ${LOCATION}`);
  console.log(`Authentication:       Application Default Credentials (ADC)`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const results = [];
  for (const chapter of PILOT_CHAPTERS) {
    const res = await generateChapter(ai, chapter);
    results.push(res);
  }

  console.log("\n======================================================================");
  console.log("            AL-BAQARAH PILOT HYBRID PRODUCTION REPORT                 ");
  console.log("======================================================================");
  results.forEach((r) => {
    console.log(`\nChapter ${r.index}: ${r.chapter} (Verses ${r.verses})`);
    console.log(`  • Model:             ${r.model}`);
    console.log(`  • Target vs Native:  ${r.targetResolution.toUpperCase()} → ${r.nativeResolution}`);
    console.log(`  • Duration:          ${r.duration}s @ ${r.fps}`);
    console.log(`  • Codec:             ${r.codec}`);
    console.log(`  • Master Size:       ${r.masterSizeMB} MB`);
    console.log(`  • Operation ID:      ${r.operationId}`);
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "baqarah-pilot-report.json"),
    JSON.stringify({ projectId: PROJECT_ID, location: LOCATION, chapters: results }, null, 2)
  );

  console.log("\n✅ Chapters 1–3 hybrid generation and delivery pipeline finished successfully!");
}

main().catch((err) => {
  console.error("❌ Pilot Pipeline Error:", err);
  process.exit(1);
});
