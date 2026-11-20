import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ChevronRightIcon } from "@/components/ui/Icon";
import { famousAyatStartingAt } from "@/lib/data/famousAyat";
import { QURAN_SURAHS } from "@/lib/data/quran";
import { SURAH_NAMES } from "@/lib/data/surahNames";
import { parseSurahLink } from "@/lib/deepLink";
import { readSurahText } from "@/lib/surahText";
import { absoluteUrl, notFoundMetadata, shareMetadata, siteConfig } from "@/lib/site";

/*
 * A plain, scrollable reading page per Surah: the Arabic text with its Tamil
 * and English meaning, built at deploy time. It is what search engines index
 * for the Surah's text (the app at /surah/36 loads the ayat in the browser);
 * every ayah links back into the app to listen from there.
 */

type Props = { params: Promise<{ surah: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => ({ surah: String(i + 1) }));
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function surahInfo(n: number) {
  const s = QURAN_SURAHS[n - 1];
  const [, meaning, tamil] = SURAH_NAMES[n - 1];
  return { s, meaning, tamil };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const link = parseSurahLink((await params).surah);
  if (!link || link.kind !== "surah") return notFoundMetadata;
  const { s, meaning, tamil } = surahInfo(link.surah);
  const title = `Surah ${s.name} (${s.arabicName}) Text · Arabic, Tamil & English Translation`;
  const description = `Read the full text of Surah ${s.name} (${s.arabicName}, ${tamil}) — "${meaning}", Surah ${link.surah}, ${s.verses} verses — in Arabic with Tamil (Jan Trust) and English (Saheeh International) translation. Listen to every ayah on HuDa Guidance.`;
  const url = absoluteUrl(`/surah/${link.surah}/read`);
  return {
    title,
    description,
    alternates: { canonical: url },
    ...shareMetadata({ title: `Surah ${s.name} (${s.arabicName}) · Read`, description, url }),
  };
}

export default async function SurahReadPage({ params }: Props) {
  const link = parseSurahLink((await params).surah);
  if (!link || link.kind !== "surah") notFound();
  const n = link.surah;
  const { s, meaning, tamil } = surahInfo(n);
  const ayat = await readSurahText(n);
  const prev = n > 1 ? surahInfo(n - 1).s : null;
  const next = n < 114 ? surahInfo(n + 1).s : null;
  const appUrl = `/surah/${n}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteConfig.fullName, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: `Surah ${s.name}`, item: absoluteUrl(appUrl) },
      { "@type": "ListItem", position: 3, name: "Read", item: absoluteUrl(`/surah/${n}/read`) },
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
          <Link href={appUrl} className="hover:underline">Surah {s.name}</Link>
        </nav>
      </header>

      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="border-b border-[rgb(var(--foreground)/0.12)] pb-6 pt-4 text-center">
          <p dir="rtl" lang="ar" className="font-arabic text-4xl leading-relaxed text-gold-600 dark:text-gold-400">
            {s.arabicName}
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Surah {s.name}</h1>
          <p className="mt-1 text-muted">
            {meaning} · <span className="font-tamil">{tamil}</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            Surah {n} · {s.verses} verses · {s.revelation}
          </p>
          <Link
            href={appUrl}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-primary-700 px-6 font-semibold text-sand-50 hover:bg-primary-600"
          >
            Listen in HuDa · <span className="font-tamil ml-1">கேளுங்கள்</span>
          </Link>
        </div>

        {n !== 1 && n !== 9 && (
          <p dir="rtl" lang="ar" className="font-arabic py-6 text-center text-2xl leading-loose">
            {BISMILLAH}
          </p>
        )}

        <ol className="divide-y divide-[rgb(var(--foreground)/0.1)]">
          {ayat.map((a) => (
            <li key={a.ayah} id={`ayah-${a.ayah}`} className="scroll-mt-4 py-6">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-primary-700 dark:text-primary-300">
                  {n}:{a.ayah}
                </span>
                <Link
                  href={a.ayah > 1 ? `/surah/${n}/${a.ayah}` : appUrl}
                  className="text-muted hover:text-[rgb(var(--foreground))] hover:underline"
                  aria-label={`Listen from verse ${n}:${a.ayah}`}
                >
                  <span className="inline-flex items-center gap-0.5">Listen <ChevronRightIcon className="h-3.5 w-3.5" /></span>
                </Link>
              </div>
              {famousAyatStartingAt(n, a.ayah).map((f) => (
                <Link
                  key={f.slug}
                  href={`/ayah/${f.slug}`}
                  className="mb-3 mr-2 inline-flex items-center gap-0.5 rounded-full bg-gold-500/15 px-3 py-1 text-sm font-semibold text-gold-600 hover:underline dark:text-gold-300"
                >
                  {f.name} <ChevronRightIcon className="h-3.5 w-3.5" />
                </Link>
              ))}
              <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2.2] sm:text-3xl">
                {a.arabic}
              </p>
              <p lang="ta" className="font-tamil mt-4 leading-relaxed">
                {a.tamil}
              </p>
              <p lang="en" className="mt-2 leading-relaxed text-muted">
                {a.english}
              </p>
            </li>
          ))}
        </ol>

        <nav aria-label="Other Surahs" className="mt-8 flex items-center justify-between gap-3 text-sm">
          {prev ? (
            <Link href={`/surah/${n - 1}/read`} className="hover:underline">
              ‹ Surah {prev.name}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/surah/${n + 1}/read`} className="hover:underline">
              Surah {next.name} ›
            </Link>
          ) : <span />}
        </nav>

        <p className="mt-10 text-center text-xs text-muted">
          Tamil: Jan Trust Foundation · English: Saheeh International
        </p>
      </article>
    </div>
  );
}
