# HuDa Web Quran — Phase 6C Batch 2 Preflight Audit Report

**Document Date:** October 23, 2026  
**Auditor & Planner:** Antigravity (Advanced Agentic AI Assistant)  
**Project Workspace:** `/Users/pearl-9744/Claude/Projects/huda-web-quran`  
**Execution Mode:** STRICT READ-ONLY PREFLIGHT AUDIT (Zero file moves, zero renames, zero deletions, zero code edits, zero R2 uploads)  
**Baseline Documents:**
- [`docs/PHASE6A_REMAINING_DUPLICATE_AUDIT_2026_10_22.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/PHASE6A_REMAINING_DUPLICATE_AUDIT_2026_10_22.md)
- [`docs/PHASE6B_BATCH1_PREFLIGHT_REPORT_2026_10_22.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/PHASE6B_BATCH1_PREFLIGHT_REPORT_2026_10_22.md)
- [`docs/PHASE6B_BATCH1_RELOCATION_REPORT_2026_10_23.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/PHASE6B_BATCH1_RELOCATION_REPORT_2026_10_23.md)
- [`docs/SURAH2_USER_UPDATED_VIDEO_INVENTORY_2026_10_23.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/SURAH2_USER_UPDATED_VIDEO_INVENTORY_2026_10_23.md)
- [`scratch/staging/batch_1_execution_ledger.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_execution_ledger.json)  

**Batch Scope:** Surahs 25, 26, and 28 (`public/videos/surah_25/`, `public/videos/surah_26/`, `public/videos/surah_28/`)  
**Proposed Relocation Target:** `public/videos/Inbox/duplicates/surah_25/`, `surah_26/`, and `surah_28/`  

---

## 1. Executive Summary & Audit Findings

This preflight verification rigorously audits the second execution batch (**Batch 2: Surahs 25, 26, and 28**) for candidate duplicate relocation. Every file was inspected directly from disk, re-hashed with SHA-256, and cross-referenced with all runtime consumers and protected stores.

### Key Audit Findings:
1. **Total Candidate Duplicate Files Examined:** **392 files**
   - Surah 25 (`public/videos/surah_25/`): **77 files**
   - Surah 26 (`public/videos/surah_26/`): **227 files**
   - Surah 28 (`public/videos/surah_28/`): **88 files**
2. **Cryptographic Parity (100%):** **392 of 392 files (100.0%)** match their corresponding canonical `set_*.mp4` parent files by bit-identical SHA-256 hash.
3. **Excluded / Unresolved Candidates:** **0 files** (Zero hash mismatches, zero missing sets, zero non-standard filenames).
4. **Potential Storage Recoverable:**
   - **Raw Bytes:** **8,787,657,052 bytes**
   - **Decimal Volume (SI $10^9$):** **8.79 GB** (8,787.66 MB)
   - **Binary Volume (IEC $2^{30}$):** **8.18 GiB** (8,380.56 MiB)
   - *(Note: Phase 6A reported ~8.19 GB using binary GiB notation; the exact figure is 8.1841 GiB / 8.7877 GB).*
5. **Canonical Sets Retained in Place:** All **33 canonical `set_*.mp4` files** (**780,302,173 bytes** / 780.30 MB) will remain permanently in their respective production directories:
   - `public/videos/surah_25/`: 8 canonical sets (182,556,346 bytes)
   - `public/videos/surah_26/`: 14 canonical sets (336,694,176 bytes)
   - `public/videos/surah_28/`: 11 canonical sets (261,051,651 bytes)
6. **Destination Safety (Zero Collisions):**
   - `public/videos/Inbox/duplicates/surah_25/` — **Does not exist (Safe)**
   - `public/videos/Inbox/duplicates/surah_26/` — **Does not exist (Safe)**
   - `public/videos/Inbox/duplicates/surah_28/` — **Does not exist (Safe)**
7. **Runtime & Code Dependency Impact:** Comprehensive AST and string searches confirm **0 active references** to any of the 392 `ayah_*.mp4` candidate files across `src/`, `data/`, and `scripts/`.
8. **Symlink Dependency Scan:** Exactly **0 symlinks** anywhere in the workspace point to any of these 392 files (all 33 symlinks in scratch point exclusively to canonical `set_*.mp4` files).
9. **Protected Assets Health:** Surah 2 user directory (63 files), Surah 3 preserved assets (117 unique files), Surah 8 archives (5 trial + 70 relocated), Surah 8 canonical sets (11 sets), Batch 1 relocated duplicates (124 files), and the Central Inbox Catalogue (`d63d5808...`) are 100% verified and bit-identical.
10. **TypeScript Integrity:** `npm run typecheck` passes with code 0.

---

## 2. Storage Measurement Unit Reconciliation (GB vs GiB)

To ensure precision and prevent confusion between decimal disk manufacturer units and binary memory/OS units, the table below provides exact dual-unit reconciliations:

### Measurement Table

| Scope | Candidate Files | Raw Byte Total | Decimal MB ($10^6$) | Decimal GB ($10^9$) | Binary MiB ($2^{20}$) | Binary GiB ($2^{30}$) | Canonical Sets Retained |
|---|:---:|---:|---:|---:|---:|---:|:---:|
| **Surah 25** | 77 | 1,788,255,215 B | 1,788.26 MB | 1.79 GB | 1,705.41 MiB | 1.67 GiB | 8 sets (182.56 MB) |
| **Surah 26** | 227 | 5,001,138,236 B | 5,001.14 MB | 5.00 GB | 4,769.45 MiB | 4.66 GiB | 14 sets (336.69 MB) |
| **Surah 28** | 88 | 1,998,263,601 B | 1,998.26 MB | 2.00 GB | 1,905.70 MiB | 1.86 GiB | 11 sets (261.05 MB) |
| **Batch 2 Total** | **392** | **8,787,657,052 B** | **8,787.66 MB** | **8.79 GB** | **8,380.56 MiB** | **8.18 GiB** | **33 sets (780.30 MB)** |
| **Batch 1 (Completed)** | 124 | 2,209,568,189 B | 2,209.57 MB | 2.21 GB | 2,107.21 MiB | 2.06 GiB | 17 sets (294.14 MB) |
| **Cumulative (B1 + B2)** | **516** | **10,997,225,241 B** | **10,997.23 MB** | **11.00 GB** | **10,487.77 MiB** | **10.24 GiB** | **50 sets (1,074.44 MB)** |

---

## 3. Detailed Per-Surah Cluster & Cryptographic Breakdown

Every canonical `set_*.mp4` file and its dependent `ayah_*.mp4` candidate files were re-hashed with SHA-256 directly from disk.

### A. Surah 25 (`public/videos/surah_25/`)
- **Total Directory Files:** 85 files (8 canonical sets, 77 candidate duplicates)
- **Canonical Sets (Retained in Place):** 8 files (182,556,346 bytes / 174.10 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 77 files (1,788,255,215 bytes / 1.67 GiB)
- **Parity Result:** **77 of 77 match (100.0%)**

| Set File | Verse Range | Set Size | Set SHA-256 (Prefix) | Ayahs Covered | Ayahs Volume | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-9.mp4` | 1–9 | 31,469,119 B | `1ce4233691f8638c...` | `ayah_1.mp4` – `ayah_9.mp4` (9 files) | 283,222,071 B | **100% MATCH** |
| `set_02_ayah_10-20.mp4` | 10–20 | 16,998,412 B | `aeb3fc7b8a87d34e...` | `ayah_10.mp4` – `ayah_20.mp4` (11 files) | 186,982,532 B | **100% MATCH** |
| `set_03_ayah_21-31.mp4` | 21–31 | 17,112,407 B | `62e5659e59e26655...` | `ayah_21.mp4` – `ayah_31.mp4` (11 files) | 188,236,477 B | **100% MATCH** |
| `set_04_ayah_32-44.mp4` | 32–44 | 24,341,690 B | `f18b3d05822a9836...` | `ayah_32.mp4` – `ayah_44.mp4` (13 files) | 316,441,970 B | **100% MATCH** |
| `set_05_ayah_45-50.mp4` | 45–50 | 22,696,477 B | `5164a885a33ba598...` | `ayah_45.mp4` – `ayah_50.mp4` (6 files) | 136,178,862 B | **100% MATCH** |
| `set_06_ayah_51-60.mp4` | 51–60 | 16,098,479 B | `8530f16eccdb29d1...` | `ayah_51.mp4` – `ayah_60.mp4` (10 files) | 160,984,790 B | **100% MATCH** |
| `set_07_ayah_61-67.mp4` | 61–67 | 7,396,369 B | `594eda75e01bd9cc...` | `ayah_61.mp4` – `ayah_67.mp4` (7 files) | 51,774,583 B | **100% MATCH** |
| `set_08_ayah_68-77.mp4` | 68–77 | 46,443,393 B | `a5fe3f58f73a3c2d...` | `ayah_68.mp4` – `ayah_77.mp4` (10 files) | 464,433,930 B | **100% MATCH** |

---

### B. Surah 26 (`public/videos/surah_26/`)
- **Total Directory Files:** 241 files (14 canonical sets, 227 candidate duplicates)
- **Canonical Sets (Retained in Place):** 14 files (336,694,176 bytes / 321.10 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 227 files (5,001,138,236 bytes / 4.66 GiB)
- **Parity Result:** **227 of 227 match (100.0%)**

| Set File | Verse Range | Set Size | Set SHA-256 (Prefix) | Ayahs Covered | Ayahs Volume | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-9.mp4` | 1–9 | 61,600,261 B | `b14460441daf1446...` | `ayah_1.mp4` – `ayah_9.mp4` (9 files) | 554,402,349 B | **100% MATCH** |
| `set_02_ayah_10-22.mp4` | 10–22 | 38,489,625 B | `2490cb061216243c...` | `ayah_10.mp4` – `ayah_22.mp4` (13 files) | 500,365,125 B | **100% MATCH** |
| `set_03_ayah_23-33.mp4` | 23–33 | 31,469,119 B | `1ce4233691f8638c...` | `ayah_23.mp4` – `ayah_33.mp4` (11 files) | 346,160,309 B | **100% MATCH** |
| `set_04_ayah_34-51.mp4` | 34–51 | 5,950,474 B | `b5a373911381d5ad...` | `ayah_34.mp4` – `ayah_51.mp4` (18 files) | 107,108,532 B | **100% MATCH** |
| `set_05_ayah_52-68.mp4` | 52–68 | 25,691,106 B | `c4251d78b2b4eb49...` | `ayah_52.mp4` – `ayah_68.mp4` (17 files) | 436,748,802 B | **100% MATCH** |
| `set_06_ayah_69-89.mp4` | 69–89 | 21,589,686 B | `05880a27238f94b9...` | `ayah_69.mp4` – `ayah_89.mp4` (21 files) | 453,383,406 B | **100% MATCH** |
| `set_07_ayah_90-104.mp4` | 90–104 | 16,998,412 B | `aeb3fc7b8a87d34e...` | `ayah_90.mp4` – `ayah_104.mp4` (15 files) | 254,976,180 B | **100% MATCH** |
| `set_08_ayah_105-122.mp4` | 105–122 | 16,098,479 B | `8530f16eccdb29d1...` | `ayah_105.mp4` – `ayah_122.mp4` (18 files) | 289,772,622 B | **100% MATCH** |
| `set_09_ayah_123-140.mp4` | 123–140 | 24,341,690 B | `f18b3d05822a9836...` | `ayah_123.mp4` – `ayah_140.mp4` (18 files) | 438,150,420 B | **100% MATCH** |
| `set_10_ayah_141-159.mp4` | 141–159 | 8,704,449 B | `e0b7f7054992cc19...` | `ayah_141.mp4` – `ayah_159.mp4` (19 files) | 165,384,531 B | **100% MATCH** |
| `set_11_ayah_160-175.mp4` | 160–175 | 27,392,488 B | `09cb560b186d5860...` | `ayah_160.mp4` – `ayah_175.mp4` (16 files) | 438,279,808 B | **100% MATCH** |
| `set_12_ayah_176-191.mp4` | 176–191 | 17,112,407 B | `62e5659e59e26655...` | `ayah_176.mp4` – `ayah_191.mp4` (16 files) | 273,798,512 B | **100% MATCH** |
| `set_13_ayah_192-209.mp4` | 192–209 | 31,469,119 B | `1ce4233691f8638c...` | `ayah_192.mp4` – `ayah_209.mp4` (18 files) | 566,444,142 B | **100% MATCH** |
| `set_14_ayah_210-227.mp4` | 210–227 | 9,786,861 B | `4d0a9d1ac114bce9...` | `ayah_210.mp4` – `ayah_227.mp4` (18 files) | 176,163,498 B | **100% MATCH** |

---

### C. Surah 28 (`public/videos/surah_28/`)
- **Total Directory Files:** 99 files (11 canonical sets, 88 candidate duplicates)
- **Canonical Sets (Retained in Place):** 11 files (261,051,651 bytes / 248.96 MiB)
- **Candidate Duplicates (`ayah_*.mp4`):** 88 files (1,998,263,601 bytes / 1.86 GiB)
- **Parity Result:** **88 of 88 match (100.0%)**

| Set File | Verse Range | Set Size | Set SHA-256 (Prefix) | Ayahs Covered | Ayahs Volume | Parity Status |
|---|:---:|---:|:---:|:---:|---:|:---:|
| `set_01_ayah_1-6.mp4` | 1–6 | 27,481,673 B | `7b51e6e9d4429456...` | `ayah_1.mp4` – `ayah_6.mp4` (6 files) | 164,890,038 B | **100% MATCH** |
| `set_02_ayah_7-13.mp4` | 7–13 | 38,489,625 B | `2490cb061216243c...` | `ayah_7.mp4` – `ayah_13.mp4` (7 files) | 269,427,375 B | **100% MATCH** |
| `set_03_ayah_14-21.mp4` | 14–21 | 49,678,038 B | `bd212926e340ae6b...` | `ayah_14.mp4` – `ayah_21.mp4` (8 files) | 397,424,304 B | **100% MATCH** |
| `set_04_ayah_22-28.mp4` | 22–28 | 22,696,477 B | `5164a885a33ba598...` | `ayah_22.mp4` – `ayah_28.mp4` (7 files) | 158,875,339 B | **100% MATCH** |
| `set_05_ayah_29-35.mp4` | 29–35 | 9,716,367 B | `b3e79cb5ab56bb1a...` | `ayah_29.mp4` – `ayah_35.mp4` (7 files) | 68,014,569 B | **100% MATCH** |
| `set_06_ayah_36-42.mp4` | 36–42 | 25,691,106 B | `c4251d78b2b4eb49...` | `ayah_36.mp4` – `ayah_42.mp4` (7 files) | 179,837,742 B | **100% MATCH** |
| `set_07_ayah_43-50.mp4` | 43–50 | 31,469,119 B | `1ce4233691f8638c...` | `ayah_43.mp4` – `ayah_50.mp4` (8 files) | 251,752,952 B | **100% MATCH** |
| `set_08_ayah_51-59.mp4` | 51–59 | 24,341,690 B | `f18b3d05822a9836...` | `ayah_51.mp4` – `ayah_59.mp4` (9 files) | 219,075,210 B | **100% MATCH** |
| `set_09_ayah_60-75.mp4` | 60–75 | 8,704,449 B | `e0b7f7054992cc19...` | `ayah_60.mp4` – `ayah_75.mp4` (16 files) | 139,271,184 B | **100% MATCH** |
| `set_10_ayah_76-82.mp4` | 76–82 | 12,996,246 B | `17e552e535298757...` | `ayah_76.mp4` – `ayah_82.mp4` (7 files) | 90,973,722 B | **100% MATCH** |
| `set_11_ayah_83-88.mp4` | 83–88 | 9,786,861 B | `4d0a9d1ac114bce9...` | `ayah_83.mp4` – `ayah_88.mp4` (6 files) | 58,721,166 B | **100% MATCH** |

---

## 4. Cross-System Dependency & Code Scan Results

A full codebase scan was executed across application code, manifests, registries, scripts, and symlinks:

1. **[`src/lib/data/videoManifest.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoManifest.ts):**
   - References **only `set_*.mp4` files** for Surahs 25, 26, and 28 (8 sets for Surah 25, 14 sets for Surah 26, 11 sets for Surah 28).
   - **0 references** to any `ayah_*.mp4` files.
2. **[`src/lib/data/surahChapters.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/surahChapters.ts):**
   - References chapter-level slug URLs (`/videos/surah/025-al-furqan.mp4`, etc.).
   - **0 references** to any `ayah_*.mp4` files.
3. **[`src/lib/data/surahVerseVideos.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/surahVerseVideos.ts) & [`src/lib/data/videoVersions.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoVersions.ts):**
   - **0 references** to Surahs 25, 26, or 28.
4. **Symlink Dependency Scan:**
   - Exactly 33 symlinks exist in `scratch/staging/batch_1_review/` touching Surahs 25, 26, and 28, but **all 33 target canonical `set_*.mp4` files**.
   - **0 symlinks** anywhere in the workspace point to any of the 392 candidate `ayah_*.mp4` files.
5. **Review HTML Files:**
   - HTML review files in `scratch/staging/` (`review_surah_25.html`, etc.) reference only `set_*.mp4` files.
   - **0 references** to `ayah_*.mp4` files.
6. **Archived Inventory Reference:**
   - Only historical archived records exist inside [`Unused Items/cleanup-inventory.json`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/Unused%20Items/cleanup-inventory.json), with zero active runtime relevance.

---

## 5. Protected Assets Baseline Health Check

All protected resources were re-verified from disk prior to Batch 2 planning:

| Protected Resource | Path | Expected State | Verified Status |
|---|---|---|:---:|
| **Surah 2 User Directory** | [`public/videos/surah_2/`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah_2) | 63 files (1,467,604,588 B) — Current Source of Truth | **100% HEALTHY** |
| **Batch 1 Relocated Duplicates** | `public/videos/Inbox/duplicates/surah_{30,31,32}/` | 124 files (2,209,568,189 B) | **100% HEALTHY** |
| **Surah 8 Trial Archive** | `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/` | 5 files (`cc67a93d89...`) | **100% HEALTHY** |
| **Surah 8 Inbox Duplicates** | `public/videos/Inbox/duplicates/surah_8/` | 70 files (1,140,763,869 B) | **100% HEALTHY** |
| **Canonical Surah 8 Sets** | `public/videos/surah_8/` | 11 canonical set files | **100% HEALTHY** |
| **Central Inbox Catalogue** | `public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json` | Hash: `d63d58081375...` (233 approved, 107 review) | **100% HEALTHY** |
| **Surah 3 Preserved Assets** | `public/videos/surah_3/` | 117 unique files (2,942,902,656 B) | **100% HEALTHY** |
| **Surah 4 Excluded Files** | `public/videos/surah_4/` (15 review files) | Untouched | **100% HEALTHY** |
| **Surah 2 Legacy Folders** | `public/videos/surah/002-al-baqarah/` & `ayah/002/` | Untouched | **100% HEALTHY** |

---

## 6. Batch 2 Execution & Instant Rollback Plan (Draft / Reference Only)

When authorized by the user, Batch 2 relocation will execute via this atomic script:

### A. Execution Script (Planned for Future Execution Turn)
```python
import os
import shutil
import json

batch_surahs = [25, 26, 28]
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

with open("scratch/staging/batch_2_execution_ledger.json", "w") as f:
    json.dump(moves_ledger, f, indent=2)

print(f"Batch 2 Complete: Moved {len(moves_ledger)} files.")
```

### B. Instant 1-Command Rollback Procedure
If any unexpected discrepancy occurs, all 392 files can be restored to their exact source paths in under 3 seconds:
```python
import os
import shutil

for s in [25, 26, 28]:
    src_dir = f"public/videos/Inbox/duplicates/surah_{s}"
    dst_dir = f"public/videos/surah_{s}"
    if os.path.exists(src_dir):
        for f in os.listdir(src_dir):
            shutil.move(os.path.join(src_dir, f), os.path.join(dst_dir, f))
        os.rmdir(src_dir)
print("ROLLBACK COMPLETE: All 392 Batch 2 duplicate files restored.")
```

---

## 7. Audit Conclusion & Stop Gate

- **Readiness:** **100% READY FOR EXECUTION**
- **Safety Margin:** Absolute (zero code dependencies, non-existent destination folders, 100% cryptographic parity, instant rollback capability).
- **Stop Gate:** In accordance with safety protocol, execution is strictly stopped. **No files have been moved.** Antigravity is awaiting explicit user authorization before executing Batch 2 relocation.
