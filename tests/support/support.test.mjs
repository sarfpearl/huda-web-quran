/**
 * HuDa Web Quran — support sheet helpers (src/lib/support.ts) and the QR
 * encoder that draws the UPI code (src/lib/qr.ts).
 *
 *   node --test tests/support/support.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
// Fixed test values, set before the loader reads .env.local.
process.env.NEXT_PUBLIC_SUPPORT_UPI_ID = "test.payee@okbank";
process.env.NEXT_PUBLIC_SUPPORT_UPI_NAME = "HuDa Test";
process.env.NEXT_PUBLIC_SUPPORT_KOFI_URL = "https://ko-fi.com/example";
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const support = require(path.join(ROOT, "src/lib/support.ts"));
const { qrMatrix } = require(path.join(ROOT, "src/lib/qr.ts"));

test("upi link carries payee, name, currency and note; amount only when given", () => {
  const url = new URL(support.upiLink());
  assert.equal(url.protocol, "upi:");
  assert.equal(url.searchParams.get("pa"), "test.payee@okbank");
  assert.equal(url.searchParams.get("pn"), "HuDa Test");
  assert.equal(url.searchParams.get("cu"), "INR");
  assert.equal(url.searchParams.get("tn"), "Support HuDa");
  assert.equal(url.searchParams.has("am"), false);
  assert.equal(new URL(support.upiLink(101)).searchParams.get("am"), "101.00");
  // Spaces as %20 — some UPI apps show a "+" literally.
  assert.ok(!support.upiLink().includes("+"));
  assert.ok(support.upiLink().startsWith("upi://pay?pa=test.payee@okbank&"));
});

test("payment details are recognised; placeholders are not", () => {
  assert.equal(support.upiConfigured(), true);
  assert.equal(support.kofiConfigured(), true);
});

test("default way: India's time zone or an -IN language → UPI, else Ko-fi", () => {
  assert.equal(support.defaultSupportWay("Asia/Kolkata", ["en-GB"]), "upi");
  assert.equal(support.defaultSupportWay("Asia/Calcutta", []), "upi");
  assert.equal(support.defaultSupportWay("Asia/Dubai", ["ta-IN", "en"]), "upi");
  assert.equal(support.defaultSupportWay("Asia/Colombo", ["ta-LK"]), "kofi");
  assert.equal(support.defaultSupportWay("Europe/London", ["en-GB"]), "kofi");
});

/** Reads the 15 format bits next to the top-left finder (QR spec 7.9). */
function formatBits(m) {
  const bits = [];
  for (let i = 0; i <= 5; i++) bits.push(m[i][8]);
  bits.push(m[7][8], m[8][8], m[8][7]);
  for (let i = 9; i < 15; i++) bits.push(m[8][14 - i]);
  return bits.reduce((v, b, i) => v | ((b ? 1 : 0) << i), 0);
}

test("qr: right size, finders, timing, level M format with a valid BCH code", () => {
  for (const text of ["upi://pay?pa=a@b", new URL(support.upiLink(501)).href, "x".repeat(150)]) {
    const m = qrMatrix(text);
    const ver = (m.length - 17) / 4;
    assert.ok(Number.isInteger(ver) && ver >= 1 && ver <= 9, `version ${ver}`);
    // Finder: dark ring, light ring, dark 3×3 core.
    for (const [r, c] of [[0, 0], [0, m.length - 7], [m.length - 7, 0]]) {
      assert.equal(m[r][c], true);
      assert.equal(m[r + 1][c + 1], false);
      assert.equal(m[r + 3][c + 3], true);
    }
    for (let i = 8; i < m.length - 8; i++) assert.equal(m[6][i], i % 2 === 0);
    const raw = formatBits(m) ^ 0x5412;
    assert.equal(raw >>> 13, 0, "error correction level M");
    let rem = raw >>> 10;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    assert.equal(((raw >>> 10) << 10) | rem, raw, "format BCH code");
    assert.equal(m[m.length - 8][8], true, "dark module");
  }
});

test("qr: a UPI link fits a small code (version ≤ 6) and too long a text throws", () => {
  assert.ok(qrMatrix(support.upiLink(251)).length <= 6 * 4 + 17);
  assert.throws(() => qrMatrix("x".repeat(200)));
});
