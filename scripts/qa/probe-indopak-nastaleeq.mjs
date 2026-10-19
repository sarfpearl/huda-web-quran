#!/usr/bin/env node
/**
 * Where the API serves `text_indopak_nastaleeq` (QuranWBW, 2026-10-19), and
 * whether its sukun is U+0652 — one ayah (2:6), printed for the owner to send.
 * Usage: node scripts/qa/probe-indopak-nastaleeq.mjs
 */
const KEY = "2:6";
const urls = [
  `https://api.quran.com/api/v4/verses/by_key/${KEY}?words=true&word_fields=text_indopak_nastaleeq,text_indopak`,
  `https://api.quran.com/api/v4/verses/by_key/${KEY}?fields=text_indopak_nastaleeq,text_indopak`,
  `https://api.quran.com/api/v4/quran/verses/indopak_nastaleeq?verse_key=${KEY}`,
  `https://api.quran.com/api/v4/quran/verses/indopak?verse_key=${KEY}`,
  `https://apis.quran.foundation/content/api/v4/verses/by_key/${KEY}?words=true&word_fields=text_indopak_nastaleeq`,
];
const marks = (t) =>
  `U+06E1×${(t.match(/ۡ/g) ?? []).length} U+0652×${(t.match(/ْ/g) ?? []).length}`;
for (const url of urls) {
  console.log("\n" + url.replace(/^https:\/\//, ""));
  try {
    const res = await fetch(url);
    console.log("  HTTP", res.status);
    if (!res.ok) continue;
    const j = await res.json();
    const v = j.verse ?? j.verses?.[0];
    if (!v) { console.log("  keys:", Object.keys(j).join(", ")); continue; }
    for (const [k, t] of Object.entries(v)) if (k.startsWith("text_")) console.log(`  verse.${k}: ${marks(t)}  ${t.slice(0, 40)}`);
    const w = v.words?.[0];
    if (w) {
      console.log("  word keys:", Object.keys(w).join(", "));
      const all = (f) => v.words.map((x) => x[f] ?? "").join(" ");
      for (const f of ["text_indopak_nastaleeq", "text_indopak"]) if (f in w) console.log(`  words.${f}: ${marks(all(f))}`);
    }
  } catch (e) {
    console.log("  error:", e.message);
  }
}
