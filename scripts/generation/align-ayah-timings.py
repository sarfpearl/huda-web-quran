#!/usr/bin/env python3
"""
Re-measure the word timings of single ayahs whose Quran.com segments are
unusable (the app shows them without word highlight: displaced, too few
segments, overlapping their neighbour, off the recording …), on the streamed
recording itself. The rest of the Surah's timings are left as they are.

Same CTC forced alignment as align-reciter-timings.py, but local: each run of
consecutive broken ayahs is aligned together with its good neighbour ayahs as
anchors, inside a window from the previous ayah's start to the next ayah's
end. Only the broken ayahs are written back; each gets a
"forced-alignment-ayah" entry in `repairs` with its evidence:
  transcriptMatch — the model's own (greedy) transcript of the new ayah span vs
                    the Mushaf text (letters only), 0..1
  anchorDriftSec  — per anchor, the median offset of its measured word starts
                    from its existing (good) ones (word 1 excluded: Quran.com
                    often starts it in the pause before the ayah): a check
                    that the alignment locked onto the right speech
  onsetSec        — new first-word start minus the voice onset after the
                    nearest pause (≥ 0.2s, within ±1.5s); null = recited
                    straight on from the previous ayah
An ayah is written only when transcriptMatch ≥ MIN_MATCH and |onsetSec| ≤
MAX_ONSET (when there is a pause); the others are
reported and left without highlight. A large anchorDriftSec with a good match
means the neighbour's own Quran.com timing is off, not this ayah's.
Verify afterwards with scripts/qa (repair-timings → sync-suite).

Usage (list = JSON [{r, s, a, why}], e.g. from sync-suite's ayah-no-word-timing):
  .qa-cache/align-venv/bin/python scripts/generation/align-ayah-timings.py list.json [--dry] [--only=reciter/surah]
"""
import importlib.util
import json
import os
import subprocess
import sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("whole", HERE / "align-reciter-timings.py")
W = importlib.util.module_from_spec(spec)
spec.loader.exec_module(W)

ROOT, CACHE, SR, FR = W.ROOT, W.CACHE, W.SR, W.FR
MP3 = Path(os.environ.get("MP3_CACHE", CACHE / "mp3"))
PAD = 1.0  # seconds of audio around the anchors
MIN_MATCH = 0.6
MAX_ONSET = 0.3


def audio(url, key):
    """Whole streamed recording, 16 kHz mono float32 (the MP3 is cached, not the PCM)."""
    f = MP3 / f"{key}.mp3"
    if not f.exists():
        f.parent.mkdir(parents=True, exist_ok=True)
        tmp = f.with_suffix(".part")
        subprocess.run(["curl", "-sfL", "--retry", "5", "--retry-all-errors", "-o", str(tmp), url], check=True)
        tmp.rename(f)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def emissions(model, proc, wav, lo, hi):
    """Log-probabilities for frames [lo, hi) of wav, 30s chunks with 2s context."""
    import torch
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    hop, chunk, ctx = 320, 30 * SR, 2 * SR
    a0, a1 = lo * hop, min(len(wav), hi * hop)
    out = []
    for a in range(a0, a1, chunk):
        c0, c1 = max(0, a - ctx), min(len(wav), a + chunk + ctx)
        x = proc(wav[c0:c1], sampling_rate=SR, return_tensors="pt").input_values.to(dev)
        with torch.no_grad():
            lp = torch.log_softmax(model(x).logits[0].float(), -1).cpu().numpy()
        s = (a - c0) // hop
        n = (min(a + chunk, a1) - a) // hop
        out.append(lp[s:s + n])
    return np.concatenate(out)


def onset_offset(quiet, t):
    """t minus the voice onset after the quiet run (≥ 0.2s) nearest to t (±1.5s), or None."""
    f0, f1 = max(0, int((t - 1.5) / FR)), min(len(quiet), int((t + 1.5) / FR))
    best, q = None, 0
    for f in range(f0, f1):
        if quiet[f]:
            q += 1
        else:
            if q >= 10 and (best is None or abs(t - f * FR) < abs(best)):
                best = t - f * FR
            q = 0
    return None if best is None else round(best, 2)


def first_start(v):
    segs = v.get("segments") or []
    return min(x["startSec"] for x in segs) if segs else v["timestampFromSec"]


def last_end(v):
    segs = v.get("segments") or []
    return max(x["endSec"] for x in segs) if segs else v["timestampToSec"]


def runs_of(ayahs):
    out = []
    for a in sorted(ayahs):
        if out and out[-1][-1] == a - 1:
            out[-1].append(a)
        else:
            out.append([a])
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    dry = "--dry" in sys.argv
    only = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")), None)
    todo = {}
    for x in json.loads(Path(args[0]).read_text()):
        todo.setdefault((x["r"], x["s"]), {})[x["a"]] = x["why"]

    from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
    proc = Wav2Vec2Processor.from_pretrained(W.MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(W.MODEL)
    import torch
    model.to("mps" if torch.backends.mps.is_available() else "cpu").eval()
    vocab = proc.tokenizer.get_vocab()
    report = []

    for (reciter, surah), broken in sorted(todo.items()):
        if only and only != f"{reciter}/{surah}":
            continue
        path = ROOT / "public/data/quran-timings" / reciter / f"{surah}.json"
        data = json.loads(path.read_text())
        glyphs = {ay["a"]: ay for ay in json.loads((ROOT / "public/data/quran-glyphs" / f"{surah}.json").read_text())}
        vt = {v["ayahNumber"]: v for v in data["verseTimings"]}
        try:
            wav = audio(data["audioUrl"], f"{reciter}_{surah}")
        except subprocess.CalledProcessError as e:
            print(f"{reciter}/{surah}: audio download failed ({e.returncode}) — skipped", flush=True)
            report += [{"r": reciter, "s": surah, "a": a, "why": w, "ok": False, "error": "audio download failed"} for a, w in broken.items()]
            continue
        T = len(wav) // 320
        db = W.energy_db(wav)[:T]
        p10, p60 = np.percentile(db, 10), np.percentile(db, 60)
        quiet = db < p10 + 0.35 * (p60 - p10)
        repairs = data.get("repairs", [])
        changed = False

        for run in runs_of(broken):
            prev, nxt = run[0] - 1, run[-1] + 1
            prev = prev if prev in vt and prev not in broken else None
            nxt = nxt if nxt in vt and nxt not in broken else None
            first = vt[run[0]]
            t_lo = first_start(vt[prev]) if prev else min(first_start(first), first["timestampFromSec"])
            t_hi = last_end(vt[nxt]) if nxt else max(last_end(vt[run[-1]]), vt[run[-1]]["timestampToSec"])
            lo = max(0, int((t_lo - PAD) / FR))
            hi = min(T, int((t_hi + PAD) / FR))
            nums = ([prev] if prev else []) + run + ([nxt] if nxt else [])

            def words(a):
                opening = a == 1 or (surah == 42 and a == 2)
                return [W.letters(w[2], vocab, opening, i > 0) for i, w in enumerate(glyphs[a]["w"])]

            em = emissions(model, proc, wav, lo, hi)
            found = W.align_units(em, 0, [words(a) for a in nums])
            found = [([(w, f + lo) for w, f in vis], last + lo if last is not None else None) for vis, last in found]

            # Unit bounds as in align-reciter-timings.py: onset pulled back onto
            # the voice (≤ 0.3s), end = first ≥0.16s pause after the last letter.
            onsets = []
            for k, (vis, _) in enumerate(found):
                f = vis[0][1]
                lo_k = max(0, f - 15, found[k - 1][1] + 1 if k else 0)
                while f > lo_k and not quiet[f - 1]:
                    f -= 1
                onsets.append(f)
            ends = []
            for k, (_, last) in enumerate(found):
                stop = onsets[k + 1] if k + 1 < len(found) else hi
                f, e = last, stop
                while f < stop:
                    if quiet[f : f + 8].all():
                        e = f
                        break
                    f += 1
                ends.append(max(e, last + 1))

            drift = []
            for k, a in enumerate(nums):
                if a in broken:
                    continue
                qdc = {}
                for x in vt[a].get("segments") or []:
                    qdc.setdefault(x["wordIndex"], x["startSec"])
                seen, d = set(), []
                for w, f in found[k][0]:
                    if w > 0 and w not in seen and w + 1 in qdc:
                        d.append((f - W.LEAD) * FR - qdc[w + 1])
                    seen.add(w)
                drift.append(round(float(np.median(d)), 2) if d else 0.0)
            for k, a in enumerate(nums):
                if a in broken:
                    vis = found[k][0]
                    starts = [onsets[k]]
                    for _, f in vis[1:]:
                        starts.append(max(f - W.LEAD, starts[-1] + W.MIN_WORD))
                    segs = []
                    for i, s in enumerate(starts):
                        e = starts[i + 1] if i + 1 < len(starts) else ends[k]
                        segs.append({"wordIndex": vis[i][0] + 1, "startSec": round(s * FR, 3), "endSec": round(e * FR, 3)})
                    want = W.fold("".join(W.spoken(w[2], a == 1) for w in glyphs[a]["w"]))
                    heard = W.transcript(em[onsets[k] - lo : ends[k] - lo], vocab)
                    match = round(SequenceMatcher(None, heard, want, autojunk=False).ratio(), 2)
                    onset = onset_offset(quiet, segs[0]["startSec"])
                    ok = match >= MIN_MATCH and (onset is None or abs(onset) <= MAX_ONSET)
                    row = {"r": reciter, "s": surah, "a": a, "why": broken[a], "ok": ok, "match": match, "onset": onset,
                           "anchorDrift": drift, "from": segs[0]["startSec"], "to": segs[-1]["endSec"],
                           "old": [first_start(vt[a]), last_end(vt[a])], "heard": heard, "want": want}
                    report.append(row)
                    print(json.dumps({k2: row[k2] for k2 in ("r", "s", "a", "ok", "match", "onset", "anchorDrift", "from", "to", "old")}), flush=True)
                    if not ok:
                        continue
                    v = vt[a]
                    v["segments"] = segs
                    v.pop("misaligned", None)
                    # The ayah's window follows its measured words, kept clear of
                    # the neighbours' measured voice.
                    v["timestampFromSec"] = segs[0]["startSec"]
                    v["timestampToSec"] = segs[-1]["endSec"]
                    v["durationSec"] = round(segs[-1]["endSec"] - segs[0]["startSec"], 2)
                    repairs[:] = [x for x in repairs if not (x.get("ayah") == a and x.get("kind") in ("misaligned", "forced-alignment-ayah"))]
                    repairs.append({
                        "kind": "forced-alignment-ayah", "ayah": a,
                        "detail": f"Quran.com word segments unusable ({broken[a]}); re-measured on the streamed audio by CTC forced alignment ({W.MODEL}), neighbour ayahs as anchors",
                        "evidence": {"transcriptMatch": match, "onsetSec": onset, "anchorDriftSec": drift, "oldSpanSec": row["old"]},
                    })
                    changed = True
            # Neighbour windows must not reach into a re-measured ayah.
            for a in run:
                v = vt[a]
                if not any(x.get("kind") == "forced-alignment-ayah" and x.get("ayah") == a for x in repairs):
                    continue
                p, n = vt.get(a - 1), vt.get(a + 1)
                if p and a - 1 not in broken and p["timestampToSec"] > v["timestampFromSec"]:
                    p["timestampToSec"] = max(last_end(p), v["timestampFromSec"])
                if n and a + 1 not in broken and n["timestampFromSec"] < v["timestampToSec"]:
                    n["timestampFromSec"] = min(first_start(n), v["timestampToSec"])

        if changed and not dry:
            data["repairs"] = repairs
            path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))

    out = ROOT / "scripts/qa/results/ayah-alignment.json"
    prior = json.loads(out.read_text()) if out.exists() and only else []
    keep = [x for x in prior if f"{x['r']}/{x['s']}" != only]
    out.write_text(json.dumps(keep + report, ensure_ascii=False, indent=1))
    print(json.dumps({"aligned": len(report), "written": sum(x["ok"] for x in report), "dry": dry}))


if __name__ == "__main__":
    main()
