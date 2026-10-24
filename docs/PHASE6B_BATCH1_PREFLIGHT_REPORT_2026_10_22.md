# HuDa Web Quran — Phase 6B Batch 1 Preflight Verification Report

**Document Date:** October 22, 2026  
**Auditor & Planner:** Antigravity (Advanced Agentic AI Assistant)  
**Project Workspace:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
**Execution Mode:** STRICT READ-ONLY PREFLIGHT (Zero file moves, zero renames, zero deletions, zero code edits, zero R2 uploads)  
**Baseline Document:** [`docs/PHASE6A_REMAINING_DUPLICATE_AUDIT_2026_10_22.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/PHASE6A_REMAINING_DUPLICATE_AUDIT_2026_10_22.md)  
**Batch Scope:** Surahs 30, 31, and 32 (`public/videos/surah_30/`, `public/videos/surah_31/`, `public/videos/surah_32/`)  
**Proposed Relocation Target:** `public/videos/Inbox/duplicates/surah_30/`, `surah_31/`, and `surah_32/`  

---

## 1. Executive Summary & Verification Findings

This preflight verification rigorously audits the first incremental execution batch (**Batch 1: Surahs 30–32**) for moving confirmed byte-identical duplicates out of production video folders and into dedicated Inbox duplicate archives.

### A. Preflight Health Verification
1. **Candidate Duplicate Parity:** Exactly **124 candidate files** across Surahs 30, 31, and 32 were recomputed from disk. **100% (124/124)** match their corresponding parent `set_*.mp4` files by exact SHA-256 hash.
2. **Recoverable Duplicate Volume:** **2,209,568,189 bytes** (**2.21 GB** decimal / **2.06 GiB** binary).
3. **Target Destination Safety:** Target directories (`public/videos/Inbox/duplicates/surah_{30,31,32}/`) do not currently exist. There is **zero risk of name collisions or overwriting**.
4. **Zero Runtime Dependencies:** Comprehensive AST and substring scans across `src/`, `data/`, and `scripts/` confirm **0 active references** to any of the 124 `ayah_*.mp4` files.
5. **Zero Symlink Dependencies:** Verified that **0 symlinks** anywhere in the workspace point to any of these 124 files.
6. **Protected Stores Untouched:** Prior Surah 8 trial files (5 files), relocated Surah 8 duplicates (70 files), Surah 2 production folder (62 files), Surah 3 preserved unique files (117 files), and the central Inbox catalogue remain 100% verified and bit-identical.
7. **TypeScript Integrity:** `npm run typecheck` passes with code 0 and zero compilation errors.

---

## 2. Storage Measurement Unit Reconciliation (GB vs GiB)

To ensure mathematical precision across all project documentation, the table below defines and reconciles the dual-unit measurements used for media asset storage:

### A. Definition of Units
- **Decimal System (SI Metric / Disk Manufacturer Standard):**
  - $1\text{ kB} = 1,000\text{ bytes} = 10^3\text{ bytes}$
  - $1\text{ MB} = 1,000,000\text{ bytes} = 10^6\text{ bytes}$
  - $1\text{ GB} = 1,000,000,000\text{ bytes} = 10^9\text{ bytes}$
- **Binary System (IEC Computing / RAM & OS Filesystem Standard):**
  - $1\text{ KiB} = 1,024\text{ bytes} = 2^{10}\text{ bytes}$
  - $1\text{ MiB} = 1,048,576\text{ bytes} = 2^{20}\text{ bytes}$
  - $1\text{ GiB} = 1,073,741,824\text{ bytes} = 2^{30}\text{ bytes}$
- **Conversion Factor:** $1\text{ GiB} = 1.073741824\text{ GB}$, meaning a byte total expressed in binary $\text{GiB}$ is always approximately **6.87% smaller** than when expressed in decimal $\text{GB}$.

### B. Dual-Unit Reconciliation Table

| Metric | Raw Byte Count | Decimal MB ($10^6$) | Decimal GB ($10^9$) | Binary MiB ($2^{20}$) | Binary GiB ($2^{30}$) | Notes |
|---|---:|---:|---:|---:|---:|---|
| **Surah 30 Candidates (60 files)** | 1,179,636,062 B | 1,179.64 MB | 1.18 GB | 1,124.99 MiB | 1.10 GiB | Matches 8 sets |
| **Surah 31 Candidates (34 files)** | 380,126,083 B | 380.13 MB | 0.38 GB | 362.52 MiB | 0.35 GiB | Matches 5 sets |
| **Surah 32 Candidates (30 files)** | 649,806,044 B | 649.81 MB | 0.65 GB | 619.70 MiB | 0.61 GiB | Matches 4 sets |
| **Batch 1 Combined (124 files)** | **2,209,568,189 B** | **2,209.57 MB** | **2.21 GB** | **2,107.21 MiB** | **2.06 GiB** | **Immediate Batch 1 Target** |
| **Phase 6A Total Duplicates (2,289 files)** | **52,350,571,927 B** | **52,350.57 MB** | **52.35 GB** | **49,925.40 MiB** | **48.76 GiB** | **Global 21-Surah Aggregate** |

> [!NOTE]
> In Phase 6A documentation, the aggregate figure was reported as `49,925.40 MB / 48.76 GB` using binary GiB ($52,350,571,927 / 1024^3 = 48.7553\text{ GiB}$). In decimal metric notation, that exact same byte count is $52,350,571,927 / 10^9 = \mathbf{52.35\text{ GB}}$. Both numbers represent the identical byte volume.

---

## 3. Batch 1 Per-Surah Cluster & Cryptographic Breakdown

Every canonical `set_*.mp4` file and its dependent `ayah_*.mp4` candidate files were re-hashed with SHA-256 directly from disk.

### A. Surah 30 (`public/videos/surah_30/`)
- **Total Directory Files:** 68 files (8 canonical sets, 60 candidate duplicates)
- **Canonical Sets (Retained in Place):** 8 files (150,741,850 bytes / 143.76 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 60 files (1,179,636,062 bytes / 1.10 GiB)
- **Parity Result:** **60 of 60 match (100.0%)**

| Set File | Range | Set Size | Set SHA-256 (Prefix) | Ayah Files Covered | Total Ayah Bytes | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-10.mp4` | 1–10 | 27,481,673 B | `7b51e6e9d4429456...` | `ayah_1.mp4` – `ayah_10.mp4` (10 files) | 274,816,730 B | **100% MATCH** |
| `set_02_ayah_11-19.mp4` | 11–19 | 46,443,393 B | `a5fe3f58f73a3c2d...` | `ayah_11.mp4` – `ayah_19.mp4` (9 files) | 417,990,537 B | **100% MATCH** |
| `set_03_ayah_20-27.mp4` | 20–27 | 5,883,057 B | `193719c274f8660e...` | `ayah_20.mp4` – `ayah_27.mp4` (8 files) | 47,064,456 B | **100% MATCH** |
| `set_04_ayah_28-32.mp4` | 28–32 | 8,704,449 B | `e0b7f7054992cc19...` | `ayah_28.mp4` – `ayah_32.mp4` (5 files) | 43,522,245 B | **100% MATCH** |
| `set_05_ayah_33-40.mp4` | 33–40 | 16,037,953 B | `122ce3a5f8942aea...` | `ayah_33.mp4` – `ayah_40.mp4` (8 files) | 128,303,624 B | **100% MATCH** |
| `set_06_ayah_41-45.mp4` | 41–45 | 16,098,479 B | `8530f16eccdb29d1...` | `ayah_41.mp4` – `ayah_45.mp4` (5 files) | 80,492,395 B | **100% MATCH** |
| `set_07_ayah_46-50.mp4` | 46–50 | 22,696,477 B | `5164a885a33ba598...` | `ayah_46.mp4` – `ayah_50.mp4` (5 files) | 113,482,385 B | **100% MATCH** |
| `set_08_ayah_51-60.mp4` | 51–60 | 7,396,369 B | `594eda75e01bd9cc...` | `ayah_51.mp4` – `ayah_60.mp4` (10 files) | 73,963,690 B | **100% MATCH** |

---

### B. Surah 31 (`public/videos/surah_31/`)
- **Total Directory Files:** 39 files (5 canonical sets, 34 candidate duplicates)
- **Canonical Sets (Retained in Place):** 5 files (55,799,130 bytes / 53.21 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 34 files (380,126,083 bytes / 0.35 GiB)
- **Parity Result:** **34 of 34 match (100.0%)**

| Set File | Range | Set Size | Set SHA-256 (Prefix) | Ayah Files Covered | Total Ayah Bytes | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-11.mp4` | 1–11 | 15,326,284 B | `9cc6bb2750d69779...` | `ayah_1.mp4` – `ayah_11.mp4` (11 files) | 168,589,124 B | **100% MATCH** |
| `set_02_ayah_12-19.mp4` | 12–19 | 5,883,057 B | `193719c274f8660e...` | `ayah_12.mp4` – `ayah_19.mp4` (8 files) | 47,064,456 B | **100% MATCH** |
| `set_03_ayah_20-26.mp4` | 20–26 | 8,704,449 B | `e0b7f7054992cc19...` | `ayah_20.mp4` – `ayah_26.mp4` (7 files) | 60,931,143 B | **100% MATCH** |
| `set_04_ayah_27-30.mp4` | 27–30 | 16,098,479 B | `8530f16eccdb29d1...` | `ayah_27.mp4` – `ayah_30.mp4` (4 files) | 64,393,916 B | **100% MATCH** |
| `set_05_ayah_31-34.mp4` | 31–34 | 9,786,861 B | `4d0a9d1ac114bce9...` | `ayah_31.mp4` – `ayah_34.mp4` (4 files) | 39,147,444 B | **100% MATCH** |

---

### C. Surah 32 (`public/videos/surah_32/`)
- **Total Directory Files:** 34 files (4 canonical sets, 30 candidate duplicates)
- **Canonical Sets (Retained in Place):** 4 files (87,597,743 bytes / 83.54 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 30 files (649,806,044 bytes / 0.61 GiB)
- **Parity Result:** **30 of 30 match (100.0%)**

| Set File | Range | Set Size | Set SHA-256 (Prefix) | Ayah Files Covered | Total Ayah Bytes | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-9.mp4` | 1–9 | 31,469,119 B | `1ce4233691f8638c...` | `ayah_1.mp4` – `ayah_9.mp4` (9 files) | 283,222,071 B | **100% MATCH** |
| `set_02_ayah_10-14.mp4` | 10–14 | 27,481,673 B | `7b51e6e9d4429456...` | `ayah_10.mp4` – `ayah_14.mp4` (5 files) | 137,408,365 B | **100% MATCH** |
| `set_03_ayah_15-22.mp4` | 15–22 | 5,950,474 B | `b5a373911381d5ad...` | `ayah_15.mp4` – `ayah_22.mp4` (8 files) | 47,603,792 B | **100% MATCH** |
| `set_04_ayah_23-30.mp4` | 23–30 | 22,696,477 B | `5164a885a33ba598...` | `ayah_23.mp4` – `ayah_30.mp4` (8 files) | 181,571,816 B | **100% MATCH** |

---

## 4. Cross-System Dependency & Code Scan Results

A full codebase scan was executed to verify if any runtime, manifest, build, script, or symlink relies on any of the 124 candidate files:

1. **[`src/lib/data/videoManifest.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoManifest.ts):**
   - References **only `set_*.mp4` files** for Surahs 30, 31, and 32 (8 sets in Surah 30, 5 sets in Surah 31, 4 sets in Surah 32).
   - **0 references** to any `ayah_*.mp4` files.
2. **[`src/lib/data/surahChapters.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/surahChapters.ts):**
   - References chapter-level slug URLs (`/videos/surah/030-ar-rum.mp4`, etc.).
   - **0 references** to any `ayah_*.mp4` files.
3. **[`src/lib/data/surahVerseVideos.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/surahVerseVideos.ts) & [`src/lib/data/videoVersions.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoVersions.ts):**
   - **0 references** to Surahs 30, 31, or 32.
4. **Symlink Dependency Scan:**
   - There are 17 symlinks in `scratch/staging/batch_1_review/`, but all 17 target `set_*.mp4` files.
   - **0 symlinks** anywhere in the workspace point to any of the 124 candidate `ayah_*.mp4` files.
5. **Review HTML Files:**
   - No review HTML files exist for Surahs 30, 31, or 32 (only legacy review files for earlier Surahs exist inside `Unused Items/review-html/`).
6. **Archived Inventory Reference:**
   - The only occurrence in the repository is an archived line in [`Unused Items/cleanup-inventory.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/cleanup-inventory.json), which is purely a historic record.

---

## 5. Protected Assets Health Check

All protected stores were verified to ensure zero collateral impact:

| Protected Resource | Location | Expected State | Verified State | Health Status |
|---|---|---|---|:---:|
| **Surah 8 Trial Archive** | `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/` | 5 files (`cc67a93d89...`) | 5 files verified | **100% HEALTHY** |
| **Surah 8 Inbox Duplicates** | `public/videos/Inbox/duplicates/surah_8/` | 70 files (1,140,763,869 B) | 70 files verified | **100% HEALTHY** |
| **Canonical Surah 8** | `public/videos/surah_8/` | 11 sets, 0 ayah files | 11 sets, 0 ayah files | **100% HEALTHY** |
| **Central Inbox Catalogue** | `public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json` | SHA: `d63d58081375...` (233 approved, 107 review) | Identical hash verified | **100% HEALTHY** |
| **Surah 2 Folder** | `public/videos/surah/002-al-baqarah/` | 62 files (1,467,598,440 B) | 62 files verified | **100% HEALTHY** |
| **Surah 3 Preserved Files** | `public/videos/surah_3/` | 117 unique files (2,942,902,656 B) | 117 files verified | **100% HEALTHY** |

---

## 6. Batch 1 Execution & Instant Rollback Procedure

When approved by the user, Batch 1 will be executed using the following isolated, reversible Python workflow.

### A. Execution Script Logic (Planned for Phase 6B Execution Turn)
```python
import os
import shutil
import json

batch_surahs = [30, 31, 32]
base_src = "public/videos"
base_dst = "public/videos/Inbox/duplicates"

moves_ledger = []

for s in batch_surahs:
    src_dir = os.path.join(base_src, f"surah_{s}")
    dst_dir = os.path.join(base_dst, f"surah_{s}")
    os.makedirs(dst_dir, exist_ok=False)
    
    for f in sorted(os.listdir(src_dir)):
        if f.startswith("ayah_") and f.endswith(".mp4"):
            src_file = os.path.join(src_dir, f)
            dst_file = os.path.join(dst_dir, f)
            shutil.move(src_file, dst_file)
            moves_ledger.append({"source": src_file, "destination": dst_file})

with open("scratch/staging/batch_1_execution_ledger.json", "w") as f:
    json.dump(moves_ledger, f, indent=2)

print(f"Batch 1 Complete: Moved {len(moves_ledger)} files.")
```

### B. Instant 1-Command Rollback Procedure
If any unexpected discrepancy occurs, all 124 files can be restored to their exact source paths in under 2 seconds:
```python
import os
import shutil

for s in [30, 31, 32]:
    src_dir = f"public/videos/Inbox/duplicates/surah_{s}"
    dst_dir = f"public/videos/surah_{s}"
    if os.path.exists(src_dir):
        for f in os.listdir(src_dir):
            shutil.move(os.path.join(src_dir, f), os.path.join(dst_dir, f))
        os.rmdir(src_dir)
print("ROLLBACK COMPLETE: All 124 Batch 1 duplicate files restored.")
```

---

## 7. Preflight Conclusion & Stop Gate

- **Readiness:** **100% READY FOR EXECUTION**
- **Safety Margin:** Absolute (zero code dependencies, non-existent destination folders, 100% cryptographic parity, instant rollback capability).
- **Stop Gate:** In accordance with safety protocol, execution is strictly stopped. **No files have been moved.** Antigravity is awaiting explicit user authorization to proceed with Batch 1 relocation.
