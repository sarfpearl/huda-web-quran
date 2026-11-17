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

// The swing once it is let go (src/lib/feedbackSwing.ts).
const W = require(path.join(ROOT, "src/lib/feedbackSwing.ts"));
const run = (from, seconds) => Array.from({ length: seconds * 60 }, (_, f) => W.swingAngle(f / 60, from));

test("swing: let go from the right, it goes left, back right, left again, each smaller", () => {
  const a = run(0.4, 6);
  const at = (s) => a[Math.round(s * 60)];
  assert.ok(Math.abs(at(0) - 0.4) < 1e-9, "starts where it was tucked");
  assert.ok(at(W.SWING_PERIOD_S / 2) < -0.2, `left ${at(1)}`);
  assert.ok(at(W.SWING_PERIOD_S) > 0.15, `back right ${at(2)}`);
  assert.ok(at(W.SWING_PERIOD_S * 1.5) < 0);
  assert.ok(Math.abs(at(W.SWING_PERIOD_S * 1.5)) < Math.abs(at(W.SWING_PERIOD_S / 2)));
});

test("swing: keeps a gentle sway and never stops while out", () => {
  const late = run(0.4, 30).slice(-200).map(Math.abs);
  const sway = Math.max(...late);
  assert.ok(sway > W.SWING_SWAY_RAD * 0.9 && sway < W.SWING_SWAY_RAD * 1.1, `sway ${sway}`);
});

test("thread: straight when hanging right below, one soft bend to a side", () => {
  assert.match(W.threadPath(100, 50, 100, 120), /^M 100\.0 50\.0 C 100\.0 85\.0, 100\.0 81\.5, 100\.0 120\.0$/);
  // To the left: it leaves the anchor heading down and meets the hook from above.
  const d = W.threadPath(100, 50, 60, 110).match(/[\d.]+/g).map(Number);
  assert.deepEqual([d[2], d[4]], [100, 60]);
});
