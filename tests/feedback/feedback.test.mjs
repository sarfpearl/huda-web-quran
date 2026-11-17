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

// The lantern's rope and swing (src/lib/feedbackRope.ts, src/lib/feedbackPendulum.ts),
// with the phone layout's numbers.
const R = require(path.join(ROOT, "src/lib/feedbackRope.ts"));
const P = require(path.join(ROOT, "src/lib/feedbackPendulum.ts"));
const G = { ax: 347, ay: 58, len: 88 };
const hook = (a, give = 0) => [G.ax + (G.len + give) * Math.sin(a), G.ay + (G.len + give) * Math.cos(a)];
const links = R.ROPE_POINTS - 1;
const ropeStep = (p, s, held = false) => {
  const loose = held ? 0 : R.ropeLooseness(P.swingTension(s));
  return R.stepRope(p, G.ax, G.ay, ...hook(s.theta, s.stretch ?? 0), R.ropeLength(G.len, loose) / links, 1 / 60, R.ropePull(loose));
};
function settled(a) {
  const p = R.createRope();
  R.layStraight(p, G.ax, G.ay, ...hook(a));
  for (let i = 0; i < 200; i++) ropeStep(p, { theta: a, omega: 0 }, true);
  return p;
}
/** Let go from the side with the push the lantern gets; frames of the swing and rope. */
function letGo(seconds) {
  const p = settled(0.37);
  let s = { ...P.drop({ theta: 0.37, omega: 0 }), omega: -2.2 };
  const frames = [];
  for (let f = 0; f < seconds * 60; f++) {
    s = P.stepSwing(s, 1 / 60);
    ropeStep(p, s);
    frames.push({ ...s, bend: R.ropeBend(p), tension: P.swingTension(s) });
  }
  return { p, s, frames };
}

test("rope: hangs straight when held still, pinned at both ends", () => {
  const p = settled(0.37);
  assert.ok(R.ropeBend(p) < 1, `bend ${R.ropeBend(p)}`);
  assert.ok(Math.abs(R.endTilt(p, 0) - 0.37) < 0.02);
  assert.deepEqual([p[0], p[1]], [G.ax, G.ay]);
  const [hx, hy] = hook(0.37);
  assert.ok(Math.abs(p[p.length - 4] - hx) < 1e-9 && Math.abs(p[p.length - 3] - hy) < 1e-9);
});

test("swing: let go, it swings wide across (about 40°) and dies down over a few swings", () => {
  const { frames } = letGo(10);
  const first = Math.min(...frames.slice(0, 70).map((f) => f.theta));
  assert.ok(first < -0.55, `first swing reached ${first}`);
  const late = Math.max(...frames.slice(-120).map((f) => Math.abs(f.theta)));
  assert.ok(late < 0.15, `still swinging ${late} after 8 s`);
});

test("rope: taut through the bottom of a swing, sagging into a curve at its ends", () => {
  const { frames } = letGo(4);
  // Ends of a wide swing (slow, up high) vs the bottom (fast).
  const ends = frames.filter((f) => Math.abs(f.theta) > 0.4 && Math.abs(f.omega) < 0.4);
  const bottom = frames.filter((f) => Math.abs(f.theta) < 0.08 && frames.indexOf(f) > 20);
  assert.ok(ends.length && bottom.length);
  const avg = (xs) => xs.reduce((a, f) => a + f.bend, 0) / xs.length;
  assert.ok(avg(ends) > 3, `sag at the ends ${avg(ends)}`);
  assert.ok(avg(bottom) < avg(ends), `bottom ${avg(bottom)} vs ends ${avg(ends)}`);
  assert.match(R.ropePath(frames.length ? settled(0) : settled(0)), /^M [\d.]+ [\d.]+( Q [\d. ]+)+ L [\d.]+ [\d.]+$/);
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

test("swing: let go, it jumps on its springy thread and the rope goes slack on the way up", () => {
  const { frames } = letGo(3);
  const give = frames.map((f) => f.stretch);
  assert.ok(Math.max(...give) > 8 && Math.max(...give) <= P.MAX_STRETCH, `peak ${Math.max(...give)}`);
  assert.ok(Math.min(...give.slice(10, 60)) < 0);
  assert.ok(Math.abs(give.at(-1)) < 0.5, `still ${give.at(-1)}`);
  // A plain drop (no swing): bouncing up, the weight is off the thread.
  let d = P.drop({ theta: 0, omega: 0 });
  const rising = [];
  for (let f = 0; f < 60; f++) {
    d = P.stepSwing(d, 1 / 60, false);
    if (d.stretchV < -60) rising.push(R.ropeLooseness(P.swingTension(d)));
  }
  assert.ok(rising.length && rising.every((l) => l > 0.3), `looseness ${rising}`);
});
