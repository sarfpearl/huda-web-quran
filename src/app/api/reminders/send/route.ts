/**
 * Sends the Quran-reading reminders that are due now. Supabase cron calls
 * this every minute (setup: supabase/migrations/20261115120000_reading_reminders.sql
 * and docs/REMINDERS.md); `claim_due_reading_reminders` returns each browser
 * whose reminder time has come in its own time zone, marked as sent, and this
 * pushes the notification in its app language. Endpoints the push service
 * says are gone (404 / 410) are removed.
 */
import webpush from "web-push";
import { reminderPayload } from "@/lib/reminders/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DueItem {
  endpoint: string;
  p256dh: string;
  auth: string;
  lang: string;
}

async function rpc<T>(name: string, body: unknown): Promise<T | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const res = await fetch(`${base.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  }).catch(() => null);
  return res?.ok ? ((await res.json()) as T) : null;
}

export async function GET(req: Request) {
  const token = process.env.REMINDER_CRON_TOKEN;
  if (!token || req.headers.get("authorization") !== `Bearer ${token}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const secret = process.env.REMINDER_SECRET;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!secret || !publicKey || !privateKey) return new Response("Reminders not configured", { status: 500 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://www.hudaguidance.com", publicKey, privateKey);

  const claimed = await rpc<{ ok: boolean; items?: DueItem[] }>("claim_due_reading_reminders", { p_secret: secret });
  if (!claimed?.ok) return new Response("Supabase claim failed", { status: 502 });
  const items = claimed.items ?? [];

  const gone: string[] = [];
  let sent = 0;
  let failed = 0;
  // A few at a time: push services answer in ~100 ms each.
  for (let i = 0; i < items.length; i += 25) {
    await Promise.all(
      items.slice(i, i + 25).map(async (it) => {
        try {
          await webpush.sendNotification(
            { endpoint: it.endpoint, keys: { p256dh: it.p256dh, auth: it.auth } },
            JSON.stringify(reminderPayload(it.lang)),
            { TTL: 60 * 60, urgency: "normal", topic: "reading-reminder" },
          );
          sent++;
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.push(it.endpoint);
          else failed++;
        }
      }),
    );
  }
  if (gone.length) await rpc("drop_push_subscriptions", { p_secret: secret, p_endpoints: gone });

  return Response.json({ ok: true, due: items.length, sent, failed, dropped: gone.length, at: new Date().toISOString() });
}
