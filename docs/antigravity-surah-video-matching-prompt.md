# HuDa Web Quran — match existing unused clips to the remaining Surahs (prompt for Antigravity)

Repo: `huda-web-quran` (Next.js + TypeScript). Reply in Tamil, write code / commits in English.
Read first: `.agents/rules/video-pipeline-gates.md`, `.agents/skills/surah-video-production/SKILL.md`,
`HANDOFF.md` §2b, `docs/SURAH_VISUAL_TOPIC_CATALOGUE.md`, `docs/FOLDER_MAP.md`.

**Media paths:** since 2026-11-05 the media sits outside the repo in `../huda-media/`
(or `$HUDA_MEDIA`). Below, `Unused Items/…` = `huda-media/4-unused/unused-items/…`,
`scratch/…` = `huda-media/3-working/scratch/…`, `public/videos/…` =
`huda-media/2-masters/videos/…`, `.media-work/…` = `huda-media/1-live-copy/media-work/…`.
In scripts always resolve them with `mediaPath("<old path>")` from `scripts/lib/paths.mjs`,
never a hard-coded path. (`public/data/…` is code and stays in the repo.)

## Goal

Give every Surah that has no background video yet a set of thematic clips,
**reusing the videos we already have in `Unused Items/`** (`huda-media/4-unused/unused-items/`). No new generation:
no Veo / Vertex AI / any paid API (Vertex is suspended anyway — `CONSUMER_SUSPENDED`).
Do as much of the matching yourself as possible. Only where nothing fits,
write a short content brief for that one set so the owner can pick a video.

## Which Surahs

Surahs with no sets yet (check `src/lib/data/surahSetVideos.ts` and
`src/lib/data/surahVerseVideos.ts` to confirm before starting):

**18, 20, 21, 22, 24, 27, 29, 33–114** (84 Surahs).

Already done — do not touch: 1–17, 19, 23, 25, 26, 28, 30–32.

Work in batches, one PR per batch:
1. **18, 20, 21, 22, 24, 27, 29, 33, 34** (Gate 2 clips for these already exist — see below)
2. **35–50**
3. **51–70**
4. **71–90**
5. **91–114** (short Surahs: often a single set for the whole Surah)

## Where the candidate videos are (Mac only, not in git — under `huda-media/4-unused/unused-items/`)

| Place | What | How to know what a clip shows |
|---|---|---|
| `Unused Items/archive/Inbox/` | 340 clips: named scenes, Pexels/stock numbers, `surah_NN_set_…` Gate 2 clips | `Unused Items/archive/Inbox/INBOX_VIDEO_CATALOGUE.json` — `scene_title`, `category`, `quranic_relevance`, `suitability_score`, `review_status` (233 APPROVED, 107 REVIEW_REQUIRED) |
| `Unused Items/archive/Inbox/surah_18_set_15…`, `surah_20_set_02…`, `surah_21_set_13…`, `surah_22_set_05…`, `surah_24_set_08…` (×2), `surah_27_set_08…`, `surah_29_set_05…`, `surah_33_set_02…`, `surah_34_set_03…` | Clips **made for exactly these sets** (Gate 2) | `docs/SURAH_VISUAL_TOPIC_CATALOGUE.md` §2 — use them for those sets first |
| `Unused Items/archive/duplicates/surah_N/ayah_K.mp4` | ~2,300 per-ayah clips of Surahs 4–32 | The theme is the source ayah: read `public/data/quran-verses/N.json` ayah K (English + Tamil). Ledger: `docs/VIDEO_DUPLICATE_CLEANUP_FINAL_LEDGER.json` |
| `Unused Items/archive/Inbox/surah_3/` | 117 per-ayah clips of Aal-Imran | Same — source ayah in `public/data/quran-verses/3.json` |
| `Unused Items/surah-verse-duplicates/`, `Unused Items/archives/` | Small leftovers | Check frames |

**Never trust the file name or catalogue alone.** For every clip you pick,
extract 3 frames (0 s, middle, last second) with `ffmpeg` and look at them.

## Step by step, per Surah

1. **Read the Surah** from `public/data/quran-verses/<N>.json` (never alter the
   Arabic, never invent translations).
2. **Split into thematic sets** like the live Surahs: 5–10 ayahs a set where the
   meaning stays on one theme, break where the theme changes. A short Surah
   (≤ 10 ayahs) may be one set. File name pattern:
   `set_<NN>_ayah_<from>-<to>.mp4`. The sets must cover every ayah, no gaps,
   no overlaps (`surah-set-registry.mjs` refuses a gap).
3. **For each set write a one-line visual theme** (e.g. "night sea, waves upon
   waves, darkness"; "rain on dry earth, then green shoots").
4. **Find the best clip** from the places above. Score each candidate 0–100 on:
   - meaning fit with the set's ayahs (most important);
   - **Rule 5 (strict):** no people, faces, hands or silhouettes, no prophets /
     companions / angels shown in any form, no animals in the foreground unless
     the ayah names them, no idols, crosses, temples, other religious symbols,
     no music instruments, nothing immodest, no modern logos / text /
     watermarks / subtitles / city traffic;
   - technical: 16:9 landscape, ≥ 1920×1080, ≥ 8 s, steady camera, loops
     without a visible jump, no black frames, no burnt-in text.
   Accept a clip only at **≥ 75** with Rule 5 fully clean.
5. **Variety:** no clip twice in the same Surah; avoid two neighbouring sets
   that look the same. Prefer clips not live anywhere (compare `sha256` with
   the files listed in `src/lib/data/videoManifest.ts` / `.media-work/encoded/`).
   Reusing a clip that is live in another Surah is allowed only when nothing
   else fits — mark it `reused_from` in the plan.
6. **No match (< 75)** → do not force one. Write a content brief for that set
   only (format below) and leave it for the owner.

## Output for each batch (planning only — no uploads yet)

- `scratch/matching/<NNN>/plan.json` per Surah (→ `huda-media/3-working/scratch/matching/`; keep the old-style paths in the JSON, resolve with `mediaPath()`):
  ```json
  {
    "surah": 18,
    "sets": [
      {
        "set": "set_01_ayah_1-8",
        "from": 1, "to": 8,
        "theme": "…",
        "status": "MATCHED | NEEDS_OWNER",
        "source_path": "Unused Items/archive/…/ayah_12.mp4",
        "sha256": "…",
        "score": 86,
        "why": "one sentence: what the clip shows and why it fits",
        "frames": ["scratch/matching/018/set_01_0s.jpg", "…"],
        "reused_from": null
      }
    ]
  }
  ```
- **One approval board** `scratch/matching/batch_<n>_review.html` (like
  `Unused Items/review-html/review_surah_10.html`): per set — ayah range,
  English + Tamil meaning (short), the 3 frames, a playable `<video>` of the
  candidate, score, why, and **Approve / Redo** buttons.
- **A list of NEEDS_OWNER sets** at the top of the board and in your reply,
  each as:
  ```
  Surah 36 · set_04 · ayahs 33–44
  Meaning: the dead earth brought to life; night and day; sun and moon on their courses
  Video needed: wide shot of barren land after rain turning green, then a moonrise over a desert ridge
  Keywords (for Pexels / Pixabay search): "desert rain green", "moonrise desert", "timelapse sun moon"
  Must avoid: people, text, buildings
  ```
- Your reply to the owner: per Surah "N sets: X matched, Y need you" + the
  board path. Then **stop and wait** for the owner.

## After the owner approves a Surah (not before)

Copy (never move) each approved clip to `public/videos/surah_<N>/set_<NN>_ayah_<from>-<to>.mp4`
(= `huda-media/2-masters/videos/surah_<N>/…`, `mediaPath("public/videos/…")`),
for owner-supplied clips too, then (`HANDOFF.md` §2b):

```bash
node scripts/tools/reencode-videos.mjs --new --encode
node scripts/tools/reencode-videos.mjs --new --upload --execute
node scripts/tools/surah-set-registry.mjs   # refuses a Surah with a gap
node scripts/tools/video-manifest.mjs
```

Commit `src/lib/data/surahSetVideos.ts` + `src/lib/data/videoManifest.ts`, set
the Surah to `DEPLOYED` in `data/progress.json`, open **one PR per batch**
(branch from `main`, e.g. `feat/surah-sets-batch-1`) with the Vercel preview
link, and let the owner test before merge. Don't commit videos to git.
Budget: ~3 MB a set; R2 is at about 4.2 GB of 10 GB — say if a batch would
pass 9 GB.

## Don'ts

- No paid generation, no Veo, no new API keys.
- Don't delete or move anything out of `Unused Items/` (copy only).
- Don't change Surahs that are already live.
- Don't touch `videoManifest.ts`, R2 or Vercel before the owner's approval.
- Don't `git add -A` — other sessions share this checkout; add only your files.
