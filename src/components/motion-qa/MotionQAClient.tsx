"use client";

/*
 * TEMPORARY /motion-qa review page. Every "Before" is the live component,
 * imported unchanged; every "After" is its QA copy from this folder. The page
 * mounts exactly one global player (original or QA) so the two never overlap.
 */

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { BayanSort, BayanWithRelations } from "@/types/bayan";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { formatClock, cn } from "@/lib/utils";
// Before: live components, unchanged
import { SortTabs } from "@/components/ui/SortTabs";
import { GlobalAudioPlayer } from "@/components/player/GlobalAudioPlayer";
import { PlayerProgress } from "@/components/player/PlayerProgress";
// After: QA copies under review
import { SortTabsQA } from "./SortTabsQA";
import { GlobalAudioPlayerQA } from "./GlobalAudioPlayerQA";
import { PlayerProgressQA } from "./PlayerProgressQA";

type Which = "before" | "after";

export function MotionQAClient({
  items,
  sort,
  player,
  frame,
}: {
  items: BayanWithRelations[];
  sort: BayanSort;
  player: Which;
  frame: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const audio = useAudioPlayer();
  const tracks = items.filter((b) => b.audioSource !== "youtube");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }
  const loadTrack = () => tracks[0] && audio.playBayan(tracks[0], tracks);

  // Device frames load a track without autoplay (browsers block it in iframes).
  useEffect(() => {
    if (frame && !audio.current && tracks[0]) audio.cueBayan(tracks[0], tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  const Player = player === "after" ? GlobalAudioPlayerQA : GlobalAudioPlayer;

  if (frame) {
    return (
      <div className="py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Motion QA frame · {player === "after" ? "After (QA)" : "Before (live)"}
        </p>
        <p className="mt-1 text-sm text-muted">
          Tap the player bar to open it. The list below is here to test background scroll.
        </p>
        <ul className="mt-4 space-y-2">
          {Array.from({ length: 4 }).flatMap((_, round) =>
            items.map((b) => (
              <li key={`${round}-${b.id}`} className="rounded-xl border surface p-3 text-sm">
                {b.title}
              </li>
            ))
          )}
        </ul>
        <Player />
      </div>
    );
  }

  const frameSrc = (w: Which) => `/motion-qa?frame=1&player=${w}`;

  return (
    <div className="space-y-6 py-6">
      <header className="rounded-2xl border surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-300">
          Temporary testing page
        </p>
        <h1 className="mt-1 text-2xl font-bold">Motion QA</h1>
        <p className="mt-2 text-sm text-muted">
          This page compares every completed motion change with the live UI. The live UI is
          unchanged: on every other page you still see the original components. Nothing here reaches
          production until you approve it. Only audio (non-YouTube) tracks are used.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium">Player on this page:</span>
          <div className="inline-flex rounded-full border surface-muted p-1" role="group" aria-label="Player version">
            {(["before", "after"] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setParam("player", w)}
                aria-pressed={player === w}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium",
                  player === w ? "bg-primary-700 text-sand-50" : "text-muted"
                )}
              >
                {w === "before" ? "Before (live)" : "After (QA)"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={loadTrack}
            className="rounded-full border px-4 py-1.5 text-sm font-medium hover:text-primary-700"
          >
            {audio.current ? "Restart test track" : "Load test track"}
          </button>
          {audio.current ? (
            <span className="text-sm text-muted">Now: {audio.current.title}</span>
          ) : null}
        </div>
      </header>

      <Test
        n={1}
        title="SortTabs: liquid indicator"
        before="The green background jumps straight to the tapped tab."
        after="One pill stretches toward the tapped tab (its leading edge is faster than its trailing edge), then settles. The label turns white exactly where the pill is."
        change="SortTabs uses one shared indicator with two edge springs and a clipped white label layer. It moves on tap, before the page reloads its data. Reduced motion jumps instead of animating."
      >
        <Compare
          before={<SortTabs current={sort} />}
          after={<SortTabsQA current={sort} />}
          note="Both tab sets share the same ?sort value, so tapping either one moves both. Watch how each one gets there."
        />
      </Test>

      <Test
        n={2}
        title="Mobile player: bar → full-screen morph, drag to dismiss"
        before="Tapping the bar slides a separate sheet up from the bottom. Only the chevron closes it."
        after="The bar itself grows into the full-screen player, and the cover and play button fly to their new places. Drag the header or artwork down: a short slow drag springs back, a long drag or a quick flick closes it."
        change="GlobalAudioPlayer (mobile only; the desktop bar is unchanged) uses a shared-layout morph and a blur swap for the text. Drag-to-dismiss closes when offset + velocity × 0.2 s passes 140 px. Sliders never drag the sheet."
      >
        <Steps
          items={[
            "On a phone: pick “After (QA)” above, tap “Load test track”, then tap the player bar at the bottom.",
            "Try a slow short drag, a long drag and a quick flick on the artwork. Drag the progress and volume sliders; the sheet must not move.",
            "Switch to “Before (live)” and repeat to compare.",
          ]}
        />
        <Frames
          frames={[
            { label: "Before (live)", src: frameSrc("before"), w: 390, h: 760 },
            { label: "After (QA)", src: frameSrc("after"), w: 390, h: 760 },
          ]}
        />
      </Test>

      <Test
        n={3}
        title="Track change: title blur swap, artwork crossfade"
        before="The title and cover change instantly."
        after="The old title blurs out and the new one blurs in without shifting. The new cover fades in over the old one, with no dip to the background colour."
        change="GlobalAudioPlayer keys the title and artwork by track. The artwork crossfade happens inside the shared cover, so the bar ↔ full-screen morph keeps working."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={audio.previous} disabled={!audio.current} className="rounded-full border px-4 py-1.5 text-sm font-medium disabled:opacity-40">
            ◀ Previous track
          </button>
          <button type="button" onClick={audio.next} disabled={!audio.current} className="rounded-full border px-4 py-1.5 text-sm font-medium disabled:opacity-40">
            Next track ▶
          </button>
          <span className="text-sm text-muted">
            {audio.current ? "Watch the player bar (and the full-screen player on mobile)." : "Load the test track first."}
          </span>
        </div>
      </Test>

      <Test
        n={4}
        title="Progress scrub: direct drag, live time, thumb, bubble, seek fix"
        before="Dragging calls seek on every move: audio stutters, and the thumb can snap back to the playhead while you drag."
        after="While you drag, the bar and time follow your finger, the thumb grows and a time bubble shows the target. Audio seeks once, on release; the thumb then springs back to size. Keyboard arrows still seek immediately."
        change="PlayerProgress keeps a local scrub value and captures the pointer so releasing anywhere commits. The thumb uses a CSS spring curve. The native range input is kept, so accessibility is unchanged."
      >
        <Compare
          before={<PlayerProgress />}
          after={<PlayerProgressQA />}
          note={
            audio.current
              ? `Both bars control the same track. Playhead: ${formatClock(audio.currentTime)}. Press play, then drag each bar and listen.`
              : "Load the test track first."
          }
        />
      </Test>

      <Test
        n={5}
        title="Responsive / device fixes (After only)"
        before="The full-screen player had no safe-area padding (buttons under the notch, Dynamic Island and home indicator). Controls fell off-screen on small phones and in landscape, the page behind it scrolled, and a quick flick didn't close it."
        after="Safe-area padding on all sides. The artwork shrinks to fit, so every control stays on screen. Short landscape screens use two columns. The page behind is locked, and a quick flick closes the player."
        change="GlobalAudioPlayer layout and scroll lock, found with an emulated device matrix (44/44 pass after the fixes). Not changed: on tablets (768–810px) the live desktop bar squeezes its progress bar to 0–14px. That problem predates this work, and the QA copy matches it exactly; fixing it needs a layout decision (see the note below). Real iPhone and Android checks are still pending: see docs/qa/player-motion-qa.md."
      >
        <Steps
          items={[
            "The frames below show the After version at real device sizes. Safe-area insets only appear on a real notched phone. On one, open this page, choose “After (QA)”, then add it to the Home Screen for the strictest insets.",
            "Rotate a phone to landscape with the full-screen player open: it should switch to two columns with every control visible.",
            "Known issue, not part of this change: in the iPad portrait frame the desktop bar's progress bar is only about 14px wide. The live bar does the same. It needs a tablet layout decision before it can be fixed.",
          ]}
        />
        <Frames
          frames={[
            { label: "iPhone SE · 320×568", src: frameSrc("after"), w: 320, h: 568 },
            { label: "iPhone 15 landscape · 659×393", src: frameSrc("after"), w: 659, h: 393 },
            { label: "iPad portrait · 810×1080 (50%)", src: frameSrc("after"), w: 810, h: 1080, scale: 0.5 },
          ]}
        />
      </Test>

      {/* The one global player on this page: live or QA, per the switch above */}
      <Player />
    </div>
  );
}

function Test({
  n,
  title,
  before,
  after,
  change,
  children,
}: {
  n: number;
  title: string;
  before: string;
  after: string;
  change: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border surface p-5" aria-labelledby={`test-${n}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`test-${n}`} className="text-lg font-bold">
          Test {n}: {title}
        </h2>
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted">Awaiting review</span>
      </div>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
        <div>
          <dt className="font-semibold">Before</dt>
          <dd className="mt-1 text-muted">{before}</dd>
        </div>
        <div>
          <dt className="font-semibold">After</dt>
          <dd className="mt-1 text-muted">{after}</dd>
        </div>
        <div>
          <dt className="font-semibold">What changed</dt>
          <dd className="mt-1 text-muted">{change}</dd>
        </div>
      </dl>
      <div className="mt-4 space-y-4 border-t pt-4">{children}</div>
    </section>
  );
}

function Compare({ before, after, note }: { before: ReactNode; after: ReactNode; note?: string }) {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl surface-muted p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Before (live)</p>
          {before}
        </div>
        <div className="rounded-xl surface-muted p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-700 dark:text-primary-300">After (QA)</p>
          {after}
        </div>
      </div>
      {note ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ol>
  );
}

function Frames({
  frames,
}: {
  frames: { label: string; src: string; w: number; h: number; scale?: number }[];
}) {
  return (
    <div className="hidden flex-wrap items-start gap-6 lg:flex">
      {frames.map((f) => {
        const s = f.scale ?? 1;
        return (
          <figure key={f.label} className="shrink-0">
            <figcaption className="mb-2 text-xs font-semibold text-muted">{f.label}</figcaption>
            <div className="overflow-hidden rounded-2xl border shadow-soft" style={{ width: f.w * s, height: f.h * s }}>
              <iframe
                title={f.label}
                src={f.src}
                width={f.w}
                height={f.h}
                style={{ transform: `scale(${s})`, transformOrigin: "0 0", border: 0 }}
              />
            </div>
          </figure>
        );
      })}
    </div>
  );
}
