#!/usr/bin/env python3
"""
Build the self-hosted UI / script fonts in src/app/fonts/ (read by
src/app/fonts.ts through next/font/local).

next/font/google downloaded these from Google at build time, and Vercel
builds failed now and then (PR #100, #104) when Google served a font URL
without a file extension (next/font's loader reads the extension and threw
"Cannot read properties of null (reading '1')"). Building from files in the
repo takes Google out of the build.

For each family and weight: the full static TTF from Google Fonts, subset to
the unicode-ranges of the subsets we keep (Google's own ranges, from its css2
API), as woff2. All layout features are kept (Nastaliq / Indic shaping needs
them). Prints the unicode-range of each family for fonts.ts `declarations`,
so a face downloads only when its script is on screen, as before.

All families are SIL OFL 1.1; the licence texts sit next to the fonts.

Setup (once):  pip install fonttools brotli
Usage:         python3 scripts/generation/build-self-hosted-fonts.py
"""
import re
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "app" / "fonts"

# (Google family, file slug, google/fonts ofl dir, weights, subsets kept)
FAMILIES = [
    ("Poppins", "poppins", "poppins", [400, 500, 600, 700], ["latin", "latin-ext"]),
    ("Noto Serif Tamil", "noto-serif-tamil", "notoseriftamil", [400, 500, 600, 700], ["tamil", "latin"]),
    ("Amiri", "amiri", "amiri", [400, 700], ["arabic", "latin"]),
    ("Noto Nastaliq Urdu", "noto-nastaliq-urdu", "notonastaliqurdu", [400, 500], ["arabic", "latin"]),
    ("Noto Sans Malayalam", "noto-sans-malayalam", "notosansmalayalam", [400, 500], ["malayalam", "latin"]),
    ("Noto Sans Devanagari", "noto-sans-devanagari", "notosansdevanagari", [400, 500], ["devanagari", "latin"]),
    ("Noto Sans Bengali", "noto-sans-bengali", "notosansbengali", [400, 500], ["bengali", "latin"]),
    ("Noto Naskh Arabic", "noto-naskh-arabic", "notonaskharabic", [400, 500], ["arabic", "latin"]),
]

# A woff2-capable browser gets per-subset files with unicode-range;
# no User-Agent gets one full TTF per weight.
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)


def fetch(url, ua=None):
    req = urllib.request.Request(url, headers={"User-Agent": ua} if ua else {})
    with urllib.request.urlopen(req) as r:
        return r.read()


def css_url(family, weights):
    return "https://fonts.googleapis.com/css2?family=%s:wght@%s" % (
        family.replace(" ", "+"),
        ";".join(str(w) for w in weights),
    )


def subset_ranges(family, subsets):
    css = fetch(css_url(family, [400]), BROWSER_UA).decode()
    found = dict(re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{[^}]*?unicode-range: ([^;]+);", css))
    missing = [s for s in subsets if s not in found]
    if missing:
        sys.exit("%s: no %s subset from Google" % (family, ", ".join(missing)))
    return ", ".join(found[s] for s in subsets)


def full_ttfs(family, weights):
    css = fetch(css_url(family, weights)).decode()
    faces = re.findall(r"font-weight: (\d+);.*?src: url\((\S+?\.ttf)\)", css, re.S)
    got = {int(w): url for w, url in faces}
    missing = [w for w in weights if w not in got]
    if missing:
        sys.exit("%s: no TTF for weight %s" % (family, missing))
    return got


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for family, slug, ofl_dir, weights, subsets in FAMILIES:
            ranges = subset_ranges(family, subsets)
            for weight, url in sorted(full_ttfs(family, weights).items()):
                ttf = Path(tmp) / ("%s-%d.ttf" % (slug, weight))
                ttf.write_bytes(fetch(url))
                out = OUT / ("%s-%d.woff2" % (slug, weight))
                subprocess.run(
                    [
                        sys.executable, "-m", "fontTools.subset", str(ttf),
                        "--unicodes=" + ranges.replace(" ", ""),
                        "--layout-features=*",
                        "--flavor=woff2",
                        "--output-file=" + str(out),
                    ],
                    check=True,
                )
                print("%-34s %7.1f KB" % (out.relative_to(ROOT), out.stat().st_size / 1024))
            licence = fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/%s/OFL.txt" % ofl_dir)
            (OUT / ("%s-OFL.txt" % slug)).write_bytes(licence)
            print("  unicode-range: %s\n" % ranges)


if __name__ == "__main__":
    main()
