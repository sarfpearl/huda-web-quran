import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";

const CHAPTER_9_SUBCHAPTERS = [
  {
    id: "09a",
    name: "09a-ayat-al-kursi-universal-sustenance-and-boundless-cosmos",
    verses: "255 (ONLY)",
    theme: "Ayat al-Kursi: Universal Sustenance & The Boundless Cosmos (Hero 1 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary landscape cinematography shot of an immense but physically believable high-desert plateau in the Arabian Shield beneath a naturally dark night sky. " +
      "Sparse stars and, only if naturally visible, a faint Milky Way band appear with restrained real-world astrophotographic exposure. " +
      "Subtle sidereal drift is perceptible across the shot while the ancient granite bedrock remains visually stable and physically grounded beneath the sky. " +
      "A very faint natural pre-dawn tonal change develops at the distant horizon. " +
      "The point of view steadily ascends from two meters over the weathered granite bedrock upward toward fifteen meters, revealing the vast relationship between earth and the quiet sky. " +
      "Completely clean, unobstructed, borderless edge-to-edge 16:9 full-screen frame. No black bars, no pillarboxing, no letterboxing. " +
      "No exaggerated Milky Way, no giant galaxy band, no nebulae, no colorful cosmic clouds, no space-VFX look, no celestial portals, no fantasy starscape, no astrophotography timelapse exaggeration. " +
      "No humans, no angels, no thrones, no chairs, no cosmic throne rooms, no glowing figures, no Arabic calligraphy, no floating text, no logos."
    ),
  },
  {
    id: "09b",
    name: "09b-the-firm-handhold-and-darkness-to-light",
    verses: "256–257",
    theme: "The Firm Handhold & The Passage from Darkness to Light",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema ground-level tracking shot moving steadily through a towering natural sandstone and granite gorge in Western Arabia in early morning. " +
      "The camera begins in genuine, cool natural rock shadow on solid bedrock, moving forward in realistic dolly motion through the narrow passage. " +
      "The camera exits the shadowed stone corridor out into an expansive, sun-drenched alluvial desert valley bathed in warm, brilliant natural morning daylight. " +
      "Cool morning air breeze stirring fine natural dust; desert scrub swaying naturally in the open sunlit valley. " +
      "Completely clean, unobstructed, borderless edge-to-edge 16:9 full-screen frame. No black bars, no letterboxing. " +
      "No magical darkness, no glowing handholds, no luminous ropes, no supernatural light beams, no dark entities, no fantasy effects, no humans, no text, no logos."
    ),
  },
  {
    id: "09c",
    name: "09c-the-sovereign-horizon-and-irresistible-dawn",
    verses: "258 (ONLY)",
    theme: "The Sovereign Horizon & The Irresistible Dawn",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema locked wide shot looking directly toward a true eastern desert horizon in Western Arabia as the radiant morning sun physically crests over distant layered mountain ridges. " +
      "Authentic low-angle sunrise with restrained natural optical behavior. Preserve natural highlight roll-off and atmospheric haze without stylized lens flare, sunburst, bloom, or artificial rays. " +
      "Direct morning sun casts long, realistic natural shadows across the expansive desert terrain, with subtle natural thermal shimmer near the desert floor. " +
      "Very slow, dignified tripod-based tilt and subtle forward push, grounding the majestic sunrise into solid unyielding desert rock. " +
      "Completely clean, unobstructed, borderless edge-to-edge 16:9 full-screen frame. No black bars, no letterboxing. " +
      "No cinematic flare overlays, no exaggerated sun star, no synthetic god rays, no hyper-HDR sunrise, no solar explosions, no humans, no kings, no thrones, no text, no logos."
    ),
  },
  {
    id: "09d",
    name: "09d-the-silent-ruins-and-renewal-across-time",
    verses: "259 (ONLY)",
    theme: "The Silent Ruins & The Renewal of Life across Time",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A grounded documentary cinema tracking shot moving slowly at 1.2 meters height through ancient collapsed mudbrick and dry-stone settlement remains in an arid desert wadi. " +
      "Weathered stone walls, fallen weathered roof timbers, dust-filled rooms, cracked clay surfaces, and long-term erosion communicate stillness, abandonment, and the passage of time. " +
      "A small amount of naturally returning life appears quietly within the ruins: sparse wild grass, tiny desert shoots pushing through clay, slight moisture darkening a few stones, and a modest natural water trickle. " +
      "Warm natural afternoon sunlight casting realistic shadows across weathered masonry and cracked clay soil. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame. No black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No lush oasis, no sudden vegetation explosion, no magical greening, no time-lapse VFX, no skeletons, no skulls, no bones, no corpses, no dead animals, no zombies, no horror, no supernatural resurrection imagery, no humans, no text, no logos."
    ),
  },
  {
    id: "09e",
    name: "09e-the-gathering-at-the-heights-and-certainty",
    verses: "260 (ONLY)",
    theme: "The Gathering at the Heights & Heartfelt Certainty (Hero 2 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary cinematic stabilized camera view gliding smoothly with slow forward movement and gentle elevation through dramatic granite mountain peaks and deep ravines in Western Arabia at late golden hour. " +
      "Several small groups of ordinary native desert birds begin at separate distant rocky crags and ridgelines. " +
      "As the view progresses through the mountain environment, the birds independently take flight and gradually converge into the same broad airspace through realistic wind and flocking behavior. " +
      "Their gathering remains irregular, organic, and biologically plausible with natural wing variation and wind response under warm low-angle sunlight. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame. No camera equipment, no lens hood, no corner vignetting, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No perfect V formation, no synchronized swarm, no geometric flock patterns, no birds flying directly at the camera, no magical calling effect, no glowing birds, no supernatural movement, no dismemberment or reassembly, no humans, no text, no logos."
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
  };
}

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Generating [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   Clean Borderless Frame + Documentary Realism`);
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
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const targetId = process.argv[2]?.toLowerCase();
  const subchaptersToRun = targetId
    ? CHAPTER_9_SUBCHAPTERS.filter((s) => s.id === targetId)
    : CHAPTER_9_SUBCHAPTERS;

  if (subchaptersToRun.length === 0) {
    console.error(`Unknown subchapter ID: ${targetId}`);
    process.exit(1);
  }

  const results = [];
  for (const sub of subchaptersToRun) {
    const res = await generateSubchapter(ai, sub);
    results.push(res);
  }

  const summaryPath = path.join(OUTPUT_DIR, `chapter_9_generation_results_${targetId || "all"}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Generation step complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Chapter 9 Generation Error:", err);
  process.exit(1);
});
