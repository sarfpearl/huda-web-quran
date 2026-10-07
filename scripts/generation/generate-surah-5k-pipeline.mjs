// ─────────────────────────────────────────────────────────────────────────
//  5K Quran Surah Artwork Pipeline (Surahs 1–114)
//  Handles 5K Master PNG rendering (5120x2880) and Retina JPG optimization
// ─────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT_IMAGES = path.resolve("public/images");
const QURAN_DIR = path.resolve("public/images/quran");

export function upscaleSurahTo5K(num) {
  const srcJpg = path.join(ROOT_IMAGES, `surah-${num}.jpg`);
  const destPng = path.join(QURAN_DIR, `Surah-${num}-Desktop-5120x2880.png`);
  const destJpg = path.join(QURAN_DIR, `surah-${num}.jpg`);

  if (!fs.existsSync(srcJpg)) {
    console.warn(`[SKIP] No source image found for Surah ${num} at ${srcJpg}`);
    return false;
  }

  // 1. Uncompressed 5K Master PNG (5120x2880)
  execSync(`sips -s format png -z 2880 5120 "${srcJpg}" --out "${destPng}"`, { stdio: "pipe" });

  // 2. Web-optimized high-DPI Retina JPG (2560x1440 quality 90)
  execSync(`sips -s format jpeg -s formatOptions 90 -z 1440 2560 "${srcJpg}" --out "${destJpg}"`, { stdio: "pipe" });

  console.log(`  ✅ Surah ${num} successfully rendered to 5K PNG & Retina JPG`);
  return true;
}

export function syncAllAvailableTo5K() {
  console.log("Syncing all available authentic Surah artworks to 5K masters...");
  let count = 0;
  for (let num = 1; num <= 114; num++) {
    const srcJpg = path.join(ROOT_IMAGES, `surah-${num}.jpg`);
    if (fs.existsSync(srcJpg)) {
      if (upscaleSurahTo5K(num)) count++;
    }
  }
  console.log(`\n🎉 Processed ${count} Surahs into true 5K masters.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  syncAllAvailableTo5K();
}
