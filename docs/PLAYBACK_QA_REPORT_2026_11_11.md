# Playback / Meaning-audio QA அறிக்கை — 2026-11-11

உரிமையாளர் புகார் (Surah Ad-Duha, Safari): ஒரு ஆயா முடிந்ததும் அதன் தமிழ் விளக்கம் வர வேண்டும் —
ஆனால் அடுத்த ஆயா கொஞ்சம் ஓதப்பட்டு பிறகுதான் தமிழ் வருகிறது; சில நேரம் 2–3 ஆயாக்கள் விளக்கமே இல்லாமல்
ஓதப்படுகின்றன; progress ring சில நேரம் சுற்றவில்லை / slider நின்றுவிடுகிறது; சில சொற்களுக்கு
அரபு / தமிழ் ஹைலைட் வருவதில்லை.

## 1. கண்டுபிடித்த காரணங்கள் மற்றும் fix-கள்

| # | அறிகுறி | உண்மையான காரணம் | Fix |
|---|---|---|---|
| 1 | 2–3 ஆயாக்கள் தமிழ் விளக்கம் இல்லாமல் ஓதப்படுகின்றன | `cueSurah` ஆனது `hasWordTiming`-ஐ பார்த்தது — அது **தற்போது ஓதப்படும் ஆயாவுக்கு** மட்டுமான மதிப்பு. Word timing இல்லாத ஆயா வந்ததும் (Alafasy 93:6, 7, 9 …) எல்லா meaning cues-ம் அழிக்கப்பட்டன → அந்த ஆயாவின் விளக்கம் skip. 7 Word-Sync reciters-ல் 273 ஆயாக்கள் இப்படி (meaning உள்ள சூராக்களில் 200). | Reciter-ன் சூரா முழுவதுக்குமான `reciterHasWordTimingFor` (ImmersiveHomeClient: cues, கடைசி ஆயா meaning, "Word Sync" notice). |
| 2 | அடுத்த ஆயா தொடங்கி பிறகு தமிழ் வருகிறது | Recitation சரியான இடத்தில் நிற்கிறது (meaningStops, audio-வில் அளந்தது), ஆனால் அடுத்த ஆயாவின் QDC word timing அந்த stop-க்கு **முன்பே** தொடங்குகிறது → திரை அடுத்த ஆயாவுக்கு மாறி, "Ayat x/y" கூடி, அதன் முதல் சொல் ஒளிர்ந்து, பிறகு meaning-க்காக பின்னால் திரும்புகிறது. **32,985 எல்லைகளில் 8,448 (25.6%)** — Abdul Basit 2,878, Minshawi 1,855, Sudais 1,222, Shuraim 963, Dosari 867, Alafasy 424. | Meaning stop வரும் வரை திரை (ஆயா, ஹைலைட், pill) அந்த ஆயாவிலேயே நிற்கிறது (`heldCue` / `syncClock`). |
| 3 | ஆயாவின் நடுவில் meaning, மீதி விளக்கமின்றி | `build-meaning-stops.mjs` அடுத்த ஆயாவின் முதல் word segment-ஐ நம்பியது; அது displaced ஆக இருந்தால் stop தவறான இடத்தில். உதா: Alafasy 29:10 (50 s முன்பே), 60:12 (50 s), 24:46 (11 s), 57:9 (7.5 s), மேலும் 2–3 s 12 இடங்கள். | Segment அதன் ஆயா window-லிருந்து > 1 s விலகினால் window-ஐ பயன்படுத்துகிறது; 22 சூராக்களுக்கு stops மீண்டும் அளக்கப்பட்டன — **சரியாக அந்த 30 stops மட்டும் மாறின**; acoustic QA (`meaning-stops-qa.mjs`) 0 flagged (Shuraim 91 அவர் தொடர்ச்சியாக ஓதுவதால் மட்டும் "only 12 dB" எச்சரிக்கை, முன்பும் இருந்தது). |
| 4 | « Next Ayah » அழுத்தியும் முந்தைய ஆயா விளக்கம் | அடுத்த ஆயாவின் timed start, முந்தைய stop-க்கு முன் → seek அங்கே விழுந்து முந்தைய meaning வாசிக்கப்பட்டது. | Seek அந்த stop-க்கு சற்று பின் (+0.02 s) விழுகிறது. சோதனை: 93:2-ல் Next → 4.85 s, 93:2 meaning மீண்டும் இல்லை. |
| 5 | Network drop-ல் meaning skip | Meaning clip load / play தோல்வியுற்றால் உடனே skip; முன்கூட்டியே fetch செய்யப்பட்டு தோல்வியுற்ற clip அப்படியே play செய்யப்பட்டது. | ஒருமுறை retry (400 ms), பிழையுள்ள prefetch மீண்டும் load. |
| 6 | Ring / slider 0-ல் நிற்கிறது (Safari) | Safari stream load ஆகும்போது `duration = Infinity` தரலாம் → time ÷ ∞ = 0. Guard இல்லை. | `durationchange`-ல் Infinity புறக்கணிப்பு + player-ல் `Number.isFinite` guard. |

## 2. ஓட்டிய tests

| Test | பரப்பு | முடிவு |
|---|---|---|
| `scripts/qa/sync-suite.cjs` | 9 reciters × 114 சூரா × 6,236 ஆயா × 77,430 சொற்கள் | ✅ CRITICAL/HIGH 0 · INFO: 273 ஆயாக்களுக்கு word timing இல்லை (கீழே) |
| `scripts/qa/word-boundaries.cjs` (1–114) | 1,035 reciter × சூரா | ✅ எல்லாம் ok |
| `scripts/qa/quran-content.cjs` | 114 சூரா, 6,236 அரபு, 77,430 glyph words, 10 மொழிகள், 604 பக்கங்கள், 30 Juz | ✅ 0 failures |
| `scripts/qa/translations.cjs` | 10 மொழி × 6,236 ஆயா alignment | ✅ 0 failures |
| Meaning stops sanity (புதியது) | 9 reciters × 95 சூரா, 32,985 stops | 30 தவறானவை → fix #3 |
| `meaning-stops-qa.mjs` (மாற்றிய சூராக்கள்) | Alafasy 22/24/29/57/60/93, Shuraim 91 | ✅ |
| **Live WebKit (Safari engine) flow** — translation + Tamil meaning on, சூரா முழுவதும் ஓட்டி ஒவ்வொரு 40 ms பதிவு | Juz 30 அனைத்து 37 சூராக்கள் (Alafasy) + Sudais 93, Dosari 112, Abdul Basit 93, Minshawi 103, Hussary 108, Shuraim 91, Shatri 110, Tunaiji 113 + Alafasy 60 | ✅ ஒவ்வொரு ஆயாவுக்கும் அதன் meaning சரியான வரிசையில், leak 0, "next ayah early" 0, ring / pill சரி. இறுதி build-ல்: 60, 78–84, 86, 87, 92, 93, 111, 114 + 8 reciters; 85–113-ன் மற்றவை fix #1, #2, #6 உள்ள build-ல் |
| Live Chromium flow | Ad-Duha | ✅ (fix-க்கு முன் early 28 samples → பின் 0) |
| Juz 30 per-ayah flow (WebKit, 4 நிமிடம்) | 23 ayahs | ✅ ஒவ்வொரு ayah → அதன் meaning, stall இல்லை |

Fix-க்கு முன் Ad-Duha (WebKit): meanings `[1,2,3,4,5,7,8,9,11]` (6, 10 skip). பின்: `1..11`.

## 3. இன்னும் உள்ளவை (data, code அல்ல)

- **Word highlight இல்லாத 273 ஆயாக்கள்** — QDC word segments அந்த ஆயாவிலிருந்து விலகியவை ("displaced"), அதனால் app
  வேண்டுமென்றே ஹைலைட் காட்டுவதில்லை (தவறான சொல் ஒளிர்வதை விட இது பாதுகாப்பு). Abdul Basit 135, Alafasy 54,
  Shatri 42, Shuraim 19, Tunaiji 13, Minshawi 8, Sudais 2. உதா: Alafasy 93:6, 93:7, 93:9 — வீடியோவில் ஹைலைட்
  வராத இடங்கள் இவையே. இப்போது இவற்றுக்கும் meaning வாசிக்கப்படுகிறது; ஹைலைட்டுக்கு `repair-timings.cjs`
  வழியாக acoustic re-alignment தேவை.
- **Alafasy word timings ~0.5 s முன்னதாக** (93:3, 93:4 …): ஹைலைட் குரலை விட சற்று முந்துகிறது. Fix #2 ஆயா எல்லையில்
  இதை மறைக்கிறது; ஆயாவுக்குள் சரிசெய்ய data repair வேண்டும்.
- **Surah 21–66 meaning word-timings இல்லை** (46 சூரா × 2 குரல் × 2 மொழி): அங்கு meaning audio ஒலிக்கிறது, ஆனால்
  தமிழ் / ஆங்கில சொல் ஹைலைட் இல்லை. `build-meaning-timings.mjs --surah=21-66 --lang=ta` local-ஆக ($0) ஓடிக்கொண்டிருக்கிறது;
  ஆங்கிலம் அடுத்து.
- **Media `r2.dev`-லிருந்து** (`pub-….r2.dev`): Cloudflare r2.dev rate-limited, development-க்கு மட்டும். சோதனையின்போது ஒரு
  network drop-ல் stream 155 s நின்றது. Custom domain (எ.கா. `media.<domain>`) பரிந்துரை.

## 4. மாற்றிய கோப்புகள்

- `src/components/home/ImmersiveHomeClient.tsx` — fix #1, #2, #4
- `src/contexts/AudioPlayerContext.tsx` — fix #5, #6
- `src/components/home/CompactBayanPlayer.tsx` — fix #6
- `scripts/generation/build-meaning-stops.mjs` + `src/lib/data/meaningStops.json` — fix #3
- `public/data/meaning-timings/*/ta/<21–66>.json` — புதிய Tamil highlight timings (aligner)
