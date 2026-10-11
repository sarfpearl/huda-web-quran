import sharp from "sharp";

/**
 * Lock-screen / Control Centre artwork: the Surah or Juz scene cropped to a
 * square. iOS shows the scene as-is (a wide card), so it is centre-cropped
 * here — same origin, 512 px, which the home-screen app also needs.
 */
export const runtime = "nodejs";

// The R2 bucket the app's scenes live on (NEXT_PUBLIC_MEDIA_BASE_URL). Unset
// (local dev without R2) → no source is allowed and the lock screen shows the logo.
const MEDIA_ORIGIN = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "");
    return u.protocol === "https:" ? u.origin : "";
  } catch {
    return "";
  }
})();
// Scenes and thumbnails only.
const MEDIA_PATH = "/assets/images/";
// Scenes are well under 1 MB; anything far bigger is not ours.
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
// The formats the scenes are published in (webp, the old jpg covers, png icons).
const FORMATS = new Set(["jpeg", "png", "webp"]);

// Only our own media: an image path on the exact R2 bucket origin.
function sourceUrl(src: string): URL | null {
  if (!MEDIA_ORIGIN) return null;
  try {
    const u = new URL(src);
    if (u.origin !== MEDIA_ORIGIN || u.username || u.password) return null;
    if (!u.pathname.startsWith(MEDIA_PATH)) return null;
    return u;
  } catch {
    return null;
  }
}

// The body, or null once it passes MAX_BYTES (stops reading there).
async function readCapped(res: Response): Promise<Buffer | null> {
  const declared = Number(res.headers.get("content-length"));
  if (declared > MAX_BYTES) return null;
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

// JPEG / PNG / WebP by their magic bytes, checked before any decoder sees the data.
function sniffFormat(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length >= 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const src = sourceUrl(url.searchParams.get("src") ?? "");
  if (!src) return new Response("Bad source", { status: 400 });
  // No redirects: the bucket serves its files directly.
  const res = await fetch(src, { cache: "force-cache", redirect: "error" }).catch(() => null);
  if (!res) return new Response("Upstream error", { status: 502 });
  if (!res.ok) return new Response("Not found", { status: 404 });
  const buf = await readCapped(res).catch(() => null);
  if (!buf) return new Response("Too large", { status: 413 });
  const format = sniffFormat(buf);
  if (!format || !FORMATS.has(format)) return new Response("Bad image", { status: 415 });
  const out = await (async () => {
    const img = sharp(buf, { limitInputPixels: MAX_PIXELS });
    const meta = await img.metadata();
    if (meta.format !== format) return null;
    return img
      .resize(512, 512, { fit: "cover", position: "centre" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  })().catch(() => null);
  if (!out) return new Response("Bad image", { status: 415 });
  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
