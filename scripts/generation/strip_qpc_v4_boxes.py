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

Second pass: ~480 more entry-14 layers hold one or two such boxes (stacked,
as on سَبِيلِهِۦٓۚ in 9:9) next to real marks in the same glyph. Only the box
contours (a 4-point rectangle with another drawn just inside it) are cut
from those glyphs; a layer left empty is dropped.

Usage (needs: pip install fonttools brotli):
    python3 scripts/generation/strip_qpc_v4_boxes.py [--dry-run]
Idempotent: fonts without box layers are left untouched.
"""
import pathlib
import sys

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables import ttProgram
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates

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


def box_contours(glyph, glyf) -> set:
    """Indexes of the contours that form hollow boxes: an axis-aligned 4-point
    rectangle with another one just inside it (a thin outline)."""
    if glyph.isComposite() or glyph.numberOfContours <= 0:
        return set()
    coords, ends, _ = glyph.getCoordinates(glyf)
    rects, start = [], 0
    for i, end in enumerate(ends):
        pts = coords[start : end + 1]
        start = end + 1
        xs, ys = {p[0] for p in pts}, {p[1] for p in pts}
        if len(pts) == 4 and len(xs) == 2 and len(ys) == 2:
            rects.append((i, min(xs), min(ys), max(xs), max(ys)))
    found = set()
    for outer in rects:
        for inner in rects:
            if outer is inner:
                continue
            margins = (inner[1] - outer[1], inner[2] - outer[2], outer[3] - inner[3], outer[4] - inner[4])
            if all(0 < m < 60 for m in margins):
                found |= {outer[0], inner[0]}
    return found


def cut_contours(glyph, glyf, drop: set) -> None:
    coords, ends, flags = glyph.getCoordinates(glyf)
    new_coords, new_flags, new_ends, start = [], [], [], 0
    for i, end in enumerate(ends):
        if i not in drop:
            new_coords.extend(coords[start : end + 1])
            new_flags.extend(flags[start : end + 1])
            new_ends.append(len(new_coords) - 1)
        start = end + 1
    glyph.coordinates = GlyphCoordinates(new_coords)
    glyph.flags = bytearray(new_flags)
    glyph.endPtsOfContours = new_ends
    glyph.numberOfContours = len(new_ends)
    # Hinting refers to point numbers; these marks don't need it.
    glyph.program = ttProgram.Program()
    glyph.program.fromBytecode(b"")
    glyph.recalcBounds(glyf)


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
        # Second pass: boxes drawn inside a layer that also has real marks.
        glyf = font["glyf"]
        cut = set()
        for base in list(colr.ColorLayers):
            layers = colr.ColorLayers[base]
            kept = []
            for layer in layers:
                if layer.colorID == BOX_PALETTE_ENTRY and layer.name not in cut:
                    glyph = glyf[layer.name]
                    drop = box_contours(glyph, glyf)
                    if drop:
                        cut.add(layer.name)
                        removed += 1
                        if len(drop) == glyph.numberOfContours:
                            glyf[layer.name] = Glyph()  # nothing but boxes
                            continue
                        cut_contours(glyph, glyf, drop)
                elif layer.name in cut and glyf[layer.name].numberOfContours == 0:
                    continue
                kept.append(layer)
            colr.ColorLayers[base] = kept
        if removed:
            total += removed
            print(f"{path.name}: {removed} box layer(s) / glyph(s)")
            if not dry_run:
                font.flavor = "woff2"
                font.save(path)
    print(f"{'Would remove' if dry_run else 'Removed'} {total} box layers.")


if __name__ == "__main__":
    main()
