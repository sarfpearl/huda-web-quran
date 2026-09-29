/**
 * The 15 ayahs of prostration (sajdat at-tilawah) marked ۩ in the Madinah
 * Mushaf, with the (0-based) words the Mushaf draws a line over. The QPC page
 * fonts draw that line themselves (those words are two glyphs: word + line);
 * the text view draws it in CSS (.quran-word--sajdah). Where the font's line
 * is on no other word, it is the ۩ word, the ayah's last.
 */
const SAJDAH_WORDS: Record<string, readonly number[]> = {
  "7:206": [10],
  "13:15": [0, 1],
  "16:50": [6],
  "17:109": [4],
  "19:58": [26, 27],
  "22:18": [4, 5],
  "22:77": [4],
  "25:60": [3],
  "27:26": [7],
  "32:15": [7, 8],
  "38:24": [29, 30],
  "41:38": [11],
  "53:62": [0, 1],
  "84:21": [5],
  "96:19": [3],
};

export const isSajdah = (surah: number | null | undefined, ayah: number | null | undefined) =>
  Boolean(surah && ayah && `${surah}:${ayah}` in SAJDAH_WORDS);

/** Is word `i` (0-based) of this ayah overlined as a Sajdah word? */
export const isSajdahWord = (surah: number | null | undefined, ayah: number | null | undefined, i: number) =>
  Boolean(surah && ayah && SAJDAH_WORDS[`${surah}:${ayah}`]?.includes(i));
