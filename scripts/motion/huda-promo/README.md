# HuDa motion promo

A 14-second, seamlessly looping UI motion piece built entirely in code: one HTML
file rendered frame by frame with Playwright. No After Effects, no timeline tool.
It lives outside the app and touches no production code.

## Run

```bash
./render.sh stills   # out/beats.png: one frame per beat, for review
./render.sh          # out/huda-promo.mp4: 1440×1440, 60 fps, motion blur, UI sound bed
```

Open `index.html` in a browser for a live preview. `index.html?t=8.6` freezes a single frame.

Requires Node with Playwright, Python 3 with numpy, and ffmpeg (falls back to
`imageio-ffmpeg` when no `ffmpeg` is on the PATH). Fonts are fetched once into
`.cache/`. Everything under `out/` and `.cache/` is git-ignored.

## Beat grid: 120 BPM, 7 bars, 28 beats

| Bar | Beat 1 | Beat 2 | Beat 3 | Beat 4 |
|---|---|---|---|---|
| 1 | ① Button, cursor in | Click | ② Loader | ③ Check |
| 2 | ④ Surah island | Click → ⑤ Player | Play → pause morph | Ayah 1 → 2 |
| 3 | Grab progress knob | ⑥ Scrub to ayah 5 | Release → ⑦ Volume | Grab knob |
| 4 | Drag past max (stretch) | Release, spring back | ⑧ Tajweed toggle | Flip on |
| 5 | Knob → ⑨ Reciter tabs | Sudais (liquid) | Husary (liquid) | ⑩ Weekly chart |
| 6 | Bars draw | Hover Fri tooltip | ⑪ ⌘K | Type "y", 3 results |
| 7 | "yasin", 1 result | Enter | ⑫ Toast | → ① Button (loop) |

## How it works

| Rule | Where |
|---|---|
| Every style is a pure function of time inside `seek(t)`: no CSS transitions, timers or carried state | `index.html` → `seek` |
| Springs are closed-form step responses. A value that changes target many times is the sum of one spring per change, also summed over the previous two loops, so `t = T` meets `t = 0` in value *and* velocity | `step`, `track` |
| The knob / tab indicator's two edges ride different springs: the leading edge is fast, the trailing edge lags, so it stretches | `kL`, `kR` |
| Drags are direct manipulation: while held, the value comes from the cursor's position. On release it springs back from wherever it was | `progress`, `volume`, `stretch` |
| Content swaps inside the morphing shape use separate exit (100 ms) and delayed enter (200 ms) blur timings, so text never overlaps | `vis` |
| The camera zooms per state; the cursor is drawn in screen space at a constant size | `STATES`, `seek` |
| `render.mjs` renders 240 fps and ffmpeg `tmix` blends 4 subframes → 60 fps with motion blur | `render.mjs full` |
| Sounds are synthesised (no music) and placed by their measured peak. Tails wrap across the loop point | `sounds.py` |

The render prints a seam check (`Δvalue`, `Δvelocity` across the loop point). Both should be ≈ 0.

## Design constraints

- HuDa tokens only (`tailwind.config.ts`): `sand-100` canvas, white and `charcoal-900` components, `primary-700` as the single accent. Poppins, with Uthmanic Hafs for the Arabic cover.
- Springs everywhere, with about 0.6 % overshoot at most. No bounce, glow, gradients or particles.
- Icons come in two families: filled media controls, and 2 px round stroked utilities on a 24 grid.
- No `will-change` on anything the camera scales, because it makes text render blurry.

## Editing

- Timing lives in `STATES` (shape), `WIN` (content windows), `CURSOR` and `PRESSES`. Keep every track's last value equal to its first so it loops.
- Sound cues come from `buildCues()` in `index.html`. `render.mjs` writes them to `out/cues.json` for `sounds.py`, so the picture is the single source of truth.
- After any change, run `./render.sh stills` and check every beat before running the full render.
