# HuDa Web Quran — Phase 7A: Public Asset Exposure Audit Report

**Date:** 2026-10-23  
**Audit Type:** Strict Read-Only Security & Routing Audit  
**Scope:** Public asset accessibility of 2,364 relocated duplicate videos across Next.js routing, middleware, deployment configs, and media tooling.

---

## 1. Executive Summary

During Phases 5D and 6A–6N, exactly 2,359 duplicate ayah video files (53,491,335,796 bytes / ~53.49 GB) were moved into `public/videos/Inbox/duplicates/surah_<N>/`, and 5 earlier trial files (114,478,210 bytes / ~114.48 MB) were archived in `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/`.

This audit evaluated whether files placed in `public/videos/Inbox/duplicates/` are exposed to the public internet through production URLs, whether application code links to them, and what operational hazards exist.

### Core Audit Findings

| Category | Finding | Risk Level | Evidence / Details |
| :--- | :--- | :--- | :--- |
| **Next.js Static Serving** | **EXPOSED** | **HIGH** | In Next.js, all files under `public/` are served at root `/`. Any HTTP request to `/videos/Inbox/duplicates/surah_X/ayah_Y.mp4` returns HTTP 200 OK. |
| **Middleware Security** | **NONE** | **HIGH** | No `middleware.ts` or edge request interceptor exists in the codebase. |
| **Next.js Config (`next.config.mjs`)** | **NO RULES** | **HIGH** | No redirects, rewrites, or header restrictions are configured to block `/videos/Inbox/duplicates/`. |
| **Deployment Config (`vercel.json`)** | **NO RULES** | **HIGH** | Contains only a keepalive cron. No route-level access control or blocking headers. |
| **Robots Policy (`robots.ts`)** | **NOT DISALLOWED** | **MEDIUM** | Only `/admin` and `/api` are disallowed. However, `robots.txt` does not provide access protection. |
| **App Code Linkage (`src/`)** | **ZERO REFERENCES** | **LOW** | No code in `src/` references `Inbox` or `duplicates`. |
| **Inbox Catalogue** | **ZERO REFERENCES** | **LOW** | `INBOX_VIDEO_CATALOGUE.json` contains no duplicate paths; SHA-256 remains strictly preserved. |
| **R2 Upload Script Hazard** | **OPERATIONAL RISK** | **HIGH** | `scripts/tools/upload-to-r2.mjs` recursively scans `public/videos` and would upload duplicates to the public R2 bucket if executed without `--sets-only`. |
| **Surah 8 Trial Archive** | **NOT EXPOSED** | **ZERO** | Located in `Unused Items/` (outside `public/`). Inaccessible via HTTP. |

---

## 2. Next.js Routing & Static Asset Handling Analysis

### 2.1 Next.js Default Static File Serving Architecture
Next.js (App Router / Pages Router) mounts the local `<rootDir>/public` directory directly to the web root URL path `/`.

- **Filesystem Path:**  
  `public/videos/Inbox/duplicates/surah_8/ayah_1.mp4`
- **Mapped Public HTTP URL:**  
  `https://<domain>/videos/Inbox/duplicates/surah_8/ayah_1.mp4`

In development (`next dev`), production server (`next start`), and static CDN export / Vercel edge:
- Static assets bypass page routers and API handlers.
- Files with valid extensions (`.mp4`) are served directly with `Content-Type: video/mp4` and HTTP 200 / 206 Partial Content (range requests).

### 2.2 Middleware Inspection
An exhaustive search for Next.js middleware was conducted:
- `src/middleware.ts` — **ABSENT**
- `src/middleware.js` — **ABSENT**
- `middleware.ts` — **ABSENT**
- `middleware.js` — **ABSENT**

**Result:** No middleware exists to check user sessions, API tokens, IP allowlists, or request paths for `/videos/Inbox/duplicates/**`.

### 2.3 Next.js Configuration (`next.config.mjs`)
The configuration file was inspected:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev", pathname: "/assets/images/**" },
    ],
  },
};
export default nextConfig;
```
**Result:** No custom `headers()`, `redirects()`, or `rewrites()` exist. Static assets under `public/` are served without modification or blocking.

### 2.4 Deployment Configuration (`vercel.json`)
The deployment configuration contains:
```json
{
  "crons": [{ "path": "/api/keepalive", "schedule": "17 3 * * *" }]
}
```
**Result:** No headers or routes block `/videos/Inbox/duplicates/`.

### 2.5 Search Engine Crawling (`src/app/robots.ts`)
```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
```
**Result:**  
1. `/videos/Inbox/duplicates/` is covered by `allow: "/"`.
2. Even if disallowed, `robots.txt` does not prevent direct access, scraping, or automated enumeration.

---

## 3. Application Code & Catalogue Linkage Audit

### 3.1 Codebase References (`src/`)
- A full-text grep of `src/` for `Inbox` returned **0 matches**.
- A full-text grep of `src/` for `duplicates` returned **0 matches**.
- Active video paths in `src/lib/data/videoManifest.ts` and `src/lib/data/surahChapters.ts` reference only canonical sets (e.g. `/videos/surah/002-al-baqarah/...`) and active juz clips.
- **Finding:** The application does not intentionally render or link to duplicate files.

### 3.2 Inbox Catalogue (`public/videos/Inbox/INBOX_VIDEO_CATALOGUE.json`)
- Checked for any reference to `duplicates` or `ayah_*.mp4`: **0 matches**.
- Current SHA-256: `d63d580813754d6fe3253040ba38b4c11c2f25002260a31460e5b7d74c6c896b` (Unchanged).
- **Finding:** The catalogue strictly indexes approved stock videos and ignores the `duplicates/` subfolder.

---

## 4. Operational Hazards & Deployment Impact

### Hazard 1: Vercel & CI/CD Deployment Limits
Deploying the Next.js app to Vercel or similar platforms packages static assets in `public/`.
- Total size of duplicates in `public/`: **53,491,335,796 bytes (~53.49 GB)**.
- Platform limits: Vercel deployment bundles typically have a 500 MB to 2 GB static limit and 100 MB per-file limit.
- **Impact:** Attempting a git-based deployment with 53.49 GB in `public/` would lead to deployment failure, massive bandwidth spikes, or build timeouts.

### Hazard 2: `upload-to-r2.mjs` Tool Ingestion
`scripts/tools/upload-to-r2.mjs` line 118 defines:
```javascript
{
  category: "videos",
  localDir: path.join(ROOT_DIR, "public", "videos"),
  remotePrefix: "videos",
}
```
The file discovery function walks `public/videos/` recursively and only excludes `.DS_Store`, `Thumbs.db`, `.bak`, `.tmp`, `.txt`, `.json`, and generation report directories.
- **Vulnerability:** If an engineer executes:
  ```bash
  node scripts/tools/upload-to-r2.mjs --category=videos --execute
  ```
  (without `--sets-only`), the script will automatically discover all 2,359 duplicate videos and upload them to the **public** Cloudflare R2 bucket (`huda-quran-media`) under `videos/Inbox/duplicates/...`.
- **Resulting Exposure:** All 53.49 GB would become publicly accessible on `https://pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev/videos/Inbox/duplicates/...`.

---

## 5. Security & Isolation Comparison

| Store Location | File Count | Byte Size | Public HTTP Accessible? | R2 Upload Tool Vulnerable? |
| :--- | :---: | :---: | :---: | :---: |
| `public/videos/Inbox/duplicates/` | 2,359 | 53,491,335,796 B (~53.49 GB) | **YES** (Next.js `/videos/...`) | **YES** (Default recursive walk) |
| `Unused Items/surah-verse-duplicates/trial_surah_8_set_11/` | 5 | 114,478,210 B (~114.48 MB) | **NO** (Outside `public/`) | **NO** (Not in upload mappings) |
| **Total Archived Duplicates** | **2,364** | **53,605,814,006 B (~53.61 GB)** | **2,359 exposed / 5 isolated** | — |

---

## 6. Recommendations & Remediation Plan

1. **Short-Term Quarantine (Immediate Pre-Archive Action):**
   - Relocate the `duplicates/` directory out of `public/` to a private directory outside web serving (e.g. `archive/duplicates/` or `Unused Items/archive/duplicates/`).
   - This instantly eliminates Next.js HTTP exposure, prevents deployment bloat, and safeguards against accidental R2 public sync.
2. **Long-Term Archive (Cloudflare R2 Private Bucket):**
   - Upload the 2,364 verified files to a dedicated **private** Cloudflare R2 bucket (`huda-quran-archive`), never to the public media bucket.
   - Verify SHA-256 checksums post-upload.
   - Delete local files upon verified cloud preservation to reclaim 53.61 GB of physical SSD space.
3. **Tool Hardening:**
   - Update `scripts/tools/upload-to-r2.mjs` to explicitly ignore `Inbox`, `duplicates`, and non-canonical paths by default.

---
*Report certified strictly read-only. No files were modified, moved, or deleted during this audit.*
