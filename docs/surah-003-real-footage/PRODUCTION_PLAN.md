# HuDa Web Quran — Surah 003: Aal-Imran
## முழு Surah வீடியோ Sequence Production Plan

**நிலை:** முழு 200 வசனங்களுக்கான sequence map தயாராக உள்ளது. இது production/implementation manifest; இன்னும் render செய்யப்பட்ட final video அல்ல. 200 வசனங்களுக்கும் recitation timings மற்றும் தேர்ந்தெடுக்கப்பட்ட, download செய்யப்பட்ட source footage இணைக்கப்பட்ட பிறகே final render உருவாகும்.

## அங்கீகரிக்கப்பட்ட Visual Direction

பயனர் மதிப்பீடு:
- **Shot 03 — 5/5:** முதன்மை visual reference. அமைதியான மலைப்பள்ளத்தாக்கு, இயற்கையான விடியற்காலை ஒளி.
- **Shot 01 — 4/5:** இரண்டாம் விருப்பம். மலைகள் மற்றும் sunrise; 4K source உள்ள reference.
- **Shot 02 — 2/5:** நிராகரிக்கவும்; default-ஆக பயன்படுத்த வேண்டாம்.
- **Shot 04 — 2/5:** நிராகரிக்கவும்; default-ஆக பயன்படுத்த வேண்டாம்.

Opening reference links:
- Shot 03 (5/5): https://www.pexels.com/video/sunrise-in-the-mountain-valley-5910274/ — Pexels பக்கத்தில் 1920×1080, 16:9, 5 seconds என்று காட்டப்படுகிறது.
- Shot 01 (4/5): https://www.pexels.com/video/mountain-sunrise-over-forested-valley-33185411/ — Pexels பக்கத்தில் 3840×2160, 16:9, 13 seconds என்று காட்டப்படுகிறது.

இந்த இரண்டு source-களும் தொடக்க visual reference மட்டுமே. ஒரே காட்சியை மீண்டும் மீண்டும் loop செய்து முழு Surah உருவாக்கக்கூடாது. Shot 02 மற்றும் Shot 04 ஆகியவற்றின் look-ஐ மீண்டும் பயன்படுத்த வேண்டாம்.

## Global production rules

1. Surah Al-Imran என்பது 200 வசனங்கள் கொண்ட Surah 003. வசன வரிசையை மாற்றவோ, வசனங்களை விடவோ, duplicate செய்யவோ கூடாது.
2. **உண்மையான camera footage மட்டுமே.** AI-generated still/video, image-to-video animation, procedural/gradient background, static image-ஐ MP4 ஆக மாற்றுதல் அல்லது placeholder video அனுமதி இல்லை.
3. எந்த Prophet, Allah, angel அல்லது புனித வரலாற்று நபரையும் காட்சியாக உருவகிக்கவோ, reenactment மூலம் காட்டவோ கூடாது. பொருத்தமான இயற்கை, உண்மையான இடங்கள், architecture, manuscripts, landscape, non-identifiable crowd/hand details போன்ற மரியாதையான visual metaphors-ஐ மட்டும் பயன்படுத்தவும்.
4. குர்ஆனின் அரபு உரை அல்லது புனித எழுத்துக்களை stock video-வில் உருவாக்கப்பட்ட/தவறான எழுத்துகளாக காட்டக்கூடாது. UI-யில் உள்ள verified Quran text source-ஐ மட்டும் பயன்படுத்தவும்.
5. Desktop master 16:9; mobile crop 9:20. Mobile-safe framing-ல் முக்கியமான இயற்கை அம்சம் center-safe area-வில் இருக்க வேண்டும்; தேவையற்ற digital zoom வேண்டாம்.
6. Scene boundaries recitation audio / verified verse timing-ஐப் பின்பற்ற வேண்டும். **Timing ஊகிக்க வேண்டாம்.** Audio timing கிடைக்காவிட்டால் `TIMING_PENDING` எனக் குறிக்கவும்; sample timings-ஐ final-ஆகக் கருத வேண்டாம்.
7. தற்போதைய Word-Sync/Verse-Sync pipeline-ஐப் பயன்படுத்தவும். Existing alignment correction, Bismillah/Isti'adhah handling, word-highlight behavior ஆகியவற்றை regress செய்யக்கூடாது.
8. ஒவ்வொரு asset-க்கும் source URL, creator, download date, resolution, duration, aspect ratio, usage/license check மற்றும் local filename பதிவு செய்யவும். License/use status தெரியாவிட்டால் production-ready என்று குறிக்க வேண்டாம்.
9. எந்த original clip-ஐயும் stretch செய்ய வேண்டாம். Need for longer coverage இருந்தால் தனித்தனி உண்மையான footage-களை edit செய்யவும்; still-frame hold அல்லது image-to-video வேண்டாம்.
10. ஒவ்வொரு scene-யும் visual QA செய்யவும்: actual video file, full playback, correct framing, no AI artifacts/overlays, no unrelated religious symbolism, no duplicated clip abuse, no black frames, audio sync and verse range verified.

## முழு Surah — 20 Scene Blocks

இந்த mapping என்பது editing மற்றும் asset acquisition-க்கான thematic grouping. ஒவ்வொரு block-க்குள் verse-level timings, exact subcuts மற்றும் reciter-specific alignment பின்னர் source audio-விலிருந்து பெறப்பட வேண்டும்.

| Scene | வசனங்கள் | காட்சி நோக்கம் | பரிந்துரைக்கப்படும் உண்மையான footage | தவிர்க்க வேண்டியது |
|---|---:|---|---|---|
| 01 | 1–9 | தொடக்கம், தவ்ஹீத், வெளிப்பாடு, தெளிவும் ஆழமான பொருளும் கொண்ட வசனங்கள் | Shot 03 (5/5) sunrise mountain valley-ஐ short opening reference ஆகப் பயன்படுத்தவும்; அதே natural-light tone-இல் வேறு real mountain dawn coverage | ஒரே 5-sec clip-ஐ நீளமாக loop செய்வது; Shot 02/04 look |
| 02 | 10–20 | உலகச் செல்வத்தின் நிலையின்மை, இறைநம்பிக்கை, உண்மையை ஏற்றுக்கொள்வது | இரவிலிருந்து விடியற்காலைக்குச் செல்லும் உண்மையான landscape, நகரத்தின் தொலைநோக்கு, அமைதியான horizon | வேறு மதக் குறியீடுகளை தவறாக இணைத்தல் |
| 03 | 21–32 | உண்மையை மறுத்தல், அல்லாஹ்வின் அதிகாரம், நம்பிக்கையின் நடைமுறை | உண்மையான manuscript/library detail, இயற்கை ஒளியில் திறந்த பாதை, restrained architecture | தவறான அரபு/குர்ஆன் எழுத்துகள்; உருவகப்படுத்தப்பட்ட இறை காட்சிகள் |
| 04 | 33–41 | Imran குடும்பம், Maryam பற்றிய narrative தொடக்கம், Zakariyya-வின் வேண்டுதல் | அமைதியான பழமையான courtyard, கல் நடைபாதை, தோட்டம், நீர் மற்றும் ஒளி; மனிதர்/புனித நபர் depiction இன்றி | Maryam அல்லது Zakariyya-வை நடிகர்களால் நேரடியாகச் சித்தரித்தல் |
| 05 | 42–51 | Maryam-க்கு அறிவிக்கப்பட்ட செய்தி; Isa-வின் பிறப்பு மற்றும் அடையாளங்கள் தொடர்பான வசனங்கள் | அமைதியான courtyard, காலைப் பனி, இயற்கை ஒளி, மரங்கள்/வானம் போன்ற non-literal footage | Isa அல்லது angel-ஐ நேரடியாகக் காட்டுதல்; கிறிஸ்தவ/இஸ்லாமிய iconography-ஐ context இன்றி பயன்படுத்துதல் |
| 06 | 52–63 | Isa-வின் செய்தி, சீடர்கள், விவாதம் மற்றும் தீர்மானம் | உண்மையான பழங்காலக் கல் architecture, பாலைவன மலைவழி, தூரத்திலுள்ள மனிதக் கூட்டம் அடையாளமறைந்த நிலையில் | Isa, disciples அல்லது எந்த புனித நபரின் reenactment |
| 07 | 64–80 | வேதக்காரர்களுடன் உரையாடல்; Ibrahim மற்றும் உண்மையான இறைநம்பிக்கை | பழைய கல் கட்டமைப்புகள், manuscripts-ஐ வாசிக்கும் கைகள், பரந்த வெற்று landscape | உரையாடலை கற்பனைச் scene ஆக உருவாக்குதல்; குறிப்பிட்ட வரலாற்று இடம் என ஆதாரமின்றி கூறுதல் |
| 08 | 81–91 | உடன்படிக்கை, பொறுப்பு, நம்பிக்கை மற்றும் மறுப்பு | பெரும் வானம், மலைப்பரப்பு, manuscript/library visual, மெதுவான natural camera movement | செயற்கை text overlays, மிகைப்படுத்திய dark fantasy look |
| 09 | 92–101 | தாராளம், புனித இல்லம், ஹஜ் மற்றும் வழிகாட்டுதல் | அனுமதி/உரிமை சரிபார்த்த உண்மையான Ka'bah மற்றும் Masjid al-Haram footage கிடைத்தால் அதையே முன்னுரிமைப்படுத்தவும்; இல்லையெனில் neutral landscape-ஐ மட்டும் பயன்படுத்தி இடத்தைக் குறிக்க வேண்டாம் | Ka'bah-ஐப் போல உருவாக்கப்பட்ட அல்லது தவறாகக் கூறப்படும் வேறு கட்டிடம் |
| 10 | 102–109 | சமூக ஒற்றுமை, நன்மைக்கான அழைப்பு, பிரிவினை தவிர்த்தல் | உண்மையான மசூதி exterior/interior, பின்னால் இருந்து/அடையாளமறைந்து காணப்படும் congregation, community service detail | முகங்களைத் தவறாக அடையாளப்படுத்தும் reenactment; அங்கீகாரமற்ற close-up |
| 11 | 110–120 | சமூகத்தின் பொறுப்பு, நம்பிக்கை, பாதுகாப்பு மற்றும் எச்சரிக்கை | உண்மையான நகர/சந்தை காட்சிகள், குழுவாக நடக்கும் அடையாளமறைந்த மக்கள், இயற்கை landscape | ஒரு குறிப்பிட்ட நபர் அல்லது குழுவைத் தீயவராக சித்தரிக்கும் காட்சி |
| 12 | 121–129 | Uhud நிகழ்வுகளுக்கான பின்னணி மற்றும் சோதனை | Jabal Uhud / Madinah-வுடன் தொடர்புடைய உண்மையான landscape footage கிடைத்தால் சரிபார்த்து பயன்படுத்தவும்; இல்லையெனில் generic rocky mountain என்று மட்டும் பதிவு செய்யவும் | staged battle, fabricated historical reenactment, ஆதாரமற்ற location claim |
| 13 | 130–143 | வட்டி குறித்த எச்சரிக்கை, கீழ்ப்படிதல், சோதனைகளில் உறுதி | உண்மையான rocky terrain, பாதை, மலைச் சரிவு, தூரத்திலுள்ள landscape | நவீன financial B-roll-ஐ வசனப் பொருளுடன் நேரடியாகச் சமமாகக் காட்டுதல் |
| 14 | 144–148 | தூதர்கள், உறுதி, பொறுமை மற்றும் மீண்டும் திரும்புதல் | அமைதியான மலைப் பாதை, விடியற்காலை, விரிந்த நிலப்பரப்பு | எந்த நபரையும் இறைத்தூதராக காட்டுதல் |
| 15 | 149–155 | Uhud-இல் ஏற்பட்ட பின்னடைவு மற்றும் அதிலிருந்து கற்றுக்கொள்ளும் பாடங்கள் | Jabal Uhud உண்மையான footage கிடைத்தால் பயன்படுத்தவும்; otherwise rocky hills மற்றும் பாதைகள் | போர் காட்சிகளை AI/reenactment மூலம் உருவாக்குதல்; இரத்தம்/வன்முறை spectacle |
| 16 | 156–171 | பயம், நம்பிக்கை, உயிரிழந்தோர் குறித்த வசனங்கள், தியாகம் மற்றும் உறுதி | உண்மையான மலைப்பரப்பு, அமைதியான நினைவுச் சூழல், சூரிய ஒளி மேகங்களைத் தாண்டுவது | இறந்தவர்கள்/மரணம் பற்றிய கற்பனை reenactments; கல்லறையை ஆதாரமின்றி குறிப்பிட்ட சம்பவத்துடன் இணைத்தல் |
| 17 | 172–180 | சோதனைக்குப் பின் நிலைத்திருத்தல்; தாராளம் மற்றும் பொறுப்பு | sunrise trail, community support hands, இயற்கை நகர்வு | குறியீட்டு காட்சியை வசனத்தின் literal historical evidence எனக் காட்டுதல் |
| 18 | 181–189 | செயல்களின் கணக்கு, உலகின் நிலையின்மை, இறையாண்மை | விண்மீன் வானம், மலைகள், பழைய நூல்கள்/கட்டமைப்புகள், natural shadows | அச்சுறுத்தும் fantasy effects அல்லது செயற்கை விண்வெளி render |
| 19 | 190–195 | வானம், பூமி மற்றும் படைப்பைப் பற்றி சிந்தித்தல்; துஆ | உண்மையான இரவு வானம், நட்சத்திரங்கள், மலைத்தொடர்கள், sunrise; உயர்தர long-form nature footage | procedural starfield அல்லது CGI universe |
| 20 | 196–200 | இறுதி நினைவூட்டல், பொறுமை, நிலைத்தன்மை | Shot 03-இன் அதே ஒளி உணர்வுடன் வேறு உண்மையான விடியற்காலைப் footage; closing wide shot | Shot 03-ஐ அப்படியே மீண்டும் பயன்படுத்துதல்; fabricated sunrise |

## கோப்பு அமைப்பு — பரிந்துரை

```text
public/videos/surahs/003-al-imran/
  scenes/
    scene-001/   # verses 1-9
    scene-002/   # verses 10-20
    ...
    scene-020/   # verses 196-200
  manifests/
    surah-003-scenes.json
  qa/
    source-audit.csv
    timing-qa.json
    visual-qa.md
```

கோப்புப் பெயர்கள் மற்றும் directory அமைப்பு repository-யின் தற்போதைய conventions-க்கு ஏற்றபடி மாற்றப்பட வேண்டும்; duplicate pipeline உருவாக்க வேண்டாம்.

## Completion criteria

- [ ] 3:1 முதல் 3:200 வரை அனைத்து வசனங்களும் manifest-ல் ஒரே முறை மட்டும் உள்ளன.
- [ ] ஒவ்வொரு scene-க்கும் source footage அல்லது தெளிவான `ASSET_PENDING` status உள்ளது.
- [ ] Source URLs, resolution, duration, license/usage status பதிவு செய்யப்பட்டுள்ளன.
- [ ] Audio timing உண்மையான recitation-லிருந்து வந்துள்ளது; sample timing final-ஆகப் பயன்படுத்தப்படவில்லை.
- [ ] Word highlight மற்றும் verse boundaries production build-ல் verify செய்யப்பட்டுள்ளன.
- [ ] Desktop 16:9 மற்றும் mobile 9:20 crop QA முடிந்தது.
- [ ] No AI imagery/video, still-image animation, placeholders, repeated-loop padding, or unverified historic depictions.
- [ ] Full playback render, audio continuity, black-frame check மற்றும் scene transition QA அனைத்தும் pass.

## ஆதாரப் பக்கங்கள்

- Quran.com — Surah Al-Imran, 200 verses and chapter text: https://quran.com/ali-imran
- Quran.com — Surah information and themes: https://quran.com/surah/keluarga-imran/info
- Pexels — Shot 03 source page: https://www.pexels.com/video/sunrise-in-the-mountain-valley-5910274/
- Pexels — Shot 01 source page: https://www.pexels.com/video/mountain-sunrise-over-forested-valley-33185411/
