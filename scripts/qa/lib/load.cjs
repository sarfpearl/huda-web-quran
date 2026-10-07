// Loads the app's real TypeScript data modules in Node (via sucrase), so the QA
// scripts test the exact code the app ships. `fetch` for relative "/..." URLs
// is served from public/ (as the Next.js server would); any other URL is
// counted as an external request and answered 503, so a test notices when the
// app would leave the site at runtime.
const path = require("path");
const fs = require("fs");
const Module = require("module");

const ROOT = path.resolve(__dirname, "../../..");

// The app's public env (NEXT_PUBLIC_MEDIA_BASE_URL → R2 media URLs), as
// Next.js loads it; without it media paths stay relative and every R2 file
// (e.g. Maher's full-Juz audio) reads as unreachable.
for (const f of [".env.local", ".env"]) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=\s*"?([^"\r]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
const { transform } = require(path.join(ROOT, "node_modules/sucrase"));

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (req, parent, ...rest) {
  if (req.startsWith("@/")) req = path.join(ROOT, "src", req.slice(2));
  return origResolve.call(this, req, parent, ...rest);
};
for (const ext of [".ts", ".tsx"]) {
  Module._extensions[ext] = function (mod, filename) {
    const src = fs.readFileSync(filename, "utf8");
    const transforms = ["typescript", "imports", ...(ext === ".tsx" ? ["jsx"] : [])];
    mod._compile(transform(src, { transforms, filePath: filename }).code, filename);
  };
}

const nativeFetch = globalThis.fetch;
const requests = { local: 0, missing: [], external: [] };
const store = new Map();
global.window = global;
global.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
global.fetch = async (url) => {
  const resp = (ok, status, body) => ({ ok, status, json: async () => body });
  if (typeof url === "string" && url.startsWith("/")) {
    const p = path.join(ROOT, "public", url.split("?")[0]);
    if (!fs.existsSync(p)) {
      requests.missing.push(url);
      return resp(false, 404, null);
    }
    requests.local++;
    return resp(true, 200, JSON.parse(fs.readFileSync(p, "utf8")));
  }
  requests.external.push(String(url));
  return resp(false, 503, null);
};

const load = (rel) => require(path.join(ROOT, rel));
const V = load("src/lib/data/quranVerses.ts");
const R = load("src/lib/data/quranReciters.ts");
const Q = load("src/lib/data/quran.ts");
const T = load("src/lib/data/surahTrimming.ts");

module.exports = { V, R, Q, T, ROOT, requests, nativeFetch, store };
