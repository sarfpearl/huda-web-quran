/**
 * Where the media lives on the Mac. The repo holds the code (git); the media
 * the scripts read and write sits next to it in ../huda-media (or $HUDA_MEDIA)
 * and is never in git — see docs/FOLDER_MAP.md.
 *
 * Scripts name a media folder by its old place in the repo ("public/videos",
 * "scratch/…"); mediaPath() turns that into the folder's real place. A folder
 * not moved yet still resolves inside the repo, so the scripts work before,
 * during and after the move.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const MEDIA_ROOT = process.env.HUDA_MEDIA
  ? path.resolve(process.env.HUDA_MEDIA)
  : path.resolve(REPO_ROOT, "../huda-media");

/** [old place in the repo, place under MEDIA_ROOT] */
export const MEDIA_FOLDERS = [
  [".media-work", "1-live-copy/media-work"],
  ["assets/audio", "1-live-copy/audio"],
  ["public/videos", "2-masters/videos"],
  ["assets/video-masters", "2-masters/video-masters"],
  ["assets/images", "2-masters/images"],
  ["assets/brand", "2-masters/brand"],
  ["scratch", "3-working/scratch"],
  ["user_candidates", "3-working/user_candidates"],
  ["Unused Items", "4-unused/unused-items"],
  ["assets/public", "4-unused/assets-public"],
];

/** Absolute path of a repo-relative media path, wherever its folder now is. */
export function mediaPath(rel) {
  const clean = rel.replace(/^\/+/, "");
  for (const [from, to] of MEDIA_FOLDERS) {
    if (clean !== from && !clean.startsWith(`${from}/`)) continue;
    const moved = path.join(MEDIA_ROOT, to);
    if (fs.existsSync(moved)) return path.join(moved, clean.slice(from.length));
    break;
  }
  return path.join(REPO_ROOT, clean);
}
