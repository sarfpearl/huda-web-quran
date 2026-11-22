import type { Metadata } from "next";
import Link from "next/link";
import { shareMetadata, siteConfig } from "@/lib/site";

const title = "Privacy policy";
const description = "What HuDa Web Quran stores, what it never stores, and how to delete your account.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  ...shareMetadata({ title: `${title} · ${siteConfig.name}`, description, url: `${siteConfig.url}/privacy` }),
};

/*
 * /privacy: plain-words privacy policy (needed before login: Google's OAuth
 * consent screen, Apple and the App Store ask for it). English first, Tamil
 * after. Keep it in step with docs/LOGIN_STRATEGY.md §4 / §7.3.
 */

const UPDATED = "22 November 2026";

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold">{heading}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main
      data-not-found
      className="min-h-[100dvh] bg-[rgb(var(--background))] px-4 py-12 text-[rgb(var(--foreground))] select-text"
    >
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/huda-logo.webp?v=3" alt="" width={48} height={48} className="h-12 w-12" />
          <span className="text-lg font-bold">{siteConfig.fullName}</span>
        </Link>
        <h1 className="mt-8 text-3xl font-bold">Privacy policy</h1>
        <p className="mt-1 text-sm text-muted">Last updated: {UPDATED}</p>

        <p className="mt-6 text-[15px] leading-relaxed">
          HuDa is free to use, with no ads, and we never sell or share your data. You can read and listen to the whole
          Quran without an account. This page says, in plain words, what is kept and where.
        </p>

        <Section heading="Without an account">
          <p>
            Your settings, last read place and bookmarks are kept <strong>only in your own browser</strong> (its local
            storage). They are not sent to us. Clearing the browser&apos;s site data removes them.
          </p>
          <p>
            Your city for prayer times stays on your device and is never sent to our servers.
          </p>
          <p>
            To show view counts and live listeners, and to stop spam, the app uses a random browser id that is not
            linked to your name or email. Comments, likes and feedback you send are stored with that id; for limits
            against abuse we keep a one-way hash of your IP address, never the address itself.
          </p>
          <p>
            If you turn on reading reminders, we store your browser&apos;s push address, the times you picked, your
            time zone and app language, so the reminder can be sent.
          </p>
        </Section>

        <Section heading="With an account (optional)">
          <p>
            You can sign in with Google or with a link sent to your email. We then store: your email address, your name
            (if Google shares it), how you signed in, and your last read place, bookmarks and settings (language,
            translation, reciter, theme and similar), so they follow you to every device.
          </p>
          <p>
            We do <strong>not</strong> store your location, and the anonymous listening statistics are never linked to
            your account.
          </p>
        </Section>

        <Section heading="Who handles the data">
          <p>
            Accounts and app data: Supabase (database and sign-in). Website hosting and anonymous page statistics:
            Vercel. Audio and video files: Cloudflare. Sign in with Google: Google, which only tells us your email and
            name. Support payments (UPI or Ko-fi) happen on those services; HuDa never sees your payment details.
          </p>
        </Section>

        <Section heading="Delete your account">
          <p>
            In the app: Settings › Account › <strong>Delete account</strong>. This removes your account and everything
            stored with it on our servers straight away. What is saved in your own browser stays until you clear it.
          </p>
        </Section>

        <Section heading="Children">
          <p>An account is not needed to use HuDa. We do not knowingly collect personal data from children.</p>
        </Section>

        <Section heading="Questions">
          <p>Use the feedback lantern in the app to reach us. If this policy changes, the date above changes too.</p>
        </Section>

        <hr className="my-12 border-current opacity-10" />

        <div lang="ta" className="font-tamil">
          <h2 className="text-2xl font-bold">தனியுரிமைக் கொள்கை (தமிழில்)</h2>
          <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-muted">
            <p>
              HuDa இலவசம், விளம்பரம் இல்லை; உங்கள் தகவலை நாங்கள் யாருக்கும் விற்பதோ பகிர்வதோ இல்லை. Account இல்லாமலே முழு
              குர்ஆனையும் படிக்கலாம், கேட்கலாம்.
            </p>
            <p>
              <strong>Account இல்லாமல்:</strong> settings, கடைசியாகப் படித்த இடம், bookmarks எல்லாம் உங்கள் browser-ல் மட்டுமே.
              தொழுகை நேரத்துக்கான உங்கள் ஊர் உங்கள் சாதனத்திலேயே இருக்கும். View count, spam தடுப்புக்கு உங்கள் பெயரோடு
              இணைக்கப்படாத ஒரு random browser id; IP முகவரியின் one-way hash மட்டும் (முகவரி அல்ல). Reminders இயக்கினால், அனுப்புவதற்காக
              push முகவரி, நேரங்கள், time zone, மொழி சேமிக்கப்படும்.
            </p>
            <p>
              <strong>Account உடன் (விருப்பம்):</strong> Google அல்லது email link மூலம் sign in. சேமிப்பது: email, பெயர் (Google
              தந்தால்), sign-in வழி; படித்த இடம், bookmarks, settings (மொழி, மொழிபெயர்ப்பு, reciter, theme போன்றவை). இடம் (location)
              சேமிக்கப்படாது; anonymous கேட்டல் புள்ளிவிவரங்கள் account-உடன் இணைக்கப்படாது.
            </p>
            <p>
              <strong>யார் கையாள்கிறார்கள்:</strong> Supabase (database, sign-in), Vercel (hosting), Cloudflare (audio / video),
              Google (Google sign-in). UPI / Ko-fi பணம் அவர்களின் சேவையிலேயே; உங்கள் பண விவரங்களை HuDa பார்ப்பதில்லை.
            </p>
            <p>
              <strong>Account நீக்க:</strong> Settings › Account › <strong>கணக்கை நீக்கு</strong>. எங்கள் server-ல் உள்ள அனைத்தும்
              உடனே நீங்கும். உங்கள் browser-ல் உள்ளவை நீங்கள் அழிக்கும் வரை இருக்கும்.
            </p>
            <p>
              <strong>கேள்விகள்:</strong> App-ல் உள்ள feedback lantern வழியாக எங்களைத் தொடர்பு கொள்ளுங்கள்.
            </p>
          </div>
        </div>

        <p className="mt-12">
          <Link href="/" className="font-semibold underline underline-offset-2">
            Back to HuDa · <span className="font-tamil">முகப்பு</span>
          </Link>
        </p>
      </article>
    </main>
  );
}
