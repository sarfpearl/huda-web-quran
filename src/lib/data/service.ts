import type {
  Bayan,
  BayanSort,
  BayanWithRelations,
} from "@/types/bayan";
import type { Category } from "@/types/category";
import type { Speaker } from "@/types/speaker";
import { seedBayan, seedCategories, seedSpeakers } from "./seed";
import {
  QURAN_SURAHS,
  SURAH_TRACKS,
  SURAH_TRACK_ID_PREFIX,
  QURAN_JUZ,
  QURAN_TRACKS,
  type QuranSurah,
  type QuranJuz,
  type RevelationType,
  isSurahTrackId,
  isQuranTrackId,
  isQuranTrack,
  getSurahByTrackId,
  getQuranJuzByTrackId,
  getSurahTracksForReciter,
  getRandomSurahTrack,
  quranSurahToTrack,
  quranPlayerSubtitle,
  quranContentLabel,
  quranImageUrl,
  surahAudioUrl,
} from "./quran";
export {
  QURAN_RECITERS,
  getDefaultReciter,
  getReciterById,
  resolveActiveReciter,
  reciterHasWordTiming,
  buildReciterSurahUrl,
  RECITER_STORAGE_KEY,
  type QuranReciter,
} from "./quranReciters";
export {
  PRELUDE_AUDIO,
  getSurahPreludeConfig,
  getReciterAyah1TrimOffset,
  type SurahPreludeConfig,
} from "./surahTrimming";

/*
 * ─────────────────────────────────────────────────────────────────────────
 *  DATA SERVICE
 *
 *  A single, UI-facing data API. Today it is backed by in-memory seed data.
 *  To go live, implement the same functions against Supabase (see the
 *  `supabase` branch stubs / TODOs) and flip NEXT_PUBLIC_DATA_SOURCE=supabase.
 *  The UI imports ONLY from this module — never from `seed` directly — so the
 *  storage backend can change without touching components or pages.
 * ─────────────────────────────────────────────────────────────────────────
 */

const USE_SUPABASE = process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase";

// ── helpers ────────────────────────────────────────────────────────────────

function speakerById(id: string): Speaker {
  const s = seedSpeakers.find((x) => x.id === id);
  if (s) return s;
  // Defensive fallback so a bad relation never crashes the UI.
  return {
    id,
    name: "Unknown Speaker",
    slug: "unknown",
    bio: "",
    profileImageUrl: null,
    isActive: false,
    createdAt: new Date(0).toISOString(),
  };
}

function categoryById(id: string): Category {
  const c = seedCategories.find((x) => x.id === id);
  if (c) return c;
  return {
    id,
    name: "Uncategorised",
    slug: "uncategorised",
    description: "",
    icon: "mic",
    coverImageUrl: null,
    sortOrder: 999,
    isActive: false,
    createdAt: new Date(0).toISOString(),
  };
}

function enrich(b: Bayan): BayanWithRelations {
  return { ...b, speaker: speakerById(b.speakerId), category: categoryById(b.categoryId) };
}

function publishedOnly(list: Bayan[]): Bayan[] {
  return list.filter((b) => b.isPublished);
}

function sortBayan(list: BayanWithRelations[], sort: BayanSort): BayanWithRelations[] {
  const copy = [...list];
  switch (sort) {
    case "popular":
      return copy.sort((a, b) => b.playCount - a.playCount);
    case "duration":
      return copy.sort((a, b) => a.durationSeconds - b.durationSeconds);
    case "latest":
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.createdAt).getTime() -
          new Date(a.publishedAt ?? a.createdAt).getTime()
      );
  }
}

function countForCategory(categoryId: string): number {
  return publishedOnly(seedBayan).filter((b) => b.categoryId === categoryId).length;
}

function countForSpeaker(speakerId: string): number {
  return publishedOnly(seedBayan).filter((b) => b.speakerId === speakerId).length;
}

// Simulate async so the call sites are already Promise-based for Supabase.
async function resolve<T>(value: T): Promise<T> {
  return value;
}

// ── Bayan ────────────────────────────────────────────────────────────────

export async function getAllBayan(sort: BayanSort = "latest"): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAllBayan");
  return resolve(sortBayan(publishedOnly(seedBayan).map(enrich), sort));
}

export async function getBayanBySlug(slug: string): Promise<BayanWithRelations | null> {
  if (USE_SUPABASE) return supabaseNotImplemented("getBayanBySlug");
  const b = seedBayan.find((x) => x.slug === slug && x.isPublished);
  return resolve(b ? enrich(b) : null);
}

export async function getFeaturedBayan(limit = 6): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getFeaturedBayan");
  const featured = publishedOnly(seedBayan).filter((b) => b.isFeatured);
  return resolve(sortBayan(featured.map(enrich), "latest").slice(0, limit));
}

export async function getPopularBayan(limit = 8): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getPopularBayan");
  return resolve(sortBayan(publishedOnly(seedBayan).map(enrich), "popular").slice(0, limit));
}

export async function getLatestBayan(limit = 8): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getLatestBayan");
  return resolve(sortBayan(publishedOnly(seedBayan).map(enrich), "latest").slice(0, limit));
}

export async function getBayanByCategory(
  categorySlug: string,
  sort: BayanSort = "latest"
): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getBayanByCategory");
  const cat = seedCategories.find((c) => c.slug === categorySlug);
  if (!cat) return resolve([]);
  const list = publishedOnly(seedBayan)
    .filter((b) => b.categoryId === cat.id)
    .map(enrich);
  return resolve(sortBayan(list, sort));
}

export async function getBayanBySpeaker(
  speakerSlug: string,
  sort: BayanSort = "latest"
): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getBayanBySpeaker");
  const spk = seedSpeakers.find((s) => s.slug === speakerSlug);
  if (!spk) return resolve([]);
  const list = publishedOnly(seedBayan)
    .filter((b) => b.speakerId === spk.id)
    .map(enrich);
  return resolve(sortBayan(list, sort));
}

export async function searchBayan(query: string): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("searchBayan");
  const q = query.trim().toLowerCase();
  if (!q) return resolve([]);
  const list = publishedOnly(seedBayan)
    .map(enrich)
    .filter((b) => {
      const haystack = [
        b.title,
        b.description,
        b.speaker.name,
        b.category.name,
        b.category.nameTa ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  return resolve(sortBayan(list, "popular"));
}

export async function getRandomBayan(): Promise<BayanWithRelations | null> {
  if (USE_SUPABASE) return supabaseNotImplemented("getRandomBayan");
  const list = publishedOnly(seedBayan);
  if (list.length === 0) return resolve(null);
  const pick = list[Math.floor(Math.random() * list.length)];
  return resolve(enrich(pick));
}

/** All published slugs — used for sitemap + static params. */
export async function getAllBayanSlugs(): Promise<string[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAllBayanSlugs");
  return resolve(publishedOnly(seedBayan).map((b) => b.slug));
}

/**
 * Record a play. In demo mode this is a no-op returning the new (fake) count.
 * With Supabase: increment bayan.play_count and insert a bayan_plays row.
 */
export async function incrementPlayCount(
  bayanId: string,
  _sessionId?: string
): Promise<void> {
  if (USE_SUPABASE) {
    // TODO(supabase): rpc('increment_play_count', { bayan_id: bayanId, session: _sessionId }).
    return;
  }
  const b = seedBayan.find((x) => x.id === bayanId);
  if (b) b.playCount += 1; // in-memory only; resets on reload in demo mode
}

// ── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getCategories");
  return resolve(
    seedCategories
      .filter((c) => c.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({ ...c, bayanCount: countForCategory(c.id) }))
  );
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  if (USE_SUPABASE) return supabaseNotImplemented("getCategoryBySlug");
  const c = seedCategories.find((x) => x.slug === slug && x.isActive);
  return resolve(c ? { ...c, bayanCount: countForCategory(c.id) } : null);
}

export async function getAllCategorySlugs(): Promise<string[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAllCategorySlugs");
  return resolve(seedCategories.filter((c) => c.isActive).map((c) => c.slug));
}

// ── Speakers ───────────────────────────────────────────────────────────────

export async function getSpeakers(): Promise<Speaker[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getSpeakers");
  return resolve(
    seedSpeakers
      .filter((s) => s.isActive)
      .map((s) => ({ ...s, bayanCount: countForSpeaker(s.id) }))
      .sort((a, b) => (b.bayanCount ?? 0) - (a.bayanCount ?? 0))
  );
}

export async function getSpeakerBySlug(slug: string): Promise<Speaker | null> {
  if (USE_SUPABASE) return supabaseNotImplemented("getSpeakerBySlug");
  const s = seedSpeakers.find((x) => x.slug === slug && x.isActive);
  return resolve(s ? { ...s, bayanCount: countForSpeaker(s.id) } : null);
}

export async function getAllSpeakerSlugs(): Promise<string[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAllSpeakerSlugs");
  return resolve(seedSpeakers.filter((s) => s.isActive).map((s) => s.slug));
}

// ── Admin (includes unpublished; requires admin auth in production) ─────────

export async function getAdminBayan(): Promise<BayanWithRelations[]> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAdminBayan");
  return resolve(
    [...seedBayan]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map(enrich)
  );
}

export async function getAdminBayanById(
  id: string
): Promise<BayanWithRelations | null> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAdminBayanById");
  const b = seedBayan.find((x) => x.id === id);
  return resolve(b ? enrich(b) : null);
}

export interface AdminStats {
  totalBayan: number;
  publishedBayan: number;
  draftBayan: number;
  featuredBayan: number;
  totalCategories: number;
  totalSpeakers: number;
  totalPlays: number;
  localCount: number;
  youtubeCount: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  if (USE_SUPABASE) return supabaseNotImplemented("getAdminStats");
  return resolve({
    totalBayan: seedBayan.length,
    publishedBayan: seedBayan.filter((b) => b.isPublished).length,
    draftBayan: seedBayan.filter((b) => !b.isPublished).length,
    featuredBayan: seedBayan.filter((b) => b.isFeatured).length,
    totalCategories: seedCategories.filter((c) => c.isActive).length,
    totalSpeakers: seedSpeakers.filter((s) => s.isActive).length,
    totalPlays: seedBayan.reduce((sum, b) => sum + b.playCount, 0),
    localCount: seedBayan.filter((b) => b.audioSource === "local").length,
    youtubeCount: seedBayan.filter((b) => b.audioSource === "youtube").length,
  });
}

/** Whether write operations are backed by a real database yet. */
export const isWriteEnabled = USE_SUPABASE;

// ── Quran & Surah Services (Single Source of Truth) ────────────────────────

export {
  QURAN_SURAHS,
  SURAH_TRACKS,
  SURAH_TRACK_ID_PREFIX,
  QURAN_JUZ,
  QURAN_TRACKS,
  isSurahTrackId,
  isQuranTrackId,
  isQuranTrack,
  getSurahByTrackId,
  getQuranJuzByTrackId,
  getRandomSurahTrack,
  getSurahTracksForReciter,
  quranSurahToTrack,
  quranPlayerSubtitle,
  quranContentLabel,
  quranImageUrl,
  surahAudioUrl,
};
export {
  QURAN_ARTWORK_CONCEPTS,
  getSurahArtwork,
  type SurahArtworkConcept,
} from "./quran-artwork";
export type { QuranSurah, QuranJuz, RevelationType };

export async function getSurahs(): Promise<QuranSurah[]> {
  return resolve(QURAN_SURAHS);
}

export async function getSurahByNumber(num: number): Promise<QuranSurah | null> {
  const s = QURAN_SURAHS.find((x) => x.number === num);
  return resolve(s ?? null);
}

export async function getRandomSurah(excludeNumber?: number): Promise<QuranSurah> {
  const pool = excludeNumber
    ? QURAN_SURAHS.filter((s) => s.number !== excludeNumber)
    : QURAN_SURAHS;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return resolve(pick);
}

export async function getSurahTracks(): Promise<BayanWithRelations[]> {
  return resolve(SURAH_TRACKS);
}

export async function getQuranJuzList(): Promise<QuranJuz[]> {
  return resolve(QURAN_JUZ);
}

export async function getQuranJuzTracks(): Promise<BayanWithRelations[]> {
  return resolve(QURAN_TRACKS);
}

// ── Supabase guard ───────────────────────────────────────────────────────

function supabaseNotImplemented(fn: string): never {
  // Intentional: reaching here means NEXT_PUBLIC_DATA_SOURCE=supabase but the
  // Supabase-backed implementation for `fn` hasn't been wired yet. See
  // src/lib/supabase/queries.ts for where to implement these.
  throw new Error(
    `[data-service] "${fn}" is not implemented for the Supabase backend yet. ` +
      `Implement it in src/lib/supabase/queries.ts, or set NEXT_PUBLIC_DATA_SOURCE=seed.`
  );
}
