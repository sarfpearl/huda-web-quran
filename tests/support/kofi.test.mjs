/**
 * HuDa Web Quran — Ko-fi webhook parsing (src/lib/kofi.ts) and the admin
 * dashboard's Ko-fi card (kofiGiftsCard in src/lib/dashboard.ts).
 *
 *   node --test tests/support/kofi.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const { parseKofiBody, sameToken } = require(path.join(ROOT, "src/lib/kofi.ts"));
const { kofiGiftsCard } = require(path.join(ROOT, "src/lib/dashboard.ts"));

// Shape of Ko-fi's "Send Single Donation Test" payload.
const sample = (over = {}) => ({
  verification_token: "tok-123",
  message_id: "3a1fac0c-f960-4506-a60e-824979a74e74",
  timestamp: "2026-11-21T10:15:00Z",
  type: "Donation",
  is_public: true,
  from_name: "Jo Example",
  message: "Good luck with the integration!",
  amount: "3.00",
  url: "https://ko-fi.com/Home/CoffeeShop?txid=0a1fac0c",
  email: "jo.example@example.com",
  currency: "USD",
  is_subscription_payment: false,
  is_first_subscription_payment: false,
  kofi_transaction_id: "0a1fac0c-f960-4506-a60e-824979a74e71",
  shop_items: null,
  tier_name: null,
  shipping: null,
  ...over,
});
const form = (obj) => new URLSearchParams({ data: JSON.stringify(obj) }).toString();

test("form-encoded Ko-fi payload becomes a gift without the email", () => {
  const r = parseKofiBody(form(sample()));
  assert.equal(r.ok, true);
  assert.equal(r.token, "tok-123");
  assert.equal(r.gift.kofi_transaction_id, "0a1fac0c-f960-4506-a60e-824979a74e71");
  assert.equal(r.gift.amount, "3.00");
  assert.equal(r.gift.currency, "USD");
  assert.equal(r.gift.from_name, "Jo Example");
  assert.equal(r.gift.kind, "Donation");
  assert.equal(r.gift.gift_at, "2026-11-21T10:15:00.000Z");
  assert.equal(JSON.stringify(r.gift).includes("example.com"), false);
});

test("raw JSON body and string booleans work too", () => {
  const r = parseKofiBody(JSON.stringify(sample({ is_public: "false", is_subscription_payment: "true", tier_name: "Friend" })));
  assert.equal(r.ok, true);
  assert.equal(r.gift.is_public, false);
  assert.equal(r.gift.is_subscription, true);
  assert.equal(r.gift.tier_name, "Friend");
});

test("missing data, bad JSON, no token, bad amount are refused", () => {
  assert.deepEqual(parseKofiBody(""), { ok: false, error: "no-data" });
  assert.deepEqual(parseKofiBody("data=%7Bnope"), { ok: false, error: "bad-json" });
  assert.deepEqual(parseKofiBody(form(sample({ verification_token: "" }))), { ok: false, error: "no-token" });
  const bad = parseKofiBody(form(sample({ amount: "lots" })));
  assert.equal(bad.ok, false);
  assert.equal(bad.error, "invalid");
  assert.equal(bad.token, "tok-123");
});

test("sameToken compares whole strings", () => {
  assert.equal(sameToken("abc", "abc"), true);
  assert.equal(sameToken("abc", "abd"), false);
  assert.equal(sameToken("abc", "abcd"), false);
  assert.equal(sameToken("", "x"), false);
});

test("Ko-fi card: totals for 30 days, newest first, private message marked", () => {
  const now = Date.parse("2026-11-21T12:00:00Z");
  const card = kofiGiftsCard(
    [
      { gift_at: "2026-11-21T10:15:00Z", from_name: "Jo", amount: "3.00", currency: "USD", message: "Thanks", is_public: false },
      { gift_at: "2026-11-10T10:15:00Z", from_name: null, amount: 5, currency: "USD" },
      { gift_at: "2026-09-01T10:15:00Z", from_name: "Old", amount: 100, currency: "USD" },
    ],
    undefined,
    now,
  );
  assert.equal(card.status, "ok");
  assert.equal(card.value, "$8.00");
  assert.match(card.caption, /2 gifts/);
  assert.match(card.lines[0], /^கடைசி: Jo · \$3\.00/);
  const list = card.detail[0];
  assert.equal(list.items.length, 3);
  assert.match(list.items[0].secondary, /“Thanks” \(தனிப்பட்ட செய்தி\)/);
  assert.match(list.items[1].primary, /^பெயர் இல்லை — \$5\.00/);
});

test("Ko-fi card: empty and unavailable", () => {
  const empty = kofiGiftsCard([]);
  assert.equal(empty.status, "ok");
  assert.equal(empty.value, "0");
  const off = kofiGiftsCard(null, "table இல்லை");
  assert.equal(off.status, "unavailable");
  assert.equal(off.reason, "table இல்லை");
});
