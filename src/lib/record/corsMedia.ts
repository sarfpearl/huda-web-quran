/**
 * Record: media the canvas draws or Web Audio taps must be CORS-clean, or the
 * canvas is "tainted" (captureStream refuses it) and the audio comes out
 * silent. The reciters' hosts (mp3quran, everyayah, quranicaudio) send
 * `Access-Control-Allow-Origin: *`; our R2 bucket sends none, so its files
 * are loaded through the same-origin `/media-cors/…` rewrite (next.config.mjs).
 */

const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").trim().replace(/\/+$/, "");
const R2_HOST = /^https:\/\/pub-[0-9a-f]+\.r2\.dev(?=\/)/i;

/** The URL to load with crossOrigin="anonymous" (R2 → same-origin proxy). */
export function corsUrl(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (MEDIA_BASE && url.startsWith(`${MEDIA_BASE}/`)) return `/media-cors${url.slice(MEDIA_BASE.length)}`;
  if (R2_HOST.test(url)) return url.replace(R2_HOST, "/media-cors");
  return url;
}
