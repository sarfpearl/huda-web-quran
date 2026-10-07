import type { Metadata } from "next";
import Link from "next/link";
import { notFoundMetadata } from "@/lib/site";

export const metadata: Metadata = notFoundMetadata;

// Also shown under /surah/… and /juz/… (a bad number), inside the home's
// full-screen black wrapper — so it fills the screen in its own (theme)
// colours. `data-not-found` turns the opening splash off (globals.css):
// there is nothing here to wait for.
export default function NotFound() {
  return (
    <div
      data-not-found
      className="flex min-h-[100dvh] flex-col items-center justify-center bg-[rgb(var(--background))] px-4 py-16 text-center text-[rgb(var(--foreground))] select-text"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/huda-logo.webp?v=3" alt="HuDa" width={112} height={112} className="h-28 w-28 drop-shadow-lg" />
      <p className="mt-3 text-xl font-bold tracking-[0.25em] text-gold-600 dark:text-gold-400">404</p>
      <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
      <p className="font-tamil mt-1 text-base text-muted">பக்கம் கிடைக்கவில்லை</p>
      <p className="mt-4 max-w-sm text-muted">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-full bg-primary-700 px-6 font-semibold text-sand-50 hover:bg-primary-600"
      >
        Back to Home · <span className="font-tamil ml-1">முகப்பு</span>
      </Link>
    </div>
  );
}
