import { mediaUrl } from "@/lib/media";

/**
 * Clips replaced on R2 under the same key. R2 serves clips with
 * "max-age=31536000, immutable", so a browser that already has the old file
 * never asks again — a version query makes it a new URL. Bump (or add) a key
 * here whenever an upload overwrites a clip people may have seen.
 */
const VIDEO_VERSIONS: Readonly<Record<string, number>> = {
  // 2026-10-07: blue placeholders → the rendered scenes.
  "/videos/surah/036-ya-sin.mp4": 2,
  "/videos/surah/055-ar-rahman.mp4": 2,
  "/videos/surah/067-al-mulk.mp4": 2,
  "/videos/surah/085-al-buruj.mp4": 2,
  "/videos/surah/091-ash-shams.mp4": 2,
  "/videos/surah/103-al-asr.mp4": 2,
  "/videos/surah/112-al-ikhlas.mp4": 2,
  "/videos/surah/113-al-falaq.mp4": 2,
  "/videos/surah/114-an-nas.mp4": 2,
};

/** R2 URL of a background clip (a "/videos/…" path or its URL), with its version if replaced. */
export function clipUrl(pathOrUrl: string): string {
  const url = mediaUrl(pathOrUrl);
  if (url.includes("?")) return url;
  const i = url.indexOf("/videos/");
  const v = i >= 0 ? VIDEO_VERSIONS[url.slice(i)] : undefined;
  return v ? `${url}?v=${v}` : url;
}
