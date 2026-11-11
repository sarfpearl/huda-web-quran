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
  // 2026-10-16: Surah 3 remediated clips (0.40s seam & re-rendered scenes)
  "/videos/surah/003-aal-e-imran/01a-the-immutable-foundation-and-muhkamat.mp4": 2,
  "/videos/surah/003-aal-e-imran/02c-the-supreme-sovereign-and-cosmic-order.mp4": 2,
  "/videos/surah/003-aal-e-imran/10a-ulul-albab-and-contemplation-of-creation.mp4": 2,
  // 2026-11-04: Surah 3 borrowed sets replaced with fresh independent clips
  "/videos/surah_3/set_09_ayah_57-63.mp4": 2,
  "/videos/surah_3/set_11_ayah_71-77.mp4": 2,
  "/videos/surah_3/set_13_ayah_85-91.mp4": 2,
  "/videos/surah_3/set_19_ayah_127-133.mp4": 2,
  "/videos/surah_3/set_21_ayah_141-147.mp4": 2,
  "/videos/surah_3/set_29_ayah_197-200.mp4": 2,
  // 2026-11-10: letterbox bars cropped off, picture scaled to fill the frame
  "/videos/surah_3/set_02_ayah_8-14.mp4": 2,
  "/videos/surah_5/set_03_ayah_15-21.mp4": 2,
  "/videos/surah_5/set_11_ayah_71-77.mp4": 2,
  "/videos/surah_5/set_13_ayah_85-91.mp4": 2,
  "/videos/surah_5/set_15_ayah_99-105.mp4": 2,
  "/videos/surah_5/set_16_ayah_106-112.mp4": 2,
  "/videos/surah_5/set_17_ayah_113-120.mp4": 2,
  "/videos/surah_6/set_04_ayah_22-28.mp4": 2,
  "/videos/surah_6/set_07_ayah_43-49.mp4": 2,
  "/videos/surah_6/set_09_ayah_57-63.mp4": 2,
  "/videos/surah_6/set_13_ayah_85-91.mp4": 2,
  "/videos/surah_6/set_14_ayah_92-98.mp4": 2,
  "/videos/surah_6/set_18_ayah_120-126.mp4": 2,
  "/videos/surah_6/set_20_ayah_134-140.mp4": 2,
  "/videos/surah_6/set_21_ayah_141-147.mp4": 2,
  "/videos/surah_6/set_22_ayah_148-154.mp4": 2,
  "/videos/surah_6/set_23_ayah_155-165.mp4": 2,
  "/videos/surah_7/set_04_ayah_22-28.mp4": 2,
  "/videos/surah_7/set_05_ayah_29-35.mp4": 2,
  "/videos/surah_7/set_06_ayah_36-42.mp4": 2,
  "/videos/surah_7/set_13_ayah_85-91.mp4": 2,
  "/videos/surah_7/set_15_ayah_99-105.mp4": 2,
  "/videos/surah_7/set_22_ayah_148-154.mp4": 2,
  "/videos/surah_7/set_24_ayah_162-168.mp4": 2,
  "/videos/surah_7/set_26_ayah_176-182.mp4": 2,
  "/videos/surah_7/set_29_ayah_197-206.mp4": 2,
  "/videos/surah_8/set_01_ayah_1-7.mp4": 2,
  "/videos/surah_8/set_02_ayah_8-14.mp4": 2,
  "/videos/surah_8/set_04_ayah_22-28.mp4": 2,
  "/videos/surah_8/set_06_ayah_36-42.mp4": 2,
  "/videos/surah_8/set_10_ayah_64-70.mp4": 2,
  "/videos/surah_9/set_01_ayah_1-7.mp4": 2,
  "/videos/surah_9/set_04_ayah_22-28.mp4": 2,
  "/videos/surah_9/set_08_ayah_50-56.mp4": 2,
  "/videos/surah_9/set_13_ayah_85-91.mp4": 2,
  "/videos/surah_9/set_15_ayah_99-105.mp4": 2,
  "/videos/surah_9/set_16_ayah_106-112.mp4": 2,
  "/videos/surah_11/set_10_ayah_64-70.mp4": 2,
  "/videos/surah_12/set_07_ayah_43-49.mp4": 2,
  "/videos/surah_12/set_08_ayah_50-56.mp4": 2,
  "/videos/surah_15/set_08_ayah_50-56.mp4": 2,
  "/videos/surah_15/set_10_ayah_64-70.mp4": 2,
  "/videos/surah_21/set_15_ayah_92-97.mp4": 2,
  "/videos/surah_36/set_07_ayah_59-67.mp4": 2,
  "/videos/surah_37/set_03_ayah_22-39.mp4": 2,
  "/videos/surah_37/set_10_ayah_114-122.mp4": 2,
  "/videos/surah_39/set_09_ayah_68-75.mp4": 2,
  "/videos/surah_41/set_06_ayah_33-36.mp4": 2,
  "/videos/surah_42/set_04_ayah_23-29.mp4": 2,
  "/videos/surah_43/set_06_ayah_57-65.mp4": 2,
  "/videos/surah_47/set_03_ayah_15-19.mp4": 2,
  "/videos/surah_48/set_01_ayah_1-7.mp4": 2,
  "/videos/surah_48/set_02_ayah_8-17.mp4": 2,
  "/videos/surah_51/set_03_ayah_24-37.mp4": 2,
  "/videos/surah_55/set_05_ayah_46-61.mp4": 2,
  "/videos/surah_57/set_05_ayah_25-29.mp4": 2,
  "/videos/surah_61/set_01_ayah_1-9.mp4": 2,
  "/videos/surah_66/set_02_ayah_8-12.mp4": 2,
  "/videos/surah_67/set_01_ayah_1-14.mp4": 2,
  "/videos/surah_68/set_02_ayah_17-33.mp4": 2,
  "/videos/surah_74/set_02_ayah_11-30.mp4": 2,
  "/videos/surah_92/set_02_ayah_12-21.mp4": 2,
};

/** R2 URL of a background clip (a "/videos/…" path or its URL), with its version if replaced. */
export function clipUrl(pathOrUrl: string): string {
  const url = mediaUrl(pathOrUrl);
  if (url.includes("?")) return url;
  const i = url.indexOf("/videos/");
  const v = i >= 0 ? VIDEO_VERSIONS[url.slice(i)] : undefined;
  return v ? `${url}?v=${v}` : url;
}
