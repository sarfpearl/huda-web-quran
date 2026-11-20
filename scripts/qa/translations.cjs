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
  kn: { id: 771, same: false }, // another Kannada translation (ours: Hamza Battur)
  te: { id: 227, same: true },
  gu: { id: 225, same: true },
  mr: { id: 226, same: true },
  as: { id: 120, same: true },
  ne: { id: 108, same: true },
  sd: { id: 238, same: true },
  es: { id: 83, same: true },
  zh: { id: 56, same: true },
  ru: { id: 45, same: true },
  pt: { id: 103, same: true },
  de: { id: 27, same: true },
  fa: { id: 29, same: false }, // Taji Kal Dari (ours: Fooladvand)
  ja: { id: 218, same: true },
  ko: { id: 219, same: true },
  it: { id: 153, same: true },
  nl: { id: 144, same: true },
  sw: { id: 49, same: true },
  ha: { id: 32, same: true },
  so: { id: 46, same: true },
  yo: { id: 125, same: true },
  am: { id: 87, same: true },
  ps: { id: 118, same: true },
  ku: { id: 143, same: true },
  uz: { id: 55, same: true },
  kk: { id: 222, same: true },
  tg: { id: 223, same: true },
  az: { id: 75, same: true },
  bs: { id: 126, same: true },
  sq: { id: 89, same: true },
  tt: { id: 53, same: true },
  ug: { id: 76, same: true },
  dv: { id: 86, same: true },
  si: { id: 228, same: true },
  th: { id: 51, same: true },
  vi: { id: 220, same: true },
  tl: { id: 211, same: true },
};

// Ayahs patched from Quran.com (build-quran-translations.mjs PATCHES).
const PATCHED = {
  tr: { from: 77, ayahs: ["3:177", "3:178"] },
  gu: { from: 225, ayahs: ["3:30"] },
  si: { from: 228, ayahs: ["2:162", "4:10", "18:16"] },
};
// Ayahs moved back into place by build-quran-translations.mjs FIXES.
const FIXED = { ha: ["27:48", "27:49", "27:50", "27:51", "27:52", "27:53", "27:54", "27:55"] };

// Alignment flags checked by hand (2026-10-06) and found right: refrains that
// repeat the next / previous ayah word for word (94:5–6, 74:19–20, 75:34–35)
// and short oaths where Quran.com's other Bengali translator words it
// differently. A new flag outside this list needs a look.
const REVIEWED = new Set([
  "en:94:5", "id:37:1", "id:74:20", "id:94:5",
  "bn:23:10", "bn:35:19", "bn:40:80", "bn:56:87", "bn:74:19", "bn:75:34", "bn:79:4", "bn:81:7", "bn:88:18", "bn:91:4", "bn:91:6",
  // 2026-11-20, the languages added then. Quran.com's own copy is one ayah off
  // and ours is right: Telugu 17:70–77 and 91:12–14, Japanese 37:68–73,
  // Uyghur (where Muhammad Saleh gives one meaning for two or three ayahs,
  // Quran.com shifts it), Hausa 27:49–55 (Quran.com has Gumi's merged 27:48;
  // ours is split, see FIXES).
  ...["17:70", "17:71", "17:72", "17:73", "17:74", "17:75", "17:76", "17:77", "91:12", "91:13", "91:14"].map((k) => `te:${k}`),
  ...["37:68", "37:69", "37:70", "37:71", "37:73"].map((k) => `ja:${k}`),
  ...["27:49", "27:50", "27:51", "27:52", "27:53", "27:54", "27:55"].map((k) => `ha:${k}`),
  ...("3:72 11:55 20:93 26:50 26:209 27:30 35:28 35:29 36:2 37:9 37:88 37:144 39:17 43:2 48:1 48:14 48:15 50:17 50:29 51:10 52:30 " +
    "53:14 53:37 54:20 56:14 69:12 69:38 75:7 77:30 83:25 83:31 83:32 89:1 89:3 94:6").split(" ").map((k) => `ug:${k}`),
  // Refrains and short ayahs, or another translator on Quran.com (kn, fa).
  "te:82:18", "te:94:5", "te:102:4", "ja:94:6", "it:45:37", "it:99:8", "az:69:2", "az:79:2", "az:82:18", "az:101:2",
  "as:78:5", "bs:113:4", "si:69:39", "tl:25:19", "tl:37:2", "gu:15:5", "gu:37:166", "gu:39:13", "gu:112:3",
  "kn:27:2", "kn:40:71", "kn:69:28", "kn:80:21", "kn:88:14", "kn:109:3",
  "fa:37:117", "fa:52:1", "fa:89:2", "fa:91:7", "fa:100:1", "fa:109:4",
]);

// As build-quran-translations.mjs `clean`: footnote markers and a leading
// ayah number out, spaces collapsed.
const clean = (t, aya) =>
  t
    .replace(/\[\d+\]/g, "")
    .replace(new RegExp(`^\\(?${aya}\\)?[.)\\-]?\\s+`), "")
    .replace(/^\(?\p{Nd}{1,3}\)?\s?[.)]\s*/u, "")
    // Saeed Sato's Japanese marks glossary words with "*".
    .replace(/\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

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
    const encText = async (key) => {
      const all = [];
      for (let n = 1; n <= 114; n++)
        all.push(...(await cached(`quranenc-${key}-${n}.json`, `https://quranenc.com/api/v1/translation/sura/${key}/${n}`)).result.map((x) => x.translation));
      return all;
    };
    const src = t.edition.startsWith("qurancom:")
      ? await qcText(t.edition.slice("qurancom:".length))
      : t.edition.startsWith("quranenc:")
      ? await encText(t.edition.slice("quranenc:".length))
      : (await cached(`alquran-${t.edition}.json`, `https://api.alquran.cloud/v1/quran/${t.edition}`)).data.surahs.flatMap((s) => s.ayahs.map((a) => a.text.trim()));
    if (PATCHED[lang]) {
      const fix = await qcText(PATCHED[lang].from);
      keys.forEach(([s, a], i) => PATCHED[lang].ayahs.includes(`${s}:${a}`) && (src[i] = fix[i]));
    }
    mine.forEach((m, i) => {
      const [s, a] = keys[i];
      if (String(m ?? "").trim() === src[i] || String(m ?? "") === clean(String(src[i] ?? ""), a)) return;
      if (FIXED[lang]?.includes(`${s}:${a}`)) return notes.push({ lang, key: `${s}:${a}`, note: "moved back into place (FIXES)", shipped: m, source: src[i] });
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
