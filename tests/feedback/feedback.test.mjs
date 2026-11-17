/**
 * HuDa Web Quran — feedback lantern (src/lib/i18n/feedback.ts, the migration)
 *
 *   node --test tests/feedback/feedback.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const strings = require(path.join(ROOT, "src/lib/i18n/feedback.ts")).default;
const LANGS = ["ta", "ur", "ml", "hi", "id", "bn", "tr", "fr", "ms"];

test("every feedback label is translated into every app language", () => {
  for (const [key, tr] of Object.entries(strings)) {
    for (const l of LANGS) assert.ok(tr[l]?.trim(), `"${key}" has no ${l}`);
  }
});

test("the form's own words are all in the dictionary", () => {
  const used = ["components/feedback/FeedbackSheet.tsx", "components/feedback/FeedbackLantern.tsx", "lib/feedback.ts"]
    .map((f) => fs.readFileSync(path.join(ROOT, "src", f), "utf8"))
    .join("\n");
  const keys = [...used.matchAll(/t\(lang, "([^"]+)"/g)].map((m) => m[1]);
  const kinds = [...used.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
  // "Feedback" and "Send" are shared with other areas (pickers / player).
  const elsewhere = new Set(["Feedback", "Send"]);
  for (const k of [...keys, ...kinds]) if (!elsewhere.has(k)) assert.ok(strings[k], `"${k}" missing from i18n/feedback.ts`);
});

test("the public can only send: no table grants, upload only to a handed-out path", () => {
  const sql = fs.readFileSync(path.join(ROOT, "supabase/migrations/20261115121000_feedback.sql"), "utf8");
  assert.match(sql, /revoke all on public\.feedback from anon, authenticated;/);
  assert.match(sql, /alter table public\.feedback enable row level security;/);
  assert.doesNotMatch(sql, /grant [^;]* on public\.feedback /i);
  assert.match(sql, /for insert to anon, authenticated\s+with check \(bucket_id = 'feedback-screenshots' and public\.feedback_upload_allowed\(name\)\)/);
  // Reading / deleting screenshots and listing feedback: admins only.
  assert.match(sql, /for select to authenticated\s+using \(bucket_id = 'feedback-screenshots' and public\.is_admin\(\)\)/);
  assert.match(sql, /revoke all on function public\.admin_list_feedback\(text, int\) from public, anon;/);
  assert.match(sql, /'feedback-screenshots', false, 1572864/);
});

// The lantern's rope (src/lib/feedbackRope.ts), with the phone layout's numbers.
const R = require(path.join(ROOT, "src/lib/feedbackRope.ts"));
const G = { ax: 347, ay: 58, len: 88 };
const hook = (a) => [G.ax + G.len * Math.sin(a), G.ay + G.len * Math.cos(a)];
const links = R.ROPE_POINTS - 1;
function settled(a) {
  const p = R.createRope();
  R.layStraight(p, G.ax, G.ay, ...hook(a));
  for (let i = 0; i < 200; i++) R.stepRope(p, G.ax, G.ay, ...hook(a), R.ropeLength(G.len, 0) / links, 1 / 60);
  return p;
}
const ropeLen = (p) => {
  let L = 0;
  for (let o = 0; o < p.length - 4; o += 4) L += Math.hypot(p[o + 4] - p[o], p[o + 5] - p[o + 1]);
  return L;
};

test("rope: hangs nearly straight when still, pinned at both ends", () => {
  const p = settled(0.37);
  // Straight (under 1 px off) and the lantern in line with it.
  assert.ok(Math.abs(R.endTilt(p, 0) - 0.37) < 0.02);
  assert.ok(R.ropeBend(p) < 1, `bend ${R.ropeBend(p)}`);
  assert.deepEqual([p[0], p[1]], [G.ax, G.ay]);
  const [hx, hy] = hook(0.37);
  assert.ok(Math.abs(p[p.length - 4] - hx) < 1e-9 && Math.abs(p[p.length - 3] - hy) < 1e-9);
});

test("rope: bows and ripples while it swings, and never stretches far", () => {
  const p = settled(0.37);
  let prev = 0.37;
  let maxBend = 0;
  let maxLen = 0;
  for (let f = 0; f < 60 * 6; f++) {
    const s = f / 60;
    const a = (0.2 + 0.17 * Math.exp(-s / 2.5)) * Math.cos((2 * Math.PI * s) / 1.9);
    R.stepRope(p, G.ax, G.ay, ...hook(a), R.ropeLength(G.len, (a - prev) * 60) / links, 1 / 60, R.ropeTension((a - prev) * 60));
    prev = a;
    maxBend = Math.max(maxBend, R.ropeBend(p));
    maxLen = Math.max(maxLen, ropeLen(p));
  }
  assert.ok(maxBend > 6, `max bend ${maxBend}`);
  assert.ok(maxLen < G.len * 1.1, `rope ${maxLen} for ${G.len}`);
  assert.ok(Number.isFinite(R.endTilt(p)) && Math.abs(R.endTilt(p)) < 1);
  assert.match(R.ropePath(p), /^M [\d.]+ [\d.]+( Q [\d. ]+)+ L [\d.]+ [\d.]+$/);
});
