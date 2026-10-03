#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Safe Cloudflare R2 Media Upload Tool
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Uploads media assets to the Cloudflare R2 bucket:
 *   - public/assets/images/**  → assets/images/**
 *   - public/videos/**         → videos/**
 *   - public/audio/prelude/**  → audio/prelude/**
 *
 * Safety Mandates:
 *   1. DRY-RUN BY DEFAULT: Runs in preview mode unless --execute is explicitly passed.
 *   2. NON-DESTRUCTIVE: Never deletes, moves, or alters any local files.
 *   3. INCREMENTAL RESUME: Checks remote object headers; skips files that already exist
 *      with the identical byte size unless --force is provided.
 *   4. STREAMING: Uses fs.createReadStream() to prevent memory exhaustion on large videos.
 *   5. CLEAN FILTER: Ignores .DS_Store, test frames (qa_frames), temporary files,
 *      and generation reports (*.json).
 *
 * Required Credentials / Environment Variables:
 *   R2_ACCOUNT_ID        Cloudflare Account ID (found in Cloudflare Dashboard → R2)
 *   R2_ACCESS_KEY_ID     Cloudflare R2 API Token Access Key ID
 *   R2_SECRET_ACCESS_KEY Cloudflare R2 API Token Secret Access Key
 *   R2_BUCKET_NAME       R2 Bucket Name (default: "huda-quran-media")
 *
 * Usage:
 *   node scripts/tools/upload-to-r2.mjs              # Dry-run preview (safe, no upload)
 *   node scripts/tools/upload-to-r2.mjs --execute    # Actual upload
 *   node scripts/tools/upload-to-r2.mjs --category=images --execute  # Upload images only
 *   node scripts/tools/upload-to-r2.mjs --category=videos --execute  # Upload videos only
 *   node scripts/tools/upload-to-r2.mjs --force --execute            # Overwrite all files
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

// ── 1. ENVIRONMENT & CREDENTIALS LOADER ───────────────────────────────────────

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// Load .env.local first, then .env
loadEnvFile(path.join(ROOT_DIR, ".env.local"));
loadEnvFile(path.join(ROOT_DIR, ".env"));

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "huda-quran-media";
const PUBLIC_R2_URL =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  "https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev";

// ── 2. CLI ARGUMENT PARSING ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const isForce = args.includes("--force");
const categoryFilterArg = args.find((a) => a.startsWith("--category="));
const categoryFilter = categoryFilterArg ? categoryFilterArg.split("=")[1].toLowerCase() : null;

// ── 3. TARGET MAPPINGS & FILE EXTENSIONS ──────────────────────────────────────

const MAPPINGS = [
  {
    category: "images",
    localDir: path.join(ROOT_DIR, "public", "assets", "images"),
    remotePrefix: "assets/images",
  },
  {
    category: "videos",
    localDir: path.join(ROOT_DIR, "public", "videos"),
    remotePrefix: "videos",
  },
  {
    category: "audio",
    localDir: path.join(ROOT_DIR, "public", "audio", "prelude"),
    remotePrefix: "audio/prelude",
  },
];

const MIME_MAP = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db"]);
const IGNORED_PATH_SUBSTRINGS = ["qa_frames", "chapter_10_generation_results", "chapter_11_generation_results", "generation_results"];
const IGNORED_EXTENSIONS = new Set([".bak", ".tmp", ".txt", ".json"]);

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ── 4. FILE DISCOVERY ────────────────────────────────────────────────────────

function discoverFiles(dirPath, remotePrefix, category) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;

      const fullPath = path.join(currentDir, entry.name);
      if (IGNORED_PATH_SUBSTRINGS.some((sub) => fullPath.includes(sub))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (IGNORED_EXTENSIONS.has(ext)) continue;

        const mimeType = MIME_MAP[ext];
        if (!mimeType) continue; // Skip unknown extensions

        const relativeToTargetDir = path.relative(dirPath, fullPath);
        const r2Key = `${remotePrefix}/${relativeToTargetDir}`.replace(/\\/g, "/");
        const stat = fs.statSync(fullPath);

        results.push({
          fullPath,
          r2Key,
          size: stat.size,
          category,
          mimeType,
        });
      }
    }
  }

  walk(dirPath);
  return results;
}

// ── 5. S3 / R2 CLIENT INITIALIZATION ─────────────────────────────────────────

function getR2Client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
}

// ── 6. MAIN EXECUTION ROUTINE ────────────────────────────────────────────────

async function main() {
  console.log("================================================================================");
  console.log(" 🕌 HuDa Web Quran — Cloudflare R2 Safe Upload Tool");
  console.log("================================================================================");
  console.log(` Target Bucket    : ${R2_BUCKET_NAME}`);
  console.log(` Public Media URL : ${PUBLIC_R2_URL}`);
  console.log(` Mode             : ${isExecute ? "🚨 LIVE EXECUTE (Uploading)" : "🛡️ DRY-RUN PREVIEW (No Changes)"}`);
  if (categoryFilter) {
    console.log(` Filter           : Category = ${categoryFilter}`);
  }
  console.log("--------------------------------------------------------------------------------");

  // Validate credentials
  const hasCredentials = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  if (!hasCredentials) {
    console.log("\n⚠️  Cloudflare R2 Credentials Status: INCOMPLETE");
    console.log("   The following environment variables are needed for live upload:");
    console.log(`   - R2_ACCOUNT_ID        : ${R2_ACCOUNT_ID ? "✓ configured" : "❌ MISSING"}`);
    console.log(`   - R2_ACCESS_KEY_ID     : ${R2_ACCESS_KEY_ID ? "✓ configured" : "❌ MISSING"}`);
    console.log(`   - R2_SECRET_ACCESS_KEY : ${R2_SECRET_ACCESS_KEY ? "✓ configured" : "❌ MISSING"}`);
    console.log("\n   You can provide them in .env.local or via your shell environment.");
    if (isExecute) {
      console.error("\n❌ Cannot execute upload without complete R2 credentials. Exiting.");
      process.exit(1);
    } else {
      console.log("   (Continuing in DRY-RUN mode to show what would be uploaded...)\n");
    }
  } else {
    console.log(" ✓ R2 Credentials loaded successfully.");
  }

  // Scan targets
  const allFiles = [];
  for (const mapping of MAPPINGS) {
    if (categoryFilter && mapping.category !== categoryFilter) continue;
    const files = discoverFiles(mapping.localDir, mapping.remotePrefix, mapping.category);
    allFiles.push(...files);
  }

  if (allFiles.length === 0) {
    console.log("No media files found matching the criteria.");
    return;
  }

  // Summary by category
  const categories = ["images", "videos", "audio"];
  let totalBytes = 0;
  console.log(" Found Media Assets:");
  for (const cat of categories) {
    const catFiles = allFiles.filter((f) => f.category === cat);
    const catBytes = catFiles.reduce((acc, f) => acc + f.size, 0);
    totalBytes += catBytes;
    console.log(`   • ${cat.toUpperCase().padEnd(8)} : ${catFiles.length.toString().padStart(4)} files  (${formatBytes(catBytes)})`);
  }
  console.log(`   ------------------------------------------------------`);
  console.log(`   • TOTAL    : ${allFiles.length.toString().padStart(4)} files  (${formatBytes(totalBytes)})\n`);

  if (!isExecute) {
    console.log("--------------------------------------------------------------------------------");
    console.log(" 🔍 DRY-RUN PREVIEW (First 15 sample entries):");
    console.log("--------------------------------------------------------------------------------");
    for (const f of allFiles.slice(0, 15)) {
      console.log(`   → [${f.category}] ${f.r2Key} (${formatBytes(f.size)}) [${f.mimeType}]`);
    }
    if (allFiles.length > 15) {
      console.log(`   ... and ${allFiles.length - 15} more files.`);
    }

    console.log("\n================================================================================");
    console.log(" 🛡️  DRY-RUN COMPLETE — No files were uploaded or modified.");
    console.log(" To perform the actual upload, run:");
    console.log("   node scripts/tools/upload-to-r2.mjs --execute");
    console.log("================================================================================");
    return;
  }

  // LIVE UPLOAD ROUTINE
  const r2 = getR2Client();
  if (!r2) {
    console.error("❌ Failed to initialize R2 S3 Client.");
    process.exit(1);
  }

  console.log("Starting upload process with incremental skip check...\n");

  let uploadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let uploadedBytes = 0;
  const startTime = Date.now();

  // Concurrency worker queue
  const CONCURRENCY = 4;
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < allFiles.length) {
      const fileIndex = currentIndex++;
      const file = allFiles[fileIndex];
      const progress = `[${fileIndex + 1}/${allFiles.length}]`;

      try {
        // Skip existing check if not force
        if (!isForce) {
          try {
            const head = await r2.send(
              new HeadObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: file.r2Key,
              })
            );
            if (head.ContentLength === file.size) {
              skippedCount++;
              console.log(`${progress} ⏭️  SKIP (Already on R2): ${file.r2Key}`);
              continue;
            }
          } catch (headErr) {
            // Object doesn't exist (NotFound/404); proceed with upload
          }
        }

        console.log(`${progress} ⬆️  UPLOADING: ${file.r2Key} (${formatBytes(file.size)})...`);

        const stream = fs.createReadStream(file.fullPath);
        await r2.send(
          new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: file.r2Key,
            Body: stream,
            ContentLength: file.size,
            ContentType: file.mimeType,
            CacheControl: "public, max-age=31536000, immutable",
          })
        );

        uploadedCount++;
        uploadedBytes += file.size;
        console.log(`${progress} ✓ SUCCESS: ${file.r2Key}`);
      } catch (err) {
        failedCount++;
        console.error(`${progress} ❌ FAILED: ${file.r2Key} - ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n================================================================================");
  console.log(" 📊 UPLOAD SUMMARY");
  console.log("================================================================================");
  console.log(` Total Files Checked : ${allFiles.length}`);
  console.log(` Uploaded Successfully: ${uploadedCount} (${formatBytes(uploadedBytes)})`);
  console.log(` Skipped (Identical) : ${skippedCount}`);
  console.log(` Failures            : ${failedCount}`);
  console.log(` Time Elapsed        : ${durationSec}s`);
  console.log("================================================================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
