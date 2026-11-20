import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { ReadLanguageNav } from "@/components/seo/ReadLanguageNav";
import { QURAN_SURAHS } from "@/lib/data/quran";
import { parseSurahLink } from "@/lib/deepLink";
import {
  OG_LOCALE,
  READ_LANGUAGES,
  hasMeaningAudioAnyVoice,
  readAlternateLanguages,
  readCopy,
  readLanguage,
  readSurahInLanguage,
  surahNameIn,
  translatorOf,
} from "@/lib/readLanguages";
import { absoluteUrl, notFoundMetadata, shareMetadata, siteConfig } from "@/lib/site";

/*
 * A Surah's reading page in one meaning language: the Arabic text with that
 * language's translation, its title and headings in the language's own script,
 * built at deploy time — what search engines index for "Surah Ya-Sin in
 * Malayalam" and the like. Every ayah links back into the app to listen.
 * The languages come from translations.ts (see src/lib/readLanguages.ts).
 */

type Props = { params: Promise<{ surah: string; lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: 114 }, (_, i) => READ_LANGUAGES.map((l) => ({ surah: String(i + 1), lang: l.id }))).flat();
}

const BISMILLAH = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function pageInfo(n: number, langId: string) {
  const l = readLanguage(langId);
  if (!l) return null;
  const s = QURAN_SURAHS[n - 1];
  const copy = readCopy(l);
  const { name, meaning } = surahNameIn(l.id, n);
  const audio = hasMeaningAudioAnyVoice(l.id, n);
  const surahPhrase = copy.surah(name);
  const title = `${surahPhrase} (${s.arabicName}) — ${copy.translation}${audio ? ` · ${copy.audio}` : ""}`;
  const description = copy.description({
    surah: surahPhrase,
    arabicName: s.arabicName,
    n,
    verses: s.verses,
    translator: translatorOf(l),
    audio,
  });
  return { l, s, copy, name, meaning, audio, surahPhrase, title, description };
}

async function resolve(params: Props["params"]) {
  const p = await params;
  const link = parseSurahLink(p.surah);
  if (!link || link.kind !== "surah") return null;
  const info = pageInfo(link.surah, p.lang);
  return info ? { n: link.surah, ...info } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) return notFoundMetadata;
  const url = absoluteUrl(`/surah/${r.n}/read/${r.l.id}`);
  const share = shareMetadata({ title: r.title, description: r.description, url });
  return {
    // The language's own title, without the English site suffix.
    title: { absolute: `${r.title} · ${siteConfig.name}` },
    description: r.description,
    alternates: { canonical: url, languages: readAlternateLanguages(r.n, absoluteUrl) },
    ...share,
    openGraph: { ...share.openGraph, locale: OG_LOCALE[r.l.id] ?? share.openGraph.locale },
  };
}

export default async function SurahReadLanguagePage({ params }: Props) {
  const r = await resolve(params);
  if (!r) notFound();
  const { n, l, s, copy, name, meaning, audio, surahPhrase } = r;
  const ayat = await readSurahInLanguage(n, l.id);
  const prev = n > 1 ? surahNameIn(l.id, n - 1).name : null;
  const next = n < 114 ? surahNameIn(l.id, n + 1).name : null;
  const appUrl = `/surah/${n}`;
  const pageUrl = `/surah/${n}/read/${l.id}`;
  const meaningStyle = l.font ? { fontFamily: l.font } : undefined;
  const rtl = l.dir === "rtl";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: siteConfig.fullName, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: `Surah ${s.name}`, item: absoluteUrl(appUrl) },
      { "@type": "ListItem", position: 3, name: surahPhrase, item: absoluteUrl(pageUrl) },
    ],
  };

  return (
    <div
      data-reading-page
      lang={l.id}
      dir={l.dir}
      className="min-h-[100dvh] overflow-x-hidden bg-[rgb(var(--background))] pb-16 text-[rgb(var(--foreground))] select-text"
    >
      <JsonLd data={jsonLd} />
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold" lang="en" dir="ltr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon-96.png" alt="" width={36} height={36} className="h-9 w-9" />
          <span>{siteConfig.name}</span>
        </Link>
        <Link href={appUrl} className="text-sm text-muted hover:underline" style={meaningStyle}>
          {surahPhrase}
        </Link>
      </header>

      <article className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="border-b border-[rgb(var(--foreground)/0.12)] pb-6 pt-4 text-center">
          <p dir="rtl" lang="ar" className="font-arabic text-4xl leading-relaxed text-gold-600 dark:text-gold-400">
            {s.arabicName}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl" style={meaningStyle}>
            {surahPhrase} — {copy.translation}
          </h1>
          {(meaning || l.id !== "en") && (
            <p className="mt-1 text-muted" style={meaningStyle}>
              {meaning ?? ""}
              {meaning && " · "}
              <span lang="en" dir="ltr">Surah {s.name}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-muted" style={meaningStyle}>
            {n} · {s.verses} {copy.verses} · {s.revelation === "Medinan" ? copy.medinan : copy.meccan}
            {audio && <> · {copy.audio}</>}
          </p>
          <Link
            href={appUrl}
            className="mt-5 inline-flex h-11 items-center rounded-full bg-primary-700 px-6 font-semibold text-sand-50 hover:bg-primary-600"
            style={meaningStyle}
          >
            {copy.listenInApp}
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
                <span className="font-semibold text-primary-700 dark:text-primary-300" dir="ltr">
                  {n}:{a.ayah}
                </span>
                <Link
                  href={a.ayah > 1 ? `/surah/${n}/${a.ayah}` : appUrl}
                  className="text-muted hover:text-[rgb(var(--foreground))] hover:underline"
                  style={meaningStyle}
                  aria-label={`${copy.listen} ${n}:${a.ayah}`}
                >
                  {copy.listen} {rtl ? "◂" : "▸"}
                </Link>
              </div>
              <p dir="rtl" lang="ar" className="font-arabic text-right text-2xl leading-[2.2] sm:text-3xl">
                {a.arabic}
              </p>
              <p
                className={`mt-4 break-words ${rtl ? "text-right text-lg leading-[2.4]" : "leading-relaxed"}`}
                style={meaningStyle}
              >
                {a.meaning}
              </p>
            </li>
          ))}
        </ol>

        <nav aria-label="Other Surahs" className="mt-8 flex items-center justify-between gap-3 text-sm" style={meaningStyle}>
          {prev ? (
            <Link href={`/surah/${n - 1}/read/${l.id}`} className="hover:underline">
              {rtl ? "›" : "‹"} {copy.surah(prev)}
            </Link>
          ) : <span />}
          {next ? (
            <Link href={`/surah/${n + 1}/read/${l.id}`} className="hover:underline">
              {copy.surah(next)} {rtl ? "‹" : "›"}
            </Link>
          ) : <span />}
        </nav>

        <ReadLanguageNav surah={n} current={l.id} />

        <p className="mt-6 text-center text-xs text-muted" style={meaningStyle}>
          {copy.translationBy}: <span dir="auto">{translatorOf(l)}</span>
        </p>
      </article>
    </div>
  );
}
