// ─────────────────────────────────────────────────────────────────────────
//  HuDa Web Quran — Verse-Aware Cinematic Video Generator (Surahs 1–114)
//
//  Generates HIGH-QUALITY 1080p Full HD video assets for each Surah
//  based directly on the specific Quranic Ayahs, Core Meaning, and
//  theological themes defined in quran-artwork.ts and surahList.ts.
//
//  Features:
//    - "Don't repeat": Unique camera motion profile per Surah mood
//      (slow forward dolly, reveal pull-back, horizontal drift, crane rise)
//    - "Looping softly": Broadcast-grade 1.0s overlap crossfade loop
//      (zero jump-cut, seamlessly connects end frame to start frame)
//    - "HQ video": 1920x1080 Full HD @ 24fps cinema cadence, libx264
//      CRF 19, high profile, faststart enabled for web streaming.
//
//  Usage:
//    node scripts/generation/generate_surah_verse_videos.mjs --limit=5     # test first 5
//    node scripts/generation/generate_surah_verse_videos.mjs --all         # generate all 114
//    node scripts/generation/generate_surah_verse_videos.mjs --surah=3     # single surah
// ─────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const BASE_DIR = process.cwd();
const ARTWORK_PATH = path.join(BASE_DIR, "src/lib/data/quran-artwork.ts");
const IMAGES_DIR = path.join(BASE_DIR, "public/images/quran");
const VIDEOS_DIR = path.join(BASE_DIR, "public/videos/surah");

fs.mkdirSync(VIDEOS_DIR, { recursive: true });

// Load 114 Quran Artwork concepts directly from source
function loadSurahConcepts() {
  const content = fs.readFileSync(ARTWORK_PATH, "utf8");
  const match = content.match(/QURAN_ARTWORK_CONCEPTS:\s*SurahArtworkConcept\[\]\s*=\s*(\[[\s\S]*?\]);/);
  if (!match || !match[1]) {
    throw new Error("Failed to parse QURAN_ARTWORK_CONCEPTS from quran-artwork.ts");
  }
  return JSON.parse(match[1]);
}

// Map Surah mood/theme to dynamic, non-repetitive cinematic camera motion
function getMotionProfile(surahNumber, mood = "", core = "") {
  const text = (mood + " " + core).toLowerCase();

  // Pattern A: Celestial, vast night sky, cosmic, heavens -> Gentle slow pull-back reveal
  if (text.includes("cosmic") || text.includes("stars") || text.includes("heavens") || text.includes("sky") || text.includes("space")) {
    return {
      name: "cosmic-pullback",
      filter: "scale=2880:1620,zoompan=z='max(1.06-0.0003*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=264:s=1920x1080:fps=24",
    };
  }

  // Pattern B: River, water, gardens, provisions -> Smooth lateral horizontal drift
  if (text.includes("water") || text.includes("river") || text.includes("garden") || text.includes("rain") || text.includes("fruit")) {
    return {
      name: "lateral-drift",
      filter: "scale=2880:1620,zoompan=z='1.04':x='if(lte(on,1),(iw-iw/zoom)/2,x+0.35)':y='ih/2-(ih/zoom/2)':d=264:s=1920x1080:fps=24",
    };
  }

  // Pattern C: Mountains, revelation, steadfast, high peaks -> Subtle vertical crane rise
  if (text.includes("mountain") || text.includes("strength") || text.includes("revelation") || text.includes("justice") || text.includes("stone")) {
    return {
      name: "vertical-rise",
      filter: "scale=2880:1620,zoompan=z='1.04':x='iw/2-(iw/zoom/2)':y='if(lte(on,1),(ih-ih/zoom)/2,y-0.28)':d=264:s=1920x1080:fps=24",
    };
  }

  // Pattern D: Sanctuary, peace, protection, devotion -> Soft atmospheric breathing drift
  if (text.includes("peace") || text.includes("sanctuary") || text.includes("purity") || text.includes("protection")) {
    return {
      name: "atmospheric-breathing",
      filter: "scale=2880:1620,zoompan=z='1.02+0.018*sin(2*PI*on/264)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=264:s=1920x1080:fps=24",
    };
  }

  // Default Pattern E: Path, guidance, dawn light -> Slow forward cinematic dolly
  return {
    name: "forward-dolly",
    filter: "scale=2880:1620,zoompan=z='min(zoom+0.00032,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=264:s=1920x1080:fps=24",
  };
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSurahVideo(concept, force = false) {
  const pad = String(concept.surahNumber).padStart(3, "0");
  const slug = slugify(concept.name);
  const finalVideoName = `${pad}-${slug}.mp4`;
  const finalPath = path.join(VIDEOS_DIR, finalVideoName);
  const legacyPath = path.join(VIDEOS_DIR, `${pad}-surah.mp4`);

  // If already generated and not forcing, skip
  if (!force && fs.existsSync(finalPath) && fs.statSync(finalPath).size > 500000) {
    console.log(`⚡ [Surah ${pad}: ${concept.name}] Video already exists, skipping.`);
    return finalPath;
  }

  // For Surah 1 & 2, keep the multi-scene master video if present
  if (concept.surahNumber === 1 && fs.existsSync(path.join(VIDEOS_DIR, "001-al-fatihah.mp4")) && !force) {
    console.log(`✓ [Surah 001: Al-Fatihah] Keeping specialized Veo multi-scene master.`);
    return path.join(VIDEOS_DIR, "001-al-fatihah.mp4");
  }

  const imageSrc = path.join(IMAGES_DIR, `surah-${concept.surahNumber}.jpg`);
  if (!fs.existsSync(imageSrc)) {
    console.warn(`⚠️ [Surah ${pad}] Image not found: ${imageSrc}. Skipping.`);
    return null;
  }

  const rawPath = path.join(VIDEOS_DIR, `tmp-${pad}-raw.mp4`);
  const motion = getMotionProfile(concept.surahNumber, concept.mood, concept.core);

  console.log(`\n======================================================================`);
  console.log(`🎬 Rendering HQ Soft-Loop Video: Surah ${concept.surahNumber} (${concept.name})`);
  console.log(`   Ayat:    ${concept.ayat}`);
  console.log(`   Theme:   ${concept.core}`);
  console.log(`   Motion:  ${motion.name}`);
  console.log(`   Target:  ${finalVideoName}`);
  console.log(`======================================================================`);

  try {
    // 1. Generate 11s motion at 1080p 24fps
    const cmdMotion = `ffmpeg -y -loop 1 -i "${imageSrc}" -vf "${motion.filter}" -t 11 -c:v libx264 -pix_fmt yuv420p -crf 19 -preset fast "${rawPath}"`;
    execSync(cmdMotion, { stdio: "ignore" });

    // 2. Encode 1.0s broadcast-grade seamless soft loop crossfade
    // 11s raw: body 1s..11s (10s), head 0s..1s, tail 10s..11s -> seam 1s -> total 10s perfect loop
    const filterGraph = (
      `[0:v]split=2[v1][v2];` +
      `[v1]trim=start=1.0:end=11.0,setpts=PTS-STARTPTS[body];` +
      `[v2]trim=start=0:end=1.0,setpts=PTS-STARTPTS[head];` +
      `[0:v]trim=start=10.0:end=11.0,setpts=PTS-STARTPTS[tail];` +
      `[tail][head]xfade=transition=fade:duration=1.0:offset=0[seam];` +
      `[body][seam]concat=n=2:v=1:a=0[outv]`
    );

    const cmdLoop = `ffmpeg -y -i "${rawPath}" -filter_complex "${filterGraph}" -map "[outv]" -c:v libx264 -pix_fmt yuv420p -preset medium -crf 19 -movflags +faststart -an "${finalPath}"`;
    execSync(cmdLoop, { stdio: "ignore" });

    // Also link/copy to legacy fallback path if different
    if (finalPath !== legacyPath && !fs.existsSync(legacyPath)) {
      try {
        fs.copyFileSync(finalPath, legacyPath);
      } catch {}
    }

    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);

    const stats = fs.statSync(finalPath);
    console.log(`✓ Successfully encoded 1080p soft-loop video: ${finalVideoName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    return finalPath;
  } catch (err) {
    console.error(`❌ Failed to encode Surah ${concept.surahNumber}:`, err.message);
    if (fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const surahArg = args.find((a) => a.startsWith("--surah="))?.split("=")[1];
  const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const force = args.includes("--force");
  const all = args.includes("--all") || (!surahArg && !limitArg);

  console.log("======================================================================");
  console.log("  HuDa Web Quran — 114 Surah Verse Meaning Video Generator Engine      ");
  console.log("======================================================================");

  const concepts = loadSurahConcepts();
  console.log(`Loaded ${concepts.length} Surah verse-meaning concepts.`);

  let targetList = concepts;
  if (surahArg) {
    const num = Number(surahArg);
    targetList = concepts.filter((c) => c.surahNumber === num);
  } else if (limitArg) {
    targetList = concepts.slice(0, Number(limitArg));
  }

  console.log(`Processing ${targetList.length} Surahs...\n`);

  let count = 0;
  for (const concept of targetList) {
    const res = generateSurahVideo(concept, force);
    if (res) count++;
  }

  console.log("\n======================================================================");
  console.log(`✓ COMPLETED: Generated/Verified ${count} of ${targetList.length} Surah videos.`);
  console.log("======================================================================");
}

main().catch(console.error);
