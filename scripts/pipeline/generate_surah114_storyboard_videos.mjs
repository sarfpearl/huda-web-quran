#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Surah An-Nas (114), Video 3, Ayahs 5–6
 *  Storyboard-Driven Cinematic Video Sequence Generator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Renders 3 photorealistic, cinematic looping video clips from 3x3 storyboard:
 *   1. 03a-earth-from-space.mp4       (Row 0: Beginning, Middle, End)
 *   2. 03b-ocean-sunset.mp4           (Row 1: Beginning, Middle, End)
 *   3. 03c-green-mountain-valley.mp4  (Row 2: Beginning, Middle, End)
 *
 * Standards:
 *   - Native 16:9 Landscape: 1920x1080 @ 24 fps
 *   - Target duration: ~9.0 seconds (within 8–10s range)
 *   - Subtle, realistic camera movement preserving original compositions
 *   - Smooth 0.8s xfade dissolves between sequence panels
 *   - 0.40s seam crossfade for seamless infinite looping
 *   - Contact sheets & SSIM verification generated automatically
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FFPROBE = "/opt/homebrew/bin/ffprobe";

const HIGHRES_DIR = path.join(ROOT, "scratch/storyboard_panels/highres");
const OUT_DIR = path.join(ROOT, "scratch/surah_114_video3");
const WORK_DIR = path.join(OUT_DIR, "temp");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(WORK_DIR, { recursive: true });

const SCENES = [
  {
    id: "03a",
    filename: "03a-earth-from-space.mp4",
    title: "Earth from Space",
    surah: 114,
    ayahs: "5–6",
    row: 0,
    cameraPrompt: "Slow orbital lateral drift with subtle forward push along Earth's curvature",
    // 2K input is 2560x1440, output is 1920x1080
    // Pan slightly horizontally from left to right to emulate orbital travel
    motionExpressions: {
      p1: "zoompan=z='min(zoom+0.0004,1.05)':x='(iw-iw/zoom)*(0.3+0.3*on/82)':y='(ih-ih/zoom)*0.5':d=82:s=1920x1080:fps=24",
      p2: "zoompan=z='min(zoom+0.0004,1.05)':x='(iw-iw/zoom)*(0.4+0.3*on/82)':y='(ih-ih/zoom)*0.5':d=82:s=1920x1080:fps=24",
      p3: "zoompan=z='min(zoom+0.0004,1.05)':x='(iw-iw/zoom)*(0.5+0.3*on/82)':y='(ih-ih/zoom)*0.5':d=82:s=1920x1080:fps=24",
      pReturn: "zoompan=z='min(zoom+0.0004,1.05)':x='(iw-iw/zoom)*(0.3+0.1*on/39)':y='(ih-ih/zoom)*0.5':d=39:s=1920x1080:fps=24",
    },
  },
  {
    id: "03b",
    filename: "03b-ocean-sunset.mp4",
    title: "Ocean at Sunset",
    surah: 114,
    ayahs: "5–6",
    row: 1,
    cameraPrompt: "Low-altitude oceanic tracking glide with gentle organic wave sway and subtle push towards setting sun",
    motionExpressions: {
      p1: "zoompan=z='min(zoom+0.0005,1.06)':x='(iw-iw/zoom)*(0.5+0.1*sin(2*3.1415*on/82))':y='(ih-ih/zoom)*(0.5+0.08*cos(2*3.1415*on/82))':d=82:s=1920x1080:fps=24",
      p2: "zoompan=z='min(zoom+0.0005,1.06)':x='(iw-iw/zoom)*(0.5+0.1*sin(2*3.1415*on/82))':y='(ih-ih/zoom)*(0.5+0.08*cos(2*3.1415*on/82))':d=82:s=1920x1080:fps=24",
      p3: "zoompan=z='min(zoom+0.0005,1.06)':x='(iw-iw/zoom)*(0.5+0.1*sin(2*3.1415*on/82))':y='(ih-ih/zoom)*(0.5+0.08*cos(2*3.1415*on/82))':d=82:s=1920x1080:fps=24",
      pReturn: "zoompan=z='min(zoom+0.0005,1.06)':x='(iw-iw/zoom)*(0.5+0.1*sin(2*3.1415*on/39))':y='(ih-ih/zoom)*(0.5+0.08*cos(2*3.1415*on/39))':d=39:s=1920x1080:fps=24",
    },
  },
  {
    id: "03c",
    filename: "03c-green-mountain-valley.mp4",
    title: "Green Mountain Valley",
    surah: 114,
    ayahs: "5–6",
    row: 2,
    cameraPrompt: "Forward tracking dolly shot gliding down the alpine valley corridor along the river",
    motionExpressions: {
      p1: "zoompan=z='min(zoom+0.0006,1.07)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.55':d=82:s=1920x1080:fps=24",
      p2: "zoompan=z='min(zoom+0.0006,1.07)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.55':d=82:s=1920x1080:fps=24",
      p3: "zoompan=z='min(zoom+0.0006,1.07)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.55':d=82:s=1920x1080:fps=24",
      pReturn: "zoompan=z='min(zoom+0.0006,1.07)':x='iw/2-(iw/zoom/2)':y='(ih-ih/zoom)*0.55':d=39:s=1920x1080:fps=24",
    },
  },
];

async function renderScene(scene) {
  console.log(`\n🎬 [${scene.id}] Starting render: ${scene.title} (${scene.filename})`);
  const r = scene.row;
  const p1Img = path.join(HIGHRES_DIR, `panel_r${r}_c0_2k.png`);
  const p2Img = path.join(HIGHRES_DIR, `panel_r${r}_c1_2k.png`);
  const p3Img = path.join(HIGHRES_DIR, `panel_r${r}_c2_2k.png`);

  const seg1Path = path.join(WORK_DIR, `${scene.id}_seg1.mp4`);
  const seg2Path = path.join(WORK_DIR, `${scene.id}_seg2.mp4`);
  const seg3Path = path.join(WORK_DIR, `${scene.id}_seg3.mp4`);
  const segReturnPath = path.join(WORK_DIR, `${scene.id}_segReturn.mp4`);
  const assembledRawPath = path.join(WORK_DIR, `${scene.id}_raw_master.mp4`);
  const finalLoopPath = path.join(OUT_DIR, scene.filename);

  // 1. Render Segment 1 (Panel 1: Beginning, 82 frames = ~3.42s)
  console.log(`  1. Rendering Segment 1 (Panel 1: Beginning)...`);
  let res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-loop", "1",
      "-i", p1Img,
      "-vf", scene.motionExpressions.p1,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-t", "3.417",
      seg1Path,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Segment 1 failed: ${res.stderr}`);

  // 2. Render Segment 2 (Panel 2: Middle, 82 frames = ~3.42s)
  console.log(`  2. Rendering Segment 2 (Panel 2: Middle)...`);
  res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-loop", "1",
      "-i", p2Img,
      "-vf", scene.motionExpressions.p2,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-t", "3.417",
      seg2Path,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Segment 2 failed: ${res.stderr}`);

  // 3. Render Segment 3 (Panel 3: End, 82 frames = ~3.42s)
  console.log(`  3. Rendering Segment 3 (Panel 3: End)...`);
  res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-loop", "1",
      "-i", p3Img,
      "-vf", scene.motionExpressions.p3,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-t", "3.417",
      seg3Path,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Segment 3 failed: ${res.stderr}`);

  // 4. Render Segment Return (Panel 1 Return, 39 frames = ~1.62s)
  console.log(`  4. Rendering Segment Return (Panel 1: Loop Reference)...`);
  res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-loop", "1",
      "-i", p1Img,
      "-vf", scene.motionExpressions.pReturn,
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-t", "1.625",
      segReturnPath,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Segment Return failed: ${res.stderr}`);

  // 5. Assemble with smooth 0.8s xfade dissolves:
  // Offset 1: 3.417 - 0.8 = 2.617s
  // Offset 2: 2.617 + 3.417 - 0.8 = 5.234s
  // Offset 3: 5.234 + 3.417 - 0.8 = 7.851s
  // Total raw duration = 7.851 + 1.625 = 9.476s
  console.log(`  5. Assembling with 0.8s organic xfade dissolves...`);
  const filterGraph = [
    `[0:v][1:v]xfade=transition=fade:duration=0.8:offset=2.617[v01]`,
    `[v01][2:v]xfade=transition=fade:duration=0.8:offset=5.234[v02]`,
    `[v02][3:v]xfade=transition=fade:duration=0.8:offset=7.851[vOut]`,
  ].join(";");

  res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-i", seg1Path,
      "-i", seg2Path,
      "-i", seg3Path,
      "-i", segReturnPath,
      "-filter_complex", filterGraph,
      "-map", "[vOut]",
      "-c:v", "libx264",
      "-preset", "slow",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      assembledRawPath,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Assembly failed: ${res.stderr}`);

  // Probe raw assembled video
  const probeRaw = JSON.parse(
    spawnSync(
      FFPROBE,
      [
        "-v", "error",
        "-show_entries", "format=duration,size:stream=width,height,r_frame_rate,nb_frames",
        "-of", "json",
        assembledRawPath,
      ],
      { encoding: "utf8" }
    ).stdout
  );
  const rawDur = Number(probeRaw.format.duration);
  console.log(`  ✓ Raw assembled duration: ${rawDur.toFixed(3)}s`);

  // 6. Apply canonical 0.40s seamless loop crossfade
  // Trim tail and crossfade onto head so frame 0 and frame end loop with zero artifact
  console.log(`  6. Applying 0.40s seamless loop crossfade...`);
  const overlapSec = 0.40;
  const cut = (rawDur - overlapSec).toFixed(3);
  const loopGraph = [
    `[0:v]scale=1920:1080:flags=lanczos,split=2[v1][v2]`,
    `[v1]trim=start=${overlapSec}:end=${rawDur},setpts=PTS-STARTPTS[body]`,
    `[v2]trim=start=0:end=${overlapSec},setpts=PTS-STARTPTS[head]`,
    `[0:v]scale=1920:1080:flags=lanczos,trim=start=${cut}:end=${rawDur},setpts=PTS-STARTPTS[tail]`,
    `[tail][head]xfade=transition=fade:duration=${overlapSec}:offset=0[seam]`,
    `[body][seam]concat=n=2:v=1:a=0[outv]`,
  ].join(";");

  res = spawnSync(
    FFMPEG,
    [
      "-y",
      "-i", assembledRawPath,
      "-filter_complex", loopGraph,
      "-map", "[outv]",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      "-preset", "slow",
      "-crf", "18",
      "-movflags", "+faststart",
      "-an",
      finalLoopPath,
    ],
    { encoding: "utf8" }
  );
  if (res.status !== 0) throw new Error(`Seamless loop creation failed: ${res.stderr}`);

  // 7. Probe final video & measure loop SSIM
  const probeFinal = JSON.parse(
    spawnSync(
      FFPROBE,
      [
        "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,pix_fmt",
        "-of", "json",
        finalLoopPath,
      ],
      { encoding: "utf8" }
    ).stdout
  );

  const stream = probeFinal.streams[0];
  const finalDur = Number(probeFinal.format.duration);
  const sizeMB = (Number(probeFinal.format.size) / (1024 * 1024)).toFixed(2);
  const bitrateKbps = Math.round(Number(probeFinal.format.bit_rate) / 1000);

  // Extract head frame and tail frame to measure seam SSIM
  const qaDir = path.join(OUT_DIR, "qa_" + scene.id);
  fs.mkdirSync(qaDir, { recursive: true });
  const headFrame = path.join(qaDir, "frame_head.png");
  const tailFrame = path.join(qaDir, "frame_tail.png");

  spawnSync(FFMPEG, ["-y", "-ss", "0.0", "-i", finalLoopPath, "-vframes", "1", headFrame]);
  spawnSync(FFMPEG, ["-y", "-sseof", "-0.05", "-i", finalLoopPath, "-vframes", "1", tailFrame]);

  const ssimProc = spawnSync(
    FFMPEG,
    ["-i", headFrame, "-i", tailFrame, "-lavfi", "ssim", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const ssimMatch = (ssimProc.stderr || "").match(/All:([0-9.]+)/);
  const seamSSIM = ssimMatch ? Number(ssimMatch[1]) : null;

  // Generate 2x2 Contact Sheet (t=0s, t=2.5s, t=5.5s, t=end)
  const f0 = headFrame;
  const f2 = path.join(qaDir, "frame_2s.png");
  const f5 = path.join(qaDir, "frame_5s.png");
  const fTail = tailFrame;
  spawnSync(FFMPEG, ["-y", "-ss", "2.5", "-i", finalLoopPath, "-vframes", "1", f2]);
  spawnSync(FFMPEG, ["-y", "-ss", "5.5", "-i", finalLoopPath, "-vframes", "1", f5]);

  const contactSheetPath = path.join(OUT_DIR, `contact_sheet_${scene.id}.png`);
  spawnSync(FFMPEG, [
    "-y",
    "-i", f0,
    "-i", f2,
    "-i", f5,
    "-i", fTail,
    "-filter_complex",
    "[0:v]scale=960:540[v0];[1:v]scale=960:540[v1];[2:v]scale=960:540[v2];[3:v]scale=960:540[v3];[v0][v1]hstack[top];[v2][v3]hstack[bottom];[top][bottom]vstack",
    "-q:v", "2",
    contactSheetPath,
  ]);

  console.log(`  ✓ Render Complete: ${finalLoopPath}`);
  console.log(`    • Duration:    ${finalDur.toFixed(2)}s (Target: 8–10s)`);
  console.log(`    • Resolution:  ${stream.width}x${stream.height} (16:9)`);
  console.log(`    • Frame Rate:  ${stream.r_frame_rate} fps`);
  console.log(`    • Codec:       ${stream.codec_name} (${stream.pix_fmt})`);
  console.log(`    • Size:        ${sizeMB} MB (${bitrateKbps} kbps)`);
  console.log(`    • Seam SSIM:   ${seamSSIM ? seamSSIM.toFixed(4) : "N/A"} (Seam continuity)`);
  console.log(`    • Contact:     ${contactSheetPath}`);

  return {
    id: scene.id,
    filename: scene.filename,
    title: scene.title,
    path: finalLoopPath,
    duration: finalDur,
    width: stream.width,
    height: stream.height,
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    pixFmt: stream.pix_fmt,
    sizeMB,
    bitrateKbps,
    seamSSIM,
    contactSheetPath,
  };
}

async function main() {
  console.log("======================================================================");
  console.log("🕌 HuDa Web Quran — Surah An-Nas (114), Video 3, Ayahs 5–6");
  console.log("   Storyboard-Driven Cinematic Video Sequence Rendering");
  console.log("======================================================================");

  const results = [];
  for (const scene of SCENES) {
    const res = await renderScene(scene);
    results.push(res);
  }

  console.log("\n======================================================================");
  console.log("📊 Summary of Generated Clips");
  console.log("======================================================================");
  console.table(
    results.map((r) => ({
      ID: r.id,
      Scene: r.title,
      File: r.filename,
      Duration: `${r.duration.toFixed(2)}s`,
      Resolution: `${r.width}x${r.height}`,
      FPS: r.fps,
      Size: `${r.sizeMB} MB`,
      "Seam SSIM": r.seamSSIM ? r.seamSSIM.toFixed(4) : "N/A",
    }))
  );

  // Write machine-readable manifest
  const manifestPath = path.join(OUT_DIR, "production_manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Manifest saved to: ${manifestPath}`);
}

main().catch((err) => {
  console.error("❌ Rendering error:", err);
  process.exit(1);
});
