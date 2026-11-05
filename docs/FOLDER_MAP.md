# Folder map — what lives where

Split on 2026-11-05: the repo folder holds the code; the media sits next to it
in `../huda-media/` (or `$HUDA_MEDIA`). Folders were renamed, not copied —
nothing was deleted (`../huda-media/MOVE-LOG.txt` has the file counts).

## Online

| Where | What |
|---|---|
| **GitHub** (this repo) | Code only: `src`, `scripts`, `docs`, `supabase`, `tests`, `.github`, `.agents`, config, `data/progress.json` |
| **R2** (Cloudflare) | Every video, image and audio file the app plays (`NEXT_PUBLIC_MEDIA_BASE_URL`, `src/lib/media.ts`) |
| **Vercel** | The site — auto-deploys `main` |
| **Supabase** | Views, live, likes, comments |

## On the Mac only (never in git)

```
huda-web-quran/          ← the repo (code)
  assets/audio/          Juz MP3s + meaning audio (still here: see below)
  public/audio/prelude/  Isti'adhah / Surah-name clips (small, uploaded to R2)
  .qa-cache/             word-sync QA cache (models, 16 kHz audio)
huda-media/
  1-live-copy/media-work/   ← .media-work: encoded = local copy of R2's clips,
                              originals = re-encode backup, reports
  2-masters/videos/         ← public/videos: set / ayah masters (upload source)
  2-masters/video-masters/  ← assets/video-masters: Veo 4K masters
  2-masters/images/         ← assets/images: scene JPEG sources
  2-masters/brand/          ← assets/brand: logos
  3-working/scratch/        ← scratch: staging, matching boards, experiments
  3-working/user_candidates/
  4-unused/unused-items/    ← Unused Items: duplicates (50 GB, Phase 8B),
                              Inbox (matching source), archives
  4-unused/assets-public/   ← assets/public
```

## Scripts

Scripts name a media folder by its old repo path; `mediaPath()` in
`scripts/lib/paths.mjs` resolves it to the folder's place under `huda-media`
(or the repo, if that folder hasn't moved). Switched over: `reencode-videos`,
`upload-to-r2`, `surah-set-registry`, `compress-videos`, `fix-letterboxing`,
`webp-images`, `automated-quran-video-pipeline`. The finished one-off batch
scripts (`scripts/pipeline/build-batch-*`, `stage-batch-*`,
`build-surahs-from-library`, `archive-surah3-unused`) and the Veo generation
scripts still name the old paths — run them with `mediaPath()` first if ever
needed again.

**Still to move:** `assets/audio` → `1-live-copy/audio` once the meaning-audio
batch is done (`build-meaning-audio.mjs`, `build-meaning-timings.mjs` and
`upload-to-r2.mjs` read it).
