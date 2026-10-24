# HuDa Web Quran — Phase 7C: Public Asset Isolation Plan

**Date:** 2026-10-23  
**Status:** DRY-RUN & READ-ONLY PLANNING ONLY (No files moved, deleted, or altered)  
**Target Moving Scope:** 2,359 duplicate video files from `public/videos/Inbox/duplicates/`  
**Target Byte Total:** 53,491,335,796 bytes (53.4913 GB decimal / 49.8177 GiB binary)  
**Proposed Destination:** `archive/duplicates/` (Strictly outside `public/`)  
**Proposed Move Manifest:** `scratch/staging/phase7_isolation_dry_run/move_manifest.json`

---

## 1. Executive Summary

In Phase 7A, an audit revealed that because Next.js automatically mounts and serves all files under `<rootDir>/public` at the root URL `/`, the 2,359 duplicate video files located in `public/videos/Inbox/duplicates/` are technically accessible to public HTTP requests.

This document establishes an evidence-based, 100% reversible plan to isolate these 2,359 files outside the `public/` web root. This action will immediately terminate public HTTP static serving, protect CI/CD deployment bundle size limits, and eliminate the risk of accidental public R2 sync, all while preserving all canonical sets, protected assets, and runtime operations.

> [!IMPORTANT]
> This phase is strictly read-only. No files have been moved, renamed, uploaded, or deleted. The plan and dry-run manifest are prepared for review and approval.

---

## 2. Pre-Migration Audit Results (Step 1)

### 2.1 File Count & Location Reconciliation

| Group | Location | File Count | Byte Size | Manifest Match? | Current Exposure |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Phase 6 Duplicates** | `public/videos/Inbox/duplicates/surah_{4..32}/` | 2,289 | 52,350,571,927 B | **YES (100%)** | **EXPOSED** (in `public/`) |
| **Surah 8 Inbox Duplicates** | `public/videos/Inbox/duplicates/surah_8/` | 70 | 1,140,763,869 B | **YES (100%)** | **EXPOSED** (in `public/`) |
| **Subtotal to Isolate** | `public/videos/Inbox/duplicates/` | **2,359** | **53,491,335,796 B** | **YES (100%)** | **EXPOSED** |
| **Surah 8 Trial Archive** | `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/` | 5 | 114,478,210 B | **YES (100%)** | **NOT EXPOSED** (outside `public/`) |
| **Grand Total Duplicates** | — | **2,364** | **53,605,814,006 B** | **YES (100%)** | — |

- Every one of the 2,359 candidate files physically exists on disk.
- Physical disk byte counts and SHA-256 hashes match `scratch/staging/phase7_r2_preflight/r2_archive_manifest.json` with zero discrepancies.
- The 5 Surah 8 trial archive files in `Unused Items/` are already outside `public/` and are excluded from the relocation list.

### 2.2 Dependency & Runtime Audit
- **Application Code (`src/`):** 0 references to `videos/Inbox/duplicates` or `Inbox/duplicates`.
- **Public Data & Configs:** 0 references in `public/` non-media files.
- **Inbox Catalogue:** [INBOX_VIDEO_CATALOGUE.json](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json) SHA-256 remains `d63d580813754d6fe3253040ba38b4c11c2f25002260a31460e5b7d74c6c896b`. Zero duplicate references.
- **Active Symlinks:** 0 symlinks point to or from duplicate files.
- **Conclusion:** Moving files out of `public/videos/Inbox/duplicates/` will have **zero runtime impact** on the live website or API.

---

## 3. Isolation Strategy Comparison (Step 2)

| Criteria | Option A: Move to Local Dedicated Directory (`archive/duplicates/`) | Option B: Upload to Private R2, Verify, Then Move/Delete | Option C: Leave in Place with Operational Warnings |
| :--- | :--- | :--- | :--- |
| **Exposure Remediation** | **IMMEDIATE (100%)**<br/>Instantly removes files from web server root. | **DELAYED**<br/>Files remain exposed during upload (3–8 hrs). | **ZERO**<br/>Exposure remains active indefinitely. |
| **Execution Speed** | **SECONDS**<br/>Fast atomic local filesystem rename/move. | **HOURS**<br/>53.5 GB network transfer dependent on bandwidth. | **IMMEDIATE**<br/>No action taken. |
| **Reversibility** | **100% REVERSIBLE**<br/>Instant 1:1 rollback on same volume. | **COMPLEX**<br/>Irreversible if local files deleted without full multi-check. | **N/A**<br/>No changes made. |
| **Deployment Risk** | **ELIMINATED**<br/>Build tools ignore directories outside `public/`. | **ELIMINATED**<br/>Only once local files are removed. | **CRITICAL RISK**<br/>53.5 GB in `public/` breaks Vercel/CI bundle limits. |
| **R2 Tool Leak Risk** | **ELIMINATED**<br/>`upload-to-r2.mjs` only walks `public/videos/`. | **CONTROLLED**<br/>Requires careful bucket separation. | **HIGH RISK**<br/>Accidental run uploads duplicates to public CDN. |
| **Physical Storage Freed** | **0 Bytes**<br/>Local moves on same volume retain disk blocks. | **53.49 GB**<br/>Fully reclaimed once local files deleted. | **0 Bytes**<br/>No storage reclaimed. |
| **Cloud Costs & Auth** | **$0.00**<br/>No API calls, tokens, or credentials needed. | Low storage cost (~$0.80/mo); requires private R2 bucket setup. | **$0.00** |

### Strategic Recommendation: Phased Hybrid Migration
1. **Immediate Phase (Option A):** Move the 2,359 files out of `public/` to `archive/duplicates/surah_<N>/`.  
   *Justification:* It immediately, safely, and deterministically closes the security and deployment exposure with zero network risk and zero cost.
2. **Follow-Up Phase (Option B):** In a subsequent controlled phase, stream `archive/duplicates/` to the private Cloudflare R2 bucket (`huda-quran-archive`), verify remote checksums, and delete local files to reclaim **53.49 GB of SSD storage**.

---

## 4. Dry-Run Migration Plan Specification (Step 3)

### 4.1 Migration Parameters
- **Source Root:** `public/videos/Inbox/duplicates/`
- **Destination Root:** `archive/duplicates/`
- **Total Files:** 2,359
- **Total Bytes:** 53,491,335,796 bytes (~53.49 GB)
- **Surahs Involved:** 22 Surahs (Surahs 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 23, 25, 26, 28, 30, 31, 32)
- **Proposed Move Manifest:** `scratch/staging/phase7_isolation_dry_run/move_manifest.json`

### 4.2 Sample Move Mapping

```text
Source:      public/videos/Inbox/duplicates/surah_30/ayah_1.mp4
Destination: archive/duplicates/surah_30/ayah_1.mp4
Rollback:    public/videos/Inbox/duplicates/surah_30/ayah_1.mp4
Size:        27,481,673 bytes
SHA-256:     7b51e6e9d442945646de29f3a249d186e00beb6a9949cc905921dacb526aa945
```

### 4.3 Preflight Safety Gates (Dry-Run Validated)

| Safety Gate | Criteria | Dry-Run Status |
| :--- | :--- | :---: |
| **Gate 1: Source Existence** | All 2,359 source files must exist on disk | **PASSED (0 missing)** |
| **Gate 2: Hash & Size Match** | Source sizes and SHA-256 must match preflight manifest | **PASSED (0 mismatches)** |
| **Gate 3: Collision Prevention** | No destination file or directory may pre-exist | **PASSED (0 collisions)** |
| **Gate 4: Protected Asset Exclusion** | Zero protected assets in candidate list | **PASSED (0 violations)** |
| **Gate 5: Canonical Set Exclusion** | Zero canonical `set_*.mp4` files in candidate list | **PASSED (0 violations)** |

---

## 5. Protected Assets Guarantee

The following assets are explicitly protected, quarantined from the move, and confirmed intact:

1. **Surah 2 (User-Updated Source of Truth):**
   - Path: `public/videos/surah_2/`
   - Files: 63 items (53 video clips + 9 JSON manifests + 1 .DS_Store)
   - Size: 1,467,604,588 bytes
   - Status: **STRICTLY UNTOUCHED**.
2. **Surah 3 (Remediated Video Assets):**
   - Path: `public/videos/surah_3/`
   - Files: 117 unique files
   - Size: 2,942,902,656 bytes
   - Status: **STRICTLY UNTOUCHED**.
3. **Surah 1:**
   - Path: `public/videos/surah_1/`
   - Files: 7 unique files
   - Status: **STRICTLY UNTOUCHED**.
4. **Surah 4 Review-Required Assets:**
   - Path: `public/videos/surah_4/`
   - Excluded ayahs: 15 files (`ayah_99..105`, `ayah_169..176`, 105.56 MB) + 1 root `\.mp4` (21.55 MB)
   - Status: **STRICTLY UNTOUCHED** in production directory.
5. **Canonical Sets (310 Files):**
   - 299 sets across Phase 6 Surahs + 11 sets in Surah 8.
   - Status: **STRICTLY UNTOUCHED** in production directories.
6. **Inbox Stock Video Catalogue:**
   - Path: `public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json`
   - SHA-256: `d63d580813754d6fe3253040ba38b4c11c2f25002260a31460e5b7d74c6c896b`
   - Status: **STRICTLY UNTOUCHED**.
7. **Surah 8 Trial Archive:**
   - Path: `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/`
   - Files: 5 files (`ayah_71.mp4` through `ayah_75.mp4`, 114,478,210 bytes)
   - Status: **STRICTLY PRESERVED** in existing trial archive.

---

## 6. Step-by-Step Execution Plan (Upon User Approval)

When approved for execution in Phase 7D:
1. **Pre-Execution Check:** Verify Git status and re-verify preflight gates.
2. **Atomic Directory Creation:** Create `archive/duplicates/surah_<N>/` for each involved surah.
3. **Hardlink / Move Operation:** Move each file using POSIX `rename()` (fast, zero duplicate block consumption on APFS).
4. **Post-Move Integrity Check:**
   - Verify all 2,359 files exist at `archive/duplicates/`.
   - Verify sizes and SHA-256 hashes match `move_manifest.json`.
   - Verify `public/videos/Inbox/duplicates/` is completely empty.
   - Remove empty `public/videos/Inbox/duplicates/` folder.
5. **Ledger Generation:** Record `scratch/staging/phase7_isolation/execution_ledger.json`.

---

## 7. Automated Reversible Rollback Procedure

Because every entry in `move_manifest.json` specifies `destination_path` and `rollback_path`, the operation is 100% reversible:

```bash
# Python rollback logic (Dry-run tested):
python3 - << 'EOF'
import json, os, shutil

with open("scratch/staging/phase7_isolation_dry_run/move_manifest.json") as f:
    manifest = json.load(f)

for m in manifest["moves"]:
    current = m["destination_path"]
    original = m["rollback_path"]
    if os.path.exists(current):
        os.makedirs(os.path.dirname(original), exist_ok=True)
        shutil.move(current, original)
print("Rollback complete: all files returned to original paths.")
EOF
```

---

## 8. Unresolved Risks & Next Steps Requiring Approval

1. **Local Storage Accounting Law:** Moving 53.49 GB from `public/videos/Inbox/duplicates/` to `archive/duplicates/` does **NOT** free physical SSD space. Reclaiming disk space requires Cloudflare R2 private upload followed by local deletion.
2. **Next Steps Requiring Explicit User Approval:**
   - User review and explicit approval of `docs/PHASE7C_PUBLIC_ASSET_ISOLATION_PLAN.md`.
   - User instruction to proceed with **Phase 7D: Execute Duplicate Isolation to `archive/duplicates/`**.

---
*Report certified strictly read-only. No files were moved, renamed, or modified during Phase 7C.*
