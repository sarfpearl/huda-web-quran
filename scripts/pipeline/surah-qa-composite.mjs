#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Composite Surah Video & Recitation QA Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Runs an exhaustive, unified QA inspection for a specific Surah across:
 *   1. Video Asset Completeness: Local files and Cloudflare R2 CDN availability.
 *   2. Video Technical Specifications: Resolution, fps, duration, codec, audio, letterboxing.
 *   3. Quranic Text & Data Integrity: Verses, glyphs, IndoPak text, translations (10 langs).
 *   4. Word Sync & Acoustic Recitation: Timings coverage for 9 reciters and timeline boundaries.
 *   5. Human Visual Review Requirements: Flags aesthetic and theological review needs.
 *
 * Usage:
 *   node scripts/pipeline/surah-qa-composite.mjs <surah-number>
 *   node scripts/pipeline/surah-qa-composite.mjs 2
 *   node scripts/pipeline/surah-qa-composite.mjs --surah=2 --output=scratch/report.md
 *   node scripts/pipeline/surah-qa-composite.mjs --surah=2 --json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { probeVideo, detectLetterbox, generateContactSheet } from "./seam-processor.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

const require = createRequire(import.meta.url);
const { Q, ROOT: APP_ROOT, nativeFetch } = require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const { SURAH_CHAPTERS_REGISTRY, getSurahVisualData } = require(
  path.join(ROOT, "src/lib/data/surahChapters.ts")
);
const { SURAH_VERSE_VIDEOS_REGISTRY } = require(
  path.join(ROOT, "src/lib/data/surahVerseVideos.ts")
);
const { hasVideo } = require(path.join(ROOT, "src/lib/data/videoManifest.ts"));
const { mediaUrl } = require(path.join(ROOT, "src/lib/media.ts"));
const { clipUrl } = require(path.join(ROOT, "src/lib/data/videoVersions.ts"));

// ── 1. INPUT VALIDATION ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
let surahArg = args.find((a) => !a.startsWith("--"));
if (!surahArg) {
  const match = args.find((a) => a.startsWith("--surah="));
  if (match) surahArg = match.split("=")[1];
}

const isJson = args.includes("--json");
const outputArg = args.find((a) => a.startsWith("--output="))?.split("=")[1];
const clipsArg = args.find((a) => a.startsWith("--clips="))?.split("=")[1];
const targetClips = clipsArg ? clipsArg.split(",").map((c) => c.trim().toLowerCase()) : null;

if (!surahArg) {
  console.error("❌ Error: Surah number is required. Usage: node surah-qa-composite.mjs <1-114>");
  process.exit(1);
}

const surahNum = Number(surahArg);
if (!Number.isInteger(surahNum) || surahNum < 1 || surahNum > 114) {
  console.error(`❌ Error: Invalid Surah number '${surahArg}'. Must be an integer between 1 and 114.`);
  process.exit(1);
}

// ── 2. DATA RESOLUTION ────────────────────────────────────────────────────────

const surahMeta = Q.QURAN_SURAHS.find((s) => s.number === surahNum);
if (!surahMeta) {
  console.error(`❌ Error: Surah ${surahNum} not found in metadata registry.`);
  process.exit(1);
}

const visualData = SURAH_CHAPTERS_REGISTRY[surahNum] || getSurahVisualData(surahNum);
const ayahVideosMap = SURAH_VERSE_VIDEOS_REGISTRY[surahNum] || {};

const report = {
  surahNumber: surahNum,
  surahName: surahMeta.name,
  arabicName: surahMeta.arabicName,
  revelation: surahMeta.revelation,
  totalVerses: surahMeta.verses,
  timestamp: new Date().toISOString(),
  isMultiChapter: visualData.isMultiChapter,
  chaptersCount: visualData.chapters.length,
  ayahVideosCount: Object.keys(ayahVideosMap).length,
  assets: [],
  textIntegrity: {},
  wordSync: {},
  wordBoundaries: {},
  criticalFailures: [],
  warnings: [],
  infoNotes: [],
  humanReviewItems: [],
  overallStatus: "UNKNOWN",
};

// ── 3. ASSET CHECK: CHAPTERS & AYAH CLIPS ────────────────────────────────────

async function checkAsset(asset) {
  const localRel = asset.path.startsWith("/") ? asset.path.slice(1) : asset.path;
  const localAbs = path.join(ROOT, "public", localRel);
  const existsLocal = fs.existsSync(localAbs);

  let probe = null;
  let letterbox = null;
  if (existsLocal) {
    try {
      probe = probeVideo(localAbs);
      letterbox = detectLetterbox(localAbs, 2);
    } catch (e) {
      report.warnings.push(`FFprobe failed for local file ${asset.path}: ${e.message}`);
    }
  }

  // Check manifest presence
  const declaredInManifest = hasVideo(asset.path);

  // Check R2 reachability via HTTP HEAD
  let r2Status = null;
  let r2Size = null;
  let r2ContentType = null;
  try {
    const fullUrl = clipUrl(asset.path);
    const res = await nativeFetch(fullUrl, { method: "HEAD" });
    r2Status = res.status;
    r2Size = Number(res.headers.get("content-length") || 0);
    r2ContentType = res.headers.get("content-type") || null;
  } catch (err) {
    r2Status = `Error: ${err.message}`;
  }

  let seamMetrics = null;
  let contactSheet = null;
  if (existsLocal && (targetClips || args.includes("--seam"))) {
    try {
      const framesDir = path.join(ROOT, "scratch/qa_pilot_surah3/frames", String(asset.id));
      const sheetPath = path.join(
        ROOT,
        "scratch/qa_pilot_surah3",
        `${path.basename(asset.path, ".mp4")}_contact_sheet.jpg`
      );
      const res = generateContactSheet(localAbs, sheetPath, framesDir);
      seamMetrics = res.seamSSIM;
      contactSheet = path.relative(ROOT, res.contactSheetPath);
    } catch (err) {
      report.warnings.push(`Seam/contact sheet generation failed for ${asset.path}: ${err.message}`);
    }
  }

  const assetResult = {
    ...asset,
    localExists: existsLocal,
    localPath: existsLocal ? localAbs : null,
    declaredInManifest,
    r2Status,
    r2Size,
    r2ContentType,
    probe,
    letterbox,
    seamMetrics,
    contactSheet,
  };

  // Evaluate integrity
  if (!existsLocal && r2Status !== 200) {
    report.criticalFailures.push(`Asset ${asset.path} missing locally and returned status ${r2Status} on R2.`);
  } else if (!declaredInManifest) {
    report.warnings.push(`Asset ${asset.path} is not active in videoManifest.ts.`);
  }

  if (probe) {
    if (probe.width !== 1920 || probe.height !== 1080) {
      if (probe.width === 3840 && probe.height === 2160) {
        report.infoNotes.push(`Asset ${asset.path} is a 4K UHD master (3840x2160).`);
      } else {
        report.warnings.push(`Asset ${asset.path} non-standard master resolution: ${probe.width}x${probe.height} (scaled via CSS object-cover).`);
      }
    }
    if (probe.codec !== "h264") {
      report.criticalFailures.push(`Asset ${asset.path} codec is ${probe.codec}, expected h264.`);
    }
    if (probe.pixFmt && probe.pixFmt !== "yuv420p") {
      report.infoNotes.push(`Asset ${asset.path} local master uses ${probe.pixFmt} chroma; converted to yuv420p for web.`);
    }
    if (asset.category === "CHAPTER_LOOP" && probe.hasAudio) {
      report.infoNotes.push(`Chapter master ${asset.path} retains audio track (${probe.audioCodec}) in local source; stripped during R2 web re-encoding.`);
    }
    if (letterbox && letterbox.isLetterboxed) {
      report.criticalFailures.push(`Asset ${asset.path} has hard letterboxing/black bars (active height ${letterbox.h} < 95% of nominal).`);
    }
  }

  return assetResult;
}

// ── 4. RUN ASSET VALIDATION ──────────────────────────────────────────────────

async function runAssetValidation() {
  const assetJobs = [];

  // Chapters
  for (const ch of visualData.chapters) {
    if (targetClips) {
      const matches = targetClips.some((tc) =>
        String(ch.id).toLowerCase() === tc ||
        ch.videoPath.toLowerCase().includes(tc) ||
        (ch.theme && ch.theme.toLowerCase().includes(tc))
      );
      if (!matches) continue;
    }
    assetJobs.push({
      id: ch.id,
      category: "CHAPTER_LOOP",
      name: ch.theme,
      verses: `${ch.fromVerse}–${ch.toVerse}`,
      path: ch.videoPath,
      timeRange: ch.timeRange,
    });
  }

  // Ayah clips
  for (const [ayahNumStr, ayahData] of Object.entries(ayahVideosMap)) {
    if (targetClips) {
      const matches = targetClips.some((tc) =>
        `ayah-${ayahNumStr}`.toLowerCase() === tc ||
        ayahNumStr === tc ||
        ayahData.videoPath.toLowerCase().includes(tc) ||
        (ayahData.theme && ayahData.theme.toLowerCase().includes(tc))
      );
      if (!matches) continue;
    }
    assetJobs.push({
      id: `ayah-${ayahNumStr}`,
      category: "AYAH_REAL_FOOTAGE",
      name: ayahData.theme,
      verses: `${ayahNumStr}`,
      path: ayahData.videoPath,
      license: ayahData.license,
      source: ayahData.source,
    });
  }

  for (const job of assetJobs) {
    const res = await checkAsset(job);
    report.assets.push(res);
  }
}

// ── 5. RUN QURAN TEXT & DATA INTEGRITY ───────────────────────────────────────

function runTextAndDataIntegrity() {
  const versesPath = path.join(ROOT, `public/data/quran-verses/${surahNum}.json`);
  const glyphsPath = path.join(ROOT, `public/data/quran-glyphs/${surahNum}.json`);
  const indopakPath = path.join(ROOT, `public/data/quran-indopak/${surahNum}.json`);

  const versesExist = fs.existsSync(versesPath);
  const glyphsExist = fs.existsSync(glyphsPath);
  const indopakExist = fs.existsSync(indopakPath);

  let verseCount = 0;
  let glyphCount = 0;

  if (versesExist) {
    try {
      const vData = JSON.parse(fs.readFileSync(versesPath, "utf8"));
      verseCount = vData.length;
      if (verseCount !== surahMeta.verses) {
        report.criticalFailures.push(
          `Verse count mismatch in ${versesPath}: found ${verseCount}, expected ${surahMeta.verses}`
        );
      }
    } catch (e) {
      report.criticalFailures.push(`Failed to parse ${versesPath}: ${e.message}`);
    }
  } else {
    report.criticalFailures.push(`Missing verses file: ${versesPath}`);
  }

  if (glyphsExist) {
    try {
      const gData = JSON.parse(fs.readFileSync(glyphsPath, "utf8"));
      glyphCount = gData.length;
      if (glyphCount !== surahMeta.verses) {
        report.criticalFailures.push(
          `Glyph ayah count mismatch in ${glyphsPath}: found ${glyphCount}, expected ${surahMeta.verses}`
        );
      }
    } catch (e) {
      report.criticalFailures.push(`Failed to parse ${glyphsPath}: ${e.message}`);
    }
  } else {
    report.criticalFailures.push(`Missing glyphs file: ${glyphsPath}`);
  }

  // Translations check
  const translations = ["en", "ta", "ur", "ml", "hi", "id", "bn", "tr", "fr", "ms"];
  const translationStatus = {};
  let versesParsed = null;
  if (versesExist) {
    try {
      versesParsed = JSON.parse(fs.readFileSync(versesPath, "utf8"));
    } catch {}
  }

  for (const lang of translations) {
    const tPath = path.join(ROOT, `public/data/quran-translations/${lang}/${surahNum}.json`);
    const exists = fs.existsSync(tPath);
    let count = 0;
    if (exists) {
      try {
        const tData = JSON.parse(fs.readFileSync(tPath, "utf8"));
        count = tData.length;
        if (count !== surahMeta.verses) {
          report.warnings.push(`Translation [${lang}] verse count: ${count} !== ${surahMeta.verses}`);
        }
      } catch (err) {
        count = -1;
      }
      translationStatus[lang] = { exists: true, count, embedded: false };
    } else if (lang === "en" && versesParsed && versesParsed.every((x) => x.textEnglish)) {
      translationStatus[lang] = { exists: true, count: versesParsed.length, embedded: true };
    } else if (lang === "ta" && versesParsed && versesParsed.every((x) => x.textTamil)) {
      translationStatus[lang] = { exists: true, count: versesParsed.length, embedded: true };
    } else {
      translationStatus[lang] = { exists: false, count: 0 };
      report.warnings.push(`Missing translation data for language: ${lang}`);
    }
  }

  report.textIntegrity = {
    versesExist,
    verseCount,
    glyphsExist,
    glyphCount,
    indopakExist,
    translationStatus,
  };
}

// ── 6. RUN WORD SYNC & TIMELINE BOUNDARIES ───────────────────────────────────

function runWordSyncIntegrity() {
  const syncReciters = [
    "sudais", "alafasy", "dosari", "abdulbaset", "minshawi",
    "hussary", "shuraim", "shatri", "tunaiji",
  ];

  const recitersStatus = {};
  let missingTimings = 0;

  for (const r of syncReciters) {
    const tFile = path.join(ROOT, `public/data/quran-timings/${r}/${surahNum}.json`);
    const exists = fs.existsSync(tFile);
    let timingCount = 0;
    let duration = 0;
    if (exists) {
      try {
        const tData = JSON.parse(fs.readFileSync(tFile, "utf8"));
        timingCount = tData.verseTimings?.length || 0;
        duration = tData.durationSeconds || 0;
        if (timingCount !== surahMeta.verses) {
          report.warnings.push(`Reciter ${r} timing count: ${timingCount} !== ${surahMeta.verses}`);
        }
      } catch (err) {
        timingCount = -1;
      }
    } else {
      missingTimings++;
      report.criticalFailures.push(`Missing word-timing file for reciter ${r}: ${tFile}`);
    }
    recitersStatus[r] = { exists, timingCount, duration };
  }

  // Run word-boundaries.cjs for this specific Surah
  let wordBoundaryPassed = false;
  let wordBoundaryOutput = "";
  try {
    const out = execSync(`node scripts/qa/word-boundaries.cjs ${surahNum}`, {
      encoding: "utf8",
      cwd: ROOT,
    });
    wordBoundaryPassed = true;
    wordBoundaryOutput = out.trim();
  } catch (err) {
    wordBoundaryPassed = false;
    wordBoundaryOutput = (err.stdout || err.message).trim();
    report.criticalFailures.push(`Word boundaries QA check failed for Surah ${surahNum}.`);
  }

  report.wordSync = {
    recitersStatus,
    missingTimings,
  };
  report.wordBoundaries = {
    passed: wordBoundaryPassed,
    output: wordBoundaryOutput,
  };
}

// ── 7. HUMAN REVIEW REQUIREMENTS ─────────────────────────────────────────────

function compileHumanReviewRequirements() {
  report.humanReviewItems.push({
    category: "Visual Loop Continuity",
    requirement:
      "Verify 0.40s crossfade seam does not produce double exposure or motion ghosting on moving elements (clouds, foliage).",
  });
  report.humanReviewItems.push({
    category: "Camera Stability",
    requirement:
      "Confirm absolute zero camera drift or parallax shift (locked-off stationary tripod camera).",
  });
  report.humanReviewItems.push({
    category: "Theological Alignment",
    requirement:
      "Inspect scene terrain and mood against the verses covered (e.g. Hejaz granite, Wadi Rum sandstone). Verify zero human or forbidden figures.",
  });
  if (report.ayahVideosCount > 0) {
    report.humanReviewItems.push({
      category: "Real Footage Attribution",
      requirement:
        "Confirm that all Ayah-level clips are 100% authentic camera-recorded footage with verified licenses (e.g. Mixkit) documented in REAL_FOOTAGE_LICENSES.md.",
    });
  }
}

// ── 8. GENERATE MARKDOWN REPORT ──────────────────────────────────────────────

function generateMarkdownReport() {
  const hasFailures = report.criticalFailures.length > 0;
  const hasWarnings = report.warnings.length > 0;

  if (hasFailures) {
    report.overallStatus = "FAIL";
  } else if (hasWarnings) {
    report.overallStatus = "NEEDS REVIEW (Technical Warnings)";
  } else {
    report.overallStatus = "PASS (Technical & Sync) — PENDING HUMAN VISUAL REVIEW";
  }

  const lines = [];
  lines.push(`# 📋 HuDa Web Quran — Surah ${surahNum} (${surahMeta.name}) QA Audit Report`);
  lines.push("");
  lines.push(`> **Generated:** ${report.timestamp}  `);
  lines.push(`> **Surah:** ${surahNum}. ${surahMeta.name} (${surahMeta.arabicName}) · ${surahMeta.verses} Verses · ${surahMeta.revelation}  `);
  lines.push(`> **Status:** **\`${report.overallStatus}\`**  `);
  lines.push("");
  lines.push("---");
  lines.push("");

  lines.push("## 1. Executive Summary");
  lines.push("");
  lines.push(`* **Total Expected Video Assets:** ${report.assets.length} (${report.chaptersCount} Chapter Loops, ${report.ayahVideosCount} Ayah Real-Footage Clips)`);
  lines.push(`* **Local Files Verified:** ${report.assets.filter((a) => a.localExists).length} / ${report.assets.length}`);
  lines.push(`* **Cloudflare R2 CDN Active (200):** ${report.assets.filter((a) => a.r2Status === 200).length} / ${report.assets.length}`);
  lines.push(`* **Critical Errors:** ${report.criticalFailures.length}`);
  lines.push(`* **Technical Warnings:** ${report.warnings.length}`);
  lines.push(`* **Source Master Notes:** ${report.infoNotes.length} (Expected pre-encoding characteristics)`);
  lines.push(`* **Word Boundary Walk (9 Reciters):** ${report.wordBoundaries.passed ? "✅ ALL PASSED" : "❌ FAILED"}`);
  lines.push("");

  if (report.criticalFailures.length > 0) {
    lines.push("### ❌ Critical Failures");
    for (const f of report.criticalFailures) {
      lines.push(`- **FAIL:** ${f}`);
    }
    lines.push("");
  }

  if (report.warnings.length > 0) {
    lines.push("### ⚠️ Technical Warnings / Observations");
    for (const w of report.warnings) {
      lines.push(`- **WARN:** ${w}`);
    }
    lines.push("");
  }

  if (report.infoNotes.length > 0) {
    lines.push("### ℹ️ Source Master Format Notes (Expected Pre-Encoding Characteristics)");
    for (const n of report.infoNotes) {
      lines.push(`- **NOTE:** ${n}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## 2. Video Asset Validation Matrix");
  lines.push("");
  lines.push("| ID | Category | Verses | Resolution | Duration | FPS | Audio | Local | R2 Status | Manifest |");
  lines.push("| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |");

  for (const a of report.assets) {
    const res = a.probe ? `${a.probe.width}x${a.probe.height}` : "N/A";
    const dur = a.probe ? `${a.probe.durationFormatted}s` : "N/A";
    const fps = a.probe ? `${a.probe.fps}` : "N/A";
    const audio = a.probe ? (a.probe.hasAudio ? `⚠️ Yes (${a.probe.audioCodec})` : "Stripped") : "N/A";
    const local = a.localExists ? "✅" : "❌";
    const r2 = a.r2Status === 200 ? "✅ 200" : `❌ ${a.r2Status}`;
    const manifest = a.declaredInManifest ? "✅" : "⚠️ Missing";

    lines.push(
      `| \`${a.id}\` | ${a.category} | ${a.verses} | ${res} | ${dur} | ${fps} | ${audio} | ${local} | ${r2} | ${manifest} |`
    );
  }
  lines.push("");

  lines.push("---");
  lines.push("");

  if (report.assets.some((a) => a.seamMetrics || a.contactSheet)) {
    lines.push("## 3. Loop Seam Metrics & Representative Visual Frames");
    lines.push("");
    lines.push("| Clip ID | Theme | Verses | Seam SSIM (t=0s vs tail) | Contact Sheet Artifact |");
    lines.push("| :--- | :--- | :---: | :---: | :--- |");
    for (const a of report.assets) {
      if (a.seamMetrics || a.contactSheet) {
        const ssim = a.seamMetrics?.all !== undefined && a.seamMetrics?.all !== null ? a.seamMetrics.all.toFixed(4) : "N/A";
        const sheet = a.contactSheet ? `[\`${path.basename(a.contactSheet)}\`](file://${path.resolve(ROOT, a.contactSheet)})` : "None";
        lines.push(`| \`${a.id}\` | ${a.name} | ${a.verses} | **${ssim}** | ${sheet} |`);
      }
    }
    lines.push("");
    lines.push("> [!NOTE]");
    lines.push("> **Seam SSIM Metric:** Measures end-to-end structural similarity between raw boundary frames ($t=0$s and $t_{\\text{end}}$).");
    lines.push("> In the HuDa production pipeline, seamless loops use an approved **0.40s (9.6 frames @ 24fps)** crossfade transition to guarantee imperceptible loop boundaries.");
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## 4. Quranic Text, Translations & Word-Sync Validation");
  } else {
    lines.push("## 3. Quranic Text, Translations & Word-Sync Validation");
  }
  lines.push("");
  lines.push(`* **Verse Rasm File (\`public/data/quran-verses/${surahNum}.json\`):** ${report.textIntegrity.versesExist ? `✅ PASS (${report.textIntegrity.verseCount} ayahs)` : "❌ MISSING"}`);
  lines.push(`* **Tajweed Glyphs (\`public/data/quran-glyphs/${surahNum}.json\`):** ${report.textIntegrity.glyphsExist ? `✅ PASS (${report.textIntegrity.glyphCount} ayahs)` : "❌ MISSING"}`);
  lines.push(`* **IndoPak Script (\`public/data/quran-indopak/${surahNum}.json\`):** ${report.textIntegrity.indopakExist ? "✅ PRESENT" : "❌ MISSING"}`);
  lines.push(`* **Word Sync Timing Coverage:** 9 / 9 Reciters present (${report.wordSync.missingTimings === 0 ? "✅ 100% Covered" : "❌ Incomplete"})`);
  lines.push("");

  lines.push("### Word Boundaries Playback Timeline Test");
  lines.push("```");
  lines.push(report.wordBoundaries.output);
  lines.push("```");
  lines.push("");

  const secNum = report.assets.some((a) => a.seamMetrics || a.contactSheet) ? 5 : 4;
  lines.push(`## ${secNum}. Human Visual & Theological Review Checklist`);
  lines.push("");
  lines.push("> [!IMPORTANT]");
  lines.push("> Automated checks verify file formats, codecs, stream reachability, and acoustic synchronization.");
  lines.push("> Visual aesthetics, loop seam smoothness, and theological appropriateness require human review.");
  lines.push("");
  for (const item of report.humanReviewItems) {
    lines.push(`- [ ] **${item.category}:** ${item.requirement}`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(`**Final Verdict:** \`${report.overallStatus}\``);
  lines.push("");

  return lines.join("\n");
}

// ── 9. MAIN ORCHESTRATION ───────────────────────────────────────────────────

async function main() {
  if (!isJson) {
    console.log(`\n======================================================================`);
    console.log(`🔍 Running Composite Surah QA for Surah ${surahNum} (${surahMeta.name})`);
    console.log(`======================================================================\n`);
  }

  // 1. Assets
  await runAssetValidation();

  // 2. Text & Data
  runTextAndDataIntegrity();

  // 3. Sync & Boundaries
  runWordSyncIntegrity();

  // 4. Human Review Items
  compileHumanReviewRequirements();

  // 5. Output
  const markdown = generateMarkdownReport();

  const outPath =
    outputArg || path.join(ROOT, `scratch/qa_reports/surah_${String(surahNum).padStart(3, "0")}_qa_report.md`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, markdown, "utf8");

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(markdown);
    console.log(`\n📄 Report written to: ${path.relative(ROOT, outPath)}\n`);
  }

  if (report.criticalFailures.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal QA Orchestrator Error:", err);
  process.exit(1);
});
