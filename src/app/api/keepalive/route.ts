/**
 * Supabase keep-alive: the Free plan pauses a project after ~7 days without
 * activity. Vercel Cron (vercel.json) calls this once a day; it runs one
 * read-only RPC so the project always has recent activity.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Vercel sends `Authorization: Bearer $CRON_SECRET` when CRON_SECRET is set.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return new Response("Supabase not configured", { status: 500 });

  const res = await fetch(`${base}/rest/v1/rpc/get_quran_view_counts`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_kind: "surah" }),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return new Response(`Supabase ${res?.status ?? "unreachable"}`, { status: 502 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
