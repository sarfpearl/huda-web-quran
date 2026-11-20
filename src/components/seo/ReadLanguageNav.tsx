import Link from "next/link";
import { READ_LANGUAGES } from "@/lib/readLanguages";

/** Links to a Surah's reading page in every meaning language (server-only: reads translations.ts). */
export function ReadLanguageNav({ surah, current }: { surah: number; current?: string }) {
  return (
    <nav aria-label="Languages" className="mt-8 flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm" dir="ltr">
      {READ_LANGUAGES.map((l) =>
        l.id === current ? (
          <span key={l.id} lang={l.id} aria-current="page" className="font-semibold" style={l.font ? { fontFamily: l.font } : undefined}>
            {l.label}
          </span>
        ) : (
          <Link
            key={l.id}
            href={`/surah/${surah}/read/${l.id}`}
            hrefLang={l.id}
            lang={l.id}
            className="text-muted hover:text-[rgb(var(--foreground))] hover:underline"
            style={l.font ? { fontFamily: l.font } : undefined}
          >
            {l.label}
          </Link>
        ),
      )}
    </nav>
  );
}
