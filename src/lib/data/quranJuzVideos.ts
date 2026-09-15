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

// Canonical 8-clip multi-video sequence for Juz 1
export const JUZ_1_PLAYLIST: string[] = [
  "/videos/juz/juz-01-01-guidance.mp4",
  "/videos/juz/juz-01-02-revelation.mp4",
  "/videos/juz/juz-01-03-choice.mp4",
  "/videos/juz/juz-01-04-earth-and-stewardship.mp4",
  "/videos/juz/juz-01-05-covenant-and-history.mp4",
  "/videos/juz/juz-01-06-steadfastness.mp4",
  "/videos/juz/juz-01-07-ibrahim-foundation.mp4",
  "/videos/juz/juz-01-08-continuation.mp4",
];

export const JUZ_VIDEOS: Record<number, JuzVideoConfig> = {
  1: {
    juzNumber: 1,
    title: "Juz 1",
    videoPath: "/videos/juz/juz-01.mp4",
  },
};

export function getJuzVideo(juzNumber: number): JuzVideoConfig | null {
  return JUZ_VIDEOS[juzNumber] || null;
}

export function getJuzVideoPath(juzNumber: number): string | null {
  return JUZ_VIDEOS[juzNumber]?.videoPath || null;
}

export function getJuzPlaylist(juzNumber: number): string[] {
  const config = JUZ_VIDEOS[juzNumber];
  return config?.videoPath ? [config.videoPath] : [];
}
