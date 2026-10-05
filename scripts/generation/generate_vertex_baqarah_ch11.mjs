import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

fs.mkdirSync(QA_DIR, { recursive: true });

const CHAPTER_11_SUBCHAPTERS = [
  {
    id: "11a",
    name: "11a-cosmic-dominion-and-hidden-scrutiny",
    verses: "284",
    theme: "Cosmic Dominion, Omniscience & The Weight of Accountability (Hero 1 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "An authentic documentary landscape camera shot across an expansive, high-altitude desert plateau and immense open valley in Western Arabia during late afternoon. " +
      "The camera moves with steady, dignified tracking along vast weathered sandstone and granite ridges, surveying the boundless desert horizon under a serene, open sky. " +
      "Natural atmospheric haze, real geological strata, and distant mountain ridges catching warm natural sunlight convey complete openness, cosmic scale, and solemn stillness. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no silhouettes, no footprints, no divine figures, no angels, no glowing lights, no fantasy vortex, no CGI particles, no supernatural effects, no text."
    ),
  },
  {
    id: "11b",
    name: "11b-the-covenant-of-faith-and-submission",
    verses: "285",
    theme: "The Unbroken Covenant of Faith & Sincere Submission ('Sami'na wa-Ata'na')",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "An authentic documentary landscape camera shot of an ancient natural desert mountain pass in Western Arabia during early morning. " +
      "The camera glides forward with subtle, steady, perfectly linear motion directly along a wide, open gravel trail toward distant mountain ridges under a calm dawn sky. " +
      "Expansive mountain valley with deep distant horizon where background geological formations remain far away, ensuring seamless visual continuity. " +
      "Warm morning sunlight grazes the natural rocky terrain and sparse desert scrub swaying gently in the morning breeze. " +
      "Completely natural, untouched wilderness without any pillars, without standing stones, without carvings, without man-made structures. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no silhouettes, no footprints, no bodies, no prophets, no angels, no divine figures, no sacred persons, no glowing books, no celestial lights, no text, no calligraphy, no carvings, no stelae, no pillars, no tombstones, no fantasy."
    ),
  },
  {
    id: "11c",
    name: "11c-proportionate-mercy-and-ultimate-refuge",
    verses: "286",
    theme: "Humility, Proportionate Burden, Divine Mercy & Ultimate Refuge (Surah 002 Finale - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "An authentic documentary cinema static landscape shot filmed from a completely motionless camera perspective securely beneath an ancient natural weathered sandstone rock overhang in Western Arabia during early dawn. " +
      "The camera is entirely stationary and fixed in position without any movement, panning, zooming, or camera translation, peacefully observing the quiet natural environment: " +
      "the natural geological rock overhang stably frames the upper composition throughout, looking out across a vast, quiet open desert valley and rugged distant mountain ridges catching soft, pale morning dawn light. " +
      "A gentle dawn rain shower has just naturally concluded, leaving authentic damp sandstone surfaces with a few shallow, naturally collected rainwater depressions in small hollows of the flat bedrock shelf. " +
      "At the far right edge of the frame, a small native desert shrub with delicate wet foliage sways gently in a single consistent, subtle morning breeze with realistic physical inertia. " +
      "Completely motionless, static camera framing ensures absolute visual stability, zero parallax shift, and a flawless seamless loop. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No tripods, no cameras, no filming equipment, no gear, no modern items, no man-made objects, no humans, no faces, no hands, no bodies, no silhouettes, no footprints, no divine figures, no angels, no glowing halos, no fantasy god rays, no CGI sparkles, no temples, no mosques, no shrines, no man-made sanctuary, no text."
    ),
  },
];

async function generateSubchapterWithRetry(ai, sub, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n======================================================================`);
    console.log(`🎬 Generating [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses}) [Attempt ${attempt}/${maxRetries}]`);
    console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
    console.log(`Standard:   Clean Borderless Frame + Documentary Realism`);
    console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
    console.log(`======================================================================`);

    try {
      console.log("1. Submitting generation request to Vertex AI...");
      let operation = await ai.models.generateVideos({
        model: sub.model,
        source: { prompt: sub.prompt },
        config: {
          aspectRatio: "16:9",
          durationSeconds: sub.duration,
          resolution: sub.resolution,
        },
      });

      const operationId = operation.name;
      console.log(`✓ Vertex AI Operation Created: ${operationId}`);
      console.log(`2. Polling rendering progress (${sub.is4K ? "4K Hero" : "1080p Standard"})...`);

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
        throw new Error(`Generation failed for ${sub.name}: ${JSON.stringify(operation.error, null, 2)}`);
      }

      const response = operation.response;
      const videoObj = response?.generatedVideos?.[0]?.video;
      const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

      if (!rawBytes) {
        throw new Error(`No video bytes returned for ${sub.name}: ${JSON.stringify(response)}`);
      }

      const rawMasterPath = path.join(
        OUTPUT_DIR,
        sub.is4K ? `${sub.name}-4k-raw-master.mp4` : `${sub.name}-1080p-raw-master.mp4`
      );

      const buffer = Buffer.from(rawBytes, "base64");
      fs.writeFileSync(rawMasterPath, buffer);
      console.log(`✓ Raw Master saved: ${rawMasterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

      return { rawMasterPath, operationId };
    } catch (err) {
      console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log(`Waiting 10s before retry...`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

function detectLetterbox(videoPath) {
  try {
    const cropOutput = execSync(
      `ffmpeg -i "${videoPath}" -vf cropdetect=24:16:0 -f null -max_muxing_queue_size 1024 -t 3 - 2>&1`,
      { encoding: "utf8" }
    );
    const matches = [...cropOutput.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
    if (matches.length > 0) {
      const last = matches[matches.length - 1];
      return {
        w: parseInt(last[1], 10),
        h: parseInt(last[2], 10),
        x: parseInt(last[3], 10),
        y: parseInt(last[4], 10),
      };
    }
  } catch (e) {
    console.warn("Letterbox detection warning:", e.message);
  }
  return null;
}

function processAndEncode(sub, rawMasterPath, operationId) {
  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || sub.duration);
  const rawW = stream.width || (sub.is4K ? 3840 : 1920);
  const rawH = stream.height || (sub.is4K ? 2160 : 1080);

  console.log(`  • Raw Resolution: ${rawW}x${rawH}`);
  console.log(`  • Raw Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS:      ${stream.codec_name} @ ${stream.r_frame_rate}`);

  // Check for letterbox black bars in raw master
  const detectedCrop = detectLetterbox(rawMasterPath);
  let preFilter = "";
  if (detectedCrop && detectedCrop.h < rawH * 0.98) {
    console.log(`  ⚠️ Letterbox detected: ${detectedCrop.w}x${detectedCrop.h}+${detectedCrop.x}+${detectedCrop.y}. Applying auto-crop to restore full 16:9 frame.`);
    preFilter = `crop=${detectedCrop.w}:${detectedCrop.h}:${detectedCrop.x}:${detectedCrop.y},scale=${rawW}:${rawH}:flags=lanczos,`;
  }

  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  const overlap = 0.6;
  const cutPoint = (totalDuration - overlap).toFixed(3);

  console.log(`3. Encoding seamless loop with ${overlap}s subtle overlap crossfade...`);

  if (sub.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${sub.name}-1080p.mp4`);

    const filterGraph4K = `[0:v]${preFilter}split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
    execSync(
      `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph4K}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart -an "${web4KPath}"`,
      { stdio: "ignore" }
    );

    const filterGraph1080p = `[0:v]${preFilter}scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
    execSync(
      `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${fallback1080Path}"`,
      { stdio: "ignore" }
    );

    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    const filterGraph1080p = `[0:v]${preFilter}scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
    execSync(
      `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${defaultWebPath}"`,
      { stdio: "ignore" }
    );
  }

  console.log(`✓ Web Video encoded: ${defaultWebPath}`);

  // Extract mandatory QA frames: 0s, 2s, 4s, 6s, 8s
  console.log("4. Extracting QA frames (0s, 2s, 4s, 6s, 8s)...");
  execSync(`ffmpeg -y -ss 0.0 -i "${defaultWebPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_0s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 2.0 -i "${defaultWebPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_2s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 4.0 -i "${defaultWebPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_4s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 6.0 -i "${defaultWebPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_6s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -sseof -0.05 -i "${defaultWebPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_8s.png`)}"`, { stdio: "ignore" });

  // Generate 3x loop test file
  console.log("5. Generating 3x continuous loop playback verification file...");
  const loop3xPath = path.join(QA_DIR, `${sub.name}_loop_3x_test.mp4`);
  execSync(`ffmpeg -y -stream_loop 2 -i "${defaultWebPath}" -c copy "${loop3xPath}"`, { stdio: "ignore" });

  const rawStats = fs.statSync(rawMasterPath);
  const webStats = fs.statSync(defaultWebPath);

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: sub.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: "8.00",
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    masterFile: rawMasterPath,
    masterSizeMB: (rawStats.size / 1024 / 1024).toFixed(2),
    webFile: defaultWebPath,
    webSizeMB: (webStats.size / 1024 / 1024).toFixed(2),
    operationId: operationId,
  };
}

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const targetId = process.argv[2]?.toLowerCase();
  const subchaptersToRun = targetId
    ? CHAPTER_11_SUBCHAPTERS.filter((s) => s.id === targetId)
    : CHAPTER_11_SUBCHAPTERS;

  if (subchaptersToRun.length === 0) {
    console.error(`Unknown subchapter ID: ${targetId}`);
    process.exit(1);
  }

  const results = [];
  for (const sub of subchaptersToRun) {
    const { rawMasterPath, operationId } = await generateSubchapterWithRetry(ai, sub, 3);
    const res = processAndEncode(sub, rawMasterPath, operationId);
    results.push(res);
  }

  const summaryPath = path.join(OUTPUT_DIR, `chapter_11_generation_results_${targetId || "all"}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Generation step complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Chapter 11 Generation Error:", err);
  process.exit(1);
});
