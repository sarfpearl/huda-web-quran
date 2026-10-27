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
//    assets/audio/meaning/v1/batches.json                    (--batch jobs pending)
//
//  Usage (GEMINI_API_KEY in the environment — never commit it — or, in a
//  Claude Code cloud session, a Network secret for
//  generativelanguage.googleapis.com, header x-goog-api-key, no prefix: the
//  proxy adds the key to each request and the script sends a placeholder):
//    node scripts/generation/build-meaning-audio.mjs --estimate
//    node scripts/generation/build-meaning-audio.mjs --surah=1 --voice=cruz --lang=ta   # pilot
//    node scripts/generation/build-meaning-audio.mjs --surah=1-114 --voice=all --lang=all
//    node scripts/generation/build-meaning-audio.mjs --surah=78-114 --batch --max-usd=3   # half price
//    node scripts/generation/build-meaning-audio.mjs --manifest   # after the upload
//  then: node scripts/tools/upload-to-r2.mjs --category=audio-meaning --execute
//  and:  node scripts/generation/build-meaning-stops.mjs   # where each reciter's ayah ends
//
//  Flags:
//    --surah=N | N-M      Surahs (default 1-114)
//    --voice=cruz|lora|all, --lang=en|ta|all   (default all)
//    --concurrency=N      requests at once (default 4)
//    --max-usd=N          stop starting new clips once this run has spent $N
//                         (default 2 — raise it for a big run; see --estimate)
//    --estimate           characters, hours of audio and cost; no API calls
//    --batch              Gemini Batch API: half the price, results within 24 h
//                         (usually minutes). Clips go up in jobs of
//                         --batch-size (default 100); the jobs are kept in
//                         batches.json, so a run stopped while waiting picks
//                         them up again (run the same command). --no-wait
//                         submits and exits; --max-usd counts the estimate of
//                         each job before it is sent.
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
const BATCHES = path.join(OUT_ROOT, "batches.json");
const MANIFEST = path.join(ROOT, "src/lib/data/meaningAudioManifest.json");
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";

const VOICES = {
  cruz: process.env.MEANING_VOICE_CRUZ || "Cruz",
  lora: process.env.MEANING_VOICE_LORA || "Lora",
};
const LANGS = {
  // Measured on the Surah 1 and 108 clips (both voices): ~12.7 and ~12.2.
  en: { field: "textEnglish", name: "English", charsPerSecond: 12.7 },
  ta: { field: "textTamil", name: "Tamil", charsPerSecond: 12.2 },
};

// Gemini 3.8 Flash TTS list prices (USD per 1M tokens) as of 2026-10 —
// recheck on Google's pricing page; they double on 2027-01-01.
const PRICE = { input: 0.5, audio: 9 };
const BATCH_DISCOUNT = 0.5; // the Batch API's price, of the above
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
const maxUsd = Number(args["max-usd"] ?? 2);

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
  console.log(`\nSurahs ${surahs[0]}–${surahs.at(-1)} · voices ${voices.join(", ")}${args.batch ? " · Batch API (half price)" : ""}\n`);
  for (const lang of langs) {
    const chars = surahs.reduce((n, s) => n + verses(s).reduce((m, v) => m + (v[LANGS[lang].field] ?? "").length, 0), 0);
    const seconds = chars / LANGS[lang].charsPerSecond;
    const perVoice =
      ((seconds * AUDIO_TOKENS_PER_SECOND * PRICE.audio + chars * PRICE.input) / 1e6) * (args.batch ? BATCH_DISCOUNT : 1);
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
// No key here: the cloud session's proxy adds the real one (see Usage).
const API_KEY = process.env.GEMINI_API_KEY || "proxy-injected";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// The verse text alone: the TTS model read any style direction aloud along
// with it (a paragraph, and even a one-line "Say in a calm voice: …").
const prompt = (text) => text;

/** 16-bit PCM (see toPcm) → mono MP3 (48 kbps, small and clear for speech). */
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

/**
 * Gemini sends either raw 16-bit PCM ("audio/L16;rate=24000") or a whole WAV
 * file ("audio/wav") whose trailing C2PA chunk — read as samples — plays as
 * ~0.3 s of loud noise. Return just the samples and their rate.
 */
function toPcm(buf, mimeType = "") {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    return { pcm: buf, rate: Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000) };
  }
  let rate = 24000;
  for (let o = 12; o + 8 <= buf.length; ) {
    const id = buf.toString("ascii", o, o + 4);
    const size = buf.readUInt32LE(o + 4);
    if (id === "fmt ") {
      if (buf.readUInt16LE(o + 8) !== 1 || buf.readUInt16LE(o + 10) !== 1 || buf.readUInt16LE(o + 22) !== 16)
        throw new Error("WAV is not 16-bit mono PCM");
      rate = buf.readUInt32LE(o + 12);
    }
    if (id === "data") return { pcm: buf.subarray(o + 8, o + 8 + size), rate };
    o += 8 + size + (size & 1);
  }
  throw new Error("WAV has no data chunk");
}

/** One clip's request (the same for a direct call and a batch job). */
const request = (voice, text) => ({
  contents: [{ role: "user", parts: [{ text: prompt(text) }] }],
  config: {
    responseModalities: ["AUDIO"],
    // Lower than the default: the same calm reading on every ayah.
    temperature: 0.5,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICES[voice] } } },
  },
});

/** The samples of a GenerateContentResponse (direct or from a batch). */
function audioOf(res) {
  const part = res?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) throw new Error(`no audio in the response (${res?.candidates?.[0]?.finishReason ?? "?"})`);
  const { pcm, rate } = toPcm(Buffer.from(part.inlineData.data, "base64"), part.inlineData.mimeType);
  return { pcm, rate, usage: res.usageMetadata ?? {} };
}

async function synthesize(voice, lang, text) {
  for (let attempt = 1; ; attempt++) {
    try {
      return audioOf(await ai.models.generateContent({ model: MODEL, ...request(voice, text) }));
    } catch (e) {
      const status = e?.status ?? e?.code;
      const retry = attempt < 6 && (status === 429 || status >= 500 || /fetch failed|ECONNRESET|no audio/i.test(String(e?.message)));
      if (!retry) throw e;
      await sleep(Math.min(60000, 2000 * 2 ** attempt));
    }
  }
}

const keyOf = (job) => `${job.voice}/${job.lang}/${job.s}:${job.a}`;

/** Writes a clip's MP3 and its ledger line. */
async function saveClip(job, { pcm, rate, usage }, batch = false) {
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
      key: keyOf(job), seconds: Number(seconds.toFixed(2)), expected: Number(expected.toFixed(1)), check,
      inputTokens: usage.promptTokenCount, audioTokens: usage.candidatesTokenCount, ...(batch && { batch: true }),
      at: new Date().toISOString(),
    }) + "\n"
  );
  done++;
  if (check) console.warn(`  ⚠️  ${keyOf(job)}: ${seconds.toFixed(1)} s for ~${expected.toFixed(0)} s of text — listen to it`);
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
let stopped = false;
const spentUsd = () => ((audioTokens * PRICE.audio + inputTokens * PRICE.input) / 1e6) * (args.batch ? BATCH_DISCOUNT : 1);

if (args.batch) {
  await mkdir(OUT_ROOT, { recursive: true });
  await runBatches();
  progress();
  process.exit(0);
}

async function worker() {
  while (jobs.length) {
    if (spentUsd() >= maxUsd) {
      if (!stopped) console.warn(`  ⛔ $${maxUsd} budget reached — stopping (raise --max-usd to go on).`);
      stopped = true;
      return;
    }
    const job = jobs.shift();
    try {
      await saveClip(job, await synthesize(job.voice, job.lang, job.text));
      if (done % 25 === 0) progress();
    } catch (e) {
      failed++;
      console.error(`  ❌ ${keyOf(job)}: ${e?.message ?? e}`);
    }
  }
}

function progress() {
  const usd = spentUsd();
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`  ${done} done, ${failed} failed, ${jobs.length} left · ${mins} min · $${usd.toFixed(3)} so far`);
}

await mkdir(OUT_ROOT, { recursive: true });
await Promise.all(Array.from({ length: concurrency }, worker));
progress();
if (stopped) console.log(`\n⛔ Stopped at the $${maxUsd} budget — ${jobs.length} clips left.\n`);
else console.log(failed ? `\n⚠️  ${failed} failed — run again to retry them.\n` : "\n✅ Done.\n");

// ── --batch ────────────────────────────────────────────────────────────────
// Half price; Google runs the requests within 24 h. Each job's clips are
// listed in batches.json (by key) until their MP3s are written, so a run
// stopped while it waits picks the jobs up again, and those clips aren't
// sent twice.

function readBatches() {
  try {
    return JSON.parse(readFileSync(BATCHES, "utf8"));
  } catch {
    return [];
  }
}
function writeBatches(list) {
  return writeFile(BATCHES, JSON.stringify(list, null, 1) + "\n");
}

/** What a clip should cost in a batch (its text's expected length). */
function estimateUsd(job) {
  const seconds = job.text.length / LANGS[job.lang].charsPerSecond;
  return ((seconds * AUDIO_TOKENS_PER_SECOND * PRICE.audio + job.text.length * PRICE.input) / 1e6) * BATCH_DISCOUNT;
}

async function runBatches() {
  let pending = readBatches();
  const inFlight = new Set(pending.flatMap((b) => b.keys));
  const todo = jobs.filter((j) => !inFlight.has(keyOf(j)));
  const size = Math.max(1, Number(args["batch-size"] ?? 100));
  let committed = 0;
  let sent = todo.length;
  for (let i = 0; i < todo.length; i += size) {
    const chunk = todo.slice(i, i + size);
    const cost = chunk.reduce((n, j) => n + estimateUsd(j), 0);
    if (committed + cost > maxUsd) {
      console.warn(`  ⛔ $${maxUsd} budget: ${todo.length - i} clips not sent (≈ $${committed.toFixed(2)} sent) — raise --max-usd to go on.`);
      stopped = true;
      sent = i;
      break;
    }
    const job = await ai.batches.create({
      model: MODEL,
      src: chunk.map((j) => ({ ...request(j.voice, j.text), metadata: { key: keyOf(j) } })),
      config: { displayName: `meaning-${keyOf(chunk[0]).replace(/[/:]/g, "-")}-${chunk.length}` },
    });
    committed += cost;
    pending.push({ name: job.name, keys: chunk.map(keyOf), at: new Date().toISOString() });
    await writeBatches(pending);
    console.log(`  📤 ${job.name}: ${chunk.length} clips (≈ $${cost.toFixed(3)})`);
  }
  // What's left for a later run (the progress line counts these).
  jobs.splice(0, jobs.length, ...todo.slice(sent));
  if (args["no-wait"]) {
    console.log(`\n${pending.length} job(s) pending — run the same command later to collect them.\n`);
    return;
  }

  // Every clip this run could need, by key (texts / files for the responses).
  const byKey = new Map();
  for (const voice of Object.keys(VOICES))
    for (const lang of Object.keys(LANGS))
      for (const s of new Set(pending.flatMap((b) => b.keys.map((k) => Number(k.split("/")[2].split(":")[0])))))
        for (const v of verses(s))
          byKey.set(`${voice}/${lang}/${s}:${v.ayahNumber}`, {
            voice, lang, s, a: v.ayahNumber, text: (v[LANGS[lang].field] ?? "").trim(), file: clipPath(voice, lang, s, v.ayahNumber),
          });

  const DONE = new Set(["JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED", "JOB_STATE_PARTIALLY_SUCCEEDED"]);
  while (pending.length) {
    for (const b of [...pending]) {
      const job = await ai.batches.get({ name: b.name });
      if (!DONE.has(job.state)) continue;
      const responses = job.dest?.inlinedResponses ?? [];
      for (const [i, r] of responses.entries()) {
        const key = r.metadata?.key ?? b.keys[i];
        const clip = byKey.get(key);
        try {
          if (r.error) throw new Error(r.error.message ?? JSON.stringify(r.error));
          if (!clip) throw new Error("unknown clip");
          await saveClip(clip, audioOf(r.response), true);
        } catch (e) {
          failed++;
          console.error(`  ❌ ${key}: ${e?.message ?? e}`);
        }
      }
      if (job.state !== "JOB_STATE_SUCCEEDED") console.warn(`  ⚠️  ${b.name}: ${job.state} ${job.error?.message ?? ""}`);
      pending = pending.filter((p) => p !== b);
      await writeBatches(pending);
      console.log(`  📥 ${b.name}: ${responses.length} of ${b.keys.length} back · $${spentUsd().toFixed(3)} so far`);
    }
    if (pending.length) {
      process.stdout.write(`  … ${pending.length} job(s) running (${((Date.now() - started) / 60000).toFixed(0)} min)\r`);
      await sleep(30000);
    }
  }
  console.log(failed ? `\n⚠️  ${failed} failed — run again to retry them.\n` : "\n✅ Done.\n");
}
