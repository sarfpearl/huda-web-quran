import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/003-aal-e-imran";
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

fs.mkdirSync(QA_DIR, { recursive: true });

const SUBCHAPTER_02C = {
  id: "02c",
  name: "02c-the-supreme-sovereign-and-cosmic-order",
  verses: "26–32",
  theme: "The Supreme Sovereign, Cosmic Order & True Devotion (Standard 1080p)",
  model: "veo-3.1-fast-generate-001",
  resolution: "1080p",
  duration: 8,
  is4K: false,
  prompt: (
    "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position with all filming equipment completely outside the visible composition, capturing an expansive, flat low-relief sandstone desert gravel plateau in the northwestern Arabian Peninsula near Tabuk during calm, ordinary civil twilight. " +
    "The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, orbit, rotation, drone movement, or artificial parallax: viewing an expansive, flat horizontal desert plain with a vast, unbroken horizon stretching straight across the distance under an unclouded twilight sky. " +
    "There are absolutely no vertical rock towers, no buttes, no spires, no pinnacles, no thumb-shaped rocks, no mesas, no freestanding monoliths, and no elevated mountain peaks anywhere in the entire scene. " +
    "In the broad foreground and middle distance, the flat desert floor consists of weathered horizontal sandstone bedrock pavement, coarse desert gravel reg, natural reddish-ochre sand drifts with subtle wind ripples, and small, scattered flat stones, interspersed with a few sparse, wiry native desert shrubs displaying gentle, physically believable low-intensity wind movement. " +
    "In the middle ground, low, shallow, stepped horizontal rock shelves only inches to a couple feet high lie flush with the ground, naturally embedded into the level desert terrain. " +
    "The background is completely flat, open, and level, with an uninterrupted, straight desert horizon where the flat earth meets the vast sky. " +
    "The evening sky displays an authentic, subdued civil twilight gradient with an ordinary, faint indigo Earth's shadow resting evenly along the level horizon beneath a very soft, pale dusky-rose Belt of Venus. " +
    "Completely consistent, soft ambient twilight illumination throughout the entire 8-second shot, with no moving sun, no time-lapse progression, no shifting shadows, and no exposure change. " +
    "Completely motionless camera framing ensures absolute visual stability, zero parallax shift, and clean loop compatibility. " +
    "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
    "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
    "No camera equipment, no tripod, no tripod legs, no tripod head, no equipment shadow, no filming gear, no modern objects. " +
    "No vertical rock formations, no buttes, no towers, no spires, no pinnacles, no thumb-shaped rocks, no mesas, no mountains, no hills. " +
    "No humans, no faces, no hands, no feet, no bodies, no silhouettes, no footprints, no human traces, no divine figures, no angels, no prophets, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, no casualties, no hellfire, no demons, no souls, no corpses, no graves, no skeletons, no resurrection imagery, no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no glowing horizon, no cosmic portals, no magical particles, no text."
  ),
};

async function generateSubchapter(ai, sub, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n======================================================================`);
    console.log(`🎬 REGENERATION #3 [Surah 003 Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses}) [Attempt ${attempt}/${maxRetries}]`);
    console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
    console.log(`Direction:  Flat Low-Relief Arabian Desert Plateau (Flat Unbroken Horizon / Zero Towers/Buttes)`);
    console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
    console.log(`======================================================================`);

    try {
      console.log("1. Submitting regeneration #3 request to Vertex AI...");
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
      console.log(`2. Polling rendering progress (1080p Standard)...`);

      let pollCount = 0;
      while (!operation.done) {
        pollCount++;
        await new Promise((r) => setTimeout(r, 6000));
        try {
          operation = await ai.operations.getVideosOperation({ operation });
          console.log(`  [Poll #${pollCount} @ ${pollCount * 6}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
        } catch (pollErr) {
          console.warn(`  [Poll #${pollCount} @ ${pollCount * 6}s] Transient poll warning: ${pollErr.message}`);
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
        `${sub.name}-1080p-raw-master.mp4`
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
  const rawW = stream.width || 1920;
  const rawH = stream.height || 1080;

  console.log(`  • Raw Resolution: ${rawW}x${rawH}`);
  console.log(`  • Raw Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS/Pix:  ${stream.codec_name} @ ${stream.r_frame_rate} (${stream.pix_fmt})`);

  // Extract raw source 0s and 8s frames for raw-loop QA
  const raw0sPath = path.join(QA_DIR, `${sub.name}_raw_0s.png`);
  const raw8sPath = path.join(QA_DIR, `${sub.name}_raw_8s.png`);
  execSync(`ffmpeg -y -ss 0.0 -i "${rawMasterPath}" -vframes 1 "${raw0sPath}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -sseof -0.05 -i "${rawMasterPath}" -vframes 1 "${raw8sPath}"`, { stdio: "ignore" });
  console.log(`  • Raw Source QA Frames extracted: raw_0s.png and raw_8s.png`);

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

  const filterGraph1080p = `[0:v]${preFilter}scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]${preFilter}scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  execSync(
    `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${defaultWebPath}"`,
    { stdio: "ignore" }
  );

  console.log(`✓ 1080p Web Video encoded: ${defaultWebPath}`);

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

  // ffprobe validation on final web file
  const probeFinal = JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${defaultWebPath}"`,
      { encoding: "utf8" }
    )
  );

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: "1080p",
    nativeResolution: `${probeFinal.streams[0].width}x${probeFinal.streams[0].height}`,
    duration: Number(probeFinal.format.duration).toFixed(2),
    fps: probeFinal.streams[0].r_frame_rate,
    codec: probeFinal.streams[0].codec_name,
    pix_fmt: probeFinal.streams[0].pix_fmt,
    rawMasterFile: rawMasterPath,
    rawMasterSizeMB: (rawStats.size / 1024 / 1024).toFixed(2),
    webFile: defaultWebPath,
    webSizeMB: (webStats.size / 1024 / 1024).toFixed(2),
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

  console.log(`Starting REGENERATION #3 of Subchapter 02c...`);
  const { rawMasterPath, operationId } = await generateSubchapter(ai, SUBCHAPTER_02C, 3);
  const result = processAndEncode(SUBCHAPTER_02C, rawMasterPath, operationId);

  const summaryPath = path.join(OUTPUT_DIR, `generation_results_02c.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(result, null, 2));
  console.log(`\n🎉 Subchapter 02c regeneration #3 complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Subchapter 02c Regeneration #3 Error:", err);
  process.exit(1);
});
