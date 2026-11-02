"""Spike aligner: aeneas (espeak-ng, cew off) + tail-collapse repair.
Returns per-word [begin,end] for a meaning clip given its exact text."""
import os, json, tempfile, subprocess, re
os.environ.setdefault("PYTHONIOENCODING","UTF-8")
from aeneas.executetask import ExecuteTask
from aeneas.task import Task
from aeneas.runtimeconfiguration import RuntimeConfiguration

RCONF = RuntimeConfiguration(u"cew=False|tts=espeak|tts_path=/usr/bin/espeak-ng")
LANG = {"en":"eng","ta":"tam"}
EPS = 0.06  # a word shorter than this is "collapsed"

def _dur(mp3):
    return float(subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",mp3],
                                capture_output=True,text=True).stdout.strip())

def _speech_end(mp3, dur):
    """Clip end minus trailing silence (noise -35dB)."""
    out = subprocess.run(["ffmpeg","-hide_banner","-i",mp3,"-af","silencedetect=noise=-35dB:d=0.15","-f","null","-"],
                         capture_output=True,text=True).stderr
    starts=[float(m) for m in re.findall(r"silence_start: ([\d.]+)", out)]
    ends=[float(m) for m in re.findall(r"silence_end: ([\d.]+)", out)]
    # trailing silence: a silence_start with no later silence_end (runs to EOF)
    if starts and (not ends or starts[-1] > (ends[-1] if ends else 0) - 0.01) and starts[-1] > dur*0.5:
        # confirm it's trailing (within last chunk)
        if not ends or starts[-1] >= ends[-1]-0.01:
            return max(0.0, starts[-1])
    return dur

def _wlen(w):
    core = re.sub(r"[^\w஀-௿]", "", w)  # strip punctuation/paren; keep Tamil block
    return max(1, len(core))

def align(mp3, lang, text):
    words = text.split()
    if not words: return {"words": [], "dur": 0, "repaired": False}
    dur = _dur(mp3)
    tf = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8")
    tf.write("\n".join(words)); tf.close(); outf = tf.name + ".json"
    cfg = f"task_language={LANG[lang]}|is_text_type=plain|os_task_file_format=json"
    task = Task(config_string=cfg)
    task.audio_file_path_absolute = mp3
    task.text_file_path_absolute = tf.name
    task.sync_map_file_path_absolute = outf
    ExecuteTask(task, rconf=RCONF).execute(); task.output_sync_map_file()
    frags = json.load(open(outf))["fragments"]
    os.unlink(tf.name); os.unlink(outf)
    ws = [[f["lines"][0], round(float(f["begin"]),3), round(float(f["end"]),3)] for f in frags]

    # ---- tail-collapse repair ----
    repaired = False
    n = len(ws)
    start = n
    while start-1 >= 0 and (ws[start-1][2]-ws[start-1][1]) < EPS:
        start -= 1
    if 0 < start < n:  # there is a trailing collapsed run and something before it
        se = _speech_end(mp3, dur)
        anchor = ws[start-1][1] + max(EPS, (ws[start-1][2]-ws[start-1][1]))  # keep prev word a sliver
        end = max(se, anchor + 0.2, ws[-1][2])
        run = ws[start:]
        weights = [_wlen(w[0]) for w in run]
        tot = sum(weights) or len(run)
        # also give the last "good" word before the run a fair share? keep it; start redistributing after it
        t = ws[start-1][2]
        span = end - t
        if span > 0.15:  # only repair if there's real room
            for k,w in enumerate(run):
                d = span*weights[k]/tot
                ws[start+k] = [w[0], round(t,3), round(t+d,3)]
                t += d
            repaired = True
    # clamp monotonic + final end to speech end
    for i in range(1,len(ws)):
        if ws[i][1] < ws[i-1][1]: ws[i][1] = ws[i-1][1]
        if ws[i][2] < ws[i][1]: ws[i][2] = ws[i][1]
    return {"words": ws, "dur": round(dur,3), "repaired": repaired}

if __name__ == "__main__":
    import sys
    # Usage: python aligner.py en:001007 ta:112001 [voice]
    #   key = SSSAAA (surah+ayah, zero-padded). Reads the exact spoken text from
    #   sample-texts.json and streams the clip from the public R2 bucket if no
    #   local copy exists. Pass a trailing bare arg to set the voice (default cruz).
    WS=os.path.dirname(os.path.abspath(__file__))
    R2="https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev"
    texts=json.load(open(os.path.join(WS,"sample-texts.json")))
    voice="cruz"
    targets=[]
    for a in sys.argv[1:]:
        (targets.append(a) if ":" in a else globals().__setitem__("voice", a))
    for t in targets:
        lang,key=t.split(":")
        local=os.path.join(WS,"audio",f"{voice}_{lang}_{key}.mp3")
        if os.path.exists(local):
            mp3=local
        else:
            mp3=os.path.join(tempfile.gettempdir(),f"{voice}_{lang}_{key}.mp3")
            if not os.path.exists(mp3):
                url=f"{R2}/audio/meaning/v1/{voice}/{lang}/{key}.mp3"
                rc=subprocess.run(["curl","-fsSL","-o",mp3,url]).returncode
                if rc!=0:
                    import urllib.request; urllib.request.urlretrieve(url, mp3)
        txt=texts.get(key,{}).get(lang)
        if not txt:
            print(f"\n== {t}: no text in sample-texts.json (add it or point at your own data) =="); continue
        r=align(mp3,lang,txt)
        print(f"\n== {t} ({voice}) dur {r['dur']} repaired={r['repaired']} ==")
        for w,b,e in r["words"]:
            print(f"  [{b:6.3f}->{e:6.3f}] ({e-b:5.3f}) {w}")
