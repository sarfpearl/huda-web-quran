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
