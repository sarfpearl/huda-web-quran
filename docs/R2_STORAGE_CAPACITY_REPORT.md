# HuDa Web Quran — Cloudflare R2 Storage Capacity Audit Report (Read-Only)

**Audit Timestamp**: 2026-10-24T02:08:29.091Z  
**Target Bucket**: `huda-quran-media`  
**API Mode**: Read-Only (`ListObjectsV2Command` S3-compatible API)  
**Verification Status**: ✅ **100% VERIFIED & RECONCILED (0 Byte Delta)**

---

## 1. Executive Capacity Summary

| Metric | Cloudflare Free-Tier Allowance (Decimal GB) | Cloudflare Free-Tier Allowance (Binary GiB) | Account / Bucket Hard Limit |
| :--- | :--- | :--- | :--- |
| **Total Plan Allowance** | **10.0000 GB** (10,000,000,000 bytes) | **10.0000 GiB** (10,737,418,240 bytes) | **Elastic / Pay-as-you-go** (No hard cap) |
| **Total Storage Used** | **9.2027 GB** (9,202,727,529 bytes) | **8.5707 GiB** (9,202,727,529 bytes) | **9.2027 GB** / **8.5707 GiB** |
| **Remaining Storage** | **0.7973 GB** (797,272,471 bytes / ~797.27 MB) | **1.4293 GiB** (1,534,690,711 bytes / ~1,463.60 MB) | **Virtually Unlimited** (Scales elastically) |
| **Usage Percentage** | **92.03%** | **85.71%** | N/A (Elastic) |
| **Total Objects** | **1,206 objects** | **1,206 objects** | **1,206 objects** |
| **Verification vs Previous State** | **0 byte delta** (100% match) | **0 byte delta** (100% match) | **0 object delta** (100% match) |

---

## 2. Cloudflare R2 Plan & Capacity Architecture

1. **Bucket Storage Limit**:
   - Cloudflare R2 buckets have **no fixed bucket ceiling or quota**. R2 is an elastic, distributed object store designed to scale automatically without provisioning.
2. **Account Plan & Free-Tier Allowance**:
   - Every Cloudflare account receives an included **Free Tier Allowance** of:
     - **10 GB / month** of standard storage.
     - **1,000,000 Class A operations / month** (writes, lists, state transitions).
     - **10,000,000 Class B operations / month** (reads, HEAD requests).
     - **Free egress bandwidth** (zero egress fees regardless of bandwidth consumed).
3. **Over-Allowance Pricing Model**:
   - If storage exceeds 10 GB, Cloudflare bills at standard pay-as-you-go rates:
     - Storage: **$0.015 per GB-month** (only billed for GBs above the 10 GB free tier).
     - Class A ops over 1M: $4.50 / million.
     - Class B ops over 10M: $0.36 / million.
4. **Current Operating Posture & Billing Verification**:
   - **Bucket Footprint**: At the bucket level, `huda-quran-media` currently uses **9,202,727,529 bytes** (**9.2027 GB** / **8.5707 GiB**). This is mathematically below Cloudflare's standard 10 GB monthly allowance by **797.27 MB** (decimal) or **1.429 GiB** (binary).
   - **Account-Level Billing Status**: **UNVERIFIED via API**. Because only R2 S3-compatible data credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) are configured without Cloudflare Management Billing API access (`CLOUDFLARE_API_TOKEN`), account-level billing parameters—such as whether other buckets share the account-wide 10 GB allowance, current billing cycle dates, and payment method status—cannot be verified programmatically and must be confirmed directly in the Cloudflare Dashboard.
   - The Stage 1 compression rollout successfully reclaimed **1.301 GB (1,396,991,077 bytes)**, reducing bucket size from 10.599 GB to 8.571 GiB, thereby bringing this bucket inside the 10 GB threshold.

---

## 3. Storage Breakdown by Category

| Category | Objects | Exact Bytes | Decimal Size | Binary Size | % of Total Storage |
| :--- | :-: | :-: | :-: | :-: | :-: |
| **Surah Canonical Videos** (`videos/surah_*/`) | 310 | 5,673,278,304 | 5.6733 GB | 5.2837 GiB | 61.65% |
| **Audio Assets** (`audio/`) | 50 | 2,041,375,519 | 2.0414 GB | 1.9012 GiB | 22.18% |
| **Surah Narrative Videos** (`videos/surah/002-al-baqarah/`) | 187 | 1,145,995,659 | 1.1460 GB | 1.0673 GiB | 12.45% |
| **Image Assets** (`assets/images/`) | 642 | 236,121,193 | 0.2361 GB | 0.2199 GiB | 2.57% |
| **Ayah Videos** (`videos/ayah/`) | 8 | 53,186,849 | 0.0532 GB | 0.0495 GiB | 0.58% |
| **Juz Videos** (`videos/juz/`) | 9 | 52,770,005 | 0.0528 GB | 0.0491 GiB | 0.57% |
| **Other Videos** | 0 | 0 | 0.0000 GB | 0.0000 GiB | 0.00% |
| **Other / Uncategorized** | 0 | 0 | 0.0000 GB | 0.0000 GiB | 0.00% |
| **Total** | **1,206** | **9,202,727,529** | **9.2027 GB** | **8.5707 GiB** | **100.00%** |

---

## 4. Reconciliation Against Previous Audit State

| Audit Point | Previous State (Post-Rollout) | Current Capacity Audit | Delta | Reconciliation Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Total Objects** | 1,206 | 1,206 | **0** | Exact match. No orphaned, unindexed, or missing objects. |
| **Total Storage** | 9,202,727,529 bytes | 9,202,727,529 bytes | **0 bytes** | Exact byte-for-byte match. Zero drift. |
| **Decimal Storage** | 9.2027 GB | 9.2027 GB | **0 GB** | Consistent. |
| **Binary Storage** | 8.5707 GiB | 8.5707 GiB | **0 GiB** | Consistent. |

---

## 5. Audit Methodology & Limitations

1. **Methodology**:
   - Enumerated 100% of the objects in bucket `huda-quran-media` using paginated `ListObjectsV2` calls over the Cloudflare R2 S3-compatible API.
   - Summed exact byte counts directly from AWS SDK object metadata (`Size` property).
   - Segmented paths by deterministic key prefixes matching application architecture.
2. **Limitations**:
   - **Account-Level Billing Scope**: The Cloudflare R2 S3-compatible API does not expose account subscription tier, active billing payment methods, or monthly Class A/B request counters. Account-level billing status is therefore marked **UNVERIFIED** via automated tools.
   - **Account-Wide Allowance Pooling**: Cloudflare's 10 GB free allowance is evaluated across all buckets under the account (`R2_ACCOUNT_ID`), not per bucket. While `huda-quran-media` is the only bucket configured in this workspace, any external buckets in the same account would share the 10 GB quota.
   - Request metrics and real-time billing overage alerts must be monitored directly via Cloudflare Dashboard (Analytics & Logs > R2).

---

## 6. Safety & Verification Checklist

- [x] Strictly read-only execution (0 objects uploaded, deleted, modified, or compressed)
- [x] Zero credential or secret exposure in reports or logs
- [x] No code modifications, commits, pushes, or deployments
- [x] Precise distinction between Free Tier threshold (10 GB) and elastic pay-as-you-go capacity
- [x] Reconciled against previous state with 0 byte delta
- [x] `npm run typecheck` passed
- [x] Git status clean
