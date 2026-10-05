import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/003-aal-e-imran";
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

fs.mkdirSync(QA_DIR, { recursive: true });

const SUBCHAPTER_01A = {
  id: "01a",
  name: "01a-the-immutable-foundation-and-muhkamat",
  verses: "1–9",
  theme: "The Immutable Foundation, Muhkamat & Steadfast Faith (Hero 1 - Native 4K)",
  model: "veo-3.1-generate-001",
  resolution: "4k",
  duration: 8,
  is4K: true,
  prompt: (
    "An authentic documentary-cinema static landscape shot filmed from a completely motionless camera perspective securely locked on a sturdy tripod in real Western Arabian geological terrain during quiet early morning. " +
    "The camera is entirely stationary and fixed in position without any movement, panning, zooming, tracking, or rotation, observing the majestic, unyielding landscape: " +
    "rugged Western Arabian weathered granite rock formations and ancient exposed geological strata stand firm and enduring across a broad, quiet mountain plateau beneath a calm dawn sky. " +
    "Subtle natural morning mist rests low in the distant mountain valleys while crisp, pale dawn sunlight begins to graze the weathered stone facets and scattered natural gravel. " +
    "Natural atmospheric depth and realistic geological erosion convey an immutable physical foundation, timeless stillness, and solemn permanence. " +
    "Completely motionless, static camera framing ensures absolute visual stability, zero parallax shift, and a flawless seamless loop. " +
    "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
    "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No humans, no faces, no hands, no bodies, no silhouettes, no footprints, no divine figures, no angels, no prophets, no Maryam, no Isa, no Zakariya, no Yahya, no prayer pose, no mosque, no Kaaba, no buildings, no ruins, no shrines, no man-made structures, no fantasy CGI, no glowing objects, no halos, no god rays, no supernatural light, no cosmic portals, no magical particles, no text."
  ),
};

async function generateSubchapter(ai, sub, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n======================================================================`);
    console.log(`🎬 Generating [Surah 003 Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses}) [Attempt ${attempt}/${maxRetries}]`);
    console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
    console.log(`Standard:   Clean Borderless Frame + Documentary Realism + Locked Tripod`);
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
        `${sub.name}-4k-raw-master.mp4`
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
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || sub.duration);
  const rawW = stream.width || 3840;
  const rawH = stream.height || 2160;

  console.log(`  • Raw Resolution: ${rawW}x${rawH}`);
  console.log(`  • Raw Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS/Pix:  ${stream.codec_name} @ ${stream.r_frame_rate} (${stream.pix_fmt})`);

  // Check for letterbox black bars in raw master
  const detectedCrop = detectLetterbox(rawMasterPath);
  let preFilter = "";
  if (detectedCrop && detectedCrop.h < rawH * 0.98) {
    console.log(`  ⚠️ Letterbox detected: ${detectedCrop.w}x${detectedCrop.h}+${detectedCrop.x}+${detectedCrop.y}. Applying auto-crop to restore full 16:9 frame.`);
    preFilter = `crop=${detectedCrop.w}:${detectedCrop.h}:${detectedCrop.x}:${detectedCrop.y},scale=${rawW}:${rawH}:flags=lanczos,`;
  }

  const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
  const web1080pPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  const overlap = 0.6;
  const cutPoint = (totalDuration - overlap).toFixed(3);

  console.log(`3. Encoding seamless loop with ${overlap}s subtle overlap crossfade...`);

  // 1. Native 4K Web Master
  console.log(`  → Encoding Native 4K Master: ${web4KPath}`);
  const filterGraph4K = `[0:v]${preFilter}split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph4K}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart -an "${web4KPath}"`,
    { stdio: "ignore" }
  );

  // 2. Standard 1080p Web Derivative
  console.log(`  → Encoding 1080p Web Derivative: ${web1080pPath}`);
  const filterGraph1080p = `[0:v]${preFilter}scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${web1080pPath}"`,
    { stdio: "ignore" }
  );

  console.log(`✓ 4K Master encoded:     ${web4KPath}`);
  console.log(`✓ 1080p Derivative encoded: ${web1080pPath}`);

  // Extract mandatory QA frames: 0s, 2s, 4s, 6s, 8s
  console.log("4. Extracting QA frames (0s, 2s, 4s, 6s, final frame)...");
  execSync(`ffmpeg -y -ss 0.0 -i "${web4KPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_0s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 2.0 -i "${web4KPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_2s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 4.0 -i "${web4KPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_4s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss 6.0 -i "${web4KPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_6s.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -sseof -0.05 -i "${web4KPath}" -vframes 1 "${path.join(QA_DIR, `${sub.name}_8s.png`)}"`, { stdio: "ignore" });

  // Generate 3x loop test file
  console.log("5. Generating 3x continuous loop playback verification file...");
  const loop3xPath = path.join(QA_DIR, `${sub.name}_loop_3x_test.mp4`);
  execSync(`ffmpeg -y -stream_loop 2 -i "${web1080pPath}" -c copy "${loop3xPath}"`, { stdio: "ignore" });

  const rawStats = fs.statSync(rawMasterPath);
  const web4kStats = fs.statSync(web4KPath);
  const web1080pStats = fs.statSync(web1080pPath);

  // ffprobe validation on final 4K web file
  const probeFinal4K = JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${web4KPath}"`,
      { encoding: "utf8" }
    )
  );

  // ffprobe validation on final 1080p web derivative
  const probeFinal1080 = JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${web1080pPath}"`,
      { encoding: "utf8" }
    )
  );

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: "4k",
    nativeResolution: `${probeFinal4K.streams[0].width}x${probeFinal4K.streams[0].height}`,
    derivativeResolution: `${probeFinal1080.streams[0].width}x${probeFinal1080.streams[0].height}`,
    duration: Number(probeFinal4K.format.duration).toFixed(2),
    fps: probeFinal4K.streams[0].r_frame_rate,
    codec: probeFinal4K.streams[0].codec_name,
    pix_fmt: probeFinal4K.streams[0].pix_fmt,
    rawMasterFile: rawMasterPath,
    rawMasterSizeMB: (rawStats.size / 1024 / 1024).toFixed(2),
    web4KFile: web4KPath,
    web4KSizeMB: (web4kStats.size / 1024 / 1024).toFixed(2),
    web1080pFile: web1080pPath,
    web1080pSizeMB: (web1080pStats.size / 1024 / 1024).toFixed(2),
    loop3xFile: loop3xPath,
    operationId: operationId,
  };
}

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  console.log(`Starting ONLY Subchapter 01a generation...`);
  const { rawMasterPath, operationId } = await generateSubchapter(ai, SUBCHAPTER_01A, 3);
  const result = processAndEncode(SUBCHAPTER_01A, rawMasterPath, operationId);

  const summaryPath = path.join(OUTPUT_DIR, `generation_results_01a.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  console.log(`\n🎉 Subchapter 01a complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Subchapter 01a Generation Error:", err);
  process.exit(1);
});
