// ─────────────────────────────────────────────────────────────────────────
//  Quran cover-image generator (Gemini 2.5 Flash Image / "Nano Banana")
//
//  Generates ONE unique cover image per Surah (1–114) and per Juz (1–30),
//  saving them to public/images/quran/{surah,juz}/NNN.png so each item in
//  the app shows a different image.
//
//  Usage (run in YOUR terminal, where GEMINI_API_KEY is exported):
//    export GEMINI_API_KEY="AIza..."          # your key (never commit it)
//    npm install @google/genai                # one-time
//    node scripts/generate-quran-images.mjs --kind=surah --limit=3   # TEST
//    node scripts/generate-quran-images.mjs --kind=all               # full run
//
//  Flags:
//    --kind=surah|juz|all   which set to generate (default: all)
//    --limit=N              only generate the first N missing items (test)
//    --start=N              start from item number N
//    --delay=MS             ms to wait between calls (default 4000)
//
//  It RESUMES: already-generated files are skipped, so you can re-run after
//  a rate-limit / quota stop and it picks up where it left off.
// ─────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from "@google/genai";
import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error(
    "\n❌ GEMINI_API_KEY is not set.\n" +
      '   Run:  export GEMINI_API_KEY="AIza..."  then re-run this script.\n'
  );
  process.exit(1);
}

const MODEL = "gemini-2.5-flash-image";
const OUT_ROOT = path.resolve("public/images/quran");

// ── item data (standalone; names mirror src/lib/data/quran.ts) ─────────────
const SURAHS = [
  "Al-Fatihah","Al-Baqarah","Aal-E-Imran","An-Nisa","Al-Ma'idah","Al-An'am",
  "Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim",
  "Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj",
  "Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas",
  "Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin",
  "As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf",
  "Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf",
  "Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah",
  "Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah",
  "Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam",
  "Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir",
  "Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa",
  "At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq",
  "Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha",
  "Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah",
  "Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil",
  "Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad",
  "Al-Ikhlas","Al-Falaq","An-Nas",
];

const JUZ = [
  "Alif Lam Meem","Sayaqul","Tilkal Rusul","Lan Tanaloo","Wal Mohsanat",
  "La Yuhibbullah","Wa Iza Sami'oo","Wa Lau Annana","Qalal Malaou","Wa A'lamoo",
  "Yatazeroon","Wa Mamin Da'abat","Wa Ma Ubrioo","Rubama","Subhanallazi",
  "Qal Alam","Aqtarabo","Qadd Aflaha","Wa Qalallazina","A'man Khalaq",
  "Utlu Ma Oohia","Wa Manyaqnut","Wa Mali","Faman Azlam","Elahe Yuruddo",
  "Ha'a Meem","Qala Fama Khatbukum","Qadd Sami Allah","Tabarakallazi",
  "Amma Yatasa'aloon",
];

// Distinct colour moods so consecutive covers never look alike.
const PALETTES = [
  "deep emerald and gold","midnight blue and silver","warm amber and sand",
  "teal and pearl white","royal purple and gold","forest green and cream",
  "rose and copper","indigo and moonlight","turquoise and ivory",
  "burgundy and antique gold","slate blue and mint","olive and warm bronze",
];

// ── prompt builder — reverent, non-figurative Islamic art (no people/text) ─
function buildPrompt(kind, number, name) {
  const palette = PALETTES[(number - 1) % PALETTES.length];
  const subject =
    kind === "surah"
      ? `Surah ${number} "${name}" of the Holy Quran`
      : `Juz (Para) ${number} "${name}" of the Holy Quran`;
  return (
    `A serene, reverent square album-cover artwork representing ${subject}. ` +
    `Islamic geometric arabesque patterns, intricate mandala-like symmetry, ` +
    `a subtle silhouette of a mosque, dome, minaret or hanging lantern, soft ` +
    `glowing divine light, ${palette} colour palette. Elegant, minimal, calm ` +
    `and spiritual. Absolutely no people, no faces, no living creatures, no ` +
    `readable text and no Arabic letters. High detail, painterly, centered ` +
    `composition, square 1:1.`
  );
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
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, "").split("=");
      return [k, v ?? true];
    })
  );
  return {
    kind: args.kind || "all",
    limit: args.limit ? Number(args.limit) : Infinity,
    start: args.start ? Number(args.start) : 1,
    delay: args.delay ? Number(args.delay) : 4000,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateOne(ai, kind, number, name, dir) {
  // Path mirrors quranImageUrl() in src/lib/data/quran.ts →
  //   /images/quran/{kind}-{num}.png  (flat, non-padded)
  // so enabling NEXT_PUBLIC_QURAN_IMAGES=1 later just works.
  const file = path.join(dir, `${kind}-${number}.png`);
  if (await fileExists(file)) {
    console.log(`  ⏭  skip ${kind} ${number} (exists)`);
    return "skipped";
  }
  const prompt = buildPrompt(kind, number, name);
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  const parts = res?.candidates?.[0]?.content?.parts ?? [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    const text = parts.find((p) => p.text)?.text || "no image returned";
    throw new Error(`no image data (${text.slice(0, 120)})`);
  }
  await writeFile(file, Buffer.from(img.inlineData.data, "base64"));
  console.log(`  ✅ ${kind} ${number} — ${name}`);
  return "generated";
}

async function run() {
  const { kind, limit, start, delay } = parseArgs();
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const sets = [];
  if (kind === "surah" || kind === "all")
    sets.push({ k: "surah", names: SURAHS, dir: OUT_ROOT });
  if (kind === "juz" || kind === "all")
    sets.push({ k: "juz", names: JUZ, dir: OUT_ROOT });

  let made = 0;
  for (const set of sets) {
    await mkdir(set.dir, { recursive: true });
    console.log(`\n▶ ${set.k.toUpperCase()} (${set.names.length} items)`);
    for (let i = start - 1; i < set.names.length; i++) {
      if (made >= limit) {
        console.log(`\n⏹ reached --limit=${limit}. Re-run to continue.`);
        return;
      }
      const number = i + 1;
      try {
        const r = await generateOne(ai, set.k, number, set.names[i], set.dir);
        if (r === "generated") {
          made++;
          await sleep(delay); // throttle only after real API calls
        }
      } catch (err) {
        console.error(`  ⚠️  ${set.k} ${number} failed: ${err.message}`);
        if (/quota|rate|RESOURCE_EXHAUSTED|429/i.test(err.message)) {
          console.error(
            "\n⏹ Hit a rate/quota limit. Wait a bit (or enable billing) and " +
              "re-run — finished images are skipped automatically.\n"
          );
          return;
        }
        await sleep(delay);
      }
    }
  }
  console.log(`\n✔ Done. Generated ${made} new image(s) into ${OUT_ROOT}`);
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
