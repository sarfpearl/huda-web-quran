/**
 * Where each quarter of a Juz starts — the margin marks الربع (¼), النصف (½,
 * "an-Nisf") and الثلاثة (¾) — so a Juz half read at home can be picked up
 * from its middle elsewhere (owner's family, 2026-11-28).
 *
 * A Juz is 2 Hizb of 4 Rubʿ al-Hizb each (۞, 240 in all, Madani count); its
 * ¼ / ½ / ¾ are the starts of its 3rd, 5th and 7th Rubʿ. Taken from the
 * Quran.com API (/api/v4/rub_el_hizbs) on 2026-11-28.
 */
export type AyahRef = [surah: number, ayah: number];

export const JUZ_QUARTERS: ReadonlyArray<readonly [AyahRef, AyahRef, AyahRef]> = [
  [[2, 44], [2, 75], [2, 106]], // Juz 1
  [[2, 177], [2, 203], [2, 233]], // Juz 2
  [[2, 272], [3, 15], [3, 52]], // Juz 3
  [[3, 133], [3, 171], [4, 1]], // Juz 4
  [[4, 58], [4, 88], [4, 114]], // Juz 5
  [[5, 1], [5, 27], [5, 51]], // Juz 6
  [[5, 109], [6, 36], [6, 74]], // Juz 7
  [[6, 141], [7, 1], [7, 47]], // Juz 8
  [[7, 142], [7, 171], [8, 1]], // Juz 9
  [[9, 1], [9, 34], [9, 60]], // Juz 10
  [[9, 122], [10, 26], [10, 71]], // Juz 11
  [[11, 41], [11, 84], [12, 7]], // Juz 12
  [[12, 101], [13, 19], [14, 10]], // Juz 13
  [[16, 1], [16, 51], [16, 90]], // Juz 14
  [[17, 50], [17, 99], [18, 32]], // Juz 15
  [[19, 22], [20, 1], [20, 83]], // Juz 16
  [[21, 51], [22, 1], [22, 38]], // Juz 17
  [[23, 75], [24, 21], [24, 53]], // Juz 18
  [[26, 1], [26, 111], [27, 1]], // Juz 19
  [[28, 12], [28, 51], [29, 1]], // Juz 20
  [[30, 31], [31, 22], [33, 1]], // Juz 21
  [[33, 60], [34, 24], [35, 15]], // Juz 22
  [[37, 22], [37, 145], [38, 52]], // Juz 23
  [[40, 1], [40, 41], [41, 9]], // Juz 24
  [[42, 27], [43, 24], [44, 17]], // Juz 25
  [[47, 10], [48, 18], [49, 14]], // Juz 26
  [[53, 26], [55, 1], [56, 75]], // Juz 27
  [[59, 11], [62, 1], [65, 1]], // Juz 28
  [[69, 1], [72, 1], [75, 1]], // Juz 29
  [[82, 1], [87, 1], [94, 1]], // Juz 30
];

/** ¼, ½, ¾ of a Juz (1–30): [surah, ayah] each. */
export function juzQuarters(juz: number): readonly [AyahRef, AyahRef, AyahRef] | undefined {
  return JUZ_QUARTERS[juz - 1];
}
