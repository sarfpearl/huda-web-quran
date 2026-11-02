# Meaning audio — word-by-word highlight · SPIKE handoff

> **நிலை (TA):** Spike முடிந்தது. Forced-alignment சாத்தியம்; Tamil ≈ English தரம்.
> Generator / UI / PR இன்னும் தொடங்கவில்லை — owner முடிவுக்காகக் காத்திருக்கிறது.
> இந்த folder-ஐ Antigravity-ல் தொடரலாம். கீழே எல்லா விவரமும் உள்ளது.

**Goal:** when the meaning (translation) audio reads an ayah's meaning aloud, highlight the
corresponding word in the on-screen translation text, word-by-word — mirroring the existing
Arabic word highlight. Owner chose the **accurate** approach (forced alignment, not a
proportional estimate).

This is the 4th and last task from the 2026-11-01 session (tasks 1–2 = PR #177, task 4 =
PR #179). Independent of those.

---

## 1. Spike result (DONE)

**Forced alignment is feasible for both English and Tamil.** The big unknown — Tamil — came
out roughly **as good as English**, not dramatically worse.

| Aspect | Quality |
|---|---|
| Tamil vs English | ✅ Comparable — Tamil is *not* the weak link |
| Short ayat (most of the target corpus: surahs 67–114, Juz Amma) | ✅ Good — head/mid word boundaries within ~±0.3 s |
| Long / multi-pause ayat (e.g. **1:7**) | ⚠️ DTW drifts; the final clause collapses near the end even after repair |
| Root cause of drift | espeak vs Gemini voice mismatch + large comma pauses in the TTS clips |

Preview: open **`preview.html`** (loads `sample-timings.json`, streams clips from R2) and
judge by ear. Covers surahs 1, 112, 114 · EN+TA · Cruz voice.

### Why aeneas (and not WhisperX / MMS)

The cloud session's egress proxy allows only `pypi.org`, `files.pythonhosted.org`, the Ubuntu
apt mirrors, and the R2 bucket. It **blocks `huggingface.co` and `download.pytorch.org`**, so
every neural aligner that downloads model weights at runtime (WhisperX, torchaudio `MMS_FA`,
`ctc-forced-aligner`) fails. aeneas needs no model download — it synthesises a reference with
espeak-ng and aligns by MFCC + DTW — so it is the only aligner that runs in this environment.
(Antigravity / a local machine with open network **could** use MMS/WhisperX instead — see §5.)

---

## 2. What's in this folder

| File | Purpose |
|---|---|
| `aligner.py` | The working forced-aligner: aeneas (espeak-ng, `cew` off) + tail-collapse repair. `align(mp3_path, lang, text) -> {words:[[w,begin,end],…], dur, repaired}` |
| `sample-texts.json` | The exact meaning text per ayah (surahs 1/112/114), keyed `SSSAAA` → `{en,ta}` |
| `sample-timings.json` | Aligner output for the 28 preview clips (no audio; carries R2 `path`) |
| `preview.html` | Lightweight karaoke preview; streams audio from R2, highlights the active word gold |
| `setup-env.sh` | Reproduces the aeneas environment (the tricky part) |

---

## 3. Reproduce the aligner (the environment is the hard part)

aeneas 1.7.3 does not install cleanly on Python 3.13 + numpy ≥ 1.26 and expects classic
`espeak`, not `espeak-ng`. `setup-env.sh` captures the full recipe:

1. `apt-get install espeak-ng espeak-ng-data libespeak-ng-dev ffmpeg python3-dev build-essential`
2. `ln -s …/libespeak-ng.so …/libespeak.so` and `ln -s /usr/bin/espeak-ng /usr/local/bin/espeak`
   (aeneas links `-lespeak` and shells out to `espeak`)
3. `pip install "numpy<2"` then build aeneas from the sdist **after patching `setup.py`** to
   drop `numpy.distutils` (removed in Py 3.12+) → use `numpy.get_include()`.
4. Run with `cew=False|tts=espeak|tts_path=/usr/bin/espeak-ng` — the `cew` C extension hangs
   when linked against espeak-ng; the CLI wrapper is fast (~1.5 s/clip) and correct.

```bash
bash setup-env.sh                 # builds a ./venv with aeneas ready
. venv/bin/activate
python aligner.py en:001007 ta:001007   # prints per-word timings
```

The aligner reads the exact spoken text from the app's own data
(`public/data/quran-verses/<surah>.json` → `textEnglish` / `textTamil`) — the same strings
Gemini TTS read — so the reference text is always a perfect match.

---

## 4. Remaining work (NOT started — do this after the owner's decision)

### Open decision (owner picks before mass-processing)
1. **Ship both en + ta accurate** (aeneas + tail-repair) — recommended, since ta ≈ en.
2. **Fix long-ayah drift first** — two-pass hierarchical alignment (phrase→word; split the ayah
   at punctuation, align each phrase to its audio segment, then words within) to kill the 1:7-style
   drift, then build.
3. **en accurate + ta proportional** — fallback if Tamil quality is judged not good enough.
4. Wait.

### Step A — generator script
Mirror `scripts/generation/build-surah-name-audio.mjs` conventions (`--estimate`, batch/resume,
writes JSON). For each ayah that **has meaning audio** (per `src/lib/data/meaningAudioManifest.json`),
download its clip from R2, run `aligner.py`, and emit a per-word timing record keyed by
`voice/lang/surah/ayah`. Only surahs in the manifest (currently 1, 67–114 · cruz+lora · en+ta).
Store compact JSON, **split/lazy-loaded by language** like the verse search index (see the
`search-index-split` memory and `scripts/generation/build-search-index.mjs`) so the core bundle
doesn't bloat. The JS generator can shell out to the Python `aligner.py`, or port the aeneas call.

Suggested output layout (lazy-loaded per lang, like translations):
`public/data/meaning-timings/<voice>/<lang>/<surah>.json` → `{ "<ayah>": [[w,b,e],…] }`.

### Step B — data access helper
Add a loader next to `src/lib/data/meaningAudio.ts` (e.g. `meaningTimings.ts`) that lazy-fetches
the per-surah timing file for the active voice/lang and returns the word list for an ayah, or
`null` when absent (older/missing data).

### Step C — UI (the highlight)
In `src/components/home/CenterVerseDisplay.tsx`:
- Translation text is rendered as a single `<p data-fit-text>` block (~lines 822–845); text is
  `activeItem.textTamil || textEnglish` or fetched `extraMeaning` (`useExtraMeaning` ~line 339).
- **Word-split** that block into `<span>`s (split on whitespace — keep the parenthetical tokens
  like `(நபியே!)`, they were spoken and are real tokens).
- Highlight the active word while the meaning clip plays, driven by the meaning audio element's
  `currentTime` vs the word timings. Active word = last word with `begin <= currentTime`
  (so zero/short words don't stall).
- Reuse the Arabic highlight styling: `text-amber-300 quran-word-glow` (the gold tone). Mirror
  the Arabic highlight in `QuranWord` (~145–204); active index `shownWordIndex`/`activeWordIndex`
  (~686–689, 760–768); `startTime/endTime` from `getEffectiveWords`; frame-accurate boundary via
  `setTimeBoundary` (ImmersiveHomeClient ~826–846; AudioPlayerContext ~1715–1756).
- **Keep the whole-block gold fallback** when no word timings exist: today `player.meaningClip`
  → `meaningSpeaking` colours the whole `<p>` gold (CenterVerseDisplay ~836; `startMeaning` /
  `cancelMeaning` in AudioPlayerContext set/clear `meaningClip`). Do not regress this.
- Note: `ReadingView.tsx` renders no translation text, so no change needed there.

### Step D — verify + PR
Dev preview (`localhost:3000`, `NEXT_PUBLIC_MEDIA_BASE_URL` → R2 in `.env.local`): header 📖
Translate sheet → pick a meaning voice, play a surah, confirm the highlighted translation word
tracks the spoken word. Then open a PR and give the owner a **Tamil** summary + test link.

---

## 5. Notes / gotchas

- **Reply to the owner only in Tamil** (`AGENTS.md` + `~/.claude/CLAUDE.md`), technical details kept intact.
- **Media on R2** via `mediaUrl()` — do **not** commit large media (clips, embedded-audio HTML).
  `preview.html` here deliberately streams from R2 instead of embedding.
- **Gemini TTS cap:** 100 req/day on `gemini-3.8-flash-tts` (Tier 1) — use the Batch API for
  bulk (pattern in `build-surah-name-audio.mjs` / `build-meaning-audio.mjs`). Not needed for
  alignment (no TTS calls), only if regenerating audio.
- **Antigravity has open network:** if drift matters, you can switch the aligner to WhisperX
  (en) or Meta **MMS** CTC forced alignment (`tam` is supported) there — likely tighter than
  aeneas, and one tool for both languages. Keep `aligner.py`'s `align()` signature so the
  generator doesn't change.
- **Broken local hook:** the design-drift plugin's drift-scanner hook errors on every file write
  (unquoted space in its python path) — harmless, edits still apply.
- Workflow: build on a branch → PR → owner tests on phone → OK → merge.

Branch for this work: `claude/nifty-ramanujan-84y9md`.
