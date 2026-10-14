#!/usr/bin/env python3
"""
HuDa Web Quran — IndoPak Tajweed colours (PROTOTYPE)
----------------------------------------------------
There is no Tajweed-coloured IndoPak text or font, so the colours are worked
out per letter and carried onto the IndoPak words, to match the King Fahd
Complex QPC V4 Tajweed fonts the app draws for the Uthmani script:

  1. Rules per letter: tarekeldeeb/quran-tajweed-embedded (CC BY 4.0), as
     codepoint offsets into the Tanzil Uthmani text — with the QPC
     conventions: a rule colours its own word only, and an idgham without
     ghunnah greys only the merging noon / tanween.
  2. Colours that data has no rule for — Tafkhim (heavy letters, dark blue)
     and a madd ʿāriḍ at a pause mark inside an ayah — come from the QPC V4
     reference itself: a plain IndoPak letter that can carry the rule (خ ص ض
     غ ط ق ظ / ر / a lam of لله; ا و ي) takes the colour where a V4 layer
     contour of that colour covers the letter's position in the word.
  3. Uthmani and IndoPak (public/data/quran-indopak, same word positions)
     letter clusters aligned (LCS on normalised letters); a coloured letter
     colours its IndoPak cluster, a coloured mark alone the like mark there
     (tanween, madd), else the cluster.
  4. Ligatures: a browser paints a glyph in ONE colour — the colour of the
     first character it was shaped from — and the IndoPak font's `liga`
     feature draws some letter pairs as one glyph (يۡن, تر, بر, لله, لا …).
     A colour change inside such a glyph would spread over the whole glyph or
     vanish, so each word is shaped with the font itself (HarfBuzz, as the
     browser does) and where that happens the word is drawn with `liga` off
     (listed in `nl`) — unless that would break a lam-alef (لا must stay one
     glyph); then the glyph takes the colour it will really be painted in.
     The data therefore always equals what is painted.
  5. QA, positional: each word's painted colour segments (HarfBuzz glyph
     boxes, IndoPak font) against the coloured layers of its QPC V4 word
     glyph (public/fonts/qpc-v4, COLRv0, dark palette), both as fractions of
     the word's width from its right edge: missing / extra / wrong colour /
     shifted segments are reported.

Colours are TAJWEED_LEGEND indexes (src/lib/data/quranGlyphs.ts).

Rule data (not committed, ~7 MB) — a directory with:
  https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.embeded.txt
  https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.uthmani-pause-sajdah.json
or a fixture JSON with the same data for some ayahs
(scripts/generation/fixtures/tajweed-2-1-20.json: Al-Baqarah 1–20).

Output:
  public/data/quran-indopak-tajweed/<surah>.json
    [ { a: ayah, w: [ [ [text, colour | null], ... ], ... ], nl?: [word indexes drawn with liga off] } ]

Usage (fontTools, brotli, uharfbuzz):
  python3 scripts/generation/build-indopak-tajweed.py <rule data> <surah> [fromAyah] [toAyah] [--report out.md]
Tests: python3 -m unittest scripts/generation/test_build_indopak_tajweed.py
"""
import io
import json
import re
import sys
from collections import Counter
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
GLYPHS = ROOT / "public/data/quran-glyphs"
INDOPAK = ROOT / "public/data/quran-indopak"
FONTS = ROOT / "public/fonts"
INDOPAK_FONT = FONTS / "indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2"
OUT = ROOT / "public/data/quran-indopak-tajweed"

# TAJWEED_LEGEND indexes.
SILENT, MADD2, MADD246, MUTTASIL, MADD6, GHUNNAH, QALQALAH, TAFKHIM = range(8)
LEGEND = ["#999999", "#ffc1e0", "#ff8e3b", "#ff5e8e", "#e30000", "#26b55d", "#00deff", "#3c84d5"]
NAMES = ["silent", "madd 2", "madd 2/4/6", "madd 4/5", "madd 6", "ghunnah", "qalqalah", "tafkhim"]
NEAR = {"#9d9999": SILENT, "#919999": SILENT}
WHITE = {"#ffffff", "#fbffff"}
COLOUR = {
    "silent": SILENT, "hamzat_wasl": SILENT, "lam_shamsiyyah": SILENT,
    "idghaam_no_ghunnah": SILENT, "idghaam_mutajaanisain": SILENT, "idghaam_mutaqaaribain": SILENT,
    "madd_2": MADD2, "madd_246": MADD246, "madd_munfasil": MUTTASIL, "madd_muttasil": MUTTASIL, "madd_6": MADD6,
    "ghunnah": GHUNNAH, "idghaam_ghunnah": GHUNNAH, "idghaam_shafawi": GHUNNAH,
    "ikhfa": GHUNNAH, "ikhfa_shafawi": GHUNNAH, "iqlab": GHUNNAH,
    "qalqalah": QALQALAH,
}
# Rules that merge a noon / meem / tanween into the next word's first letter:
# QPC greys the merged noon / tanween (or leaves the meem) and, with a
# ghunnah, colours the letter it merges into: (own word, next letter).
MERGE = {
    "idghaam_no_ghunnah": (SILENT, None),
    "idghaam_mutajaanisain": (SILENT, None),
    "idghaam_mutaqaaribain": (SILENT, None),
    "idghaam_ghunnah": (SILENT, GHUNNAH),
    "idghaam_shafawi": (None, GHUNNAH),
}

NORM = {
    "ٱ": "ا", "أ": "ا", "إ": "ا", "آ": "ا", "ٲ": "ا", "ٳ": "ا",
    "ک": "ك", "ڪ": "ك",
    "ی": "ي", "ى": "ي", "ے": "ي", "ئ": "ي",
    "ہ": "ه", "ھ": "ه", "ة": "ة", "ؤ": "و",
}
LETTER = re.compile(r"[ء-غف-يٱ-ۓە]")
PLAIN = re.compile(r"[\sۖ-ۜ۞۩​-‏]")
TANWEEN = set("ًࣰٌࣱٍࣲٗٞ")
MADD = set("ٰٓۤ")
MARK_CLASS = [TANWEEN, MADD, set("ۭۢ")]
HEAVY = set("خصضغطقظ")
# What a rule colours (QPC): a madd its madd letter / mark, a ghunnah family
# rule its noon / meem / tanween — the letter carrying it keeps its own colour.
# (A necessary madd keeps its whole span: QPC colours the letters of الٓمٓ red.)
MADD_RULES = {"madd_2", "madd_246", "madd_munfasil", "madd_muttasil"}
MADD_CHARS = set("اويىٰٓۥۦۤ")
NASAL_RULES = {"ghunnah", "ikhfa", "ikhfa_shafawi", "iqlab"}
IQLAB_MARKS = set("ۭۢ")  # small meem
NASAL_MARKS = IQLAB_MARKS | TANWEEN
NASAL_CHARS = set("نم") | NASAL_MARKS
PAUSE = re.compile(r"[ۖ-ۜ]")


def is_letter(c):
    return bool(LETTER.match(c))


def clusters(chars):
    """Letter clusters: [{'base', 'idx'}] (leading marks join the first)."""
    out = []
    for i, c in enumerate(chars):
        if is_letter(c) or not out:
            out.append({"base": NORM.get(c, c) if is_letter(c) else "", "idx": [i]})
        else:
            out[-1]["idx"].append(i)
    return out


def align(a, b):
    """LCS of two cluster lists by letter: {i in a: j in b}."""
    n, m = len(a), len(b)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            same = a[i]["base"] and a[i]["base"] == b[j]["base"]
            dp[i][j] = dp[i + 1][j + 1] + 1 if same else max(dp[i + 1][j], dp[i][j + 1])
    pairs, i, j = {}, 0, 0
    while i < n and j < m:
        if a[i]["base"] and a[i]["base"] == b[j]["base"]:
            pairs[i] = j
            i, j = i + 1, j + 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    return pairs


# ── Rule data ───────────────────────────────────────────────────────────────

def load_rules(path):
    """{(surah, ayah): text}, {(surah, ayah): annotations} — the two files in a
    directory, or a fixture JSON {"text": {"s:a": …}, "rules": {"s:a": […]}}."""
    path = Path(path)
    if path.is_file():
        fx = json.loads(path.read_text(encoding="utf8"))
        key = lambda k: tuple(int(x) for x in k.split(":"))
        return {key(k): v for k, v in fx["text"].items()}, {key(k): v for k, v in fx["rules"].items()}
    text = {}
    for line in (path / "tajweed.hafs.embeded.txt").read_text(encoding="utf8").split("\n"):
        p = line.split("|")
        if len(p) == 3:
            text[(int(p[0]), int(p[1]))] = re.sub("[a-z]", "", p[2])
    rules = {(r["surah"], r["ayah"]): r["annotations"]
             for r in json.loads((path / "tajweed.hafs.uthmani-pause-sajdah.json").read_text())}
    return text, rules


def ayah_colours(text, annotations, shift):
    """Colour per character of an Uthmani ayah, from its rule annotations."""
    chars = list(text)
    colour = [None] * len(chars)
    for r in annotations:
        s, e = r["start"] - shift, r["end"] - shift
        if r["rule"] not in COLOUR or s < 0 or e > len(chars):
            continue
        merge = MERGE.get(r["rule"])
        if not merge:
            span = []
            for k in range(s, e):
                if chars[k] == " ":
                    break  # colours its own word only
                span.append(k)
            only = MADD_CHARS if r["rule"] in MADD_RULES else NASAL_CHARS if r["rule"] in NASAL_RULES else None
            if only:
                span = [k for k in span if chars[k] in only] or span
            if r["rule"] in NASAL_RULES and any(chars[k] in NASAL_MARKS for k in span):
                # On a tanween / small meem: QPC colours the mark, not the letter under it.
                span = [k for k in span if chars[k] in NASAL_MARKS]
            for k in span:
                colour[k] = COLOUR[r["rule"]]
            continue
        own, nxt = merge
        space = next((k for k in range(s, e) if chars[k] == " "), None)
        for k in range(s, space if space is not None else e):
            if own is not None and (chars[k] in TANWEEN or chars[k] == "ن"):
                colour[k] = own
        if nxt is not None and space is not None:
            # The next word's first letter, with its marks.
            k = space + 1
            colour[k] = nxt
            k += 1
            while k < len(chars) and chars[k] != " " and not is_letter(chars[k]):
                colour[k] = nxt
                k += 1
    return colour


def map_word(wchars, wcol, ip, stats=None):
    """The Uthmani word's colours onto its IndoPak spelling: colour per IndoPak
    character (None = plain)."""
    stats = stats if stats is not None else Counter()
    ichars = list(ip)
    ucl, icl = clusters(wchars), clusters(ichars)
    pairs = align(ucl, icl)
    matched = set(pairs.values())
    icol = [None] * len(ichars)
    for ci, cl in enumerate(ucl):
        hit = [k for k in cl["idx"] if wcol[k] is not None]
        if not hit:
            continue
        stats["coloured letters"] += 1
        j = pairs.get(ci)
        if j is None:
            stats["lost (no IndoPak letter)"] += 1
            continue
        target = [k for k in icl[j]["idx"] if not PLAIN.match(ichars[k])]
        base_c = wcol[cl["idx"][0]]
        if base_c is not None:
            for k in target:
                icol[k] = base_c
        # Marks with a colour of their own: onto the like marks in IndoPak
        # (else, with no coloured letter, the whole cluster).
        for k in hit:
            c = wcol[k]
            if k == cl["idx"][0] or c == base_c:
                continue
            like = [cls for cls in MARK_CLASS if wchars[k] in cls]
            marks = [t for t in target[1:] if any(ichars[t] in cls for cls in like)]
            if not marks and wchars[k] in MADD and j + 1 < len(icl) and j + 1 not in matched \
                    and icl[j + 1]["base"] in ("ا", "و", "ي"):
                # A small alef / maddah IndoPak spells out as a letter.
                marks = [t for t in icl[j + 1]["idx"] if not PLAIN.match(ichars[t])]
            if not marks and wchars[k] in MADD:
                # IndoPak writes the mark on the neighbouring letter (الصَّلٰوة:
                # the small alef on the lam, not the waw).
                for nb in (j - 1, j + 1):
                    if 0 <= nb < len(icl):
                        marks = [t for t in icl[nb]["idx"][1:] if any(ichars[t] in cls for cls in like) and icol[t] is None]
                        if marks:
                            break
            for t in marks or ([] if base_c is not None else target):
                icol[t] = c
    return icol


# ── Shaping: what the browser paints ────────────────────────────────────────

class Shaper:
    """The IndoPak font as HarfBuzz shapes it (the engine Chromium uses)."""

    def __init__(self, path=INDOPAK_FONT):
        f = TTFont(path)
        f.flavor = None
        data = io.BytesIO()
        f.save(data)
        self.font = hb.Font(hb.Face(hb.Blob(data.getvalue())))
        self.order = f.getGlyphOrder()

    def shape(self, text, liga=True):
        """[(first char index, glyph name, x0, x1)] in visual order, x in font units."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        # Characters keep their own clusters unless a glyph joins them (a ligature).
        buf.cluster_level = hb.BufferClusterLevel.MONOTONE_CHARACTERS
        hb.shape(self.font, buf, {} if liga else {"liga": False})
        out, x = [], 0
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            ext = self.font.get_glyph_extents(info.codepoint)
            gx = x + pos.x_offset + (ext.x_bearing if ext else 0)
            out.append((info.cluster, self.order[info.codepoint], gx, gx + (ext.width if ext else 0)))
            x += pos.x_advance
        return out

    def clusters(self, text, liga=True):
        """[(start, end)]: the character ranges shaped into one glyph unit."""
        starts = sorted({c for c, *_ in self.shape(text, liga)})
        return [(s, starts[i + 1] if i + 1 < len(starts) else len(text)) for i, s in enumerate(starts)]


def letter_boxes(shaper, ip):
    """Each IndoPak letter's position (its own glyph, liga off), as fractions
    of the word's width from the right: {char index: (r0, r1)}."""
    glyphs = [g for g in shaper.shape(ip, liga=False) if g[3] > g[2] and not PLAIN.match(ip[g[0]])]
    if not glyphs:
        return {}
    x0 = min(g[2] for g in glyphs)
    x1 = max(g[3] for g in glyphs)
    w = max(1, x1 - x0)
    return {c: ((x1 - gx1) / w, (x1 - gx0) / w) for c, _n, gx0, gx1 in glyphs if is_letter(ip[c])}


GUIDE_TOL = 0.04  # a letter centre this close to a reference segment is inside it
NEAREST = 0.25  # else the nearest letter that can carry the rule, this close at most


def from_reference(shaper, ip, icol, ref, colour, can_carry):
    """Colours the rule data has no rule for (Tafkhim; a madd at a pause
    mark), taken from the reference: a plain IndoPak letter that can carry
    the rule (`can_carry(chars, cluster index)`) gets `colour` where a
    reference segment of that colour covers the letter's centre."""
    chars = list(ip)
    boxes = letter_boxes(shaper, ip)
    segs = [s for s in ref if s[0] == colour]
    if not segs:
        return icol
    icol = list(icol)
    cl = clusters(chars)
    # Candidates: a letter, or the two lams of لله as one (QPC colours both).
    cand, units = {}, {}
    bases = [c["base"] for c in cl]
    for n, c in enumerate(cl):
        k = c["idx"][0]
        if k in boxes and icol[k] is None and can_carry(cl, n, chars):
            pair = [n - 1, n] if n >= 1 and bases[n - 1:n + 2] == ["ل", "ل", "ه"] else None
            if pair and pair[0] in cand:
                units[pair[0]].append(n)
                cand[pair[0]] = (cand[pair[0]] + sum(boxes[k]) / 2) / 2
                continue
            cand[n] = sum(boxes[k]) / 2
            units[n] = [n]
    # The two calligraphies place letters differently: a segment takes the
    # carrying letters inside it, else the nearest one (each letter once).
    taken = set()
    for s0, s1 in sorted((s[1], s[2]) for s in segs):
        inside = [n for n, mid in cand.items() if n not in taken and s0 - GUIDE_TOL <= mid <= s1 + GUIDE_TOL]
        if not inside:
            dist = {n: min(abs(mid - s0), abs(mid - s1)) for n, mid in cand.items() if n not in taken}
            best = min(dist, key=dist.get, default=None)
            inside = [best] if best is not None and dist[best] <= NEAREST else []
        taken.update(inside)
    for n in [m for t in taken for m in units[t]]:
        for j in cl[n]["idx"]:
            if icol[j] is None and not PLAIN.match(chars[j]):
                icol[j] = colour
    return icol


KASRA = set("\u0650\u064D")
VOWELS = set("\u064E\u064F\u064B\u064C\u0657\u065E\u08F0\u08F1") | KASRA


def vowel(chars, c):
    return next((chars[k] for k in c["idx"][1:] if chars[k] in VOWELS), None)


def prev_vowel(cl, n, chars):
    return next((v for v in (vowel(chars, c) for c in reversed(cl[:n])) if v), None)


def heavy_letter(cl, n, chars):
    """Can carry Tafkhim: خ ص ض غ ط ق ظ; a ر that isn't light — light with a
    kasra, or vowelless after a kasra (tarqiq); a lam of the name of Allah
    (لله) unless a kasra comes before it."""
    b = cl[n]["base"]
    if b in HEAVY:
        return True
    if b == "ر":
        v = vowel(chars, cl[n])
        return v not in KASRA and (v is not None or prev_vowel(cl, n, chars) not in KASRA)
    bases = [c["base"] for c in cl]
    for i in (n - 1, n):
        if i >= 0 and bases[i:i + 3] == ["ل", "ل", "ه"]:
            return prev_vowel(cl, i, chars) not in KASRA
    return False


def madd_letter(cl, n, chars):
    return cl[n]["base"] in ("ا", "و", "ي")


def is_lam_alef(chars, s, e):
    """A lam followed (marks aside) by an alef inside chars[s:e]."""
    letters = [NORM.get(c, c) for c in chars[s:e] if is_letter(c)]
    return any(a == "ل" and b == "ا" for a, b in zip(letters, letters[1:]))


def conflicts(shaper, ip, icol, liga=True):
    """Glyph units whose characters carry more than one colour."""
    return [(s, e) for s, e in shaper.clusters(ip, liga) if len(set(icol[s:e])) > 1]


def resolve_ligatures(shaper, ip, icol, notes=None):
    """(colours as painted, liga off?). A word whose colours change inside a
    ligature is drawn without `liga` when that leaves no lam-alef broken;
    otherwise each such glyph takes the colour of its first character — the
    one the browser paints it in."""
    notes = notes if notes is not None else []
    chars = list(ip)
    bad = conflicts(shaper, ip, icol)
    if not bad:
        return icol, False
    lam_alef = any(is_lam_alef(chars, s, e) for s, e in shaper.clusters(ip))
    if not lam_alef and not conflicts(shaper, ip, icol, liga=False):
        return icol, True
    icol = list(icol)
    for s, e in bad:
        painted = icol[s]
        if painted is None:
            # The first character is plain: a coloured madd mark in the glyph
            # unit would vanish — keep its colour on a mark that is its own
            # glyph, if the word has one, else note the loss.
            lost = {icol[k] for k in range(s, e) if icol[k] is not None}
            notes.append(f"ligature {''.join(chars[s:e])!r}: {sorted(lost)} painted plain")
        else:
            notes.append(f"ligature {''.join(chars[s:e])!r}: colour {painted} over the whole glyph")
        for k in range(s, e):
            icol[k] = painted
    return icol, False


def painted_segments(shaper, ip, icol, liga=True):
    """Coloured segments as painted: [(colour, r0, r1)], r = fraction of the
    word's width from its right edge. A glyph takes its first character's colour."""
    # The word's own ink: pause marks, spaces and joiners after it are left out.
    glyphs = [g for g in shaper.shape(ip, liga) if g[3] > g[2] and not PLAIN.match(ip[g[0]])]
    if not glyphs:
        return []
    x0 = min(g[2] for g in glyphs)
    x1 = max(g[3] for g in glyphs)
    w = max(1, x1 - x0)
    # Runs of one colour in visual order; a plain mark glyph between two
    # glyphs of a run doesn't break it, a plain letter does.
    segs, run = [], None
    for c, _name, gx0, gx1 in sorted(glyphs, key=lambda g: -g[3]):
        colour = icol[c]
        if colour is None:
            if is_letter(ip[c]) and run:
                segs.append(run)
                run = None
            continue
        r0, r1 = (x1 - gx1) / w, (x1 - gx0) / w
        if run and run[0] == colour:
            run = (colour, min(run[1], r0), max(run[2], r1))
        else:
            if run:
                segs.append(run)
            run = (colour, r0, r1)
    if run:
        segs.append(run)
    return merge_segments(segs)


def paint_errors(shaper, ip, icol, liga=True):
    """Characters whose data colour isn't the colour they'll be painted in
    (a glyph is painted in its first character's colour): [(char index, data, painted)]."""
    out = []
    for s, e in shaper.clusters(ip, liga):
        for k in range(s, e):
            if icol[k] != icol[s] and not PLAIN.match(ip[k]):
                out.append((k, icol[k], icol[s]))
    return out


def merge_segments(segs):
    out = []
    for c, a, b in sorted(segs, key=lambda s: (s[0], s[1])):
        if out and out[-1][0] == c and a <= out[-1][2] + 0.02:
            out[-1] = (c, out[-1][1], max(out[-1][2], b))
        else:
            out.append((c, a, b))
    return out


# ── QPC V4 reference ────────────────────────────────────────────────────────

class V4:
    """Coloured layers of the QPC V4 word glyphs (the app's Uthmani Tajweed)."""

    def __init__(self):
        self.fonts = {}

    def segments(self, code, page):
        if page not in self.fonts:
            f = TTFont(FONTS / f"qpc-v4/p{page}.woff2")
            pal = [f"#{c.red:02x}{c.green:02x}{c.blue:02x}" for c in f["CPAL"].palettes[1]]
            self.fonts[page] = (f.getGlyphSet(), f.getBestCmap(), f["COLR"].ColorLayers, pal)
        gs, cmap, layers, pal = self.fonts[page]
        # A layer can hold several letters' outlines (ص … ق in one Tafkhim
        # layer): one box per contour, not per layer.
        boxes = []
        for lay in layers.get(cmap.get(ord(code[0])), []):
            pen = ContourBoxes(gs)
            gs[lay.name].draw(pen)
            h = pal[lay.colorID] if lay.colorID < len(pal) else None
            boxes += [(h, b) for b in pen.boxes]
        if not boxes:
            return []
        x0 = min(b[0] for _, b in boxes)
        x1 = max(b[2] for _, b in boxes)
        w = max(1, x1 - x0)
        segs = []
        for h, b in boxes:
            if h in WHITE:
                continue
            c = LEGEND.index(h) if h in LEGEND else NEAR.get(h)
            if c is not None:
                segs.append((c, (x1 - b[2]) / w, (x1 - b[0]) / w))
        return merge_segments(segs)


class ContourBoxes(BasePen):
    """Bounding box of each contour (on-curve and control points)."""

    def __init__(self, gs):
        super().__init__(gs)
        self.boxes, self.pts = [], []

    def _moveTo(self, p):
        self.pts = [p]

    def _lineTo(self, p):
        self.pts.append(p)

    def _curveToOne(self, p1, p2, p3):
        self.pts += [p1, p2, p3]

    def _qCurveToOne(self, p1, p2):
        self.pts += [p1, p2]

    def _closePath(self):
        if self.pts:
            xs, ys = [p[0] for p in self.pts], [p[1] for p in self.pts]
            self.boxes.append((min(xs), min(ys), max(xs), max(ys)))
        self.pts = []

    _endPath = _closePath


TOL = 0.12  # positional tolerance between the two calligraphies (word width)
SPAN_TOL = 0.2  # a segment end further off than this: spread / cut short


def compare(ref, ours):
    """[(error type, expected, actual)] between two segment lists. Segments of
    one colour that overlap (within TOL) are compared as one group — the two
    calligraphies split a run of letters differently. A group whose ends are
    off by more than SPAN_TOL (a colour spread onto, or missing from, a
    neighbouring letter) is 'span'."""
    def near(a, b):
        return a[1] - TOL <= b[2] and b[1] - TOL <= a[2]

    issues = []
    ref_left, ours_left = list(ref), list(ours)
    while ref_left:
        group_r, group_o = [ref_left.pop(0)], []
        grew = True
        while grew:  # grow both groups with overlapping segments of the colour
            grew = False
            for o in list(ours_left):
                if o[0] == group_r[0][0] and any(near(r, o) for r in group_r):
                    group_o.append(o); ours_left.remove(o); grew = True
            for r in list(ref_left):
                if r[0] == group_r[0][0] and any(near(r, o) for o in group_o):
                    group_r.append(r); ref_left.remove(r); grew = True
        rc = (group_r[0][0], min(r[1] for r in group_r), max(r[2] for r in group_r))
        if not group_o:
            other = next((o for o in ours_left if near(rc, o)), None)
            moved = next((o for o in ours_left if o[0] == rc[0]), None)
            if other is not None:
                issues.append(("wrong colour", rc, other))
                ours_left.remove(other)
            elif moved is not None:
                issues.append(("shifted", rc, moved))
                ours_left.remove(moved)
            else:
                issues.append(("missing", rc, None))
            continue
        oc = (rc[0], min(o[1] for o in group_o), max(o[2] for o in group_o))
        if abs(rc[1] - oc[1]) > SPAN_TOL or abs(rc[2] - oc[2]) > SPAN_TOL:
            issues.append(("span", rc, oc))
    issues += [("extra", None, o) for o in ours_left]
    return issues


# ── Build ───────────────────────────────────────────────────────────────────

def build(rule_data, surah, first=1, last=999, shaper=None, v4=None):
    """(ayahs for the JSON, diagnostic rows, stats)."""
    text_of, rules_of = load_rules(rule_data)
    shaper = shaper or Shaper()
    v4 = v4 or V4()
    glyph_data = json.loads((GLYPHS / f"{surah}.json").read_text())
    indopak = json.loads((INDOPAK / f"{surah}.json").read_text())
    bismillah = len(text_of[(1, 1)]) + 1 if (1, 1) in text_of else 40
    stats, rows, result = Counter(), [], []
    for gv, iv in zip(glyph_data, indopak):
        a = gv["a"]
        if a < first or a > last:
            continue
        text = text_of[(surah, a)]
        shift = bismillah if a == 1 and surah not in (1, 9) else 0
        colour = ayah_colours(text, rules_of.get((surah, a), []), shift)
        u_words, at = [], 0
        for wd in text.split(" "):
            if wd:
                u_words.append((at, list(wd)))
            at += len(wd) + 1
        if len(u_words) != len(iv["w"]):
            stats["skipped ayahs"] += 1
            result.append({"a": a, "w": [[[t, None]] for t in iv["w"]]})
            continue
        words, no_liga = [], []
        for wi, ((at, wchars), ip, (code, page, qpc)) in enumerate(zip(u_words, iv["w"], gv["w"])):
            wcol = colour[at: at + len(wchars)]
            icol = map_word(wchars, wcol, ip, stats)
            ref = v4.segments(code, page)
            icol = from_reference(shaper, ip, icol, ref, TAFKHIM, heavy_letter)
            if PAUSE.search(qpc):
                icol = from_reference(shaper, ip, icol, ref, MADD246, madd_letter)
            notes = []
            icol, off = resolve_ligatures(shaper, ip, icol, notes)
            if off:
                no_liga.append(wi)
                stats["words drawn with liga off"] += 1
            words.append(runs_of(ip, icol))
            for k, data_c, painted in paint_errors(shaper, ip, icol, liga=not off):
                stats["paint errors"] += 1
                rows.append((f"{surah}:{a}", wi + 1, "".join(wchars), ip, (data_c, 0, 0) if data_c is not None else None,
                             (painted, 0, 0) if painted is not None else None, "paint",
                             f"ligature: {ip[k]!r} painted in its glyph's first character's colour"))
            issues = compare(ref, painted_segments(shaper, ip, icol, liga=not off))
            stats["words"] += 1
            stats["words matching V4"] += not issues
            for kind, exp, act in issues:
                rows.append((f"{surah}:{a}", wi + 1, "".join(wchars), ip, exp, act, kind, cause(kind, exp, act, notes, wcol)))
            for n in notes:
                stats["ligature limits"] += 1
                rows.append((f"{surah}:{a}", wi + 1, "".join(wchars), ip, None, None, "ligature limit", n))
        entry = {"a": a, "w": words}
        if no_liga:
            entry["nl"] = no_liga
        result.append(entry)
    return result, rows, stats


def cause(kind, exp, act, notes, wcol):
    if notes:
        return "ligature: " + "; ".join(notes)
    c = (exp or act)[0]
    if kind == "missing" and c not in [x for x in wcol if x is not None]:
        return "rule data / mapping: the colour is not on the Uthmani word"
    if kind == "missing":
        return "mapping: Uthmani letter / mark with no IndoPak counterpart"
    if kind == "extra":
        return "rule data / convention: QPC leaves it plain"
    return "cross-script position (calligraphy) or mapping"


def runs_of(ip, icol):
    runs = []
    for ch, c in zip(ip, icol):
        if runs and runs[-1][1] == c:
            runs[-1][0] += ch
        else:
            runs.append([ch, c])
    return runs


def fmt(seg):
    return "—" if seg is None else f"{NAMES[seg[0]]} {seg[1]:.2f}–{seg[2]:.2f}"


def report(rows, stats, surah, first, last):
    pct = 100 * stats["words matching V4"] / max(1, stats["words"])
    lines = [
        f"# IndoPak Tajweed — QA vs QPC V4, {surah}:{first}–{last}",
        "",
        "Generated by `scripts/generation/build-indopak-tajweed.py`. Spans are fractions of the word's",
        f"width from its right edge (QPC V4 layers vs IndoPak glyphs as painted); tolerance {TOL}.",
        "",
        f"Words: {stats['words']} · matching V4: {stats['words matching V4']} ({pct:.1f}%) · "
        f"drawn with liga off: {stats['words drawn with liga off']} · ligature limits: {stats['ligature limits']}",
        "",
        "| Surah:Ayah | Word | Expected colour/span | Actual colour/span | Error type | Root cause |",
        "| :-- | :-- | :-- | :-- | :-- | :-- |",
    ]
    for ref, wi, u, ip, exp, act, kind, why in rows:
        lines.append(f"| {ref} w{wi} | {u} ({ip.strip()}) | {fmt(exp)} | {fmt(act)} | {kind} | {why} |")
    return "\n".join(lines) + "\n"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    rep = argv[argv.index("--report") + 1] if "--report" in argv else None
    if rep:
        args.remove(rep)
    rule_data, surah = args[0], int(args[1])
    first = int(args[2]) if len(args) > 2 else 1
    last = int(args[3]) if len(args) > 3 else 999
    result, rows, stats = build(rule_data, surah, first, last)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{surah}.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    last = min(last, max(r["a"] for r in result))
    text = report(rows, stats, surah, first, last)
    if rep:
        Path(rep).write_text(text, encoding="utf8")
    pct = 100 * stats["words matching V4"] / max(1, stats["words"])
    print(f"surah {surah} ayahs {first}-{last}: {dict(stats)}  match {pct:.1f}%")
    for ref, wi, u, ip, exp, act, kind, why in rows:
        print(f"   {ref} w{wi} {u}: {kind}  expected {fmt(exp)}  actual {fmt(act)}  — {why}")


if __name__ == "__main__":
    main(sys.argv[1:])
