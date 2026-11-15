#!/usr/bin/env python3
"""
Measure how far a reciter's word timings sit from the voice, word by word.

For every reciter x Surah the streamed recording is CTC forced-aligned
(scripts/generation/align-reciter-timings.py: same model, same units, same
caches) and each word's measured onset is compared with the timing file's
startSec for that word. lead = measured onset - startSec (s), so > 0 means the
highlight lights before the voice. Quran.com's starts sit ~0.08s before the
onset by convention (the aligner's LEAD), so a well-timed word reads ~0.08.

Writes one JSON row per stream to scripts/qa/results/word-lead/<reciter>.jsonl:
{surah, ayahs: [{a, lead: [per word | null]}]} (null = word not found or
repeated). Resumable: Surahs already in the file are skipped.

Usage:
  .qa-cache/align-venv/bin/python scripts/qa/word-lead.py alafasy 93 94
  .qa-cache/align-venv/bin/python scripts/qa/word-lead.py alafasy all
"""
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("align", ROOT / "scripts/generation/align-reciter-timings.py")
A = importlib.util.module_from_spec(spec)
spec.loader.exec_module(A)

FR = A.FR


def measure(reciter, surah, model, proc, vocab, timings_dir):
    data = json.loads((timings_dir / reciter / f"{surah}.json").read_text())
    glyphs = json.loads((ROOT / "public/data/quran-glyphs" / f"{surah}.json").read_text())
    key = f"{reciter}_{surah}"
    f32 = A.CACHE / "audio16k" / f"{key}.f32"
    had_f32 = f32.exists()
    src = data["audioUrl"]
    mp3 = A.CACHE / "mp3" / f"{key}.mp3"
    if not had_f32 and not (A.CACHE / "emissions" / f"{key}.npy").exists():
        # ffmpeg's own TLS fails on this Mac; curl fetches, ffmpeg decodes the file.
        mp3.parent.mkdir(parents=True, exist_ok=True)
        A.subprocess.run(["curl", "-sSfL", "--retry", "5", "--retry-all-errors", "--retry-delay", "10", "-o", str(mp3), src], check=True)
        f32.parent.mkdir(parents=True, exist_ok=True)
        A.subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", str(A.SR), "-f", "f32le", str(f32)],
                         check=True)
    npy = A.CACHE / "emissions" / f"{key}.npy"
    em = A.np.load(npy) if npy.exists() else A.emissions(model, proc, A.audio_16k(src, key), key)
    # Keep only the emissions (the 16 kHz copy is 64 kB/s); files other runs made stay.
    if not had_f32:
        f32.unlink(missing_ok=True)
    mp3.unlink(missing_ok=True)
    T = len(em)
    old = {v["ayahNumber"]: v for v in data["verseTimings"]}

    heard = A.transcript(em[: int(40 / FR)], vocab)
    a1 = A.fold("".join(A.spoken(w[2], ay["a"] == 1) for ay in glyphs[:3] for w in ay["w"]))[:20]
    variants = {"": [], "b": [A.BISMILLAH], "ib": [A.ISTIADHAH, A.BISMILLAH], "i": [A.ISTIADHAH]}
    if surah in (1, 9):
        variants = {"": [], "i": [A.ISTIADHAH]}
    ratio = {k: A.SequenceMatcher(None, heard[: len(A.fold("".join(p)) + a1)], A.fold("".join(p)) + a1).ratio()
             for k, p in variants.items()}
    pick = max(ratio, key=ratio.get)

    units = []
    if "i" in pick:
        units.append(("pre", 0, [A.letters(w, vocab) for w in A.ISTIADHAH.split()], 6))
    if "b" in pick:
        units.append(("pre", 0, [A.letters(w, vocab) for w in A.BISMILLAH.split()], 7))
    for ay in glyphs:
        opening = ay["a"] == 1 or (surah == 42 and ay["a"] == 2)
        units.append(("ayah", ay["a"], [A.letters(w[2], vocab, opening, i > 0) for i, w in enumerate(ay["w"])],
                      A.ayah_estimate(old, ay["a"])))

    K, KEEP = 6, 4
    found, cursor, i = [], 0, 0
    while i < len(units):
        chunk = units[i : i + K]
        hi = min(T, cursor + int((sum(u[3] for u in chunk) * 1.5 + 15) / FR))
        if hi <= cursor:
            return {"surah": surah, "error": f"ran past the audio end at unit {i}"}
        res = A.align_units(em[:hi], cursor, [u[2] for u in chunk])
        keep = len(chunk) if i + K >= len(units) else KEEP
        found += res[:keep]
        cursor = res[keep - 1][1] + 1
        i += keep

    ayahs = []
    for k, (kind, num, words, _) in enumerate(units):
        if kind != "ayah":
            continue
        vis, _ = found[k]
        seen = {}
        for w, f in vis:
            seen.setdefault(w, []).append(f)
        # A letter's CTC spike sits on its onset (first frame of the first letter).
        onset = {w + 1: fs[0] * FR for w, fs in seen.items() if len(fs) == 1}
        segs = (old.get(num) or {}).get("segments") or []
        firsts = {}
        for s in segs:
            firsts.setdefault(s["wordIndex"], []).append(s["startSec"])
        lead = []
        for w in range(1, len(words) + 1):
            qs = firsts.get(w)
            lead.append(round(onset[w] - qs[0], 3) if w in onset and qs and len(qs) == 1 else None)
        ayahs.append({"a": num, "lead": lead})
    return {"surah": surah, "prelude": pick or "none", "ayahs": ayahs}


def main():
    reciter = sys.argv[1]
    args = [a for a in sys.argv[2:] if not a.startswith("--")]
    timings_dir = Path(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--timings=")),
                            ROOT / "public/data/quran-timings"))
    out = Path(next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--out=")),
                    ROOT / "scripts/qa/results/word-lead" / f"{reciter}.jsonl"))
    surahs = list(range(1, 115)) if args == ["all"] else [int(x) for x in args]
    out.parent.mkdir(parents=True, exist_ok=True)
    done = set()
    if out.exists():
        done = {json.loads(l)["surah"] for l in out.read_text().splitlines() if l.strip()}
    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained(A.MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(A.MODEL)
    vocab = proc.tokenizer.get_vocab()
    for s in surahs:
        if s in done:
            continue
        try:
            row = measure(reciter, s, model, proc, vocab, timings_dir)
        except A.subprocess.CalledProcessError as e:
            # Download / decode failed (quranicaudio sometimes answers 503): not
            # recorded, so the next run retries it.
            print(f"{reciter}/{s}: skipped, {e.cmd[0]} failed ({e.returncode})", flush=True)
            continue
        with out.open("a") as f:
            f.write(json.dumps(row) + "\n")
        flat = [x for a in row.get("ayahs", []) for x in a["lead"] if x is not None]
        flat.sort()
        med = flat[len(flat) // 2] if flat else None
        print(f"{reciter}/{s}: {len(flat)} words, median lead {med}", flush=True)


if __name__ == "__main__":
    main()
