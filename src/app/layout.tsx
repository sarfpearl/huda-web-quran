import type { Metadata, Viewport } from "next";
import "./globals.css";
import { shareMetadata, siteConfig } from "@/lib/site";
import { ThemeProvider, themeInitScript } from "@/components/theme/ThemeProvider";
import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { SurahListenCounter } from "@/components/player/SurahListenCounter";
import { SplashScreen } from "@/components/layout/SplashScreen";


export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.fullName,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    // Home-screen app: let the scene run under the status bar (no black band).
    statusBarStyle: "black-translucent",
  },
  ...shareMetadata({ title: siteConfig.title, description: siteConfig.description, url: siteConfig.url }),
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS ignores SVG touch icons and falls back to a page screenshot.
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1a5140" },
    { media: "(prefers-color-scheme: dark)", color: "#0e100f" },
  ],
  width: "device-width",
  initialScale: 1,
  // App-like: no pinch / double-tap zoom, and no auto-zoom when an input focuses.
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="font-sans"
    >
      <head>
        {/* Preload the KFGQPC Uthmanic Script HAFS Mushaf font so the Quran
            Arabic paints in the correct face immediately (no Amiri fallback flash). */}
        <link rel="preload" href="/huda-logo.webp?v=2" as="image" type="image/webp" />
        <link
          rel="preload"
          href="/fonts/UthmanicHafs1Ver18.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <SplashScreen />
        <ThemeProvider>
          <AudioPlayerProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-2 focus:text-sand-50"
            >
              Skip to content
            </a>
            <MainLayout>{children}</MainLayout>
            <SurahListenCounter />
          </AudioPlayerProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
