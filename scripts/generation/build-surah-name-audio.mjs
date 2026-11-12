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
//  With --lang, the announcement in a listener's language: that Arabic clip,
//  a short pause (~0.7 s with the voice's own silences), then the name's
//  meaning read in the language ("… — The Opening"). Meanings: scripts/generation/fixtures/surah-name-meanings.json
//  (null = a letter or a person's name, nothing to add: the clip is the Arabic
//  one as it is). Needs the Arabic clips on disk first.
//
//    public/audio/prelude/names/<lang>/<SSS>.mp3
//
//  Usage (GEMINI_API_KEY in the environment — never commit it):
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --estimate
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --surah=1,36,114   # pilot
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --all
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --all --lang=all --estimate
//    node --env-file=.env scripts/generation/build-surah-name-audio.mjs --all --lang=ta,en --batch
//  then: node scripts/tools/upload-to-r2.mjs --category=audio --execute
//        (category "audio" = public/audio/prelude/** → R2 audio/prelude/**)
//  and add the uploaded languages to SURAH_NAME_MEANING_LANGS
//  (src/lib/data/surahTrimming.ts).
//
//  It RESUMES: clips already on disk are skipped (pass --force to overwrite).
//  Env: GEMINI_TTS_MODEL (default gemini-3.8-flash-tts); SURAH_NAME_VOICE
//  (the prebuilt voice name, default "Cruz" — one fixed male announcer).
// ─────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
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
const arabicText = (n) => `سُورَةُ ${NAMES[n]}`;

const MEANINGS = JSON.parse(
  readFileSync(path.join(ROOT, "scripts/generation/fixtures/surah-name-meanings.json"), "utf8")
).meanings;
const langs = !args.lang ? [] : args.lang === "all" || args.lang === true ? Object.keys(MEANINGS) : String(args.lang).split(",");
for (const l of langs) if (!MEANINGS[l]) fail(`unknown language "${l}" (${Object.keys(MEANINGS).join(", ")}, all)`);

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
const arabicPath = (s) => path.join(OUT_DIR, `${pad3(s)}.mp3`);

// One job per clip: the Arabic announcement, or (--lang) a language's.
// `text` is what TTS reads — null: nothing to read, the Arabic clip is copied.
const jobs = langs.length
  ? langs.flatMap((lang) =>
      surahs.map((s) => ({ key: `${lang}:${s}`, s, lang, text: MEANINGS[lang][s - 1], file: path.join(OUT_DIR, lang, `${pad3(s)}.mp3`) }))
    )
  : surahs.map((s) => ({ key: String(s), s, text: arabicText(s), file: arabicPath(s) }));
const label = (j) => (j.lang ? `${j.lang}/${pad3(j.s)}` : pad3(j.s));

// ── Estimate (no API calls) ────────────────────────────────────────────────
if (args.estimate) {
  // Gemini 3.8 Flash TTS list prices (USD per 1M tokens), as in
  // build-meaning-audio.mjs: text in $0.50, audio out $9 at 25 tokens/s;
  // the Batch API halves both.
  const spoken = jobs.filter((j) => j.text);
  const chars = spoken.reduce((a, j) => a + j.text.length, 0);
  const seconds = spoken.reduce((a, j) => a + 0.4 + j.text.length / 12, 0);
  const usd = (seconds * 25 * 9 + chars * 0.5) / 1e6;
  console.log(`Clips:    ${jobs.length} (${spoken.length} to synthesize, ${jobs.length - spoken.length} copied from the Arabic)`);
  console.log(`Chars:    ${chars} (avg ${(chars / Math.max(1, spoken.length)).toFixed(1)}/clip)`);
  console.log(`Audio:    ~${(seconds / 60).toFixed(1)} min synthesized`);
  console.log(`Est cost: ~$${usd.toFixed(3)} (standard)  /  ~$${(usd / 2).toFixed(3)} (batch), + ~10% for re-takes`);
  if (spoken[0]) console.log(`Sample:   "${spoken[0].text}"  →  ${path.relative(ROOT, spoken[0].file)}`);
  process.exit(0);
}

if (langs.length) {
  const missing = surahs.filter((s) => !existsSync(arabicPath(s)));
  if (missing.length) fail(`Arabic clips missing (make them first): ${missing.map(pad3).join(", ")}`);
}

// ── Generate ───────────────────────────────────────────────────────────────
const apiKey = process.env.GEMINI_API_KEY;
const needsApi = jobs.some((j) => j.text && (args.force || !existsSync(j.file)));
if (needsApi && !apiKey) fail("GEMINI_API_KEY not set (run with: node --env-file=.env ...)");
const ai = needsApi ? new GoogleGenAI({ apiKey }) : null;

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

function ffmpeg(argv, input) {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...argv]);
    const out = [];
    let err = "";
    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg: ${err.trim()}`))));
    ff.stdin.end(input);
  });
}

const encodeMp3 = (pcm, sampleRate, outFile) =>
  ffmpeg(["-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "48k", outFile], pcm);

// The Arabic clip's samples, at the meaning's rate, so the two can be joined.
const decodeMp3 = (file, sampleRate) => ffmpeg(["-i", file, "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "pipe:1"]);

// Between the Arabic name and its meaning.
const MEANING_GAP_SECONDS = 0.1;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const clipRequest = (text) => ({
  contents: [{ role: "user", parts: [{ text }] }],
  config: {
    responseModalities: ["AUDIO"],
    temperature: 0.4,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
  },
});

function pcmFromResponse(res) {
  const part = res?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`no audio (${res?.candidates?.[0]?.finishReason ?? "?"})`);
  return toPcm(Buffer.from(part.inlineData.data, "base64"), part.inlineData.mimeType);
}

async function synthesize(text) {
  for (let attempt = 1; ; attempt++) {
    try {
      return pcmFromResponse(await ai.models.generateContent({ model: MODEL, ...clipRequest(text) }));
    } catch (e) {
      const status = e?.status ?? e?.code;
      const retry = attempt < 6 && (status === 429 || status >= 500 || /fetch failed|ECONNRESET|no audio/i.test(String(e?.message)));
      if (!retry) throw e;
      await sleep(Math.min(60000, 2000 * 2 ** attempt));
    }
  }
}

// A language's clip is the Arabic one + a pause + the meaning just read.
async function saveFromPcm(job, { pcm, rate }) {
  if (job.lang) {
    const gap = Buffer.alloc(Math.round(MEANING_GAP_SECONDS * rate) * 2);
    pcm = Buffer.concat([await decodeMp3(arabicPath(job.s), rate), gap, pcm]);
  }
  await encodeMp3(pcm, rate, job.file);
  return pcm.length / 2 / rate;
}

mkdirSync(OUT_DIR, { recursive: true });
for (const l of langs) mkdirSync(path.join(OUT_DIR, l), { recursive: true });
const pending = jobs.filter((j) => args.force || !existsSync(j.file));
const skipped = jobs.length - pending.length;
// Nothing to read (a letter or a person's name): the Arabic clip as it is.
for (const j of pending.filter((j) => !j.text)) {
  copyFileSync(arabicPath(j.s), j.file);
  console.log(`  = ${label(j)} (Arabic only)`);
}
const todo = pending.filter((j) => j.text);

// ── Batch API (separate daily quota; needed because the direct model is capped
//    at 100 requests/day while the Quran has 114 Surahs) ─────────────────────
if (args.batch) {
  if (!todo.length) {
    console.log(`Nothing to do (${skipped} already on disk).`);
    process.exit(0);
  }
  const job = await ai.batches.create({
    model: MODEL,
    src: todo.map((j) => ({ ...clipRequest(j.text), metadata: { key: j.key } })),
    config: { displayName: `surah-names-${label(todo[0])}-${label(todo.at(-1))}-${todo.length}`.replace(/\//g, "_") },
  });
  console.log(`📤 ${job.name}: ${todo.length} clips submitted (${skipped} skipped)`);
  const DONE = new Set(["JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED", "JOB_STATE_PARTIALLY_SUCCEEDED"]);
  const started = Date.now();
  for (;;) {
    const j = await ai.batches.get({ name: job.name });
    if (DONE.has(j.state)) {
      const responses = j.dest?.inlinedResponses ?? [];
      let made = 0, failed = 0;
      for (const [i, r] of responses.entries()) {
        const j = todo.find((t) => t.key === r.metadata?.key) ?? todo[i];
        try {
          if (r.error) throw new Error(r.error.message ?? JSON.stringify(r.error));
          const seconds = await saveFromPcm(j, pcmFromResponse(r.response));
          console.log(`  ✓ ${label(j)} ${seconds.toFixed(2)}s`);
          made++;
        } catch (e) {
          console.error(`  ❌ ${label(j)}: ${e?.message ?? e}`);
          failed++;
        }
      }
      console.log(`\n${j.state}: ${made} made, ${failed} failed → ${OUT_DIR}`);
      if (failed) console.log("Run again to retry the failed ones.");
      process.exit(failed ? 1 : 0);
    }
    process.stdout.write(`  … ${j.state} (${((Date.now() - started) / 60000).toFixed(0)} min)   \r`);
    await sleep(20000);
  }
}

// ── Direct (one request per clip) ───────────────────────────────────────────
let made = 0;
for (const j of todo) {
  process.stdout.write(`${label(j)} "${j.text}" … `);
  const seconds = await saveFromPcm(j, await synthesize(j.text));
  console.log(`✓ ${seconds.toFixed(2)}s`);
  made++;
}
console.log(`\nDone. ${made} made, ${skipped} skipped → ${OUT_DIR}`);
console.log(`Voice: ${VOICE} · Model: ${MODEL}`);
