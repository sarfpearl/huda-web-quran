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

// The lantern's swing and thread (src/lib/feedbackPendulum.ts, src/lib/feedbackRope.ts).
const R = require(path.join(ROOT, "src/lib/feedbackRope.ts"));
const P = require(path.join(ROOT, "src/lib/feedbackPendulum.ts"));
const G = { ax: 347, ay: 58, len: 88 };
const hook = (a, give = 0) => [G.ax + (G.len + give) * Math.sin(a), G.ay + (G.len + give) * Math.cos(a)];
/** Let go from the side with the push the lantern gets. */
function letGo(seconds) {
  let s = { ...P.drop({ theta: 0.37, omega: 0 }), omega: -2.2 };
  const frames = [];
  for (let f = 0; f < seconds * 60; f++) frames.push((s = P.stepSwing(s, 1 / 60)));
  return frames;
}

test("thread: straight when the lantern hangs still, one curve as it swings", () => {
  const still = R.ropeCurve(G.ax, G.ay, ...hook(0), 0);
  assert.equal(still.bend, 0);
  assert.ok(Math.abs(still.endAngle) < 1e-9);
  // One quadratic curve: a single bend, never ripples.
  assert.match(R.ropeCurve(G.ax, G.ay, ...hook(0.5), 0.5).d, /^M [\d.]+ [\d.]+ Q [\d.]+ [\d.]+ [\d.]+ [\d.]+$/);
});

test("thread: bends to the right swinging right, to the left swinging left", () => {
  const right = R.ropeCurve(G.ax, G.ay, ...hook(0.5), 0.5);
  const left = R.ropeCurve(G.ax, G.ay, ...hook(-0.5), -0.5);
  assert.ok(right.bend > 4 && left.bend < -4, `right ${right.bend}, left ${left.bend}`);
  // The curve's middle lies to that side of the straight line.
  const mid = (d) => d.match(/Q ([\d.]+)/)[1];
  assert.ok(+mid(right.d) > (G.ax + hook(0.5)[0]) / 2);
  assert.ok(+mid(left.d) < (G.ax + hook(-0.5)[0]) / 2);
  // A light bend, however hard it is flung or slack.
  assert.ok(Math.abs(R.ropeCurve(G.ax, G.ay, ...hook(1.4), 1.4, 40).bend) <= R.ROPE_MAX_BEND_PX);
});

test("swing: let go, it swings wide across (about 40°) and dies down over a few swings", () => {
  const frames = letGo(10);
  const first = Math.min(...frames.slice(0, 70).map((f) => f.theta));
  assert.ok(first < -0.55, `first swing reached ${first}`);
  // Back to the right after.
  assert.ok(Math.max(...frames.slice(60, 140).map((f) => f.theta)) > 0.3);
  const late = Math.max(...frames.slice(-120).map((f) => Math.abs(f.theta)));
  assert.ok(late < 0.15, `still swinging ${late} after 8 s`);
});

test("swing: keeps a faint sway while out, comes to rest without the breeze", () => {
  let s = { theta: 0.4, omega: 0 };
  const out = [];
  for (let f = 0; f < 60 * 30; f++) out.push((s = P.stepSwing(s, 1 / 60)).theta);
  const sway = Math.max(...out.slice(-200).map(Math.abs));
  assert.ok(sway > P.MIN_SWAY_RAD * 0.7 && sway < 0.15, `sway ${sway}`);
  s = { theta: 0.4, omega: 0 };
  const still = [];
  for (let f = 0; f < 60 * 30; f++) still.push((s = P.stepSwing(s, 1 / 60, false)).theta);
  assert.ok(Math.max(...still.slice(-200).map(Math.abs)) < 0.02);
});

test("swing: a hard fling is capped and still settles", () => {
  let s = { theta: 0, omega: 50 };
  const seen = [];
  for (let f = 0; f < 60 * 20; f++) seen.push((s = P.stepSwing(s, 1 / 60)).theta);
  assert.ok(Number.isFinite(s.theta) && Math.abs(s.omega) <= P.MAX_SPEED);
  assert.ok(Math.max(...seen.slice(-200).map(Math.abs)) < 0.2);
});

test("swing: let go, it jumps on its springy thread a few times and settles", () => {
  const give = letGo(3).map((f) => f.stretch);
  assert.ok(Math.max(...give) > 8 && Math.max(...give) <= P.MAX_STRETCH, `peak ${Math.max(...give)}`);
  assert.ok(Math.min(...give.slice(10, 60)) < 0);
  assert.ok(Math.abs(give.at(-1)) < 0.5, `still ${give.at(-1)}`);
});
