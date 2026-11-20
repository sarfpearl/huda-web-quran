import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSessionId } from "@/lib/audio/session";

/**
 * Counts a tap in the support sheet for the admin dashboard
 * (supabase/migrations/20261120120000_support_taps.sql). Only the kind and the
 * app's random browser id go out — never an amount or anything about the
 * payment, which HuDa never sees. Fire and forget: a failure changes nothing.
 */
export type SupportTapKind = "upi_app" | "upi_qr" | "upi_copy" | "kofi";

export function recordSupportTap(kind: SupportTapKind) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;
  void supabase.rpc("support_tap", { p_kind: kind, p_viewer: getSessionId() }).then(
    () => undefined,
    () => undefined,
  );
}
