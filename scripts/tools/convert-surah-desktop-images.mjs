import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const QURAN_DIR = path.resolve("public/images/quran");

console.log("Starting Surah image conversion from 5K Desktop PNG to web-optimized 2.5K JPG...");

let convertedCount = 0;
let skippedCount = 0;

for (let num = 1; num <= 114; num++) {
  const pngPath = path.join(QURAN_DIR, `Surah-${num}-Desktop-5120x2880.png`);
  const jpgPath = path.join(QURAN_DIR, `surah-${num}.jpg`);

  if (fs.existsSync(pngPath)) {
    // Convert 5120x2880 PNG to 2560x1440 high-quality JPEG (quality 84)
    execSync(`sips -Z 2560 -s format jpeg -s formatOptions 84 "${pngPath}" --out "${jpgPath}"`, {
      stdio: "pipe",
    });
    convertedCount++;
  } else {
    console.warn(`[SKIP] No PNG found for Surah ${num}: ${pngPath}`);
    skippedCount++;
  }
}

console.log(`\nConversion complete!`);
console.log(`Converted: ${convertedCount} images`);
console.log(`Skipped (kept existing): ${skippedCount} images`);

// If Surah 22 is missing PNG, create Surah-22-Desktop-5120x2880.png from surah-22.jpg for consistency
const surah22Png = path.join(QURAN_DIR, `Surah-22-Desktop-5120x2880.png`);
const surah22Jpg = path.join(QURAN_DIR, `surah-22.jpg`);
if (!fs.existsSync(surah22Png) && fs.existsSync(surah22Jpg)) {
  console.log("Generating Surah-22-Desktop-5120x2880.png from surah-22.jpg to complete the PNG collection...");
  execSync(`sips -s format png "${surah22Jpg}" --out "${surah22Png}"`, { stdio: "pipe" });
}
