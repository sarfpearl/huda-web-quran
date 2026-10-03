/**
 * HuDa Web Quran — Centralized Media URL Resolver
 *
 * Resolves media asset paths against Cloudflare R2 when NEXT_PUBLIC_MEDIA_BASE_URL
 * is configured. Falls back to local relative paths (served from /public)
 * when the variable is absent or empty, keeping local development working seamlessly.
 */

const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").trim().replace(/\/+$/, "");

/**
 * Resolves a media asset path (e.g. "/assets/images/surah/001-al-fatihah.jpg", "/videos/...")
 * against the configured R2 public base URL.
 *
 * Rules:
 * 1. If path is null/undefined/empty, returns empty string.
 * 2. If path is already an absolute HTTP/HTTPS, blob, or data URL, returns it unchanged.
 * 3. If NEXT_PUBLIC_MEDIA_BASE_URL is not set, returns the original path unchanged.
 * 4. Otherwise, prepends MEDIA_BASE to the clean leading-slash path.
 */
export function mediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  if (!MEDIA_BASE) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${MEDIA_BASE}${cleanPath}`;
}
