import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const VIDEOS_DIR = path.resolve("public/videos/surah");

const SURAH_VEO_PROMPTS = {
  3: {
    name: "003-aal-imran",
    surahNumber: 3,
    surahName: "Aal-Imran",
    ayat: "3:190–191",
    theme: "Reflection upon the creation of the heavens and earth, celestial expanse & deep stillness.",
    prompt: (
      "Cinematic documentary tracking shot moving slowly forward at 1.5 meters height over the glassy, tranquil surface of a pristine mountain lake at deep dusk. " +
      "Towering majestic granite mountain silhouettes flank the horizon beneath a breathtaking, crystal-clear night sky filled with millions of twinkling stars and the soft luminous arc of the Milky Way galaxy. " +
      "Gentle natural water ripples continuously catch and mirror the silver starlight. Delicate, slow-moving atmospheric mist drifts through distant valleys. " +
      "Extremely peaceful, sacred, awe-inspiring reverence. Uniform, natural ambient celestial lighting, filmic 35mm color grading, deep indigo and silver tones. " +
      "Completely unobstructed full frame, borderless edge-to-edge. No people, no faces, no angels, no religious figures, no modern buildings, no text, no calligraphy, no logos."
    ),
  },
  4: {
    name: "004-an-nisa",
    surahNumber: 4,
    surahName: "An-Nisa",
    ayat: "4:135",
    theme: "Standing firmly for justice, balance, moral integrity and enduring strength.",
    prompt: (
      "A grand, cinematic forward tracking shot through a dramatic ancient mountain canyon at golden sunrise. " +
      "An ancient, monumental weathered stone arch bridge spans high across the chasm, bathed in pure warm morning sunlight, representing balance, enduring justice, and steadfast integrity. " +
      "A pristine clear mountain river rushes smoothly over riverbed stones below with gentle white water foam and glistening sunlight highlights. " +
      "Majestic volumetric light rays piercing through morning mountain mist. Masterpiece 35mm nature cinematography. " +
      "No people, no faces, no religious figures, no modern buildings, no text, no logos."
    ),
  },
  55: {
    name: "055-ar-rahman",
    surahNumber: 55,
    surahName: "Ar-Rahman",
    ayat: "55:19–20, 55:62–64",
    theme: "Two seas meeting with a barrier between them; lush green gardens and springs of mercy.",
    prompt: (
      "An epic cinematic aerial camera glide over a breathtaking coastal sanctuary where deep emerald turquoise ocean meets a crystal azure sea, separated by a subtle, serene natural barrier of sand and reef. " +
      "Gentle, rhythmic ocean waves lapping softly with realistic sea foam, bordered by lush coastal groves of ancient date palms and vibrant green foliage swaying in an ocean breeze. " +
      "Soft golden afternoon sunlight casting warm glistening reflections across the water. Filmic depth, tranquil sacred atmosphere. " +
      "No people, no faces, no boats, no architecture, no text, no logos."
    ),
  },
  67: {
    name: "067-al-mulk",
    surahNumber: 67,
    surahName: "Al-Mulk",
    ayat: "67:1–5",
    theme: "Dominion of the heavens, perfection of divine creation, stars as lanterns.",
    prompt: (
      "A majestic cinematic slow ascent through sweeping atmospheric clouds into an expansive, flawless celestial dome. " +
      "Layer upon layer of deep indigo and velvet cosmic space glowing with countless radiant stars and luminous cosmic dust like lanterns in the night. " +
      "Perfect equilibrium, boundless cosmic depth, gentle celestial particle movement, solemn divine sovereignty. " +
      "Film-quality IMAX cinematography, realistic atmospheric dispersion. " +
      "No people, no faces, no fire, no architecture, no text, no logos."
    ),
  },
};

async function generateSurahVeo(surahNum) {
  const cfg = SURAH_VEO_PROMPTS[surahNum];
  if (!cfg) {
    throw new Error(`No Veo configuration found for Surah ${surahNum}`);
  }

  console.log("======================================================================");
  console.log(`🎬 Google Veo 3.1 AI Generation: Surah ${cfg.surahNumber} (${cfg.surahName})`);
  console.log(`   Ayat:   ${cfg.ayat}`);
  console.log(`   Theme:  ${cfg.theme}`);
  console.log(`   Target: ${cfg.name}.mp4`);
  console.log("======================================================================");

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const rawMasterPath = path.join(VIDEOS_DIR, `${cfg.name}-raw-master.mp4`);
  const finalSeamlessPath = path.join(VIDEOS_DIR, `${cfg.name}.mp4`);
  const legacyPath = path.join(VIDEOS_DIR, `${String(surahNum).padStart(3, "0")}-surah.mp4`);

  console.log("1. Submitting video generation to Google Veo 3.1 (Vertex AI)...");
  let operation = await ai.models.generateVideos({
    model: "veo-3.1-fast-generate-001",
    source: { prompt: cfg.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: 8,
      resolution: "1080p",
    },
  });

  const operationId = operation.name;
  console.log(`✓ Operation Created: ${operationId}`);
  console.log("2. Rendering in background on Google AI infrastructure...");

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    operation = await ai.operations.getVideosOperation({ operation });
    console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
  }

  if (operation.error) {
    throw new Error(`Veo generation failed: ${JSON.stringify(operation.error)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error("No video bytes returned from Veo 3.1");
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(rawMasterPath, buffer);
  console.log(`✓ Raw Veo Master saved: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

  // 3. Seamless Soft Looping Overlap Crossfade
  const overlap = 0.8;
  const totalDuration = 8.0;
  const cutPoint = (totalDuration - overlap).toFixed(3);
  console.log(`3. Encoding broadcast-grade ${overlap}s soft loop crossfade...`);

  const filterGraph = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;

  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 19 -movflags +faststart -an "${finalSeamlessPath}"`,
    { stdio: "inherit" }
  );

  // Also duplicate to legacy path
  if (fs.existsSync(finalSeamlessPath)) {
    try {
      fs.copyFileSync(finalSeamlessPath, legacyPath);
    } catch {}
  }

  const finalStats = fs.statSync(finalSeamlessPath);
  console.log(`\n✅ SUCCESS! Generated WOW-Tier Google Veo 3.1 Video:`);
  console.log(`   Path: ${finalSeamlessPath} (${(finalStats.size / 1024 / 1024).toFixed(2)} MB)`);
}

const surahNum = Number(process.argv[2] || 3);
generateSurahVeo(surahNum).catch((err) => {
  console.error("❌ Veo Generation Error:", err);
  process.exit(1);
});
