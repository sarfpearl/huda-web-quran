#!/usr/bin/env node
/**
 * Has Quran.com's text_indopak_nastaleeq changed since we last fetched it?
 * Compares the API's verse text with the copy the app's IndoPak words were
 * made from (scripts/generation/fixtures/indopak-nastaleeq). Changes nothing:
 * it reports, and the weekly workflow (.github/workflows/indopak-text-check.yml)
 * opens an issue. To take a change: dump-indopak-nastaleeq.mjs, then
 * fetch-indopak-words.mjs, and review what it lists.
 *
 * Writes the report to the path given (default: stdout only); exit code 0
 * either way, 1 only when the API can't be read.
 * Usage: node scripts/qa/check-indopak-nastaleeq.mjs [report.md]
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAW = resolve(dirname(fileURLToPath(import.meta.url)), "../generation/fixtures/indopak-nastaleeq");

async function get(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) return res.json();
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`failed: ${url}`);
}

const changed = [];
for (let n = 1; n <= 114; n++) {
  const live = await get(`https://api.quran.com/api/v4/quran/verses/indopak_nastaleeq?chapter_number=${n}`);
  const ours = JSON.parse(await readFile(resolve(RAW, `${n}.json`), "utf8"));
  const was = new Map(ours.verses.map((v) => [v.verse_key, v.text_indopak_nastaleeq]));
  for (const v of live.verses) {
    if (was.get(v.verse_key) !== v.text_indopak_nastaleeq) changed.push({ key: v.verse_key, was: was.get(v.verse_key), now: v.text_indopak_nastaleeq });
    was.delete(v.verse_key);
  }
  for (const key of was.keys()) changed.push({ key, was: was.get(key), now: undefined });
}

const lines = changed.length
  ? [
      `Quran.com's \`text_indopak_nastaleeq\` differs from our copy in **${changed.length}** verse(s).`,
      "",
      "To take the change: `node scripts/generation/dump-indopak-nastaleeq.mjs`, then",
      "`node scripts/generation/fetch-indopak-words.mjs <previous public/data/quran-indopak>` —",
      "review the words it lists, then commit both.",
      "",
      ...changed.slice(0, 50).flatMap(({ key, was, now }) => [`**${key}**`, `- was: ${was ?? "(none)"}`, `- now: ${now ?? "(none)"}`, ""]),
      changed.length > 50 ? `… and ${changed.length - 50} more.` : "",
    ]
  : ["No change: Quran.com's text_indopak_nastaleeq matches our copy."];
const report = lines.join("\n");
console.log(report);
if (process.argv[2]) await writeFile(process.argv[2], report);
if (process.env.GITHUB_OUTPUT) await writeFile(process.env.GITHUB_OUTPUT, `changed=${changed.length}\n`, { flag: "a" });
