# Quran-reading reminders

Settings › **Reminders**: the user picks one or more times ("6:30 AM") and turns
each on or off. At that time, in the user's own time zone, a notification arrives
in the app's current language. Free tiers only (Supabase cron + Vercel function).

## Where it shows

| Device | What the user sees |
| :--- | :--- |
| Installed app (any platform) | the reminder list |
| Android / desktop browser (Chrome, Edge, Firefox, Safari on Mac) | the reminder list |
| iPhone / iPad Safari, not installed | "Install the app to turn on reminders" → opens the Add to Home Screen guide (iOS has Web Push only for Home Screen apps, iOS 16.4+) |
| Old / in-app browsers without Web Push | "This browser can't show notifications" |

Notification permission is asked only when the user adds a reminder or turns
one on — never on page load. The Add to Home Screen guide has a line saying the
installed app gives notifications and reading reminders.

## How it works

1. `src/components/home/RemindersPage.tsx` → `src/lib/reminders/push.ts`: asks
   permission, subscribes with `/sw.js` (VAPID public key), saves the whole list
   with `save_reading_reminders` (Supabase, anon RPC). localStorage
   `huda-reminders` keeps the list (`src/lib/reminders/store.ts` has its shape) so
   the later optional login can sync it; `push_subscriptions.user_id` is there
   for that link.
2. On every open and when leaving the page, `resyncReminders()`
   (`ServiceWorker.tsx`) re-saves when the app language, time zone or push
   endpoint changed — so the notification follows the language picked.
3. Supabase **pg_cron** calls `GET /api/reminders/send` every minute (Bearer
   `REMINDER_CRON_TOKEN`). The route calls `claim_due_reading_reminders`
   (secret `REMINDER_SECRET`): reminders whose time came within the last 15
   minutes in their own zone and not sent in the last hour, marked as sent in the
   same statement (no double sends). It pushes each with `web-push`, and removes
   endpoints the push service says are gone (404 / 410).
4. `public/sw.js` shows the push (`push`) and opens / focuses HuDa on a tap
   (`notificationclick`).

Text of the notification: `src/lib/reminders/messages.ts` (10 languages).
Settings labels: `src/lib/i18n/reminders.ts`.

## Owner setup (once)

1. **VAPID keys** (on the Mac, in the repo):
   ```bash
   npx web-push generate-vapid-keys
   ```
2. **Two secrets**:
   ```bash
   openssl rand -hex 32
   ```
   ```bash
   openssl rand -hex 24
   ```
   The first is `REMINDER_SECRET`, the second `REMINDER_CRON_TOKEN`.
3. **Vercel → Settings → Environment Variables** (Production and Preview):

   | Name | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID "Public Key" |
   | `VAPID_PRIVATE_KEY` | VAPID "Private Key" (Sensitive) |
   | `VAPID_SUBJECT` | optional, `mailto:you@example.com` (default `https://www.hudaguidance.com`) |
   | `REMINDER_SECRET` | step 2, first value (Sensitive) |
   | `REMINDER_CRON_TOKEN` | step 2, second value (Sensitive) |

   Redeploy after adding them (`NEXT_PUBLIC_*` is built into the page).
4. **Supabase SQL editor**: run
   `supabase/migrations/20261115120000_reading_reminders.sql`, then the hash of
   `REMINDER_SECRET` and the cron job exactly as its header says (steps 2 and 4).
   pg_cron and pg_net are free on the Free plan (Database → Extensions).

Keep the same VAPID keys forever: new keys make every saved subscription stop
working (users would have to turn reminders on again).

## Checks

- `node --test tests/reminders/reminders.test.mjs`
- After setup: Settings › Reminders → add a time 2 minutes from now → the
  notification arrives. `select * from cron.job_run_details order by start_time desc limit 5;`
  shows the cron calls; the route answers `{"ok":true,"due":…,"sent":…}`.
- Free-tier use: 1 call a minute ≈ 43,200 Vercel function calls a month (Hobby
  allows 1,000,000), each a few hundred ms mostly waiting on the network.
