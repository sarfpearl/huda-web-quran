import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

fs.mkdirSync(QA_DIR, { recursive: true });

const CHAPTER_10_SUBCHAPTERS = [
  {
    id: "10a",
    name: "10a-the-grain-of-bounty-and-multiplied-harvest",
    verses: "261 (ONLY)",
    theme: "The Grain of Bounty & The Multiplied Harvest (Hero 1 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A majestic, authentic documentary landscape cinematography view of a vast, densely planted mature golden wheat field in a fertile agricultural valley in late afternoon. " +
      "The point of view begins at low height just above the heavy, ripe ears of golden grain and smoothly ascends with dignified physical travel to 8 meters, pushing forward across the rolling expanse. " +
      "Natural breeze moves in visible rippling waves across hundreds of thousands of mature wheat stalks, with dry husks, individual whiskers, and soil dust catching the warm low-angle golden sunlight. " +
      "The horizon reveals distant sun-warmed mountain ridges beneath a tranquil, clear sky, communicating vast organic abundance and physical scale. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame. No film borders, no black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no hands, no seed germination time-lapse, no accelerated plant growth, no CGI botanical metamorphosis, no floating gold particles, no glowing lights, no fantasy effects."
    ),
  },
  {
    id: "10b",
    name: "10b-the-barren-bedrock-and-washed-silt",
    verses: "262–264",
    theme: "The Barren Bedrock & The Washed Silt",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A grounded geological documentary cinema study of a smooth, flat limestone slab in an arid desert wadi bed covered with a thin, delicate deposit of dry desert silt. " +
      "A sudden natural desert rain downpour washes across the flat rock plane, with discrete heavy raindrops impacting the sediment. " +
      "Natural surface water runoff sheets across the limestone, lifting and carrying away the loose silt in miniature mud streams, revealing the clean, slick, bare bedrock underneath that retains zero moisture or soil. " +
      "Steady, restrained forward dolly glide at low angle across the rock plane under an overcast slate-grey desert sky. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame. No black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No humans, no faces, no rich/poor tropes, no split-screen graphics, no supernatural storm effects, no fantasy elements."
    ),
  },
  {
    id: "10c",
    name: "10c-the-elevated-garden-and-vulnerability-of-loss",
    verses: "265–266",
    theme: "The Elevated Garden & The Vulnerability of Loss (Hero 2 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A continuous documentary cinematography shot of an ancient terraced mountain oasis garden in Western Arabia. " +
      "The scene begins in a flourishing elevated stone terrace where mature date palms, grapevines, and native pomegranate foliage catch gentle morning mist and fine drizzle, with clear water trickling through authentic dry-stone irrigation runnels. " +
      "As the camera slowly glides forward along the terrace wall, the ambient weather naturally transitions to drier conditions and a steady desert breeze progressively strengthens across the ridge. " +
      "Wind is communicated realistically and subtly through progressive palm-frond bending, gentle sway of smaller foliage, and faint, sparse natural dust skimming low along the distant arid ridge. " +
      "Completely clean, unobstructed, borderless edge-to-edge full frame. Natural clear atmospheric perspective over the distant mountains. " +
      "No black bars, no letterboxing, no pillarboxing, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No thick dust storm, no flying clouds of debris, no mid-air floating particles, no popping leaves, no CGI particle system, no explosions, no fire, no apocalypse, no vortex, no humans, no text."
    ),
  },
  {
    id: "10d",
    name: "10d-good-provision-and-generous-giving",
    verses: "267–274",
    theme: "Good Provision & Generous Giving (Standard 1080p)",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "An authentic documentary camera tracking shot moving through a traditional sunlit agricultural courtyard in Western Arabia during late afternoon. " +
      "The camera glides at low-to-medium height across hand-woven palm-fiber baskets filled with naturally irregular sun-cured dates, sacks of clean golden wheat grain, and rustic earthenware clay jars resting on weathered stone. " +
      "As the camera slowly pushes forward with organic physical inertia, the frame expands to reveal a modest, sunlit stone courtyard with abundant, wholesome harvested agricultural produce neatly arranged for sharing. " +
      "Warm natural directional daylight casts soft organic shadows, highlighting genuine textures of porous clay, woven reed fiber, and earthy stone without commercial styling. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No commercial food styling, no supermarket perfection, no modern packaging, no polished plates, no hands, no beggars, no coins, no money bags, no demons, no dark smoke, no supernatural effects, no humans, no text."
    ),
  },
  {
    id: "10e",
    name: "10e-lawful-trade-riba-and-final-return",
    verses: "275–281",
    theme: "Lawful Trade, Riba Warning, Accountability & Final Return (Standard 1080p)",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "An authentic documentary camera tracking shot beginning inside an open, sunlit historical stone caravanserai trade courtyard where honest trade goods like raw wool bundles, grain sacks, and earthen pottery rest in spacious order under natural daylight. " +
      "The camera pushes forward through a stone portal into an increasingly narrow, austere corridor of dry cracked ground and weathered stone walls, creating a tangible sense of moral constriction and solemn restraint. " +
      "The view steadily emerges out toward a vast, expansive desert horizon beneath an enormous, quiet twilight sky, conveying profound accountability, moral gravity, and the final return of all affairs to the Creator. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. Natural atmospheric perspective. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No hellfire, no demons, no burning money, no banknotes, no coins, no modern banking, no credit cards, no fantasy vortex, no magical darkness, no humans, no text."
    ),
  },
  {
    id: "10f",
    name: "10f-the-sacred-trust-and-debt-record",
    verses: "282–283",
    theme: "Ayat al-Dayn — The Sacred Trust & Debt Record (Hero 3 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A quiet, authentic documentary tracking shot inside a historical stone scriptorium and record-keeping chamber in ancient Western Arabia lit by soft, directional natural daylight from a high stone window. " +
      "On a worn dark cedarwood table rests an unrolled natural sheepskin parchment with a completely blank, clean, softly out-of-focus surface without readable marks, alongside a hand-carved clay inkwell, a naturally cut reed pen, clay sealing tokens, a securely crafted wooden document storage chest, and a precision-crafted aged bronze balance scale resting in perfect equilibrium. " +
      "Slow, steady table-height slider tracking movement gliding with natural camera inertia across the tactile textures of organic parchment fibers, weathered wood grain, and clay seals, settling in quiet visual balance with the level bronze scale. " +
      "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame. Natural architectural depth. " +
      "No black bars, no letterboxing, no pillarboxing, no black bands, no top bar, no bottom bar, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no frame corners, no numbers, no symbols, no text, no logos. " +
      "No readable Arabic text, no pseudo-Arabic calligraphy, no fake scripture, no glowing objects, no supernatural light, no modern pens, no modern banking, no coins, no banknotes, no human hands, no scribes, no humans, no deity representation."
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
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      console.log("Waiting 10s before retry...");
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

function processAndEncode(sub, rawMasterPath, operationId) {
  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${rawMasterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const totalDuration = Number(probe.format?.duration || sub.duration);

  console.log(`  • Raw Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Raw Duration:   ${totalDuration.toFixed(2)}s`);
  console.log(`  • Codec/FPS:      ${stream.codec_name} @ ${stream.r_frame_rate}`);

  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  const overlap = 0.6;
  const cutPoint = (totalDuration - overlap).toFixed(3);

  console.log(`3. Encoding seamless loop with ${overlap}s subtle overlap crossfade...`);

  if (sub.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${sub.name}-1080p.mp4`);

    const filterGraph4K = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
    execSync(
      `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph4K}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 20 -movflags +faststart -an "${web4KPath}"`,
      { stdio: "ignore" }
    );

    const filterGraph1080p = `[0:v]scale=1920:1080:flags=lanczos,split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]scale=1920:1080:flags=lanczos,trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
    execSync(
      `ffmpeg -y -i "${rawMasterPath}" -filter_complex "${filterGraph1080p}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${fallback1080Path}"`,
      { stdio: "ignore" }
    );

    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    const filterGraph1080p = `[0:v]split=2[v1][v2];[v1]trim=start=${overlap}:end=${totalDuration},setpts=PTS-STARTPTS[body];[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];[0:v]trim=start=${cutPoint}:end=${totalDuration},setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
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
    ? CHAPTER_10_SUBCHAPTERS.filter((s) => s.id === targetId)
    : CHAPTER_10_SUBCHAPTERS;

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

  const summaryPath = path.join(OUTPUT_DIR, `chapter_10_generation_results_${targetId || "all"}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Generation step complete! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Chapter 10 Generation Error:", err);
  process.exit(1);
});
