"""
Regression tests for scripts/generation/build-indopak-tajweed.py — the IndoPak
Tajweed colours, against the QPC V4 Tajweed the app draws for Uthmani.

Compares character → colour mappings and painted glyph segments (HarfBuzz,
the IndoPak font itself), not screenshots. Runs on the committed fixture
(Al-Baqarah 1–20 rule data), the committed fonts and word data.

  python3 -m unittest scripts/generation/test_build_indopak_tajweed.py
(needs fontTools, brotli, uharfbuzz)
"""
import importlib.util
import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("build_indopak_tajweed", HERE / "build-indopak-tajweed.py")
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)

FIXTURE = HERE / "fixtures/tajweed-2-1-20.json"
SILENT, MADD2, MADD246, MUTTASIL, MADD6, GHUNNAH, QALQALAH, TAFKHIM = range(8)

# Positional differences left after the fix (Surah:Ayah, word, error type) —
# a change here is a regression or an improvement: update it knowingly.
KNOWN = {
    # The IndoPak font draws لا as one glyph: the alef's madd can't be painted
    # apart from the lam (the maddah mark, its own glyph, carries it).
    ("2:9", 7, "span"), ("2:9", 7, "ligature limit"),
    ("2:12", 1, "span"), ("2:12", 1, "ligature limit"),
    ("2:13", 13, "span"), ("2:13", 13, "ligature limit"),
    # Same letters coloured; the two calligraphies place them differently.
    ("2:4", 12, "span"), ("2:7", 9, "span"), ("2:7", 12, "span"), ("2:8", 10, "span"),
    ("2:9", 10, "span"), ("2:19", 11, "span"), ("2:19", 16, "span"), ("2:19", 19, "shifted"),
    ("2:20", 4, "span"), ("2:20", 19, "span"),
}


def colours_of(runs):
    """[(char, colour)] of a word's runs."""
    return [(ch, c) for text, c in runs for ch in text]


def letter_colours(runs):
    """[(letter, colour of the letter itself)] — marks left out."""
    return [(ch, c) for ch, c in colours_of(runs) if b.is_letter(ch)]


class Build(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.shaper = b.Shaper()
        cls.v4 = b.V4()
        cls.result, cls.rows, cls.stats = b.build(FIXTURE, 2, 1, 20, cls.shaper, cls.v4)
        cls.ayah = {x["a"]: x for x in cls.result}
        cls.indopak = {x["a"]: x for x in json.loads((b.INDOPAK / "2.json").read_text())}
        cls.glyphs = {x["a"]: x for x in json.loads((b.GLYPHS / "2.json").read_text())}

    def word(self, a, w):
        return self.ayah[a]["w"][w - 1]

    def painted(self, a, w):
        runs = self.word(a, w)
        ip = "".join(t for t, _ in runs)
        icol = [c for _, c in colours_of(runs)]
        liga = (w - 1) not in self.ayah[a].get("nl", [])
        return ip, icol, liga

    def issues(self, a, w):
        ip, icol, liga = self.painted(a, w)
        code, page, _ = self.glyphs[a]["w"][w - 1]
        return b.compare(self.v4.segments(code, page), b.painted_segments(self.shaper, ip, icol, liga))

    # ── Verse 2: ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَ فِيهِ هُدٗى لِّلۡمُتَّقِينَ ──

    def test_verse2_la_is_plain(self):
        # لَا: no colour on either side (the blue beside it is رَيۡبَ's ر).
        self.assertTrue(all(c is None for _, c in colours_of(self.word(2, 3))))
        code, page, _ = self.glyphs[2]["w"][2]
        self.assertEqual(self.v4.segments(code, page), [])
        self.assertEqual([c for _, c in letter_colours(self.word(2, 4))][0], TAFKHIM)  # the ر of رَيۡبَ

    def test_verse2_huda_only_its_tanween(self):
        # هُدًى: idgham without ghunnah greys the tanween only, letters plain
        # (the orange beside it is فِيهِ's ي).
        cs = colours_of(self.word(2, 6))
        self.assertEqual([c for ch, c in cs if c is not None], [SILENT])
        self.assertEqual([ch for ch, c in cs if c is not None], ["ً"])
        self.assertEqual(self.issues(2, 6), [])

    def test_verse2_muttaqin(self):
        # لِّلۡمُتَّقِيۡنَ: ق Tafkhim, ي madd 2/4/6, ن plain — and painted so:
        # the font's يۡن ligature would spread the ي's orange onto the ن.
        lc = letter_colours(self.word(2, 7))
        self.assertEqual(lc, [("ل", None), ("ل", None), ("م", None), ("ت", None), ("ق", TAFKHIM), ("ي", MADD246), ("ن", None)])
        self.assertIn(6, self.ayah[2]["nl"])
        ip, icol, liga = self.painted(2, 7)
        self.assertFalse(liga)
        self.assertEqual(b.paint_errors(self.shaper, ip, icol, liga), [])
        self.assertTrue(b.paint_errors(self.shaper, ip, icol, liga=True), "with liga on, the ن would be painted orange")
        self.assertEqual(self.issues(2, 7), [])

    def test_verse2_matches_v4(self):
        for w in range(1, len(self.ayah[2]["w"]) + 1):
            self.assertEqual(self.issues(2, w), [], f"2:2 w{w}")

    # ── Marks, several colours, word boundaries, normalisation ──

    def test_mark_only_colour(self):
        # ذٰلِكَ: the madd's small alef is pink, the ذ under it plain.
        cs = colours_of(self.word(2, 1))
        self.assertEqual([(ch, c) for ch, c in cs if c is not None], [("ٰ", MADD2)])

    def test_several_colours_in_one_word(self):
        # اَبۡصَارِهِمۡ (2:7): ب qalqalah, ص Tafkhim, the spelled-out alef madd 2,
        # ر with a kasra plain (tarqiq), هِمۡ plain.
        self.assertEqual(
            letter_colours(self.word(7, 8)),
            [("ا", None), ("ب", QALQALAH), ("ص", TAFKHIM), ("ا", MADD2), ("ر", None), ("ه", None), ("م", None)],
        )

    def test_word_boundary(self):
        # هُدًى مِّنۡ رَّبِّهِمۡ (2:5): idgham with ghunnah — the tanween grey in
        # its own word, the م it merges into green; then مِّنۡ's noon merges
        # into the ر without ghunnah — grey, and no green on the ر.
        self.assertEqual([c for _, c in colours_of(self.word(5, 3)) if c is not None], [SILENT])
        self.assertEqual(letter_colours(self.word(5, 4)), [("م", GHUNNAH), ("ن", SILENT)])
        self.assertNotEqual(letter_colours(self.word(5, 5))[0][1], GHUNNAH)
        # 2:2's idgham span runs over the space into لِّ: لِّ stays plain.
        self.assertIsNone(letter_colours(self.word(2, 7))[0][1])

    def test_unicode_normalisation(self):
        # ٱلۡكِتَٰبُ ↔ الۡڪِتٰبُ: ٱ → ا (hamzat al-wasl grey), ك ↔ ڪ aligned (the
        # small alef pink on the ت in both).
        cs = colours_of(self.word(2, 2))
        self.assertEqual(cs[0], ("ا", SILENT))
        self.assertIn(("ٰ", MADD2), cs)
        self.assertIn("ڪ", "".join(ch for ch, _ in cs))

    def test_mark_on_a_neighbouring_letter(self):
        # ٱلصَّلَوٰةَ ↔ الصَّلٰوةَ: the small alef sits on the و in Uthmani,
        # on the ل in IndoPak — it keeps its colour.
        self.assertIn(("ٰ", MADD2), colours_of(self.word(3, 5)))

    def test_unmatched_source_letter(self):
        # A coloured Uthmani letter with no IndoPak counterpart is counted, not
        # put on another letter.
        stats = b.Counter()
        icol = b.map_word(list("قَالَ"), [TAFKHIM, TAFKHIM, MADD2, None, None], "لَ", stats)
        self.assertEqual(icol, [None, None])
        self.assertEqual(stats["lost (no IndoPak letter)"], 2)

    def test_lam_of_allah(self):
        # اللّٰهُ: both lams heavy after a fatha / damma, plain after a kasra.
        lc = letter_colours(self.word(7, 2))  # خَتَمَ اللّٰهُ
        self.assertEqual(lc, [("ا", SILENT), ("ل", TAFKHIM), ("ل", TAFKHIM), ("ه", None)])

    def test_no_ra_with_kasra_heavy(self):
        for a, x in self.ayah.items():
            for wi, runs in enumerate(x["w"]):
                cs = colours_of(runs)
                for k, (ch, c) in enumerate(cs):
                    if ch == "ر" and c == TAFKHIM:
                        nxt = "".join(m for m, _ in cs[k + 1:k + 3])
                        self.assertNotIn("ِ", nxt[:1], f"2:{a} w{wi + 1}")

    # ── All of Al-Baqarah 1–20 ──

    def test_text_and_order_preserved(self):
        for a, x in self.ayah.items():
            self.assertEqual(["".join(t for t, _ in runs) for runs in x["w"]], self.indopak[a]["w"], f"2:{a}")

    def test_every_colour_painted_as_given(self):
        for a, x in self.ayah.items():
            for w in range(1, len(x["w"]) + 1):
                ip, icol, liga = self.painted(a, w)
                self.assertEqual(b.paint_errors(self.shaper, ip, icol, liga), [], f"2:{a} w{w}")

    def test_no_liga_only_without_lam_alef(self):
        for a, x in self.ayah.items():
            for wi in x.get("nl", []):
                ip = "".join(t for t, _ in x["w"][wi])
                self.assertFalse(any(b.is_lam_alef(list(ip), s, e) for s, e in self.shaper.clusters(ip)), f"2:{a} w{wi + 1}")

    def test_rtl_order_of_segments(self):
        # Painted segments read right to left as the reference does: ق's blue
        # right of the ي's orange in لِّلۡمُتَّقِيۡنَ.
        ip, icol, liga = self.painted(2, 7)
        segs = {c: (r0, r1) for c, r0, r1 in b.painted_segments(self.shaper, ip, icol, liga)}
        self.assertLess(segs[TAFKHIM][1], segs[MADD246][1])

    def test_v4_comparison_regressions(self):
        found = {(r[0], r[1], r[6]) for r in self.rows}
        self.assertEqual(found, KNOWN)
        self.assertEqual(self.stats["words"], 230)

    def test_committed_data_is_current(self):
        committed = json.loads((b.OUT / "2.json").read_text())
        self.assertEqual(committed, self.result)


if __name__ == "__main__":
    unittest.main()
