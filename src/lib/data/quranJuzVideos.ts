/**
 * Canonical Video mapping for all 30 Quran Juz.
 * Pure Video-First Architecture: Every Juz maps to an edge-to-edge cinematic video sequence.
 */

export interface JuzVideoConfig {
  juzNumber: number;
  title: string;
  videoPath: string; // Default primary or fallback video
  playlist?: string[]; // Multi-video cinematic sequence
}

export const JUZ_VIDEOS: Record<number, JuzVideoConfig> = {
  1: {
    juzNumber: 1,
    title: "Juz 1",
    videoPath: "/videos/juz/juz-01.mp4",
  },
};

import { hasVideo } from "./videoManifest";
import { clipUrl } from "./videoVersions";

export function getJuzVideo(juzNumber: number): JuzVideoConfig | null {
  return JUZ_VIDEOS[juzNumber] || null;
}

export function getJuzVideoPath(juzNumber: number): string | null {
  const path = JUZ_VIDEOS[juzNumber]?.videoPath;
  return path && hasVideo(path) ? clipUrl(path) : null;
}

export function getJuzPlaylist(juzNumber: number): string[] {
  const config = JUZ_VIDEOS[juzNumber];
  return config?.videoPath ? [clipUrl(config.videoPath)] : [];
}
