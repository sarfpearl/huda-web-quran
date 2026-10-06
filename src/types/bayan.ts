import type { Category } from "./category";
import type { Speaker } from "./speaker";

export type AudioSource = "local";

/**
 * A playable track (a Surah or Juz recitation). The `Bayan` name is historical
 * — the app used to host Islamic talks too; Quran tracks reuse this shape.
 */
export interface Bayan {
  id: string;
  title: string;
  slug: string;
  description: string;
  speakerId: string;
  categoryId: string;
  /** ISO 639-ish label, e.g. "Tamil". */
  language: string;
  coverImageUrl: string | null;
  audioSource: AudioSource;
  audioUrl: string | null;
  durationSeconds: number;
  publishedAt: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A track with its reciter (speaker) and Quran category resolved — the shape
 * the UI and the player consume.
 */
export interface BayanWithRelations extends Bayan {
  speaker: Speaker;
  category: Category;
}
