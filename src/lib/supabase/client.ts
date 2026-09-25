import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (uses the public anon key — safe for the client).
 * Only used by client components once Supabase is connected. In seed mode
 * nothing calls this.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase env not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }
  return createBrowserClient(url, anonKey);
}

let browserClient: ReturnType<typeof createBrowserClient> | null | undefined;

/**
 * Shared browser client for optional features (auth, Quran analytics), or
 * null when Supabase isn't configured — callers degrade gracefully instead of
 * throwing, so the site keeps working in seed mode.
 */
export function getSupabaseBrowserClient() {
  if (typeof window === "undefined") return null;
  if (browserClient !== undefined) return browserClient;
  try {
    browserClient = createSupabaseBrowserClient();
  } catch {
    browserClient = null;
  }
  return browserClient;
}
