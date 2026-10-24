#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Fully Automated Quran Video Pipeline (Surahs 3 to 114)
 *  via Google Veo 3.1 Fast (Vertex AI)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Requirements:
 *  1. Loop & State Tracking:
 *     - Target range: Sequentially process from Surah 3 to Surah 114.
 *     - Track progress in data/progress.json.
 *     - Verify if public/videos/surah_{SURAH}/ayah_{AYAH}.mp4 exists; skip if it does.
 *  2. Camera, Motion & Islamic Guardrails:
 *     - High-altitude drone shot looking down/across vast landscapes.
 *     - Ultra-slow, smooth cinematic glide forward (24fps, steady motion).
 *     - 8K National Geographic documentary aesthetic, volumetric sunlight.
 *     - Strict Guardrail: Nature, landscapes, cosmic elements ONLY. Absolutely
 *       zero human faces, bodies, angels, or sacred figures.
 *  3. Dynamic Scenic Variety (Meaning-Based Selection):
 *     - Fetch meanings from Quran API / local verified translations.
 *     - Dynamically map to 7 diverse environments:
 *       1) Cosmos & Galaxy
 *       2) Desert Dunes
 *       3) Desert Oasis & Stream
 *       4) Cascading Waterfalls
 *       5) Mountain Peaks
 *       6) Flowing Rivers & Valleys
 *       7) Ocean & Coastlines
 *  4. Step-by-Step Autonomous Execution:
 *     - 1) Fetch & Prompt
 *     - 2) Batch Render in groups of 5-10 via Veo 3.1 Fast
 *     - 3) Generate review_surah_{SURAH}.html preview page
 *     - 4) Approval check & live deployment to Cloudflare R2
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

// Configuration
export const PIPELINE_CONFIG = {
  projectId: "huda-web-quran-id2",
  location: "us-central1",
  model: "veo-3.1-fast-generate-001",
  durationSec: 8,
  aspectRatio: "16:9",
  resolution: "1080p",
  defaultBatchSize: 5,
  progressPath: path.join(ROOT_DIR, "data/progress.json"),
  videosDir: path.join(ROOT_DIR, "public/videos"),
  quranVersesDir: path.join(ROOT_DIR, "public/data/quran-verses"),
};

export const FFMPEG_BIN = fs.existsSync("/opt/homebrew/bin/ffmpeg")
  ? "/opt/homebrew/bin/ffmpeg"
  : fs.existsSync("/usr/local/bin/ffmpeg")
  ? "/usr/local/bin/ffmpeg"
  : "ffmpeg";

export function compressAndDeletterbox(inputRawPath, outputFinalPath) {
  try {
    let vfArg = "";
    try {
      const out = execSync(
        `"${FFMPEG_BIN}" -ss 00:00:02 -i "${inputRawPath}" -vframes 15 -vf cropdetect=24:2:0 -f null - 2>&1`,
        { stdio: "pipe" }
      ).toString();
      const matches = [...out.matchAll(/crop=(\d+:\d+:\d+:\d+)/g)];
      if (matches.length > 0) {
        const [w, h, x, y] = matches[matches.length - 1][1].split(":").map(Number);
        if (1080 - h > 16) {
          const neededWidth = Math.round((h * 16) / 9);
          const evenWidth = neededWidth % 2 === 0 ? neededWidth : neededWidth - 1;
          const cropX = Math.max(0, Math.round(x + (w - evenWidth) / 2));
          vfArg = `-vf "crop=${evenWidth}:${h}:${cropX}:${y},scale=1920:1080:flags=lanczos"`;
          console.log(`     🔍 Auto-detected letterbox (${1080 - h}px) -> applying 16:9 borderless crop & scale.`);
        }
      }
    } catch {}

    execSync(
      `"${FFMPEG_BIN}" -y -i "${inputRawPath}" ${vfArg} -c:v libx264 -crf 21 -preset slow -movflags +faststart -an "${outputFinalPath}"`,
      { stdio: "pipe" }
    );
    return true;
  } catch (err) {
    console.warn(`     ⚠️ Compression failed, copying raw: ${err.message}`);
    fs.copyFileSync(inputRawPath, outputFinalPath);
    return false;
  }
}

// 24 Diverse Nature & Landscape Environments (Zero Repetition)
export const ENVIRONMENTS = [
  {
    id: "cosmos_deep_space",
    name: "Cosmos & Deep Space",
    description: "Deep space nebula with radiant purple and golden stellar dust clouds, distant spiraling galaxies, and glowing stars",
    keywords: ["heaven", "heavens", "sky", "skies", "star", "stars", "sun", "moon", "galaxy", "universe", "orbit", "space", "celestial", "constellations", "firmament", "cosmos", "dominion", "throne"]
  },
  {
    id: "fjords_aurora",
    name: "Arctic Fjords & Aurora",
    description: "Majestic deep blue Arctic fjords with mirror-still reflective waters, surrounded by sheer mountain cliffs under vibrant glowing aurora borealis",
    keywords: ["sign", "signs", "wonder", "night", "darkness", "light", "aurora", "radiance", "glow", "reflect", "reflection", "illumination", "magnificent", "exalted"]
  },
  {
    id: "canyon_gorges",
    name: "Red Rock Canyons & Mesas",
    description: "Massive red rock canyons and towering sandstone mesas bathed in warm golden dawn light, deep geological gorges",
    keywords: ["earth", "rock", "stone", "stones", "firm", "steadfast", "cleft", "clefts", "strata", "creation", "established", "weight", "ancient", "foundation"]
  },
  {
    id: "rainforest_mist",
    name: "Emerald Rainforest & Mist",
    description: "Dense emerald rainforest canopy blanketed in soft morning mist with a winding jungle river seen from high above",
    keywords: ["tree", "trees", "green", "verdant", "forest", "growth", "plant", "plants", "herb", "shade", "canopy", "rain", "life", "revive", "living"]
  },
  {
    id: "glaciers_ice",
    name: "Glacial Ice Fields & Fjords",
    description: "Vast ancient blue glacial ice fields and crystalline icebergs floating silently in pristine tranquil polar waters",
    keywords: ["cold", "ice", "hail", "snow", "pure", "purity", "crystal", "freeze", "white", "clean", "clear", "transparent", "majesty"]
  },
  {
    id: "desert_dunes_dawn",
    name: "Golden Desert Dunes at Dawn",
    description: "Vast golden sand dunes with wind ripples sculpted under rising dawn sun with long soft shadows",
    keywords: ["sand", "dune", "dunes", "dust", "desert", "wilderness", "journey", "travel", "path", "trail", "footsteps", "wander", "dry", "arid"]
  },
  {
    id: "waterfalls_cenote",
    name: "Grand Waterfalls & Turquoise Pools",
    description: "Multi-tiered dramatic waterfalls cascading down moss-covered cliffs into serene turquoise and emerald mountain pools",
    keywords: ["waterfall", "waterfalls", "cascade", "fountain", "fountains", "spring", "springs", "gush", "gushing", "flow", "flowing", "pool", "turquoise", "paradise", "jannah"]
  },
  {
    id: "desert_oasis_palms",
    name: "Desert Oasis & Date Palms",
    description: "A hidden lush desert oasis with natural freshwater springs and thriving date palm groves nestled among golden dunes",
    keywords: ["oasis", "palm", "palms", "date", "dates", "fruit", "fruits", "garden", "provision", "sustenance", "bounty", "grace", "blessing", "mercy", "drink", "quench"]
  },
  {
    id: "meadows_wildflowers",
    name: "Alpine Meadows & Wildflowers",
    description: "Rolling alpine green hills carpeted with blooming wildflowers under warm morning sunlight with misty distant ridges",
    keywords: ["pasture", "grass", "bloom", "flower", "flowers", "bounty", "delight", "beauty", "adornment", "cattle", "graze", "earth", "springtime"]
  },
  {
    id: "ocean_storm_clearing",
    name: "Vast Ocean & Sunbeams",
    description: "Vast deep blue ocean waves rolling gently under dramatic sunbeams breaking through majestic cloud formations",
    keywords: ["sea", "seas", "ocean", "oceans", "deep", "depths", "wave", "waves", "swell", "ship", "ships", "sail", "wind", "winds", "storm", "clouds", "thunder"]
  },
  {
    id: "autumn_forest_river",
    name: "Autumn Woodland & River",
    description: "Sweeping aerial panorama of a vast autumn forest glowing with amber, gold, and crimson foliage along a crystal river",
    keywords: ["leaf", "leaves", "color", "colors", "change", "season", "seasons", "autumn", "harvest", "cycle", "time", "pass away", "renew"]
  },
  {
    id: "volcanic_basalt_coast",
    name: "Volcanic Basalt Columns & Coast",
    description: "Dramatic dark basalt columns and black volcanic coastline with crashing turquoise ocean waves and sea mist",
    keywords: ["fire", "smoke", "molten", "basalt", "hard", "severe", "power", "might", "strike", "shatter", "crumble", "solemn", "warning"]
  },
  {
    id: "golden_wheat_fields",
    name: "Endless Golden Wheat Fields",
    description: "Endless vast golden wheat fields undulating gently in the evening breeze beneath a panoramic twilight sky",
    keywords: ["grain", "grains", "wheat", "corn", "seed", "seeds", "harvest", "produce", "sprout", "field", "fields", "farmer", "till", "sustenance"]
  },
  {
    id: "pine_mountain_inversion",
    name: "Pine Mountain Ridges & Clouds",
    description: "Towering ancient pine-covered mountain ridges emerging like islands above a sea of rolling white clouds at dawn",
    keywords: ["high", "lofty", "exalt", "exalted", "above", "cloud", "clouds", "rise", "peak", "summit", "steadfast", "unshakeable", "refuge", "shelter"]
  },
  {
    id: "coral_reef_lagoon",
    name: "Coral Reef Atolls & Lagoon",
    description: "Vibrant turquoise coral reef atolls and crystal shallow lagoons blending seamlessly into deep ultramarine ocean",
    keywords: ["pearl", "pearls", "coral", "jewel", "treasure", "sea", "depth", "secret", "hidden", "barrier", "two seas", "sweet and salty", "meet"]
  },
  {
    id: "bamboo_misty_sea",
    name: "Bamboo Forest Sea & Mist",
    description: "Aerial view of a sprawling sea of vibrant green bamboo forest gently swaying in morning mountain breeze with soft mist",
    keywords: ["straight", "upright", "gentle", "peace", "tranquility", "calm", "serenity", "sakinah", "whisper", "wind", "breeze", "breath"]
  },
  {
    id: "subterranean_cavern_beams",
    name: "Limestone Cavern & Sunbeams",
    description: "Natural limestone cavern with opening pouring volumetric sunlight beams down into a pristine turquoise subterranean pool",
    keywords: ["cave", "kahf", "shelter", "refuge", "darkness into light", "light", "nur", "illumination", "hidden", "protect", "sanctuary"]
  },
  {
    id: "mangrove_estuary",
    name: "Mangrove Waterways & Estuaries",
    description: "Intricate labyrinth of emerald green mangrove waterways and tidal channels reflecting soft golden sunrise",
    keywords: ["stream", "streams", "channel", "channels", "branch", "branches", "interlock", "guide", "guidance", "wisdom", "intricate", "design"]
  },
  {
    id: "starry_desert_night",
    name: "Desert Night & Milky Way",
    description: "Serene desert rock formations and sand ripples under a crystal-clear night sky with brilliant Milky Way galaxy core",
    keywords: ["night", "layl", "star", "stars", "guide", "guidance in darkness", "quiet", "slumber", "rest", "repose", "watch", "witness"]
  },
  {
    id: "crystal_river_valley",
    name: "Crystal Winding River Valley",
    description: "Clear winding rivers cutting through lush green valleys with pebble sandbars and verdant rolling meadows",
    keywords: ["river", "rivers", "valley", "valleys", "flow", "flowing beneath", "righteousness", "believers", "upright", "good deeds", "peace", "salam"]
  },
  {
    id: "terracotta_red_desert",
    name: "Terracotta Desert & Arches",
    description: "Deep terracotta-red desert landscape with natural sandstone rock arches stretching into infinite horizon under twilight",
    keywords: ["clay", "dust", "earth", "red", "strata", "ancient", "ruins", "signs of the past", "generations", "heed", "reflect"]
  },
  {
    id: "savanna_golden_sunset",
    name: "Golden Savanna & Acacia Sunset",
    description: "Vast golden grassland savanna with solitary acacia silhouettes under a dramatic panoramic orange and amber sunset",
    keywords: ["wide", "vast", "expanse", "spread out", "evening", "sunset", "twilight", "dusk", "gratitude", "praise", "hamd"]
  },
  {
    id: "coastal_sea_stacks",
    name: "Coastal Sea Stacks & Waves",
    description: "Towering natural sea arches and dramatic sea stacks standing tall against gentle turquoise ocean waves and sea spray",
    keywords: ["pillar", "pillars", "stand", "standing", "firm", "withstand", "steadfast", "patient", "endure", "victory", "triumph"]
  },
  {
    id: "cloud_inversion_sunrise",
    name: "Cloud Inversion & Sunrise",
    description: "Spectacular sunrise over an infinite ocean of thick white fluffy clouds filling a mountain valley with peaks rising above",
    keywords: ["morning", "dawn", "fajr", "daybreak", "reveal", "manifest", "glory", "subhan", "majesty", "magnificent"]
  }
];

// Atmospheric Lighting Variations (Rotated dynamically so adjacent clips never look alike)
export const LIGHTING_VARIATIONS = [
  "bathed in warm golden hour sunlight with long soft shadows and a radiant amber glow",
  "peaceful ethereal morning dawn with soft pastel pink and gold sky and gentle low-lying mist",
  "dramatic volumetric god-rays breaking majestically through towering cumulus clouds",
  "serene twilight blue hour with deep indigo sky and a soft golden horizon afterglow",
  "crystal-clear brilliant natural daylight with pure vibrant natural colors and high-altitude clarity",
  "breathtaking celestial twilight illuminated by glowing stars and soft moonlit ambient glow",
  "vibrant sunset with rich crimson and violet cloud reflections across the horizon",
  "fresh morning sunlight after a clearing rain, glistening naturally on the tranquil terrain"
];

// Camera Glides (Rotated dynamically for varied camera choreography)
export const CAMERA_MOVEMENTS = [
  "slow gentle aerial glide drifting smoothly forward across the vast expanse",
  "high-altitude sweeping aerial pan slowly descending over the majestic landscape",
  "breathtaking wide-angle forward tracking shot floating weightlessly across nature",
  "ultra-smooth high vantage aerial glide cruising gracefully over the panoramic terrain",
  "continuous tranquil aerial drift revealing immense scale and serene atmospheric depth"
];

// Helper: Ensure directory exists
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ── 1. PROGRESS STATE TRACKING ────────────────────────────────────────────────

export function loadProgress() {
  ensureDir(path.dirname(PIPELINE_CONFIG.progressPath));
  if (fs.existsSync(PIPELINE_CONFIG.progressPath)) {
    try {
      return JSON.parse(fs.readFileSync(PIPELINE_CONFIG.progressPath, "utf8"));
    } catch (e) {
      console.warn("⚠️ Corrupt progress.json, reinitializing:", e.message);
    }
  }

  const initial = {
    pipelineVersion: "1.0.0",
    lastUpdated: new Date().toISOString(),
    currentSurah: 3,
    status: "IDLE", // IDLE, RUNNING, AWAITING_APPROVAL, COMPLETED, PAUSED
    totalSurahs: 114,
    completedSurahCount: 0,
    surahs: {},
  };
  saveProgress(initial);
  return initial;
}

export function saveProgress(progress) {
  ensureDir(path.dirname(PIPELINE_CONFIG.progressPath));
  progress.lastUpdated = new Date().toISOString();
  fs.writeFileSync(PIPELINE_CONFIG.progressPath, JSON.stringify(progress, null, 2), "utf8");
}

// ── 2. PRESERVE & LINK EXISTING VIDEOS (Surahs 1, 2, 3) ────────────────────────

export function preserveExistingVideos() {
  console.log("🔍 Scanning and preserving existing videos for Surahs 1, 2, and 3...");
  let linkedCount = 0;

  // 1. Surah 1 (Al-Fatihah, 7 verses)
  const fatihahDir = path.join(PIPELINE_CONFIG.videosDir, "surah_1");
  ensureDir(fatihahDir);
  const fatihahScenes = {
    1: "assets/video-masters/001-al-fatihah/scenes/01-praise-mercy.mp4",
    2: "assets/video-masters/001-al-fatihah/scenes/01-praise-mercy.mp4",
    3: "assets/video-masters/001-al-fatihah/scenes/02-divine-judgment.mp4",
    4: "assets/video-masters/001-al-fatihah/scenes/02-divine-judgment.mp4",
    5: "assets/video-masters/001-al-fatihah/scenes/03-worship-and-help.mp4",
    6: "assets/video-masters/001-al-fatihah/scenes/04-guidance.mp4",
    7: "assets/video-masters/001-al-fatihah/scenes/04-guidance.mp4",
  };
  for (const [ay, srcRel] of Object.entries(fatihahScenes)) {
    const srcAbs = path.join(ROOT_DIR, srcRel);
    const dstAbs = path.join(fatihahDir, `ayah_${ay}.mp4`);
    if (fs.existsSync(srcAbs) && !fs.existsSync(dstAbs)) {
      try {
        fs.copyFileSync(srcAbs, dstAbs);
        linkedCount++;
      } catch {}
    }
  }

  // 2. Surah 2 (Al-Baqarah, individual ayah videos)
  const baqarahDir = path.join(PIPELINE_CONFIG.videosDir, "surah_2");
  ensureDir(baqarahDir);
  const ayah002Dir = path.join(PIPELINE_CONFIG.videosDir, "ayah/002");
  if (fs.existsSync(ayah002Dir)) {
    const files = fs.readdirSync(ayah002Dir);
    for (const f of files) {
      if (!f.endsWith(".mp4")) continue;
      const ayNum = parseInt(f.replace(".mp4", ""), 10);
      if (!isNaN(ayNum)) {
        const srcAbs = path.join(ayah002Dir, f);
        const dstAbs = path.join(baqarahDir, `ayah_${ayNum}.mp4`);
        if (!fs.existsSync(dstAbs)) {
          try {
            fs.copyFileSync(srcAbs, dstAbs);
            linkedCount++;
          } catch {}
        }
      }
    }
  }

  // 3. Surah 3 (Aal-Imran, completed clips in scratch/ and staging/)
  const imranDir = path.join(PIPELINE_CONFIG.videosDir, "surah_3");
  ensureDir(imranDir);
  const surah3Clips = [
    { start: 1, end: 9, src: "scratch/surah3_trial_generation/01a-the-immutable-foundation-and-muhkamat.mp4" },
    { start: 26, end: 32, src: "scratch/surah3_trial_generation/02c-the-supreme-sovereign-and-cosmic-order.mp4" },
    { start: 33, end: 44, src: "scratch/surah3_0.40s_remediation/03a-the-sanctuary-of-maryam-and-zakariya-prayer_0.40s.mp4" },
    { start: 45, end: 51, src: "scratch/staging/003/processed/04a-the-word-from-allah-and-primordial-creation.mp4" },
    { start: 52, end: 63, src: "scratch/staging/003/processed/04b-the-sincere-disciples-and-elevation-of-isa.mp4" },
    { start: 64, end: 77, src: "scratch/surah3_0.40s_remediation/05a-the-common-word-of-pure-monotheism_0.40s.mp4" },
    { start: 78, end: 83, src: "scratch/staging/003/processed/05b-the-primordial-covenant-of-the-prophets.mp4" },
    { start: 84, end: 92, src: "scratch/surah3_0.40s_remediation/06a-true-giving-bakkah-and-sacred-security_0.40s.mp4" },
    { start: 121, end: 136, src: "scratch/surah3_0.40s_remediation/07a-the-topography-of-uhud-and-divine-support_0.40s.mp4" },
    { start: 137, end: 151, src: "scratch/surah3_0.40s_remediation/08a-the-gentle-mercy-and-mutual-consultation_0.40s.mp4" },
    { start: 176, end: 184, src: "scratch/surah3_0.40s_remediation/09a-the-impotence-of-disbelief-and-moral-trial_0.40s.mp4" },
    { start: 185, end: 189, src: "scratch/surah3_0.40s_remediation/09b-every-soul-shall-taste-death-and-dominion_0.40s.mp4" },
    { start: 190, end: 195, src: "scratch/surah3_trial_generation/10a-ulul-albab-and-contemplation-of-creation.mp4" },
    { start: 196, end: 200, src: "scratch/surah3_0.40s_remediation/10b-patience-unshakable-endurance-and-triumph_0.40s.mp4" },
  ];

  for (const clip of surah3Clips) {
    const srcAbs = path.join(ROOT_DIR, clip.src);
    if (fs.existsSync(srcAbs)) {
      const dstAbs = path.join(imranDir, `ayah_${clip.start}.mp4`);
      if (!fs.existsSync(dstAbs)) {
        try {
          fs.copyFileSync(srcAbs, dstAbs);
          linkedCount++;
        } catch {}
      }
    }
  }

  console.log(`✓ Preserved and registered ${linkedCount} existing Ayah videos in public/videos/!`);
  return linkedCount;
}

// ── 3. VERSE MEANINGS & THEME SELECTION ────────────────────────────────────────

export async function fetchSurahVerses(surahNum) {
  // First attempt local verified database
  const localPath = path.join(PIPELINE_CONFIG.quranVersesDir, `${surahNum}.json`);
  if (fs.existsSync(localPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localPath, "utf8"));
      return data;
    } catch {}
  }

  // Fallback to Quran API
  console.log(`🌐 Fetching Surah ${surahNum} verses from Quran API...`);
  try {
    const url = `https://api.quran.com/api/v4/verses/by_chapter/${surahNum}?translations=131,20&per_page=300`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.verses && json.verses.length > 0) {
      return json.verses.map((v) => {
        const t131 = v.translations?.find((t) => t.resource_id === 131)?.text || "";
        const t20 = v.translations?.find((t) => t.resource_id === 20)?.text || "";
        return {
          surahNumber: surahNum,
          ayahNumber: v.verse_number,
          textArabic: v.text_uthmani || "",
          textEnglish: t20 || t131,
          textTamil: "",
          verseKey: v.verse_key,
        };
      });
    }
  } catch (err) {
    console.warn(`Failed to fetch from Quran API: ${err.message}`);
  }

  throw new Error(`Unable to load verse data for Surah ${surahNum}`);
}

export function selectEnvironment(verse, index = 0, usedIds = []) {
  const text = ((verse.textEnglish || "") + " " + (verse.textTamil || "")).toLowerCase();

  // Score all environments against verse text
  const scored = ENVIRONMENTS.map((env) => {
    let score = 0;
    for (const kw of env.keywords) {
      const regex = new RegExp("\\b" + kw + "\\b", "gi");
      const matches = text.match(regex);
      if (matches) score += matches.length;
    }
    const recentlyUsed = usedIds.includes(env.id);
    return { env, score, recentlyUsed };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 1. Pick highest scoring environment that hasn't been used yet in this Surah
  const bestUnused = scored.find((s) => s.score > 0 && !s.recentlyUsed);
  if (bestUnused) return bestUnused.env;

  // 2. If all matching ones were used, pick one not used in the immediate previous set
  const lastUsedId = usedIds.length > 0 ? usedIds[usedIds.length - 1] : null;
  const bestAny = scored.find((s) => s.score > 0 && s.env.id !== lastUsedId);
  if (bestAny) return bestAny.env;

  // 3. Fallback: pick any environment from the 24 palette that has NOT been used in this Surah yet
  const totallyUnused = ENVIRONMENTS.find((e) => !usedIds.includes(e.id));
  if (totallyUnused) return totallyUnused;

  // 4. Ultimate rotation fallback: exclude last 4 sets
  const pool = ENVIRONMENTS.filter((e) => !usedIds.slice(-4).includes(e.id));
  return pool.length > 0 ? pool[index % pool.length] : ENVIRONMENTS[index % ENVIRONMENTS.length];
}

export function buildVeoPrompt(env, setIndex = 0) {
  const lighting = LIGHTING_VARIATIONS[setIndex % LIGHTING_VARIATIONS.length];
  const cameraMotion = CAMERA_MOVEMENTS[setIndex % CAMERA_MOVEMENTS.length];

  return (
    `Wide-angle full frame landscape video, ${env.description}, ` +
    `${lighting}, ${cameraMotion}, breathtaking scale, ` +
    `National Geographic 8k nature documentary footage, peaceful, 24fps. ` +
    `Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. ` +
    `No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, ` +
    `no human faces, no human bodies, no silhouettes, ` +
    `no angels, no prophets, no sacred figures, no people, no architecture, no buildings, ` +
    `no text, no logos`
  );
}

// ── 4. VEO 3.1 FAST GENERATION ENGINE ──────────────────────────────────────────

export async function generateSingleVerseVideo(surahNum, ayahNum, prompt, options = {}) {
  const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}`);
  ensureDir(surahDir);
  const targetFile = path.join(surahDir, `ayah_${ayahNum}.mp4`);

  if (fs.existsSync(targetFile) && !options.force) {
    console.log(`⏩ [Surah ${surahNum} : Ayah ${ayahNum}] already exists. Skipping.`);
    return { success: true, skipped: true, path: targetFile };
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would generate Surah ${surahNum} Ayah ${ayahNum}:`);
    console.log(`  Prompt: ${prompt.slice(0, 100)}...`);
    return { success: true, dryRun: true, path: targetFile };
  }

  const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PIPELINE_CONFIG.projectId,
    location: PIPELINE_CONFIG.location,
  });

  console.log(`🎬 [Veo 3.1 Fast] Generating Surah ${surahNum} : Ayah ${ayahNum}...`);
  const startTime = Date.now();

  let op = await ai.models.generateVideos({
    model: PIPELINE_CONFIG.model,
    source: { prompt },
    config: {
      aspectRatio: PIPELINE_CONFIG.aspectRatio,
      durationSeconds: PIPELINE_CONFIG.durationSec,
      resolution: PIPELINE_CONFIG.resolution,
    },
  });

  console.log(`  ✓ Operation: ${op.name}`);

  let polls = 0;
  while (!op.done) {
    polls++;
    await new Promise((r) => setTimeout(r, 7000));
    const queryOp = new GenerateVideosOperation();
    queryOp.name = op.name;
    op = await ai.operations.getVideosOperation({ operation: queryOp });
    process.stdout.write(`  [${polls * 7}s] `);
  }
  process.stdout.write("\n");

  if (op.error) {
    throw new Error(`Veo 3.1 generation failed for Ayah ${ayahNum}: ${JSON.stringify(op.error)}`);
  }

  const vid = op.response?.generatedVideos?.[0]?.video;
  const rawBytes = vid?.videoBytes || vid?.bytesBase64Encoded;
  if (!rawBytes) {
    throw new Error(`No video bytes returned for Ayah ${ayahNum}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(targetFile, buffer);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  ✅ Ayah ${ayahNum} saved (${(buffer.length / 1024 / 1024).toFixed(2)} MB in ${elapsed}s)`);

  return { success: true, skipped: false, path: targetFile };
}

export async function generateBatchVideos(surahNum, batchVerses, options = {}) {
  const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}`);
  ensureDir(surahDir);

  const needed = batchVerses.filter((v) => {
    const target = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
    return !fs.existsSync(target) || options.force;
  });

  if (needed.length === 0) {
    console.log(`⏩ All verses in batch already exist. Skipping.`);
    return [];
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would generate batch of ${needed.length} videos: Ayahs ${needed.map(n => n.ayahNumber).join(", ")}`);
    return needed.map(v => ({ ayahNumber: v.ayahNumber, skipped: false, dryRun: true }));
  }

  const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PIPELINE_CONFIG.projectId,
    location: PIPELINE_CONFIG.location,
  });

  console.log(`\n🚀 Submitting Veo 3.1 Fast batch of ${needed.length} videos concurrently...`);
  const activeOps = [];

  for (const v of needed) {
    const env = selectEnvironment(v, v.ayahNumber);
    const prompt = buildVeoPrompt(env);
    const targetFile = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
    console.log(`  Initiating Surah ${surahNum} Ayah ${v.ayahNumber} [${env.name}]...`);
    try {
      const op = await ai.models.generateVideos({
        model: PIPELINE_CONFIG.model,
        source: { prompt },
        config: {
          aspectRatio: PIPELINE_CONFIG.aspectRatio,
          durationSeconds: PIPELINE_CONFIG.durationSec,
          resolution: PIPELINE_CONFIG.resolution,
        },
      });
      console.log(`  ✓ Ayah ${v.ayahNumber} -> Operation: ${op.name}`);
      activeOps.push({
        ayahNumber: v.ayahNumber,
        operationName: op.name,
        targetFile,
        done: false,
      });
    } catch (err) {
      console.error(`  ❌ Failed to submit Ayah ${v.ayahNumber}:`, err.message);
    }
    // Small 600ms stagger between API submissions
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n⏳ Polling progress for ${activeOps.length} operations concurrently...`);
  let pollRound = 0;
  const startTime = Date.now();

  while (activeOps.some((o) => !o.done)) {
    pollRound++;
    await new Promise((r) => setTimeout(r, 7000));
    const pendingCount = activeOps.filter((o) => !o.done).length;
    process.stdout.write(`  [Poll #${pollRound} @ ${pollRound * 7}s] ${pendingCount}/${activeOps.length} rendering in background... \r`);

    for (const item of activeOps) {
      if (item.done) continue;
      try {
        const queryOp = new GenerateVideosOperation();
        queryOp.name = item.operationName;
        const updated = await ai.operations.getVideosOperation({ operation: queryOp });
        if (updated.done) {
          item.done = true;
          if (updated.error) {
            console.error(`\n  ❌ Ayah ${item.ayahNumber} failed:`, updated.error);
          } else {
            const vid = updated.response?.generatedVideos?.[0]?.video;
            const rawBytes = vid?.videoBytes || vid?.bytesBase64Encoded;
            if (rawBytes) {
              const buf = Buffer.from(rawBytes, "base64");
              fs.writeFileSync(item.targetFile, buf);
              console.log(`\n  ✅ Ayah ${item.ayahNumber} completed! (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
            }
          }
        }
      } catch (pollErr) {
        // Transient network retry
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✨ Batch of ${activeOps.length} videos completed in ${elapsed}s!`);
  return activeOps;
}

// ── 5. REVIEW PAGE BUILDER (review_surah_{SURAH}.html) ─────────────────────────

export function buildReviewPage(surahNum, verses, videoMap) {
  const surahName = verses[0]?.surahName || `Surah ${surahNum}`;
  const totalVerses = verses.length;
  const readyCount = verses.filter((v) => fs.existsSync(path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}/ayah_${v.ayahNumber}.mp4`))).length;

  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surah ${surahNum} Video Production Review — HuDa Web Quran</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
    .font-arabic { font-family: 'Amiri', serif; }
  </style>
</head>
<body class="min-h-screen p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <header class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold tracking-wide">
            Surah ${surahNum} of 114
          </span>
          <span class="text-xs text-gray-400">Veo 3.1 Fast 1080p 24fps</span>
        </div>
        <h1 class="text-3xl font-bold mt-2 text-white flex items-center gap-3">
          <span>Surah ${surahNum}</span>
          <span class="text-emerald-400 text-sm font-normal">(${readyCount}/${totalVerses} Ayahs Ready)</span>
        </h1>
        <p class="text-gray-400 text-sm mt-1">High-altitude cinematic drone landscapes mapped to verse meanings</p>
      </div>

      <!-- Single-Click Approval Card -->
      <div class="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center md:text-right">
        <p class="text-xs text-emerald-300 font-medium">To approve and auto-advance to Surah ${surahNum + 1}:</p>
        <div class="mt-2 flex items-center justify-center md:justify-end gap-2">
          <code class="px-3 py-1.5 bg-black/60 text-emerald-400 rounded-lg text-sm font-mono border border-emerald-500/30 font-bold">
            OK
          </code>
          <span class="text-xs text-gray-400">or type</span>
          <code class="px-3 py-1.5 bg-black/60 text-amber-400 rounded-lg text-sm font-mono border border-amber-500/30 font-bold">
            PAUSE
          </code>
        </div>
      </div>
    </header>

    <!-- Verses Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${verses.map((v) => {
        const videoRel = `public/videos/surah_${surahNum}/ayah_${v.ayahNumber}.mp4`;
        const videoExists = fs.existsSync(path.join(ROOT_DIR, videoRel));
        const overrideSet = SURAH_MEANING_OVERRIDES[surahNum]?.find(
          (s) => v.ayahNumber >= s.startAyah && v.ayahNumber <= s.endAyah
        );
        const env = overrideSet
          ? { name: overrideSet.name, description: overrideSet.description }
          : selectEnvironment(v, v.ayahNumber);

        return `
        <div class="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition flex flex-col">
          <div class="aspect-video bg-black relative flex items-center justify-center">
            ${videoExists ? `
              <video src="${videoRel}" controls loop muted playsinline class="w-full h-full object-cover"></video>
            ` : `
              <div class="text-center p-4">
                <span class="text-amber-500 text-sm font-semibold">Pending Render</span>
                <p class="text-xs text-gray-500 mt-1">${env.name}</p>
              </div>
            `}
            <span class="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur text-xs font-mono text-gray-200 rounded">
              ${surahNum}:${v.ayahNumber}
            </span>
            <span class="absolute top-2 right-2 px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium">
              ${env.name}
            </span>
          </div>

          <div class="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div>
              <p class="font-arabic text-right text-lg text-amber-200 leading-relaxed dir-rtl" dir="rtl">
                ${v.textArabic || ""}
              </p>
              ${v.textTamil ? `
                <p class="text-xs text-blue-300 mt-2 line-clamp-2">
                  ${v.textTamil}
                </p>
              ` : ""}
              <p class="text-xs text-gray-300 mt-1 line-clamp-2">
                ${v.textEnglish || ""}
              </p>
            </div>

            <div class="pt-2 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
              Theme: ${env.description}
            </div>
          </div>
        </div>
        `;
      }).join("\n")}
    </div>

    <!-- Footer -->
    <footer class="text-center py-6 text-gray-500 text-xs border-t border-gray-800">
      HuDa Web Quran Automated Video Production • Google Veo 3.1 Fast 1080p
    </footer>
  </div>
</body>
</html>`;

  const reviewFile = path.join(ROOT_DIR, `review_surah_${surahNum}.html`);
  fs.writeFileSync(reviewFile, html, "utf8");
  console.log(`📄 Generated review page: file://${reviewFile}`);
  return reviewFile;
}



// ── 6.5 THEMATIC VERSE SETS (SURAH >= 5: 5–10 AYAHS PER VIDEO) ───────────────

// Curated authentic Quranic context & meaning storyboards for specific Surahs (Surahs 4, 5, 6, 7, 8)
import { SURAH_MEANING_OVERRIDES } from "./surah-meaning-overrides.mjs";
export { SURAH_MEANING_OVERRIDES };

export function groupVersesIntoMeaningSets(verses, targetSize = 7, surahNum = null) {
  const sets = [];
  let currentGroup = [];
  const usedEnvIds = [];
  const overrides = surahNum && SURAH_MEANING_OVERRIDES[surahNum] ? SURAH_MEANING_OVERRIDES[surahNum] : null;

  for (let i = 0; i < verses.length; i++) {
    currentGroup.push(verses[i]);
    const isLast = i === verses.length - 1;
    const currentLen = currentGroup.length;

    if (currentLen >= targetSize || isLast) {
      if (isLast && currentLen < 5 && sets.length > 0) {
        const lastSet = sets[sets.length - 1];
        lastSet.verses.push(...currentGroup);
        lastSet.endAyah = currentGroup[currentGroup.length - 1].ayahNumber;
        lastSet.verseCount = lastSet.verses.length;
        lastSet.videoFileName = `set_${String(lastSet.setIndex).padStart(2, "0")}_ayah_${lastSet.startAyah}-${lastSet.endAyah}.mp4`;
        currentGroup = [];
        break;
      }

      const setIdx = sets.length + 1;
      const startAyah = currentGroup[0].ayahNumber;
      const endAyah = currentGroup[currentGroup.length - 1].ayahNumber;
      const combinedEnglish = currentGroup.map((v) => v.textEnglish || "").join(" ");
      const combinedTamil = currentGroup.map((v) => v.textTamil || "").join(" ");
      const combinedArabic = currentGroup.map((v) => v.textArabic || "").join(" ");

      let env = null;
      let prompt = "";

      const override = overrides ? overrides.find((o) => o.setIndex === setIdx) : null;
      if (override) {
        env = {
          id: `override_${surahNum}_${setIdx}`,
          name: override.name,
          description: override.description,
          themeContext: override.themeContext,
        };
        prompt = override.prompt;
      } else {
        const dummySetVerse = { textEnglish: combinedEnglish, textTamil: combinedTamil };
        env = selectEnvironment(dummySetVerse, sets.length, usedEnvIds);
        usedEnvIds.push(env.id);
        prompt = buildVeoPrompt(env, sets.length);
      }

      sets.push({
        setIndex: setIdx,
        startAyah,
        endAyah,
        verseCount: currentGroup.length,
        verses: [...currentGroup],
        combinedEnglish,
        combinedTamil,
        combinedArabic,
        environment: env,
        prompt,
        reuse: override?.reuse || null,
        videoFileName: `set_${String(setIdx).padStart(2, "0")}_ayah_${startAyah}-${endAyah}.mp4`,
      });
      currentGroup = [];
    }
  }

  return sets;
}

export async function generateBatchSets(surahNum, batchSets, options = {}) {
  const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}`);
  ensureDir(surahDir);

  const neededSets = batchSets.filter((s) => {
    const setPath = path.join(surahDir, s.videoFileName);
    return !fs.existsSync(setPath) || options.force;
  });

  if (neededSets.length === 0) {
    console.log(`⏩ All set videos in this batch already exist.`);
    for (const s of batchSets) {
      const setPath = path.join(surahDir, s.videoFileName);
      if (fs.existsSync(setPath)) {
        for (const v of s.verses) {
          const ayahPath = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
          if (!fs.existsSync(ayahPath)) {
            try { fs.copyFileSync(setPath, ayahPath); } catch {}
          }
        }
      }
    }
    return [];
  }

  // 1. Process any reused sets directly from our library
  const setsToGenerate = [];
  for (const s of neededSets) {
    const targetFile = path.join(surahDir, s.videoFileName);
    if (s.reuse) {
      const srcVideo = path.isAbsolute(s.reuse) ? s.reuse : path.join(PIPELINE_CONFIG.videosDir, s.reuse);
      if (fs.existsSync(srcVideo)) {
        console.log(`  ♻️ [Thematic Library Reuse] Copying ${s.reuse} -> Set ${s.setIndex} (Ayahs ${s.startAyah}–${s.endAyah})...`);
        fs.copyFileSync(srcVideo, targetFile);
        for (const v of s.verses) {
          const ayahPath = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
          try { fs.copyFileSync(targetFile, ayahPath); } catch {}
        }
        console.log(`     ↳ Linked 1 video to all ${s.verseCount} ayahs in Set ${s.setIndex}.`);
        continue;
      } else {
        console.warn(`  ⚠️ Reusable video not found at ${srcVideo}, generating with Veo instead...`);
      }
    }
    setsToGenerate.push(s);
  }

  if (setsToGenerate.length === 0) {
    console.log(`⏩ All set videos in this batch satisfied (existing or reused)!`);
    return [];
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Would generate ${setsToGenerate.length} set videos: ${setsToGenerate.map((s) => `Set ${s.setIndex} (Ayahs ${s.startAyah}–${s.endAyah})`).join(", ")}`);
    return setsToGenerate;
  }

  const { GoogleGenAI, GenerateVideosOperation } = await import("@google/genai");
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PIPELINE_CONFIG.projectId,
    location: PIPELINE_CONFIG.location,
  });

  console.log(`\n🚀 Submitting Veo 3.1 Fast batch of ${setsToGenerate.length} meaning-based set videos concurrently...`);
  const activeOps = [];

  for (const s of setsToGenerate) {
    const targetFile = path.join(surahDir, s.videoFileName);
    console.log(`  Initiating Surah ${surahNum} Set ${s.setIndex} (Ayahs ${s.startAyah}–${s.endAyah}) [${s.environment.name}]...`);
    try {
      const op = await ai.models.generateVideos({
        model: PIPELINE_CONFIG.model,
        source: { prompt: s.prompt },
        config: {
          aspectRatio: PIPELINE_CONFIG.aspectRatio,
          durationSeconds: PIPELINE_CONFIG.durationSec,
          resolution: PIPELINE_CONFIG.resolution,
        },
      });
      console.log(`  ✓ Set ${s.setIndex} -> Operation: ${op.name}`);
      activeOps.push({
        set: s,
        operationName: op.name,
        targetFile,
        done: false,
      });
    } catch (err) {
      console.error(`  ❌ Failed to submit Set ${s.setIndex}:`, err.message);
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n⏳ Polling progress for ${activeOps.length} set operations concurrently...`);
  let pollRound = 0;
  const startTime = Date.now();

  while (activeOps.some((o) => !o.done)) {
    pollRound++;
    await new Promise((r) => setTimeout(r, 7000));
    const pendingCount = activeOps.filter((o) => !o.done).length;
    process.stdout.write(`  [Poll #${pollRound} @ ${pollRound * 7}s] ${pendingCount}/${activeOps.length} set videos rendering... \r`);

    for (const item of activeOps) {
      if (item.done) continue;
      try {
        const queryOp = new GenerateVideosOperation();
        queryOp.name = item.operationName;
        const updated = await ai.operations.getVideosOperation({ operation: queryOp });
        if (updated.done) {
          item.done = true;
          if (updated.error) {
            console.error(`\n  ❌ Set ${item.set.setIndex} failed:`, updated.error);
          } else {
            const vid = updated.response?.generatedVideos?.[0]?.video;
            const rawBytes = vid?.videoBytes || vid?.bytesBase64Encoded;
            if (rawBytes) {
              const rawTargetFile = path.join(surahDir, `raw_${item.set.videoFileName}`);
              const buf = Buffer.from(rawBytes, "base64");
              fs.writeFileSync(rawTargetFile, buf);
              console.log(`\n  ✅ Raw Set ${item.set.setIndex} received! (${(buf.length / 1024 / 1024).toFixed(2)} MB). Auto-compressing & de-letterboxing...`);

              compressAndDeletterbox(rawTargetFile, item.targetFile);
              try { fs.unlinkSync(rawTargetFile); } catch {}

              const compSize = fs.existsSync(item.targetFile) ? fs.statSync(item.targetFile).size : buf.length;
              console.log(`  ✅ Set ${item.set.setIndex} (Ayahs ${item.set.startAyah}–${item.set.endAyah}) saved! (${(compSize / 1024 / 1024).toFixed(2)} MB)`);

              for (const v of item.set.verses) {
                const ayahPath = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
                try {
                  fs.copyFileSync(item.targetFile, ayahPath);
                } catch {}
              }
              console.log(`     ↳ Linked 1 video to all ${item.set.verseCount} ayahs in Set ${item.set.setIndex}.`);
            }
          }
        }
      } catch (pollErr) {}
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✨ Batch of ${activeOps.length} set videos completed in ${elapsed}s!`);
  return activeOps;
}

export async function processSurahBySets(surahNum, options = {}) {
  console.log("\n======================================================================");
  console.log(`🎬 Processing Surah ${surahNum} via Meaning-Based Sets (5–10 Ayahs per Video)`);
  console.log("======================================================================");

  const progress = loadProgress();
  progress.currentSurah = surahNum;
  progress.status = "RUNNING";

  const verses = await fetchSurahVerses(surahNum);
  const totalVerses = verses.length;
  const sets = groupVersesIntoMeaningSets(verses, 7, surahNum);
  console.log(`📖 Loaded ${totalVerses} Ayahs -> Grouped into ${sets.length} Thematic Sets for Surah ${surahNum}`);

  const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}`);
  ensureDir(surahDir);

  const batchSize = options.batchSize || 5;
  let pass = 0;

  while (pass < 3) {
    pass++;
    if (options.dryRun && pass > 1) break;
    const currentPendingSets = (pass === 1 && options.force)
      ? sets
      : sets.filter((s) => !fs.existsSync(path.join(surahDir, s.videoFileName)));
    if (currentPendingSets.length === 0) break;

    console.log(`\n🔄 Pass ${pass}: Processing ${currentPendingSets.length} remaining sets for Surah ${surahNum}...`);
    for (let i = 0; i < currentPendingSets.length; i += batchSize) {
      const batch = currentPendingSets.slice(i, i + batchSize);
      console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(currentPendingSets.length / batchSize)} (Sets ${batch[0].setIndex}–${batch[batch.length - 1].setIndex})...`);
      await generateBatchSets(surahNum, batch, options);

      const completedSets = sets.filter((s) => fs.existsSync(path.join(surahDir, s.videoFileName))).length;
      progress.surahs[surahNum] = {
        surahNumber: surahNum,
        totalVerses,
        totalSets: sets.length,
        completedSets,
        pendingSets: sets.length - completedSets,
        completedCount: verses.filter((v) => fs.existsSync(path.join(surahDir, `ayah_${v.ayahNumber}.mp4`))).length,
        status: completedSets === sets.length ? "LOCAL_READY" : "GENERATING",
        mode: "THEMATIC_SETS_5_TO_10_AYAHS",
        lastUpdated: new Date().toISOString(),
      };
      saveProgress(progress);
      buildReviewPage(surahNum, verses, {});
    }
  }

  const reviewFile = buildReviewPage(surahNum, verses, {});
  progress.surahs[surahNum] = {
    surahNumber: surahNum,
    totalVerses,
    totalSets: sets.length,
    completedSets: sets.filter((s) => fs.existsSync(path.join(surahDir, s.videoFileName))).length,
    completedCount: verses.filter((v) => fs.existsSync(path.join(surahDir, `ayah_${v.ayahNumber}.mp4`))).length,
    status: "LOCAL_READY",
    previewHtml: reviewFile,
    mode: "THEMATIC_SETS_5_TO_10_AYAHS",
    lastUpdated: new Date().toISOString(),
  };
  saveProgress(progress);

  console.log("\n======================================================================");
  console.log(`🎉 Surah ${surahNum} (Set-Based) is ready! (LOCAL ONLY)`);
  console.log(`   Preview: file://${reviewFile}`);
  console.log("======================================================================");

  return { surahNum, totalVerses, setsCount: sets.length, reviewFile };
}

// ── 7. MAIN ORCHESTRATION LOOP ────────────────────────────────────────────────

export async function processSurah(surahNum, options = {}) {
  if (surahNum >= 4 || options.useSets) {
    return processSurahBySets(surahNum, options);
  }

  console.log("\n======================================================================");
  console.log(`🎬 Processing Surah ${surahNum} of 114 (Individual Ayahs)`);
  console.log("======================================================================");

  const progress = loadProgress();
  progress.currentSurah = surahNum;
  progress.status = "RUNNING";

  const verses = await fetchSurahVerses(surahNum);
  const totalVerses = verses.length;
  console.log(`📖 Loaded ${totalVerses} Ayahs for Surah ${surahNum}`);

  const surahDir = path.join(PIPELINE_CONFIG.videosDir, `surah_${surahNum}`);
  ensureDir(surahDir);

  // Identify verses that need generation
  const pendingVerses = [];
  const completedVerses = [];

  for (const v of verses) {
    const targetFile = path.join(surahDir, `ayah_${v.ayahNumber}.mp4`);
    if (fs.existsSync(targetFile)) {
      completedVerses.push(v.ayahNumber);
    } else {
      pendingVerses.push(v);
    }
  }

  console.log(`📊 Status: ${completedVerses.length} already completed, ${pendingVerses.length} pending generation`);

  const batchSize = options.batchSize || PIPELINE_CONFIG.defaultBatchSize;
  let pass = 0;

  while (pass < 3) {
    pass++;
    if (options.dryRun && pass > 1) break;
    const currentPending = verses.filter(
      (v) => !fs.existsSync(path.join(surahDir, `ayah_${v.ayahNumber}.mp4`))
    );
    if (currentPending.length === 0) break;

    console.log(`\n🔄 Pass ${pass}: Processing ${currentPending.length} remaining verses for Surah ${surahNum}...`);
    for (let i = 0; i < currentPending.length; i += batchSize) {
      const batch = currentPending.slice(i, i + batchSize);
      console.log(`\n📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(currentPending.length / batchSize)} (Ayahs ${batch[0].ayahNumber}–${batch[batch.length - 1].ayahNumber})...`);

      await generateBatchVideos(surahNum, batch, options);
      const newlyCompleted = verses.filter((v) =>
        fs.existsSync(path.join(surahDir, `ayah_${v.ayahNumber}.mp4`))
      ).length;

      progress.surahs[surahNum] = {
        surahNumber: surahNum,
        totalVerses,
        completedCount: newlyCompleted,
        pendingCount: totalVerses - newlyCompleted,
        status: newlyCompleted === totalVerses ? "LOCAL_READY" : "GENERATING",
        lastUpdated: new Date().toISOString(),
      };
      saveProgress(progress);
      buildReviewPage(surahNum, verses, {});
    }
  }

  // Build Review Page
  const reviewFile = buildReviewPage(surahNum, verses, {});

  progress.surahs[surahNum] = {
    surahNumber: surahNum,
    totalVerses,
    completedCount: completedVerses.length,
    status: "REVIEW_READY",
    previewHtml: reviewFile,
    lastUpdated: new Date().toISOString(),
  };
  progress.status = "AWAITING_APPROVAL";
  saveProgress(progress);

  console.log("\n======================================================================");
  console.log(`🎉 Surah ${surahNum} is ready for single-click approval!`);
  console.log(`   Preview: file://${reviewFile}`);
  console.log("======================================================================");

  return { surahNum, totalVerses, reviewFile };
}

// ── 8. DEPLOYMENT TO CLOUDFLARE R2 ────────────────────────────────────────────

export async function deploySurah(surahNum) {
  console.log(`\n🚀 Deploying Surah ${surahNum} master sets to Cloudflare R2...`);
  try {
    execSync(
      `node scripts/tools/upload-to-r2.mjs --category=videos --surah=${surahNum} --sets-only --execute`,
      { stdio: "inherit", cwd: ROOT_DIR }
    );
    const progress = loadProgress();
    if (progress.surahs && progress.surahs[surahNum]) {
      progress.surahs[surahNum].status = "DEPLOYED";
      progress.surahs[surahNum].deployedAt = new Date().toISOString();
      progress.completedSurahCount = Object.values(progress.surahs).filter((s) => s.status === "DEPLOYED").length;
      saveProgress(progress);
    }
    console.log(`✅ Surah ${surahNum} successfully deployed to Cloudflare R2!`);
  } catch (err) {
    console.error(`❌ Failed to deploy Surah ${surahNum} to R2:`, err.message);
  }
}

// ── CLI ENTRY POINT ───────────────────────────────────────────────────────────

if (process.argv[1] && process.argv[1].endsWith("automated-quran-video-pipeline.mjs")) {
  const args = process.argv.slice(2);
  const preserveOnly = args.includes("--preserve-only");
  const dryRun = args.includes("--dry-run");

  let startSurah = 3;
  let endSurah = 114;
  let batchSize = 5;
  const autoAdvance = args.includes("--auto-advance") || args.includes("--all-surahs");
  const force = args.includes("--force");

  for (const arg of args) {
    if (arg.startsWith("--start=")) startSurah = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--end=")) endSurah = parseInt(arg.split("=")[1], 10);
    if (arg.startsWith("--batch-size=")) batchSize = parseInt(arg.split("=")[1], 10);
  }

  (async () => {
    preserveExistingVideos();
    if (preserveOnly) {
      console.log("Preservation complete. Exiting.");
      process.exit(0);
    }

    console.log(`🚀 Starting Autonomous Quran Video Pipeline (Surahs ${startSurah} to ${endSurah})...`);
    for (let s = startSurah; s <= endSurah; s++) {
      await processSurah(s, { dryRun, batchSize, force });
      console.log(`\n🔔 Status for Surah ${s}: Completed.`);
      if (!autoAdvance) {
        console.log(`\n🔔 Prompting operator for Surah ${s} approval:`);
        console.log(`"Surah ${s} is ready. Type 'OK' to deploy and auto-advance to Surah ${s + 1}, or 'PAUSE' to stop."`);
        break;
      }
      await deploySurah(s);
    }
  })().catch((err) => {
    console.error("Pipeline Error:", err);
    process.exit(1);
  });
}
