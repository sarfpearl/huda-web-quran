#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Reusable Video Seam & Loop Validation Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Provides non-destructive video inspection, letterbox detection, seam frame
 * extraction, and loop seam SSIM measurement based on the project standard
 * established in scratch/video_pipeline_qa_report.md.
 *
 * Standard Specifications:
 *   - Approved crossfade duration: 0.35s – 0.40s (Default: 0.40s = 9.6 frames @ 24fps)
 *   - Video target: 1920x1080 @ 24fps, H.264 High Profile, yuv420p, audio stripped
 *   - Safety Mandate: NEVER overwrite source videos. All outputs must go to
 *     isolated destinations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const DEFAULT_OVERLAP_SEC = 0.40;
export const APPROVED_OVERLAP_RANGE = { min: 0.35, max: 0.40 };

/**
 * Safely probes a video file for streams, duration, and encoding metadata.
 */
export function probeVideo(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const proc = spawnSync(
    "ffprobe",
    [
      "-v", "error",
      "-show_entries", "format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name,codec_type,pix_fmt",
      "-of", "json",
      filePath,
    ],
    { encoding: "utf8" }
  );
  if (proc.status !== 0 || !proc.stdout) {
    throw new Error(`ffprobe failed for ${filePath}: ${proc.stderr || proc.error?.message}`);
  }
  const data = JSON.parse(proc.stdout);

  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");

  let fps = null;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
    fps = den ? +(num / den).toFixed(2) : null;
  }

  return {
    path: filePath,
    exists: true,
    sizeBytes: Number(data.format?.size || 0),
    sizeMB: +(Number(data.format?.size || 0) / (1024 * 1024)).toFixed(2),
    durationSec: Number(data.format?.duration || 0),
    durationFormatted: +(Number(data.format?.duration || 0)).toFixed(2),
    bitrateKbps: data.format?.bit_rate ? Math.round(Number(data.format.bit_rate) / 1000) : null,
    width: videoStream?.width || null,
    height: videoStream?.height || null,
    fps,
    codec: videoStream?.codec_name || null,
    pixFmt: videoStream?.pix_fmt || null,
    hasAudio: Boolean(audioStream),
    audioCodec: audioStream?.codec_name || null,
  };
}

/**
 * Runs cropdetect to check if active pixels fill the full 16:9 canvas.
 * Returns crop coordinates or null if no letterboxing detected.
 */
export function detectLetterbox(filePath, sampleDurationSec = 3, limit = 6) {
  if (!fs.existsSync(filePath)) return null;

  try {
    const proc = spawnSync(
      "ffmpeg",
      [
        "-i", filePath,
        "-vf", `cropdetect=${limit}:16:0`,
        "-f", "null",
        "-t", String(sampleDurationSec),
        "-",
      ],
      { encoding: "utf8" }
    );
    const out = proc.stderr || "";
    const matches = [...out.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
    const last = matches.pop();
    if (!last) return null;

    const crop = {
      w: Number(last[1]),
      h: Number(last[2]),
      x: Number(last[3]),
      y: Number(last[4]),
    };

    // If active height is less than 95% of nominal height, hard black bars are present
    const p = probeVideo(filePath);
    if (p.height && crop.h < p.height * 0.95) {
      crop.isLetterboxed = true;
    } else {
      crop.isLetterboxed = false;
    }
    return crop;
  } catch (err) {
    return { error: err.message, isLetterboxed: false };
  }
}

/**
 * Constructs the canonical 0.40s crossfade filter graph.
 */
export function buildCrossfadeFilterGraph({
  duration,
  overlapSec = DEFAULT_OVERLAP_SEC,
  width = 1920,
  height = 1080,
  crop = null,
}) {
  const pre =
    crop && crop.isLetterboxed
      ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${width}:${height}:flags=lanczos,`
      : "";

  const cut = (duration - overlapSec).toFixed(3);

  return (
    `[0:v]${pre}scale=${width}:${height}:flags=lanczos,split=2[v1][v2];` +
    `[v1]trim=start=${overlapSec}:end=${duration},setpts=PTS-STARTPTS[body];` +
    `[v2]trim=start=0:end=${overlapSec},setpts=PTS-STARTPTS[head];` +
    `[0:v]${pre}scale=${width}:${height}:flags=lanczos,trim=start=${cut}:end=${duration},setpts=PTS-STARTPTS[tail];` +
    `[tail][head]xfade=transition=fade:duration=${overlapSec}:offset=0[seam];` +
    `[body][seam]concat=n=2:v=1:a=0[outv]`
  );
}

/**
 * Extracts key QA frames (t=0s, intermediate, and tail frame) for contact sheet / visual audit.
 */
export function extractSeamFrames(filePath, outputDir, prefix = "seam") {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const p = probeVideo(filePath);
  const dur = p.durationSec;

  const timestamps = [0, 2, 4, 6].filter((t) => t < dur);
  const extracted = {};

  for (const t of timestamps) {
    const framePath = path.join(outputDir, `${prefix}_${t}s.png`);
    spawnSync(
      "ffmpeg",
      ["-y", "-ss", String(t), "-i", filePath, "-vframes", "1", framePath],
      { stdio: "ignore" }
    );
    extracted[`t${t}`] = framePath;
  }

  // Last frame at duration - 0.05s
  const endPath = path.join(outputDir, `${prefix}_end.png`);
  spawnSync(
    "ffmpeg",
    ["-y", "-sseof", "-0.05", "-i", filePath, "-vframes", "1", endPath],
    { stdio: "ignore" }
  );
  extracted.tail = endPath;

  return extracted;
}

/**
 * Measures structural similarity (SSIM) between two frames using FFmpeg.
 */
export function measureSeamSSIM(framePathA, framePathB) {
  if (!fs.existsSync(framePathA) || !fs.existsSync(framePathB)) {
    return { ssim: null, error: "Frames missing" };
  }

  try {
    const proc = spawnSync(
      "ffmpeg",
      ["-i", framePathA, "-i", framePathB, "-lavfi", "ssim", "-f", "null", "-"],
      { encoding: "utf8" }
    );
    const ssimOut = proc.stderr || "";
    const m = ssimOut.match(/All:([0-9.]+)/);
    const r = ssimOut.match(/R:([0-9.]+)/);
    const g = ssimOut.match(/G:([0-9.]+)/);
    const b = ssimOut.match(/B:([0-9.]+)/);

    return {
      all: m ? Number(m[1]) : null,
      r: r ? Number(r[1]) : null,
      g: g ? Number(g[1]) : null,
      b: b ? Number(b[1]) : null,
    };
  } catch (err) {
    return { all: null, error: err.message };
  }
}

/**
 * Generates a 2x2 contact sheet from key temporal frames (t=0s, t=2s, t=4s, tail).
 * Returns contact sheet path, frame paths, and measured seam SSIM.
 */
export function generateContactSheet(filePath, outputImagePath, framesDir) {
  if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputImagePath), { recursive: true });

  const base = path.basename(filePath, ".mp4");
  const frames = extractSeamFrames(filePath, framesDir, base);
  const ssim = measureSeamSSIM(frames.t0, frames.tail);

  const t0 = frames.t0;
  const t2 = frames.t2 || frames.t0;
  const t4 = frames.t4 || frames.t2 || frames.t0;
  const tail = frames.tail;

  spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i", t0,
      "-i", t2,
      "-i", t4,
      "-i", tail,
      "-filter_complex",
      "[0:v]scale=960:540[v0];[1:v]scale=960:540[v1];[2:v]scale=960:540[v2];[3:v]scale=960:540[v3];[v0][v1]hstack[top];[v2][v3]hstack[bottom];[top][bottom]vstack",
      "-q:v", "2",
      outputImagePath,
    ],
    { stdio: "ignore" }
  );

  return {
    contactSheetPath: outputImagePath,
    seamSSIM: ssim,
    frames,
  };
}

/**
 * Non-destructive seamless loop creator.
 * Protects source video from being overwritten.
 */
export function createSeamlessLoop({
  inputPath,
  outputPath,
  overlapSec = DEFAULT_OVERLAP_SEC,
  dryRun = true,
}) {
  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }
  if (!outputPath) {
    throw new Error("Output path must be specified.");
  }
  if (path.resolve(inputPath) === path.resolve(outputPath)) {
    throw new Error("SAFETY VIOLATION: inputPath and outputPath cannot be identical.");
  }

  if (overlapSec < APPROVED_OVERLAP_RANGE.min || overlapSec > APPROVED_OVERLAP_RANGE.max) {
    throw new Error(
      `Invalid overlapSec: ${overlapSec}. Approved range is ${APPROVED_OVERLAP_RANGE.min}s - ${APPROVED_OVERLAP_RANGE.max}s.`
    );
  }

  const p = probeVideo(inputPath);
  const crop = detectLetterbox(inputPath);
  const graph = buildCrossfadeFilterGraph({
    duration: p.durationSec,
    overlapSec,
    width: p.width || 1920,
    height: p.height || 1080,
    crop,
  });

  const ffmpegArgs = [
    "-y",
    "-i", inputPath,
    "-filter_complex", graph,
    "-map", "[outv]",
    "-c:v", "libx264",
    "-profile:v", "high",
    "-pix_fmt", "yuv420p",
    "-preset", "medium",
    "-crf", "20",
    "-movflags", "+faststart",
    "-an",
    outputPath,
  ];

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      plannedCommand: `ffmpeg ${ffmpegArgs.join(" ")}`,
      inputDetails: p,
      overlapSec,
    };
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const proc = spawnSync("ffmpeg", ffmpegArgs, { stdio: "pipe" });
  if (proc.status !== 0) {
    throw new Error(`FFmpeg error: ${proc.stderr?.toString()}`);
  }

  const resultProbe = probeVideo(outputPath);
  return {
    success: true,
    dryRun: false,
    inputDetails: p,
    outputDetails: resultProbe,
    overlapSec,
  };
}

// CLI testing mode
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => !a.startsWith("--"));
  if (!fileArg) {
    console.log("Usage: node seam-processor.mjs <video-path> [--probe] [--letterbox]");
    process.exit(0);
  }
  const probe = probeVideo(fileArg);
  console.log("Probe Results:", JSON.stringify(probe, null, 2));
  if (args.includes("--letterbox")) {
    console.log("Letterbox Check:", JSON.stringify(detectLetterbox(fileArg), null, 2));
  }
}
