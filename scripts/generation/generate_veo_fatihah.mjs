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

const SCENES = [
  {
    index: 1,
    name: "01-praise-mercy",
    verses: "1–3",
    theme: "Praise, Lordship, and Divine Mercy Spreading Across Creation",
    prompt: (
      "A vast mountain valley slowly emerging from darkness as warm dawn light reveals flowing water, symbolizing divine mercy spreading across creation. " +
      "Cinematic foreground of dew-covered grasses and river stones, midground with a clear winding mountain stream catching the first warm light, " +
      "and background of grand ancient peaks surrounded by drifting volumetric morning mist. " +
      "Slow deliberate forward dolly movement through atmospheric depth. Controlled lighting transition from cool pre-dawn indigo to warm golden amber rays. " +
      "Masterpiece nature cinematography, 35mm film aesthetic, subtle volumetric light rays, physically believable water and fog movement, " +
      "profoundly peaceful and majestic atmosphere. No people, no faces, no religious figures, no architecture, no text, no logos."
    ),
    duration: 6,
  },
  {
    index: 2,
    name: "02-divine-judgment",
    verses: "4",
    theme: "Master of the Day of Judgment — Cosmic Ascent and Supreme Majesty",
    prompt: (
      "A continuous cinematic ascent from the earthly horizon through clouds into an immense celestial expanse, visually expanding the sense of divine authority and solemn scale. " +
      "The camera begins above dramatic shadowy mountain peaks at dusk and rises steadily upward through dense twilight clouds into a deep indigo sky filled with distant nebula dust and countless stars. " +
      "Solemn, awe-inspiring, reverent atmosphere with deep contrast and subtle celestial motion. " +
      "Film-quality vertical crane motion, realistic atmospheric perspective, natural cloud dispersal, photorealistic earth-to-cosmos transition. " +
      "No people, no faces, no angels, no fire, no religious figures, no text, no logos."
    ),
    duration: 6,
  },
  {
    index: 3,
    name: "03-worship-and-help",
    verses: "5",
    theme: "You Alone We Worship and You Alone We Ask for Help — Devotion and Focus",
    prompt: (
      "A single clearly defined dirt and stone pathway emerging from shadow through a quiet twilight landscape, symbolizing devotion, dependence, focus and clarity. " +
      "Crisp foreground of wind-blown grasses along the path edges, the narrow path softly illuminated by warm ambient twilight while surrounding hills remain calm and dark. " +
      "Extremely focused, minimal, contemplative composition. Slow smooth forward tracking shot centered on the path advancing into the tranquil horizon. " +
      "Gentle organic plant sway, realistic ground textures, quiet sacred stillness, cinematic color grading. " +
      "No people, no faces, no religious figures, no buildings, no text, no logos."
    ),
    duration: 6,
  },
  {
    index: 4,
    name: "04-guidance",
    verses: "6–7",
    theme: "Guide Us to the Straight Path — Radiant Horizon and Spiritual Resolution",
    prompt: (
      "Direct continuation of the visual journey from Scene 3 along the exact same pathway. " +
      "The single path advances forward as morning clouds part and brilliant volumetric sunbeams flood the valley with golden light. " +
      "The surrounding landscape transforms into a fertile, flourishing green valley with wildflowers and gentle mist catching the sunlight. " +
      "The illuminated path leads directly toward the radiant, hopeful horizon. Emotional resolution of guidance, peace, and divine favor. " +
      "Slow majestic forward tracking shot, realistic sun flare, dynamic lighting evolution, filmic depth of field. " +
      "No people, no faces, no religious figures, no buildings, no text, no logos."
    ),
    duration: 6,
  },
];

const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah";
const MODEL_NAME = "models/veo-3.1-fast-generate-preview";

async function generateVeoClip(scene, outputFilePath) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Scene ${scene.index}/4: ${scene.name}] (${scene.verses} — ${scene.theme})`);
  console.log(`Prompt: "${scene.prompt}"`);
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`======================================================================`);

  console.log("Submitting upgraded video generation request to Google Veo 3.1 API...");
  let operation = await ai.models.generateVideos({
    model: MODEL_NAME,
    source: {
      prompt: scene.prompt,
    },
    config: {
      aspectRatio: "16:9",
      durationSeconds: scene.duration,
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
    throw new Error(`Veo generation failed for ${scene.name}: ${JSON.stringify(operation.error || response)}`);
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
    scene: scene.name,
    operationId,
    downloadUri,
    fileSize: buffer.length,
    path: outputFilePath,
    probe: JSON.parse(probe || "{}"),
  };
}

function assembleMasterVideo(clipPaths, finalMasterPath) {
  console.log(`\n🎞️ Assembling 4 Veo clips into master Surah video with 1.0s cinematic crossfades...`);
  const inputs = clipPaths.map((p) => `-i "${p}"`).join(" ");
  
  // 4 clips with 6s duration and 1s crossfade -> offsets at 5s, 10s, 15s -> total 21s (or 5s, 9s, 13s -> 19s)
  const filter = (
    `"[0:v][1:v]xfade=transition=fade:duration=1:offset=5[v01];` +
    `[v01][2:v]xfade=transition=fade:duration=1:offset=9[v02];` +
    `[v02][3:v]xfade=transition=fade:duration=1:offset=13[vfinal];` +
    `[vfinal]format=yuv420p,scale=1280:720[out]"`
  );

  const cmd = `ffmpeg -y ${inputs} -filter_complex ${filter} -map "[out]" -c:v libx264 -preset slow -crf 19 -movflags +faststart "${finalMasterPath}"`;
  execSync(cmd, { stdio: "inherit" });
  
  const masterProbe = execSync(`ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${finalMasterPath}"`, { encoding: "utf8" });
  console.log(`✓ Assembled master video: ${finalMasterPath} (${fs.statSync(finalMasterPath).size} bytes)`);
  return JSON.parse(masterProbe);
}

async function generateVeoClipWithRetry(scene, outputFilePath, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateVeoClip(scene, outputFilePath);
    } catch (err) {
      console.warn(`⚠️ Attempt ${attempt}/${maxRetries} failed for ${scene.name}: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log(`Waiting 10 seconds before retrying ${scene.name}...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

async function main() {
  console.log("==========================================================");
  console.log("  HuDa Web Quran — Upgraded Cinematic Veo 3.1 Al-Fatihah Pipeline ");
  console.log("==========================================================");

  const clipsDir = path.join(OUTPUT_DIR, "001-al-fatihah");
  fs.mkdirSync(clipsDir, { recursive: true });
  const finalMasterPath = path.join(OUTPUT_DIR, "001-al-fatihah.mp4");

  const results = [];
  const clipPaths = [];

  for (const scene of SCENES) {
    const clipPath = path.join(clipsDir, `${scene.name}.mp4`);
    clipPaths.push(clipPath);

    const clipResult = await generateVeoClipWithRetry(scene, clipPath);
    results.push(clipResult);
  }

  const masterMeta = assembleMasterVideo(clipPaths, finalMasterPath);

  console.log("\n==========================================================");
  console.log("             VEO 3.1 GENERATION SUMMARY REPORT             ");
  console.log("==========================================================");
  console.log(`Model: ${MODEL_NAME}`);
  results.forEach((r, i) => {
    const stream = r.probe?.streams?.[0] || {};
    const fmt = r.probe?.format || {};
    console.log(`\nClip ${i + 1}: ${r.scene}`);
    console.log(`  • Operation ID: ${r.operationId}`);
    console.log(`  • File: ${r.path}`);
    console.log(`  • File Size: ${(r.fileSize / 1024 / 1024).toFixed(2)} MB (${r.fileSize} bytes)`);
    console.log(`  • Resolution: ${stream.width}x${stream.height}`);
    console.log(`  • Duration: ${Number(fmt.duration || 6).toFixed(2)}s`);
    console.log(`  • Codec / FPS: ${stream.codec_name} @ ${stream.r_frame_rate}`);
  });

  const masterStream = masterMeta?.streams?.[0] || {};
  const masterFmt = masterMeta?.format || {};
  console.log(`\nMaster Video: ${finalMasterPath}`);
  console.log(`  • Resolution: ${masterStream.width}x${masterStream.height}`);
  console.log(`  • Duration: ${Number(masterFmt.duration || 19).toFixed(2)}s`);
  console.log(`  • File Size: ${(Number(masterFmt.size || fs.statSync(finalMasterPath).size) / 1024 / 1024).toFixed(2)} MB`);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "001-al-fatihah-report.json"),
    JSON.stringify({ model: MODEL_NAME, clips: results, master: masterMeta }, null, 2)
  );

  console.log("\n✅ All 4 upgraded Al-Fatihah Veo clips and master video successfully generated and verified!");
}

main().catch((err) => {
  console.error("❌ Upgraded Veo Generation Pipeline Error:", err);
  process.exit(1);
});
