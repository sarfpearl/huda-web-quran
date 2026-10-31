/*
 * Morning dashboard: turns the dashboard.json the daily collector saves
 * (scripts/collect-dashboard.mjs → public.dashboard_snapshots.payload) into the
 * cards and detail blocks /admin/dashboard shows. Pure and defensive: any
 * section may be missing or "unavailable" and only its own card is affected.
 */

type Section = { status?: string; reason?: string; count?: number; note?: string } & Record<string, unknown>;

/** The parts of the saved JSON the page reads. Everything is optional. */
export interface DashboardPayload {
  generatedAt?: string;
  generatedAtIST?: string;
  fatal?: string;
  github?: { issues?: Section; pulls?: Section; wipBranches?: Section; staleBranches?: Section };
  checks?: { status?: string; reason?: string; build?: Check; lint?: Check; test?: Check };
  audit?: Section;
  todo?: Section;
  inProgress?: Section;
  knownIssues?: Section;
  notLive?: Section;
  localOnly?: { stashes?: boolean; note?: string };
  analytics?: Section;
  supabase?: { status?: string; reason?: string; stats?: SupabaseStats };
}

export interface Check {
  status?: "pass" | "fail" | "skipped";
  reason?: string;
  seconds?: number;
  logTail?: string;
  failingTests?: string[];
  failingTestsTotal?: number;
}

export interface SupabaseStats {
  unique_viewers?: number;
  unique_viewers_24h?: number;
  live_listeners?: number;
  top_surah?: TopRow[];
  top_juz?: TopRow[];
  likes_24h?: { content?: number; comments?: number };
  comments_24h?: number;
  comments_hidden_total?: number;
  moderation_pending?: number | string;
}

interface TopRow {
  id: number;
  listeners: number;
  seconds?: number;
}

/** One earlier snapshot, for the trend lines (numbers pulled out of its JSON). */
export interface TrendRow {
  created_at: string;
  pageviews: number | null;
  visitors: number | null;
  listeners: number | null;
}

export type Block =
  | { kind: "list"; title?: string; items: { primary: string; secondary?: string; href?: string }[]; empty?: string }
  | { kind: "stats"; items: { label: string; value: string }[] }
  | { kind: "bars"; title?: string; items: { label: string; value: number }[] }
  | { kind: "trend"; title: string; points: { label: string; value: number }[] }
  | { kind: "text"; text: string }
  | { kind: "pre"; title: string; text: string };

export type CheckState = "pass" | "fail" | "skipped" | "na";

export interface Card {
  id: string;
  title: string;
  /** "unavailable": the card says "கிடைக்கவில்லை" and the detail gives the reason. */
  status: "ok" | "unavailable";
  reason?: string;
  value?: string;
  caption?: string;
  lines?: string[];
  tone?: "good" | "warn" | "bad";
  checks?: { label: string; state: CheckState }[];
  bars?: { label: string; value: number }[];
  /** Takes the whole row (the chart card). */
  wide?: boolean;
  detail: Block[];
}

export interface DashboardModel {
  updatedAt: string | null;
  updatedLabel: string;
  stale: boolean;
  fatal?: string;
  cards: Card[];
}

export interface BuildOptions {
  now?: number;
  /** Surah / Juz display name; the page passes the app's own contentLabel. */
  label?: (kind: "surah" | "juz", id: number) => string;
  trend?: TrendRow[];
}

const STALE_HOURS = 26;
const NO_DATA = "இந்தப் பகுதி snapshot-ல் இல்லை";
const IST = "Asia/Kolkata";

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function compact(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  if (Math.abs(v) >= 10_000) return `${(v / 1000).toFixed(v >= 100_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return v.toLocaleString("en-IN");
}

export function formatIST(iso: string | undefined | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)} IST`;
}

export function formatDay(iso: string | undefined | null): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "numeric", month: "short" }).format(d);
}

const isOk = (s: { status?: string } | undefined | null): boolean => s?.status === "ok";
const reasonOf = (s: { status?: string; reason?: string } | undefined | null): string =>
  s ? s.reason || "தகவல் கிடைக்கவில்லை" : NO_DATA;

const unavailable = (id: string, title: string, reason: string, detail: Block[] = []): Card => ({
  id,
  title,
  status: "unavailable",
  reason,
  detail: [{ kind: "text", text: `காரணம்: ${reason}` }, ...detail],
});

type Item = Record<string, unknown>;
const items = (s: Section | undefined): Item[] => (Array.isArray(s?.items) ? (s?.items as Item[]) : []);
const str = (v: unknown): string => (typeof v === "string" ? v : v === null || v === undefined ? "" : String(v));

function todoList(s: Section | undefined, title: string): Block {
  return {
    kind: "list",
    title,
    empty: "எதுவும் இல்லை",
    items: items(s).map((i) => ({
      primary: `${i.number !== null && i.number !== undefined ? `#${i.number} ` : ""}${str(i.title)}`,
      secondary: str(i.group) || undefined,
    })),
  };
}

export function buildDashboard(payload: DashboardPayload | null | undefined, opts: BuildOptions = {}): DashboardModel {
  const p = payload ?? {};
  const now = opts.now ?? Date.now();
  const label = opts.label ?? ((kind, id) => `${kind === "surah" ? "Surah" : "Juz"} ${id}`);
  const gh = p.github ?? {};
  const stats = p.supabase?.stats;

  const generated = p.generatedAt ? new Date(p.generatedAt).getTime() : NaN;
  const ageHours = Number.isNaN(generated) ? null : (now - generated) / 3_600_000;
  const cards: Card[] = [];

  // 1 · Known issues (+ GitHub's open issues)
  {
    const s = p.knownIssues;
    if (!isOk(s)) cards.push(unavailable("issues", "Issues", reasonOf(s)));
    else {
      const open = gh.issues;
      const count = s?.count ?? 0;
      cards.push({
        id: "issues",
        title: "Issues",
        status: "ok",
        value: compact(count),
        caption: "அறியப்பட்ட சிக்கல்கள்",
        lines: isOk(open) ? [`GitHub open issues: ${open?.count ?? 0}`] : undefined,
        tone: count > 0 ? "warn" : undefined,
        detail: [
          todoList(s, "Known issues"),
          ...(s?.note && count === 0 ? [{ kind: "text", text: s.note } as Block] : []),
          isOk(open)
            ? {
                kind: "list",
                title: "GitHub open issues",
                empty: "திறந்த issues இல்லை",
                items: items(open).map((i) => ({
                  primary: `#${i.number} ${str(i.title)}`,
                  secondary: formatDay(str(i.updatedAt)),
                  href: str(i.url) || undefined,
                })),
              }
            : { kind: "text", text: `GitHub issues: ${reasonOf(open)}` },
        ],
      });
    }
  }

  // 2 · Uncommitted: wip branches + the local-only note
  {
    const s = gh.wipBranches;
    const note = p.localOnly?.note || "Stashes cloud-ல் தெரியாது; local machine-ல் மட்டும்";
    if (!isOk(s)) cards.push(unavailable("uncommitted", "Uncommitted", reasonOf(s), [{ kind: "text", text: note }]));
    else {
      const stale = gh.staleBranches;
      cards.push({
        id: "uncommitted",
        title: "Uncommitted",
        status: "ok",
        value: compact(s?.count ?? 0),
        caption: "wip branches",
        lines: ["stash cloud-ல் தெரியாது"],
        tone: (s?.count ?? 0) > 0 ? "warn" : undefined,
        detail: [
          { kind: "text", text: note },
          {
            kind: "list",
            title: "wip/* branches",
            empty: "wip branches இல்லை",
            items: items(s).map((i) => ({
              primary: str(i.name),
              secondary: `${i.unmergedCommits} commits முன்னால் · ${formatDay(str(i.lastCommitAt))}`,
            })),
          },
          isOk(stale)
            ? {
                kind: "list",
                title: `${stale?.thresholdDays ?? 30} நாளுக்கு மேல் பழைய branches`,
                empty: "எதுவும் இல்லை",
                items: items(stale).map((i) => ({
                  primary: str(i.name),
                  secondary: `${i.daysOld} நாள் · ${formatDay(str(i.lastCommitAt))}${i.mergedIntoMain ? " · merged" : ""}`,
                })),
              }
            : { kind: "text", text: `பழைய branches: ${reasonOf(stale)}` },
        ],
      });
    }
  }

  // 3 · To-do, 4 · In progress
  for (const [id, title, caption, s] of [
    ["todo", "To-do", "செய்ய வேண்டியவை", p.todo],
    ["inprogress", "In progress", "நடப்பில் உள்ளவை", p.inProgress],
  ] as const) {
    if (!isOk(s)) cards.push(unavailable(id, title, reasonOf(s)));
    else
      cards.push({
        id,
        title,
        status: "ok",
        value: compact(s?.count ?? 0),
        caption,
        detail: [todoList(s, title), ...(s?.note && !(s?.count ?? 0) ? [{ kind: "text", text: s.note } as Block] : [])],
      });
  }

  // 5 · Not live
  {
    const s = p.notLive;
    if (!isOk(s)) cards.push(unavailable("notlive", "Not live", reasonOf(s)));
    else {
      const rows = items(s);
      const prs = rows.filter((i) => i.kind === "pr").length;
      const squash = num(s?.squashMerged);
      cards.push({
        id: "notlive",
        title: "Not live",
        status: "ok",
        value: compact(s?.count ?? 0),
        caption: "merge ஆகாத branches / PRs",
        lines: prs ? [`open PRs: ${prs}`] : undefined,
        tone: (s?.count ?? 0) > 0 ? "warn" : undefined,
        detail: [
          {
            kind: "list",
            empty: "எல்லாம் merge ஆகிவிட்டது",
            items: rows.map((i) => {
              const pr = (i.pr ?? null) as Item | null;
              const ahead = num(i.commitsAhead);
              return {
                primary: pr ? `PR #${pr.number} · ${str(i.name)}` : str(i.name),
                secondary: `${ahead === null ? "?" : ahead} commits முன்னால் · ${formatDay(str(i.lastCommitAt))}${pr?.draft ? " · draft" : ""}`,
                href: pr ? str(pr.url) || undefined : undefined,
              };
            }),
          },
          ...(squash ? [{ kind: "text", text: `squash-merge ஆனவை ${squash} விலக்கப்பட்டன.` } as Block] : []),
        ],
      });
    }
  }

  // 6 · Build / Lint / Test
  {
    const c = p.checks;
    if (!isOk(c)) cards.push(unavailable("checks", "Build · Lint · Test", reasonOf(c)));
    else {
      const rows: [string, Check | undefined][] = [
        ["Build", c?.build],
        ["Lint", c?.lint],
        ["Test", c?.test],
      ];
      const state = (k?: Check): CheckState => (k?.status === "pass" || k?.status === "fail" || k?.status === "skipped" ? k.status : "na");
      const states = rows.map(([, k]) => state(k));
      const detail: Block[] = [];
      for (const [name, k] of rows) {
        detail.push({
          kind: "stats",
          items: [
            { label: name, value: state(k) === "pass" ? "✅ pass" : state(k) === "fail" ? "❌ fail" : state(k) === "skipped" ? "⏭ skipped" : "—" },
            ...(num(k?.seconds) !== null ? [{ label: "நேரம்", value: `${k?.seconds}s` }] : []),
            ...(k?.reason ? [{ label: "காரணம்", value: k.reason }] : []),
          ],
        });
        if (name === "Test" && k?.failingTests?.length) {
          detail.push({
            kind: "list",
            title: `தோல்வியடைந்த tests (${k.failingTestsTotal ?? k.failingTests.length})`,
            items: k.failingTests.map((t) => ({ primary: t })),
          });
        }
        if (k?.logTail && state(k) !== "pass") detail.push({ kind: "pre", title: `${name} log (கடைசி வரிகள்)`, text: k.logTail });
      }
      cards.push({
        id: "checks",
        title: "Build · Lint · Test",
        status: "ok",
        checks: rows.map(([label], i) => ({ label, state: states[i] })),
        tone: states.includes("fail") ? "bad" : states.every((s) => s === "pass") ? "good" : "warn",
        detail,
      });
    }
  }

  // 7 · Security (npm audit)
  {
    const a = p.audit;
    if (!isOk(a)) cards.push(unavailable("security", "Security", reasonOf(a)));
    else {
      const [crit, high, mod, low] = ["critical", "high", "moderate", "low"].map((k) => num(a?.[k]) ?? 0);
      cards.push({
        id: "security",
        title: "Security",
        status: "ok",
        value: compact(crit + high),
        caption: "critical + high",
        lines: [`moderate ${mod} · low ${low}`],
        tone: crit + high > 0 ? "bad" : mod > 0 ? "warn" : "good",
        detail: [
          {
            kind: "stats",
            items: [
              { label: "Critical", value: String(crit) },
              { label: "High", value: String(high) },
              { label: "Moderate", value: String(mod) },
              { label: "Low", value: String(low) },
            ],
          },
          { kind: "text", text: "npm audit முடிவு (production + dev dependencies)." },
        ],
      });
    }
  }

  // 8 · Visitors & Page views
  {
    const an = p.analytics as
      | (Section & {
          last24h?: Section;
          last7d?: Section;
          topPages?: Section;
          daily?: Section;
        })
      | undefined;
    if (!isOk(an)) cards.push(unavailable("traffic", "Visitors & Page views", reasonOf(an)));
    else {
      const v = (s: Section | undefined, k: string) => (isOk(s) ? num(s?.[k]) : null);
      const days = isOk(an?.daily) ? items(an?.daily) : [];
      const trend = (opts.trend ?? []).filter((t) => t.pageviews !== null);
      const detail: Block[] = [
        {
          kind: "stats",
          items: [
            { label: "Visitors · 24 மணி", value: compact(v(an?.last24h, "visitors")) },
            { label: "Page views · 24 மணி", value: compact(v(an?.last24h, "pageviews")) },
            { label: "Visitors · 7 நாள்", value: compact(v(an?.last7d, "visitors")) },
            { label: "Page views · 7 நாள்", value: compact(v(an?.last7d, "pageviews")) },
          ],
        },
      ];
      if (days.length) {
        detail.push({
          kind: "bars",
          title: `Page views · 7 நாள் (${str(an?.daily?.basis)})`,
          items: days.map((d) => ({ label: str(d.date).slice(5), value: num(d.pageviews) ?? 0 })),
        });
      } else detail.push({ kind: "text", text: `7 நாள் chart: ${reasonOf(an?.daily)}` });
      detail.push(
        isOk(an?.topPages)
          ? {
              kind: "list",
              title: "Top 5 pages · 7 நாள்",
              empty: "இன்னும் தரவு இல்லை",
              items: items(an?.topPages).map((i) => ({
                primary: str(i.path),
                secondary: `${compact(num(i.pageviews))} views · ${compact(num(i.visitors))} visitors`,
              })),
            }
          : { kind: "text", text: `Top pages: ${reasonOf(an?.topPages)}` },
      );
      if (trend.length > 1) {
        detail.push({
          kind: "trend",
          title: "Page views · 24 மணி (கடந்த snapshots)",
          points: [...trend].reverse().map((t) => ({ label: formatDay(t.created_at), value: t.pageviews ?? 0 })),
        });
      }
      const failed = (["last24h", "last7d", "topPages", "daily"] as const).filter((k) => !isOk(an?.[k]));
      cards.push({
        id: "traffic",
        title: "Visitors & Page views",
        status: "ok",
        wide: true,
        lines: [
          `24 மணி: ${compact(v(an?.last24h, "visitors"))} visitors · ${compact(v(an?.last24h, "pageviews"))} views`,
          `7 நாள்: ${compact(v(an?.last7d, "visitors"))} visitors · ${compact(v(an?.last7d, "pageviews"))} views`,
        ],
        bars: days.length ? days.map((d) => ({ label: str(d.date).slice(8), value: num(d.pageviews) ?? 0 })) : undefined,
        tone: failed.length ? "warn" : undefined,
        detail,
      });
    }
  }

  // 9–12 · Supabase numbers
  const sbReason = isOk(p.supabase) && stats ? "" : reasonOf(p.supabase);
  const live = () => (sbReason ? null : num(stats?.live_listeners));
  if (sbReason || live() === null) {
    cards.push(unavailable("live", "Live listeners", sbReason || NO_DATA));
    cards.push(unavailable("listeners", "Listeners", sbReason || NO_DATA));
    cards.push(unavailable("top", "Top Surah / Juz", sbReason || NO_DATA));
    cards.push(unavailable("engagement", "Comments & likes", sbReason || NO_DATA));
  } else {
    const trend = (opts.trend ?? []).filter((t) => t.listeners !== null);
    cards.push({
      id: "live",
      title: "Live listeners",
      status: "ok",
      value: compact(live()),
      caption: "இப்போது கேட்பவர்கள்",
      detail: [
        { kind: "stats", items: [{ label: "Live (கடந்த 60 வினாடி)", value: compact(live()) }] },
        { kind: "text", text: "இந்த எண் snapshot எடுத்த நேரத்தினது; இப்போதைய நிலை அல்ல." },
      ],
    });
    cards.push({
      id: "listeners",
      title: "Listeners",
      status: "ok",
      value: compact(num(stats?.unique_viewers)),
      caption: "மொத்தம்",
      lines: [`24 மணி: ${compact(num(stats?.unique_viewers_24h))}`],
      detail: [
        {
          kind: "stats",
          items: [
            { label: "மொத்தம்", value: compact(num(stats?.unique_viewers)) },
            { label: "24 மணி", value: compact(num(stats?.unique_viewers_24h)) },
          ],
        },
        ...(trend.length > 1
          ? [
              {
                kind: "trend",
                title: "மொத்த listeners (கடந்த snapshots)",
                points: [...trend].reverse().map((t) => ({ label: formatDay(t.created_at), value: t.listeners ?? 0 })),
              } as Block,
            ]
          : []),
      ],
    });

    const topList = (kind: "surah" | "juz", rows: TopRow[] | undefined): Block => ({
      kind: "list",
      title: `Top ${kind === "surah" ? "Surah" : "Juz"}`,
      empty: "இன்னும் தரவு இல்லை",
      items: (rows ?? []).map((r) => ({
        primary: label(kind, r.id),
        secondary: `${compact(r.listeners)} listeners${r.seconds ? ` · ${Math.round(r.seconds / 60)} நிமிடம்` : ""}`,
      })),
    });
    const topSurah = stats?.top_surah?.[0];
    const topJuz = stats?.top_juz?.[0];
    cards.push({
      id: "top",
      title: "Top Surah / Juz",
      status: "ok",
      value: topSurah ? label("surah", topSurah.id) : "—",
      caption: topSurah ? `${compact(topSurah.listeners)} listeners` : "இன்னும் தரவு இல்லை",
      lines: topJuz ? [`Juz: ${label("juz", topJuz.id)} · ${compact(topJuz.listeners)}`] : undefined,
      detail: [topList("surah", stats?.top_surah), topList("juz", stats?.top_juz)],
    });

    const likes = (num(stats?.likes_24h?.content) ?? 0) + (num(stats?.likes_24h?.comments) ?? 0);
    const pending = stats?.moderation_pending;
    cards.push({
      id: "engagement",
      title: "Comments & likes",
      status: "ok",
      value: compact(num(stats?.comments_24h)),
      caption: "புது comments · 24 மணி",
      lines: [`புது likes: ${compact(likes)}`, `மறைக்கப்பட்டவை: ${compact(num(stats?.comments_hidden_total))}`],
      tone: (num(stats?.comments_hidden_total) ?? 0) > 0 ? "warn" : undefined,
      detail: [
        {
          kind: "stats",
          items: [
            { label: "புது comments · 24 மணி", value: compact(num(stats?.comments_24h)) },
            { label: "புது likes (Surah/Juz)", value: compact(num(stats?.likes_24h?.content)) },
            { label: "புது likes (comments)", value: compact(num(stats?.likes_24h?.comments)) },
            { label: "மறைக்கப்பட்ட comments", value: compact(num(stats?.comments_hidden_total)) },
            {
              label: "moderation-க்கு காத்திருப்பவை",
              value: typeof pending === "number" ? compact(pending) : "கிடைக்கவில்லை",
            },
          ],
        },
        { kind: "text", text: "மறைக்கப்பட்டவை: spam guard பிடித்தவையும் admin மறைத்தவையும் சேர்ந்த எண்ணிக்கை." },
      ],
    });
  }

  return {
    updatedAt: p.generatedAt ?? null,
    updatedLabel: p.generatedAt ? formatIST(p.generatedAt) : "—",
    stale: ageHours !== null && ageHours > STALE_HOURS,
    ...(p.fatal ? { fatal: p.fatal } : {}),
    cards,
  };
}
