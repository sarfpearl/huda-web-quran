#!/usr/bin/env node
// HuDa Quran content check — every Surah and ayah the app ships, against
// Quran.com's API (api.quran.com/api/v4).
//
// Checks, for all 114 Surahs:
//   - Surah lists (quran.ts, surahList.ts, surahChapters.ts, surahNames.ts):
//     number, name, Arabic name, verse count, Meccan / Medinan
//   - verse text bundle (public/data/quran-verses): one entry per ayah, in
//     order, Arabic text = Quran.com's (letters compared, marks ignored —
//     Tanzil and QPC write a few marks differently)
//   - translations (verses bundle en/ta + quran-translations/*): one line per ayah
//   - Tajweed glyph data (quran-glyphs): words, glyph codes and pages
//   - Mushaf page starts (mushafPages.ts) = Quran.com page_number
//   - Juz boundaries (quran.ts JUZ_START_AYAH, ImmersiveHomeClient
//     JUZ_START_SURAH) — the app uses the Indo-Pak division on purpose; the
//     only allowed differences from Quran.com (Madani) are listed below
//
// Quran.com responses are cached in .qa-cache/quran-com/ (git-ignored).
// Writes scripts/qa/results/quran-content.json; exit code 1 on any failure.
//
// Usage: node scripts/qa/quran-content.cjs [--refresh]
const fs = require("fs");
const path = require("path");
const { Q, ROOT, nativeFetch } = require("./lib/load.cjs");
const { SURAH_METADATA_LIST } = require(path.join(ROOT, "src/lib/data/surahList.ts"));
const { SURAH_CHAPTERS_REGISTRY } = require(path.join(ROOT, "src/lib/data/surahChapters.ts"));
const { SURAH_NAMES } = require(path.join(ROOT, "src/lib/data/surahNames.ts"));
const { MUSHAF_PAGE_STARTS, MUSHAF_PAGE_COUNT } = require(path.join(ROOT, "src/lib/data/mushafPages.ts"));

const CACHE = path.join(ROOT, ".qa-cache/quran-com");
const OUT = path.join(ROOT, "scripts/qa/results/quran-content.json");
const REFRESH = process.argv.includes("--refresh");
fs.mkdirSync(CACHE, { recursive: true });

const failures = [];
const fail = (category, where, expected, actual, detail = "") =>
  failures.push({ category, where, expected, actual, ...(detail ? { detail } : {}) });

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
    await new Promise((r) => setTimeout(r, 1000 * i));
  }
  throw new Error(`fetch failed: ${url}`);
}

const readJSON = (rel) => {
  const p = path.join(ROOT, rel);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null;
};

// Letters only: hamza on a tatweel (ـٔ) = ء; then no harakat / Quranic marks /
// tatweel / dagger alif; one alif for ٱ آ أ إ ا; ى = ي; hamza seats folded.
// Enough to catch a wrong or shifted ayah, not the spelling conventions where
// Tanzil and QPC differ.
const skeleton = (t) =>
  t
    .normalize("NFC")
    .replace(/[ٕٔ]/g, "ء")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ‌‍]/g, "")
    .replace(/[ٱآأإا]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/[ؤئء]/g, "ء")
    .replace(/ہ/g, "ه")
    .replace(/[^ء-ي]/g, "");

// Basmala as it opens ayah 1 in the reference text (dropped by the app's
// bundle for Surahs 2–114 except 9, see build-quran-verses.mjs).
const BASMALA = skeleton("بسم الله الرحمن الرحيم");

const SPLIT_POSITIONS = new Set(["37:130:3"]);

// Tanzil's Uthmani (the text view) writes «يَٰصَىٰحِبَىِ» with a ى in 12:39 and
// 12:41, a rasm variant; the Madinah Mushaf (Quran.com, the Tajweed view) has
// «يَٰصَٰحِبَيِ». Same word, not a wrong ayah.
const TEXT_VARIANTS = new Set(["12:39", "12:41"]);

// Indo-Pak Juz starts that differ from Quran.com's Madani division
// (documented in quran.ts above JUZ_START_AYAH).
const INDOPAK_JUZ = { 4: [3, 92], 7: [5, 83], 11: [9, 94], 20: [27, 60], 21: [29, 45], 23: [36, 22] };

(async () => {
  const chapters = (await cached("chapters.json", "https://api.quran.com/api/v4/chapters")).chapters;
  const ref = {}; // surah -> verses[]
  for (let s = 1; s <= 114; s++) {
    ref[s] = (
      await cached(
        `verses-${s}.json`,
        `https://api.quran.com/api/v4/verses/by_chapter/${s}?per_page=300&fields=text_uthmani&words=true&word_fields=code_v2,page_number,text_qpc_hafs`,
      )
    ).verses;
    process.stdout.write(`\rQuran.com reference ${s}/114`);
  }
  process.stdout.write("\n");

  const typeOf = (c) => (c.revelation_place === "makkah" ? "Meccan" : "Medinan");

  // ── Surah lists ───────────────────────────────────────────────────────
  const lists = {
    "quran.ts QURAN_SURAHS": Q.QURAN_SURAHS.map((x) => ({ n: x.number, name: x.name, ar: x.arabicName, v: x.verses, t: x.type })),
    "surahList.ts": SURAH_METADATA_LIST.map((x) => ({ n: x.num, name: x.name })),
    "surahChapters.ts": Object.values(SURAH_CHAPTERS_REGISTRY).map((x) => ({ n: x.surahNumber, name: x.name, ar: x.arabicName, v: x.verses, t: x.revelation })),
  };
  for (const [where, list] of Object.entries(lists)) {
    // surahChapters.ts only holds the Surahs with their own video chapters.
    const sparse = where === "surahChapters.ts";
    if (!sparse && list.length !== 114) fail("surah-list", where, 114, list.length, "entry count");
    list.forEach((x, i) => {
      const c = chapters[x.n - 1];
      if (!sparse && x.n !== i + 1) fail("surah-list", `${where} #${i + 1}`, i + 1, x.n, "number out of order");
      if (!c) return;
      if (x.ar !== undefined && skeleton(x.ar) !== skeleton(c.name_arabic)) fail("arabic-name", `${where} ${x.n}`, c.name_arabic, x.ar);
      if (x.v !== undefined && x.v !== c.verses_count) fail("verse-count", `${where} ${x.n}`, c.verses_count, x.v);
      if (x.t !== undefined && x.t !== typeOf(c)) fail("revelation", `${where} ${x.n}`, typeOf(c), x.t);
    });
  }
  // English names: the lists must agree with each other (spelling is the
  // app's own transliteration, so Quran.com's is only reported).
  const nameDiffs = [];
  for (let s = 1; s <= 114; s++) {
    const names = new Set(Object.values(lists).map((l) => l.find((x) => x.n === s)?.name).filter(Boolean));
    if (names.size > 1) fail("surah-name", `Surah ${s}`, "same name in every list", [...names].join(" | "));
    const ours = lists["quran.ts QURAN_SURAHS"][s - 1]?.name;
    if (ours !== chapters[s - 1].name_simple) nameDiffs.push(`${s}: ${ours} / ${chapters[s - 1].name_simple}`);
  }
  // Slugs unique (they name image files).
  const slugs = SURAH_METADATA_LIST.map((x) => x.slug);
  if (new Set(slugs).size !== slugs.length) fail("surah-list", "surahList.ts", "unique slugs", "duplicates");
  // Chapters inside surahChapters.ts cover 1..verses with no gap or overlap.
  for (const x of Object.values(SURAH_CHAPTERS_REGISTRY)) {
    let next = 1;
    for (const ch of x.chapters) {
      if (ch.fromVerse !== next) fail("chapter-ranges", `surahChapters.ts ${x.surahNumber} ch${ch.id}`, `from ${next}`, `from ${ch.fromVerse}`);
      next = ch.toVerse + 1;
    }
    if (next - 1 !== x.verses) fail("chapter-ranges", `surahChapters.ts ${x.surahNumber}`, `ends at ${x.verses}`, `ends at ${next - 1}`);
  }
  // surahNames.ts: Arabic title = "سورة " + name.
  if (SURAH_NAMES.length !== 114) fail("surah-list", "surahNames.ts", 114, SURAH_NAMES.length);
  SURAH_NAMES.forEach(([ar], i) => {
    const want = skeleton("سورة") + skeleton(chapters[i].name_arabic);
    if (skeleton(ar) !== want) fail("arabic-name", `surahNames.ts ${i + 1}`, `سورة ${chapters[i].name_arabic}`, ar);
  });

  // ── Verse text, translations, glyphs ──────────────────────────────────
  const transLangs = fs.readdirSync(path.join(ROOT, "public/data/quran-translations")).filter((d) => !d.startsWith("."));
  let ayahs = 0;
  let textChecked = 0;
  let glyphWords = 0;
  for (let s = 1; s <= 114; s++) {
    const want = chapters[s - 1].verses_count;
    const rv = ref[s];
    if (rv.length !== want) fail("reference", `Quran.com ${s}`, want, rv.length);
    ayahs += want;

    const vb = readJSON(`public/data/quran-verses/${s}.json`);
    if (!vb) fail("verse-bundle", `quran-verses/${s}.json`, "file", "missing");
    else {
      if (vb.length !== want) fail("verse-bundle", `quran-verses/${s}.json`, want, vb.length, "ayah count");
      vb.forEach((v, i) => {
        const a = i + 1;
        if (v.surahNumber !== s || v.ayahNumber !== a || v.verseKey !== `${s}:${a}`)
          fail("verse-bundle", `${s}:${a}`, `${s}:${a}`, `${v.surahNumber}:${v.ayahNumber} (${v.verseKey})`, "key out of order");
        if (!v.textEnglish?.trim()) fail("translation", `${s}:${a} en`, "text", "empty");
        if (!v.textTamil?.trim()) fail("translation", `${s}:${a} ta`, "text", "empty");
        const r = rv[i];
        if (!r) return;
        let mine = skeleton(v.textArabic ?? "");
        let theirs = skeleton(r.text_uthmani);
        if (a === 1 && s !== 1 && s !== 9 && theirs.startsWith(BASMALA) && !mine.startsWith(BASMALA)) theirs = theirs.slice(BASMALA.length);
        textChecked++;
        if (mine !== theirs && !TEXT_VARIANTS.has(`${s}:${a}`)) fail("arabic-text", `${s}:${a}`, r.text_uthmani, v.textArabic);
      });
    }

    for (const lang of transLangs) {
      const t = readJSON(`public/data/quran-translations/${lang}/${s}.json`);
      if (!t) fail("translation", `${lang}/${s}.json`, "file", "missing");
      else {
        if (t.length !== want) fail("translation", `${lang}/${s}.json`, want, t.length, "line count");
        t.forEach((line, i) => !String(line ?? "").trim() && fail("translation", `${s}:${i + 1} ${lang}`, "text", "empty"));
      }
    }

    const g = readJSON(`public/data/quran-glyphs/${s}.json`);
    if (!g) fail("glyphs", `quran-glyphs/${s}.json`, "file", "missing");
    else {
      if (g.length !== want) fail("glyphs", `quran-glyphs/${s}.json`, want, g.length, "ayah count");
      g.forEach((gv, i) => {
        const r = rv[i];
        if (gv.a !== i + 1) fail("glyphs", `${s}:${i + 1}`, i + 1, gv.a, "ayah number");
        if (!r) return;
        // A word whose code holds two glyphs (37:130 «إِلۡ يَاسِينَ») is two
        // timed words in the app (SPLIT_POSITIONS in fetch-qpc-v4.mjs).
        const rw = r.words
          .filter((w) => w.char_type_name === "word")
          .flatMap((w) =>
            SPLIT_POSITIONS.has(`${s}:${i + 1}:${w.position}`) ? w.code_v2.split(" ").map((code_v2) => ({ ...w, code_v2 })) : [w],
          );
        const end = r.words.find((w) => w.char_type_name === "end");
        if (gv.w.length !== rw.length) return fail("glyphs", `${s}:${i + 1}`, `${rw.length} words`, `${gv.w.length} words`);
        gv.w.forEach(([code, page], k) => {
          glyphWords++;
          if (code !== rw[k].code_v2 || page !== rw[k].page_number)
            fail("glyphs", `${s}:${i + 1} word ${k + 1}`, `${rw[k].code_v2} p${rw[k].page_number}`, `${code} p${page}`);
        });
        if (end && gv.e && (gv.e[0] !== end.code_v2 || gv.e[1] !== end.page_number))
          fail("glyphs", `${s}:${i + 1} end`, `${end.code_v2} p${end.page_number}`, `${gv.e[0]} p${gv.e[1]}`);
      });
    }
  }

  // ── Mushaf pages ──────────────────────────────────────────────────────
  const pageStart = new Map(); // page -> first [s, a]
  for (let s = 1; s <= 114; s++)
    for (const r of ref[s]) if (!pageStart.has(r.page_number)) pageStart.set(r.page_number, [s, r.verse_number]);
  if (MUSHAF_PAGE_COUNT !== 604 || MUSHAF_PAGE_STARTS.length !== 604) fail("mushaf-pages", "mushafPages.ts", 604, MUSHAF_PAGE_STARTS.length);
  for (let p = 1; p <= 604; p++) {
    const want = pageStart.get(p);
    const got = MUSHAF_PAGE_STARTS[p - 1];
    if (!want || !got || want[0] !== got[0] || want[1] !== got[1]) fail("mushaf-pages", `page ${p}`, want?.join(":"), got?.join(":"));
  }
  // ── Juz ───────────────────────────────────────────────────────────────
  const juzStart = {};
  for (let s = 1; s <= 114; s++)
    for (const r of ref[s]) if (!juzStart[r.juz_number]) juzStart[r.juz_number] = [s, r.verse_number];
  let juzAyahs = 0;
  for (let j = 1; j <= 30; j++) {
    const pairs = Q.getJuzAyahPairs(j);
    juzAyahs += pairs.length;
    const want = INDOPAK_JUZ[j] ?? juzStart[j];
    const got = pairs[0];
    if (!got || got[0] !== want[0] || got[1] !== want[1]) fail("juz", `Juz ${j} start`, want.join(":"), got?.join(":"));
    if (Q.QURAN_JUZ[j - 1]?.id !== j) fail("juz", `QURAN_JUZ #${j}`, j, Q.QURAN_JUZ[j - 1]?.id);
  }
  if (juzAyahs !== ayahs) fail("juz", "all Juz", `${ayahs} ayahs`, `${juzAyahs} ayahs`, "Juz ranges must cover the Quran exactly once");
  const homeSrc = fs.readFileSync(path.join(ROOT, "src/components/home/ImmersiveHomeClient.tsx"), "utf8");
  const m = homeSrc.match(/JUZ_START_SURAH[^{]*\{([^}]*)\}/);
  if (!m) fail("juz", "ImmersiveHomeClient JUZ_START_SURAH", "table", "not found");
  else {
    const table = Object.fromEntries([...m[1].matchAll(/(\d+):\s*(\d+)/g)].map((x) => [+x[1], +x[2]]));
    for (let j = 1; j <= 30; j++) {
      const want = Q.getJuzAyahPairs(j)[0][0];
      if (table[j] !== want) fail("juz", `JUZ_START_SURAH ${j}`, want, table[j]);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────
  const byCat = {};
  for (const f of failures) byCat[f.category] = (byCat[f.category] ?? 0) + 1;
  const summary = {
    surahs: chapters.length,
    ayahs,
    arabicTextChecked: textChecked,
    glyphWordsChecked: glyphWords,
    translationLanguages: ["en", "ta", ...transLangs],
    mushafPages: 604,
    juz: 30,
    failures: failures.length,
    failuresByCategory: byCat,
    englishNameSpellingVsQuranCom: nameDiffs.length,
  };
  fs.writeFileSync(OUT, JSON.stringify({ summary, failures, englishNameSpellingVsQuranCom: nameDiffs }, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  for (const f of failures.slice(0, 40)) console.log("FAIL", f.category, f.where, "expected:", f.expected, "actual:", f.actual, f.detail ?? "");
  if (failures.length > 40) console.log(`… ${failures.length - 40} more in ${path.relative(ROOT, OUT)}`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
