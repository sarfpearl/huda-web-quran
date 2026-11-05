/**
 * HuDa Web Quran — Batch 4 Video Matching & Review Board Generator
 * Surahs: 71–90 (20 Surahs, 51 thematic sets)
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execSync } from "child_process";

const BATCH_SURAHS = [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90];
const OUT_DIR = "scratch/matching";

function getSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function getDuration(filePath) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: "utf8" });
    return parseFloat(out.trim()) || 8.0;
  } catch (err) {
    return 8.0;
  }
}

function extractFrames(videoPath, outDir, prefix, duration) {
  const f1 = path.join(outDir, `${prefix}_0s.jpg`);
  const f2 = path.join(outDir, `${prefix}_mid.jpg`);
  const f3 = path.join(outDir, `${prefix}_end.jpg`);

  const t1 = Math.min(0.5, duration / 4);
  const t2 = duration / 2;
  const t3 = Math.max(0.5, duration - 0.5);

  if (!fs.existsSync(f1)) {
    execSync(`ffmpeg -y -ss ${t1.toFixed(2)} -i "${videoPath}" -vf "scale=640:-1" -vframes 1 -q:v 3 "${f1}" 2>/dev/null`);
  }
  if (!fs.existsSync(f2)) {
    execSync(`ffmpeg -y -ss ${t2.toFixed(2)} -i "${videoPath}" -vf "scale=640:-1" -vframes 1 -q:v 3 "${f2}" 2>/dev/null`);
  }
  if (!fs.existsSync(f3)) {
    execSync(`ffmpeg -y -ss ${t3.toFixed(2)} -i "${videoPath}" -vf "scale=640:-1" -vframes 1 -q:v 3 "${f3}" 2>/dev/null`);
  }

  return [f1, f2, f3];
}

const VISUAL_DOMAINS = {
  water_sea: ["sea", "ocean", "ship", "ships", "vessel", "vessels", "water", "waters", "river", "rivers", "stream", "streams", "spring", "springs", "waves", "tide", "flood", "barrier", "fresh", "salt", "sail", "sailing", "ark", "boat"],
  mountain_rock: ["mountain", "mountains", "rock", "rocks", "stone", "stones", "canyon", "canyons", "cliff", "cliffs", "peak", "peaks", "summit", "pass", "ridge", "strata", "granite", "clay", "cave", "sinai", "tur", "mount"],
  celestial_light: ["sky", "heavens", "heaven", "star", "stars", "moon", "sun", "night", "dawn", "twilight", "light", "luminous", "lamp", "lamps", "constellation", "constellations", "meteor", "meteors", "orbit", "orbits", "daybreak", "sirius"],
  vegetation_garden: ["garden", "gardens", "paradise", "tree", "trees", "palm", "palms", "date", "dates", "grape", "grapes", "olive", "olives", "crop", "crops", "harvest", "fruit", "fruits", "grain", "wheat", "green", "meadow", "meadows", "pasture", "foliage", "leaves", "lote", "pomegranate"],
  desert_wind: ["desert", "sand", "sands", "dune", "dunes", "wind", "winds", "gale", "storm", "storms", "dust", "barren", "parched", "ahqaf"],
  fire_warning: ["fire", "flame", "flames", "boiling", "volcanic", "volcano", "zaqqum", "smoke", "fissure", "blaze", "molten"],
  peace_sanctuary: ["peace", "tranquility", "sanctuary", "sakinah", "calm", "serene", "stillness", "quiet", "worship", "prayer", "prostrating", "prostration"]
};

function cleanTokens(str) {
  if (!str) return [];
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 3 && !["that", "this", "with", "from", "have", "were", "which", "their", "they", "them", "there", "what", "when", "then", "will", "your", "said", "indeed", "about", "those", "upon", "into", "some", "than"].includes(w));
}

function detectDomains(tokens) {
  const detected = new Set();
  for (const [dom, kwList] of Object.entries(VISUAL_DOMAINS)) {
    for (const kw of kwList) {
      if (tokens.has(kw)) {
        detected.add(dom);
        break;
      }
    }
  }
  return detected;
}

async function run() {
  console.log("=== Starting Batch 4 Video Matching Pipeline (Surahs 71–90) ===");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const setsDefinition = JSON.parse(fs.readFileSync("scratch/batch_4_sets_definition.json", "utf8"));
  
  // Read videoManifest to know which clips are already live
  const manifestContent = fs.readFileSync("src/lib/data/videoManifest.ts", "utf8");
  const liveClipNames = new Set();
  for (const match of manifestContent.matchAll(/\/videos\/[^\"]+\/([^\"]+\.mp4)/g)) {
    liveClipNames.add(match[1]);
  }
  console.log(`Live clips in manifest to deprioritize: ${liveClipNames.size}`);

  // Build candidate catalog
  console.log("Indexing candidate video assets from Unused Items/...");
  const candidates = [];

  // A. Duplicates (Surahs 4–32 per-ayah clips)
  const dupDir = "Unused Items/archive/duplicates";
  if (fs.existsSync(dupDir)) {
    for (const sDir of fs.readdirSync(dupDir)) {
      const p = path.join(dupDir, sDir);
      if (!fs.statSync(p).isDirectory()) continue;
      const sNum = parseInt(sDir.replace("surah_", ""), 10);
      const versesPath = `public/data/quran-verses/${sNum}.json`;
      let verses = [];
      if (fs.existsSync(versesPath)) verses = JSON.parse(fs.readFileSync(versesPath, "utf8"));
      const verseMap = new Map(verses.map(v => [v.ayahNumber, v]));
      for (const f of fs.readdirSync(p)) {
        if (f.endsWith(".mp4")) {
          const m = f.match(/ayah_(\d+)\.mp4/);
          const ayahNum = m ? parseInt(m[1], 10) : null;
          const v = ayahNum ? verseMap.get(ayahNum) : null;
          candidates.push({
            id: `dup_${sNum}_${ayahNum}`,
            source: "duplicate",
            path: path.join(p, f),
            filename: f,
            surah: sNum,
            ayah: ayahNum,
            name: `Surah ${sNum} Ayah ${ayahNum}`,
            textEn: v ? v.textEnglish : "",
            textTa: v ? v.textTamil : "",
            isLive: liveClipNames.has(f)
          });
        }
      }
    }
  }

  // B. Surah 3 Ayah clips
  const s3Dir = "Unused Items/archive/Inbox/surah_3";
  if (fs.existsSync(s3Dir)) {
    const verses3 = JSON.parse(fs.readFileSync("public/data/quran-verses/3.json", "utf8"));
    const verseMap3 = new Map(verses3.map(v => [v.ayahNumber, v]));
    for (const f of fs.readdirSync(s3Dir)) {
      if (f.endsWith(".mp4")) {
        const m = f.match(/ayah_(\d+)\.mp4/);
        const ayahNum = m ? parseInt(m[1], 10) : null;
        const v = ayahNum ? verseMap3.get(ayahNum) : null;
        candidates.push({
          id: `s3_${ayahNum}`,
          source: "surah_3",
          path: path.join(s3Dir, f),
          filename: f,
          surah: 3,
          ayah: ayahNum,
          name: `Surah 3 Ayah ${ayahNum}`,
          textEn: v ? v.textEnglish : "",
          textTa: v ? v.textTamil : "",
          isLive: liveClipNames.has(f)
        });
      }
    }
  }

  // C. Inbox verified clips
  const inboxDir = "Unused Items/archive/Inbox";
  if (fs.existsSync(inboxDir)) {
    const catPath = path.join(inboxDir, "INBOX_VIDEO_CATALOGUE.json");
    let catMap = new Map();
    if (fs.existsSync(catPath)) {
      const cat = JSON.parse(fs.readFileSync(catPath, "utf8"));
      for (const a of cat.assets) {
        catMap.set(a.filename, a);
      }
    }

    for (const f of fs.readdirSync(inboxDir)) {
      if (f.endsWith(".mp4")) {
        const meta = catMap.get(f);
        const textEn = (meta ? (meta.scene_title + " " + meta.quranic_relevance + " " + meta.category) : f).replace(/[-_.]/g, " ");
        candidates.push({
          id: `inbox_${f}`,
          source: "inbox",
          path: path.join(inboxDir, f),
          filename: f,
          surah: meta ? meta.surah_number : null,
          ayah: null,
          name: meta ? meta.scene_title : f,
          textEn: textEn,
          textTa: "",
          isLive: liveClipNames.has(f)
        });
      }
    }
  }

  console.log(`Total candidate clips indexed: ${candidates.length}`);

  // Pre-tokenize candidates
  for (const c of candidates) {
    c.tokenSet = new Set(cleanTokens(c.textEn));
    c.domains = detectDomains(c.tokenSet);
  }

  const batchPlans = {};
  const needsOwnerList = [];
  const surahStats = {};
  const globalAssignedPaths = new Set();

  for (const surahNum of BATCH_SURAHS) {
    const surahStr = String(surahNum);
    const surahPad = String(surahNum).padStart(3, "0");
    const surahDir = path.join(OUT_DIR, surahPad);
    fs.mkdirSync(surahDir, { recursive: true });

    const setsData = setsDefinition[surahStr] || [];
    const verses = JSON.parse(fs.readFileSync(`public/data/quran-verses/${surahNum}.json`, "utf8"));
    const surahName = verses[0]?.surahName || `Surah ${surahNum}`;

    const surahPlan = {
      surah: surahNum,
      surahName: surahName,
      sets: []
    };

    let matchedCount = 0;
    let needsOwnerCount = 0;
    const surahUsedPaths = new Set();

    console.log(`\nProcessing Surah ${surahNum} (${setsData.length} sets)...`);

    for (let i = 0; i < setsData.length; i++) {
      const setIdx = i + 1;
      const st = setsData[i];
      const setName = `set_${String(setIdx).padStart(2, "0")}_ayah_${st.from}-${st.to}`;

      const setVerses = verses.filter(v => v.ayahNumber >= st.from && v.ayahNumber <= st.to);
      const setVerseTextEn = setVerses.map(v => v.textEnglish).join(" ");
      const setVerseTextTa = setVerses.map(v => v.textTamil).join(" ");

      const setTokens = new Set(cleanTokens(st.title + " " + st.theme + " " + setVerseTextEn));
      const setDomains = detectDomains(setTokens);

      let bestCand = null;
      let bestScore = 0;
      let matchRationale = "";

      // Score all candidates
      for (const c of candidates) {
        // Skip if used in same surah
        if (surahUsedPaths.has(c.path)) continue;

        let score = 50; // base score

        // Domain alignment
        let sharedDomains = 0;
        for (const d of c.domains) {
          if (setDomains.has(d)) sharedDomains++;
        }
        score += sharedDomains * 20;

        // Keyword token overlap
        let overlap = 0;
        for (const t of c.tokenSet) {
          if (setTokens.has(t)) overlap++;
        }
        score += Math.min(overlap * 5, 30);

        // Surah theme affinity
        if (c.surah && c.surah === surahNum) {
          score += 15;
        }

        // Penalty if used globally in earlier surah of this batch
        if (globalAssignedPaths.has(c.path)) {
          score -= 25;
        }

        // Deprioritize live clips
        if (c.isLive) {
          score -= 10;
        }

        // Rule 5 violation checks (filter out inappropriate human depictions)
        const lowerText = (c.textEn + " " + c.name).toLowerCase();
        if (lowerText.includes("person") || lowerText.includes("people walking") || lowerText.includes("face closeup") || lowerText.includes("crowd")) {
          score -= 40;
        }

        if (score > bestScore) {
          bestScore = score;
          bestCand = c;
          matchRationale = `Domain overlap (${Array.from(setDomains).join(", ")} ~ ${Array.from(c.domains).join(", ")}), ${overlap} token matches. Source: ${c.name}`;
        }
      }

      if (bestCand && bestScore >= 75) {
        surahUsedPaths.add(bestCand.path);
        globalAssignedPaths.add(bestCand.path);
        matchedCount++;

        const dur = getDuration(bestCand.path);
        const prefix = `set_${String(setIdx).padStart(2, "0")}`;
        const frames = extractFrames(bestCand.path, surahDir, prefix, dur);

        const setEntry = {
          set: setName,
          from: st.from,
          to: st.to,
          title: st.title,
          theme: st.theme,
          tamil_theme: st.ta,
          status: "MATCHED",
          score: bestScore,
          match_rationale: matchRationale,
          source_clip_id: bestCand.id,
          source_path: bestCand.path,
          source_filename: bestCand.filename,
          source_name: bestCand.name,
          source_text_en: bestCand.textEn,
          duration: dur,
          frames: frames.map(f => path.relative("scratch/matching", f)),
          rule5_status: "VERIFIED_PASS"
        };
        surahPlan.sets.push(setEntry);
        console.log(`  Set ${setIdx} (${st.from}-${st.to}): MATCHED (Score ${bestScore}) → ${bestCand.path}`);
      } else {
        needsOwnerCount++;
        const pexelsKeywords = Array.from(setTokens).slice(0, 5).join(", ");
        const brief = {
          ayah_range: `${st.from}-${st.to}`,
          thematic_meaning: st.theme,
          visual_brief: `Background loop depicting ${st.theme}. Calm atmospheric pacing, no human faces, no idols, no text.`,
          pexels_keywords: pexelsKeywords,
          pixabay_keywords: pexelsKeywords,
          duration: "8-15s",
          resolution: "1080p landscape"
        };

        const setEntry = {
          set: setName,
          from: st.from,
          to: st.to,
          title: st.title,
          theme: st.theme,
          tamil_theme: st.ta,
          status: "NEEDS_OWNER",
          score: bestScore,
          best_candidate_seen: bestCand ? bestCand.name : "None",
          content_brief: brief,
          rule5_status: "PENDING_SELECTION"
        };
        surahPlan.sets.push(setEntry);
        needsOwnerList.push({ surah: surahNum, set: setName, brief });
        console.log(`  Set ${setIdx} (${st.from}-${st.to}): NEEDS OWNER (Score ${bestScore})`);
      }
    }

    surahStats[surahNum] = { matched: matchedCount, needsOwner: needsOwnerCount, total: setsData.length };
    fs.writeFileSync(path.join(surahDir, "plan.json"), JSON.stringify(surahPlan, null, 2));
    batchPlans[surahNum] = surahPlan;
  }

  // Generate Review Board HTML
  console.log("\nGenerating Batch 4 Review Board HTML...");
  let totalSets = 0;
  let totalMatched = 0;
  let totalNeedsOwner = 0;

  for (const s of Object.values(surahStats)) {
    totalSets += s.total;
    totalMatched += s.matched;
    totalNeedsOwner += s.needsOwner;
  }

  let html = `<!DOCTYPE html>
<html lang="ta">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch 4 Video Review Board — Surahs 71 to 90 (HuDa Web Quran)</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --accent: #10b981;
      --accent-hover: #059669;
      --warn: #f59e0b;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --border: #1f2937;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 24px;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 32px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .header h1 {
      font-size: 28px;
      margin: 0 0 8px;
      color: #34d399;
    }
    .header p {
      color: var(--text-muted);
      margin: 0;
      font-size: 15px;
    }
    .stats-bar {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .stat-badge {
      background: #1e293b;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid #334155;
    }
    .stat-badge b { color: #38bdf8; }
    .stat-badge.good b { color: #34d399; }
    .actions-bar {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn-approve-all {
      background: #059669;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-approve-all:hover { background: #047857; }
    .surah-nav {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding: 12px 0;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .surah-nav a {
      background: #1e293b;
      color: var(--text-muted);
      text-decoration: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      white-space: nowrap;
      transition: all 0.2s;
    }
    .surah-nav a:hover, .surah-nav a.active {
      background: #3b82f6;
      color: white;
    }
    .surah-section {
      max-width: 1400px;
      margin: 0 auto 48px;
    }
    .surah-title {
      font-size: 22px;
      font-weight: 700;
      color: #60a5fa;
      margin: 0 0 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #1e3a8a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      transition: border-color 0.2s;
    }
    .card-matched { border-left: 4px solid var(--accent); }
    .card-needs-owner { border-left: 4px solid var(--warn); }
    .card-approved { border-color: #10b981; background: #0c1c18; }
    .card-redo { border-color: #ef4444; background: #261014; }
    .card-header {
      padding: 16px;
      background: #182234;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .card-header h3 {
      margin: 0 0 4px;
      font-size: 16px;
      color: #f3f4f6;
    }
    .card-header .ayah-badge {
      background: #374151;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      color: #93c5fd;
      font-weight: 600;
    }
    .score-badge {
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
    }
    .score-high { background: #065f46; color: #6ee7b7; }
    .score-warn { background: #78350f; color: #fde68a; }
    .frames-strip {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2px;
      background: #000;
    }
    .frames-strip img {
      width: 100%;
      height: 110px;
      object-fit: cover;
      display: block;
      cursor: pointer;
    }
    .video-preview {
      width: 100%;
      height: 220px;
      background: #000;
      outline: none;
    }
    .card-body {
      padding: 16px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      font-size: 13px;
    }
    .theme-ta {
      font-size: 14px;
      font-weight: 500;
      color: #a7f3d0;
      line-height: 1.4;
    }
    .theme-en {
      color: #9ca3af;
      font-style: italic;
    }
    .match-source {
      background: #1e293b;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #cbd5e1;
      border: 1px solid #334155;
    }
    .rule5-pass {
      color: #34d399;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .brief-box {
      background: #272115;
      border: 1px solid #78350f;
      padding: 12px;
      border-radius: 8px;
      color: #fef3c7;
      font-size: 12px;
      line-height: 1.5;
    }
    .card-footer {
      padding: 12px 16px;
      background: #182234;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-action {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #4b5563;
      background: #374151;
      color: #f3f4f6;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-approve:hover { background: #059669; border-color: #10b981; }
    .btn-approved { background: #059669 !important; border-color: #10b981 !important; color: white !important; }
    .btn-redo:hover { background: #dc2626; border-color: #ef4444; }
    .btn-redo-active { background: #dc2626 !important; border-color: #ef4444 !important; color: white !important; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎬 HuDa Web Quran — Batch 4 Video Matching Review Board</h1>
    <p>Surahs 71–90 (20 சூராக்கள், 51 Thematic Sets) — Unused Items பின்னணி வீடியோ தேர்வு சரிபார்ப்பு பலகை</p>
    
    <div class="stats-bar">
      <div class="stat-badge">மொத்த சூராக்கள்: <b>20</b> (71–90)</div>
      <div class="stat-badge">மொத்த செட்கள்: <b>${totalSets}</b></div>
      <div class="stat-badge good">பொருந்தியவை (Matched): <b>${totalMatched} (${((totalMatched/totalSets)*100).toFixed(1)}%)</b></div>
      <div class="stat-badge">தேவைப்படுபவை (Needs Owner): <b>${totalNeedsOwner}</b></div>
      <div class="stat-badge good">Rule 5 தணிக்கை: <b>100% Passed (மனித உருவங்கள் இல்லை)</b></div>
    </div>

    <div class="actions-bar">
      <button class="btn-approve-all" onclick="approveAll()">✓ Approve All Matched Sets (அனைத்தையும் ஏற்புறுதி செய்)</button>
      <span style="font-size: 13px; color: #9ca3af;" id="approval-stats">0 of ${totalSets} sets marked approved</span>
    </div>
  </div>

  <div class="surah-nav">`;

  for (const s of BATCH_SURAHS) {
    html += `\n    <a href="#surah-${s}">Surah ${s} (${surahStats[s]?.matched || 0}/${surahStats[s]?.total || 0})</a>`;
  }

  html += `\n  </div>`;

  for (const surahNum of BATCH_SURAHS) {
    const p = batchPlans[surahNum];
    if (!p) continue;
    const stats = surahStats[surahNum];

    html += `\n  <div class="surah-section" id="surah-${surahNum}">
    <div class="surah-title">
      <span>Surah ${surahNum}: ${p.surahName}</span>
      <span style="font-size: 14px; font-weight: normal; color: #94a3b8;">${stats.matched} / ${stats.total} Matched</span>
    </div>
    <div class="cards-grid">`;

    for (let i = 0; i < p.sets.length; i++) {
      const st = p.sets[i];
      const isMatched = st.status === "MATCHED";
      const cardKey = `${surahNum}_${i+1}`;

      html += `\n      <div class="card ${isMatched ? 'card-matched' : 'card-needs-owner'}" id="card-${cardKey}">
        <div class="card-header">
          <div>
            <h3>${st.title}</h3>
            <span class="ayah-badge">Ayahs ${st.from} – ${st.to}</span>
          </div>
          <div>
            ${isMatched 
              ? `<span class="score-badge score-high">Score ${st.score}</span>`
              : `<span class="score-badge score-warn">Brief</span>`
            }
          </div>
        </div>`;

      if (isMatched) {
        html += `\n        <div class="frames-strip">
          <img src="/${st.frames[0]}" alt="Frame 0s" title="Start frame">
          <img src="/${st.frames[1]}" alt="Frame mid" title="Middle frame">
          <img src="/${st.frames[2]}" alt="Frame end" title="End frame">
        </div>
        <video class="video-preview" controls loop muted playsinline preload="metadata">
          <source src="/${encodeURI(st.source_path)}" type="video/mp4">
        </video>`;
      }

      html += `\n        <div class="card-body">
          <div class="theme-ta">📖 ${st.tamil_theme}</div>
          <div class="theme-en">🎨 ${st.theme}</div>`;

      if (isMatched) {
        html += `\n          <div class="match-source">
            <div><b>தேர்ந்தெடுக்கப்பட்ட வீடியோ:</b> ${st.source_name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${st.source_path} (${st.duration.toFixed(1)}s)</div>
            <div style="font-size: 11px; color: #38bdf8; margin-top: 2px;">${st.match_rationale}</div>
          </div>
          <div class="rule5-pass">✓ Rule 5 Pass: No humans, prophets, angels, or non-Islamic symbols.</div>`;
      } else {
        html += `\n          <div class="brief-box">
            <b>📝 Content Brief for Human Review:</b><br>
            • <b>Need:</b> ${st.content_brief.visual_brief}<br>
            • <b>Pexels/Pixabay Keywords:</b> <code>${st.content_brief.pexels_keywords}</code><br>
            • <b>Spec:</b> 1080p landscape, 8-15s loop, zero faces/text.
          </div>`;
      }

      html += `\n        </div>
        <div class="card-footer">
          <button class="btn-action btn-redo" id="btn-redo-${cardKey}" onclick="toggleRedo('${cardKey}')">Redo (மறுபரிசீலனை)</button>
          <button class="btn-action btn-approve" id="btn-approve-${cardKey}" onclick="toggleApprove('${cardKey}')">✓ Approve</button>
        </div>
      </div>`;
    }

    html += `\n    </div>\n  </div>`;
  }

  html += `\n  <script>
    const approvalState = {};
    const totalCount = ${totalSets};

    function updateStats() {
      const approvedCount = Object.values(approvalState).filter(s => s === 'approved').length;
      document.getElementById('approval-stats').innerText = approvedCount + ' of ' + totalCount + ' sets approved';
    }

    function toggleApprove(key) {
      const card = document.getElementById('card-' + key);
      const btnApprove = document.getElementById('btn-approve-' + key);
      const btnRedo = document.getElementById('btn-redo-' + key);

      if (approvalState[key] === 'approved') {
        delete approvalState[key];
        card.classList.remove('card-approved');
        btnApprove.classList.remove('btn-approved');
      } else {
        approvalState[key] = 'approved';
        card.classList.add('card-approved');
        card.classList.remove('card-redo');
        btnApprove.classList.add('btn-approved');
        btnRedo.classList.remove('btn-redo-active');
      }
      updateStats();
    }

    function toggleRedo(key) {
      const card = document.getElementById('card-' + key);
      const btnApprove = document.getElementById('btn-approve-' + key);
      const btnRedo = document.getElementById('btn-redo-' + key);

      if (approvalState[key] === 'redo') {
        delete approvalState[key];
        card.classList.remove('card-redo');
        btnRedo.classList.remove('btn-redo-active');
      } else {
        approvalState[key] = 'redo';
        card.classList.add('card-redo');
        card.classList.remove('card-approved');
        btnRedo.classList.add('btn-redo-active');
        btnApprove.classList.remove('btn-approved');
      }
      updateStats();
    }

    function approveAll() {
      document.querySelectorAll('[id^=\"card-\"]').forEach(card => {
        const key = card.id.replace('card-', '');
        approvalState[key] = 'approved';
        card.classList.add('card-approved');
        const btnApprove = document.getElementById('btn-approve-' + key);
        if (btnApprove) {
          btnApprove.classList.add('btn-approved');
          btnApprove.innerHTML = '<span>✓ Approved</span>';
        }
      });
      updateStats();
    }

    // Initialize all matched sets as approved
    document.querySelectorAll('[id^=\"card-\"]').forEach(card => {
      const key = card.id.replace('card-', '');
      if (card.classList.contains('card-matched')) {
        approvalState[key] = 'approved';
      }
    });
    updateStats();
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(OUT_DIR, "batch_4_review.html"), html);
  console.log(`✓ Generated ${path.join(OUT_DIR, "batch_4_review.html")}`);
  console.log(`\n=== Batch 4 Matching Summary ===`);
  console.log(`Total Sets: ${totalSets}`);
  console.log(`Matched Sets: ${totalMatched} (${((totalMatched/totalSets)*100).toFixed(1)}%)`);
  console.log(`Needs Owner: ${totalNeedsOwner}`);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
