import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/Huda Bayan/public/videos/surah/002-al-baqarah";

const SUBCHAPTERS = [
  {
    id: "07a",
    name: "07a-unified-orientation-and-the-middle-community",
    verses: "142–152",
    theme: "Unified Orientation & The Middle Community",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema tripod pan across a rugged high-desert plateau in Western Arabia. " +
      "The camera begins low observing fine desert sand blowing across naturally angled sedimentary rock strata, " +
      "then executes a steady, deliberate horizontal pan and gentle push along the natural axis of a weathered bedrock ridge pointing across the desert floor toward an open mountain gap in the distant horizon. " +
      "Crisp, natural morning desert sunlight with low direct sun casting long, parallel natural shadows along the bedrock line. " +
      "Authentic atmospheric perspective, subtle wind blowing loose sand, natural rock fractures and imperfections. " +
      "Clean, borderless, unobstructed full-frame nature cinematography, neutral natural color grading. " +
      "No people, no compasses, no directional arrows, no religious architecture, no labels, no text, no logos."
    ),
  },
  {
    id: "07b",
    name: "07b-furnace-of-adversity-patience-and-return",
    verses: "153–157",
    theme: "The Furnace of Adversity, Patience & Return",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary ground-level tracking shot in a harsh, stony Arabian wadi basin. " +
      "Begins focused on the weathered, gnarled trunk and deep root system of a hardy desert acacia tree anchored firmly into cracked wadi bedrock during blowing desert wind and swirling dust. " +
      "The camera slowly pulls back and elevates as the wind subsides and the dust gently settles, revealing the solitary tree standing steadfast and resilient under a calm, clearing desert sky with soft natural sunlight resting upon its branches. " +
      "Natural lighting transition from warm dust haze to clear daylight, authentic bark texture, scattered loose pebbles, deep soil fissures. " +
      "Clean, borderless edge-to-edge frame, realistic physical dynamics. " +
      "No people, no faces, no silhouettes, no supernatural effects, no text, no logos."
    ),
  },
  {
    id: "07c",
    name: "07c-waymarks-of-guidance-vs-concealment",
    verses: "158–163",
    theme: "Waymarks of Guidance vs. Concealment",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary tracking shot moving through an authentic, rugged rocky desert pass in Western Arabia. " +
      "Two naturally prominent, weathered geological stone knolls stand on either side of a natural desert corridor, serving as clear natural waymarks across the landscape. " +
      "The camera glides steadily forward along the natural, unpaved stony passage between the two rocky formations toward a wide, sunlit desert valley ahead under an open sky. " +
      "Natural late-morning desert sunlight, authentic weathered rock strata, scattered scree, gentle wind moving fine dust. " +
      "Ordinary naturally occurring geological terrain, completely free of modern or religious structures. " +
      "Clean full-frame borderless documentary footage, neutral color science. " +
      "No people, no crowds, no ritual depiction, no buildings, no monuments, no text, no logos."
    ),
  },
  {
    id: "07d",
    name: "07d-living-symphony-of-cosmic-signs",
    verses: "164 (ONLY)",
    theme: "The Living Symphony of Cosmic Signs (Hero 1)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary-grade 8K cinema aerial shot capturing the interconnected natural signs of creation across a vast desert mountain landscape. " +
      "Dark, heavy natural rain clouds drift across rugged mountain ridges as realistic rainfall sweeps over parched desert slopes. " +
      "Water flows naturally through dry rocky wadi gullies, darkening the stones and awakening the soil, while mountain winds move clouds across shifting layers of the atmosphere. " +
      "The camera executes a continuous, majestic upward pedestal ascent and slow pullback, revealing a breathtaking, balanced natural relationship between the rain-swept earth below and the vast, dynamic sky above with sunbeams filtering naturally through cloud gaps. " +
      "Authentic fluid dynamics, natural storm lighting, realistic atmospheric perspective, rough wet rock textures. " +
      "Clean, unobstructed, borderless edge-to-edge frame. " +
      "No people, no CGI fantasy effects, no cosmic symbols, no glowing elements, no text, no logos."
    ),
  },
  {
    id: "07e",
    name: "07e-divergent-trails-and-false-allegiance",
    verses: "165–167",
    theme: "Divergent Trails & The Consequence of False Allegiance",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema tracking shot over a deeply eroded, barren desert badlands landscape. " +
      "The camera moves slowly over multiple naturally fractured silt gullies, dry washouts, and crumbling clay ridges that branch into unstable, impassable terrain. " +
      "As the camera drifts, the channels narrow and terminate in dry gravel depressions, crumbling drop-offs, and dead-end silt pockets. " +
      "The shot concludes on an exposed, empty, unresolved landscape of dry fractured earth under harsh, low-angle afternoon sun with stark natural shadows in the ravines. " +
      "Atmosphere of arid stillness and instability, fine dust crumbling from dry banks, authentic natural erosion. " +
      "Clean, borderless, full-frame documentary footage. " +
      "No people, no idols, no statues, no positive trails at the end, no supernatural effects, no text, no logos."
    ),
  },
  {
    id: "07f",
    name: "07f-wholesome-sustenance-and-discernment",
    verses: "168–176",
    theme: "Wholesome Sustenance & Discernment",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema slider shot moving along a modest, authentic traditional agricultural mountain terrace in the Arabian highlands. " +
      "Clear, clean mountain spring water trickles through simple, rough dry-stone irrigation channels, gently nourishing healthy, imperfect olive trees, wild herbs, and modest date palms rooted in rich, dark natural soil. " +
      "The camera glides smoothly past hand-laid terrace stones, observing the unembellished, honest cultivation and healthy edible plants under natural midday sun filtering through green leaves. " +
      "Gentle breeze swaying foliage, realistic water trickling, natural soil pebbles, authentic modest traditional agriculture without fantasy oasis exaggeration. " +
      "Clean, unobstructed, borderless edge-to-edge frame, natural color science. " +
      "No people, no food commercial styling, no modern equipment, no text, no logos."
    ),
  },
  {
    id: "07g",
    name: "07g-ayat-al-birr-comprehensive-righteousness",
    verses: "177 (ONLY)",
    theme: "Ayat al-Birr — Comprehensive Righteousness (Hero 2)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary-grade 8K cinema shot of an ancient, honest stone water well and distribution basin at an open crossroads on a vast desert plateau at dawn. " +
      "Begins focused on clear, calm water brimming inside the hand-cut stone well lip, then smoothly ascends and pulls back via a heavy jib to show water naturally spilling into rough stone troughs and channels, gently moistening the surrounding soil and sparse desert vegetation. " +
      "The shot opens to a wide, serene, grounded composition of the well standing resolute in the expansive, quiet landscape under the noble, clear golden light of the rising morning sun. " +
      "Authentic weathered masonry joints, worn rope grooves on stone rim, realistic water ripples, natural dawn sky gradient, peaceful morning atmosphere. " +
      "Clean, unobstructed, borderless edge-to-edge frame. " +
      "No people, no crowds, no travelers, no charity scenes, no glowing water, no artificial symbols, no text, no logos."
    ),
  },
];

function probeAndEncode(sub, masterPath, opId = "") {
  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${masterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const fmt = probe.format || {};

  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${Number(fmt.duration || sub.duration).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  if (sub.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${sub.name}-1080p.mp4`);

    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -c:a aac -b:a 192k "${web4KPath}"`,
      { stdio: "ignore" }
    );
    execSync(
      `ffmpeg -y -i "${masterPath}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${fallback1080Path}"`,
      { stdio: "ignore" }
    );
    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
      { stdio: "ignore" }
    );
  }

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || sub.duration);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_end.png`)}"`, { stdio: "ignore" });

  const stats = fs.statSync(masterPath);

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: sub.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: Number(fmt.duration || sub.duration).toFixed(2),
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    masterFile: masterPath,
    masterSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    defaultWebFile: defaultWebPath,
    operationId: opId,
    qaFrames: [
      path.join(qaDir, `${sub.name}_start.png`),
      path.join(qaDir, `${sub.name}_mid.png`),
      path.join(qaDir, `${sub.name}_end.png`),
    ],
  };
}

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   "REALITY FIRST, BEAUTY SECOND" (Documentary Realism)`);
  console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
  console.log(`======================================================================`);

  const masterPath = path.join(
    OUTPUT_DIR,
    sub.is4K ? `${sub.name}-4k-master.mp4` : `${sub.name}-1080p-master.mp4`
  );

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
  console.log(`2. Polling rendering progress (${sub.is4K ? "4K Standard" : "1080p Fast"})...`);

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

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(masterPath, buffer);
  console.log(`✓ Master saved: ${masterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  return probeAndEncode(sub, masterPath, operationId);
}

async function main() {
  console.log("======================================================================");
  console.log("  Huda Bayan — Al-Baqarah Chapter 7 (7A–7G) Production Pipeline");
  console.log("======================================================================");
  console.log(`Google Cloud Project: ${PROJECT_ID}`);
  console.log(`Location:             ${LOCATION}`);
  console.log("======================================================================");

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const results = [];
  for (const sub of SUBCHAPTERS) {
    const res = await generateSubchapter(ai, sub);
    results.push(res);
  }

  console.log("\n======================================================================");
  console.log("            AL-BAQARAH CHAPTER 7 GENERATION COMPLETED                 ");
  console.log("======================================================================");
  results.forEach((r) => {
    console.log(`\nSubchapter ${r.id.toUpperCase()}: ${r.name} (Verses ${r.verses})`);
    console.log(`  • Model:             ${r.model}`);
    console.log(`  • Target vs Native:  ${r.targetResolution.toUpperCase()} → ${r.nativeResolution}`);
    console.log(`  • Duration:          ${r.duration}s @ ${r.fps}`);
    console.log(`  • Master Size:       ${r.masterSizeMB} MB`);
    console.log(`  • Operation ID:      ${r.operationId}`);
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "chapter-7-report.json"),
    JSON.stringify({ projectId: PROJECT_ID, location: LOCATION, subchapters: results }, null, 2)
  );
}

main().catch((err) => {
  console.error("❌ Chapter 7 Pipeline Error:", err);
  process.exit(1);
});
