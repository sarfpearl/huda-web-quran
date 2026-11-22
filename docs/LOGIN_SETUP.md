# Login — Phase 1 அமைப்பு (owner படிகள்)

> முடிவு ஆவணம்: `docs/LOGIN_STRATEGY.md` (owner ஒப்புதல் 2026-11-21).
> Code: `src/lib/auth/account.ts`, `src/components/home/AccountPage.tsx`, `src/app/auth/callback/`, `src/app/privacy/`.
> எல்லாம் இலவச tier. Card எதுவும் தேவையில்லை.

## இந்த PR-ல் என்ன உள்ளது

- Settings-ன் மேலே **Account** அட்டை → Account பக்கம்: Google, email link மூலம் sign in; sign out; **account நீக்கம்**.
- `/auth/callback` — Google / email link திரும்பி வரும் பக்கம்.
- `/privacy` — தனியுரிமைக் கொள்கை (English + தமிழ்).
- Supabase client **தேவைப்படும்போது மட்டும்** load ஆகும் (`import()`), guest-களின் home page-ல் இல்லை.
- **Production-ல் மறைவு:** `NEXT_PUBLIC_LOGIN=on` வைக்கும் வரை Account அட்டை production-ல் தெரியாது; preview / local-ல் மட்டும் தெரியும்.
- Sync (படித்த இடம், bookmarks) **இன்னும் இல்லை** — Phase 2. அதுவரை account பக்கம் "விரைவில்" என்று சொல்லும்.

## Owner செய்ய வேண்டியவை (Supabase dashboard)

இன்றைய நிலை (2026-11-21, public settings-ல் பார்த்தது): **new sign-ups off**, **Google off**, email on.
அதனால் இப்போது preview-ல் **admin email மட்டும்** email link மூலம் உள்நுழைய முடியும்.

1. **SQL editor** → `supabase/migrations/20261121120000_account_delete.sql`-ஐ run செய்யுங்கள் (Delete account-க்கு).
2. **முன்-சோதனை (sign-ups திறக்கும் முன்):** SQL editor-ல் இதை run செய்து, `authenticated`-க்கு எழுத / படிக்க அனுமதி தரும் பழைய policy ஏதும் உள்ளதா என்று பாருங்கள் (பழைய Bayan tables DB-ல் இன்னும் இருக்கலாம்):
   ```sql
   select schemaname, tablename, policyname, cmd, roles, qual
   from pg_policies
   where schemaname in ('public', 'storage')
     and ('authenticated' = any(roles) or 'public' = any(roles));
   ```
   `is_admin()` இல்லாமல் `authenticated` / `public`-க்குத் திறந்த policy இருந்தால் Claude-இடம் காட்டுங்கள் — sign-ups திறக்கும் முன் மூட வேண்டும்.
3. **Authentication → URL Configuration**
   - Site URL: `https://www.hudaguidance.com`
   - Redirect URLs-ல் சேர்க்க:
     - `https://www.hudaguidance.com/auth/callback`
     - `https://huda-web-quran-git-*-hu-da-right-guidance.vercel.app/auth/callback` (previews)
     - `http://localhost:3000/auth/callback`
4. **Google sign-in** (இலவசம்):
   - Google Cloud Console → புதிய project "HuDa" → *OAuth consent screen*: External; app பெயர் "HuDa"; logo (`public/Huda_Logo_Master.png`-லிருந்து 120×120); support email; app domain `hudaguidance.com`; privacy policy `https://www.hudaguidance.com/privacy`. Scopes: `email`, `profile`, `openid` மட்டும்.
   - *Credentials* → OAuth client ID → Web application. Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback` (Supabase-ன் Google provider பக்கத்தில் காட்டும் அதே URL).
   - Supabase → Authentication → Providers → **Google**: Client ID + Secret ஒட்டி Enable.
5. **New sign-ups திறக்க:** Authentication → Sign In / Providers → "Allow new users to sign up" → ON (படி 2 சரியான பின்).
6. **Email அனுப்புதல்:** Supabase-ன் built-in mailer = மணிக்கு 2 email, team-க்கு மட்டும். பொதுமக்களுக்குத் திறக்கும் முன் Brevo free SMTP (நாளுக்கு 300) அமைக்க வேண்டும் — தனி படி (Brevo கணக்கு + Cloudflare DNS-ல் SPF / DKIM).
7. **Production-ல் காட்ட:** Vercel → Settings → Environment Variables → `NEXT_PUBLIC_LOGIN` = `on` (Production) → redeploy. **Phase 2 (sync) வந்த பிறகே** இதைச் செய்வது நல்லது.

## சோதிக்க (preview)

- Settings → மேலே "Save your progress across devices" அட்டை → Account பக்கம்.
- Email: admin email போட்டு "Continue with email" → mail-ல் link → இதே browser-ல் திற → Settings-ல் உங்கள் email தெரியும்.
- Google: படி 4 முடிந்த பின் மட்டும் (அதுவரை பொத்தான் மங்கலாக, "இன்னும் அமைக்கப்படவில்லை").
- Delete account: admin account-ல் சோதிக்க **வேண்டாம்** (admin உரிமையும் போய்விடும்). வேறு சோதனை email-ல் மட்டும் (படி 5-க்குப் பின்).

---

# Phase 2 — sync + Google-ன் சொந்த பொத்தான் (2026-11-22)

Code: `src/lib/auth/sync.ts`, `src/lib/auth/account.ts` (`renderGoogleButton`), `src/components/home/AccountPage.tsx`, migration `20261122120000_user_sync.sql`.

## என்ன மாறியது

- **Sync:** login ஆனவருக்கு கடைசியாகப் படித்த இடம், கேட்டு நிறுத்திய இடம் (home-ன் "Continue"), bookmark, settings (மொழி, மொழிபெயர்ப்பு, பொருள் audio, script, Tajweed, reciter, repeat முறை, theme, பின்னணி மங்கல், தொழுகை கணக்கு முறை, comment பெயர், tour) எல்லா சாதனங்களிலும் வரும். எழுத்து அளவு phone / பெரிய திரைக்குத் தனித்தனி. இடம் (location), volume, reminders sync ஆகாது.
- ஒவ்வொன்றுக்கும் **புதிய மாற்றம் வெல்லும்**. Browser-ல் உடனே சேமிக்கப்படும்; பின்னணியில் account-க்கு. வேறு சாதனத்தின் settings வந்தால் page ஒருமுறை reload ஆகும் (எதுவும் ஓடாதபோது மட்டும், நிமிடத்துக்கு ஒருமுறைக்கு மேல் இல்லை). படித்த / கேட்ட இடம், bookmark reload இல்லாமலே வரும். **இரண்டு browser-லும் login செய்திருக்க வேண்டும்.**
- **Sign out:** "இந்தச் சாதனத்தில் வை" / "இந்தச் சாதனத்திலிருந்து நீக்கு" என்று கேட்கும்.
- **Google பொத்தான்:** Google-ன் சொந்த "Sign in with Google" (Google Identity Services). Google திரையில் supabase.co-க்குப் பதிலாக நம் தளம் காட்டும்; brand verification-க்குப் பின் "HuDa Web Quran". Home Screen-ல் install செய்த iPhone app-ல் மட்டும் பழைய redirect வழி.
- "Signed in with email" பிழை திருத்தம்: கடைசியாகப் பயன்படுத்திய வழி (Google / email) காட்டும்.

## Owner படிகள்

1. **Supabase → SQL Editor:** `supabase/migrations/20261122120000_user_sync.sql` முழுவதையும் run செய்யுங்கள் ("Success. No rows returned").
2. **Google Cloud → Google Auth Platform → Clients → HuDa Web → Authorized JavaScript origins**-ல் சேர்க்க (wildcard ஏற்காது, ஒவ்வொன்றும் தனியாக):
   - `https://www.hudaguidance.com` (ஏற்கனவே உள்ளது)
   - `https://hudaguidance.com`
   - `http://localhost:3000`
   - இந்த PR-ன் preview: `https://huda-web-quran-git-feat-login-sync-hu-da-right-guidance.vercel.app`
   Save. (சில நிமிடங்கள் ஆகலாம்.)
3. **Brand verification (பெயர் + logo காட்ட; இலவசம், Google சில நாட்கள் எடுக்கும்):** Google Auth Platform → **Branding**
   - App name: `HuDa Web Quran`
   - User support email, Developer contact email: உங்கள் Gmail
   - App logo: 120×120 (`public/Huda_Logo_Master.png`-லிருந்து)
   - Application home page: `https://www.hudaguidance.com`
   - Privacy policy: `https://www.hudaguidance.com/privacy`
   - Authorised domains: `hudaguidance.com` (Search Console-ல் அதே Google கணக்கில் verify ஆகியிருக்க வேண்டும்)
   Save → Verification Centre → "Submit for verification".
4. **Publish app:** Audience → **Publish app** (test users மட்டும் என்பது நீங்கும்). Live போகும் நாளில்.
