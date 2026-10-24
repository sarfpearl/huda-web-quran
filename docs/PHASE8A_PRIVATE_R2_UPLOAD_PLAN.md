# HuDa Web Quran — Phase 8A: Private R2 Archive Preflight and Upload Plan

**Date:** 2026-10-23  
**Status:** **STRICT READ-ONLY PREFLIGHT & UPLOAD PLANNING ONLY**  
**Target Scope:** 2,364 archived duplicate videos  
**Target Byte Total:** 53,605,814,006 bytes (53.6058 GB decimal / 49.9243 GiB binary)  
**Target Private Bucket:** `huda-quran-archive` (Private, Non-Public)  
**Upload Plan Manifest:** `scratch/staging/phase8_r2_upload_preflight/upload_plan.json`

---

## 1. Executive Summary

This report establishes a comprehensive, non-destructive, and cryptographically verified plan to migrate all 2,364 archived duplicate videos into a dedicated private Cloudflare R2 bucket (`huda-quran-archive`).

The duplicate assets were previously isolated from public web serving in Phase 7D and verified in Phase 7E. This plan defines the object-key hierarchy, resumable upload mechanics, remote checksum validation, financial cost analysis, and explicit approval gates.

> [!IMPORTANT]
> This phase is strictly read-only. Zero bytes have been uploaded, zero files have been deleted, no R2 buckets have been created or modified, and no credentials have been exposed.

---

## 2. Resolution of Prior Audit Exceptions (Phase 7E Review)

During the Phase 7E audit steps, three commands registered exit code 1 in temporary shell operations. Each was investigated to determine whether it represented an actual filesystem defect or an audit script query issue:

| Incident | Command / Scope | Exit Code | Root Cause Analysis | Underlying Filesystem Integrity Status |
| :--- | :--- | :---: | :--- | :--- |
| **Audit Script Assertion** | Python assertion on Surah 4 special file | **1** | Temporary script had hardcoded expected size `22601362` instead of authoritative size `21548589`. Authoritative record in `PHASE6M_BATCH7_PREFLIGHT_REPORT` line 9 specifies `21,548,589 B`. | **PASS (100% Intact)**<br/>File `public/videos/surah_4/\.mp4` on disk is exactly `21,548,589 bytes`. When assertion was corrected, script passed with exit code 0. |
| **Grep Query Phrasing** | Grep for `"15 excluded"` & `"Non-Duplicate"` | **1** | String literal in grep differed from exact markdown heading `Excluded Files (Strictly Protected): 15 files`. | **PASS (100% Intact)**<br/>All 15 excluded ayahs (`ayah_99..105`, `ayah_169..176`, 105,562,358 B) confirmed intact on disk. |
| **Task-4925 Symlink Audit** | Workspace-wide symlink scan | **1** | Script raised `FATAL` on 4 historical testing symlinks in `scratch/staging/phase4a_trial/` created during earlier Phase 4A testing. | **PASS (100% Intact)**<br/>Targeted symlink audit for relocated duplicate paths confirmed **0 symlinks** and exited with code 0. |

**Conclusion:** All three exit code 1 instances were harmless script-literal or query-string artifacts. The physical repository, protected assets, and archive stores remain 100% cryptographically consistent.

---

## 3. Authoritative Inventory Reconciliation

Both archive repositories were re-audited on disk against the authoritative execution ledgers:

| Archive Store | Scope | Files | Size (Bytes) | Size (GB Dec) | Size (GiB Bin) | Source Ledger | Local Storage Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| `Unused Items/archive/duplicates/` | Phase 7D Isolated | 2,359 | 53,491,335,796 | 53.4913 GB | 49.8177 GiB | `scratch/staging/phase7d_public_inbox_move/move_ledger.json` | Non-served (Isolated) |
| `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/` | Phase 5B Trial | 5 | 114,478,210 | 0.1145 GB | 0.1066 GiB | `scratch/staging/phase5b_surah8_trial/phase5b_trial_ledger.json` | Non-served (Preserved) |
| **GRAND TOTAL TO ARCHIVE** | **Both Groups** | **2,364** | **53,605,814,006** | **53.6058 GB** | **49.9243 GiB** | `scratch/staging/phase8_r2_upload_preflight/upload_plan.json` | **Zero Overlap / No Double-Counting** |

---

## 4. Dedicated Private R2 Architecture & Bucket Policy

### 4.1 Strict Bucket Separation
- **Public Production Bucket:** `huda-quran-media` (Used strictly for active public web media via `pub-*.r2.dev`).
- **Dedicated Archive Bucket:** `huda-quran-archive` (Used strictly for non-public cold storage of duplicate videos).
- **Rule:** Archived duplicate videos must **NEVER** be uploaded to `huda-quran-media`.

### 4.2 Security & Access Settings for `huda-quran-archive`
1. **Public R2.dev Access:** **DISABLED** (Off).
2. **Custom Domain Binding:** **NONE** (No public DNS or CDN routing).
3. **CORS Policy:** Restricted or Disabled.
4. **Bucket Encryption:** Enabled (Cloudflare default SSE-S3).

### 4.3 Normalized Object Key Structure
To ensure clean alphabetical sorting, eliminate collisions, and preserve provenance, every object key uses zero-padded surah folders:

```text
duplicates/
├── surah_04/
│   ├── ayah_1.mp4
│   └── ... (161 files)
├── surah_05/
│   └── ... (176 files)
...
├── surah_08/
│   ├── ayah_1.mp4
│   ├── ... (70 inbox duplicate files)
│   └── trial_set_11/
│       ├── ayah_71.mp4
│       └── ... (5 trial duplicate files)
...
└── surah_32/
    └── ... (30 files)
```
- Total unique keys: Exactly **2,364**.
- Key collisions: **0**.

---

## 5. Resumable Upload Engine & Overwrite Protection

### 5.1 Pre-Upload Object Collision Check (`HeadObjectCommand`)
Before uploading each file:
1. Query R2 with `HeadObjectCommand(Bucket, Key)`.
2. **If object exists:**
   - Compare remote `ContentLength` with local `byte_size`.
   - Compare remote metadata `x-amz-meta-sha256` with local `sha256`.
   - If both match: Mark as `ALREADY_VERIFIED` and skip upload.
   - If remote object exists with different size or hash: **HALT IMMEDIATELY**. Do not overwrite; raise collision error.
3. **If object does not exist (404 Not Found):** Proceed to upload.

### 5.2 Streaming Upload & Custom Metadata
To prevent memory exhaustion when streaming 53.6 GB of video:
- Use Node.js streaming (`fs.createReadStream()`) or chunked stream buffers.
- Concurrency: 3 to 4 parallel workers.
- Attach mandatory cryptographic metadata:
  ```json
  {
    "sha256": "<64-character-hex-hash>",
    "archive-group": "<batch_name>",
    "surah": "<surah_number>",
    "filename": "<filename>",
    "original-source-path": "<original_path>"
  }
  ```

### 5.3 Network Retry with Exponential Backoff
- Retry on network disconnect, timeout, HTTP 500/503.
- Backoff schedule: 1s, 2s, 4s, 8s (maximum 3 retries per file).

---

## 6. Remote Cryptographic Verification Protocol

### Why ETags are Insufficient Proof of SHA-256
In AWS S3 and Cloudflare R2:
- Single-part uploads return an ETag based on MD5 hex digest (`"..."`), not SHA-256.
- Multipart uploads return an ETag formatted as `<md5-of-part-md5s>-<part-count>`, which represents neither MD5 nor SHA-256.
- **Protocol:** ETags are treated as insufficient evidence of SHA-256 parity.

### 5-Step Remote Verification Standard
1. **Metadata Verification:** Query `HeadObjectCommand` for each uploaded file; verify `ContentLength` and `x-amz-meta-sha256` match `upload_plan.json`.
2. **Bucket Pagination Sweep:** Execute `ListObjectsV2Command` across `huda-quran-archive` under prefix `duplicates/`.
3. **Count Parity:** Confirm remote object count equals exactly **2,364**.
4. **Byte Parity:** Confirm remote byte sum equals exactly **53,605,814,006 bytes**.
5. **Execution Ledger Certification:** Generate `scratch/staging/phase8_r2_upload/upload_ledger.json` recording remote verification timestamps.

---

## 7. Cloudflare R2 Cost & Financial Impact Analysis

Cloudflare R2 provides an industry-leading pricing model with **zero data egress fees**:

| Cost Dimension | Cloudflare R2 Pricing Standard | Project Volume (2,364 files / 53.61 GB) | Estimated Cost |
| :--- | :--- | :---: | :---: |
| **Storage (Monthly)** | $0.015 / GB-month (First 10 GB free) | 53.61 GB | **~$0.65 – $0.80 / month** |
| **Class A Ops (Uploads)** | $4.50 / million (First 1,000,000 free) | 2,364 PUT requests | **$0.00** (Free Tier) |
| **Class B Ops (Reads/Head)**| $0.36 / million (First 10,000,000 free) | 2,364 HEAD requests | **$0.00** (Free Tier) |
| **Data Ingress (Upload)** | Free ($0.00) | 53.61 GB transfer in | **$0.00** |
| **Data Egress (Download)**| Free ($0.00) | Any future recovery | **$0.00** |
| **TOTAL INITIAL COST** | — | — | **$0.00** |
| **TOTAL ONGOING COST** | — | — | **< $1.00 / month** |

---

## 8. Credentials Presence Check (Zero Credential Exposure)

A read-only presence check on `.env.local` confirmed all necessary environment variables are populated:
- `R2_ACCOUNT_ID`: **PRESENT** (32 characters)
- `R2_ACCESS_KEY_ID`: **PRESENT** (32 characters)
- `R2_SECRET_ACCESS_KEY`: **PRESENT** (64 characters)
- `R2_BUCKET_NAME`: **PRESENT** (Points to public media bucket; upload script will override with private target `huda-quran-archive`)

*No secret values or tokens were printed or logged.*

---

## 9. Protected Assets Guarantee

All production assets remain strictly protected and excluded from the upload plan:
- `public/videos/surah_2/` — 63 items (1,467,604,588 B).
- `public/videos/surah_3/` — 117 files (2,942,902,656 B).
- `public/videos/surah_1/` — 7 files.
- `public/videos/surah_4/` — 41 files (25 sets + 15 review ayahs + `\.mp4`).
- All 310 canonical `set_*.mp4` files across all Surahs.
- `public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json` — SHA-256 `d63d580813754d6fe3253040ba38b4c11c2f25002260a31460e5b7d74c6c896b`.

---

## 10. Execution Gates & Required User Approvals

Before any live network upload can begin, the following approvals are required:

1. **Bucket Provisioning Gate:**
   - User creates the private bucket `huda-quran-archive` in the Cloudflare Dashboard (with Public R2.dev Access disabled).
2. **Phase 8B Live Upload Authorization:**
   - User reviews and approves this plan (`docs/PHASE8A_PRIVATE_R2_UPLOAD_PLAN.md`).
   - User explicitly instructs the assistant to execute **Phase 8B: Live Streaming Upload to Private R2**.
3. **Local Disk Reclamation Gate:**
   - Local deletion of the 53.61 GB archive remains **STRICTLY PROHIBITED** until Phase 8B completes 100% remote cryptographic verification and receives a separate, explicit user command.
