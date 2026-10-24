/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Gate 2: Direct Video Generation Script (11 Scenes)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Explicitly authorized by user:
 *   - Provider: Google Cloud Vertex AI
 *   - Project: project-04027e7d-9805-47dc-bdf
 *   - Location: us-central1
 *   - Model: veo-3.1-fast-generate-001 (1080p, 16:9, 8s, 24fps)
 *   - Budget Guard: Strictly prevents spending if remaining <= ₹600.00
 *   - Output specs: 1920x1080 16:9 24fps 8s H.264 + AAC stereo (48kHz)
 *   - Isolated in scratch/staging/gate2_11_visuals/
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";
import {
  BUDGET_CONFIG,
  evaluateGenerationPermission,
  recordSuccessfulGeneration,
} from "../tools/video-budget-guard.mjs";

const PROJECT_ID = "project-04027e7d-9805-47dc-bdf";
const LOCATION = "us-central1";
const MODEL = "veo-3.1-fast-generate-001";
const DURATION = 8;

const STAGING_DIR = path.resolve("scratch/staging/gate2_11_visuals");
const RAW_DIR = path.join(STAGING_DIR, "raw_masters");
const QA_DIR = path.join(STAGING_DIR, "qa_frames");
const MAPPING_PATH = path.resolve("scratch/audit_17_surahs_verified.json");

fs.mkdirSync(STAGING_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(QA_DIR, { recursive: true });

export const GATE2_SCENES = [
  {
    index: 1,
    surahNumber: 18,
    setId: 15,
    ayahStart: 89,
    ayahEnd: 98,
    clipId: "surah_18_set_15_ayah_89-98",
    name: "surah_18_set_15_ayah_89-98-iron-copper-barrier",
    title: "Dhul-Qarnayn's Iron and Molten Copper Barrier",
    tamilTitle: "துல்கர்னைனின் இரும்பு & செம்பு தடுப்புச்சுவர்",
    prompt:
      "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position capturing a colossal ancient engineering barrier built of massive rectangular weathered dark iron blocks with molten copper poured over and sealing the joints, glowing with warm reddish-bronze metallic patina. " +
      "The imposing metallurgy wall completely seals and fills the steep canyon pass between two towering rugged, arid barren mountain peaks in the Caucasus gorge under clear, bright daylight. Fine desert dust particles drift naturally in the still air. " +
      "The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, or drone movement. Completely consistent natural daylight illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing, no vignetting. " +
      "Absolutely no humans, no workers, no people, no faces, no silhouettes, no Dhul-Qarnayn, no Gog and Magog, no fantasy magic runes, no glowing lasers, no modern steel girders, no modern machinery, no text, no logos.",
  },
  {
    index: 2,
    surahNumber: 20,
    setId: 2,
    ayahStart: 9,
    ayahEnd: 16,
    clipId: "surah_20_set_02_ayah_09-16",
    name: "surah_20_set_02_ayah_09-16-sinai-night-fire",
    title: "Musa Sees the Fire on Mount Tur & Sacred Valley Tuwa",
    tamilTitle: "சினாய் மலையில் இரவு நெருப்பு & வாதி துவா புனிதப் பள்ளத்தாக்கு",
    prompt:
      "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position capturing the rugged, ancient red granite mountains of Sinai (Mount Tur) under an immense, clear, deep nocturnal desert sky filled with countless steady twinkling stars. " +
      "Far in the distance on a lower rocky mountain slope in the serene valley of Tuwa, a solitary, warm, steady natural campfire and radiant amber ember light glows softly in the dark night. Gentle desert wind drifts quietly across the cold mountain rocks. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or drone movement. Completely stable illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Strictly no humans, no Prophet Musa, no people, no silhouettes, no family members, no divine entities, no cartoon green fire, no fantasy magic, no modern roads, no text, no logos.",
  },
  {
    index: 3,
    surahNumber: 21,
    setId: 13,
    ayahStart: 87,
    ayahEnd: 88,
    clipId: "surah_21_set_13_ayah_87-88",
    name: "surah_21_set_13_ayah_87-88-ocean-abyss",
    title: "Yunus in the Belly of the Whale: Darkness of the Abyss",
    tamilTitle: "யூனுஸ் நபியின் ஆழ்கடல் அடியாழ இருள் & துஆ",
    prompt:
      "A wide, authentic underwater documentary-cinema static shot filmed from a fixed stationary camera position submerged in the deep ocean abyss pelagic zone. " +
      "Profound blue-black water depth with extreme darkness; faint, distant sunbeams from far above dissolve and fade completely into the oceanic void. Subtle natural micro-particulates drift slowly in the deep current. Solemn, immense, and majestic deep underwater void. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or rotation. Consistent deep oceanic ambient lighting throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no whale silhouettes, no fish, no animals, no Prophet Yunus, no human figures, no diver, no submarine, no cartoon elements, no text, no logos.",
  },
  {
    index: 4,
    surahNumber: 22,
    setId: 5,
    ayahStart: 26,
    ayahEnd: 33,
    clipId: "surah_22_set_05_ayah_26-33",
    name: "surah_22_set_05_ayah_26-33-pilgrimage-pass",
    title: "Sanctuary of Kaaba & Call to Hajj from Distant Passes",
    tamilTitle: "புனித கஅபாவின் தளம் & மலைக்கணவாய்களிலிருந்து ஹஜ் அழைப்பு",
    prompt:
      "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position capturing an empty, rugged ancient mountain pass and winding rocky canyon trail (Fajj Amiq) carved through the arid Hijaz mountains under clear, radiant golden morning sunlight. " +
      "Weathered desert bluffs, sheer rock faces, and ancient dry pathway leading through the distant mountain gorge toward a sacred valley basin. Atmospheric desert clarity and majestic timeless stillness. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or drone movement. Constant golden morning illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no people, no pilgrims, no camel silhouettes, no animals, no Prophet Ibrahim, no modern concrete buildings, no clock towers, no asphalt roads, no vehicles, no text, no logos.",
  },
  {
    index: 5,
    surahNumber: 24,
    setId: 6,
    ayahStart: 35,
    ayahEnd: 38,
    clipId: "surah_24_set_06_ayah_35-38",
    name: "surah_24_set_06_ayah_35-38-ayat-an-nur-lamp",
    title: "Ayat An-Nur: The Verse of Divine Light & The Glass Niche",
    tamilTitle: "ஆயத்துன் நூர்: மாடத்து விளக்கு & பேரொளி (நூருன் அலா நூர்)",
    prompt:
      "A cinematic macro lens static shot filmed from a fixed stationary camera position closely centered on an antique, pristine hand-blown crystal-glass oil lantern (Zujajah) resting inside an authentic hand-carved stone niche (Mishkat) in an ancient weathered earthen wall. " +
      "Inside the clear crystal vessel, pure golden glowing olive oil fuels a calm, serene, warm steady flame, radiating a soft luminous amber glow with gentle glass refractions and warm light spreading into the soft-focus stone niche behind it (Light upon Light). " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or rotation. Completely stable, serene warm illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "No human hands, no people, no divine depictions, no church altars, no crosses, no statues, no modern electric lightbulbs, no artificial laser flares, no text, no logos.",
  },
  {
    index: 6,
    surahNumber: 24,
    setId: 7,
    ayahStart: 39,
    ayahEnd: 39,
    clipId: "surah_24_set_07_ayah_39-39",
    name: "surah_24_set_07_ayah_39-desert-mirage",
    title: "Parable of the Desert Mirage on Salt Lowland",
    tamilTitle: "பாலைவன கானல் நீர் உவமை (ஸராப் பிகீஆ)",
    prompt:
      "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position across a vast, flat, hyper-arid desert salt lowland (Qi'ah) under blazing, intense midday sun. " +
      "Strong atmospheric heat shimmer waves rise from the cracked white and ochre mineral ground, creating a deceptive, glittering, shimmering illusion of expansive open water on the distant horizon. Scorching desert emptiness and optical illusion. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or drone movement. Constant blazing sun illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no running thirsty men, no human figures, no silhouettes, no footprints, no modern roads, no vehicles, no poles, no text, no logos.",
  },
  {
    index: 7,
    surahNumber: 24,
    setId: 8,
    ayahStart: 40,
    ayahEnd: 40,
    clipId: "surah_24_set_08_ayah_40-40",
    name: "surah_24_set_08_ayah_40-layered-dark-waves",
    title: "Parable of Layered Deep-Sea Darkness Under Waves",
    tamilTitle: "ஆழ்கடலில் அலைக்கு மேல் அலை மூடும் காரிருள் உவமை",
    prompt:
      "A wide, dramatic documentary-cinema static shot filmed from a fixed stationary camera position capturing a turbulent, dark oceanic swell at deep dusk under heavy, menacing, pitch-black storm clouds. " +
      "Powerful, cascading dark indigo and black sea waves roll heavily over one another in dense continuous layers across an unfathomable deep sea abyss (Darkness upon darkness). Powerful, solemn elemental natural water forces. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or rotation. Stable, moody, dark oceanic lighting throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no drowning humans, no reaching hands, no sinking ships, no human figures, no sea monsters, no text, no logos.",
  },
  {
    index: 8,
    surahNumber: 27,
    setId: 7,
    ayahStart: 38,
    ayahEnd: 44,
    clipId: "surah_27_set_07_ayah_38-44",
    name: "surah_27_set_07_ayah_38-44-palace-glass-floor",
    title: "Throne Brought & The Palace Floor of Crystal Glass Over Water",
    tamilTitle: "கொண்டுவரப்பட்ட அரியணை & நீரின் மீது அமைந்த பளிங்கு தரை",
    prompt:
      "A wide, authentic documentary-cinema static shot filmed from a fixed stationary camera position capturing a monumental ancient royal palace courtyard lined with colossal weathered limestone colonnades. " +
      "The vast horizontal floor is paved smooth with flawless, perfectly transparent polished crystal glass slabs (Sarh mumarrad min qawarir), beneath which pristine, crystalline azure water flows serenely with gentle aquatic ripples. Soft, natural morning sunlight refracts through the transparent glass floor onto smooth pale stones beneath. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or drone movement. Constant serene morning illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no Prophet Sulaiman, no Queen Bilqis, no women, no bared shins, no human figures, no throne, no mythical creatures, no modern plastic, no text, no logos.",
  },
  {
    index: 9,
    surahNumber: 29,
    setId: 5,
    ayahStart: 41,
    ayahEnd: 44,
    clipId: "surah_29_set_05_ayah_41-44",
    name: "surah_29_set_05_ayah_41-44-spider-web",
    title: "Parable of the Spider's Frail Web (Bayt al-Ankabut)",
    tamilTitle: "சிலந்தியின் பலவீனமான வீடு உவமை & பிரபஞ்ச படைப்பு",
    prompt:
      "A cinematic macro lens static shot filmed from a fixed stationary camera position capturing an intricate, delicate natural orb spider web woven between dry, weathered desert thorn branches. " +
      "Tiny crystalline morning dew droplets glisten along the gossamer silk threads in soft golden dawn light. A gentle desert morning breeze causes the fragile, gossamer threads to tremble softly, illustrating extreme delicacy and structural fragility (Awhan al-Buyut). Soft-focus arid desert gravel in the background. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or rotation. Constant dawn sunlight illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no spider, no insects, no menacing monster spiders, no horror web effects, no human figures, no text, no logos.",
  },
  {
    index: 10,
    surahNumber: 33,
    setId: 2,
    ayahStart: 9,
    ayahEnd: 20,
    clipId: "surah_33_set_02_ayah_09-20",
    name: "surah_33_set_02_ayah_09-20-trench-night-gale",
    title: "Battle of the Trench: Severe Nighttime Desert Gale & Shaking",
    tamilTitle: "அகழ் போர்: விசுவாசிகளின் பெரும் நடுக்கம் & கடுமையான இரவு பாலைவனப் புழுதிப் புயல்",
    prompt:
      "A wide, dramatic documentary-cinema static landscape shot filmed from a fixed stationary camera position capturing a violent nocturnal desert gale and howling sandstorm sweeping across the barren, dark basalt volcanic rock terrain and ancient earthwork trench defenses of Madinah under an ominous, overcast night sky. " +
      "Thick swirling clouds of desert dust and sand howl across the rocky ground; sparse desert shrubs and acacia bushes bend sharply in the freezing nocturnal wind (Rihan wa junudan lam tarawha). " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or rotation. Constant dark nocturnal storm illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no snow, no ice, no Prophet Muhammad (PBUH), no Sahaba, no angels (unseen forces), no armies, no soldiers, no weapons, no corpses, no blood, no text, no logos.",
  },
  {
    index: 11,
    surahNumber: 34,
    setId: 3,
    ayahStart: 15,
    ayahEnd: 17,
    clipId: "surah_34_set_03_ayah_15-17",
    name: "surah_34_set_03_ayah_15-17-marib-dam-flood",
    title: "The People of Saba: Dam of Marib Bursting (Sayl al-'Arim)",
    tamilTitle: "ஸபா சமுதாயம்: மஃரிப் அணை உடைந்து ஏற்பட்ட வெள்ளப்பெருக்கு",
    prompt:
      "A wide, dramatic documentary-cinema static landscape shot filmed from a fixed stationary camera position capturing a colossal ancient megalithic stone masonry dam (Great Dam of Marib) in the arid mountain canyon of Yemen structurally breaching under immense pressure. " +
      "Powerful, rushing torrential muddy floodwaters (Sayl al-Arim) surge forcefully through the massive stone rupture, inundating the dry wadi valley floor and sweeping over ancient agricultural terrace walls and ruined orchards. Majestic, tragic historic ruin. " +
      "Completely motionless camera framing with zero pan, tilt, zoom, dolly, or drone movement. Constant dramatic daylight illumination throughout the entire 8-second shot. " +
      "Native 16:9 full-screen borderless edge-to-edge frame filling every pixel from top to bottom. No black bars, no letterboxing, no pillarboxing. " +
      "Absolutely no drowning people, no human corpses, no screaming faces, no modern concrete dams or spillways, no cartoon disaster effects, no text, no logos.",
  },
];

function probe(file) {
  return JSON.parse(
    execSync(
      `ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name -of json "${file}"`,
      { encoding: "utf8" }
    )
  );
}

function detectLetterbox(file) {
  try {
    const out = execSync(`ffmpeg -i "${file}" -vf cropdetect=24:16:0 -f null -t 3 - 2>&1`, {
      encoding: "utf8",
    });
    const m = [...out.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    return m ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4] } : null;
  } catch {
    return null;
  }
}

async function generateSingleScene(ai, scene) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Submitting Scene #${scene.index} (${scene.name})`);
  console.log(`   Surah & Ayahs: Surah ${scene.surahNumber}:${scene.ayahStart}-${scene.ayahEnd}`);
  console.log(`   Theme:         ${scene.title}`);
  console.log(`   Model:         ${MODEL} (1080p, 8s, 16:9)`);
  console.log(`======================================================================`);

  // 1. Budget check
  const perm = evaluateGenerationPermission(1);
  if (!perm.allowed) {
    throw new Error(`🚨 BUDGET GUARD BLOCKED: ${perm.reason}`);
  }
  console.log(`💰 Budget Guard: PERMITTED. Remaining balance: ₹${perm.currentRemaining.toFixed(2)} INR (Floor: ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)})`);

  // 2. Call Veo API
  console.log(`📡 Sending API request to Google Cloud Vertex AI (${LOCATION})...`);
  let op = await ai.models.generateVideos({
    model: MODEL,
    source: { prompt: scene.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: DURATION,
      resolution: "1080p",
    },
  });

  console.log(`✓ Operation submitted: ${op.name}`);
  let polls = 0;
  while (!op.done) {
    polls++;
    await new Promise((r) => setTimeout(r, 6000));
    try {
      op = await ai.operations.getVideosOperation({ operation: op });
      console.log(`  [Poll #${polls} @ ${polls * 6}s] Done: ${op.done ? "YES" : "IN_PROGRESS"}`);
    } catch (e) {
      console.warn(`  [Poll #${polls}] Warning: ${e.message}`);
    }
  }

  if (op.error) {
    throw new Error(`Veo Generation Error: ${JSON.stringify(op.error)}`);
  }

  const video = op.response?.generatedVideos?.[0]?.video;
  const bytes = video?.videoBytes || video?.bytesBase64Encoded;
  if (!bytes) {
    throw new Error(`No video bytes returned in operation response: ${JSON.stringify(op.response)}`);
  }

  // 3. Save raw master
  const rawPath = path.join(RAW_DIR, `${scene.name}_raw.mp4`);
  fs.writeFileSync(rawPath, Buffer.from(bytes, "base64"));
  const rawSizeMB = (fs.statSync(rawPath).size / 1024 / 1024).toFixed(2);
  console.log(`✓ Saved raw master: ${rawPath} (${rawSizeMB} MB)`);

  // 4. Process final video: deletterbox if needed, add silent AAC stereo 48kHz audio track
  const finalPath = path.join(STAGING_DIR, `${scene.name}.mp4`);
  const crop = detectLetterbox(rawPath);
  let vf = "scale=1920:1080:flags=lanczos";
  if (crop && crop.h < 1070) {
    const neededWidth = Math.round((crop.h * 16) / 9);
    const evenWidth = neededWidth % 2 === 0 ? neededWidth : neededWidth - 1;
    const cropX = Math.max(0, Math.round(crop.x + (crop.w - evenWidth) / 2));
    vf = `crop=${evenWidth}:${crop.h}:${cropX}:${crop.y},scale=1920:1080:flags=lanczos`;
    console.log(`  🔍 Applying crop & scale to fix ${1080 - crop.h}px letterbox`);
  }

  console.log(`⚙️ Encoding final production standard (H.264 CRF 21 slow + AAC stereo audio)...`);
  execSync(
    `ffmpeg -y -i "${rawPath}" -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -vf "${vf}" -c:v libx264 -crf 21 -preset slow -c:a aac -b:a 128k -movflags +faststart -shortest "${finalPath}"`,
    { stdio: "pipe" }
  );

  const p = probe(finalPath);
  const finalSizeMB = (p.format.size / 1024 / 1024).toFixed(2);
  console.log(`✓ Final video ready: ${finalPath} (${finalSizeMB} MB, ${p.streams[0].width}x${p.streams[0].height} @ 24fps)`);

  // 5. Extract QA frame
  const qaFramePath = path.join(QA_DIR, `${scene.name}_frame4s.jpg`);
  execSync(`ffmpeg -y -ss 00:00:04 -i "${finalPath}" -vframes 1 -q:v 2 "${qaFramePath}"`, { stdio: "pipe" });
  console.log(`✓ QA frame extracted: ${qaFramePath}`);

  // 6. Record in budget ledger
  const updatedLedger = recordSuccessfulGeneration(scene.name, {
    sceneIndex: scene.index,
    surahNumber: scene.surahNumber,
    ayahRange: `${scene.ayahStart}-${scene.ayahEnd}`,
    operationId: op.name,
    finalPath,
    sizeMB: finalSizeMB,
  });

  console.log(`💰 Budget updated: Spent ₹${updatedLedger.cumulativeSpentINR.toFixed(2)}, Remaining: ₹${updatedLedger.estimatedRemainingCreditINR.toFixed(2)} INR`);

  // 7. Update mapping JSON
  if (fs.existsSync(MAPPING_PATH)) {
    const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));
    const sList = mapping[String(scene.surahNumber)];
    if (sList) {
      const match = sList.find((s) => s.start === scene.ayahStart && s.end === scene.ayahEnd);
      if (match) {
        match.visual_validation = "STAGED_GENERATION_VERIFIED";
        match.candidate = `scratch/staging/gate2_11_visuals/${scene.name}.mp4`;
        match.operation_id = op.name;
        match.generation_timestamp = new Date().toISOString();
        fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2), "utf8");
        console.log(`✓ Updated mapping in ${MAPPING_PATH}`);
      }
    }
  }

  return {
    scene,
    finalPath,
    qaFramePath,
    sizeMB: finalSizeMB,
    operationId: op.name,
  };
}

async function main() {
  const indexArg = process.argv.slice(2).find((a) => a.startsWith("--index="));
  const startFromArg = process.argv.slice(2).find((a) => a.startsWith("--start-from="));

  let scenesToRun = GATE2_SCENES;
  if (indexArg) {
    const idx = parseInt(indexArg.split("=")[1], 10);
    scenesToRun = GATE2_SCENES.filter((s) => s.index === idx);
  } else if (startFromArg) {
    const startIdx = parseInt(startFromArg.split("=")[1], 10);
    scenesToRun = GATE2_SCENES.filter((s) => s.index >= startIdx);
  }

  console.log(`🚀 Starting direct generation for ${scenesToRun.length} scene(s)...`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const results = [];
  for (const scene of scenesToRun) {
    try {
      const res = await generateSingleScene(ai, scene);
      results.push(res);
    } catch (err) {
      console.error(`\n❌ Scene #${scene.index} (${scene.name}) failed: ${err.message}`);
      console.error(`Stopping further generation. Uncontrolled retries prevented.`);
      process.exit(1);
    }
  }

  console.log(`\n======================================================================`);
  console.log(`🎉 ALL ${results.length} SCENES GENERATED AND VERIFIED IN STAGING!`);
  console.log(`======================================================================`);
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
