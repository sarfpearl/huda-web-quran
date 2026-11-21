/**
 * Ko-fi webhook → public.kofi_gifts (supabase/migrations/20261121120000_kofi_gifts.sql).
 *
 * Ko-fi → Settings → More → API → Webhook URL = https://www.hudaguidance.com/api/kofi.
 * The verification token Ko-fi shows there lives only in Vercel env
 * (KOFI_VERIFICATION_TOKEN); a request without it gets 401 and nothing is
 * saved. Supabase checks the same token again (its SHA-256 is in
 * public.kofi_secret), so the anon-key RPC is useless without it.
 *
 * Ko-fi resends until it gets a 200, so a Supabase failure answers 502 and
 * the retry lands later; the same payment is never saved twice.
 */
import { parseKofiBody, sameToken } from "@/lib/kofi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.KOFI_VERIFICATION_TOKEN;
  if (!expected) return new Response("Ko-fi webhook not configured", { status: 503 });

  const body = await req.text().catch(() => "");
  if (body.length > 64_000) return new Response("Too large", { status: 413 });
  const parsed = parseKofiBody(body);
  // Check the token before saying anything about the rest of the payload.
  const token = parsed.ok || parsed.error === "invalid" ? parsed.token : null;
  if (!token || !sameToken(token, expected)) return new Response("Unauthorized", { status: 401 });
  if (!parsed.ok) return new Response("Bad request", { status: 400 });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return new Response("Supabase not configured", { status: 503 });

  const res = await fetch(`${base.replace(/\/$/, "")}/rest/v1/rpc/kofi_gift_add`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token, p_gift: parsed.gift }),
    cache: "no-store",
  }).catch(() => null);
  const out = res?.ok ? ((await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null) : null;
  if (out?.ok !== true) {
    console.error("kofi_gift_add failed", res?.status ?? "network", out?.error ?? "");
    return new Response("Could not save", { status: 502 });
  }
  return new Response("OK", { status: 200 });
}
