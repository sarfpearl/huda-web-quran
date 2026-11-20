# Mobile speed audit — November 2026

Scope: Core Web Vitals (LCP, CLS, INP/TBT) of www.hudaguidance.com on mobile,
for `/`, `/surah/36`, `/surah/36/read` and `/juz/1`.

## How it was measured

The keyless PageSpeed Insights API answered `429 — quota 0 per day` (Google
no longer gives keyless calls any quota), so the same engine was run locally:
Lighthouse 12.6.1, `--form-factor=mobile`, default simulated throttling
(slow 4G, 4× CPU), headless Chrome, one run per page. Numbers move a few
points between runs; treat them as ±5.

## Before (live site, 2026-11-20)

| Page | Score | FCP | LCP | TBT | CLS | Speed Index | Page weight |
|---|---|---|---|---|---|---|---|
| `/` | 86 | 1.3 s | 3.5 s | 10 ms | 0.001 | 5.6 s | 2,286 KiB |
| `/surah/36` | 91 | 1.0 s | 2.4 s | 20 ms | 0 | 7.2 s | 2,670 KiB |
| `/surah/36/read` | 92 | 1.2 s | 3.3 s | 30 ms | 0 | 1.7 s | 685 KiB |
| `/juz/1` | 88 | 1.0 s | 3.5 s | 20 ms | 0 | 4.7 s | 1,968 KiB |

CLS and TBT are already good (an earlier pass, `ede4cf6`, fixed CLS and
self-hosted the fonts). LCP is the only weak metric.

LCP element: on `/`, `/surah/*` and `/juz/*` it is the **splash logo**
(`/huda-logo.webp`, 43 KB). Breakdown on `/`: TTFB ~1.0 s (simulated),
load delay ~1.0 s, load time ~1.4 s — the logo shares the slow-4G link with
the 160 KB scene image, the 86 KB Uthmanic Hafs font, CSS and the player
scripts. On `/surah/36/read` it is the first Tamil meaning paragraph.

Top Lighthouse opportunities (all pages): unused JS 55–73 KiB, properly size
images 140–400 KiB (scene art and reciter photos from R2), image delivery,
legacy JS 11 KiB, render-blocking CSS (~20 KB, Next.js default), font
display on the QPC v4 page fonts.

## What was changed (this PR)

### meaningStops.json is no longer in the player's main script

`src/lib/data/meaningStops.json` (where each reciter's voice really ends
after each ayah, used only to place meaning-audio cues) was a static import
of `src/lib/data/meaningAudio.ts`, so all of it — 393 KB raw, **168 KB
gzipped** — sat inside the main app chunk that every player page downloads,
parses and runs before the app is interactive. That was 53 % of the chunk.

Now it is a dynamic `import()` → its own chunk:

- loaded at once when meaning audio is on, otherwise 1.5 s after the
  page's `load` event (so it never competes with the first paint);
- `meaningStopsFor()` keeps its synchronous signature and returns `null`
  until it arrives — exactly what it already returned for a Surah that was
  not measured (the cue falls back to just after the last timed word);
- `ImmersiveHomeClient` recomputes the meaning cues when it arrives
  (`useMeaningStopsReady`), so with meaning audio on the measured stops are
  used as soon as the chunk lands (normally well before the first ayah ends);
- the generation/QA scripts (`build-meaning-stops.mjs`,
  `meaning-stops-qa.mjs`) are unchanged: the JSON stays where it is.

Main app chunk: **925 KB → 533 KB raw, 317 KB → 148 KB gzipped.**

### After (local production builds, same machine, `main` vs this branch)

Both built with `next build` and served with `next start` on this laptop,
Lighthouse mobile, two runs each. Absolute numbers are worse than the live
site (no Vercel CDN, a busy laptop CPU) and noisy; compare the columns, not
with the table above.

| Page | `main` score (2 runs) | branch score | `main` LCP | branch LCP | JS transferred |
|---|---|---|---|---|---|
| `/` | 77 / 75 | 79 / 84 | 5.9 / 6.0 s | 5.2 / 4.3 s | 609 → 446 KiB |
| `/surah/36` | 81 / 73 | 75 / 77 | 4.3 / 5.9 s | 5.0 / 5.1 s | 609 → 446 KiB |
| `/juz/1` | 75 / 75 | 76 / 85 | 5.8 / 5.9 s | 5.0 / 4.1 s | 609 → 446 KiB |
| `/surah/36/read` | 86 / 84 | 84 / 80 | 4.1 / 4.3 s | 4.3 / 5.0 s | 610 → 447 KiB |

The clear, repeatable gain is **163 KiB less JavaScript on every page**
(−27 %), which is also less parse/compile on slow phones. Player-page LCP
averages 5.6 s → 4.8 s locally. CLS is unchanged (≈0). The reading page
was untouched; its spread is run-to-run noise. Real-world numbers will show
in Search Console's Core Web Vitals report a few weeks after merge.

Checked on the branch build: home splash and scene look the same; Surah 36
opens, Bismillah plays with word-by-word highlighting; the stops chunk loads
on its own ~1.5 s after page load; no new console errors (only Vercel
Analytics' script 404s, as it always does off Vercel).
Not checked in the browser: a full ayah with meaning audio switched on.

## Looked at and left alone (and why)

- **Splash logo (the LCP image).** Re-encoding without a lossless source
  saves only ~6 KB at q80 (PSNR 37 dB; its 20 KB lossless alpha plane is most
  of the file) — not worth a visible change. Its size, preload and
  `fetchpriority="high"` are already right. The splash itself (minimum 1.7 s)
  is the app's design and was not touched.
- **Logo + Uthmanic font downloaded on `/surah/<n>/read`.** The root layout
  preloads both and the splash `<img>` downloads even though CSS hides the
  splash there. Fixing it needs the reading pages to opt out of the splash
  markup — `src/app/surah/[surah]/read/*` is owned by another session right
  now. Follow-up: ~130 KB less on every reading page, likely LCP −0.3 s there.
- **Uthmanic Hafs preload (86 KB) on player pages.** It is used on the home
  screen too (verse markers, salam) with `font-display: block`; dropping the
  preload would delay that text.
- **Scene images and reciter photos (R2) are bigger than shown.** They are
  `unoptimized` on purpose: routing them through Vercel Image Optimization
  would use the free tier's limited transformation quota. Smaller variants
  would need new R2 uploads (media hosting is out of scope). Biggest single
  win left: ~140–400 KiB per page.
- **QPC v4 page fonts use `font-display: block`.** They are glyph fonts
  (private-use code points); a fallback would draw boxes, so block is right.
- **Legacy JS polyfills (11 KiB).** Removing them means raising the browser
  baseline (older iPhones); not worth it for 11 KiB.
- **Render-blocking CSS (20 KB).** Next.js's normal single stylesheet;
  inlining critical CSS is not supported cleanly in the App Router.
- **Rest of the main chunk (`ImmersiveHomeClient`, `AudioPlayerContext`,
  data tables such as `quranVerses.ts`, `quran-artwork.ts`).** Splitting the
  player itself is a larger refactor with behaviour risk; TBT is already
  10–30 ms, so the gain would be small.

## Re-measuring

Once a Google API key is available (free, Google Cloud console), PSI can be
called with `&key=…`; otherwise run Lighthouse locally as above. Field data
(CrUX) for the site appears in Search Console → Core Web Vitals once there is
enough traffic.
