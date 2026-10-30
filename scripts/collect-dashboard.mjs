#!/usr/bin/env node
/**
 * Morning dashboard collector (GitHub side only).
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
 */
import { spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = process.argv[2] || "dashboard.json";
const TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = process.env.GITHUB_REPOSITORY || "";
const STALE_DAYS = 30;
const MAIN = "origin/main";

const redact = (s) => {
  let out = String(s);
  if (TOKEN) out = out.split(TOKEN).join("***");
  return out;
};

const section = async (fn) => {
  try {
    return { status: "ok", ...(await fn()) };
  } catch (e) {
    return { status: "unavailable", reason: redact(e?.message || e).slice(0, 300) };
  }
};

const run = (cmd, args, { env = {}, timeoutMs = 15 * 60_000 } = {}) => {
  const t0 = Date.now();
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    env: { ...process.env, ...env },
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

// ── GitHub REST (issues / PRs) ───────────────────────────────────────────────
async function ghList(path) {
  if (!TOKEN || !REPO) throw new Error("GITHUB_TOKEN / GITHUB_REPOSITORY missing");
  const items = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      {
        headers: {
          authorization: `Bearer ${TOKEN}`,
          accept: "application/vnd.github+json",
          "x-github-api-version": "2022-11-28",
        },
      },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path.split("?")[0]}`);
    const batch = await res.json();
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
    "--format=%(refname:short)|%(committerdate:iso-strict)",
    "refs/remotes/origin",
  );
  return raw
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [ref, date] = l.split("|");
      return { name: ref.replace(/^origin\//, ""), date };
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
    test = files.length
      ? { ...result(run("node", ["--test", ...files]), { failLines: /^\s*(not ok|error:)/ }), files: files.length }
      : { status: "skipped", reason: "skipped (tests இல்லை)" };
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

// ── assemble ─────────────────────────────────────────────────────────────────
const now = new Date();
const ist = new Date(now.getTime() + 330 * 60_000).toISOString().replace("Z", "+05:30");

const [issuesR, pullsR, wipR, staleR] = await Promise.all([issues(), pulls(), wipBranches(), staleBranches()]);
const checksR = await section(async () => checks());
const auditR = await audit();

const out = {
  generatedAt: now.toISOString(),
  generatedAtIST: ist,
  repo: REPO || null,
  github: { issues: issuesR, pulls: pullsR, wipBranches: wipR, staleBranches: staleR },
  checks: checksR,
  audit: auditR,
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);

const line = (name, s) => `${name.padEnd(16)} ${s.status}${s.reason ? ` — ${s.reason}` : ""}`;
console.log(`dashboard.json written (${OUT}) at ${out.generatedAtIST}`);
for (const [k, s] of Object.entries(out.github)) console.log(line(k, s));
if (checksR.status === "ok") {
  for (const k of ["build", "lint", "test"]) console.log(line(k, checksR[k]));
} else console.log(line("checks", checksR));
console.log(line("audit", auditR));
