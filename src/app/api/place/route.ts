/**
 * The place name for the time pill, from Google's Geocoding API — the names
 * people see in Google Maps (owner, 2026-11-28: OpenStreetMap named Vettrivel
 * Nagar, Madambakkam as « Neelamangalam »). The key stays on the server
 * (GOOGLE_GEOCODING_KEY); without it, or once Google refuses (the daily
 * quota set in Cloud Console), it answers { name: null } and the app keeps
 * the OpenStreetMap name.
 *
 * Google's terms: the name is shown with « Google » credited (prayer sheet)
 * and not stored — the app asks again on each visit; only coordinates are kept.
 */
export const runtime = "nodejs";

const KEY = process.env.GOOGLE_GEOCODING_KEY || "";

// Most precise first: the area name Google Maps itself shows for a spot.
const ORDER = ["neighborhood", "sublocality_level_2", "sublocality_level_1", "sublocality", "locality", "administrative_area_level_3"];

interface Component {
  long_name: string;
  types: string[];
}
interface GeocodeResponse {
  status: string;
  results?: { address_components: Component[] }[];
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return json({ name: null }, 400);
  }
  if (!KEY) return json({ name: null });
  // ~11 m is plenty for an area name.
  const q = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${q}&language=en&key=${KEY}`,
      { cache: "no-store", signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return json({ name: null });
    const data = (await res.json()) as GeocodeResponse;
    if (data.status !== "OK" || !data.results?.length) return json({ name: null });
    const parts = data.results.flatMap((r) => r.address_components);
    if (url.searchParams.get("debug") === "1")
      return json({ results: data.results.slice(0, 8).map((r) => (r as { types?: string[] }).types?.join(",") + " | " + r.address_components.map((c) => `${c.long_name}[${c.types.join(",")}]`).join("; ")) });
    for (const type of ORDER) {
      const c = parts.find((p) => p.types.includes(type));
      if (c?.long_name) return json({ name: c.long_name, source: "google" });
    }
    return json({ name: null });
  } catch {
    return json({ name: null });
  }
}
