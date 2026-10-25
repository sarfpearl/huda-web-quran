# Uthmani Font — Changes Log

Snapshot: 2026-10-25. Collected from the code, `HANDOFF.md`, `docs/TODO.md` and git history.

Two font families draw the Uthmani (Madani) script:

| Family | Used for | Files |
|---|---|---|
| **KFGQPC Uthmanic Script HAFS v0.18** (`'Uthmanic Hafs'`) | Plain Arabic text (Tajweed off on WebKit, reading-view fallback, search/topic text) | `public/fonts/UthmanicHafs1Ver18.woff2` |
| **QPC V4 Tajweed page fonts** (COLRv1, 604 fonts) | Tajweed mode — one glyph per word, colours inside the font | `public/fonts/qpc-v4/p1…p604.woff2` |

## 1. Uthmanic Hafs (text font)

| # | Change | Why | Where |
|---|---|---|---|
| 1 | Upgraded **v0.09 → v0.18** (the build Quran.com ships) | v0.09 could not draw U+06ED | `src/app/globals.css` `@font-face` |
| 2 | Text source switched to **`text_qpc_hafs`** (KFGQPC-encoded) | Tanzil `text_uthmani` showed dotted-circle placeholders in this font | `scripts/generation/fetch-qpc-v4.mjs`, `quran-glyphs/*.json` |
| 3 | No `local()` in `src` | An older installed copy would win | `globals.css` |
| 4 | `font-display: block` + `<link rel="preload">` | No Amiri fallback flash | `globals.css`, `src/app/layout.tsx` |
| 5 | Fallback stack: `'Uthmanic Hafs', Amiri, 'Traditional Arabic', 'Scheherazade New', serif` (`--font-arabic`) | Amiri self-hosted via `next/font/local` (#780f6b9) | `globals.css`, `src/app/fonts.ts` |
| 6 | `.font-arabic :where(span, div, p) { font-family: inherit }` | Global Poppins rule broke per-word spans → kasra stacked under shaddah | `globals.css` |
| 7 | `font-feature-settings: normal` on `.font-arabic` | Poppins cv02/03/04/11 leaked into Quran fonts and remapped glyphs | `globals.css` |
| 8 | Tanzil fallback text (`.quran-tanzil`) drawn in **Amiri**, not Hafs | Hafs draws U+06DF as a dotted circle | `globals.css`, `CenterVerseDisplay.tsx`, `ReadingView.tsx`, `TopicPickerModal.tsx` |
| 9 | End-of-ayah marker = Arabic-Indic digits alone (no U+06DD) | Font's digit glyphs already are the rosette; U+06DD drew a second ornament | `CenterVerseDisplay.tsx` `AyahOrnament` |
| 10 | Sajdah line as a CSS background gradient, not `text-decoration` | Font's overline sits far above the letters | `globals.css` `.quran-word--sajdah` |
| 11 | Word gap `max(0.375rem, 0.35em)` (font space is 0.22em) | Even gaps, floored at Quran.com's value | `CenterVerseDisplay.tsx` (f6f0551, c63d320) |
| 12 | Tight text-shadow `.quran-arabic-shadow` | Legible on video without thickening fine strokes | `globals.css` |

## 2. QPC V4 Tajweed page fonts — **font files modified**

| # | Change | Why | Where |
|---|---|---|---|
| 1 | **Removed stray hollow-box COLR layers** — 529 whole layers (palette entry 14), then ~480 more box contours cut from mixed layers | Font-build artefact: small outlined square under words (2:2, 2:10, 9:9 …) | `scripts/generation/strip_qpc_v4_boxes.py` (952ed2f) |
| 2 | Palettes via `@font-palette-values`: Tajweed = base-palette **1** (dark), Plain = base-palette **4** (all white) | No CSS recolouring of text | `src/lib/data/quranGlyphs.ts` |
| 3 | Ayah ornament: entries 10–12 → transparent, 13 → white | White outline rosette, no filled disc on the video | `quranGlyphs.ts` |
| 4 | Recited word gold `#fcd34d`: Tajweed entries 0, 14; Plain entries 0–9, 14, 15 | Gold highlight keeps Tajweed colours | `quranGlyphs.ts` |
| 5 | Per-glyph ink padding (canvas metrics) | Mushaf glyphs' ink overflows their advance | `quranGlyphs.ts` `glyphInkPadding` |
| 6 | 37:130 word 3 split into two glyphs | Reciter timings count it as two words | `fetch-qpc-v4.mjs` `SPLIT_POSITIONS` |
| 7 | WebKit: page fonts only while Tajweed is on; shadows off (`data-wk-glyph-lite`) | Real iPhone web-content crash | `quranGlyphs.ts` `isWebKit`, `globals.css` |
| 8 | QA: palette 1 identical in all 604 fonts; legend = palette; contrast ≥ 3:1 | Verify Tajweed colours | `scripts/qa/tajweed-colours.py` |

## Rules (HANDOFF.md)

- Arabic text: `text_qpc_hafs` with Hafs v0.18. **Never edit Quran text to fix rendering.**
- Tajweed: QPC V4 COLRv1 glyph fonts (one glyph per word).
