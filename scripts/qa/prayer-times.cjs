#!/usr/bin/env node
// Prayer-times check: src/lib/prayerTimes.ts (adhan-js, region defaults)
// against AlAdhan's independent API for cities across the methods the app
// picks by region. Every time must agree within 2 minutes — 5 for the
// methods whose definition adds precautionary minutes that adhan-js applies
// and AlAdhan doesn't (Dubai: ±3 on sunrise / Dhuhr / Asr / Maghrib;
// Moonsighting Committee: Dhuhr +5, Maghrib +3).
//
// Usage: node scripts/qa/prayer-times.cjs [YYYY-MM-DD]
const { nativeFetch } = require("./lib/load.cjs");
const P = require("../../src/lib/prayerTimes.ts");

// AlAdhan method ids for the app's methods.
const ALADHAN = { Karachi: 1, NorthAmerica: 2, MuslimWorldLeague: 3, UmmAlQura: 4, Egyptian: 5, Tehran: 7, Kuwait: 9, Qatar: 10, Singapore: 11, Turkey: 13, MoonsightingCommittee: 15, Dubai: 16 };
const CITIES = [
  { name: "Guduvancheri", lat: 12.8457, lon: 80.0615, cc: "in", st: "IN-TN", tz: "Asia/Kolkata" },
  { name: "Lucknow", lat: 26.8467, lon: 80.9462, cc: "in", st: "IN-UP", tz: "Asia/Kolkata" },
  { name: "Karachi", lat: 24.8607, lon: 67.0011, cc: "pk", tz: "Asia/Karachi" },
  { name: "Colombo", lat: 6.9271, lon: 79.8612, cc: "lk", tz: "Asia/Colombo" },
  { name: "Makkah", lat: 21.3891, lon: 39.8579, cc: "sa", tz: "Asia/Riyadh" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, cc: "ae", tz: "Asia/Dubai" },
  { name: "Cairo", lat: 30.0444, lon: 31.2357, cc: "eg", tz: "Africa/Cairo" },
  { name: "Kuala Lumpur", lat: 3.139, lon: 101.6869, cc: "my", tz: "Asia/Kuala_Lumpur" },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784, cc: "tr", tz: "Europe/Istanbul" },
  { name: "London", lat: 51.5072, lon: -0.1276, cc: "gb", tz: "Europe/London" },
  { name: "New York", lat: 40.7128, lon: -74.006, cc: "us", tz: "America/New_York" },
  { name: "Paris", lat: 48.8566, lon: 2.3522, cc: "fr", tz: "Europe/Paris" },
];
const KEYS = [
  ["fajr", "Fajr"],
  ["sunrise", "Sunrise"],
  ["dhuhr", "Dhuhr"],
  ["asr", "Asr"],
  ["maghrib", "Maghrib"],
  ["isha", "Isha"],
];

const dateArg = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const [Y, M, D] = dateArg.split("-").map(Number);
const toMin = (hhmm) => {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};
const localMin = (d, tz) => {
  const [h, m] = d.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  return (h % 24) * 60 + m;
};

(async () => {
  let worst = 0;
  let failures = 0;
  for (const c of CITIES) {
    const { method, asr } = P.regionDefaults(c.cc, c.st);
    const mine = P.dayTimes(c.lat, c.lon, new Date(Y, M - 1, D, 12), method, asr).times;
    const url = `https://api.aladhan.com/v1/timings/${String(D).padStart(2, "0")}-${String(M).padStart(2, "0")}-${Y}?latitude=${c.lat}&longitude=${c.lon}&method=${ALADHAN[method]}&school=${asr === "hanafi" ? 1 : 0}&timezonestring=${encodeURIComponent(c.tz)}`;
    const res = await nativeFetch(url);
    const ref = (await res.json()).data.timings;
    const diffs = KEYS.map(([k, rk]) => {
      let d = Math.abs(localMin(mine[k], c.tz) - toMin(ref[rk]));
      if (d > 720) d = 1440 - d;
      worst = Math.max(worst, d);
      return { k, d };
    });
    const tolerance = method === "Dubai" || method === "MoonsightingCommittee" ? 5 : 2;
    const bad = diffs.filter((x) => x.d > tolerance);
    failures += bad.length;
    console.log(
      `${bad.length ? "FAIL" : "ok  "} ${c.name.padEnd(13)} ${method.padEnd(22)} ${asr.padEnd(6)} ` +
        KEYS.map(([k]) => `${k} ${mine[k].toLocaleTimeString("en-GB", { timeZone: c.tz, hour: "2-digit", minute: "2-digit" })}${diffs.find((x) => x.k === k).d ? `(Δ${diffs.find((x) => x.k === k).d})` : ""}`).join(" "),
    );
  }
  console.log(`worst difference: ${worst} min`);
  process.exit(failures ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
