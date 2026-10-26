// ─────────────────────────────────────────────────────────────────────────
//  Meaning audio generator (Gemini TTS)
//
//  One MP3 per ayah: its meaning — textEnglish / textTamil from
//  public/data/quran-verses/<surah>.json, word for word — read by a Gemini
//  voice (Cruz = male, Lora = female). The app plays it after the ayah
//  (src/lib/data/meaningAudio.ts).
//
//    assets/audio/meaning/v1/<voice>/<lang>/<SSS><AAA>.mp3   (git-ignored)
//    assets/audio/meaning/v1/ledger.jsonl                    (tokens per clip)
//
//  Usage (GEMINI_API_KEY in the environment — never commit it):
//    node scripts/generation/build-meaning-audio.mjs --estimate
//    node scripts/generation/build-meaning-audio.mjs --surah=1 --voice=cruz --lang=ta   # pilot
//    node scripts/generation/build-meaning-audio.mjs --surah=1-114 --voice=all --lang=all
//    node scripts/generation/build-meaning-audio.mjs --manifest   # after the upload
//  then: node scripts/tools/upload-to-r2.mjs --category=audio-meaning --execute
//
//  Flags:
//    --surah=N | N-M      Surahs (default 1-114)
//    --voice=cruz|lora|all, --lang=en|ta|all   (default all)
//    --concurrency=N      requests at once (default 4)
//    --estimate           characters, hours of audio and cost; no API calls
//    --manifest           write src/lib/data/meaningAudioManifest.json: the
//                         Surahs with every ayah's clip on disk (upload first)
//
//  Env: GEMINI_TTS_MODEL (default gemini-3.8-flash-tts); MEANING_VOICE_CRUZ /
//  MEANING_VOICE_LORA — the API's voice names (AI Studio → "Get code" shows
//  them; default "Cruz" / "Lora").
//
//  It RESUMES: clips already on disk are skipped. A clip far shorter or
//  longer than its text should take is flagged "check" in the ledger (a
//  skipped or repeated phrase) — listen to those, delete and re-run.
// ─────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from "@google/genai";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { appendFile, mkdir, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const VERSION = 1;
const OUT_ROOT = path.join(ROOT, "assets/audio/meaning", `v${VERSION}`);
const LEDGER = path.join(OUT_ROOT, "ledger.jsonl");
const MANIFEST = path.join(ROOT, "src/lib/data/meaningAudioManifest.json");
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";

const VOICES = {
  cruz: process.env.MEANING_VOICE_CRUZ || "Cruz",
  lora: process.env.MEANING_VOICE_LORA || "Lora",
};
const LANGS = {
  en: { field: "textEnglish", name: "English", charsPerSecond: 14 },
  ta: { field: "textTamil", name: "Tamil", charsPerSecond: 10 }, // measured: 358 chars in 36 s
};

// Gemini 3.8 Flash TTS list prices (USD per 1M tokens) as of 2026-10 —
// recheck on Google's pricing page; they double on 2027-01-01.
const PRICE = { input: 0.5, audio: 9 };
const AUDIO_TOKENS_PER_SECOND = 25;
const USD_TO_INR = 85;

// ── args ───────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const pick = (value, all) => (!value || value === "all" ? Object.keys(all) : String(value).split(","));
const voices = pick(args.voice, VOICES);
const langs = pick(args.lang, LANGS);
for (const v of voices) if (!VOICES[v]) fail(`Unknown voice "${v}" (cruz, lora, all).`);
for (const l of langs) if (!LANGS[l]) fail(`Unknown language "${l}" (en, ta, all).`);
const [fromSurah, toSurah] = String(args.surah ?? "1-114").split("-").map(Number);
const surahs = range(fromSurah, Number.isFinite(toSurah) ? toSurah : fromSurah);
if (!surahs.length || surahs[0] < 1 || surahs.at(-1) > 114) fail(`Bad --surah "${args.surah}".`);
const concurrency = Math.max(1, Number(args.concurrency ?? 4));

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}
function range(a, b) {
  return Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
}
const pad3 = (n) => String(n).padStart(3, "0");
const clipPath = (voice, lang, s, a) => path.join(OUT_ROOT, voice, lang, `${pad3(s)}${pad3(a)}.mp3`);

function verses(surah) {
  return JSON.parse(readFileSync(path.join(ROOT, "public/data/quran-verses", `${surah}.json`), "utf8"));
}

// ── --estimate ─────────────────────────────────────────────────────────────
if (args.estimate) {
  let usd = 0;
  console.log(`\nSurahs ${surahs[0]}–${surahs.at(-1)} · voices ${voices.join(", ")}\n`);
  for (const lang of langs) {
    const chars = surahs.reduce((n, s) => n + verses(s).reduce((m, v) => m + (v[LANGS[lang].field] ?? "").length, 0), 0);
    const seconds = chars / LANGS[lang].charsPerSecond;
    const perVoice = (seconds * AUDIO_TOKENS_PER_SECOND * PRICE.audio + chars * PRICE.input) / 1e6;
    usd += perVoice * voices.length;
    console.log(
      `  ${LANGS[lang].name.padEnd(8)} ${chars.toLocaleString()} chars ≈ ${(seconds / 3600).toFixed(1)} h of audio` +
        ` → $${perVoice.toFixed(2)} per voice`
    );
  }
  console.log(`\n  Total ≈ $${usd.toFixed(2)} (≈ ₹${Math.round(usd * USD_TO_INR).toLocaleString()}), + ~10% for re-takes.\n`);
  process.exit(0);
}

// ── --manifest ─────────────────────────────────────────────────────────────
if (args.manifest) {
  const out = { version: VERSION, surahs: {} };
  for (const voice of Object.keys(VOICES)) {
    out.surahs[voice] = {};
    for (const lang of Object.keys(LANGS)) {
      const dir = path.join(OUT_ROOT, voice, lang);
      const have = new Set(existsSync(dir) ? await readdir(dir) : []);
      out.surahs[voice][lang] = range(1, 114).filter((s) =>
        verses(s).every((v) => have.has(`${pad3(s)}${pad3(v.ayahNumber)}.mp3`))
      );
    }
  }
  await writeFile(MANIFEST, JSON.stringify(out, null, 2) + "\n");
  for (const [voice, ls] of Object.entries(out.surahs))
    for (const [lang, list] of Object.entries(ls)) console.log(`  ${voice}/${lang}: ${list.length} Surahs`);
  console.log(`\n✅ Wrote ${path.relative(ROOT, MANIFEST)} — upload the clips before deploying it.\n`);
  process.exit(0);
}

// ── generate ───────────────────────────────────────────────────────────────
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) fail("GEMINI_API_KEY is not set.");
const ai = new GoogleGenAI({ apiKey: API_KEY });

const prompt = (lang, text) =>
  `Read this ${LANGS[lang].name} translation of a Quran verse aloud in a calm, warm and respectful voice, ` +
  `at a gentle, steady pace. Read it exactly as written, word for word: do not add, skip or repeat anything. ` +
  `Do not read these instructions.\n\n${text}`;

/** 16-bit PCM from Gemini → mono MP3 (48 kbps, small and clear for speech). */
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

async function synthesize(voice, lang, text) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt(lang, text) }] }],
        config: {
          responseModalities: ["AUDIO"],
          // Lower than the default: the same calm reading on every ayah.
          temperature: 0.5,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } },
        },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part) throw new Error(`no audio in the response (${res.candidates?.[0]?.finishReason ?? "?"})`);
      const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? "")?.[1] ?? 24000);
      return { pcm: Buffer.from(part.inlineData.data, "base64"), rate, usage: res.usageMetadata ?? {} };
    } catch (e) {
      const status = e?.status ?? e?.code;
      const retry = attempt < 6 && (status === 429 || status >= 500 || /fetch failed|ECONNRESET|no audio/i.test(String(e?.message)));
      if (!retry) throw e;
      await sleep(Math.min(60000, 2000 * 2 ** attempt));
    }
  }
}

const jobs = [];
for (const voice of voices)
  for (const lang of langs)
    for (const s of surahs)
      for (const v of verses(s)) {
        const file = clipPath(voice, lang, s, v.ayahNumber);
        const text = (v[LANGS[lang].field] ?? "").trim();
        if (text && !existsSync(file)) jobs.push({ voice, lang, s, a: v.ayahNumber, text, file });
      }

console.log(`\n${MODEL} · ${jobs.length} clips to make (existing ones skipped)\n`);
let done = 0;
let failed = 0;
let audioTokens = 0;
let inputTokens = 0;
const started = Date.now();

async function worker() {
  while (jobs.length) {
    const job = jobs.shift();
    const key = `${job.voice}/${job.lang}/${job.s}:${job.a}`;
    try {
      const { pcm, rate, usage } = await synthesize(job.voice, job.lang, job.text);
      await mkdir(path.dirname(job.file), { recursive: true });
      const tmp = `${job.file}.part.mp3`;
      await encodeMp3(pcm, rate, tmp);
      await rename(tmp, job.file);
      const seconds = pcm.length / 2 / rate;
      const expected = job.text.length / LANGS[job.lang].charsPerSecond;
      const check = seconds < expected * 0.5 || seconds > expected * 2;
      audioTokens += usage.candidatesTokenCount ?? 0;
      inputTokens += usage.promptTokenCount ?? 0;
      await appendFile(
        LEDGER,
        JSON.stringify({
          key, seconds: Number(seconds.toFixed(2)), expected: Number(expected.toFixed(1)), check,
          inputTokens: usage.promptTokenCount, audioTokens: usage.candidatesTokenCount, at: new Date().toISOString(),
        }) + "\n"
      );
      done++;
      if (check) console.warn(`  ⚠️  ${key}: ${seconds.toFixed(1)} s for ~${expected.toFixed(0)} s of text — listen to it`);
      if (done % 25 === 0) progress();
    } catch (e) {
      failed++;
      console.error(`  ❌ ${key}: ${e?.message ?? e}`);
    }
  }
}

function progress() {
  const usd = (audioTokens * PRICE.audio + inputTokens * PRICE.input) / 1e6;
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`  ${done} done, ${failed} failed, ${jobs.length} left · ${mins} min · $${usd.toFixed(3)} so far`);
}

await mkdir(OUT_ROOT, { recursive: true });
await Promise.all(Array.from({ length: concurrency }, worker));
progress();
console.log(failed ? `\n⚠️  ${failed} failed — run again to retry them.\n` : "\n✅ Done.\n");
