import { SURAH_NAMES } from "./surahNames";

// Surah search that forgives how a name is typed: "yasin" finds "Ya-Sin",
// "taha" "Ta-Ha", "ali imran" "Aal-Imran", "alfatiha" "Al-Fatihah". It also
// finds the English meaning ("the cow"), the Tamil name (யாஸீன்) and the
// Arabic name with or without its vowel marks.

/** Latin: lowercase, no accents, letters and digits only, no doubled letters. */
const latin = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(.)\1+/g, "$1");

/** Arabic: no vowel / Quranic marks, tatweel or dagger alif; one alif; ى = ي. */
const arabic = (t: string) =>
  t
    .normalize("NFC")
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[ٱآأإ]/g, "ا")
    .replace(/[ىی]/g, "ي")
    .replace(/\s+/g, "");

/** Tamil: no hyphens or spaces. */
const tamil = (t: string) => t.replace(/[\s-]/g, "");

interface SurahLike {
  number: number;
  name: string;
  arabicName: string;
  theme: string;
}

const keys = new Map<number, { latin: string; arabic: string; tamil: string }>();
function keyOf(s: SurahLike) {
  let k = keys.get(s.number);
  if (!k) {
    const [ar, meaning, ta] = SURAH_NAMES[s.number - 1] ?? ["", "", ""];
    k = {
      latin: `${latin(s.name)} ${latin(meaning)}`,
      arabic: `${arabic(s.arabicName)} ${arabic(ar)}`,
      tamil: tamil(ta),
    };
    keys.set(s.number, k);
  }
  return k;
}

/** Whether a Surah matches the search box text (empty matches all). */
export function surahMatches(s: SurahLike, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(s.number).includes(q);
  const k = keyOf(s);
  const l = latin(q);
  const a = arabic(q);
  const t = tamil(q);
  return (
    (l.length > 0 && k.latin.includes(l)) ||
    (a.length > 0 && /[؀-ۿ]/.test(a) && k.arabic.includes(a)) ||
    (/[஀-௿]/.test(t) && k.tamil.includes(t)) ||
    (q.length >= 3 && s.theme.toLowerCase().includes(q.toLowerCase()))
  );
}

/** Matching Surahs, the one whose number was typed exactly first. */
export function searchSurahs<T extends SurahLike>(surahs: readonly T[], query: string): T[] {
  const q = query.trim();
  const hits = surahs.filter((s) => surahMatches(s, q));
  if (!/^\d+$/.test(q)) return hits;
  return [...hits.filter((s) => s.number === +q), ...hits.filter((s) => s.number !== +q)];
}
