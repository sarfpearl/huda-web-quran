#!/usr/bin/env python3
"""Tajweed colour check.

1. Every QPC V4 page font (public/fonts/qpc-v4/p1..604.woff2) carries the same
   dark Tajweed palette (CPAL palette 1, the one quranGlyphs.ts selects).
2. The legend the app shows (TAJWEED_LEGEND in src/lib/data/quranGlyphs.ts)
   lists exactly those palette colours.
3. Contrast of each colour on the dark scene (#0e100f) — WCAG large text
   needs 3:1. (Over a bright scene the verse relies on its text shadow; see
   docs/TODO.md item 10.)

Needs fontTools + brotli (woff2):  python3 -m venv .venv && .venv/bin/pip install fonttools brotli
Usage: .venv/bin/python scripts/qa/tajweed-colours.py
"""
import collections
import pathlib
import re
import sys

from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
FONTS = ROOT / "public/fonts/qpc-v4"
GLYPHS_TS = ROOT / "src/lib/data/quranGlyphs.ts"
SCENE = "#0e100f"
# Palette-1 entries that colour letters by rule (0 / 13 / 14 are the base
# white, 10–12 the ayah ornament, 1 / 15 near-greys for silent letters).
RULE_ENTRIES = [2, 3, 4, 5, 6, 7, 8, 9]


def hexc(c):
    return "#%02x%02x%02x" % (c.red, c.green, c.blue)


def lum(h):
    def lin(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (int(h[i : i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contrast(a, b):
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


failures = 0
palettes = collections.Counter()
for p in range(1, 605):
    font = TTFont(FONTS / f"p{p}.woff2", lazy=True)
    palettes[tuple(hexc(c) for c in font["CPAL"].palettes[1])] += 1
if len(palettes) != 1:
    failures += 1
    print(f"FAIL palette 1 differs between pages: {len(palettes)} variants")
palette = next(iter(palettes))
print(f"ok   palette 1 identical in {sum(palettes.values())} page fonts")

legend = re.findall(r'color: "(#[0-9a-fA-F]{6})", en: "([^"]+)"', GLYPHS_TS.read_text())
rule_colours = {palette[i].lower() for i in RULE_ENTRIES}
for colour, name in legend:
    ok = colour.lower() in rule_colours
    failures += not ok
    c = contrast(colour, SCENE)
    print(f"{'ok  ' if ok else 'FAIL'} legend {name:28} {colour}  in font: {ok}  contrast on scene {c:.2f}{'' if c >= 3 else '  < 3:1'}")
missing = rule_colours - {c.lower() for c, _ in legend}
if missing:
    failures += 1
    print(f"FAIL font rule colours not in the legend: {sorted(missing)}")
sys.exit(1 if failures else 0)
