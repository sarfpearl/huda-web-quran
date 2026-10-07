import { PostgrestClient } from "@supabase/postgrest-js";

let rpcClient: PostgrestClient | null | undefined;

/**
 * Anonymous RPC client for the public pages (views, likes, comments, listens).
 * Just PostgREST with the anon key: same `.rpc()` as the full Supabase client,
 * without its auth and realtime code (~60 KB gzipped off the home page's JS).
 * The admin page keeps the full client (lib/supabase/client) for sign-in.
 * Null when Supabase isn't configured — callers degrade gracefully.
 */
export function getSupabaseRpcClient() {
  if (typeof window === "undefined") return null;
  if (rpcClient !== undefined) return rpcClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  rpcClient =
    url && anonKey
      ? new PostgrestClient(`${url.replace(/\/$/, "")}/rest/v1`, {
          headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        })
      : null;
  return rpcClient;
}
