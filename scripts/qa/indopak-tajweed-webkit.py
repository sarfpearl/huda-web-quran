#!/usr/bin/env python3
"""IndoPak Tajweed colours in WebKit — Safari's engine (the WebKitGTK build).

Draws test words with the IndoPak font in WebKitGTK and counts the pixels of
the test colour, to see what the engine paints:

  - a ligature (يۡن, تر) with the colour on one of its letters — liga on / off;
  - the name of Allah with both lams coloured, liga off (Option 1);
  - a mark coloured alone (tanween, small alef, لا's maddah).

WebKitGTK shapes with HarfBuzz; iPhone Safari shapes with CoreText, so a
pass here is evidence for Safari, not proof. (Its COLR palettes don't draw
the QPC V4 base layer, so the Uthmani glyphs can't be compared here.)

Needs: the dev server on :3123 (npm run dev -- -p 3123), Ubuntu packages
gir1.2-webkit2-4.1 python3-gi xvfb, and the system Python (python3-gi is
built for it):
  xvfb-run -a /usr/bin/python3.12 scripts/qa/indopak-tajweed-webkit.py [out.png]
"""
import sys

import gi

gi.require_version("Gtk", "3.0")
gi.require_version("WebKit2", "4.1")
from gi.repository import GLib, Gtk, WebKit2  # noqa: E402

FONT = "http://localhost:3123/fonts/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2"
TEST = "#0000ff"
GREY = "#999999"

# (label, html, expect the test colour to show?, liga off?)
CASES = [
    ("ligature يۡن, ي coloured, liga on — spreads onto ن", "لِّلۡمُتَّقِ<b>يۡ</b>نَ", "wide", False),
    ("ligature يۡن, ي coloured, liga off — ي only", "لِّلۡمُتَّقِ<b>يۡ</b>نَ", "narrow", True),
    ("ligature تر, ر coloured, liga on — lost", "اشۡتَ<b>ر</b>َوُا", "none", False),
    ("ligature تر, ر coloured, liga off — ر shows", "اشۡتَ<b>ر</b>َوُا", "some", True),
    ("Allah, both lams coloured, liga off", f'<span style="color:{GREY}">ا</span><b>للّٰ</b>هُ', "some", True),
    ("mark alone: tanween", "غِشَاوَة<b>ٌ</b>", "some", False),
    ("mark alone: small alef", "ذ<b>ٰ</b>لِكَ", "some", False),
    ("mark alone: لا's maddah", "اِلَّا<b>ۤ</b>", "some", False),
]
ROW = 190


def page():
    rows = "".join(
        f'<p style="{"font-feature-settings:\'liga\' 0" if off else ""}">{html}</p>' for _, html, _, off in CASES)
    return f"""<!doctype html><meta charset=utf-8><style>@font-face{{font-family:IP;src:url({FONT})}}
body{{background:#000;margin:0}}p{{font:120px/{ROW}px IP;height:{ROW}px;color:#fff;direction:rtl;margin:0 20px;overflow:hidden}}
b{{font-weight:normal;color:{TEST}}}</style>{rows}"""


def count(surface):
    """Test-colour pixels per row."""
    data, stride = surface.get_data(), surface.get_stride()
    w, h = surface.get_width(), surface.get_height()
    out = [0] * len(CASES)
    for y in range(min(h, ROW * len(CASES))):
        row = y // ROW
        base = y * stride
        for x in range(w):
            b, g, r = data[base + 4 * x], data[base + 4 * x + 1], data[base + 4 * x + 2]  # BGRA
            if b > 150 and r < 80 and g < 80:
                out[row] += 1
    return out


def main():
    out_png = sys.argv[1] if len(sys.argv) > 1 else None
    win = Gtk.OffscreenWindow()
    view = WebKit2.WebView()
    view.set_size_request(900, ROW * len(CASES))
    win.add(view)
    win.show_all()
    result = {}

    def snap():
        def done(v, res):
            surface = v.get_snapshot_finish(res)
            if out_png:
                surface.write_to_png(out_png)
            result["counts"] = count(surface)
            Gtk.main_quit()
        view.get_snapshot(WebKit2.SnapshotRegion.FULL_DOCUMENT, WebKit2.SnapshotOptions.NONE, None, done)
        return False

    view.connect("load-changed", lambda v, ev: ev == WebKit2.LoadEvent.FINISHED and GLib.timeout_add(2500, snap))
    view.load_html(page(), "http://localhost:3123/")
    GLib.timeout_add(30000, Gtk.main_quit)
    Gtk.main()
    counts = result.get("counts")
    if counts is None:
        sys.exit("no snapshot — is the dev server on :3123?")
    print(f"WebKitGTK {WebKit2.get_major_version()}.{WebKit2.get_minor_version()}.{WebKit2.get_micro_version()}")
    narrow = counts[1]
    for (label, _h, expect, _o), n in zip(CASES, counts):
        print(f"  {n:6d} px  {label}")
    print("ligature spread (liga on > liga off):", "yes" if counts[0] > 1.5 * narrow else "no")
    print("marks coloured alone show:", "yes" if all(c > 50 for c in counts[5:]) else "no")


if __name__ == "__main__":
    main()
