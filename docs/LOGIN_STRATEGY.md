# HuDa — Login திட்டம் (முடிவு எடுப்பதற்கான ஆவணம்)

> **தேதி:** 2026-11-15 · **மீண்டும் சரிபார்த்தது:** 2026-11-21 (main-ன் இப்போதைய code-உடன்) · **நிலை:** owner முடிவுக்காக (code எதுவும் இல்லை)
> **மூலம்:** `docs/NEXT_TASKS_2026_11_15.md` → task 6
> விலை / limit எல்லாம் 2026-11-15 அன்று provider-களின் சொந்தப் பக்கங்களில் சரிபார்த்தவை (கடைசிப் பகுதியில் links).
> **[கருத்து]** என்று குறித்தவை என் மதிப்பீடு — ஆதாரம் காட்டிய உண்மை அல்ல.

---

## 0. சுருக்கம் (ஒரே பார்வையில்)

| கேள்வி | பரிந்துரை |
| :--- | :--- |
| Login கட்டாயமா? | **இல்லை.** Guest-ஆகவே எல்லாம் வேலை செய்யும்; login விருப்பம் மட்டும் *(owner ஏற்கனவே முடிவு)* |
| எந்த வழிகள்? | Google + Apple + email (magic link). Phone OTP இப்போது இல்லை *(owner முடிவு)* |
| ஒரே login backend எது? | **Supabase Auth** — web-லும், வரப்போகும் mobile app-லும் ஒன்றே |
| Firebase என்ன ஆகும்? | Mobile app-ல் push notification, crash report போன்றவற்றுக்கு Firebase இருக்கலாம்; **login மட்டும் Supabase** |
| Email அனுப்ப | Supabase-ன் built-in mailer போதாது → **Brevo free SMTP** (300/நாள்) |
| செலவு | இப்போது ₹0. Apple sign-in-க்கு Apple Developer கணக்கு **US$99/ஆண்டு** (mobile app-க்கு எப்படியும் தேவை) |
| முதல் படி | Phase 1–2: web-ல் Google + email login, last read + bookmarks sync |

---

## 1. பிரச்சனை

ஒருவர் ஒரு phone-ல் படிக்கிறார். App-ஐ நீக்கினாலோ, phone மாற்றினாலோ, **எங்கே நிறுத்தினோம் என்று தெரியாது.**
காரணம்: இன்று last read (`src/lib/lastRead.ts`), bookmarks, settings எல்லாம் **அந்த browser-ன் `localStorage`-ல் மட்டும்** இருக்கின்றன. Browser data அழிந்தால் அவையும் போய்விடும்.

---

## 2. ஏன் "விருப்ப login" (optional login)?

| வழி | நன்மை | தீமை |
| :--- | :--- | :--- |
| Login இல்லவே இல்லை (இன்று) | எளிது, முழு privacy | phone மாறினால் எல்லாம் போகும் — இதுதான் இப்போதைய பிரச்சனை |
| **கட்டாய login** | எல்லோருக்கும் sync | முதல் திரையிலேயே பலர் விலகுவார்கள்; "குர்ஆன் படிக்க ஏன் என் email?" என்ற நம்பிக்கைக் குறைவு; iOS app-ல் Apple விதிக்கும் முரண் (கீழே) |
| **விருப்ப login** ✅ | படிக்க உடனே திறக்கும்; வேண்டியவர் மட்டும் login செய்து sync பெறுவார் | இரண்டு நிலைகளையும் (guest / logged in) code கையாள வேண்டும் |

ஆதாரத்துடன் சொல்லக்கூடியவை:
- **Apple App Store விதி 5.1.1(v):** "app-ல் கணிசமான account-அடிப்படை அம்சங்கள் இல்லையென்றால், login இல்லாமல் பயன்படுத்த விட வேண்டும்." குர்ஆன் படித்தல் / கேட்டல் account இல்லாமலே நடக்கும் — எனவே கட்டாய login iOS app review-ல் சிக்கலாகலாம்.
- அதே விதி: **account உருவாக்க அனுமதித்தால், app-க்குள்ளேயே account delete செய்யவும் வழி இருக்க வேண்டும்.**

என் மதிப்பீடு:
- **[கருத்து]** பெரிய குர்ஆன் app-கள் (Quran.com, Muslim Pro போன்றவை) login இல்லாமல் படிக்க விடுகின்றன; login "sync / backup"-க்கு மட்டும். பயனர்கள் இதையே எதிர்பார்ப்பார்கள்.
- **[கருத்து]** கட்டாய sign-up திரையில் கணிசமானோர் விலகுவது app உலகில் பரவலாக அறியப்பட்டது; ஆனால் HuDa-க்கான துல்லிய எண் என்னிடம் இல்லை — எண் எதுவும் சொல்லவில்லை.
- **[கருத்து]** மத app-ல் privacy நம்பிக்கை முக்கியம்: "நாங்கள் உங்கள் படிப்பு இடம், bookmarks, settings மட்டும் சேமிக்கிறோம்; விளம்பரம் இல்லை, விற்பனை இல்லை" என்று தெளிவாகச் சொல்ல வேண்டும்.

---

## 3. முக்கிய முடிவு: எந்த login backend?

Web இன்று **Supabase** (comments, views, admin dashboard login — `src/components/admin/DashboardView.tsx` ஏற்கனவே Supabase email magic link பயன்படுத்துகிறது).
Owner-ன் இப்போதைய mobile app **Firebase** (Blaze plan).
ஒரே account web ↔ app இரண்டிலும் வேலை செய்ய, **இரண்டும் ஒரே login backend பயன்படுத்த வேண்டும்.**

### 3.1 ஒப்பீடு

| அம்சம் | A. Supabase Auth ✅ | B. Firebase Auth | C. இரண்டும் + bridge |
| :--- | :--- | :--- | :--- |
| இலவச MAU (மாதம் login செய்தவர்கள்) | **50,000** (Free plan) | **50,000** (Spark / Blaze) | Firebase-ன் 50K |
| அதற்கு மேல் | Pro **$25/மாதம்** → 100,000 MAU சேர்த்து, பின் **$0.00325/MAU** | Google Cloud Identity Platform விலை — பக்கத்தின் cached பதிப்புகள் முரண்படுகின்றன (ஒன்றில் 50K–100K: $0.0055/MAU); live பக்கத்தில் சரிபார்க்கவும் | Firebase விலை + Supabase |
| Sync data எங்கே? | அதே Supabase Postgres (ஏற்கனவே web-க்கு உள்ளது) — 500 MB இலவசம் | Firestore — 1 GiB, 50K reads / 20K writes **ஒரு நாளுக்கு** இலவசம்; Blaze-ல் அதற்கு மேல் billing | Data Supabase-ல்; login Firebase-ல் |
| Web-ல் வேலை | சிறியது: Supabase client ஏற்கனவே உள்ளது | பெரியது: web-ல் புதிதாக Firebase SDK + Firestore; இப்போதைய Supabase data-வுடன் இரண்டு உலகம் | நடுத்தரம்; ஆனால் அமைப்பு சிக்கல் |
| Email magic link | உண்டு; custom SMTP தேவை (கீழே §7.2) | உண்டு; Spark-ல் **5 email/நாள்** மட்டும், Blaze-ல் 25,000/நாள் | Firebase |
| Google sign-in (web / Android / iOS) | ✅ (native-ல் `signInWithIdToken`) | ✅ | ✅ |
| Apple sign-in (web / Android / iOS) | ✅ iOS native ID token; web/Android OAuth (secret ஒவ்வொரு **6 மாதமும்** புதுப்பிக்க வேண்டும்) | ✅ | ✅ |
| Lock-in | குறைவு: Postgres + திறந்த மூல code; users table export செய்யலாம் | அதிகம்: Firestore data model, Google Cloud billing | இரண்டு vendor-க்கும் கட்டுப்பாடு |
| Billing அபாயம் | Free plan-ல் card இல்லை → எதிர்பாராத bill வராது | Blaze = pay-as-you-go; தவறான loop ஒரு bill உருவாக்கலாம் | Blaze அபாயம் |
| கவனிக்க | Free project 1 வாரம் சும்மா இருந்தால் pause — HuDa-வில் ஏற்கனவே தினசரி keep-alive cron உள்ளது (`/api/keepalive`) | — | Supabase-ன் "Third-party auth: Firebase" அம்சம்: Firebase token-ஐ Supabase ஏற்கும். ஆனால் ஒவ்வொரு Firebase user-க்கும் `role: authenticated` claim சேர்க்க Cloud Function வேண்டும்; புதிய user-ன் முதல் token-ல் claim இருக்காது (refresh தேவை) |

### 3.2 பரிந்துரை: **A — Supabase Auth, web-க்கும் app-க்கும் ஒன்றே**

காரணங்கள்:
1. Web data, admin, comments எல்லாம் ஏற்கனவே Supabase-ல் — login-உம் அங்கே இருந்தால் sync tables-ஐ **Row Level Security (RLS)** மூலம் "ஒவ்வொருவரும் தன் data-வை மட்டும் பார்க்கலாம்" என்று எளிதாகப் பூட்டலாம்.
2. **Free plan-ல் card இல்லை** → owner-ன் "free tier மட்டும்" விதிக்குப் பொருந்தும்; எதிர்பாராத bill இல்லை.
3. புதிய mobile app (web அம்சங்கள் எல்லாம் அதில் வரும்) Supabase-ன் iOS (Swift), Android (Kotlin), Flutter, React Native SDK-களைப் பயன்படுத்தலாம் — Google / Apple native sign-in எல்லாம் ஆதரிக்கப்படுகிறது.
4. **Firebase-ஐ முழுதாக விட வேண்டியதில்லை:** mobile app-ல் push notification (FCM), Crashlytics, Analytics போன்றவற்றுக்கு Firebase இருக்கலாம். அவற்றுக்கு Firebase Auth தேவையில்லை. **Login மட்டும் Supabase.**

எப்போது C (bridge) தேவைப்படும்?
- இப்போதைய Firebase app-ல் **ஏற்கனவே login செய்த உண்மையான users நிறைய இருந்தால்** மட்டும். அப்போது இரண்டு வழி:
  - Supabase-ன் `firebase-to-supabase` scripts மூலம் users-ஐ Supabase-க்கு நகர்த்துவது (Google/Apple இணைப்புகள் நகருமா என்று Supabase பக்கம் தெளிவாகச் சொல்லவில்லை — சோதித்துப் பார்க்க வேண்டும்), அல்லது
  - இடைக்காலமாக "Third-party auth: Firebase" bridge.
- **Owner சரிபார்க்க வேண்டியது:** இப்போதைய Firebase app-ல் login உண்டா? எத்தனை users? (§8)

---

## 4. இன்று browser-ல் என்ன சேமிக்கப்படுகிறது (inventory)

`src/`-ல் `localStorage` / `sessionStorage` / IndexedDB தேடியதில் கிடைத்தவை (IndexedDB இன்று பயன்படுத்தப்படவில்லை; `public/sw.js` offline-க்கு Cache Storage மட்டும்).

| Key | என்ன | Code | Sync? | எப்படி |
| :--- | :--- | :--- | :--- | :--- |
| `huda:last-read` | கடைசியாகப் படித்த Surah / ayah + நேரம் (`at`) | `src/lib/lastRead.ts` | ✅ **ஆம் (முதன்மை)** | புதிய `at` வெல்லும் |
| `huda:bookmarks` (+ பழைய `huda:bookmark`) | Bookmark பட்டியல் (Surah/Juz, ayah, `at`) | `src/lib/lastRead.ts` | ✅ ஆம் | ஒவ்வொரு bookmark-உம் தனி row (`bookmarkId`); இணைப்பு (union); நீக்கியதை "deleted" குறியோடு |
| `huda-ui-lang` | App மொழி | `src/lib/uiLang.tsx` | ✅ ஆம் | setting |
| `huda-translation-lang` | பொருள் (translation) மொழி | `ImmersiveHomeClient.tsx` | ✅ ஆம் | setting |
| `huda:show-meaning` | பொருள் காட்டு on/off | `ImmersiveHomeClient.tsx` | ✅ ஆம் | setting |
| `huda:meaning-audio` | பொருள் audio on/off, குரல், "மட்டும்" | `src/lib/data/meaningAudio.ts` | ✅ ஆம் | setting |
| `huda:script` | Uthmani / IndoPak | `src/lib/data/quranScript.ts` | ✅ ஆம் | setting |
| `huda:tajweed2` | Tajweed நிறங்கள் on/off | `ImmersiveHomeClient.tsx` | ✅ ஆம் | setting |
| `huda:reader-scale-v2` | எழுத்து அளவு | `ImmersiveHomeClient.tsx` | ⚠️ ஆம், **phone / பெரிய திரை தனித்தனியாக** | **[கருத்து]** phone-ன் அளவு desktop-க்குப் பொருந்தாது |
| `huda-selected-reciter` | தேர்ந்த reciter | `src/lib/data/quranReciters.ts` | ✅ ஆம் | setting |
| `huda-player:end-mode` | Repeat / shuffle / அடுத்தது | `AudioPlayerContext.tsx` | ✅ ஆம் | setting |
| `huda-player:prefs` | volume, mute, வேகம் (playbackRate) | `AudioPlayerContext.tsx` | ⚠️ வேகம் மட்டும் | volume / mute சாதனத்துக்குச் சொந்தம் |
| `huda-player:last` | கடைசியாக இசைத்த track | `AudioPlayerContext.tsx` | ❌ இல்லை (last-read போதும்) | — |
| `huda-player:positions` | பழைய Bayan நிலைகள் (Bayan நீக்கப்பட்டது) | `AudioPlayerContext.tsx` | ❌ இல்லை | பின்னர் நீக்கலாம் |
| `huda-theme` | Light / dark | `ThemeProvider.tsx` | ✅ ஆம் | setting |
| `huda-scene-dim` | பின்னணி video மங்கல் | `SceneOverlay.tsx` | ✅ ஆம் | setting |
| `huda:prayer-prefs` | தொழுகை நேரக் கணக்கு முறை, Asr madhab | `PrayerTimesSheet.tsx` | ✅ ஆம் | setting |
| `huda-place` | நகரம் / இடம் (prayer times-க்கு) | `TimeLocationWidget.tsx` | ❌ **இல்லை** | இடம் சாதனத்துடன் மாறும்; privacy — server-க்கு அனுப்ப வேண்டாம் |
| `huda-comment-name` | Comment-ல் போடும் பெயர் | `QuranEngagement.tsx` | ✅ ஆம் | account பெயர் இல்லாதபோது இதைப் பயன்படுத்தலாம் |
| `huda-install-dismissed` | "Home screen-ல் சேர்" மூடிய நேரம் | `InstallGuide.tsx` | ❌ இல்லை | சாதனத்துக்குச் சொந்தம் |
| `huda-session-id` | Anonymous listening analytics id | `src/lib/audio/session.ts` | ❌ **ஒருபோதும் இல்லை** | இது account-உடன் இணைக்கப்படக் கூடாது (analytics anonymous-ஆகவே இருக்கும்) |
| `huda:debug-audio` (sessionStorage) | Developer debug | `src/lib/audioDebug.ts` | ❌ | — |
| `huda-verses-v*` | பழைய cache (தானாக நீக்கப்படுகிறது) | `quranVerses.ts` | ❌ | — |
| Service worker caches | Offline pages / data | `public/sw.js` | ❌ | — |
| `huda-reminders` | Reading reminder நேரங்கள் (எ.கா. 06:30) + `updatedAt` | `src/lib/reminders/store.ts`, `push.ts` | ✅ **ஆம்** (owner கேட்டது) | முழுப் பட்டியல் ஒன்றாக; புதிய `updatedAt` வெல்லும். Code-ல் ஏற்கனவே "login பின்னர் sync செய்யும்" என்று வடிவமைக்கப்பட்டது |
| (server) `push_subscriptions` | ஒவ்வொரு browser-ன் push "முகவரி", time zone, மொழி | `supabase/migrations/20261115120000_reading_reminders.sql` | ❌ சாதனத்துக்குச் சொந்தம் | ஆனால் `user_id` column **ஏற்கனவே உள்ளது** (இப்போது null) — login ஆனதும் நிரப்பலாம் |
| `huda-tour-done` | முதல் வருகை tour பார்த்தாகிவிட்டது | `src/lib/tour/steps.ts` | ✅ ஆம் | **[கருத்து]** புதிய phone-ல் மீண்டும் tour தேவையில்லை; settings-ல் replay உள்ளது |
| `huda-support-way` | Support-ல் தேர்ந்த வழி (UPI / Ko-fi) | `src/lib/support.ts` | ✅ ஆம் | setting |
| `huda-feedback-peeked`, `huda-support-peeked` | Lantern / gift முதல் "peek" முடிந்தது | `src/lib/feedback.ts`, `src/lib/support.ts` | ❌ இல்லை | சாதனத்துக்குச் சொந்தம் |
| `huda-dots-look` | Splash loader-ன் சுழலும் தோற்றம் | `SplashScreen.tsx` | ❌ இல்லை | அலங்காரம் மட்டும் |
| OPFS (on-device files) | Record video ஓடும்போது chunks | `src/lib/record/chunkSink.ts` | ❌ ஒருபோதும் இல்லை | பெரிய video; server-க்கு அனுப்பக் கூடாது |

குறிப்புகள் (2026-11-21):
- Record video தரம் (1080p / 720p) **சேமிக்கப்படுவதில்லை** (`RecordStudio.tsx`-ல் `useState` மட்டும்) — பின்னர் சேமிக்கப்பட்டால் sync ✅ ஆம்.
- Feedback (`20261115121000_feedback.sql`), support taps (`20261120120000_support_taps.sql`) server tables anonymous — account-உடன் இணைக்க வேண்டாம்.

**விதி (எதிர்காலத்துக்கு):** புதிய setting சேர்க்கும்போது இந்த அட்டவணையில் "sync ஆம்/இல்லை" என்று ஒரு வரி சேர்க்க வேண்டும்.

---

## 5. Sync எப்படி வேலை செய்யும் (எளிய சொற்களில்)

### 5.1 அடிப்படை
- **சாதனமே முதல் இடம்:** எல்லாம் முன்போலவே `localStorage`-ல் உடனே சேமிக்கப்படும். App ஒருபோதும் server-க்காகக் காத்திருக்காது.
- Login செய்திருந்தால், பின்னணியில் Supabase-க்கு நகல் அனுப்பப்படும்.
- ஒவ்வொரு item-க்கும் "எப்போது மாற்றப்பட்டது" (`updated_at`) நேரம் இருக்கும். **இரண்டு சாதனங்களில் வேறுபட்டால் — புதிய மாற்றம் வெல்லும் (item வாரியாக).**
  - எ.கா.: phone-ல் theme = dark (9:00), laptop-ல் மொழி = Tamil (9:05) → இரண்டும் சேரும்; ஒன்று மற்றொன்றை அழிக்காது.
- Server-ல் இரண்டு எளிய tables **[கருத்து: வடிவமைப்பு]**:
  - `user_settings` — ஒவ்வொரு setting-க்கும் ஒரு row (`user_id`, `key`, `value`, `updated_at`).
  - `user_bookmarks` — ஒவ்வொரு bookmark-க்கும் ஒரு row (`deleted_at` உடன்; நீக்கியதும் மற்ற சாதனங்களுக்குத் தெரிய).
  - RLS: `user_id = auth.uid()` — ஒருவர் மற்றவரின் data-வைப் பார்க்க முடியாது.

### 5.2 முதல் login (சாதனத்தில் ஏற்கனவே guest data உள்ளது)
| நிலை | என்ன நடக்கும் |
| :--- | :--- |
| Account புதியது (server-ல் ஒன்றும் இல்லை) | இந்தச் சாதனத்தின் guest data முழுதும் account-க்கு ஏற்றப்படும். |
| Account-ல் ஏற்கனவே data உள்ளது | **இணைப்பு:** bookmarks — இரண்டும் சேரும்; settings — item வாரியாகப் புதியது வெல்லும்; last read — புதியது வெல்லும். |
| Last read வேறுபட்டால் | ஒரு சிறிய செய்தி: "மற்றொரு சாதனத்தில் Al-Kahf 18:45 வரை படித்தீர்கள் — அங்கிருந்து தொடரவா?" (தொடர் / இங்கேயே இரு). தானாகத் தாவாது. |

குறிப்பு: இன்று settings-க்கு மாற்ற நேரம் சேமிக்கப்படுவதில்லை (last read, bookmarks-க்கு மட்டும் `at` உண்டு). எனவே ஒரு சிறிய `huda:sync-meta` (key → மாற்ற நேரம்) சேர்க்க வேண்டும். பழைய settings-க்கு நேரம் இல்லையென்றால், முதல் login-ல் **server-ல் உள்ளது வெல்லும்** (பழைய சாதனத்தின் தெரியாத-வயது மதிப்பு புதியதை அழிக்காமல் இருக்க).

### 5.3 Offline
- Offline-ல் எல்லாம் வழக்கம்போல் வேலை செய்யும்; மாற்றங்கள் ஒரு "அனுப்ப வேண்டியவை" பட்டியலில் காத்திருக்கும்.
- Internet வந்ததும் / app மீண்டும் திறந்ததும் அனுப்பப்படும்; அப்போதும் "புதியது வெல்லும்" விதி.
- **[கருத்து]** Realtime (உடனடி live sync) தேவையில்லை — app திறக்கும்போதும், tab-க்கு மீண்டும் வரும்போதும் இழுத்தால் போதும். இது Supabase free limits-க்குள் வசதியாக இருக்கும்.

### 5.4 Logout
- இரண்டு தேர்வுடன் கேட்கும்: **"இந்தச் சாதனத்தில் வைத்திரு"** (guest-ஆகத் தொடரும்) / **"இந்தச் சாதனத்திலிருந்து நீக்கு"** (பகிர்ந்த / பிறரின் phone-க்கு).
- Server-ல் உள்ள data அப்படியே இருக்கும்; மீண்டும் login செய்தால் திரும்ப வரும்.

### 5.5 Account நீக்கம் (Apple-க்குக் கட்டாயம்)
- Settings → Account → "Account-ஐ நீக்கு" — உறுதிப்படுத்திய பின்:
  - Supabase-ல் user + அவரது எல்லா sync rows நீக்கப்படும் (`on delete cascade`).
  - கவனம்: இன்றைய `push_subscriptions.user_id` = `on delete set null` — user நீக்கினால் row நிற்கும், இணைப்பு மட்டும் போகும். Account நீக்கம் அந்த user-ன் push subscriptions + reminders-ஐயும் வெளிப்படையாக நீக்க வேண்டும் (அல்லது Phase 3-ல் `cascade` ஆக மாற்ற).
  - Apple-ல் login செய்தவருக்கு Apple token-ஐயும் revoke செய்ய வேண்டும் **[கருத்து: Apple-ன் account deletion வழிகாட்டுதல்; app கட்டும்போது சரிபார்க்க]**.
  - சாதனத்தில் உள்ள data guest data-வாகத் தொடரும் (விரும்பினால் அதையும் நீக்கலாம்).
- Web-லும் அதே பொத்தான் இருக்கும் (ஒரே account).

---

## 6. UI — login எங்கே, என்ன சொற்கள்?

### 6.1 இடம் (படிப்பைத் தொந்தரவு செய்யாமல்)
| இடம் | என்ன | எப்போது |
| :--- | :--- | :--- |
| **Settings பக்கத்தின் மேலே ஒரு அட்டை** (முதன்மை) | "உங்கள் படிப்பை எல்லா சாதனங்களிலும் சேமியுங்கள்" + "Sign in" | எப்போதும்; login ஆனதும் பெயர் / email + "Synced ✓" |
| Bookmarks panel-ன் கீழே ஒரு மெல்லிய வரி | "Bookmarks-ஐ இழக்காமல் இருக்க sign in செய்யுங்கள்" | **முதல் bookmark போட்ட பிறகு மட்டும்**; மூடினால் மீண்டும் வராது |
| ❌ வேண்டாம் | Onboarding-ல், reading திரையில் popup, audio ஓடும்போது | — |

- Onboarding (splash → location → install guide) + புதிய tour ஏற்கனவே நீளம்; login அதில் சேர்க்க வேண்டாம்.
- Sign-in sheet: மூன்று பொத்தான்கள் — **Continue with Apple / Continue with Google / Continue with email**. Apple-ம் Google-ம் சம அளவு, சம இடம் (Apple விதி 4.8 "equivalent option").
- கீழே ஒரு வரி: "நாங்கள் சேமிப்பது: படித்த இடம், bookmarks, settings மட்டும். விளம்பரம் இல்லை." + Privacy policy link.

### 6.2 சொற்கள்
| English (மூல) | தமிழ் |
| :--- | :--- |
| Save your progress across devices | உங்கள் படிப்பை எல்லா சாதனங்களிலும் சேமியுங்கள் |
| Sign in to keep your last read, bookmarks and settings on every phone and computer. | Sign in செய்தால், கடைசியாகப் படித்த இடம், bookmarks, settings எல்லாம் உங்கள் எல்லா phone, computer-லும் கிடைக்கும். |
| Optional — HuDa works fully without an account. | விருப்பம் மட்டுமே — account இல்லாமலும் HuDa முழுமையாக வேலை செய்யும். |
| Continue from Al-Kahf 18:45? (read on another device) | Al-Kahf 18:45-லிருந்து தொடரவா? (மற்றொரு சாதனத்தில் படித்தது) |
| Synced | சேமிக்கப்பட்டது ✓ |

மற்ற 8 மொழிகளுக்கும் இப்போதைய `t(lang, "English")` (`src/lib/i18n/`) முறையில் மொழிபெயர்ப்பு.

### 6.3 Bundle அளவு
`src/lib/supabase/rpc.ts` இன்று வேண்டுமென்றே முழு Supabase client-ஐத் தவிர்க்கிறது (home page-லிருந்து ~60 KB gzipped குறைவு). Login code-ஐ **பயனர் sign-in sheet திறக்கும்போதோ, ஏற்கனவே login ஆன session இருக்கும்போதோ மட்டும்** load செய்ய வேண்டும் — guest-களுக்கு page வேகம் மாறக்கூடாது.

**2026-11-21 கண்டது:** `src/lib/supportTaps.ts` (support UPI PR) முழு client-ஐ (`src/lib/supabase/client.ts` → `@supabase/ssr`) import செய்கிறது; அது `SupportSheet` → `ImmersiveHomeClient.tsx` வழியாக home page-ல் நேரடியாக (static import) வருகிறது. எனவே இந்தச் சேமிப்பு இப்போது போயிருக்கலாம். Login-க்கு முன் இதை `rpc.ts` வழிக்கு மாற்றவோ / lazy ஆக்கவோ வேண்டும் (தனி சிறிய perf PR).

---

## 7. கூடவே வரும் தேவைகள்

### 7.1 Apple
- **App Store விதி 4.8:** iOS app-ல் Google போன்ற third-party login இருந்தால், அதற்குச் சமமான, privacy காக்கும் இன்னொரு login (நடைமுறையில் **Sign in with Apple**) கட்டாயம். Owner ஏற்கனவே Apple-ஐ web-லும் சேர்க்க முடிவு செய்தார் — நல்லது: ஒரே account எல்லா இடத்திலும்.
- **Apple Developer Program: US$99 / ஆண்டு** (உள்ளூர் நாணயத்திலும்). இலாப நோக்கற்ற நிறுவனங்களுக்கு fee waiver உண்டு — HuDa ஒரு பதிவு செய்த nonprofit என்றால் மட்டும் பொருந்தும். Sign in with Apple அமைக்க இந்தக் கணக்கு தேவை. Mobile app-ஐ App Store-ல் போட எப்படியும் தேவை.
- Web / Android-ல் Apple login (OAuth) secret **ஒவ்வொரு 6 மாதமும்** `.p8` key-லிருந்து புதுப்பிக்க வேண்டும் — தவறினால் Apple login நின்றுவிடும். → `docs/TODO.md`-ல் நினைவூட்டல் + dashboard-ல் காட்டலாம்.
- Apple "Hide my email" தேர்ந்தால் `@privaterelay.appleid.com` முகவரி வரும்; அதற்கு email அனுப்ப, அனுப்பும் domain-ஐ Apple-ல் பதிவு செய்ய வேண்டும்.

### 7.2 Email magic link — அனுப்பும் வரம்பு
| வழி | இலவச வரம்பு | குறிப்பு |
| :--- | :--- | :--- |
| Supabase built-in mailer | **2 email / மணி**, project team உறுப்பினர்களுக்கு மட்டும் | Production-க்குப் பயன்படாது (இன்று admin login-க்கு மட்டும் சரி) |
| **Brevo** free (SMTP) ✅ | **300 email / நாள்** (~9,000/மாதம்) | card இல்லை; பரிந்துரை |
| Resend free | 3,000 / மாதம், **100 / நாள்**, 3 domains | மாற்று |
| Custom SMTP அமைத்ததும் Supabase | தொடக்கத்தில் **30 / மணி** | Supabase dashboard → Rate Limits-ல் உயர்த்தலாம் |
| (ஒப்பீடு) Firebase email link | Spark **5 / நாள்**, Blaze 25,000 / நாள் | — |

- **[கருத்து]** பெரும்பாலோர் Google / Apple பயன்படுத்துவார்கள்; email பின்னால் வரும் வழி. 300/நாள் தொடக்கத்துக்குப் போதும்.
- Domain `hudaguidance.com`-ல் SPF / DKIM records (**Cloudflare DNS** — domain GoDaddy-ல் பதிவு, DNS Cloudflare-ல்) சேர்க்க வேண்டும் — இல்லையென்றால் email spam-க்குப் போகும். அனுப்புநர்: எ.கா. `login@hudaguidance.com`.
- Admin dashboard login-உம் அதே SMTP வழியாகப் போகும் — பாதிப்பு இல்லை.

### 7.3 Privacy policy
இன்று (2026-11-21) site-ல் privacy policy பக்கம் இன்னும் **இல்லை** (`src/app/`-ல் route இல்லை). Login-க்கு முன் தேவை (Google OAuth consent screen, Apple, App Store எல்லாம் கேட்கும்). அதில்:
- என்ன சேமிக்கிறோம் (email, பெயர், login வழி; படித்த இடம், bookmarks, settings, reminder நேரங்கள்).
- என்ன **சேமிக்கவில்லை** (இடம் / location server-க்குப் போகாது; analytics anonymous, account-உடன் இணைக்கப்படாது).
- எங்கே (Supabase; region), யாருடன் பகிர்கிறோம் (யாருடனும் இல்லை; email அனுப்ப Brevo).
- நீக்குவது எப்படி (app-க்குள் "Account-ஐ நீக்கு").
- தொடர்பு email.
- Google Cloud-ல் OAuth consent screen-க்கு app பெயர், logo, privacy link, homepage தேவை.

---

## 8. கட்டங்கள் (phases) + தோராய வேலை

வேலை அளவு = ஒரு Claude session-ல் தோராய நாட்கள் **[கருத்து]**; ஒவ்வொன்றும் தனி PR → preview → owner OK → merge.

| Phase | என்ன | தோராய வேலை | Owner தர வேண்டியது |
| :--- | :--- | :--- | :--- |
| **0. முடிவுகள்** | இந்த ஆவணத்தில் §9 பதில்கள் | — | §9 |
| **1. Login அடித்தளம் (web)** | Privacy policy பக்கம்; Brevo SMTP + DNS; Supabase Auth: Google + email; Settings அட்டை, sign-in sheet, account பக்கம், logout, **account நீக்கம்**; lazy-load | 2–3 நாள் | Google Cloud OAuth client; Brevo கணக்கு; Cloudflare DNS அணுகல் |
| **2. Last read + bookmarks sync** | Tables + RLS, முதல்-login இணைப்பு, "இங்கிருந்து தொடரவா?", offline queue | 2–3 நாள் | Preview-ல் இரண்டு சாதனங்களில் சோதனை |
| **3. எல்லா settings + reminders sync** | `user_settings`, `huda:sync-meta`, §4 அட்டவணைப்படி; `huda-reminders` sync; `push_subscriptions.user_id` (column ஏற்கனவே உள்ளது) நிரப்புதல் | 2 நாள் | — |
| **4. Apple sign-in (web)** | Services ID, `.p8` key, 6-மாத secret நினைவூட்டல், relay email | 1 நாள் | Apple Developer கணக்கு ($99) |
| **5. Mobile app** | App-ல் Supabase SDK, native Google + Apple; Firebase-ல் login users இருந்தால் migration அல்லது bridge | App திட்டத்தோடு; migration இருந்தால் +2–4 நாள் | Firebase users எண்ணிக்கை; app எந்த தொழில்நுட்பம் (Swift / Kotlin / Flutter / React Native) |

Phase 4-ஐ Phase 1-உடன் சேர்க்கலாம் — Apple கணக்கு அப்போதே தயாராக இருந்தால்.

---

## 9. Owner முடிவு செய்ய / தர வேண்டியவை (சுருக்கப் பட்டியல்)

1. **Login backend = Supabase Auth** (web + app) — ஒப்புதலா?
2. இப்போதைய **Firebase mobile app-ல் login உண்டா? எத்தனை users?** (இல்லை / குறைவு என்றால் migration தேவையில்லை)
3. **Apple Developer கணக்கு** ($99/ஆண்டு) — ஏற்கனவே உண்டா? எந்தப் பெயரில் (தனிநபர் / நிறுவனம்)?
4. **Brevo** கணக்கு (இலவசம்) உருவாக்க ஒப்புதல்; அனுப்புநர் முகவரி (எ.கா. `login@hudaguidance.com`).
5. **Google Cloud** OAuth consent screen-க்கு: app பெயர் "HuDa", logo (`public/Huda_Logo_Master.png`-லிருந்து resize), support email.
6. Privacy policy-ல் போட **தொடர்பு email**.
7. Logout-ல் default: "இந்தச் சாதனத்தில் வைத்திரு" — சரியா?
8. எழுத்து அளவு phone / desktop தனித்தனி, location sync இல்லை — சரியா?

---

## 10. ஆதாரங்கள் (2026-11-15 அன்று சரிபார்த்தவை)

- Supabase விலை (Free: 50,000 MAU, 500 MB DB, 1 வாரம் சும்மா இருந்தால் pause; Pro $25, 100,000 MAU, பின் $0.00325/MAU): https://supabase.com/pricing
- Supabase Auth rate limits (built-in: 2 email/மணி): https://supabase.com/docs/guides/auth/rate-limits
- Supabase custom SMTP (built-in team-க்கு மட்டும்; custom SMTP தொடக்கம் 30/மணி): https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Sign in with Apple (native ID token; OAuth secret 6 மாதம்): https://supabase.com/docs/guides/auth/social-login/auth-apple
- Supabase third-party auth — Firebase (bridge): https://supabase.com/docs/guides/auth/third-party/firebase-auth
- Supabase — Firebase Auth-லிருந்து migration: https://supabase.com/docs/guides/platform/migrating-to-supabase/firebase-auth
- Firebase விலை (Auth 50K MAU இலவசம்; phone SMS per message; Firestore இலவச quota): https://firebase.google.com/pricing
- Firebase Auth limits (email link: Spark 5/நாள், Blaze 25,000/நாள்): https://firebase.google.com/docs/auth/limits
- Identity Platform விலை (50K-க்கு மேல்; cached பதிப்புகள் முரண் — live பக்கத்தில் பார்க்கவும்): https://cloud.google.com/identity-platform/pricing
- Apple App Store Review Guidelines 4.8, 5.1.1(v): https://developer.apple.com/app-store/review/guidelines/
- Apple Developer Program ($99/ஆண்டு, fee waiver): https://developer.apple.com/programs/whats-included/
- Brevo free SMTP (300/நாள்): https://www.brevo.com/free-smtp-server/
- Resend விலை (free: 3,000/மாதம், 100/நாள்): https://resend.com/pricing
