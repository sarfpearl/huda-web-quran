/**
 * HuDa Web Quran — reading reminders (src/lib/reminders, src/lib/i18n/reminders.ts)
 *
 *   node --test tests/reminders/reminders.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
require(path.join(ROOT, "scripts/qa/lib/load.cjs"));
const store = require(path.join(ROOT, "src/lib/reminders/store.ts"));
const { REMINDER_MESSAGES, reminderPayload } = require(path.join(ROOT, "src/lib/reminders/messages.ts"));
const strings = require(path.join(ROOT, "src/lib/i18n/reminders.ts")).default;

const LANGS = ["en", "ta", "ur", "ml", "hi", "id", "bn", "tr", "fr", "ms"];

test("parseReminders keeps valid times and drops the rest", () => {
  assert.deepEqual(store.parseReminders(null), store.EMPTY_REMINDERS);
  assert.deepEqual(store.parseReminders("{not json"), store.EMPTY_REMINDERS);
  const s = store.parseReminders(
    JSON.stringify({ v: 1, updatedAt: 5, times: [{ id: "a", time: "06:30", on: true }, { id: "b", time: "6:30" }, { id: "c", time: "21:05" }, null] }),
  );
  assert.deepEqual(s.times, [
    { id: "a", time: "06:30", on: true },
    { id: "c", time: "21:05", on: true },
  ]);
  assert.equal(s.updatedAt, 5);
});

test("sortReminders orders by time and keeps one per time", () => {
  const out = store.sortReminders([
    { id: "1", time: "21:00", on: true },
    { id: "2", time: "05:15", on: false },
    { id: "3", time: "21:00", on: false },
  ]);
  assert.deepEqual(out.map((r) => r.id), ["2", "1"]);
});

test("nextReminderTime picks the default, then an unused later time", () => {
  assert.equal(store.nextReminderTime([]), "06:30");
  assert.equal(store.nextReminderTime([{ id: "a", time: "06:30", on: true }]), "07:30");
  assert.equal(store.nextReminderTime([{ id: "a", time: "06:30", on: true }, { id: "b", time: "23:30", on: true }]), "00:30");
});

test("serverTimes / syncKey follow the list's content, not its order or ids", () => {
  const a = [{ id: "x", time: "20:00", on: true }, { id: "y", time: "05:00", on: false }];
  const b = [{ id: "q", time: "05:00", on: false }, { id: "r", time: "20:00", on: true }];
  assert.deepEqual(store.serverTimes(a), [{ time: "05:00", on: false }, { time: "20:00", on: true }]);
  assert.equal(store.syncKey(a), store.syncKey(b));
  assert.notEqual(store.syncKey(a), store.syncKey([{ id: "x", time: "20:00", on: false }, a[1]]));
});

test("formatReminderTime always shows a 12-hour clock", () => {
  assert.match(store.formatReminderTime("18:05", "en-US"), /6:05\s?PM/);
  assert.match(store.formatReminderTime("18:05", "en-GB"), /6:05\s?pm/i);
  assert.match(store.formatReminderTime("06:30", "en-IN"), /6:30\s?am/i);
});

test("notification text exists in every app language", () => {
  for (const l of LANGS) {
    assert.ok(REMINDER_MESSAGES[l]?.title && REMINDER_MESSAGES[l]?.body, l);
  }
  assert.equal(reminderPayload("ta").title, REMINDER_MESSAGES.ta.title);
  assert.equal(reminderPayload("xx").lang, "en");
});

test("every Reminders label is translated into the 9 other languages", () => {
  for (const [key, tr] of Object.entries(strings)) {
    for (const l of LANGS.slice(1)) assert.ok(tr[l], `${key} → ${l}`);
    for (const v of key.match(/\{\w+\}/g) ?? []) {
      for (const l of LANGS.slice(1)) assert.ok(tr[l].includes(v), `${key} → ${l} keeps ${v}`);
    }
  }
});
