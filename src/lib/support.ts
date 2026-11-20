/*
 * "Help keep HuDa free" — the support sheet's settings, all in one place.
 * HuDa never touches the money: India pays by UPI straight into the owner's
 * account (0% fee), everyone else on the owner's Ko-fi page.
 *
 * The owner sets these in Vercel → Settings → Environment Variables (and in
 * .env.local for local runs); see .env.example. Until they are set, the sheet
 * shows its buttons disabled with "not set up yet", and production hides the
 * support entries altogether.
 */

/** UPI ID (VPA) the money goes to, e.g. "name@okhdfcbank". */
export const SUPPORT_UPI_ID = process.env.NEXT_PUBLIC_SUPPORT_UPI_ID?.trim() ?? "";
/** Payee name shown in the UPI app — should match the bank account's name. */
export const SUPPORT_UPI_NAME = process.env.NEXT_PUBLIC_SUPPORT_UPI_NAME?.trim() || "HuDa";
/** The owner's Ko-fi page, e.g. "https://ko-fi.com/huda". */
export const SUPPORT_KOFI_URL = process.env.NEXT_PUBLIC_SUPPORT_KOFI_URL?.trim() ?? "";

/** Suggested UPI amounts in rupees; the visitor can also leave it to the UPI app. */
export const UPI_AMOUNTS = [51, 101, 251, 501] as const;

/** Opens the support sheet (Settings row, the edge star). */
export const OPEN_SUPPORT_EVENT = "huda:open-support";

/** localStorage: the visitor's pick of payment way ("upi" | "kofi"). */
export const SUPPORT_WAY_KEY = "huda-support-way";
/** localStorage: the gift has had its one swing out on the first visit ("1"). */
export const SUPPORT_PEEKED_KEY = "huda-support-peeked";

export type SupportWay = "upi" | "kofi";

export const upiConfigured = () => /^[\w.-]+@[\w.-]+$/.test(SUPPORT_UPI_ID);
export const kofiConfigured = () => /^https:\/\/(www\.)?ko-fi\.com\/\S+/.test(SUPPORT_KOFI_URL);

/**
 * Whether the support entries show at all: in production only once a payment
 * way is set; in previews and local runs always, so the owner can review it.
 */
export function supportEnabled(): boolean {
  if (upiConfigured() || kofiConfigured()) return true;
  return process.env.NEXT_PUBLIC_VERCEL_ENV !== "production";
}

/** The `upi://pay` link (also what the QR code holds). No amount → the UPI app asks. */
export function upiLink(amount?: number, note = "Support HuDa"): string {
  const params = new URLSearchParams({ pa: SUPPORT_UPI_ID, pn: SUPPORT_UPI_NAME, cu: "INR", tn: note });
  if (amount && amount > 0) params.set("am", amount.toFixed(2));
  // UPI apps read %20, not "+", as a space, and expect the ID's "@" as is.
  return `upi://pay?${params.toString().replace(/\+/g, "%20").replace(/%40/g, "@")}`;
}

/**
 * The first payment way to show, worked out on the device only (nothing is
 * sent): India's time zone or an "-IN" browser language → UPI; else Ko-fi.
 */
export function defaultSupportWay(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  languages: readonly string[] = typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : [],
): SupportWay {
  if (timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta") return "upi";
  if (languages.some((l) => /-IN$/i.test(l))) return "upi";
  return "kofi";
}
