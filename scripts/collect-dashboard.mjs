#!/usr/bin/env node
/**
 * Morning dashboard collector.
 *
 *   node scripts/collect-dashboard.mjs [out.json]
 *
 * Gathers repo health into one JSON file. Every section is independent: if one
 * fails it is marked { status: "unavailable", reason } and the rest carry on.
 * The script never fails the workflow because a check failed — the result is
 * data, shown on the dashboard.
 *
 * Needs: GITHUB_TOKEN, GITHUB_REPOSITORY (set by Actions); a full git clone
 * (fetch-depth 0) and `npm ci` already run. Node built-ins only.
 * Optional, each section is "unavailable" without its variables:
 *   VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID  → analytics
 *   SUPABASE_URL, SUPABASE_ANON_KEY, DASH_SECRET     → supabase + saving the snapshot
 * None of these reaches the build / lint / test child processes, the log or
 * the JSON (see `redact`, `SECRET_ENV`).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] || "dashboard.json";
const TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = process.env.GITHUB_REPOSITORY || "";
const STALE_DAYS = 30;
const MAIN = "origin/main";

const SECRET_ENV = [
  "GITHUB_TOKEN",
  "VERCEL_TOKEN",
  "VERCEL_PROJECT_ID",
  "VERCEL_TEAM_ID",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "DASH_SECRET",
];

const redact = (s) => {
  let out = String(s);
  for (const name of SECRET_ENV) {
    const v = process.env[name];
    if (v && v.length >= 4) out = out.split(v).join("***");
  }
  return out;
};

// "fetch failed" alone says nothing: add undici's err.cause (code + message).
const describe = (e) => {
  const c = e?.cause;
  const cause = c ? ` (cause: ${[c.code, c.message].filter(Boolean).join(" ")})` : "";
  return redact(`${e?.message || e}${cause}`).slice(0, 300);
};

const section = async (fn) => {
  try {
    return { status: "ok", ...(await fn()) };
  } catch (e) {
    return { status: "unavailable", reason: describe(e) };
  }
};

const run = (cmd, args, { env = {}, timeoutMs = 15 * 60_000 } = {}) => {
  const t0 = Date.now();
  const childEnv = { ...process.env, ...env };
  for (const name of SECRET_ENV) delete childEnv[name]; // build/lint/test never see them
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    env: childEnv,
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutMs,
  });
  return {
    code: r.status,
    out: redact(`${r.stdout || ""}${r.stderr || ""}`),
    error: r.error ? redact(r.error.message) : null,
    seconds: Math.round((Date.now() - t0) / 1000),
  };
};

const git = (...args) => {
  const r = run("git", args);
  if (r.code !== 0) throw new Error(`git ${args[0]} failed`);
  return r.out.trim();
};

// ── HTTP (GitHub, Vercel, Supabase) ──────────────────────────────────────────
// One request, one retry on a network error / 5xx / 429 (a socket kept alive
// from an earlier call can be dead by the time a later section reuses it).
// errorBody: add the API's own error message (PostgREST / Vercel) to the error.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const apiMessage = (text) => {
  try {
    const j = JSON.parse(text);
    return String(j?.message ?? j?.error?.message ?? j?.error ?? text);
  } catch {
    return text;
  }
};

async function httpJson(url, init, label, { errorBody = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.ok) return await res.json();
      if (attempt === 1 && (res.status >= 500 || res.status === 429)) {
        await sleep(1500);
        continue;
      }
      const detail = errorBody ? ` — ${apiMessage(await res.text()).slice(0, 200)}` : "";
      throw new Error(`${label}: HTTP ${res.status}${detail}`);
    } catch (e) {
      if (String(e?.message).startsWith(`${label}: HTTP`)) throw e;
      if (attempt === 1) {
        await sleep(1500);
        continue;
      }
      e.message = `${label}: ${e.message}`;
      throw e;
    }
  }
}

const GH_API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");

async function ghGet(url, label) {
  const res = await httpJson(
    url,
    {
      headers: {
        authorization: `Bearer ${TOKEN}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    },
    label,
  ).catch((e) => {
    // keep the original GitHub message format
    const m = String(e?.message).match(/^(.*): HTTP (\d+)$/);
    if (m) throw new Error(`GitHub API ${m[2]} for ${m[1]}`);
    throw e;
  });
  return res;
}

async function ghList(path) {
  if (!TOKEN || !REPO) throw new Error("GITHUB_TOKEN / GITHUB_REPOSITORY missing");
  const items = [];
  for (let page = 1; page <= 5; page++) {
    const label = path.split("?")[0];
    const batch = await ghGet(
      `${GH_API}/repos/${REPO}/${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      label,
    );
    items.push(...batch);
    if (batch.length < 100) break;
  }
  return items;
}

const brief = (i) => ({ number: i.number, title: i.title, url: i.html_url, updatedAt: i.updated_at });

const issues = () =>
  section(async () => {
    const all = (await ghList("issues?state=open")).filter((i) => !i.pull_request);
    return { count: all.length, items: all.map(brief) };
  });

const pulls = () =>
  section(async () => {
    const all = await ghList("pulls?state=open");
    return { count: all.length, items: all.map((p) => ({ ...brief(p), draft: p.draft, branch: p.head?.ref })) };
  });

// ── Branches (from the local clone) ──────────────────────────────────────────
const remoteBranches = () => {
  const raw = git(
    "for-each-ref",
    "--format=%(refname)|%(committerdate:iso-strict)",
    "refs/remotes/origin",
  );
  return raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [ref, date] = l.split("|");
      return { name: ref.replace(/^refs\/remotes\/origin\//, ""), date };
    })
    .filter((b) => b.name !== "HEAD" && b.name !== "main");
};

const wipBranches = () =>
  section(async () => {
    const items = remoteBranches()
      .filter((b) => b.name.startsWith("wip/"))
      .map((b) => ({
        name: b.name,
        unmergedCommits: Number(git("rev-list", "--count", `${MAIN}..origin/${b.name}`)),
        lastCommitAt: b.date,
      }));
    return { count: items.length, items };
  });

const staleBranches = () =>
  section(async () => {
    const cutoff = Date.now() - STALE_DAYS * 86_400_000;
    const merged = new Set(
      git("branch", "-r", "--merged", MAIN)
        .split("\n")
        .map((s) => s.trim().replace(/^origin\//, "")),
    );
    const items = remoteBranches()
      .filter((b) => new Date(b.date).getTime() < cutoff)
      .map((b) => ({
        name: b.name,
        lastCommitAt: b.date,
        daysOld: Math.floor((Date.now() - new Date(b.date).getTime()) / 86_400_000),
        mergedIntoMain: merged.has(b.name),
      }))
      .sort((a, b) => b.daysOld - a.daysOld);
    return { thresholdDays: STALE_DAYS, count: items.length, items };
  });

// ── build / lint / test ──────────────────────────────────────────────────────
const tail = (s, n = 15) => s.trim().split("\n").slice(-n).join("\n");
const ENV_HINT = /NEXT_PUBLIC_|SUPABASE|(missing|undefined|required|not set)[^\n]{0,40}(env|environment|variable|key|url)|(env|environment) variable/i;

const result = (r, { envSensitive = false, failLines = null } = {}) => {
  if (r.error) return { status: "fail", reason: r.error, seconds: r.seconds };
  if (r.code === 0) return { status: "pass", seconds: r.seconds };
  if (envSensitive && ENV_HINT.test(r.out)) {
    return { status: "skipped", reason: "skipped (env தேவை)", seconds: r.seconds, logTail: tail(r.out) };
  }
  const log = failLines ? r.out.split("\n").filter((l) => failLines.test(l)).join("\n") || r.out : r.out;
  return { status: "fail", seconds: r.seconds, logTail: tail(log) };
};

// "not ok 3 - name" lines from node --test (TAP), de-duplicated, max 10.
const failingTestNames = (out) => {
  const names = [];
  for (const m of out.matchAll(/^\s*not ok \d+ - (.+?)(?:\s+#.*)?$/gm)) {
    if (!names.includes(m[1])) names.push(m[1]);
  }
  return { failingTests: names.slice(0, 10), failingTestsTotal: names.length };
};

const testFiles = () => {
  const found = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".test.mjs")) found.push(p);
    }
  };
  walk("tests");
  return found.sort();
};

const checks = () => {
  const build = result(run("npm", ["run", "build"], { env: { NEXT_TELEMETRY_DISABLED: "1" } }), {
    envSensitive: true,
  });
  const lint = result(run("npm", ["run", "lint"]));
  let test;
  try {
    const files = testFiles();
    if (files.length) {
      const r = run("node", ["--test", ...files]);
      test = { ...result(r, { failLines: /^\s*(not ok|error:)/ }), files: files.length };
      if (test.status === "fail") Object.assign(test, failingTestNames(r.out));
    } else test = { status: "skipped", reason: "skipped (tests இல்லை)" };
  } catch {
    test = { status: "skipped", reason: "skipped (tests இல்லை)" };
  }
  return { status: "ok", build, lint, test };
};

// ── npm audit ────────────────────────────────────────────────────────────────
const audit = () =>
  section(async () => {
    const r = run("npm", ["audit", "--json"], { timeoutMs: 5 * 60_000 });
    let json;
    try {
      json = JSON.parse(r.out.slice(r.out.indexOf("{")));
    } catch {
      throw new Error("npm audit gave no JSON");
    }
    if (json.error) throw new Error(json.error.summary || json.error.code || "npm audit error");
    const v = json.metadata?.vulnerabilities || {};
    return {
      critical: v.critical ?? 0,
      high: v.high ?? 0,
      moderate: v.moderate ?? 0,
      low: v.low ?? 0,
      total: v.total ?? 0,
    };
  });


// ── docs/TODO.md ─────────────────────────────────────────────────────────────
// Format (checked 2026-10-30): `- [ ] **title** …` or `N. [ ] **title** …`;
// marker " " = to-do, "~" = in progress, "x" = done (skipped). There is no
// "Known issues" section today: items under a heading matching /known issues/i,
// or marked `[!]`, would be picked up if one is added.
const TODO_PATH = "docs/TODO.md";
const ITEM = /^(?:\d+\.\s+|[-*]\s+)\[([ ~x!])\]\s+(.*)$/;

const parseTodo = () => {
  if (!existsSync(TODO_PATH)) throw new Error(`${TODO_PATH} not found`);
  const lines = readFileSync(TODO_PATH, "utf8").split("\n");
  const found = [];
  let heading = "";
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const text = cur.text.replace(/\s+/g, " ").trim();
    const bold = text.match(/\*\*(.+?)\*\*/);
    const rawTitle = (bold ? bold[1] : text).trim();
    const num = rawTitle.match(/^(\d+)\.\s+/) || cur.lead.match(/^(\d+)\./);
    const title = rawTitle.replace(/^\d+\.\s+/, "").replace(/[\s.:—-]+$/, "").slice(0, 160);
    found.push({
      number: num ? Number(num[1]) : null,
      title,
      marker: cur.marker,
      group: cur.group,
      line: cur.line,
    });
    cur = null;
  };
  lines.forEach((raw, i) => {
    const h = raw.match(/^#{2,4}\s+(.*)$/);
    if (h) {
      flush();
      heading = h[1].replace(/\*\*/g, "").trim();
      return;
    }
    const m = raw.match(ITEM);
    if (m && !/^\s/.test(raw)) {
      flush();
      cur = { marker: m[1], text: m[2], lead: raw, group: heading, line: i + 1 };
    } else if (cur && /^\s+\S/.test(raw)) cur.text += ` ${raw.trim()}`;
    else if (cur && raw.trim() === "") flush();
  });
  flush();
  return found;
};

const todoSections = () => {
  let all;
  try {
    all = parseTodo();
  } catch (e) {
    const bad = { status: "unavailable", reason: redact(e.message).slice(0, 300) };
    return { todo: bad, inProgress: bad, knownIssues: bad };
  }
  const pack = (section, pick, note) => {
    const items = all
      .filter(pick)
      .map(({ number, title, group, line }) => ({ number, title, section, group, line }));
    return { status: "ok", count: items.length, items, ...(note && !items.length ? { note } : {}) };
  };
  const isKnown = (i) => i.marker === "!" || (/known issues/i.test(i.group) && i.marker !== "x");
  return {
    todo: pack("To-do", (i) => i.marker === " " && !isKnown(i)),
    inProgress: pack("In progress", (i) => i.marker === "~" && !isKnown(i)),
    knownIssues: pack("Known issues", isKnown, `${TODO_PATH}-ல் Known issues பிரிவு இல்லை`),
  };
};

// ── Not live: every remote branch + open PR not merged into main ─────────────
const notLive = () =>
  section(async () => {
    const refs = new Map(remoteBranches().map((b) => [b.name, b.date]));
    const merged = new Set(
      git("branch", "-r", "--merged", MAIN)
        .split("\n")
        .map((s) => s.trim().replace(/^origin\//, "")),
    );
    const openPrs = await ghList("pulls?state=open");
    const prByBranch = new Map(openPrs.map((p) => [p.head?.ref, p]));

    // Squash/rebase-merged PRs leave their branch "unmerged" for ever; their
    // PR says merged, so they are live and left out (counted in squashMerged).
    let squashed = new Set();
    let squashCheck = "ok";
    try {
      const closed = await ghList("pulls?state=closed");
      squashed = new Set(closed.filter((p) => p.merged_at).map((p) => p.head?.ref));
    } catch {
      squashCheck = "unavailable";
    }

    const names = new Set([...refs.keys(), ...prByBranch.keys()].filter((n) => n && n !== "main"));
    const items = [];
    let squashMerged = 0;
    for (const name of names) {
      const pr = prByBranch.get(name);
      if (!pr && merged.has(name)) continue;
      if (!pr && squashed.has(name)) {
        squashMerged++;
        continue;
      }
      const has = refs.has(name);
      items.push({
        name,
        kind: pr ? "pr" : "branch",
        ...(pr ? { pr: { number: pr.number, title: pr.title, url: pr.html_url, draft: !!pr.draft } } : {}),
        lastCommitAt: has ? refs.get(name) : pr?.updated_at ?? null,
        commitsAhead: has ? Number(git("rev-list", "--count", `${MAIN}..origin/${name}`)) : null,
      });
    }
    items.sort((a, b) => String(b.lastCommitAt).localeCompare(String(a.lastCommitAt)));
    return { count: items.length, squashMerged, squashCheck, items };
  });


// ── Vercel Web Analytics ─────────────────────────────────────────────────────
// GET /v1/query/web-analytics/visits/aggregate — since/until are millisecond
// timestamps (or date strings); `by` is required: one dimension, or a time
// granularity (hour/day). Production data only (the API's default filter).
const VERCEL_API = (process.env.VERCEL_API_URL || "https://api.vercel.com").replace(/\/$/, "");
const DAY = 86_400_000;

const vercelAggregate = async (by, since, until, extra = {}) => {
  const { VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID } = process.env;
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID || !VERCEL_TEAM_ID) {
    throw new Error("VERCEL_TOKEN / VERCEL_PROJECT_ID / VERCEL_TEAM_ID not set");
  }
  const q = new URLSearchParams({
    projectId: VERCEL_PROJECT_ID,
    teamId: VERCEL_TEAM_ID,
    since: String(since),
    until: String(until),
    by,
    ...extra,
  });
  const json = await httpJson(
    `${VERCEL_API}/v1/query/web-analytics/visits/aggregate?${q}`,
    { headers: { authorization: `Bearer ${VERCEL_TOKEN}` } },
    `analytics ${by}`,
    { errorBody: true },
  );
  if (!Array.isArray(json?.data)) throw new Error(`analytics ${by}: unexpected response`);
  return json.data;
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const sumRows = (rows) => ({
  pageviews: rows.reduce((a, r) => a + num(r.pageviews), 0),
  visitors: rows.reduce((a, r) => a + num(r.visitors), 0),
});

const analytics = async (nowMs) => {
  const iso = (ms) => new Date(ms).toISOString();
  const total = (since) =>
    section(async () => ({
      since: iso(since),
      until: iso(nowMs),
      ...sumRows(await vercelAggregate("environment", since, nowMs)),
    }));

  const last24h = await total(nowMs - DAY);
  const last7d = await total(nowMs - 7 * DAY);

  const topPages = await section(async () => {
    const rows = await vercelAggregate("requestPath", nowMs - 7 * DAY, nowMs, { limit: "10" });
    const items = rows
      .filter((r) => typeof r.requestPath === "string" && r.requestPath && r.requestPath !== "Others")
      .map((r) => ({ path: r.requestPath, pageviews: num(r.pageviews), visitors: num(r.visitors) }))
      .sort((a, b) => b.pageviews - a.pageviews)
      .slice(0, 5);
    return { windowDays: 7, items };
  });

  // Last 7 UTC calendar days (today included), missing days filled with 0.
  const daily = await section(async () => {
    const today = new Date(nowMs).setUTCHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, i) => new Date(today - (6 - i) * DAY).toISOString().slice(0, 10));
    const rows = await vercelAggregate("day", today - 6 * DAY, nowMs);
    const byDay = new Map(rows.map((r) => [String(r.timestamp).slice(0, 10), r]));
    return {
      basis: "UTC calendar days",
      items: days.map((date) => ({
        date,
        pageviews: num(byDay.get(date)?.pageviews),
        visitors: num(byDay.get(date)?.visitors),
      })),
    };
  });

  const parts = { last24h, last7d, topPages, daily };
  const all = Object.values(parts);
  const failed = all.find((p) => p.status !== "ok");
  return all.every((p) => p.status !== "ok")
    ? { status: "unavailable", reason: failed.reason, ...parts }
    : { status: "ok", ...parts };
};

// ── Supabase (RPCs, publishable key) ─────────────────────────────────────────
// The key is a publishable key (sb_publishable_…), not a JWT: send the `apikey`
// header only — no Authorization: Bearer.
const supabaseRpc = async (fn, body) => {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, DASH_SECRET } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !DASH_SECRET) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY / DASH_SECRET not set");
  }
  return httpJson(
    `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${fn}`,
    {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "content-type": "application/json" },
      body: JSON.stringify({ p_secret: DASH_SECRET, ...body }),
    },
    fn,
    { errorBody: true },
  );
};

const supabaseStats = () =>
  section(async () => {
    const res = await supabaseRpc("dashboard_stats", {});
    if (res?.ok !== true) throw new Error(`dashboard_stats refused: ${res?.error || "ok:false"}`);
    const { ok, ...stats } = res;
    return { stats };
  });

// The Postgres check is on payload::text (jsonb adds a space after ':' and ',');
// stay well under its 200 KB limit and cut the biggest log tails first.
const SAVE_LIMIT_BYTES = 170_000;
const sizeOf = (o) => Buffer.byteLength(JSON.stringify(o));

const payloadFor = (out) => {
  const payload = structuredClone(out);
  const trimmed = [];
  const steps = [
    ["checks.test.logTail", (p) => p.checks?.test],
    ["checks.build.logTail", (p) => p.checks?.build],
    ["checks.lint.logTail", (p) => p.checks?.lint],
  ];
  for (const [name, get] of steps) {
    if (sizeOf(payload) <= SAVE_LIMIT_BYTES) break;
    const c = get(payload);
    if (c?.logTail) {
      c.logTail = "(trimmed to fit the snapshot size limit)";
      trimmed.push(name);
    }
  }
  if (trimmed.length) payload.trimmed = trimmed;
  return payload;
};

const saveSnapshot = async (out) => {
  try {
    const payload = payloadFor(out);
    if (sizeOf(payload) > SAVE_LIMIT_BYTES) throw new Error(`payload too large (${sizeOf(payload)} bytes)`);
    const res = await supabaseRpc("dashboard_save", { p_payload: payload });
    if (res?.ok !== true) throw new Error(`dashboard_save refused: ${res?.error || "ok:false"}`);
    return { ok: true, id: res.id };
  } catch (e) {
    return { ok: false, reason: describe(e) };
  }
};

// ── assemble ─────────────────────────────────────────────────────────────────
const now = new Date();
const ist = new Date(now.getTime() + 330 * 60_000).toISOString().replace("Z", "+05:30");
const line = (name, s) => `${name.padEnd(16)} ${s.status}${s.reason ? ` — ${s.reason}` : ""}`;

try {
  // API calls run one after another, never in parallel.
  const issuesR = await issues();
  const pullsR = await pulls();
  const wipR = await wipBranches();
  const staleR = await staleBranches();
  const checksR = await section(async () => checks());
  const auditR = await audit();
  const todoR = todoSections();
  const notLiveR = await notLive();
  const analyticsR = await analytics(now.getTime());
  const supabaseR = await supabaseStats();

  const out = {
    generatedAt: now.toISOString(),
    generatedAtIST: ist,
    repo: REPO || null,
    github: { issues: issuesR, pulls: pullsR, wipBranches: wipR, staleBranches: staleR },
    checks: checksR,
    audit: auditR,
    todo: todoR.todo,
    inProgress: todoR.inProgress,
    knownIssues: todoR.knownIssues,
    notLive: notLiveR,
    localOnly: {
      stashes: true,
      note: "Stashes cloud-ல் தெரியாது; local machine-ல் மட்டும் (git stash list)",
    },
    analytics: analyticsR,
    supabase: supabaseR,
  };

  out.saved = await saveSnapshot(out);
  writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);

  console.log(`dashboard.json written (${OUT}) at ${out.generatedAtIST}`);
  for (const [k, s] of Object.entries(out.github)) console.log(line(k, s));
  if (checksR.status === "ok") {
    for (const k of ["build", "lint", "test"]) console.log(line(k, checksR[k]));
  } else console.log(line("checks", checksR));
  console.log(line("audit", auditR));
  for (const k of ["todo", "inProgress", "knownIssues", "notLive"]) {
    console.log(line(k, out[k]) + (out[k].count != null ? ` (${out[k].count})` : ""));
  }
  console.log(line("analytics", analyticsR));
  console.log(line("supabase", supabaseR));
  console.log(`saved            ${out.saved.ok ? `ok (id ${out.saved.id})` : `no — ${out.saved.reason}`}`);
} catch (e) {
  // Never fail the workflow: leave a JSON that says what happened.
  const reason = describe(e);
  writeFileSync(OUT, `${JSON.stringify({ generatedAt: now.toISOString(), generatedAtIST: ist, fatal: reason }, null, 2)}\n`);
  console.log(`collector crashed — ${reason}`);
}
