import { readFile } from "node:fs/promises";
import path from "node:path";

/** One ayah as the reading page shows it (from public/data/quran-verses/<n>.json). */
export interface SurahTextAyah {
  ayah: number;
  arabic: string;
  english: string;
  tamil: string;
}

/** A Surah's Arabic text with its English (Saheeh International) and Tamil (Jan Trust) meaning, read at build time. */
export async function readSurahText(surah: number): Promise<SurahTextAyah[]> {
  const file = path.join(process.cwd(), "public", "data", "quran-verses", `${surah}.json`);
  const rows = JSON.parse(await readFile(file, "utf8")) as {
    ayahNumber: number;
    textArabic: string;
    textEnglish: string;
    textTamil: string;
  }[];
  return rows.map((r) => ({ ayah: r.ayahNumber, arabic: r.textArabic, english: r.textEnglish, tamil: r.textTamil }));
}
