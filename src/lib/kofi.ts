/**
 * Ko-fi webhook helpers for /api/kofi (supabase/migrations/20261121120000_kofi_gifts.sql).
 *
 * Ko-fi POSTs `application/x-www-form-urlencoded` with one field, `data`,
 * holding a JSON string: verification_token, message_id, timestamp, type,
 * is_public, from_name, message, amount, currency, kofi_transaction_id,
 * is_subscription_payment, is_first_subscription_payment, tier_name, email, …
 * Only the fields in KofiGift are kept — never the email or address.
 */

export interface KofiGift {
  kofi_transaction_id: string;
  message_id: string | null;
  kind: string;
  from_name: string | null;
  amount: string;
  currency: string;
  message: string | null;
  is_public: boolean;
  is_subscription: boolean;
  is_first_subscription: boolean;
  tier_name: string | null;
  gift_at: string | null;
}

export type KofiParse =
  | { ok: true; token: string; gift: KofiGift }
  | { ok: false; error: "no-data" | "bad-json" | "no-token" }
  /** The token was there but the gift fields were not usable. */
  | { ok: false; error: "invalid"; token: string };

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};
const bool = (v: unknown, fallback: boolean): boolean =>
  v === true || v === "true" ? true : v === false || v === "false" ? false : fallback;

/** Reads the raw request body Ko-fi sends (form-encoded `data=`, or raw JSON). */
export function parseKofiBody(body: string): KofiParse {
  let raw: string | null = null;
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) raw = trimmed;
  else raw = new URLSearchParams(body).get("data");
  if (!raw) return { ok: false, error: "no-data" };

  let d: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "bad-json" };
    d = parsed as Record<string, unknown>;
  } catch {
    return { ok: false, error: "bad-json" };
  }

  const token = str(d.verification_token, 200);
  if (!token) return { ok: false, error: "no-token" };

  const tx = str(d.kofi_transaction_id, 100) ?? str(d.message_id, 100);
  const amountText = str(d.amount, 20);
  const amount = amountText === null ? NaN : Number(amountText.replace(/,/g, ""));
  const currency = (str(d.currency, 3) ?? "USD").toUpperCase();
  if (!tx || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, error: "invalid", token };
  }
  const at = str(d.timestamp, 40);
  const atOk = at !== null && !Number.isNaN(new Date(at).getTime());

  return {
    ok: true,
    token,
    gift: {
      kofi_transaction_id: tx,
      message_id: str(d.message_id, 100),
      kind: str(d.type, 40) ?? "Donation",
      from_name: str(d.from_name, 200),
      amount: amount.toFixed(2),
      currency,
      message: str(d.message, 2000),
      is_public: bool(d.is_public, true),
      is_subscription: bool(d.is_subscription_payment, false),
      is_first_subscription: bool(d.is_first_subscription_payment, false),
      tier_name: str(d.tier_name, 200),
      gift_at: atOk ? new Date(at).toISOString() : null,
    },
  };
}

/** Compares two strings without stopping at the first difference. */
export function sameToken(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
