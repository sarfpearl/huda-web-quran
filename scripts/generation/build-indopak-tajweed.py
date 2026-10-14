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
  2. Tafkhim (heavy letters, dark blue), which that data lacks: خ ص ض غ ط ق ظ
     always; ر with fatha / damma (or sakin after them); the lam of Allah
     unless a kasra comes before. A letter with another colour keeps it.
  3. Uthmani and IndoPak (public/data/quran-indopak, same word positions)
     letter clusters aligned (LCS on normalised letters); a coloured letter
     colours its IndoPak cluster, a coloured mark alone the like mark there
     (tanween, madd), else the cluster.
  4. QA: each word's colours against the colours of its QPC V4 word glyph's
     layers (public/fonts/qpc-v4, COLRv0, dark palette); the words that
     differ are listed.

Colours are TAJWEED_LEGEND indexes (src/lib/data/quranGlyphs.ts).

Inputs (not committed, ~7 MB):
  https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.embeded.txt
  https://raw.githubusercontent.com/tarekeldeeb/quran-tajweed-embedded/master/output/tajweed.hafs.uthmani-pause-sajdah.json

Output:
  public/data/quran-indopak-tajweed/<surah>.json
    [ { a: ayah, w: [ [ [text, colour | null], ... ], ... ] } ]

Usage (fontTools + brotli, for the QA):
  python3 scripts/generation/build-indopak-tajweed.py <data-dir> <surah> [fromAyah] [toAyah]
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
GLYPHS = ROOT / "public/data/quran-glyphs"
INDOPAK = ROOT / "public/data/quran-indopak"
FONTS = ROOT / "public/fonts"
OUT = ROOT / "public/data/quran-indopak-tajweed"

DATA = Path(sys.argv[1])
SURAH = int(sys.argv[2])
FROM = int(sys.argv[3]) if len(sys.argv) > 3 else 1
TO = int(sys.argv[4]) if len(sys.argv) > 4 else 999

# TAJWEED_LEGEND indexes.
SILENT, MADD2, MADD246, MUTTASIL, MADD6, GHUNNAH, QALQALAH, TAFKHIM = range(8)
LEGEND = ["#999999", "#ffc1e0", "#ff8e3b", "#ff5e8e", "#e30000", "#26b55d", "#00deff", "#3c84d5"]
NEAR = {"#9d9999": SILENT, "#919999": SILENT}
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
MARK_CLASS = [TANWEEN, MADD]
HEAVY = set("خصضغطقظ")
# What a rule colours (QPC): a madd its madd letter / mark, a ghunnah family
# rule its noon / meem / tanween — the letter carrying it keeps its own colour.
# (A necessary madd keeps its whole span: QPC colours the letters of الٓمٓ red.)
MADD_RULES = {"madd_2", "madd_246", "madd_munfasil", "madd_muttasil"}
MADD_CHARS = set("اويىٰٓۥۦ\u06E4")
NASAL_RULES = {"ghunnah", "ikhfa", "ikhfa_shafawi", "iqlab"}
NASAL_CHARS = set("نم\u06E2\u06ED") | TANWEEN
FATHA_DAMMA = set("ًٌَُ")
KASRA = set("ٍِ")
SUKUN = set("ْۡ")
SHADDA = "ّ"


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


def vowel_of(chars, cl):
    return next((chars[k] for k in cl["idx"][1:] if chars[k] in FATHA_DAMMA | KASRA | SUKUN), None)


def tafkhim(chars, colour, before):
    """Heavy letters (with no other colour) → TAFKHIM, in place. `before`:
    the last vowel ahead of the word (the lam of Allah / a ر sakin at its start)."""
    cl = clusters(chars)

    def prev_vowel(n):
        return next((v for v in (vowel_of(chars, p) for p in reversed(cl[:n])) if v), before)

    for n, c in enumerate(cl):
        k = c["idx"][0]
        if colour[k] is not None:
            continue
        ch = chars[k]
        heavy = ch in HEAVY
        if ch == "ر":
            v = vowel_of(chars, c)
            heavy = v in FATHA_DAMMA or (v not in KASRA and prev_vowel(n) in FATHA_DAMMA)
        elif (
            ch == "ل" and n + 1 < len(cl) and cl[n + 1]["base"] == "ه"
            and SHADDA in [chars[j] for j in c["idx"]] and n >= 1 and cl[n - 1]["base"] == "ل"
            and (n < 2 or cl[n - 2]["base"] in ("ا", "و", "ف", "ب", "ت"))
        ):
            # ٱللَّه / لِلَّه / بِٱللَّه: the doubled lam; heavy unless a kasra comes before.
            heavy = prev_vowel(n - 1) not in KASRA
        if heavy:
            # The letter and its marks — a mark with its own colour (a madd's
            # small alef) keeps it.
            for j in c["idx"]:
                if colour[j] is None:
                    colour[j] = TAFKHIM


PAUSE = re.compile(r"[\u06D6-\u06DC]")


def madd_at_pause(chars, colour):
    """Madd ʿāriḍ: a long vowel before the last letter, at a pause mark in
    the QPC text — QPC colours it 2/4/6 (the data marks it at ayah ends
    only); a leen (و / ي after a fatha) it leaves plain there."""
    cl = [c for c in clusters(chars) if c["base"]]
    if len(cl) < 3:
        return
    m, before = cl[-2], cl[-3]
    k = m["idx"][0]
    if colour[k] is not None or chars[k] not in "اوي":
        return
    own = vowel_of(chars, m)
    prev = vowel_of(chars, before)
    long = own in (None,) + tuple(SUKUN) and (
        (chars[k] == "ا" and prev == "\u064E") or (chars[k] == "و" and prev == "\u064F")
        or (chars[k] == "ي" and prev == "\u0650"))
    if long:
        for j in m["idx"]:
            colour[j] = MADD246


# Rule data.
embedded = {}
for line in (DATA / "tajweed.hafs.embeded.txt").read_text(encoding="utf8").split("\n"):
    p = line.split("|")
    if len(p) == 3:
        embedded[(int(p[0]), int(p[1]))] = re.sub("[a-z]", "", p[2])
rules = {(r["surah"], r["ayah"]): r["annotations"] for r in json.loads((DATA / "tajweed.hafs.uthmani-pause-sajdah.json").read_text())}
bismillah = len(embedded[(1, 1)]) + 1

# QPC V4 word colours, for the QA.
fonts = {}


def v4_colours(code, page):
    if page not in fonts:
        f = TTFont(FONTS / f"qpc-v4/p{page}.woff2")
        pal = f["CPAL"].palettes[1]
        fonts[page] = (f.getBestCmap(), f["COLR"].ColorLayers, [f"#{c.red:02x}{c.green:02x}{c.blue:02x}" for c in pal])
    cmap, layers, pal = fonts[page]
    out = set()
    for l in layers.get(cmap.get(ord(code[0])), []):
        h = pal[l.colorID] if l.colorID < len(pal) else None
        c = LEGEND.index(h) if h in LEGEND else NEAR.get(h)
        if c is not None:
            out.add(c)
    return out


def runs_of(chars, colour):
    runs = []
    for ch, c in zip(chars, colour):
        if runs and runs[-1][1] == c:
            runs[-1][0] += ch
        else:
            runs.append([ch, c])
    return runs


glyph_data = json.loads((GLYPHS / f"{SURAH}.json").read_text())
indopak = json.loads((INDOPAK / f"{SURAH}.json").read_text())
stats = Counter()
diffs = []
result = []
for gv, iv in zip(glyph_data, indopak):
    a = gv["a"]
    if a < FROM or a > TO:
        continue
    text = embedded[(SURAH, a)]
    chars = list(text)
    colour = [None] * len(chars)
    shift = bismillah if a == 1 and SURAH not in (1, 9) else 0
    for r in rules.get((SURAH, a), []):
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
    u_words, at = [], 0
    for wd in text.split(" "):
        if wd:
            u_words.append((at, list(wd)))
        at += len(wd) + 1
    if len(u_words) != len(iv["w"]):
        stats["skipped ayahs"] += 1
        result.append({"a": a, "w": [[[t, None]] for t in iv["w"]]})
        continue
    words, before = [], None
    for (at, wchars), ip, (code, page, _qpc) in zip(u_words, iv["w"], gv["w"]):
        wcol = colour[at: at + len(wchars)]
        if PAUSE.search(_qpc):
            madd_at_pause(wchars, wcol)
        tafkhim(wchars, wcol, before)
        before = next((v for v in (vowel_of(wchars, c) for c in reversed(clusters(wchars))) if v), before)
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
                stats["lost"] += 1
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
                for t in marks or ([] if base_c is not None else target):
                    icol[t] = c
        runs = runs_of(ichars, icol)
        words.append(runs)
        mine = {c for _, c in runs if c is not None}
        theirs = v4_colours(code, page)
        stats["words"] += 1
        if mine == theirs:
            stats["words matching V4"] += 1
        else:
            diffs.append(f"{SURAH}:{a} w{len(words)} {''.join(wchars)}  ours {sorted(mine)}  V4 {sorted(theirs)}")
    result.append({"a": a, "w": words})

OUT.mkdir(parents=True, exist_ok=True)
(OUT / f"{SURAH}.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
pct = 100 * stats["words matching V4"] / max(1, stats["words"])
print(f"surah {SURAH} ayahs {FROM}-{min(TO, len(indopak))}: {dict(stats)}  match {pct:.1f}%")
for d in diffs:
    print("  ", d)
