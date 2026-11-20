import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { QURAN_SURAHS } from "@/lib/data/quran";
import { SURAH_NAMES } from "@/lib/data/surahNames";
import { FAMOUS_AYAT, famousAyahBySlug, famousAyahRef, type FamousAyah } from "@/lib/data/famousAyat";
import { readSurahText } from "@/lib/surahText";
import { absoluteUrl, notFoundMetadata, shareMetadata, siteConfig } from "@/lib/site";

/*
 * A reading page per well-known ayah or short passage (Ayat al-Kursi, the
 * last two ayat of Al-Baqarah, the Quls…), for people who search it by name.
 * Same look as /surah/<n>/read: Arabic with Tamil and English meaning, built
 * at deploy time, with a link into the app to listen.
 */

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return FAMOUS_AYAT.map((a) => ({ slug: a.slug }));
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

function passageInfo(a: FamousAyah) {
  const s = QURAN_SURAHS[a.surah - 1];
  const [, meaning, surahTamil] = SURAH_NAMES[a.surah - 1];
  const wholeSurah = a.from === 1 && a.to === s.verses;
  const verses = a.from === a.to ? `verse ${a.from}` : `verses ${a.from}–${a.to}`;
  const tamilVerses = a.from === a.to ? `வசனம் ${a.from}` : `வசனங்கள் ${a.from}–${a.to}`;
  return { s, meaning, surahTamil, wholeSurah, verses, tamilVerses };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = famousAyahBySlug((await params).slug);
  if (!a) return notFoundMetadata;
  const { s, surahTamil, wholeSurah, verses } = passageInfo(a);
  const ref = famousAyahRef(a);
  const title = `${a.name} (${ref}) · Arabic, Tamil & English, Audio`;
  const where = wholeSurah ? `Surah ${a.surah} of the Quran, ${s.verses} verses` : `Surah ${s.name} (${surahTamil}) ${verses}`;
  const description = `${a.name} (${a.tamil}) — ${where}. Arabic text with Tamil (Jan Trust) and English (Saheeh International) translation; listen on HuDa Guidance. Also known as ${a.aka.join(", ")}.`;
  const url = absoluteUrl(`/ayah/${a.slug}`);
  return {
    title,
    description,
    keywords: [a.name, a.tamil, ...a.aka, `Quran ${ref}`],
    alternates: { canonical: url },
    ...shareMetadata({ title: `${a.name} (${ref})`, description, url }),
  };
}

export default async function FamousAyahPage({ params }: Props) {
  const a = famousAyahBySlug((await params).slug);
  if (!a) notFound();
  const { s, meaning, surahTamil, wholeSurah, verses, tamilVerses } = passageInfo(a);
  const ref = famousAyahRef(a);
  const ayat = (await readSurahText(a.surah)).filter((x) => x.ayah >= a.from && x.ayah <= a.to);
  const listenUrl = a.from > 1 ? `/surah/${a.surah}/${a.from}` : `/surah/${a.surah}`;
  const readUrl = `/surah/${a.surah}/read`;
  const others = FAMOUS_AYAT.filter((o) => o.slug !== a.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteConfig.fullName, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: `Surah ${s.name}`, item: absoluteUrl(readUrl) },
      { "@type": "ListItem", position: 3, name: a.name, item: absoluteUrl(`/ayah/${a.slug}`) },
    ],
  };

  return (
    <div
      data-reading-page
      className="min-h-[100dvh] bg-[rgb(var(--background))] pb-16 text-[rgb(var(--foreground))] select-text"
    >
      <JsonLd data={jsonLd} />
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon-96.png" alt="" width={36} height={36} className="h-9 w-9" />
          <span>{siteConfig.name}</span>
        </Link>
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden> › </span>
          <Link href={readUrl} className="hover:underline">Surah {s.name}</Link>
        </nav>
      </header>

      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="border-b border-[rgb(var(--foreground)/0.12)] pb-6 pt-4 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl">{a.name}</h1>
          <p className="font-tamil mt-1 text-lg text-gold-600 dark:text-gold-400">{a.tamil}</p>
          <p className="mt-2 text-sm text-muted">
            Quran {ref} · Surah {s.name} ({s.arabicName})
          </p>
          <Link
            href={listenUrl}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-primary-700 px-6 font-semibold text-sand-50 hover:bg-primary-600"
          >
            Listen in HuDa · <span className="font-tamil ml-1">கேளுங்கள்</span>
          </Link>
        </div>

        {wholeSurah && a.surah !== 1 && a.surah !== 9 && (
          <p dir="rtl" lang="ar" className="font-arabic py-6 text-center text-2xl leading-loose">
            {BISMILLAH}
          </p>
        )}

        <ol className="divide-y divide-[rgb(var(--foreground)/0.1)]">
          {ayat.map((x) => (
            <li key={x.ayah} id={`ayah-${x.ayah}`} className="py-6">
              <div className="mb-3 text-sm font-semibold text-primary-700 dark:text-primary-300">
                {a.surah}:{x.ayah}
              </div>
              <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2.2] sm:text-3xl">
                {x.arabic}
              </p>
              <p lang="ta" className="font-tamil mt-4 leading-relaxed">
                {x.tamil}
              </p>
              <p lang="en" className="mt-2 leading-relaxed text-muted">
                {x.english}
              </p>
            </li>
          ))}
        </ol>

        <section className="mt-6 rounded-2xl bg-[rgb(var(--foreground)/0.04)] p-5 text-sm leading-relaxed">
          <h2 className="mb-2 font-semibold">Where it is in the Quran</h2>
          <p>
            {wholeSurah
              ? `Surah ${s.name} (${s.arabicName}, “${meaning}”) is the ${ordinal(a.surah)} Surah of the Quran, with ${s.verses} verses (${s.revelation}).`
              : `${a.name} is ${verses} of Surah ${s.name} (${s.arabicName}, “${meaning}”), the ${ordinal(a.surah)} Surah of the Quran, which has ${s.verses} verses (${s.revelation}).`}
          </p>
          <p lang="ta" className="font-tamil mt-2">
            {wholeSurah
              ? `சூரா ${a.surah} (${surahTamil}) · ${s.verses} வசனங்கள்`
              : `சூரா ${a.surah} (${surahTamil}) · ${tamilVerses}`}
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href={`${readUrl}#ayah-${a.from}`} className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
              <span className="inline-flex items-center gap-0.5">Read the full Surah {s.name} <ChevronRightIcon className="h-3.5 w-3.5" /></span>
            </Link>
            <Link href={listenUrl} className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
              <span className="inline-flex items-center gap-0.5">Listen from {a.surah}:{a.from} <ChevronRightIcon className="h-3.5 w-3.5" /></span>
            </Link>
          </p>
          <p className="mt-3 text-xs text-muted">Also searched as: {a.aka.join(" · ")}</p>
        </section>

        <nav aria-label="Other well-known ayat" className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-muted">Other well-known ayat</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {others.map((o) => (
              <li key={o.slug}>
                <Link
                  href={`/ayah/${o.slug}`}
                  className="inline-block rounded-full border border-[rgb(var(--foreground)/0.15)] px-3 py-1 hover:bg-[rgb(var(--foreground)/0.06)]"
                >
                  {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-10 text-center text-xs text-muted">
          Tamil: Jan Trust Foundation · English: Saheeh International
        </p>
      </article>
    </div>
  );
}
