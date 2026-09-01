import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

// 1. Resolve API Key from environment or ~/.env
let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!apiKey) {
  const envPaths = [
    path.join(process.env.HOME, ".env"),
    path.join(process.cwd(), ".env"),
    "/Users/pearl-9744/Claude/Projects/Huda Bayan/.env"
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      for (const line of content.split("\n")) {
        if (line.startsWith("GEMINI_API_KEY=") || line.startsWith("GOOGLE_API_KEY=")) {
          apiKey = line.split("=")[1].trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    }
  }
}

if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is missing from environment and ~/.env.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// ── The First 3 Chapters of Surah Al-Baqarah (Pilot Validation) ─────────────
const PILOT_CHAPTERS = [
  {
    index: 1,
    name: "01-the-book-of-guidance",
    verses: "1–5",
    theme: "The Book of Unquestionable Guidance & The God-Conscious Believers",
    prompt: (
      "A vast ancient desert plateau slowly emerging from deep pre-dawn indigo darkness into crystal morning light. " +
      "A single clearly defined bedrock stone pathway cuts straight through soft undulating dunes, leading directly toward the sharp horizon. " +
      "Foreground features dew-laden desert shrubs and sharp stone textures; midground features wind-swept sand ridges; background shows grand distant mountains. " +
      "Slow, steady forward dolly tracking shot along the center of the solid path. Lighting evolves from cool starlight to a serene, crisp dawn glow. " +
      "Atmosphere of absolute certainty, quiet conviction, and profound guidance. Photorealistic 35mm film nature cinematography, subtle sand drift in breeze. " +
      "No people, no faces, no religious figures, no architecture, no text, no logos."
    ),
    duration: 6,
  },
  {
    index: 2,
    name: "02-storm-and-illumination",
    verses: "6–20",
    theme: "The Parable of the Sudden Storm, Heavy Rain, Darkness & Lightning",
    prompt: (
      "A dramatic and solemn mountain plateau beneath a colossal, churning dark thunderstorm canopy. " +
      "Intense sheets of realistic rain lash against rugged dark stone formations and desert canyons. " +
      "Sudden natural branches of lightning illuminate the landscape with brilliant silver flashes, casting deep fleeting shadows before returning to heavy gloom. " +
      "Slow deliberate camera push forward through the atmospheric downpour. High dynamic range cinematography with reflective wet rocks and falling rain droplets. " +
      "Atmosphere of immense tension, awe, and cautionary solemnity. True environmental depth with swirling storm clouds and wind-blown vegetation. " +
      "No people, no faces, no angels, no fire, no architecture, no text, no logos."
    ),
    duration: 6,
  },
  {
    index: 3,
    name: "03-signs-in-earth-and-sky",
    verses: "21–29",
    theme: "Universal Signs — The Rain from Above Bringing Life to the Fertile Earth",
    prompt: (
      "The thunderstorm disperses into a luminous golden afternoon as gentle rain continues to fall onto fertile red-brown mountain soil. " +
      "Fresh green shoots and olive trees emerge from the soaked earth as crystal-clear rainwater flows rapidly through natural stone channels. " +
      "Warm golden sunlight pierces the parting clouds, creating radiant volumetric rays and rainbow mist in the clean air. " +
      "Slow sweeping crane descent from the clearing sky down to glistening leaves and flowing water. " +
      "Atmosphere of profound gratitude, divine provision, life-giving mercy, and natural harmony. Photorealistic nature documentary aesthetic. " +
      "No people, no faces, no religious figures, no buildings, no text, no logos."
    ),
    duration: 6,
  },
];

const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";
const MODEL_NAME = "models/veo-3.1-fast-generate-preview";

async function generateVeoClip(chapter, outputFilePath) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Al-Baqarah Chapter ${chapter.index}/11: ${chapter.name}] (Verses ${chapter.verses})`);
  console.log(`Theme: "${chapter.theme}"`);
  console.log(`Prompt: "${chapter.prompt}"`);
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`======================================================================`);

  console.log("Submitting video generation request to Google Veo 3.1 API...");
  let operation = await ai.models.generateVideos({
    model: MODEL_NAME,
    source: {
      prompt: chapter.prompt,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: chapter.duration,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Operation created: ${operationId}`);
  console.log("Polling Veo 3.1 video rendering status in background...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Status: ${operation.done ? "COMPLETED" : "RENDERING"}...`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const downloadUri = videoObj?.uri || videoObj?.videoUri;
  if (!downloadUri) {
    throw new Error(`Veo generation failed for ${chapter.name}: ${JSON.stringify(operation.error || response)}`);
  }

  console.log(`✓ Veo video ready! Download URI: ${downloadUri}`);
  console.log(`Downloading real MP4 asset from Google Veo cloud storage...`);
  
  const fileRes = await fetch(downloadUri, {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });
  if (!fileRes.ok) {
    throw new Error(`Failed to download Veo MP4: HTTP ${fileRes.status} ${fileRes.statusText}`);
  }
  const buffer = Buffer.from(await fileRes.arrayBuffer());
  fs.writeFileSync(outputFilePath, buffer);
  console.log(`✓ Saved Veo MP4 file: ${outputFilePath} (${buffer.length} bytes)`);

  // Inspect with ffprobe
  let probe = "";
  try {
    probe = execSync(`ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${outputFilePath}"`, { encoding: "utf8" });
  } catch (e) {
    probe = "{}";
  }

  return {
    chapter: chapter.name,
    operationId,
    downloadUri,
    fileSize: buffer.length,
    path: outputFilePath,
    probe: JSON.parse(probe || "{}"),
  };
}

async function generateWithRetry(chapter, outputFilePath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateVeoClip(chapter, outputFilePath);
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${chapter.name}: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log(`Waiting 10 seconds before retrying ${chapter.name}...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

async function main() {
  console.log("==========================================================");
  console.log("  Huda Bayan — Al-Baqarah Pilot Chapters (01–03) Generator ");
  console.log("==========================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const results = [];
  for (const chapter of PILOT_CHAPTERS) {
    const clipPath = path.join(OUTPUT_DIR, `${chapter.name}.mp4`);
    const clipResult = await generateWithRetry(chapter, clipPath);
    results.push(clipResult);
  }

  console.log("\n==========================================================");
  console.log("          AL-BAQARAH PILOT GENERATION REPORT              ");
  console.log("==========================================================");
  console.log(`Model: ${MODEL_NAME}`);
  results.forEach((r, i) => {
    const stream = r.probe?.streams?.[0] || {};
    const fmt = r.probe?.format || {};
    console.log(`\nChapter ${i + 1}: ${r.chapter}`);
    console.log(`  • Operation ID: ${r.operationId}`);
    console.log(`  • File: ${r.path}`);
    console.log(`  • File Size: ${(r.fileSize / 1024 / 1024).toFixed(2)} MB (${r.fileSize} bytes)`);
    console.log(`  • Resolution: ${stream.width}x${stream.height}`);
    console.log(`  • Duration: ${Number(fmt.duration || 6).toFixed(2)}s`);
    console.log(`  • Codec / FPS: ${stream.codec_name} @ ${stream.r_frame_rate}`);
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "pilot-report.json"),
    JSON.stringify({ model: MODEL_NAME, chapters: results }, null, 2)
  );

  console.log("\n✅ All 3 Al-Baqarah pilot chapters successfully generated and ready for QA inspection!");
}

main().catch((err) => {
  console.error("❌ Al-Baqarah Pilot Generation Pipeline Error:", err);
  process.exit(1);
});
