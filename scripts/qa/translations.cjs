#!/usr/bin/env node
// HuDa translation check — every ayah meaning in every language must belong
// to its own ayah.
//
//   1. Source: the shipped text = the edition the app names (translations.ts
//      `edition`: alquran.cloud, or "qurancom:<id>"), ayah for ayah, verbatim
//      — apart from the PATCHES in build-quran-translations.mjs.
//   2. Alignment: against Quran.com's copy of a translation (the same
//      translator where Quran.com has it), each ayah's meaning must be closer
//      to Quran.com's same ayah than to the ayah before or after it — a
//      shifted or swapped ayah fails.
//   3. No meaning of ayah 1 (Surahs 2–114) starts with the Bismillah: the app
//      shows the Bismillah as its own prelude, so it would appear twice.
//
// Responses are cached in .qa-cache/translations/ (git-ignored).
// Writes scripts/qa/results/translations.json; exit code 1 on any failure.
//
// Usage: node scripts/qa/translations.cjs [--refresh]
const fs = require("fs");
const path = require("path");
const { ROOT, nativeFetch } = require("./lib/load.cjs");
const { TRANSLATIONS } = require(path.join(ROOT, "src/lib/data/translations.ts"));

const CACHE = path.join(ROOT, ".qa-cache/translations");
const OUT = path.join(ROOT, "scripts/qa/results/translations.json");
const REFRESH = process.argv.includes("--refresh");
fs.mkdirSync(CACHE, { recursive: true });

// Quran.com translation ids. `same` = the same translator as ours; otherwise
// another translation in that language (Quran.com doesn't carry ours), which
// only the alignment test (closer than the neighbours) can use.
const QURAN_COM = {
  en: { id: 20, same: true }, // Saheeh International
  ta: { id: 50, same: true }, // Jan Trust Foundation
  ur: { id: 234, same: true }, // Jalandhry
  ml: { id: 37, same: true }, // Abdul Hameed & Kunhi Mohammed Parappoor
  hi: { id: 122, same: true }, // Azizul Haque al-Umari
  id: { id: 33, same: true }, // Ministry of Religious Affairs
  bn: { id: 161, same: false }, // Taisirul Quran (ours: Muhiuddin Khan)
  tr: { id: 77, same: true }, // Diyanet
  fr: { id: 31, same: true }, // Hamidullah
  ms: { id: 39, same: true }, // Basmeih
};

// Ayahs patched from Quran.com (build-quran-translations.mjs PATCHES).
const PATCHED = { tr: { from: 77, ayahs: ["3:177", "3:178"] } };

// Alignment flags checked by hand (2026-10-06) and found right: refrains that
// repeat the next / previous ayah word for word (94:5–6, 74:19–20, 75:34–35)
// and short oaths where Quran.com's other Bengali translator words it
// differently. A new flag outside this list needs a look.
const REVIEWED = new Set([
  "en:94:5", "id:37:1", "id:74:20", "id:94:5",
  "bn:23:10", "bn:35:19", "bn:40:80", "bn:56:87", "bn:74:19", "bn:75:34", "bn:79:4", "bn:81:7", "bn:88:18", "bn:91:4", "bn:91:6",
]);

const stripNotes = (t) => t.replace(/<sup[^>]*>.*?<\/sup>/g, "").replace(/<[^>]+>/g, "").trim();

const failures = [];
const notes = [];
const fail = (category, lang, key, detail) => failures.push({ category, lang, key, ...detail });

async function cached(name, url) {
  const file = path.join(CACHE, name);
  if (!REFRESH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  for (let i = 1; i <= 5; i++) {
    const res = await nativeFetch(url);
    if (res.ok) {
      const body = await res.json();
      fs.writeFileSync(file, JSON.stringify(body));
      return body;
    }
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  throw new Error(`fetch failed: ${url}`);
}

const readJSON = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

// Words of a meaning: tags / footnote markers out, letters and digits only.
const words = (t) =>
  new Set(
    String(t ?? "")
      .replace(/<sup[^>]*>.*?<\/sup>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .toLowerCase()
      .normalize("NFC")
      .match(/[\p{L}\p{M}\p{N}]+/gu) ?? [],
  );
const sim = (a, b) => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / (a.size + b.size - n);
};

(async () => {
  // The app's ayah list (from the verse bundle) and per-language text.
  const keys = [];
  const shipped = Object.fromEntries(TRANSLATIONS.map((t) => [t.id, []]));
  for (let s = 1; s <= 114; s++) {
    const verses = readJSON(`public/data/quran-verses/${s}.json`);
    const extra = {};
    for (const t of TRANSLATIONS)
      if (t.id !== "en" && t.id !== "ta") extra[t.id] = readJSON(`public/data/quran-translations/${t.id}/${s}.json`);
    verses.forEach((v, i) => {
      keys.push([s, i + 1]);
      shipped.en.push(v.textEnglish);
      shipped.ta.push(v.textTamil);
      for (const id of Object.keys(extra)) shipped[id].push(extra[id][i]);
    });
  }

  const summary = {};
  for (const t of TRANSLATIONS) {
    const lang = t.id;
    const mine = shipped[lang];
    const stat = { edition: t.edition, ayahs: mine.length, sourceDiffs: 0, alignmentChecked: 0, weak: 0 };
    summary[lang] = stat;
    if (mine.length !== 6236) fail("count", lang, "all", { expected: 6236, actual: mine.length });

    // 1. Source edition, verbatim.
    const qcText = async (id) =>
      (await cached(`qurancom-${id}.json`, `https://api.quran.com/api/v4/quran/translations/${id}`)).translations.map((x) => stripNotes(x.text));
    const src = t.edition.startsWith("qurancom:")
      ? await qcText(t.edition.slice("qurancom:".length))
      : (await cached(`alquran-${t.edition}.json`, `https://api.alquran.cloud/v1/quran/${t.edition}`)).data.surahs.flatMap((s) => s.ayahs.map((a) => a.text.trim()));
    if (PATCHED[lang]) {
      const fix = await qcText(PATCHED[lang].from);
      keys.forEach(([s, a], i) => PATCHED[lang].ayahs.includes(`${s}:${a}`) && (src[i] = fix[i]));
    }
    mine.forEach((m, i) => {
      if (String(m ?? "").trim() === src[i]) return;
      const [s, a] = keys[i];
      // Surah 1's verse file is hand-tuned (English / Tamil).
      if (s === 1 && (lang === "en" || lang === "ta")) return notes.push({ lang, key: `${s}:${a}`, note: "Surah 1 hand-tuned", shipped: m, source: src[i] });
      stat.sourceDiffs++;
      fail("source", lang, `${s}:${a}`, { expected: src[i], actual: m });
    });

    // 2. Alignment against Quran.com.
    const qc = QURAN_COM[lang];
    const ref = (await cached(`qurancom-${qc.id}.json`, `https://api.quran.com/api/v4/quran/translations/${qc.id}`)).translations.map((x) => words(x.text));
    if (ref.length !== 6236) fail("reference", lang, "all", { expected: 6236, actual: ref.length });
    const W = mine.map(words);
    for (let i = 0; i < W.length; i++) {
      const [s, a] = keys[i];
      const own = sim(W[i], ref[i]);
      const neighbours = [i - 1, i + 1].filter((j) => j >= 0 && j < W.length && keys[j][0] === s).map((j) => sim(W[i], ref[j]));
      const best = Math.max(0, ...neighbours);
      stat.alignmentChecked++;
      // Very short ayahs (muqatta'at, "By the dawn") share few words with
      // anything; a different translator shares fewer still. Fail only when a
      // neighbour is clearly closer, or (same translator) almost nothing matches.
      if (best > own + 0.05 && best > 0.25 && REVIEWED.has(`${lang}:${s}:${a}`)) stat.reviewed = (stat.reviewed ?? 0) + 1;
      else if (best > own + 0.05 && best > 0.25) fail("alignment", lang, `${s}:${a}`, { own: +own.toFixed(2), neighbour: +best.toFixed(2), shipped: mine[i] });
      else if (qc.same && own < 0.2 && W[i].size >= 6) {
        stat.weak++;
        notes.push({ lang, key: `${s}:${a}`, note: `low similarity to Quran.com ${own.toFixed(2)}`, shipped: mine[i] });
      }
    }

    // 3. Bismillah repeated in ayah 1.
    const bism = [...W[0]];
    for (let i = 0; i < W.length; i++) {
      const [s, a] = keys[i];
      if (a !== 1 || s === 1 || s === 9) continue;
      const head = new Set([...W[i]].slice(0, bism.length + 3));
      const hit = bism.filter((w) => head.has(w)).length / bism.length;
      if (hit >= 0.8 && W[i].size > bism.length + 1) fail("bismillah", lang, `${s}:1`, { shipped: mine[i] });
    }
  }

  const byCat = {};
  for (const f of failures) byCat[`${f.category}:${f.lang}`] = (byCat[`${f.category}:${f.lang}`] ?? 0) + 1;
  fs.writeFileSync(OUT, JSON.stringify({ summary, failuresByCategory: byCat, failures, notes }, null, 2) + "\n");
  console.log(JSON.stringify({ summary, failures: failures.length, failuresByCategory: byCat, notes: notes.length }, null, 2));
  for (const f of failures.slice(0, 30)) console.log("FAIL", JSON.stringify(f).slice(0, 300));
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
