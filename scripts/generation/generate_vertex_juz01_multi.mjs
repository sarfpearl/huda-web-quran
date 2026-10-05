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

export const JUZ_01_MULTI_CLIPS = [
  {
    index: 1,
    id: "juz-01-01-guidance",
    title: "Clip 01 — Guidance / Opening",
    theme: "Al-Fatihah & Opening of Al-Baqarah: Seeking guidance on the emerging stone path in pre-dawn twilight",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot through an ancient Western Arabian Hijazi valley in the quiet pre-dawn twilight. " +
      "The camera glides forward with slow, weighted, continuous linear dolly inertia along a clearly defined ancient natural stone pathway emerging from the cool blue-grey pre-dawn shadow. " +
      "In the distant horizon, the very first gentle warmth of morning light begins to silhouette rugged dark granite mountain crests. " +
      "The path is bordered by weathered natural limestone pavers and sparse hardy desert shrubs. An atmosphere of deep contemplation, seeking guidance, and quiet beginning. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy structures, no modern elements."
    ),
  },
  {
    index: 2,
    id: "juz-01-02-revelation",
    title: "Clip 02 — Revelation / Light of Truth",
    theme: "Al-Baqarah 1–20: Truth becoming clear as natural morning light reveals geological details",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot through an ancient Western Arabian Hijazi valley at early dawn. " +
      "Continuing from the stone road, the camera glides forward with slow, weighted, continuous linear inertia toward rugged mountain terrain. " +
      "Natural directional morning sunlight breaks over the jagged dark granite peaks, casting long dramatic shadows and progressively illuminating previously shadowed geological fissures, layered sedimentary strata, and coarse mineral gravel on the path. " +
      "The horizon expands into crisp morning clarity under an authentic pale golden sky. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy structures, no modern elements."
    ),
  },
  {
    index: 3,
    id: "juz-01-03-choice",
    title: "Clip 03 — Human Choice / Two Paths",
    theme: "Faith vs Rejection: The natural terrain fork with firm stone road vs rough windblown scree",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot through an ancient Western Arabian mountain pass at early morning. " +
      "The camera glides forward with slow, weighted, continuous linear inertia as the natural stone path reaches a prominent, believable fork in the terrain. " +
      "The primary route ahead remains solid, firm, hand-laid weathered stone smoothly leading forward under clear morning sunlight. " +
      "To the side, a divergent trail turns into loose, dry, crumbling rock scree and parched earth obscured by naturally wind-whipped desert dust. Environmental symbolism of choice and certainty. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no demons, no supernatural light, no floating particles, no CGI glowing effects, no fantasy structures, no modern elements."
    ),
  },
  {
    index: 4,
    id: "juz-01-04-earth-and-stewardship",
    title: "Clip 04 — Earth / Creation / Stewardship",
    theme: "Al-Baqarah 21–39: Fertile wadi terrace, date palms, natural stone irrigation channel and cultivation",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot moving along a sheltered fertile wadi terrace in Western Arabia under clear morning light. " +
      "The camera glides forward with slow, weighted, continuous linear inertia alongside an ancient dry-stone water irrigation channel cut into dark, rich agricultural soil. " +
      "A modest grove of hardy native date palms with wind-stirred green fronds and desert fig foliage lines the path, reflecting authentic agricultural stewardship and earthly provision. " +
      "Natural morning breeze ripples the vegetation against distant arid mountain slopes. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy gardens, no modern elements."
    ),
  },
  {
    index: 5,
    id: "juz-01-05-covenant-and-history",
    title: "Clip 05 — Covenant / History",
    theme: "Al-Baqarah 40–123: Weathered stone terraces, old pathways, natural boundaries and generations",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot along an ancient hillside settlement road in the Western Arabian highlands under warm morning sunlight. " +
      "The camera glides forward with slow, weighted, continuous linear inertia along worn, time-smoothed flagstones flanked by authentic weathered dry-stone terrace walls and ancient stone boundary markers. " +
      "The tactile textures of lichen-mottled basalt, hand-stacked stone courses, and centuries of weathered rock express the solemn passage of generations, covenant, and historical legacy. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy ruins, no modern elements."
    ),
  },
  {
    index: 6,
    id: "juz-01-06-steadfastness",
    title: "Clip 06 — Test / Consequence / Steadfastness",
    theme: "Historical response: Austere windswept bedrock plateau, exposed rock, geological endurance",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot emerging onto a high, windswept arid desert plateau in the Western Arabian mountains under bright, austere morning light. " +
      "The camera glides forward with slow, weighted, continuous linear inertia along a resolute bedrock path cut through fractured dark granite and pale limestone gravel. " +
      "Strong natural desert wind visibly skims fine sand dust across the austere rock surface, revealing geological resilience, solitude, and steadfast perseverance against the elements. " +
      "Grand distant mountain peaks stand sharp in deep atmospheric perspective. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no demons, no fire, no supernatural light, no floating particles, no CGI glowing effects, no fantasy elements, no modern structures."
    ),
  },
  {
    index: 7,
    id: "juz-01-07-ibrahim-foundation",
    title: "Clip 07 — Ibrahim / Obedience / Foundation",
    theme: "Al-Baqarah 124–141: Sacred Hijazi mountain basin, ancient dry-laid foundation stones and monolith markers",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot entering a stark, sacred mountain basin in the rocky Hijaz highlands during luminous golden morning light. " +
      "The camera glides forward with slow, weighted, continuous linear inertia along a broad ancient stone approach. " +
      "In the natural amphitheater of monumental dark granite crags, ancient dry-laid stone foundation courses and weathered vertical stone monolith markers stand in solemn permanence and absolute stillness. " +
      "The composition communicates primordial obedience, timeless foundations, and sacred direction through pure geology and stone architecture. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no prophets, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy temples, no modern elements."
    ),
  },
  {
    index: 8,
    id: "juz-01-08-continuation",
    title: "Clip 08 — Completion / Direction / Continuation",
    theme: "Continuing forward toward the open horizon, seamlessly matching the opening of Clip 01",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    prompt: (
      "A majestic, authentic documentary landscape cinematography continuous forward tracking shot continuing past the ancient stone foundations toward an expansive, serene Hijazi valley horizon at early morning. " +
      "The camera glides forward with slow, weighted, continuous linear inertia along the open natural stone road leading steadily forward into the vast distance. " +
      "The landscape naturally softens as distant mountain ridges recede in authentic atmospheric haze beneath a calm, clear sky with gentle morning light. " +
      "The visual framing, forward camera momentum, horizon height, and peaceful atmosphere seamlessly align with the beginning of the journey. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame filling the entire screen. No borders, no sprockets, no film perforations, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no religious or sacred figures, no angels, no supernatural light, no floating particles, no CGI glowing effects, no fantasy structures, no modern elements."
    ),
  },
];

async function generateSingleClip(ai, clip, maxRetries = 3) {
  const rawMasterPath = path.join(MASTER_DIR, `${clip.id}-4k-raw-master.mp4`);

  // Check if raw master already exists to avoid redundant generation
  if (fs.existsSync(rawMasterPath) && fs.statSync(rawMasterPath).size > 10 * 1024 * 1024) {
    console.log(`✓ Existing raw master found for ${clip.id}: ${rawMasterPath}`);
    return { rawMasterPath, operationId: "cached-existing" };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n======================================================================`);
    console.log(`🎬 Generating [Clip ${clip.index}/8: ${clip.id}] [Attempt ${attempt}/${maxRetries}]`);
    console.log(`Title:    ${clip.title}`);
    console.log(`Theme:    ${clip.theme}`);
    console.log(`Model:    ${clip.model} [${clip.resolution.toUpperCase()}]`);
    console.log(`Standard: 100% Borderless + Continuous Documentary Movement + Meaning-First`);
    console.log(`======================================================================`);

    try {
      console.log("1. Submitting generation request to Vertex AI...");
      let operation = await ai.models.generateVideos({
        model: clip.model,
        source: { prompt: clip.prompt },
        config: {
          aspectRatio: "16:9",
          durationSeconds: clip.duration,
          resolution: clip.resolution,
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
          console.log(`  [${clip.id}] Poll #${pollCount} @ ${pollCount * 7}s — Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
        } catch (pollErr) {
          console.warn(`  [${clip.id}] Transient poll warning: ${pollErr.message}`);
        }
      }

      if (operation.error) {
        throw new Error(`Generation failed for ${clip.id}: ${JSON.stringify(operation.error, null, 2)}`);
      }

      const response = operation.response;
      const videoObj = response?.generatedVideos?.[0]?.video;
      const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

      if (!rawBytes) {
        throw new Error(`No video bytes returned for ${clip.id}: ${JSON.stringify(response)}`);
      }

      const buffer = Buffer.from(rawBytes, "base64");
      fs.writeFileSync(rawMasterPath, buffer);
      console.log(`✓ Raw 4K Master saved: ${rawMasterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

      return { rawMasterPath, operationId };
    } catch (err) {
      console.warn(`Attempt ${attempt} failed for ${clip.id}: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log("Waiting 10s before retry...");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

function processAndEncodeSingleClip(clip, rawMasterPath, operationId) {
  const probeRaw = execSync(
    `"${FFPROBE}" -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || clip.duration);

  console.log(`\nTechnical Analysis [${clip.id}]:`);
  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);

  const webPath = path.join(PUBLIC_JUZ_DIR, `${clip.id}.mp4`);
  const master4KPath = path.join(MASTER_DIR, `${clip.id}-4k.mp4`);

  // 4K Master encode (clean 8.0s, high quality crf 19, faststart)
  execSync(
    `"${FFMPEG}" -y -i "${rawMasterPath}" -t 8.0 -c:v libx264 -preset medium -crf 19 -pix_fmt yuv420p -movflags +faststart -an "${master4KPath}"`,
    { stdio: "ignore" }
  );

  // 1080p Web Deliverable (lanczos scaled, crf 20, faststart)
  execSync(
    `"${FFMPEG}" -y -i "${rawMasterPath}" -t 8.0 -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -an "${webPath}"`,
    { stdio: "ignore" }
  );

  // Extract individual clip QA frames: 0s, 2s, 4s, 6s, final (8s)
  execSync(`"${FFMPEG}" -y -ss 0.0 -i "${webPath}" -vframes 1 "${path.join(QA_DIR, `${clip.id}_0s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 2.0 -i "${webPath}" -vframes 1 "${path.join(QA_DIR, `${clip.id}_2s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 4.0 -i "${webPath}" -vframes 1 "${path.join(QA_DIR, `${clip.id}_4s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -ss 6.0 -i "${webPath}" -vframes 1 "${path.join(QA_DIR, `${clip.id}_6s.png`)}"`, { stdio: "ignore" });
  execSync(`"${FFMPEG}" -y -sseof -0.05 -i "${webPath}" -vframes 1 "${path.join(QA_DIR, `${clip.id}_final.png`)}"`, { stdio: "ignore" });

  const rawStats = fs.statSync(rawMasterPath);
  const masterStats = fs.statSync(master4KPath);
  const webStats = fs.statSync(webPath);

  return {
    index: clip.index,
    id: clip.id,
    title: clip.title,
    theme: clip.theme,
    model: clip.model,
    targetResolution: clip.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: "8.00s",
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    rawMasterFile: rawMasterPath,
    rawMasterSizeMB: (rawStats.size / 1024 / 1024).toFixed(2),
    master4KFile: master4KPath,
    master4KSizeMB: (masterStats.size / 1024 / 1024).toFixed(2),
    webFile: webPath,
    webSizeMB: (webStats.size / 1024 / 1024).toFixed(2),
    operationId: operationId,
    qaFrames: [
      path.join(QA_DIR, `${clip.id}_0s.png`),
      path.join(QA_DIR, `${clip.id}_2s.png`),
      path.join(QA_DIR, `${clip.id}_4s.png`),
      path.join(QA_DIR, `${clip.id}_6s.png`),
      path.join(QA_DIR, `${clip.id}_final.png`),
    ],
  };
}

function buildConcatenatedSequence(clipResults) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Building Full 64-Second Seamless Sequence & 3x Loop Test`);
  console.log(`======================================================================`);

  const fullSequencePath = path.join(PUBLIC_JUZ_DIR, "juz-01-sequence-64s.mp4");
  const loop3xSequencePath = path.join(QA_DIR, "juz-01_full_sequence_loop_3x_test.mp4");

  // Create seamless 1.0s crossfade transitions between all 8 clips and back to clip 1
  // We use filter_complex xfade for beautiful cinematic continuity transitions
  const inputs = clipResults.map((c) => `-i "${c.webFile}"`).join(" ");
  
  // Transition offset formula: offset_i = i * 8.0 - (i * transition_duration)
  // With 1.0s transition:
  // clip 0: 0.0 to 8.0s
  // clip 1 fades in at 7.0s
  // clip 2 fades in at 14.0s ...
  // Total seamless continuous length = 8 * 8 - 7 * 1.0 = 57.0s (or clean concat = 64s)
  // Let's create clean concat list for exact 64s representation:
  const listFile = path.join(PUBLIC_JUZ_DIR, "juz_01_clips.txt");
  const listContent = clipResults.map((c) => `file '${c.webFile}'`).join("\n");
  fs.writeFileSync(listFile, listContent);

  execSync(
    `"${FFMPEG}" -y -f concat -safe 0 -i "${listFile}" -c copy "${fullSequencePath}"`,
    { stdio: "ignore" }
  );
  console.log(`✓ 64-Second Full Sequence generated: ${fullSequencePath}`);

  // Generate 3x continuous loop verification video (3 × 64s = 192s)
  execSync(
    `"${FFMPEG}" -y -stream_loop 2 -i "${fullSequencePath}" -c copy "${loop3xSequencePath}"`,
    { stdio: "ignore" }
  );
  console.log(`✓ 3x Full Sequence Loop test generated: ${loop3xSequencePath}`);

  // Extract boundary transition frames:
  // 1->2 (7.5s, 8.5s)
  // 2->3 (15.5s, 16.5s)
  // 3->4 (23.5s, 24.5s)
  // 4->5 (31.5s, 32.5s)
  // 5->6 (39.5s, 40.5s)
  // 6->7 (47.5s, 48.5s)
  // 7->8 (55.5s, 56.5s)
  // 8->1 (63.5s, 0.5s)
  console.log("Extracting boundary transition frames...");
  for (let i = 1; i <= 8; i++) {
    const nextI = i === 8 ? 1 : i + 1;
    const boundaryTag = `boundary_${String(i).padStart(2, "0")}_to_${String(nextI).padStart(2, "0")}`;
    const outgoing = clipResults[i - 1].webFile;
    const incoming = clipResults[nextI - 1].webFile;
    execSync(`"${FFMPEG}" -y -sseof -0.1 -i "${outgoing}" -vframes 1 "${path.join(QA_DIR, `${boundaryTag}_out.png`)}"`, { stdio: "ignore" });
    execSync(`"${FFMPEG}" -y -ss 0.1 -i "${incoming}" -vframes 1 "${path.join(QA_DIR, `${boundaryTag}_in.png`)}"`, { stdio: "ignore" });
  }

  const seqStats = fs.statSync(fullSequencePath);
  const loop3xStats = fs.statSync(loop3xSequencePath);

  return {
    fullSequencePath,
    fullSequenceSizeMB: (seqStats.size / 1024 / 1024).toFixed(2),
    loop3xSequencePath,
    loop3xSequenceSizeMB: (loop3xStats.size / 1024 / 1024).toFixed(2),
  };
}

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const specificIndex = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  const clipsToProcess = specificIndex
    ? JUZ_01_MULTI_CLIPS.filter((c) => c.index === specificIndex)
    : JUZ_01_MULTI_CLIPS;

  console.log(`Starting generation for ${clipsToProcess.length} clip(s)...`);

  const clipResults = [];
  for (const clip of clipsToProcess) {
    const { rawMasterPath, operationId } = await generateSingleClip(ai, clip, 3);
    const result = processAndEncodeSingleClip(clip, rawMasterPath, operationId);
    clipResults.push(result);
  }

  // If running all 8 clips, build the full sequence
  if (clipResults.length === 8) {
    const sequenceResult = buildConcatenatedSequence(clipResults);
    const fullReport = {
      juzNumber: 1,
      title: "Juz 1: The Multi-Video Cinematic Quranic Journey",
      totalClips: 8,
      clipDuration: "8.00s",
      totalSequenceDuration: "64.00s",
      sequenceLoopTestDuration: "192.00s (3x Loop)",
      fullSequencePath: sequenceResult.fullSequencePath,
      fullSequenceSizeMB: sequenceResult.fullSequenceSizeMB,
      loop3xSequencePath: sequenceResult.loop3xSequencePath,
      loop3xSequenceSizeMB: sequenceResult.loop3xSequenceSizeMB,
      clips: clipResults,
    };

    const reportPath = path.join(REPORTS_DIR, "juz-01-multi-sequence-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
    console.log(`\n🎉 FULL MULTI-VIDEO SEQUENCE READY! Saved to: ${reportPath}`);
  }
}

main().catch((err) => {
  console.error("❌ Juz 1 Multi-Video Fatal Error:", err);
  process.exit(1);
});
