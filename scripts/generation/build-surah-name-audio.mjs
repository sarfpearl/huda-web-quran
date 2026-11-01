// ─────────────────────────────────────────────────────────────────────────
//  Surah-name announcement generator (Gemini TTS)
//
//  One short Arabic MP3 per Surah — "سُورَةُ <name>" — spoken before the
//  Bismillah prelude so the listener hears which Surah is beginning. Plays in
//  every mode (recitation and meaning only), for Word Sync reciters. The app
//  plays it as the first prelude stage (src/lib/data/surahTrimming.ts →
//  getSurahNameClip; AudioPlayerContext prelude queue).
//
//    public/audio/prelude/names/<SSS>.mp3   (uploaded to R2: audio/prelude/names/)
//
//  Usage (GEMINI_API_KEY in the environment — never commit it):
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --estimate
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --surah=1,36,114   # pilot
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --all
//  then: node scripts/tools/upload-to-r2.mjs --category=audio-prelude --execute
//
//  It RESUMES: clips already on disk are skipped (pass --force to overwrite).
//  Env: GEMINI_TTS_MODEL (default gemini-3.8-flash-tts); SURAH_NAME_VOICE
//  (the prebuilt voice name, default "Cruz" — one fixed male announcer).
// ─────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const OUT_DIR = path.join(ROOT, "public/audio/prelude/names");
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
const VOICE = process.env.SURAH_NAME_VOICE || "Cruz";

// ── CLI ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};

// ── Arabic names (read straight from the app's metadata) ───────────────────
function loadArabicNames() {
  const src = readFileSync(path.join(ROOT, "src/lib/data/quran.ts"), "utf8");
  const block = src.match(/SURAH_METADATA_EXTRAS[^{]*{([\s\S]*?)\n};/);
  if (!block) fail("could not find SURAH_METADATA_EXTRAS in quran.ts");
  const re = /(\d+):\s*{\s*arabicName:\s*"([^"]+)"/g;
  const out = {};
  let m;
  while ((m = re.exec(block[1]))) out[Number(m[1])] = m[2];
  if (Object.keys(out).length !== 114) fail(`expected 114 names, got ${Object.keys(out).length}`);
  return out;
}
const NAMES = loadArabicNames();
// "سورة " + name, with tashkeel on the word "sūrah" so it is read clearly.
const announcementText = (n) => `سُورَةُ ${NAMES[n]}`;

function pickSurahs() {
  if (args.all) return Array.from({ length: 114 }, (_, i) => i + 1);
  if (args.surah) {
    return String(args.surah)
      .split(",")
      .flatMap((part) => {
        const [a, b] = part.split("-").map(Number);
        return b ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [a];
      });
  }
  return [1, 36, 114]; // default pilot: Al-Fatihah, Ya-Sin, An-Nas
}
const surahs = pickSurahs();
for (const s of surahs) if (!(s >= 1 && s <= 114)) fail(`bad surah ${s}`);

const pad3 = (n) => String(n).padStart(3, "0");
const clipPath = (s) => path.join(OUT_DIR, `${pad3(s)}.mp3`);

// ── Estimate (no API calls) ────────────────────────────────────────────────
if (args.estimate) {
  const chars = surahs.reduce((a, s) => a + announcementText(s).length, 0);
  // Gemini TTS: $10 / 1M input chars (standard); batch halves it. Audio output
  // is billed per second but these clips are ~1.5 s, dwarfed by input here.
  const usd = (chars / 1_000_000) * 10;
  console.log(`Surahs:   ${surahs.length}`);
  console.log(`Chars:    ${chars} (avg ${(chars / surahs.length).toFixed(1)}/clip)`);
  console.log(`Est cost: ~$${usd.toFixed(4)} (standard)  /  ~$${(usd / 2).toFixed(4)} (batch)`);
  console.log(`Sample:   "${announcementText(surahs[0])}"  →  ${pad3(surahs[0])}.mp3`);
  process.exit(0);
}

// ── Generate ───────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) fail("GEMINI_API_KEY not set (run with: node --env-file=.env ...)");
const ai = new GoogleGenAI({ apiKey });

function toPcm(buf, mimeType = "") {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return { pcm: buf, rate: Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000) };
  }
  let rate = 24000;
  for (let o = 12; o + 8 <= buf.length; ) {
    const id = buf.toString("ascii", o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(o + 12);
    if (id === "data") return { pcm: buf.subarray(o + 8, o + 8 + size), rate };
    o += 8 + size + (size & 1);
  }
  throw new Error("WAV has no data chunk");
}

function encodeMp3(pcm, sampleRate, outFile) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", "pipe:0",
      "-codec:a", "libmp3lame", "-b:a", "48k", outFile,
    ]);
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg: ${err.trim()}`))));
    ff.stdin.end(pcm);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthesize(text) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          temperature: 0.4,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      });
      const part = res?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error(`no audio (${res?.candidates?.[0]?.finishReason ?? "?"})`);
      return toPcm(Buffer.from(part.inlineData.data, "base64"), part.inlineData.mimeType);
    } catch (e) {
      const status = e?.status ?? e?.code;
      const retry = attempt < 6 && (status === 429 || status >= 500 || /fetch failed|ECONNRESET|no audio/i.test(String(e?.message)));
      if (!retry) throw e;
      await sleep(Math.min(60000, 2000 * 2 ** attempt));
    }
  }
}

mkdirSync(OUT_DIR, { recursive: true });
let made = 0, skipped = 0;
for (const s of surahs) {
  const out = clipPath(s);
  if (!args.force && existsSync(out)) {
    skipped++;
    continue;
  }
  const text = announcementText(s);
  process.stdout.write(`${pad3(s)} "${text}" … `);
  const { pcm, rate } = await synthesize(text);
  await encodeMp3(pcm, rate, out);
  const seconds = pcm.length / 2 / rate;
  console.log(`✓ ${seconds.toFixed(2)}s`);
  made++;
}
console.log(`\nDone. ${made} made, ${skipped} skipped → ${OUT_DIR}`);
console.log(`Voice: ${VOICE} · Model: ${MODEL}`);
