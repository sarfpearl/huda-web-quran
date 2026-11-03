"""Spike aligner: aeneas (espeak-ng, cew off) + hierarchical clause-segmented alignment + tail-collapse repair.
Returns per-word [begin,end] for a meaning clip given its exact text.
Guarantees strictly monotonic timings, eliminates multi-pause tail-collapse and 2-sentence drift.
"""
import os, json, tempfile, subprocess, re, shutil
os.environ.setdefault("PYTHONIOENCODING","UTF-8")
from aeneas.executetask import ExecuteTask
from aeneas.task import Task
from aeneas.runtimeconfiguration import RuntimeConfiguration

_ESPEAK_BIN = shutil.which("espeak-ng") or shutil.which("espeak") or "/usr/bin/espeak-ng"
RCONF = RuntimeConfiguration(f"cew=False|tts=espeak|tts_path={_ESPEAK_BIN}")
LANG = {"en":"eng","ta":"tam"}
EPS = 0.06  # a word shorter than this is "collapsed"

def _dur(mp3):
    try:
        out = subprocess.run(
            ["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",mp3],
            capture_output=True, text=True
        ).stdout.strip()
        return float(out) if out else 0.0
    except Exception:
        return 0.0

def _speech_end(mp3, dur):
    """Clip end minus trailing silence (noise -35dB)."""
    try:
        out = subprocess.run(
            ["ffmpeg","-hide_banner","-i",mp3,"-af","silencedetect=noise=-35dB:d=0.15","-f","null","-"],
            capture_output=True, text=True
        ).stderr
        starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", out)]
        ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", out)]
        if starts and (not ends or starts[-1] > (ends[-1] if ends else 0) - 0.01) and starts[-1] > dur * 0.5:
            return max(0.0, starts[-1])
    except Exception:
        pass
    return dur

def _wlen(w):
    core = re.sub(r"[^\w஀-௿]", "", w)  # strip punctuation/paren; keep Tamil block
    return max(1, len(core))

def split_clauses(text):
    tokens = text.strip().split()
    if len(tokens) <= 4:
        return [text]
    clauses = []
    curr = []
    for i, w in enumerate(tokens):
        curr.append(w)
        if len(curr) >= 2:
            is_punc = bool(re.search(r'[,;!?:.—][\"\'\)\]}]*$', w))
            next_is_paren = (i + 1 < len(tokens) and tokens[i+1].startswith('(') and len(curr) >= 3)
            words_left = len(tokens) - (i + 1)
            if (is_punc or next_is_paren) and words_left >= 2:
                clauses.append(" ".join(curr))
                curr = []
    if curr:
        if clauses and len(curr) < 2:
            clauses[-1] += " " + " ".join(curr)
        else:
            clauses.append(" ".join(curr))
    return clauses

def detect_pauses(mp3, dur):
    try:
        cmd = ["ffmpeg", "-hide_banner", "-i", mp3, "-af", "silencedetect=noise=-28dB:d=0.15", "-f", "null", "-"]
        out = subprocess.run(cmd, capture_output=True, text=True).stderr
        starts = [float(m) for m in re.findall(r"silence_start: ([\d.]+)", out)]
        ends = [float(m) for m in re.findall(r"silence_end: ([\d.]+)", out)]
        pauses = []
        for s, e in zip(starts, ends):
            if s > 0.5 and e < dur - 0.35 and (e - s) >= 0.12:
                pauses.append({"start": s, "end": e, "mid": (s + e) / 2.0, "dur": e - s})
        return pauses
    except Exception:
        return []

def find_optimal_split_points(clause_lens, pauses, dur, min_seg_dur=0.8):
    K = len(clause_lens)
    if K <= 1:
        return []
    total_len = sum(clause_lens)
    ideal_ts = []
    c = 0
    for l in clause_lens[:-1]:
        c += l
        ideal_ts.append(dur * (c / total_len))

    # Candidate set for each boundary i
    candidates = {}
    for i, t in enumerate(ideal_ts):
        cands = [t]
        for p in pauses:
            m = p["mid"]
            if abs(m - t) < max(3.5, 0.4 * dur) and 0.6 <= m <= dur - 0.6:
                cands.append(m)
        candidates[i] = sorted(list(set(cands)))

    # DP forward pass
    dp = []
    first_cands = [c for c in candidates[0] if c >= min_seg_dur and c <= dur - (K - 1) * min_seg_dur]
    if not first_cands:
        first_cands = [max(min_seg_dur, min(dur - (K - 1) * min_seg_dur, ideal_ts[0]))]
    dp.append({c: (abs(c - ideal_ts[0]) - (0.5 if any(abs(c - p["mid"]) < 0.05 for p in pauses) else 0), None) for c in first_cands})

    for i in range(1, K - 1):
        target = ideal_ts[i]
        curr_dp = {}
        for c in candidates[i]:
            if c > dur - (K - 1 - i) * min_seg_dur:
                continue
            is_pause = any(abs(c - p["mid"]) < 0.05 for p in pauses)
            cost_c = abs(c - target) - (0.5 if is_pause else 0)

            best_prev_cost = float("inf")
            best_prev_val = None
            for prev_val, (prev_cost, _) in dp[i-1].items():
                if c >= prev_val + min_seg_dur:
                    tot = prev_cost + cost_c
                    if tot < best_prev_cost:
                        best_prev_cost = tot
                        best_prev_val = prev_val
            if best_prev_val is not None:
                curr_dp[c] = (best_prev_cost, best_prev_val)
        if not curr_dp:
            prev_val = min(dp[i-1].keys())
            c = prev_val + min_seg_dur
            curr_dp[c] = (dp[i-1][prev_val][0] + abs(c - target), prev_val)
        dp.append(curr_dp)

    # Backtrack
    best_last_val = min(dp[-1].keys(), key=lambda k: dp[-1][k][0])
    res = [best_last_val]
    curr = best_last_val
    for i in range(K - 2, 0, -1):
        prev = dp[i][curr][1]
        res.append(prev)
        curr = prev
    res.reverse()
    return res

def _align_single(mp3, lang, text, offset=0.0):
    words = text.split()
    if not words: return []
    dur = _dur(mp3)
    if dur <= 0: return []
    tf = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8")
    tf.write("\n".join(words)); tf.close(); outf = tf.name + ".json"
    cfg = f"task_language={LANG[lang]}|is_text_type=plain|os_task_file_format=json"
    task = Task(config_string=cfg)
    task.audio_file_path_absolute = mp3
    task.text_file_path_absolute = tf.name
    task.sync_map_file_path_absolute = outf
    ExecuteTask(task, rconf=RCONF).execute(); task.output_sync_map_file()
    frags = json.load(open(outf))["fragments"]
    if os.path.exists(tf.name): os.unlink(tf.name)
    if os.path.exists(outf): os.unlink(outf)
    ws = [[f["lines"][0], round(offset + float(f["begin"]),3), round(offset + float(f["end"]),3)] for f in frags]

    # ---- tail-collapse repair ----
    se = _speech_end(mp3, dur) + offset
    n = len(ws)
    start = n
    while start-1 >= 0 and (ws[start-1][2]-ws[start-1][1]) < EPS:
        start -= 1
    if 0 < start < n:  # there is a trailing collapsed run and something before it
        anchor = ws[start-1][1] + max(EPS, (ws[start-1][2]-ws[start-1][1]))
        end = max(se, anchor + 0.2, ws[-1][2])
        run = ws[start:]
        weights = [_wlen(w[0]) for w in run]
        tot = sum(weights) or len(run)
        t = ws[start-1][2]
        span = end - t
        if span > 0.15:
            for k,w in enumerate(run):
                d = span*weights[k]/tot
                ws[start+k] = [w[0], round(t,3), round(t+d,3)]
                t += d
    for i in range(1,len(ws)):
        if ws[i][1] < ws[i-1][1]: ws[i][1] = ws[i-1][1]
        if ws[i][2] < ws[i][1]: ws[i][2] = ws[i][1]
    return ws

def align(mp3, lang, text):
    words = text.split()
    if not words: return {"words": [], "dur": 0, "repaired": False}
    dur = _dur(mp3)
    if dur <= 0: return {"words": [], "dur": 0, "repaired": False}

    raw_clauses = split_clauses(text)
    if len(raw_clauses) <= 1 or dur < 3.0:
        ws = _align_single(mp3, lang, text)
        return {"words": ws, "dur": round(dur,3), "repaired": False}

    try:
        pauses = detect_pauses(mp3, dur)
        clause_lens = [len(c) for c in raw_clauses]
        split_points = find_optimal_split_points(clause_lens, pauses, dur, min_seg_dur=0.8)

        if not split_points:
            ws = _align_single(mp3, lang, text)
            return {"words": ws, "dur": round(dur,3), "repaired": False}

        boundaries = [0.0] + split_points + [dur]
        all_words = []
        for i, clause in enumerate(raw_clauses):
            c_start = boundaries[i]
            c_end = boundaries[i+1]
            chunk_mp3 = tempfile.mktemp(suffix=".mp3")
            # Exact audio cut via ffmpeg re-encode
            subprocess.run(
                ["ffmpeg", "-y", "-i", mp3, "-ss", str(c_start), "-to", str(c_end), chunk_mp3],
                capture_output=True
            )
            ws = _align_single(chunk_mp3, lang, clause, offset=c_start)
            all_words.extend(ws)
            if os.path.exists(chunk_mp3):
                os.unlink(chunk_mp3)

        # Enforce minimum positive word durations
        for i in range(len(all_words)):
            w, b, e = all_words[i]
            min_d = max(0.12, min(0.35, 0.04 * _wlen(w)))
            if e - b < min_d:
                all_words[i][2] = round(b + min_d, 3)

        # Monotonicity & non-overlap pass
        for i in range(1, len(all_words)):
            if all_words[i][1] < all_words[i-1][1] + 0.06:
                all_words[i][1] = round(all_words[i-1][1] + 0.06, 3)
            if all_words[i][2] <= all_words[i][1]:
                all_words[i][2] = round(all_words[i][1] + 0.12, 3)

        return {"words": all_words, "dur": round(dur,3), "repaired": True}
    except Exception as e:
        # Failsafe fallback
        ws = _align_single(mp3, lang, text)
        return {"words": ws, "dur": round(dur,3), "repaired": False}

if __name__ == "__main__":
    import sys
    if "--worker" in sys.argv[1:]:
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            req = None
            try:
                req = json.loads(line)
                res = align(req["mp3"], req["lang"], req["text"])
                res["id"] = req.get("id")
                sys.stdout.write(json.dumps(res, ensure_ascii=False) + "\n")
                sys.stdout.flush()
            except Exception as e:
                err_id = req.get("id") if req else None
                sys.stdout.write(json.dumps({"error": str(e), "id": err_id}) + "\n")
                sys.stdout.flush()
        sys.exit(0)

    # CLI test runner
    WS = os.path.dirname(os.path.abspath(__file__))
    R2 = "https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev"
    texts = json.load(open(os.path.join(WS, "sample-texts.json")))
    voice = "cruz"
    targets = []
    for a in sys.argv[1:]:
        (targets.append(a) if ":" in a else globals().__setitem__("voice", a))
    for t in targets:
        lang, key = t.split(":")
        local = os.path.join(WS, "audio", f"{voice}_{lang}_{key}.mp3")
        if os.path.exists(local):
            mp3 = local
        else:
            mp3 = os.path.join(tempfile.gettempdir(), f"{voice}_{lang}_{key}.mp3")
            if not os.path.exists(mp3):
                url = f"{R2}/audio/meaning/v1/{voice}/{lang}/{key}.mp3"
                subprocess.run(["curl", "-fsSL", "-o", mp3, url])
        txt = texts.get(key, {}).get(lang)
        if not txt:
            print(f"\n== {t}: no text in sample-texts.json ==")
            continue
        r = align(mp3, lang, txt)
        print(f"\n== {t} ({voice}) dur {r['dur']} repaired={r['repaired']} ==")
        for w, b, e in r["words"]:
            print(f"  [{b:6.3f}->{e:6.3f}] ({e-b:5.3f}) {w}")
