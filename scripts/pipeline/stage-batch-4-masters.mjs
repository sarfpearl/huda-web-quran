/**
 * Copies the approved Batch 4 clips to public/videos/surah_<N>/
 * Pattern: public/videos/surah_<N>/set_<NN>_ayah_<from>-<to>.mp4
 */
import fs from "fs";
import path from "path";

const BATCH_SURAHS = [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90];

console.log("=== Staging Approved Batch 4 Clips to public/videos/ ===");
let copied = 0;

for (const surah of BATCH_SURAHS) {
  const surahPad = String(surah).padStart(3, "0");
  const planPath = `scratch/matching/${surahPad}/plan.json`;
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  const destDir = path.join("public", "videos", `surah_${surah}`);
  fs.mkdirSync(destDir, { recursive: true });

  for (const st of plan.sets) {
    const destFile = path.join(destDir, `${st.set}.mp4`);
    if (!fs.existsSync(destFile)) {
      fs.copyFileSync(st.source_path, destFile);
      copied++;
    }
  }
  console.log(`Surah ${surah}: ${plan.sets.length} sets staged to ${destDir}`);
}

console.log(`Total copied: ${copied} clips staged.`);
