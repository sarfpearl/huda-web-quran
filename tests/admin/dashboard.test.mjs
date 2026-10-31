/**
 * HuDa Web Quran — morning dashboard view model (src/lib/dashboard.ts)
 *
 * The fixture has the shape scripts/collect-dashboard.mjs really writes (checked
 * against its output); nothing here ships in the app.
 *
 *   node --test tests/admin/dashboard.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const { buildDashboard, compact, formatIST } = require(path.join(ROOT, "src/lib/dashboard.ts"));

const NOW = Date.parse("2026-10-31T03:00:00Z"); // 08:30 IST
const ok = (o = {}) => ({ status: "ok", ...o });

const fixture = () => ({
  generatedAt: "2026-10-31T02:31:00.000Z",
  generatedAtIST: "2026-10-31T08:01:00.000+05:30",
  github: {
    issues: ok({ count: 1, items: [{ number: 12, title: "Bug", url: "https://github.com/o/r/issues/12", updatedAt: "2026-10-29T10:00:00Z" }] }),
    pulls: ok({ count: 1, items: [] }),
    wipBranches: ok({ count: 1, items: [{ name: "wip/audio", unmergedCommits: 3, lastCommitAt: "2026-10-28T10:00:00+05:30" }] }),
    staleBranches: ok({ thresholdDays: 30, count: 1, items: [{ name: "old/x", lastCommitAt: "2026-08-01T10:00:00+05:30", daysOld: 90, mergedIntoMain: false }] }),
  },
  checks: ok({
    build: { status: "skipped", reason: "skipped (env தேவை)", seconds: 5, logTail: "Missing NEXT_PUBLIC_X" },
    lint: { status: "pass", seconds: 12 },
    test: { status: "fail", seconds: 6, files: 4, failingTests: ["a is marked", "b follows"], failingTestsTotal: 2, logTail: "not ok 3 - a is marked" },
  }),
  audit: ok({ critical: 1, high: 3, moderate: 1, low: 0, total: 5 }),
  todo: ok({ count: 2, items: [{ number: 2, title: "Check sets", section: "To-do", group: "Next tasks", line: 79 }, { number: null, title: "Phase 8B", section: "To-do", group: "Open items", line: 22 }] }),
  inProgress: ok({ count: 1, items: [{ number: 4, title: "Audio reliability", section: "In progress", group: "P0", line: 274 }] }),
  knownIssues: ok({ count: 0, items: [], note: "docs/TODO.md-ல் Known issues பிரிவு இல்லை" }),
  notLive: ok({
    count: 2,
    squashMerged: 3,
    items: [
      { name: "feat/x", kind: "pr", pr: { number: 9, title: "X", url: "https://github.com/o/r/pull/9", draft: false }, lastCommitAt: "2026-10-30T10:00:00+05:30", commitsAhead: 4 },
      { name: "demo/y", kind: "branch", lastCommitAt: "2026-10-26T10:00:00+05:30", commitsAhead: 19 },
    ],
  }),
  localOnly: { stashes: true, note: "Stashes cloud-ல் தெரியாது; local machine-ல் மட்டும் (git stash list)" },
  analytics: ok({
    last24h: ok({ pageviews: 39, visitors: 2 }),
    last7d: ok({ pageviews: 120, visitors: 9 }),
    topPages: ok({ windowDays: 7, items: [{ path: "/", pageviews: 30, visitors: 2 }, { path: "/surah/36", pageviews: 5, visitors: 1 }] }),
    daily: ok({ basis: "UTC calendar days", items: Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-${25 + i}`, pageviews: i * 3, visitors: i })) }),
  }),
  supabase: ok({
    stats: {
      unique_viewers: 1500,
      unique_viewers_24h: 40,
      live_listeners: 3,
      top_surah: [{ id: 36, listeners: 20, seconds: 6000 }, { id: 1, listeners: 10, seconds: 600 }],
      top_juz: [{ id: 30, listeners: 8, seconds: 1200 }],
      likes_24h: { content: 4, comments: 1 },
      comments_24h: 6,
      comments_hidden_total: 2,
      moderation_pending: "unavailable",
    },
  }),
});

const byId = (m, id) => m.cards.find((c) => c.id === id);
const label = (k, id) => `${k}#${id}`;

test("twelve cards in the asked order, numbers first", () => {
  const m = buildDashboard(fixture(), { now: NOW, label });
  assert.deepEqual(
    m.cards.map((c) => c.id),
    ["issues", "uncommitted", "todo", "inprogress", "notlive", "checks", "security", "traffic", "live", "listeners", "top", "engagement"],
  );
  assert.equal(byId(m, "issues").value, "0");
  assert.equal(byId(m, "uncommitted").value, "1");
  assert.equal(byId(m, "todo").value, "2");
  assert.equal(byId(m, "inprogress").value, "1");
  assert.equal(byId(m, "notlive").value, "2");
  assert.equal(byId(m, "security").value, "4"); // critical 1 + high 3
  assert.equal(byId(m, "live").value, "3");
  assert.equal(byId(m, "listeners").value, "1,500");
  assert.equal(byId(m, "engagement").value, "6");
  assert.ok(m.cards.every((c) => c.status === "ok"));
});

test("updated label is IST, and a snapshot older than 26 h is stale", () => {
  assert.match(buildDashboard(fixture(), { now: NOW }).updatedLabel, /31 Oct, 08:01 IST/);
  assert.equal(buildDashboard(fixture(), { now: NOW }).stale, false);
  assert.equal(buildDashboard(fixture(), { now: Date.parse("2026-11-01T05:00:00Z") }).stale, true); // 26.5 h
  assert.equal(buildDashboard(fixture(), { now: Date.parse("2026-11-01T04:00:00Z") }).stale, false); // 25.5 h
  assert.equal(formatIST("not a date"), "—");
});

test("the local-only note rides on the Uncommitted card", () => {
  const c = byId(buildDashboard(fixture(), { now: NOW }), "uncommitted");
  assert.match(c.lines[0], /cloud-ல் தெரியாது/);
  assert.match(c.detail[0].text, /local machine-ல் மட்டும்/); // the full note is in the detail
  assert.equal(c.detail[1].items[0].primary, "wip/audio");
  assert.match(c.detail[1].items[0].secondary, /3 commits/);
});

test("checks: build skipped, lint pass, test fail with the failing names", () => {
  const c = byId(buildDashboard(fixture(), { now: NOW }), "checks");
  assert.deepEqual(c.checks.map((x) => x.state), ["skipped", "pass", "fail"]);
  assert.equal(c.tone, "bad");
  const names = c.detail.find((b) => b.kind === "list" && /தோல்வி/.test(b.title));
  assert.deepEqual(names.items.map((i) => i.primary), ["a is marked", "b follows"]);
  assert.ok(c.detail.some((b) => b.kind === "pre" && /Build log/.test(b.title)));
});

test("not live: PR links, commitsAhead, squash note", () => {
  const c = byId(buildDashboard(fixture(), { now: NOW }), "notlive");
  assert.equal(c.detail[0].items[0].href, "https://github.com/o/r/pull/9");
  assert.match(c.detail[0].items[0].secondary, /4 commits/);
  assert.match(c.detail[0].items[1].secondary, /19 commits/);
  assert.match(c.detail[1].text, /3/);
});

test("traffic card: four numbers, 7 bars, top pages, trend only with 2+ snapshots", () => {
  const c = byId(buildDashboard(fixture(), { now: NOW }), "traffic");
  assert.equal(c.wide, true);
  assert.equal(c.bars.length, 7);
  assert.match(c.lines[0], /2 visitors · 39 views/);
  assert.ok(c.detail.some((b) => b.kind === "list" && b.items[0].primary === "/"));
  assert.ok(!c.detail.some((b) => b.kind === "trend"));
  const trend = [
    { created_at: "2026-10-31T02:30:00Z", pageviews: 39, visitors: 2, listeners: 1500 },
    { created_at: "2026-10-30T02:30:00Z", pageviews: 20, visitors: 1, listeners: 1400 },
  ];
  const t = byId(buildDashboard(fixture(), { now: NOW, trend }), "traffic").detail.find((b) => b.kind === "trend");
  assert.deepEqual(t.points.map((p) => p.value), [20, 39]); // oldest first
});

test("top Surah / Juz use the label function", () => {
  const c = byId(buildDashboard(fixture(), { now: NOW, label }), "top");
  assert.equal(c.value, "surah#36");
  assert.match(c.lines[0], /juz#30/);
});

test("an unavailable section only blanks its own card, with the reason in the detail", () => {
  const p = fixture();
  p.analytics = { status: "unavailable", reason: "analytics environment: HTTP 403 — Not authorized" };
  p.supabase = { status: "unavailable", reason: "dashboard_stats refused: forbidden" };
  const m = buildDashboard(p, { now: NOW });
  for (const id of ["traffic", "live", "listeners", "top", "engagement"]) {
    assert.equal(byId(m, id).status, "unavailable", id);
    assert.match(byId(m, id).detail[0].text, /காரணம்/);
  }
  assert.match(byId(m, "traffic").reason, /403/);
  assert.match(byId(m, "live").reason, /forbidden/);
  for (const id of ["issues", "todo", "checks", "security", "notlive"]) assert.equal(byId(m, id).status, "ok", id);
});

test("one failed analytics part keeps the card, flagged", () => {
  const p = fixture();
  p.analytics.daily = { status: "unavailable", reason: "boom" };
  const c = byId(buildDashboard(p, { now: NOW }), "traffic");
  assert.equal(c.status, "ok");
  assert.equal(c.bars, undefined);
  assert.equal(c.tone, "warn");
  assert.ok(c.detail.some((b) => b.kind === "text" && /boom/.test(b.text)));
});

test("a missing section, a missing payload and a fatal snapshot never throw", () => {
  const p = fixture();
  delete p.audit;
  delete p.github;
  assert.equal(byId(buildDashboard(p, { now: NOW }), "security").status, "unavailable");
  assert.equal(byId(buildDashboard(p, { now: NOW }), "uncommitted").status, "unavailable");
  const empty = buildDashboard(null, { now: NOW });
  assert.equal(empty.cards.length, 12);
  assert.ok(empty.cards.every((c) => c.status === "unavailable"));
  assert.equal(empty.stale, false);
  assert.equal(buildDashboard({ generatedAt: "2026-10-31T02:00:00Z", fatal: "crashed" }, { now: NOW }).fatal, "crashed");
});

test("compact numbers", () => {
  assert.equal(compact(0), "0");
  assert.equal(compact(1500), "1,500");
  assert.equal(compact(12_300), "12.3k");
  assert.equal(compact(250_000), "250k");
  assert.equal(compact(null), "—");
});
