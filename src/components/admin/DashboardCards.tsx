"use client";

import { Fragment, useState } from "react";
import { cn } from "@/lib/utils";
import type { Block, Card, CheckState, DashboardModel } from "@/lib/dashboard";

/*
 * The cards of /admin/dashboard: a big number and a small label each, two to
 * a row on a phone. Tapping one opens its detail right under that row (no new
 * dependency, and it follows the light / dark theme).
 */

const TONE: Record<NonNullable<Card["tone"]>, string> = {
  good: "text-primary-700 dark:text-primary-300",
  warn: "text-gold-600 dark:text-gold-400",
  bad: "text-red-600 dark:text-red-400",
};

const STATE_ICON: Record<CheckState, string> = { pass: "✅", fail: "❌", skipped: "⏭", na: "—" };

/** Cards two to a row; a wide card (the chart) takes a row of its own. */
function toRows(cards: Card[]): Card[][] {
  const rows: Card[][] = [];
  let pair: Card[] = [];
  for (const c of cards) {
    if (c.wide) {
      if (pair.length) rows.push(pair);
      pair = [];
      rows.push([c]);
    } else {
      pair.push(c);
      if (pair.length === 2) {
        rows.push(pair);
        pair = [];
      }
    }
  }
  if (pair.length) rows.push(pair);
  return rows;
}

function MiniBars({ bars, tall }: { bars: { label: string; value: number }[]; tall?: boolean }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className={cn("flex items-end gap-1.5", tall ? "h-28" : "h-14")} role="img" aria-label={bars.map((b) => `${b.label}: ${b.value}`).join(", ")}>
      {bars.map((b) => (
        <div key={b.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          {tall && <span className="text-muted text-[10px]">{b.value}</span>}
          <div
            className="w-full rounded-sm bg-primary-600 dark:bg-primary-400"
            style={{ height: `${Math.max(4, (b.value / max) * 100)}%`, opacity: b.value ? 1 : 0.25 }}
          />
          <span className="text-muted text-[9px] leading-none">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = Math.max(1, max - min);
  const w = 280;
  const h = 64;
  const xy = points.map((p, i) => [(i / Math.max(1, points.length - 1)) * w, h - 4 - ((p.value - min) / span) * (h - 8)]);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full text-primary-600 dark:text-primary-400" role="img" aria-label={points.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" points={xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")} />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="currentColor" />
        ))}
      </svg>
      <div className="text-muted mt-1 flex justify-between text-[10px]">
        <span>{points[0]?.label}</span>
        <span>
          {points[points.length - 1]?.label}: {points[points.length - 1]?.value}
        </span>
      </div>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <p className="text-muted text-sm">{block.text}</p>;
    case "stats":
      return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {block.items.map((s) => (
            <div key={s.label}>
              <dt className="text-muted text-[11px]">{s.label}</dt>
              <dd className="break-words text-base font-semibold">{s.value}</dd>
            </div>
          ))}
        </dl>
      );
    case "bars":
      return (
        <div>
          {block.title && <p className="text-muted mb-2 text-xs font-medium">{block.title}</p>}
          <MiniBars bars={block.items} tall />
        </div>
      );
    case "trend":
      return (
        <div>
          <p className="text-muted mb-1 text-xs font-medium">{block.title}</p>
          <Trend points={block.points} />
        </div>
      );
    case "pre":
      return (
        <details className="surface-muted rounded-xl border p-3">
          <summary className="cursor-pointer text-xs font-medium">{block.title}</summary>
          <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px]">{block.text}</pre>
        </details>
      );
    case "list":
      return (
        <div>
          {block.title && <p className="text-muted mb-1 text-xs font-medium">{block.title}</p>}
          {block.items.length === 0 ? (
            <p className="text-muted text-sm">{block.empty ?? "எதுவும் இல்லை"}</p>
          ) : (
            <ul className="divide-y">
              {block.items.map((i, n) => {
                const body = (
                  <>
                    <span className="break-words text-sm">{i.primary}</span>
                    {i.secondary && <span className="text-muted block text-xs">{i.secondary}</span>}
                  </>
                );
                return (
                  <li key={`${n}-${i.primary}`} className="py-2">
                    {i.href ? (
                      <a href={i.href} target="_blank" rel="noopener noreferrer" className="block hover:underline">
                        {body}
                      </a>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
  }
}

function CardFace({ card }: { card: Card }) {
  if (card.status === "unavailable") return <p className="text-muted mt-2 text-sm">கிடைக்கவில்லை</p>;
  const tone = card.tone ? TONE[card.tone] : "";
  return (
    <>
      {card.checks ? (
        <ul className="mt-2 space-y-1">
          {card.checks.map((c) => (
            <li key={c.label} className="flex items-center justify-between text-sm">
              <span>{c.label}</span>
              <span aria-label={c.state}>{STATE_ICON[c.state]}</span>
            </li>
          ))}
        </ul>
      ) : card.value !== undefined ? (
        <p className={cn("mt-1 break-words font-semibold leading-tight", tone, card.value.length > 8 ? "text-xl" : "text-3xl")}>{card.value}</p>
      ) : null}
      {card.caption && <p className="text-muted mt-0.5 text-xs">{card.caption}</p>}
      {card.lines?.map((l) => (
        <p key={l} className="text-muted mt-1 break-words text-xs">
          {l}
        </p>
      ))}
      {card.bars && (
        <div className="mt-3">
          <MiniBars bars={card.bars} />
        </div>
      )}
    </>
  );
}

export function DashboardCards({ model }: { model: DashboardModel }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  return (
    <div className="grid grid-cols-2 gap-3">
      {toRows(model.cards).map((row) => {
        const open = row.find((c) => c.id === openId);
        return (
          <Fragment key={row.map((c) => c.id).join("+")}>
            {row.map((card) => (
              <button
                key={card.id}
                type="button"
                aria-expanded={openId === card.id}
                aria-controls={`dash-${card.id}`}
                onClick={() => toggle(card.id)}
                className={cn(
                  "surface flex min-w-0 flex-col items-stretch justify-start rounded-2xl border p-4 text-left shadow-soft transition-colors hover:border-primary-400",
                  card.wide && "col-span-2",
                  openId === card.id && "border-primary-500",
                )}
              >
                <p className="text-xs font-semibold">{card.title}</p>
                <CardFace card={card} />
              </button>
            ))}
            {open && (
              <section
                id={`dash-${open.id}`}
                aria-label={`${open.title} · விவரம்`}
                className="surface col-span-2 space-y-4 rounded-2xl border p-4 shadow-soft"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{open.title}</h2>
                  <button type="button" onClick={() => setOpenId(null)} className="text-muted text-xs hover:underline">
                    மூடு
                  </button>
                </div>
                {open.detail.map((b, i) => (
                  <BlockView key={i} block={b} />
                ))}
              </section>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
