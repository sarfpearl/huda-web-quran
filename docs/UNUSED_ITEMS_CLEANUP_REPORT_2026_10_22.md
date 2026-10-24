# HuDa Web Quran — Unused Items Cleanup Report

**Date:** 2026-10-22  
**Project:** HuDa Web Quran (`sarfpearl/huda-web-quran`)  
**Scope:** Safe Archival of Confirmed Unused Items to [`Unused Items/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/)  
**Archive Ledger:** [`Unused Items/move-ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/move-ledger.json)  
**Cleanup Inventory:** [`Unused Items/cleanup-inventory.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/cleanup-inventory.json)  
**Verification Status:** **100% VERIFIED — ALL ARCHIVED FILES MATCH SHA-256 (0 MISMATCHES)**  
**Safety Status:** **ZERO ORIGINAL RUNTIME MEDIA FILES MODIFIED, DELETED, OR OVERWRITTEN**  
**TypeScript Status:** **Typecheck Clean (`tsc --noEmit` Exit 0)**  

---

## 1. Executive Summary

In strict accordance with project safety guidelines, a complete, non-destructive cleanup audit was performed across the repository. A total of **45 confirmed unused files (733.05 MB / 768,662,810 bytes)** were archived from the root directory and scratch folders into structured subdirectories within [`Unused Items/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/).

Every archived file was hashed prior to moving, verified byte-for-byte upon relocation, and recorded in a machine-readable rollback ledger ([`Unused Items/move-ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/move-ledger.json)).

Crucially:
- **Zero Runtime Breakage:** Next.js static asset serving from root `public/` is completely preserved.
- **Zero Media Loss:** No production video, image, audio, or manifest was deleted or overwritten.
- **Reversible:** All 45 operations are 100% reversible via the move ledger.
- **Protected Assets Intact:** Both Surah 2 folders, 4K video masters, the entire Inbox video library, and all 123 repository symlinks were verified untouched.

```mermaid
flowchart TD
    subgraph Scan["Codebase Scan & Dependency Audit"]
        R["Root Directory (Zip Archives & Preview HTMLs)"]
        S["Scratch Directory (Outdated Test Crops & Frames)"]
        P["Protected Assets (public/, assets/, Inbox, Surah 2)"]
    end

    subgraph Decision["Classification Gate"]
        R -->|Conclusively Unneeded| C45["45 Confirmed Unused Files (733.05 MB)"]
        S -->|Conclusively Unneeded| C45
        P -->|Protected / Active Runtime| K["8,673 Files Retained in Place"]
    end

    subgraph Archive["Structured Archive (Unused Items/)"]
        C45 --> A1["Unused Items/archives/ (2 Production Zip Files: 736.34 MB)"]
        C45 --> A2["Unused Items/review-html/ (16 Standalone Preview HTMLs: 4.02 MB)"]
        C45 --> A3["Unused Items/scratch/ (27 Test Frames & Inpainting Crops: 2.69 MB)"]
    end

    subgraph Ledger["Safety Verification"]
        A1 --> L["move-ledger.json (100% SHA-256 Verified)"]
        A2 --> L
        A3 --> L
    end
```

---

## 2. Inventory & Classification Summary

The entire repository was scanned and indexed into [`Unused Items/cleanup-inventory.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/cleanup-inventory.json). Candidates were categorized into six explicit states:

| Classification Status | File Count | Description & Policy |
|---|:---:|---|
| **`KEEP_RUNTIME`** | **6,303** | Core Next.js code (`src/`), live public assets (`public/`), verse videos, and runtime manifests. Essential for localhost dev and live web app. Retained in place. |
| **`KEEP_MAINTENANCE`** | **1,895** | Pre-migration backup files (`scratch/backup/`), Phase 4A staging copies, testing scripts, and technical documentation. Retained in place. |
| **`KEEP_USER_APPROVED`** | **474** | User-confirmed canonical Surah 2 folder (`public/videos/surah/002-al-baqarah/`), 4K masters (`assets/video-masters/`), and approved Inbox library videos. Protected untouched. |
| **`REVIEW_REQUIRED`** | **30** | Staging assets awaiting formal sign-off (Gate 2 candidates in `scratch/staging/gate2_11_visuals/` and crop remediation clips in `scratch/staging/surah_19_20_crop/`). Kept in staging. |
| **`KEEP_BUILD`** | **1** | Build configuration / lockfile tooling (`package.json`, `tsconfig.json`). Retained in place. |
| **`MOVE_CONFIRMED_UNUSED`** | **45** | Historical delivery zips, root preview HTMLs, and obsolete scratch inpainting experiments. Safely archived to [`Unused Items/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/). |
| **Total Scanned Items** | **8,748** | Complete repository asset catalog. |

---

## 3. Detailed Move Ledger Breakdown

All 45 files moved to [`Unused Items/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/) were verified before and after moving with SHA-256 checksums:

### A. Large Historical Production Archives (2 Files • 736.34 MB)
These files were historical manual packaging artifacts created during previous batch releases of Surahs 16 and 17, and are redundant with current repository files:
- `surah_16_production.zip` (382,916,908 B) &rarr; [`Unused Items/archives/surah_16_production.zip`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/archives/surah_16_production.zip)
- `surah_17_production.zip` (353,420,431 B) &rarr; [`Unused Items/archives/surah_17_production.zip`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/archives/surah_17_production.zip)

### B. Root Standalone QA Preview HTMLs (16 Files • 4.02 MB)
These HTML files were generated by historical pipeline runs (`automated-quran-video-pipeline.mjs`) for manual browser inspection. None are imported by Next.js, referenced by tests, or required for production builds:
- `review_badr_preview.html` (26,743 B) &rarr; [`Unused Items/review-html/review_badr_preview.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_badr_preview.html)
- `review_surah_3.html` (559,093 B) &rarr; [`Unused Items/review-html/review_surah_3.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_3.html)
- `review_surah_4.html` (550,546 B) &rarr; [`Unused Items/review-html/review_surah_4.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_4.html)
- `review_surah_5.html` (394,878 B) &rarr; [`Unused Items/review-html/review_surah_5.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_5.html)
- `review_surah_6.html` (480,818 B) &rarr; [`Unused Items/review-html/review_surah_6.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_6.html)
- `review_surah_7.html` (570,355 B) &rarr; [`Unused Items/review-html/review_surah_7.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_7.html)
- `review_surah_8.html` (215,745 B) &rarr; [`Unused Items/review-html/review_surah_8.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_8.html)
- `review_surah_9.html` (394,761 B) &rarr; [`Unused Items/review-html/review_surah_9.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_9.html)
- `review_surah_10.html` (306,273 B) &rarr; [`Unused Items/review-html/review_surah_10.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_10.html)
- `review_surah_11.html` (23,387 B) &rarr; [`Unused Items/review-html/review_surah_11.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_11.html)
- `review_surah_12.html` (22,287 B) &rarr; [`Unused Items/review-html/review_surah_12.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_12.html)
- `review_surah_13.html` (9,951 B) &rarr; [`Unused Items/review-html/review_surah_13.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_13.html)
- `review_surah_14.html` (11,183 B) &rarr; [`Unused Items/review-html/review_surah_14.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_14.html)
- `review_surah_15.html` (19,989 B) &rarr; [`Unused Items/review-html/review_surah_15.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_15.html)
- `review_surah_16.html` (24,766 B) &rarr; [`Unused Items/review-html/review_surah_16.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_16.html)
- `review_surah_17.html` (23,345 B) &rarr; [`Unused Items/review-html/review_surah_17.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/review_surah_17.html)

### C. Scratch Inpainting Experiments & One-Off Test Media (27 Files • 2.69 MB)
Historical experimental artifacts from early pilot trials in September and October 2026:
- 12 bird inpainting crops and masks (`scratch/bird_clean_beam.jpg` ... `scratch/bird_seamless.jpg`) &rarr; [`Unused Items/scratch/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/scratch/)
- 5 sky and test frame samples (`scratch/sky_sample.jpg`, `top_sky.jpg`, `spot_check.jpg`, `set_02_sample.png`, `test_ffmpeg.png`) &rarr; [`Unused Items/scratch/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/scratch/)
- 3 test video/audio snippets (`scratch/test_zoom.mp4`, `test_kumtag_mirage.webm`, `test_mixkit_lamp_20661.mp4`, `sample_002.mp3`) &rarr; [`Unused Items/scratch/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/scratch/)
- 5 AI image explorations and stubs (`scratch/test_pollinations_juz10.jpg`, `art1.jpg`, `art36.jpg`, `juz_10_artistic_v1.jpg`, `juz_11_no_bird_full.jpg`, `juz_11_perfect_blend.jpg`) &rarr; [`Unused Items/scratch/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/scratch/)

---

## 4. Protected Content Verification

### A. Surah 2 Dual Folder Comparative Audit

As explicitly instructed, `public/videos/surah/002-al-baqarah` is treated as the user-confirmed canonical folder:

| Dimension | User-Confirmed Canonical Folder | Second Surah 2 Folder |
|---|---|---|
| **Path** | [`public/videos/surah/002-al-baqarah/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah/) | [`public/videos/ayah/002/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/ayah/002/) & [`public/videos/surah_2/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah_2/) |
| **Item Count** | **62 items** (58 MP4 videos, 4 internal symlinks) | **8 MP4 videos** in `ayah/002`, **8 symlinks** in `surah_2` |
| **Total Size** | **1,333.97 MB (~1.33 GB)** | **145.61 MB** |
| **Nature of Content** | Thematic narrative chapter clips covering full Surah Al-Baqarah (`01-the-book-of-guidance.mp4` to `10f-...`) | Curated verse clips for individual verses (`002.mp4`, `019.mp4`, `022.mp4`, `029.mp4`, `060.mp4`, `125.mp4`, `164.mp4`, `255.mp4`) |
| **Manifest References** | Referenced 45 times in `surahChapters.ts`, 44 times in `videoManifest.ts`, 6 times in `surahVerseVideos.ts` | `surah_2` referenced 47 times in `videoManifest.ts`; `ayah/002` referenced 8 times in `surahVerseVideos.ts` |
| **Disposition** | **PRESERVED 100% INTACT** (0 files moved, 0 modified) | **PRESERVED 100% INTACT** (0 files moved, 0 modified) |

### B. Inbox & Approved Media Verification
- **Catalogue Integrity:** [`public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json) SHA-256 is `d63d580813754d6fe3253040ba38b4c11c2f25002260a31460e5b7d74c6c896b`, matching the pre-migration backup byte-for-byte.
- **Approved Clips:** All 233 `APPROVED` clips in `public/videos/Inbox/` exist on disk (0 missing).
- **Review Required Clips:** All 107 `REVIEW_REQUIRED` raw stock videos remain safely preserved in Inbox.

### C. 4K Masters & Symlink Snapshot Verification
- **4K Masters:** All 70 files (50 MP4 videos + 20 JSON metadata files, 2.71 GB total) in [`assets/video-masters/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/assets/video-masters/) remain untouched.
- **Workspace Symlinks:** All 123 symlinks recorded in `symlink_snapshot.json` were re-verified (123/123 matched, 0 broken, 0 escaped).
- **Surah 1 Symlinks:** All 7 symlinks (`ayah_1.mp4` through `ayah_7.mp4`) in `public/videos/surah_1/` resolve to valid Inbox scene files within `public/videos/`.

---

## 5. Duplicate Clusters & Historical Redundancy Policy

The 352 duplicate clusters identified in Phase 3 (2,832 redundant files representing **56.74 GB** of historical staging copies in `public/videos/surah_3/` to `surah_32/`) were **intentionally retained in place**:
- **Why Retained:** The current frontend application dynamically resolves individual verse video URLs (e.g. `/videos/surah_4/ayah_1.mp4`). Removing or consolidating these files prior to an application routing refactor would cause immediate runtime 404 video playback failures.
- **Action Taken:** Zero duplicate files were deleted or merged. 100% of runtime duplicates remain available.

---

## 6. Git Status & Code Health Before and After

- **Before Cleanup:** 4 modified tracked files (`data/progress.json`, `package-lock.json`, `scripts/qa/results/suite-result.json`, `src/lib/data/videoManifest.ts`) and untracked review HTMLs.
- **After Cleanup:**
  - `review_surah_16.html` and `review_surah_17.html` (which were historically tracked in Git) appear as unstaged deletions because they were safely moved to [`Unused Items/review-html/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/review-html/).
  - All 14 untracked review HTMLs and root zip files are cleared from root.
  - [`Unused Items/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/) exists as an untracked archive folder.
  - No Git commits or pushes were made.
- **TypeScript Health:** `npm run typecheck` (`tsc --noEmit`) passes with 0 errors (Exit Code 0).

---

## 7. Files Intentionally Left in Place & Risk Summary

1. **Root `public/` directory:** All 3,347 media files and PWA assets left completely in place.
2. **Second Surah 2 folder (`ayah/002` & `surah_2`):** Retained to support verse video mapping until runtime routing is updated.
3. **Staging Review Interfaces:** `scratch/staging/batch_1_review/` and `scratch/staging/003/` left in scratch for QA continuity.
4. **Gate 2 Visual Candidates (11 clips):** Left in `scratch/staging/gate2_11_visuals/` awaiting formal approval.
