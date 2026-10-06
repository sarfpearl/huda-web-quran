import { QURAN_JUZ, QURAN_SURAHS } from "@/lib/data/quran";

/**
 * Deep links: /surah/36, /surah/36/3 (an ayah), /juz/30. They open the app on
 * that Surah / Juz; "/" still lands on Al-Fatihah. While something plays the
 * address follows it (DeepLinkSync in ImmersiveHomeClient), so a refresh or a
 * shared link comes back to the same place.
 */
export type DeepLink = { kind: "surah"; surah: number; ayah: number } | { kind: "juz"; juz: number };

const int = (s: string) => (/^\d+$/.test(s) ? Number(s) : NaN);

export function parseSurahLink(surahParam: string, ayahParam?: string): DeepLink | null {
  const surah = int(surahParam);
  const s = QURAN_SURAHS.find((x) => x.number === surah);
  if (!s) return null;
  const ayah = ayahParam === undefined ? 1 : int(ayahParam);
  if (!(ayah >= 1 && ayah <= s.verses)) return null;
  return { kind: "surah", surah, ayah };
}

export function parseJuzLink(juzParam: string): DeepLink | null {
  const juz = int(juzParam);
  return juz >= 1 && juz <= 30 ? { kind: "juz", juz } : null;
}

export function deepLinkPath(link: DeepLink): string {
  if (link.kind === "juz") return `/juz/${link.juz}`;
  return link.ayah > 1 ? `/surah/${link.surah}/${link.ayah}` : `/surah/${link.surah}`;
}

/** Page title / description for a link (metadata and share cards). */
export function deepLinkMeta(link: DeepLink): { title: string; description: string } {
  if (link.kind === "juz") {
    const j = QURAN_JUZ[link.juz - 1];
    return {
      title: `Juz ${link.juz} · ${j.title}`,
      description: `Listen to Juz ${link.juz} (${j.title}) of the Holy Quran, recited ayah by ayah with word-by-word highlighting.`,
    };
  }
  const s = QURAN_SURAHS[link.surah - 1];
  const where = link.ayah > 1 ? `Surah ${s.name} ${link.surah}:${link.ayah}` : `Surah ${s.name}`;
  return {
    title: link.ayah > 1 ? `${s.name} ${link.surah}:${link.ayah}` : `${s.name} (${s.arabicName}) · Surah ${link.surah}`,
    description: `Read and listen to ${where} (${s.arabicName}) — ${s.verses} verses, ${s.revelation} — with word-by-word sync, Tajweed colours and translations.`,
  };
}
