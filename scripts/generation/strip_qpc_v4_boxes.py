#!/usr/bin/env python3
"""
Remove stray empty boxes from the QPC v4 Tajweed page fonts (public/fonts/qpc-v4).

Some word glyphs (529 across the 604 fonts, e.g. فِيهِ ۛ in 2:2, مَرَضًۭا ۖ in
2:10) carry an extra COLR layer that is just a hollow rectangle: two 4-point,
axis-aligned contours (outer + inner) in palette entry 14. It is an artefact
of the font build (mostly on words just before a pause mark, which is its own
glyph) and shows as a small outlined square under the word. Entry 14 is also
used by ~2,500 real letter layers, so it can't be hidden with a palette
override; the box layers are dropped from the fonts instead.

Usage (needs: pip install fonttools brotli):
    python3 scripts/generation/strip_qpc_v4_boxes.py [--dry-run]
Idempotent: fonts without box layers are left untouched.
"""
import pathlib
import sys

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

FONT_DIR = pathlib.Path(__file__).resolve().parents[2] / "public" / "fonts" / "qpc-v4"
BOX_PALETTE_ENTRY = 14


def is_hollow_box(glyph_set, name: str) -> bool:
    """Two closed contours of 4 straight points each, both axis-aligned rectangles."""
    pen = RecordingPen()
    glyph_set[name].draw(pen)
    contours, current = [], None
    for op, args in pen.value:
        if op == "moveTo":
            current = [args[0]]
        elif op == "lineTo":
            current.append(args[0])
        elif op in ("qCurveTo", "curveTo"):
            return False
        elif op in ("closePath", "endPath"):
            contours.append(current)
    if len(contours) != 2:
        return False
    for c in contours:
        if len(c) != 4 or len({p[0] for p in c}) != 2 or len({p[1] for p in c}) != 2:
            return False
    return True


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    total = 0
    for path in sorted(FONT_DIR.glob("p*.woff2"), key=lambda p: int(p.stem[1:])):
        font = TTFont(path)
        colr = font["COLR"]
        glyph_set = font.getGlyphSet()
        removed = 0
        for base in list(colr.ColorLayers):
            layers = colr.ColorLayers[base]
            kept = [
                layer
                for layer in layers
                if not (layer.colorID == BOX_PALETTE_ENTRY and is_hollow_box(glyph_set, layer.name))
            ]
            if len(kept) != len(layers):
                removed += len(layers) - len(kept)
                colr.ColorLayers[base] = kept
        if removed:
            total += removed
            print(f"{path.name}: {removed} box layer(s)")
            if not dry_run:
                font.flavor = "woff2"
                font.save(path)
    print(f"{'Would remove' if dry_run else 'Removed'} {total} box layers.")


if __name__ == "__main__":
    main()
