"""Word timings for Al-Fatihah's Isti'adhah meaning clip ("ayah 0" of Surah 1).

The clip is not an ayah, so build-meaning-timings.mjs (aeneas) skips it and the
app lit the whole line at once while it played. These clips are short, and
aeneas runs late on them (the last words land after the voice has stopped),
so this uses Whisper large-v3's word timestamps instead, mapped onto the exact
text shown (CANONICAL_ISTIADHAH in src/lib/data/quranVerses.ts).

Writes key "0" into public/data/meaning-timings/<voice>/<lang>/1.json (the
other keys are left as they are; build-meaning-timings.mjs keeps "0").

Needs mlx-whisper (Apple GPU) — the VoiceStudio venv has it:
  ../../pilot-voicestudio/.venv-mlx/bin/python scripts/generation/align-istiadhah-meaning.py
"""
import json, os, re, sys, tempfile, urllib.request

import mlx_whisper

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
MODEL = "mlx-community/whisper-large-v3-mlx"
R2 = "https://media.hudaguidance.com/audio/meaning/v1"
TEXT = {
    "en": "I seek refuge in Allah from the accursed Satan.",
    "ta": "விரட்டப்பட்ட ஷைத்தானை விட்டும் அல்லாஹ்விடம் நான் பாதுகாப்புத் தேடுகிறேன்.",
}


def wlen(w):
    return max(1, len(re.sub(r"[^\w஀-௿]", "", w)))


def clip(voice, lang):
    local = os.path.join(ROOT, "node_modules/.cache/huda-meaning-audio", voice, lang, "001000.mp3")
    if os.path.exists(local):
        return local
    path = os.path.join(tempfile.gettempdir(), f"istiadhah-{voice}-{lang}.mp3")
    urllib.request.urlretrieve(f"{R2}/{voice}/{lang}/001000.mp3", path)
    return path


def heard(mp3, lang):
    r = mlx_whisper.transcribe(mp3, path_or_hf_repo=MODEL, language=lang, word_timestamps=True,
                               condition_on_previous_text=False, verbose=None)
    return [(w["word"].strip(), w["start"], w["end"]) for s in r["segments"] for w in s["words"] if w["word"].strip()]


def map_words(words, heard_words):
    """Shown words onto Whisper's: one to one when the counts match, else by
    each word's share of the letters along Whisper's timeline."""
    if len(words) == len(heard_words):
        return [[w, round(b, 3), round(e, 3)] for w, (_, b, e) in zip(words, heard_words)]
    marks, total = [], 0  # (letters so far, time) along what Whisper heard
    for hw, b, e in heard_words:
        marks.append((total, b))
        total += wlen(hw)
        marks.append((total, e))
    def at(frac):
        pos = frac * total
        for (p0, t0), (p1, t1) in zip(marks, marks[1:]):
            if p0 <= pos <= p1:
                return t0 if p1 == p0 else t0 + (t1 - t0) * (pos - p0) / (p1 - p0)
        return marks[-1][1]
    shown_total = sum(wlen(w) for w in words)
    out, done = [], 0
    for w in words:
        b = at(done / shown_total)
        done += wlen(w)
        out.append([w, round(b, 3), round(at(done / shown_total), 3)])
    return out


def main():
    manifest = json.load(open(os.path.join(ROOT, "src/lib/data/meaningAudioManifest.json")))
    for voice, langs in manifest.get("istiadhah", {}).items():
        for lang in langs:
            if lang not in TEXT:
                continue
            words = map_words(TEXT[lang].split(), heard(clip(voice, lang), lang))
            out = os.path.join(ROOT, "public/data/meaning-timings", voice, lang, "1.json")
            data = json.load(open(out, encoding="utf8"))
            data = {"0": words, **{k: v for k, v in data.items() if k != "0"}}
            with open(out, "w", encoding="utf8") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
            print(voice, lang, words)


if __name__ == "__main__":
    sys.exit(main())
