# HuDa Web Quran — Phase 4C: Read-Only Architecture Audit Report

**Document Date:** October 22, 2026  
**Auditor:** Antigravity (Advanced Agentic AI Assistant)  
**Project Workspace:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
**Execution Mode:** STRICT READ-ONLY (No file moves, renames, deletions, overwrites, or git commits)  

---

## 1. Executive Summary

This architecture audit delivers an exhaustive, evidence-based evaluation of the HuDa Web Quran media library across all staging zones, legacy runtime paths, and canonical target hierarchies. Following the completion of Phase 4A (Surahs 1, 2, 114 trial) and Phase 4B (Surahs 104–114 staging), this report provides the definitive pre-migration analysis required before executing any production promotion or path reorganization.

### Key Audit Findings

1. **Phase 4B Staging Parity (100% Verified):**
   All 11 staged files in [`assets/public/videos/surah/104-al-humazah/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/assets/public/videos/surah/104-al-humazah) through [`114-an-nas/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/assets/public/videos/surah/114-an-nas) exist, exactly match their source SHA-256 hashes, and possess distinct filesystem inodes (`st_ino`), proving they are fully independent copies (75.10 MB total).
2. **Phase 4A Staging Integrity (100% Verified):**
   All 73 items (1,344.90 MB) recorded in [`scratch/staging/phase4a_trial/staging_trial_ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/phase4a_trial/staging_trial_ledger.json) exist and match source hashes/symlink targets with zero errors.
3. **Core Production Stores Untouched & Protected:**
   - **Central Inbox Catalogue:** [`public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json) SHA-256 (`d63d58081375...`) exactly matches pre-migration backup. 233 approved clips and 107 stock clips remain intact.
   - **Canonical Surah 2 Folder:** [`public/videos/surah/002-al-baqarah/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah) retains all 62 items (1,399.61 MB) intact. Secondary folders [`public/videos/ayah/002/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/ayah/002) and [`public/videos/surah_2/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah_2) retain 8 items each.
   - **4K Video Masters:** [`assets/video-masters/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/assets/video-masters) contains 70 files totaling 2.71 GB intact.
   - **Symlinks:** All 123 active workspace symlinks verified against [`scratch/backup/pre_migration_2026_10_21/symlinks_and_metadata/symlink_snapshot.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/backup/pre_migration_2026_10_21/symlinks_and_metadata/symlink_snapshot.json) with zero discrepancies.
   - **Review Items:** Exactly 30 `REVIEW_REQUIRED` items (24 Gate 2 visuals + 6 crop files in `scratch/staging/`) remain untouched.
4. **Architectural Contrast Identified (Flat vs Nested):**
   The active Next.js runtime resolves single-video Surahs via flat paths (`/videos/surah/<slug>.mp4`) served from root `public/videos/surah/`. The proposed canonical target hierarchy places videos in nested folders (`assets/public/videos/surah/<pad>-<slug>/<pad>-<slug>.mp4`). Promoting files without code adjustments would break video resolution unless URL rewrites, manifest updates, or symlinks are introduced.

---

## 2. Phase 4B Staging Parity Verification

The 11 files staged during Phase 4B were checked against [`scratch/staging/phase4b_surahs_104_114/phase4b_staging_ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/phase4b_surahs_104_114/phase4b_staging_ledger.json). Each destination file was read from disk, hashed with SHA-256, and its filesystem inode was compared to the corresponding source in `public/videos/surah/`.

| Surah # | Surah Name | Destination Path (`assets/public/videos/surah/...`) | Size (Bytes) | Size (MB) | SHA-256 Match | Inode Independent (`src != dst`) |
|:---:|---|---|---:|---:|:---:|:---:|
| 104 | Al-Humazah | `104-al-humazah/104-al-humazah.mp4` | 5,378,855 | 5.13 | **PASS** | **PASS** (Distinct Inode) |
| 105 | Al-Fil | `105-al-fil/105-al-fil.mp4` | 7,040,312 | 6.71 | **PASS** | **PASS** (Distinct Inode) |
| 106 | Quraysh | `106-quraysh/106-quraysh.mp4` | 6,583,914 | 6.28 | **PASS** | **PASS** (Distinct Inode) |
| 107 | Al-Ma'un | `107-al-maun/107-al-maun.mp4` | 6,959,137 | 6.64 | **PASS** | **PASS** (Distinct Inode) |
| 108 | Al-Kawthar | `108-al-kawthar/108-al-kawthar.mp4` | 8,118,402 | 7.74 | **PASS** | **PASS** (Distinct Inode) |
| 109 | Al-Kafirun | `109-al-kafirun/109-al-kafirun.mp4` | 7,011,094 | 6.69 | **PASS** | **PASS** (Distinct Inode) |
| 110 | An-Nasr | `110-an-nasr/110-an-nasr.mp4` | 6,845,080 | 6.53 | **PASS** | **PASS** (Distinct Inode) |
| 111 | Al-Masad | `111-al-masad/111-al-masad.mp4` | 4,005,511 | 3.82 | **PASS** | **PASS** (Distinct Inode) |
| 112 | Al-Ikhlas | `112-al-ikhlas/112-al-ikhlas.mp4` | 7,373,279 | 7.03 | **PASS** | **PASS** (Distinct Inode) |
| 113 | Al-Falaq | `113-al-falaq/113-al-falaq.mp4` | 8,039,442 | 7.67 | **PASS** | **PASS** (Distinct Inode) |
| 114 | An-Nas | `114-an-nas/114-an-nas.mp4` | 11,393,538 | 10.87 | **PASS** | **PASS** (Distinct Inode) |
| **TOTAL** | **11 Surahs** | — | **78,748,564** | **75.10 MB** | **11/11 (100%)** | **11/11 (100%)** |

### Findings:
- No file corruption, byte truncation, or hash mismatches exist.
- Source and destination files share no storage blocks or hardlink references (`stat_dst.st_ino != stat_src.st_ino`).
- The 11 files occupy 75.10 MB of non-volatile storage, which is negligible relative to the 174 GiB available volume capacity.

---

## 3. Comprehensive Audit of Existing Staging & Target Directories

### A. Phase 4A Staging Trial (`scratch/staging/phase4a_trial/`)
- **Ledger Path:** [`scratch/staging/phase4a_trial/staging_trial_ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/phase4a_trial/staging_trial_ledger.json)
- **Total Entries:** 73 items (1,344.90 MB).
- **Scope:** Surahs 001, 002, and 114.
  - Surah 1: 1 thumbnail image, 7 ayah video symlinks (pointing to `Inbox/`).
  - Surah 2: 1 thumbnail image, 62 canonical chapter videos in `canonical_chapters/`.
  - Surah 114: 1 thumbnail image, 1 full background video.
- **Verification Status:** 73/73 items exist on disk with 0 hash discrepancies and 0 broken links.

### B. Canonical Target Hierarchy (`assets/public/` and `assets/other/`)
Phase 3 provisioned 440 target directories under `assets/`. A disk scan confirms:
- **`assets/public/videos/surah/`:** Contains 114 canonical directories (`001-al-fatihah` through `114-an-nas`). Currently, directories `104-al-humazah` through `114-an-nas` house the 11 Phase 4B staged files. The remaining directories `001-al-fatihah` through `103-al-asr` are empty placeholders.
- **`assets/public/videos/juz/`:** 30 empty directories (`01` through `30`).
- **`assets/public/images/` & `assets/public/audio/`:** Empty canonical skeleton ready for structured population.
- **`assets/other/`:** Provisioned subdirectories (`logos/`, `favicon/`, `fonts/`, `thumbnails/`, `miscellaneous/`) contain zero stray files.

### C. Tri-State Asset Classification Matrix

| Asset Group | Current Storage Location | Status | Action Required Before Cutover |
|---|---|:---:|---|
| **Phase 4B Videos (104–114)** | `assets/public/videos/surah/<slug>/` | **STAGED (VERIFIED)** | Requires runtime manifest/routing decision before promotion |
| **Phase 4A Staged Trial Assets** | `scratch/staging/phase4a_trial/` | **STAGED (TRIAL)** | Ready for promotion to `assets/public/` |
| **Active Production Loops (4–103)** | `public/videos/surah/*.mp4` | **RUNTIME ACTIVE** | Remains serving live traffic |
| **Multi-scene Sets (Surah 2 & 3)** | `public/videos/surah/002-...` & `003-...` | **RUNTIME ACTIVE** | Canonical in place; referenced by active manifests |
| **Legacy Verse Duplicates (3–32)** | `public/videos/surah/surah_*/*.mp4` | **REDUNDANT RUNTIME** | Retain in place until URL virtualizer/redirects confirmed (56.74 GB) |
| **Inbox Central Catalogue (340 items)** | `public/videos/Inbox/` | **CORE ASSET LIBRARY** | Strictly protected; 233 approved, 107 stock |
| **4K Video Masters (70 items)** | `assets/video-masters/` | **ARCHIVAL MASTER** | Strictly protected (2.71 GB) |
| **Gate 2 Stock Visuals (24 items)** | `scratch/staging/gate2_11_visuals/` | **REVIEW_REQUIRED** | Pending human editorial sign-off |
| **Surah 19 & 20 Crops (6 items)** | `scratch/staging/surah_19_20_crop/` | **REVIEW_REQUIRED** | Pending human editorial sign-off |
| **Archived Unused Files (45 items)** | `Unused Items/` | **ARCHIVED** | Moved and verified during cleanup |

---

## 4. Verification and Protection of Core Production Assets

Strict verification protocols confirmed that all production assets remain 100% operational and undisturbed.

### 1. Root `public/` Runtime Integrity
No files within root `public/` were modified, renamed, moved, or deleted during Phase 4B or 4C. Live serving endpoints (`localhost:3000` and Next.js static asset routes) remain fully functional.

### 2. Surah 2 Directory Preservation
- **User-Confirmed Canonical Folder:** [`public/videos/surah/002-al-baqarah/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah)
  - File Count: 62 video files.
  - Total Size: 1,399.61 MB (1.37 GB).
  - Status: 100% intact, no modified timestamps.
- **Secondary Folders:**
  - [`public/videos/ayah/002/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/ayah/002): 8 files intact.
  - [`public/videos/surah_2/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah_2): 8 files intact.

### 3. Inbox Catalogue & Video Asset Library
- **Catalogue File:** [`public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json)
  - Pre-Migration Backup Hash: `d63d58081375...`
  - Current File Hash: `d63d58081375...` (**MATCH 100%**)
  - Total Catalogued Assets: 340
  - Approved Clips: 233
  - Stock / Review Required Clips: 107
  - Unverified / Rejected: 0

### 4. 4K Video Masters (`assets/video-masters/`)
- Total Files: 70 master files.
- Total Disk Size: 2.71 GB.
- Includes Surahs 001, 002, 003, Juz masters, and Vertex test artifacts.
- Status: 100% intact.

### 5. Workspace Symlink Parity (123 Links)
All 123 symlinks recorded in [`scratch/backup/pre_migration_2026_10_21/symlinks_and_metadata/symlink_snapshot.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/backup/pre_migration_2026_10_21/symlinks_and_metadata/symlink_snapshot.json) were scanned.
- Valid & Resolving: 123
- Mismatched Targets: 0
- Broken Symlinks: 0
- Specifically, the 7 delivery symlinks for Surah 1 (`public/videos/surah/001-al-fatihah/ayah_*.mp4`) resolve directly to their corresponding `../Inbox/surah_001_scene_*.mp4` targets.

### 6. Review Required Files (30 Items in `scratch/staging/`)
All 30 files flagged `REVIEW_REQUIRED` in [`Unused Items/cleanup-inventory.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/cleanup-inventory.json) exist in their exact locations:
- 24 files in [`scratch/staging/gate2_11_visuals/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/gate2_11_visuals) (11 candidate videos, 11 QA frames, 1 manifest, 1 review HTML).
- 6 files in [`scratch/staging/surah_19_20_crop/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/surah_19_20_crop) (3 crop clips, 3 frame outputs).

---

## 5. Media Architecture Analysis: Current Runtime vs Proposed Structure

### A. Current Runtime vs Proposed Path Architecture

```
CURRENT RUNTIME ARCHITECTURE (Flat Layout)
=========================================
Storage:      public/videos/surah/104-al-humazah.mp4
Next.js URL:  /videos/surah/104-al-humazah.mp4
Manifest:     src/lib/data/videoManifest.ts -> "/videos/surah/104-al-humazah.mp4"
Resolver:     src/lib/data/surahChapters.ts -> `/videos/surah/${pad}-${slug}.mp4`
Cache-bust:   src/lib/data/videoVersions.ts -> "/videos/surah/114-an-nas.mp4": 2
CDN URL:      https://media.hudacdn.com/videos/surah/104-al-humazah.mp4

PROPOSED CANONICAL ARCHITECTURE (Nested Layout)
==============================================
Storage:      assets/public/videos/surah/104-al-humazah/104-al-humazah.mp4
Next.js URL:  /videos/surah/104-al-humazah/104-al-humazah.mp4  (or rewrites)
Manifest:     src/lib/data/videoManifest.ts -> "/videos/surah/104-al-humazah/104-al-humazah.mp4"
Resolver:     src/lib/data/surahChapters.ts -> `/videos/surah/${pad}-${slug}/${pad}-${slug}.mp4`
Cache-bust:   src/lib/data/videoVersions.ts -> "/videos/surah/114-an-nas/114-an-nas.mp4": 2
CDN URL:      https://media.hudacdn.com/videos/surah/104-al-humazah/104-al-humazah.mp4
```

### B. Runtime Code Dependencies Requiring Updates Upon Promotion

If the staged nested layout is promoted directly to live runtime paths, the following code files will require synchronized updates:

1. **[`src/lib/data/surahChapters.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/surahChapters.ts) (Lines 1030–1052):**
   ```ts
   // Current fallback logic for single-video Surahs:
   const videoPath = `/videos/surah/${pad}-${slug}.mp4`;
   
   // Required if nested layout is used:
   const videoPath = `/videos/surah/${pad}-${slug}/${pad}-${slug}.mp4`;
   ```
   *Impact:* Without this update, `getSurahVisualData(104)` will return the flat path, `hasVideo()` will fail the manifest lookup, and the player will fall back to static imagery.

2. **[`src/lib/data/videoManifest.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoManifest.ts) (Lines 183–193):**
   The Set contains flat paths:
   ```ts
   "/videos/surah/104-al-humazah.mp4",
   ...
   "/videos/surah/114-an-nas.mp4",
   ```
   *Impact:* Must be updated to match whatever path structure is selected.

3. **[`src/lib/data/videoVersions.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoVersions.ts) (Lines 17–19):**
   The cache-busting lookup table contains:
   ```ts
   "/videos/surah/112-al-ikhlas.mp4": 2,
   "/videos/surah/113-al-falaq.mp4": 2,
   "/videos/surah/114-an-nas.mp4": 2,
   ```
   *Impact:* If paths change without updating keys in `VIDEO_VERSIONS`, browsers will bypass version query parameters (`?v=2`), potentially serving stale cached clips.

4. **Alternative Zero-Code-Change Solution (Next.js Rewrites or Symlinks):**
   Instead of modifying code manifests, Next.js can map requests transparently:
   - *Option 1 (Next.js `rewrites` in `next.config.mjs`):* Map `/videos/surah/:slug.mp4` to `/videos/surah/:slug/:slug.mp4`.
   - *Option 2 (Symlinks in `public/`):* Create symlinks `public/videos/surah/104-al-humazah.mp4 -> 104-al-humazah/104-al-humazah.mp4`.
   - *Option 3 (Keep Flat in Public):* Keep `public/videos/surah/` flat for single-loop Surahs and nested only for multi-chapter Surahs (002, 003, 018).

### C. Storage & Disk-Space Analysis

The local APFS volume on `/System/Volumes/Data` has **174 GiB available**.

```
+------------------------------------+----------------+-------------------+-------------------+
| Media Category                     | Full Copy      | Hardlinks (`ln`)  | Symlinks (`ln -s`)|
+------------------------------------+----------------+-------------------+-------------------+
| Surahs 104–114 (11 single loops)   | 75.10 MB       | 0 MB (shared blk) | < 1 KB (pointer)  |
| Surahs 4–114 (all single loops)    | ~1.95 GB       | 0 MB (shared blk) | < 10 KB (pointer) |
| Surahs 3–32 (verse duplicates)     | 56.74 GB       | 0 MB (shared blk) | < 50 KB (pointer) |
+------------------------------------+----------------+-------------------+-------------------+
```

#### Storage Strategy Recommendation:
1. **For Surahs 104–114 and single-video loops:** Full file copies (or hardlinks on APFS) are safe. 75.10 MB consumes only 0.04% of free disk space.
2. **For the 56.74 GB of duplicate verse files across Surahs 3 to 32:** Do **NOT** perform a full physical duplicate copy into `assets/`. Maintain them as `retain_in_place` in `public/` or replace them with a unified lookup in `src/lib/data/surahVerseVideos.ts` that maps multiple verses to their shared set video without duplicating files on disk.

---

## 6. Risk Assessment & Rollback Protocols

### A. Identified Operational Risks

| Risk Identifier | Severity | Trigger / Scenario | Prevention / Mitigation |
|---|:---:|---|---|
| **R-1: Video Backdrop 404** | **HIGH** | Moving original files from `public/` before updating manifests | Keep all files in `public/` intact during staging; update manifests and test before any original file is unlinked. |
| **R-2: Cache Invalidation Failure** | **MEDIUM** | Renaming video paths without updating `VIDEO_VERSIONS` | Synchronize path strings in `videoVersions.ts` simultaneously with manifest updates. |
| **R-3: Next.js Static Cache Lock** | **LOW** | Next.js dev server retaining stale route manifest | Restart dev server with cache clear (`rm -rf .next`) upon file movement. |
| **R-4: Disk Bloat from Duplicates** | **MEDIUM** | Copying 56.74 GB of verse duplicates | Use virtual mapping in code rather than duplicating 56 GB of files. |

### B. Rollback Protocols

1. **Staging Rollback:**
   To roll back Phase 4B staging completely:
   ```bash
   rm -rf assets/public/videos/surah/104-al-humazah/
   rm -rf assets/public/videos/surah/105-al-fil/
   ...
   rm -rf assets/public/videos/surah/114-an-nas/
   rm -rf scratch/staging/phase4b_surahs_104_114/
   ```
   Because source files in `public/` were never modified, rollback restores 100% initial state in seconds.

2. **Pre-Migration Safety Snapshot:**
   The full Phase 2 pre-migration backup remains archived at:
   [`scratch/backup/pre_migration_2026_10_21/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/backup/pre_migration_2026_10_21)
   All 48 critical manifest and configuration files can be restored with SHA-256 verification.

---

## 7. Migration Readiness & Recommendations for User Approval

Before proceeding with Phase 5 or any production directory modifications, the following specific architectural decisions require user direction:

### Decisions Requiring User Approval

1. **Path Scheme Decision for Single-Loop Surahs:**
   - **Option A (Canonical Nested):** Move all Surahs to `public/videos/surah/<pad>-<slug>/<pad>-<slug>.mp4` and update `surahChapters.ts`, `videoManifest.ts`, and `videoVersions.ts`.
   - **Option B (Next.js Rewrites):** Keep physical files nested in `public/videos/surah/<pad>-<slug>/`, but add Next.js rewrites in `next.config.mjs` so existing `/videos/surah/<pad>-<slug>.mp4` URLs continue working seamlessly without code changes.
   - **Option C (Hybrid Architecture):** Keep single-loop Surahs flat (`public/videos/surah/*.mp4`) and multi-scene Surahs nested (`public/videos/surah/002-al-baqarah/`, `003-aal-e-imran/`, `018-al-kahf/`).

2. **Resolution for 56.74 GB Legacy Verse Duplicates:**
   - **Recommendation:** Implement code-level verse deduplication in `surahVerseVideos.ts` so all verses in a thematic set point to the single set video file, allowing the 56.74 GB duplicate files to be safely archived into `Unused Items/` without consuming disk space.

3. **Gate 2 Stock Visual Candidates Approval:**
   - Review the 11 candidate videos in [`scratch/staging/gate2_11_visuals/review_stock_candidates.html`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/gate2_11_visuals/review_stock_candidates.html). Upon user sign-off, they can be promoted to canonical folders.

---

## 8. Verification Sign-Off

- [x] Phase 4B Staged Files: 11/11 Verified (100% SHA-256 match, independent inodes)
- [x] Phase 4A Trial Files: 73/73 Verified (100% match)
- [x] Inbox Catalogue: Hash verified against pre-migration backup
- [x] Surah 2 Canonical Folder: 62 files (1,399.61 MB) intact
- [x] 4K Masters: 70 files (2.71 GB) intact
- [x] Workspace Symlinks: 123/123 Verified (0 errors)
- [x] Review Required Items: 30/30 Verified intact
- [x] TypeScript Build: `npm run typecheck` passes with exit code 0
- [x] Execution Restrictions: Zero files modified, deleted, or committed to Git

**Audit Verdict:** **READY FOR PLANNING & USER ALIGNMENT**  
All files and staging targets are in an exemplary, verified state. Staging remains safely isolated from runtime paths.
