#!/usr/bin/env python3
"""
Measure our OWN word timings for a reciter x Surah whose streamed recording
doesn't match its Quran.com timings (listed in src/lib/data/wordSyncAvailability.ts).

CTC forced alignment: an Arabic wav2vec2 model turns the streamed audio into
per-20ms character probabilities; each ayah's words (the Mushaf word list of
public/data/quran-glyphs, so wordIndex = glyph position) are Viterbi-aligned
inside a window that starts where the previous ayah ended. Before ayah 1 the
Isti'adhah / Bismillah are detected the same way (the variant with the best
likelihood over the same frames wins) and written as `embeddedPrelude`.

The result replaces public/data/quran-timings/<reciter>/<surah>.json, keeps
the original Quran.com file's metadata and records the change in `repairs`.
Verify afterwards with scripts/qa (voice-match -> repair-timings -> sync-suite).

Setup (once, kept in the gitignored .qa-cache):
  python3 -m venv .qa-cache/align-venv
  .qa-cache/align-venv/bin/pip install torch transformers numpy
Usage:
  .qa-cache/align-venv/bin/python scripts/generation/align-reciter-timings.py sudais 3 4 5
"""
import json
import os
import re
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(os.environ.get("QA_CACHE", ROOT / ".qa-cache"))
os.environ.setdefault("HF_HOME", str(CACHE / "hf"))
MODEL = "jonatasgrosman/wav2vec2-large-xlsr-53-arabic"
SR = 16000
FR = 0.02  # wav2vec2 frame = 320 samples
LEAD = 4  # frames a word start is moved before its first letter's spike
MIN_WORD = 5  # shortest word, in frames (0.1s)

ISTIADHAH = "أعوذ بالله من الشيطان الرجيم"
BISMILLAH = "بسم الله الرحمن الرحيم"

# QPC Hafs → the model's plain letters. Harakat, Quranic annotation marks and
# tatweel are dropped; wasl/madda alif forms become a plain alif.
DROP = re.compile("[ؐ-ًؚ-ٟۖ-ۭـ࣓-ࣿ]")
MAP = {"ٱ": "ا", "ٰ": "ا", "ی": "ي", "ک": "ك"}


# Disjoined opening letters (الٓمٓ, طسٓمٓ …) are recited by their names.
LETTER_NAMES = {"ا": "الف", "ل": "لام", "م": "ميم", "ص": "صاد", "ر": "را", "ك": "كاف", "ه": "ها",
                "ي": "يا", "ع": "عين", "ط": "طا", "س": "سين", "ح": "حا", "ق": "قاف", "ن": "نون"}
MUQATTAAT = {"الم", "المص", "الر", "المر", "كهيعص", "طه", "طسم", "طس", "يس", "ص", "حم", "عسق", "ق", "ن"}


def spoken(word, opening):
    """The Mushaf word as recited: opening disjoined letters become their names."""
    w = DROP.sub("", "".join(MAP.get(c, c) for c in word))
    if opening and w in MUQATTAAT:
        return "".join(LETTER_NAMES[c] for c in w)
    return w


def letters(word, vocab, opening=False, joined=False):
    """Model tokens of a word. joined: recited straight on from the previous
    word, so a leading hamzat al-wasl (ٱ) is silent and gets no letter."""
    if joined and word.startswith("\u0671"):
        word = word[1:]
    return [vocab[c] for c in spoken(word, opening) if c in vocab]


def fold(text):
    """Letters only, hamza/alif-maqsura/ta-marbuta folded, for fuzzy matching."""
    t = DROP.sub("", "".join(MAP.get(c, c) for c in text))
    t = t.translate(str.maketrans("أإآٱىة", "اااايه"))
    return re.sub("[^ء-ي]", "", t)


def transcript(em, vocab):
    """Greedy CTC transcript of em, folded like fold()."""
    inv = {i: c for c, i in vocab.items()}
    out, prev = [], -1
    for a in em.argmax(1):
        if a != prev and a != 0:
            out.append(inv[a])
        prev = a
    return fold("".join(c for c in out if len(c) == 1))


def audio_16k(url, key):
    f = CACHE / "audio16k" / f"{key}.f32"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        raw = subprocess.run(
            ["ffmpeg", "-v", "error", "-reconnect", "1", "-reconnect_streamed", "1", "-i", url,
             "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
            check=True, capture_output=True).stdout
        f.write_bytes(raw)
    return np.frombuffer(f.read_bytes(), dtype=np.float32)


def emissions(model, proc, wav, key):
    """Log-probabilities [frames, vocab], computed in 30s chunks with 2s context."""
    f = CACHE / "emissions" / f"{key}.npy"
    if f.exists():
        return np.load(f)
    import torch
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    model.to(dev).eval()
    chunk, ctx = 30 * SR, 2 * SR
    hop = 320
    out = []
    for a in range(0, len(wav), chunk):
        lo, hi = max(0, a - ctx), min(len(wav), a + chunk + ctx)
        x = proc(wav[lo:hi], sampling_rate=SR, return_tensors="pt").input_values.to(dev)
        with torch.no_grad():
            lp = torch.log_softmax(model(x).logits[0].float(), -1).cpu().numpy()
        s = (a - lo) // hop
        n = (min(a + chunk, len(wav)) - a) // hop
        out.append(lp[s:s + n])
    em = np.concatenate(out)
    f.parent.mkdir(parents=True, exist_ok=True)
    np.save(f, em)
    return em


def viterbi(em, tokens, blank=0):
    """CTC Viterbi over em[T,V] for tokens; leading/trailing frames may stay blank.
    Returns (score, first frame of each token)."""
    T, L = len(em), len(tokens)
    S = 2 * L + 1
    lab = np.full(S, blank)
    lab[1::2] = tokens
    skip = np.zeros(S, bool)  # may jump over the blank before this label
    for s in range(3, S, 2):
        skip[s] = lab[s] != lab[s - 2]
    NEG = -1e30
    dp = np.full(S, NEG)
    dp[0] = em[0, blank]
    dp[1] = em[0, lab[1]]
    bp = np.zeros((T, S), np.int8)  # 0 stay, 1 from s-1, 2 from s-2
    for t in range(1, T):
        a = dp
        b = np.concatenate(([NEG], dp[:-1]))
        c = np.concatenate(([NEG, NEG], dp[:-2]))
        c = np.where(skip, c, NEG)
        best = np.maximum(a, np.maximum(b, c))
        bp[t] = np.where(best == a, 0, np.where(best == b, 1, 2))
        dp = best + em[t, lab]
    s = S - 1 if dp[S - 1] >= dp[S - 2] else S - 2
    score = dp[s]
    first = [None] * L
    for t in range(T - 1, -1, -1):
        if s % 2 == 1:
            first[s // 2] = t
        s -= int(bp[t, s]) if t > 0 else 0
    return score, first


def align_units(em, t0, units):
    """units: list of word lists (each word a token list), aligned jointly from
    frame t0. Returns per unit: (first frame of each word, frame of its last letter)."""
    toks, owner = [], []
    for u, words in enumerate(units):
        for w, letters_ in enumerate(words):
            toks += letters_
            owner += [(u, w)] * len(letters_)
    _, first = viterbi(em[t0:], toks)
    starts = [[None] * len(words) for words in units]
    last = [None] * len(units)
    for k, f in enumerate(first):
        u, w = owner[k]
        if starts[u][w] is None:
            starts[u][w] = f + t0
        last[u] = f + t0
    return list(zip(starts, last))


def energy_db(wav):
    n = int(SR * FR)
    m = len(wav) // n
    e = (wav[: m * n].reshape(m, n) ** 2).mean(1)
    return 10 * np.log10(e + 1e-10)


def main():
    reciter, surahs = sys.argv[1], [int(x) for x in sys.argv[2:]]
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained(MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(MODEL)
    vocab = proc.tokenizer.get_vocab()

    for surah in surahs:
        path = ROOT / "public/data/quran-timings" / reciter / f"{surah}.json"
        data = json.loads(path.read_text())
        glyphs = json.loads((ROOT / "public/data/quran-glyphs" / f"{surah}.json").read_text())
        key = f"{reciter}_{surah}"
        wav = audio_16k(data["audioUrl"], key)
        em = emissions(model, proc, wav, key)
        T = len(em)
        dur = len(wav) / SR
        db = energy_db(wav)[:T]
        p10, p60 = np.percentile(db, 10), np.percentile(db, 60)
        quiet = db < p10 + 0.35 * (p60 - p10)
        old = {v["ayahNumber"]: v for v in data["verseTimings"]}

        # Preludes before ayah 1, read off the model's own transcript of the
        # opening (a likelihood comparison would favour the longer text: the
        # rest of the Surah's speech is cheaper spread over extra letters than
        # forced into blank).
        heard = transcript(em[: int(40 / FR)], vocab)
        a1_text = fold("".join(spoken(w[2], True) for w in glyphs[0]["w"]))
        variants = {"": [], "b": [BISMILLAH], "ib": [ISTIADHAH, BISMILLAH], "i": [ISTIADHAH]}
        if surah in (1, 9):
            variants = {"": [], "i": [ISTIADHAH]}
        ratio = {}
        for k, parts in variants.items():
            want = fold("".join(parts)) + a1_text[:12]
            ratio[k] = round(SequenceMatcher(None, heard[: len(want)], want).ratio(), 2)
        pick = max(ratio, key=ratio.get)
        print(f"{reciter}/{surah} opening heard: {heard[:50]}  prelude ratios {ratio}", flush=True)

        # Units in recitation order: preludes, then every ayah.
        units = []  # (kind, number, words, estimated seconds)
        if "i" in pick:
            units.append(("istiadhah", 0, [letters(w, vocab) for w in ISTIADHAH.split()], 6))
        if "b" in pick:
            units.append(("bismillah", 0, [letters(w, vocab) for w in BISMILLAH.split()], 7))
        for ay in glyphs:
            est = old[ay["a"]]["durationSec"] if ay["a"] in old else 12
            opening = ay["a"] == 1 or (surah == 42 and ay["a"] == 2)
            units.append(("ayah", ay["a"], [letters(w[2], vocab, opening, i > 0) for i, w in enumerate(ay["w"])], est))

        # Joint alignment of K units at a time; only the first K-2 are kept,
        # so a unit is always followed by aligned speech (an unanchored last
        # letter could slide onto the same letter in a later ayah).
        K, KEEP = 6, 4
        found = []  # per unit: (word first frames, last-letter frame)
        cursor, i = 0, 0
        while i < len(units):
            chunk = units[i : i + K]
            est = sum(u[3] for u in chunk)
            hi = min(T, cursor + int((est * 1.5 + 15) / FR))
            res = align_units(em[:hi], cursor, [u[2] for u in chunk])
            keep = len(chunk) if i + K >= len(units) else KEEP
            found += res[:keep]
            cursor = res[keep - 1][1] + 1
            i += keep
            print(f"  aligned {i}/{len(units)} units, at {cursor * FR:.1f}s", flush=True)

        # Unit bounds: onset = first letter, pulled back onto the voice onset
        # (≤ 0.3s); end = the first pause (≥ 0.16s quiet) after its last letter,
        # never past the next unit's onset.
        onsets = []
        for k, (st, _) in enumerate(found):
            f = st[0]
            lo = max(0, f - 15, found[k - 1][1] + 1 if k else 0)
            while f > lo and not quiet[f - 1]:
                f -= 1
            onsets.append(f)
        ends = []
        for k, (_, last) in enumerate(found):
            nxt = onsets[k + 1] if k + 1 < len(found) else T
            f, e = last, nxt
            while f < nxt:
                if quiet[f : f + 8].all():
                    e = f
                    break
                f += 1
            ends.append(max(e, last + 1))

        prelude, verses = [], []
        for k, (kind, num, words, _) in enumerate(units):
            st, _ = found[k]
            if kind != "ayah":
                prelude.append({"type": kind, "startTime": round(onsets[k] * FR, 2), "endTime": round(ends[k] * FR, 2)})
                continue
            # A letter's CTC spike sits on its onset; Quran.com's word starts sit
            # ~0.08s earlier (in the pause before it). Match that convention.
            # Every word keeps at least MIN_WORD frames (the lead must not
            # swallow a short word such as مَا before ٱلْمَسِيحُ).
            starts = [onsets[k]]
            for f in st[1:]:
                starts.append(max(f - LEAD, starts[-1] + MIN_WORD))
            segs = []
            for w, s in enumerate(starts):
                e = starts[w + 1] if w + 1 < len(starts) else ends[k]
                segs.append({"wordIndex": w + 1, "startSec": round(s * FR, 3), "endSec": round(e * FR, 3)})
            fr, to = segs[0]["startSec"], segs[-1]["endSec"]
            verses.append({"verseKey": f"{surah}:{num}", "ayahNumber": num, "timestampFromSec": fr,
                           "timestampToSec": to, "durationSec": round(to - fr, 2), "segments": segs})

        out = {k: v for k, v in data.items() if k not in ("verseTimings", "embeddedPrelude", "repairs")}
        out["durationSeconds"] = round(dur)
        out["durationMs"] = round(dur * 1000)
        out["verseTimings"] = verses
        if prelude:
            out["embeddedPrelude"] = prelude
        out["repairs"] = [{
            "kind": "forced-alignment",
            "ayah": 0,
            "detail": "Quran.com timings describe another recording; word timings re-measured on the streamed audio "
                      f"by CTC forced alignment ({MODEL})",
            "evidence": {"audioSeconds": round(dur, 2), "quranComSeconds": data["durationSeconds"],
                         "prelude": pick or "none", "preludeMatch": ratio},
        }]
        path.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
        print(f"{reciter}/{surah}: {len(verses)} ayahs, prelude={pick or 'none'}, last ayah ends {verses[-1]['timestampToSec']}s of {dur:.1f}s", flush=True)


if __name__ == "__main__":
    main()
