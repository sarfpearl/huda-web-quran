import sharp from "sharp";

/**
 * Lock-screen / Control Centre artwork: the Surah or Juz scene cropped to a
 * square. iOS shows the scene as-is (a wide card), so it is centre-cropped
 * here — same origin, 512 px, which the home-screen app also needs.
 */
export const runtime = "nodejs";

const MEDIA_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "").hostname;
  } catch {
    return "";
  }
})();

// Only our own media: a path on this site, or the R2 bucket.
function sourceUrl(src: string, origin: string): URL | null {
  try {
    const u = new URL(src, origin);
    if (u.origin === origin) return u.pathname.startsWith("/api/") ? null : u;
    if (u.protocol !== "https:") return null;
    if (u.hostname === MEDIA_HOST || u.hostname.endsWith(".r2.dev")) return u;
  } catch {
    /* bad URL */
  }
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const src = sourceUrl(url.searchParams.get("src") ?? "", url.origin);
  if (!src) return new Response("Bad source", { status: 400 });
  const res = await fetch(src, { cache: "force-cache" }).catch(() => null);
  if (!res?.ok) return new Response("Not found", { status: 404 });
  const out = await sharp(Buffer.from(await res.arrayBuffer()))
    .resize(512, 512, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer()
    .catch(() => null);
  if (!out) return new Response("Bad image", { status: 415 });
  return new Response(new Uint8Array(out), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
