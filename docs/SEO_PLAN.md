# Google Search plan (2026-11-18)

Goal: HuDa shows up when people search for it, and for Surah searches.

## What is realistic

| Search | Today | Realistic target |
|---|---|---|
| `huda guidance`, `hudaguidance` | #1 (own domain) | Stay #1, with the logo (PR #258) |
| `surah yasin tamil`, `surah mulk audio tamil`, `யாசீன் சூரா` | not ranked | First page within months — few strong sites cover Tamil + audio |
| `surah yasin`, `surah kahf` | not ranked | Page 2–5 at best; Quran.com, Wikipedia and big apps hold page 1 |
| `quran`, `surah` alone | not ranked | Not reachable soon. These are the most competitive Islamic searches worldwide; it takes years of links and traffic |

So the plan aims at **brand + "Surah name + Tamil / audio / translation"**
searches, where a new site can win.

## Step 1 — titles, descriptions, headings (code, `feat/seo-surah-pages`)

- `<title>`: `Surah Ya-Sin (يس) · Tamil & English Translation, Audio · HuDa`.
- Description: English meaning, Tamil name (யாஸீன்), verse count, what the page
  offers.
- An `<h1>` per page (hidden, for search engines and screen readers; the app
  keeps its own look).
- `HuDa Guidance` as an alternate site name in structured data.
- The tab title while playing, share cards and breadcrumbs keep the short title.

## Step 2 — readable Surah text Google can see (needs the owner's design choice)

Today a Surah page gives Google about 300 characters: the ayat and the
translations load inside the full-screen app. Pages with the full Arabic text
and translations rank far better. Options:

- **A. A reading page per Surah** (e.g. `/surah/36/read`): plain, scrollable
  Arabic + Tamil + English, a "Listen in HuDa" button, linked from the app's
  Surah page. Built at deploy time from `public/data/quran-verses`. No change
  to the app's look. **Recommended.**
- B. A collapsible "Read the text" panel inside the app on the Surah page.
- Hidden text under the app is **not** an option: Google treats it as cloaking.

## Step 3 — later code work

- Ayah pages are canonical to their Surah today. Once reading pages exist,
  famous ayat (Ayat al-Kursi 2:255, last two of Al-Baqarah…) could get their
  own pages.
- Tamil-language titles on the reading pages (`சூரா யாஸீன் தமிழ் மொழிபெயர்ப்பு`).

## Step 4 — the owner, outside the code

1. **Search Console** (done 2026-11-18): verify, request indexing, sitemap.
   Check on 2026-11-20 that the sitemap reads Success.
2. **Bing Webmaster Tools** — sign in, "Import from Google Search Console".
   Also feeds DuckDuckGo and ChatGPT search.
3. **Links to the site** — the strongest signal after content:
   Instagram / YouTube / X / WhatsApp channel bios with `https://www.hudaguidance.com`,
   posts that link to a specific Surah page, masjid / community groups.
4. **Listings** — Islamic app directories, Product Hunt, AlternativeTo
   ("Quran.com alternative").
5. Then wait: new domains take 3–6 months to rank for anything competitive.
