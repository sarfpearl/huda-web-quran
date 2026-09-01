// ─────────────────────────────────────────────────────────────────────────
//  FREE Verse-Based Quran Artwork Generator (Pollinations.ai — no API key)
//
//  Generates ONE rich, verse-specific cinematic artwork per Surah (1–114)
//  based on the deep theological and visual concepts in quran-artwork.ts.
//
//  Usage:
//    node scripts/generate-quran-images-free.mjs --kind=surah --limit=5   # test 5
//    node scripts/generate-quran-images-free.mjs --kind=surah --force     # force all
//    node scripts/generate-quran-images-free.mjs --kind=all
// ─────────────────────────────────────────────────────────────────────────

import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const OUT_DIR = path.resolve("public/images/quran");

// Read Quran Artwork Concepts directly
async function loadSurahConcepts() {
  try {
    const raw = await readFile(path.resolve("src/lib/data/quran-artwork.ts"), "utf-8");
    const jsonMatch = raw.match(/QURAN_ARTWORK_CONCEPTS:\s*SurahArtworkConcept\[\]\s*=\s*(\[[\s\S]*?\]);/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
  } catch (e) {
    console.warn("Could not parse quran-artwork.ts, using fallback mapping:", e.message);
  }
  return [];
}

const JUZ = [
  "Alif Lam Meem","Sayaqul","Tilkal Rusul","Lan Tanaloo","Wal Mohsanat",
  "La Yuhibbullah","Wa Iza Sami'oo","Wa Lau Annana","Qalal Malaou","Wa A'lamoo",
  "Yatazeroon","Wa Mamin Da'abat","Wa Ma Ubrioo","Rubama","Subhanallazi",
  "Qal Alam","Aqtarabo","Qadd Aflaha","Wa Qalallazina","A'man Khalaq",
  "Utlu Ma Oohia","Wa Manyaqnut","Wa Mali","Faman Azlam","Elahe Yuruddo",
  "Ha'a Meem","Qala Fama Khatbukum","Qadd Sami Allah","Tabarakallazi",
  "Amma Yatasa'aloon",
];

function pollinationsUrl(prompt, seed, width = 1280, height = 720) {
  const base = "https://image.pollinations.ai/prompt/";
  const cleanPrompt = prompt.replace(/[^\w\s,.-]/g, " ").trim();
  const params = `?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;
  return base + encodeURIComponent(cleanPrompt) + params;
}

async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function parseArgs() {
  const a = Object.fromEntries(
    process.argv.slice(2).map((x) => {
      const [k, v] = x.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  return {
    kind: a.kind || "all",
    limit: a.limit ? Number(a.limit) : Infinity,
    start: a.start ? Number(a.start) : 1,
    delay: a.delay ? Number(a.delay) : 1200,
    width: a.width ? Number(a.width) : 1280,
    height: a.height ? Number(a.height) : 720,
    force: a.force === true || a.force === "true",
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 5000) throw new Error("Image payload too small");
      return buf;
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(2500 * attempt);
    }
  }
}

async function run() {
  const { kind, limit, start, delay, width, height, force } = parseArgs();
  await mkdir(OUT_DIR, { recursive: true });

  const surahConcepts = await loadSurahConcepts();

  if (kind === "surah" || kind === "all") {
    console.log(`\n▶ GENERATING VERSE-BASED SURAH ARTWORKS (1–114) [${width}x${height}]`);
    let made = 0;
    for (let num = start; num <= 114; num++) {
      if (made >= limit) {
        console.log(`\n⏹ Reached --limit=${limit}.`);
        break;
      }
      const file = path.join(OUT_DIR, `surah-${num}.jpg`);
      if (!force && (await fileExists(file))) {
        console.log(`  ⏭  skip Surah ${num} (already exists)`);
        continue;
      }

      const concept = surahConcepts.find((c) => c.surahNumber === num);
      const prompt = concept
        ? `${concept.prompt}. Highly detailed 8K photorealistic cinematic landscape, natural environmental lighting, rich textures, no people, no text, no arabic calligraphy, no logos.`
        : `Cinematic 8K Islamic landscape representing Surah ${num} of the Holy Quran, peaceful and spiritual, no people, no text, no logos.`;

      const seed = 1000 + num * 37;
      const url = pollinationsUrl(prompt, seed, width, height);

      console.log(`  ⏳ Generating Surah ${num}: ${concept?.name || `Surah ${num}`} (${concept?.ayat || "Verses"})...`);
      try {
        const buf = await fetchImage(url);
        await writeFile(file, buf);
        made++;
        console.log(`  ✅ Saved Surah ${num} (${Math.round(buf.length / 1024)}KB)`);
        await sleep(delay);
      } catch (err) {
        console.error(`  ⚠️ Surah ${num} failed: ${err.message}`);
        await sleep(delay);
      }
    }
  }

  if (kind === "juz" || kind === "all") {
    console.log(`\n▶ GENERATING JUZ COVERS (1–30) [${width}x${height}]`);
    let made = 0;
    for (let num = start; num <= 30; num++) {
      if (made >= limit) break;
      const file = path.join(OUT_DIR, `juz-${num}.jpg`);
      if (!force && (await fileExists(file))) {
        console.log(`  ⏭  skip Juz ${num} (already exists)`);
        continue;
      }
      const name = JUZ[num - 1] || `Juz ${num}`;
      const prompt = `Sacred Islamic architectural panorama for Juz ${num} (${name}) of the Holy Quran, serene atmospheric lighting, intricate geometric arches, peaceful night sky with crescent moon and stars, 8K photorealistic, no people, no text, no logos.`;
      const url = pollinationsUrl(prompt, 5000 + num * 43, width, height);
      try {
        const buf = await fetchImage(url);
        await writeFile(file, buf);
        made++;
        console.log(`  ✅ Saved Juz ${num} — ${name} (${Math.round(buf.length / 1024)}KB)`);
        await sleep(delay);
      } catch (err) {
        console.error(`  ⚠️ Juz ${num} failed: ${err.message}`);
        await sleep(delay);
      }
    }
  }

  console.log(`\n✔ Completed Quran Artwork Generation into ${OUT_DIR}`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
