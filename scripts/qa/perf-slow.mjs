#!/usr/bin/env node
// Slow-phone load probe: real Chrome with slow 4G (1.6 Mbps, 150 ms) and a
// 4x CPU slowdown, mobile viewport; prints FCP, every LCP candidate and each
// layout shift (time, score, which element moved from → to). Lighthouse's
// simulated LCP over-counts here (it puts the splash's parallel 800 KB scene
// image on the LCP path) — this shows what a phone actually paints.
//
// Usage: node scripts/qa/perf-slow.mjs [url] [watch-ms]
//   (default http://localhost:3100/ — the "prod" launch config, see seo-share.cjs)
// Needs puppeteer-core: run `npx -y lighthouse@12 --version` once (it brings
// it into the npx cache), or set PUPPETEER_CORE to its folder.
import { execSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const pcDir =
  process.env.PUPPETEER_CORE ||
  execSync(`find "${process.env.HOME}/.npm/_npx" -type d -path "*node_modules/puppeteer-core" -maxdepth 4 | head -1`).toString().trim();
const { default: puppeteer } = await import(pathToFileURL(`${pcDir}/lib/esm/puppeteer/puppeteer-core.js`).href);
const url = process.argv[2] || "http://localhost:3100/";
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent("Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
const cdp = await page.createCDPSession();
await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
await page.evaluateOnNewDocument(() => {
  window.__ls = []; window.__lcp = [];
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(3), input: e.hadRecentInput, src: e.sources.map((s) => ({ n: (s.node?.className?.baseVal ?? s.node?.className ?? s.node?.nodeName ?? "").toString().slice(0, 50), txt: (s.node?.textContent || "").slice(0, 30), prev: [s.previousRect.x | 0, s.previousRect.y | 0, s.previousRect.width | 0, s.previousRect.height | 0], cur: [s.currentRect.x | 0, s.currentRect.y | 0, s.currentRect.width | 0, s.currentRect.height | 0] })) }); }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: (e.element?.className || "") + "", size: e.size }); }).observe({ type: "largest-contentful-paint", buffered: true });
});
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await new Promise((r) => setTimeout(r, +(process.argv[3] || 12000)));
const r = await page.evaluate(() => ({ ls: window.__ls.filter((e) => e.v > 0.002), lcp: window.__lcp, cls: window.__ls.filter((e) => !e.input).reduce((a, e) => a + e.v, 0).toFixed(3), fcp: Math.round(performance.getEntriesByName("first-contentful-paint")[0]?.startTime) }));
console.log(JSON.stringify(r, null, 1));
await browser.close();
