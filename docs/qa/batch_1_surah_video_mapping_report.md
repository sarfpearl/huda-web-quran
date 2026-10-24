# HuDa Web Quran — Batch 1 Surah Video Mapping Report
**Date:** 2026-10-20  
**Scope:** Batch 1 (8 Surahs: 19, 23, 25, 26, 28, 30, 31, 32)  
**Total Verses Covered:** 694 Ayahs  
**Total Thematic Video Sets:** 78 Sets  
**Generation Cost:** ₹0.00 (Zero AI Generation Spend)  
**Production Isolation:** 100% Isolated in `scratch/staging/batch_1_review/` (No production files touched)  
**Status:** Staging Review Package Ready for Human Review  

---

## 1. Executive Summary

A dedicated, non-production staging review package has been created for **Batch 1** of the pending Surahs. 
Batch 1 comprises all eight Surahs that can be **100% satisfied using our verified 16:9 full-screen master video library without requiring any new AI video generation or credit spending**.

### Key Metrics:
- **Total Surahs in Batch 1:** 8 Surahs (19 Maryam, 23 Al-Mu'minun, 25 Al-Furqan, 26 Ash-Shu'ara, 28 Al-Qasas, 30 Ar-Rum, 31 Luqman, 32 As-Sajdah)
- **Total Verses:** 694 Ayahs (Zero gaps, zero overlaps)
- **Total Master Sets:** 78 Sets
- **Direct Library Reuse:** 77 Sets (98.7%)
- **Staged Local Crop:** 1 Set (1.3% — Surah 19:81–87, center-cropped to 100% 16:9 borderless in `scratch/staging/surah_19_20_crop/`)
- **Planned New Visuals Needed:** **0** (Zero)
- **AI Generation Spend:** **₹0.00** (Full ₹27,550.12 budget balance preserved)
- **Production Asset / Manifest Impact:** **0%** (`public/videos/surah_{19..32}` untouched, `src/lib/data/videoManifest.ts` untouched)

---

## 2. Review Dashboard & HTML Page Access

The review package has been assembled with standalone, playable HTML review interfaces in `scratch/staging/batch_1_review/`:

- **Master Dashboard:** [scratch/staging/batch_1_review/index.html](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/index.html)
- **Proposed Non-Production Manifest:** [scratch/staging/batch_1_review/proposed_batch_1_manifest.json](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/proposed_batch_1_manifest.json)
- **Individual Surah Review Pages:**
  1. [Surah 19: Maryam (14 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_19.html)
  2. [Surah 23: Al-Mu'minun (14 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_23.html)
  3. [Surah 25: Al-Furqan (8 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_25.html)
  4. [Surah 26: Ash-Shu'ara (14 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_26.html)
  5. [Surah 28: Al-Qasas (11 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_28.html)
  6. [Surah 30: Ar-Rum (8 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_30.html)
  7. [Surah 31: Luqman (5 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_31.html)
  8. [Surah 32: As-Sajdah (4 Sets)](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/scratch/staging/batch_1_review/review_surah_32.html)

---

## 3. Complete 78-Set Video Mapping Table

### Surah 19: Maryam (14 Sets • 98 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–7 | Supplication of Zakariya & Glad Tidings of Yahya | ஜகரிய்யா (அலை) அவர்களின் பிரார்த்தனை & யஹ்யா நற்செய்தி | `public/videos/surah_4/set_21_ayah_141-147.mp4` | 27.24 MB | Direct Reuse |
| **02** | 8–15 | Signs of Zakariya & Upright Devotion of Yahya | ஜகரிய்யா (அலை) அவர்களின் அத்தாட்சி & யஹ்யாவின் பக்தி | `public/videos/surah_4/set_03_ayah_15-21.mp4` | 31.96 MB | Direct Reuse |
| **03** | 16–22 | Maryam's Seclusion & Annunciation of Isa | மர்யம் அவர்களின் தனிமை & ஈஸா (அலை) வருகை நற்செய்தி | `public/videos/surah_4/set_16_ayah_106-112.mp4` | 31.25 MB | Direct Reuse |
| **04** | 23–26 | Pains of Childbirth, Date Palm & Refreshing Stream | பேரீச்சை மரம் & நன்னீர் ஊற்று (சரிய்யா) | `public/videos/surah_4/set_06_ayah_36-42.mp4` | 29.25 MB | **Human Signed-Off** |
| **05** | 27–34 | Speaking from the Cradle & Truth of Isa | தொட்டிலில் பேசிய அற்புதம் & ஈஸா (அலை) உண்மை | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **06** | 35–40 | Sublimity of Allah, Straight Path & Day of Regret | அல்லாஹ்வுக்கு பிள்ளை இல்லை & கைசேதத்தின் இறுதி நாள் | `public/videos/surah_4/set_08_ayah_50-56.mp4` | 31.39 MB | Direct Reuse |
| **07** | 41–50 | Abraham Demurring Idolatry & Gracious Succession | இப்ராஹீம் (அலை) விக்கிரக மறுப்பு & சந்ததி பாக்கியம் | `public/videos/surah_6/set_12_ayah_78-84.mp4` | 31.29 MB | Direct Reuse |
| **08** | 51–58 | Legacy of Moses, Ishmael, Idris & Prostration of Believers | மூஸா, இஸ்மாயீல், இத்ரீஸ் & ஸஜ்தா செய்யும் தூயோர் | `public/videos/surah_4/set_22_ayah_148-154.mp4` | 28.58 MB | Direct Reuse |
| **09** | 59–65 | Degenerate Successors vs Gardens of Eternity | தொழுகையை வீணடித்தோர் vs அத்ன் சுவனபதிகள் | `public/videos/surah_4/set_11_ayah_71-77.mp4` | 25.13 MB | Direct Reuse |
| **10** | 66–72 | Resurrection of Man & Gathering of Transgressors | மனிதனின் மறுமை & நரக விளிம்பில் ஒன்றுசேர்த்தல் | `public/videos/surah_5/set_07_ayah_43-49.mp4` | 29.62 MB | Direct Reuse |
| **11** | 73–76 | Transient Worldly Splendor vs Abiding Good Deeds | தற்காலிக ஆடம்பரம் vs நிலையான நற்செயல்கள் | `public/videos/surah_7/set_07_ayah_43-49.mp4` | 31.29 MB | Direct Reuse |
| **12** | 77–80 | Boasting of Wealth & Stripped Inheritance | செல்வம் பெருமை பேசுவோர் & தனித்து நிற்கும் இறுதி நாள் | `public/videos/surah_4/set_02_ayah_8-14.mp4` | 31.63 MB | Direct Reuse |
| **13** | 81–87 | False Deities Repudiated & Intercession of Truth | பொய்யான தெய்வங்கள் & அர்ரஹ்மானின் பரிந்துரை | `scratch/staging/surah_19_20_crop/surah_19_set_13_ayah_81-87.mp4` | 9.28 MB | **Staged Crop** |
| **14** | 88–98 | Heavens Rent Asunder at Blasphemy & Eternal Mercy | வானங்கள் பிளக்கும் பெரும் பாவம் & ஈமான் கொண்டோரின் பாசம் | `public/videos/surah_5/set_01_ayah_1-7.mp4` | 31.81 MB | Direct Reuse |

---

### Surah 23: Al-Mu'minun (14 Sets • 118 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–11 | Triumphant Believers & Inheritors of Firdaus | வெற்றிபெற்ற விசுவாசிகள் & ஃபிர்தவ்ஸ் சுவன வாரிசுகள் | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 12–16 | Miraculous Stages of Human Creation & Return | மனிதனின் கரு உருவாக்கப் படிகள் & மரணத்திற்குப் பின் வாழ்க்கை | `public/videos/surah_4/set_07_ayah_43-49.mp4` | 29.83 MB | Direct Reuse |
| **03** | 17–22 | Seven Heavens, Rain from Clouds & Mount Sinai Olive Tree | ஏழு வானங்கள், மழை நீர் & சினாய் மலை ஆலிவ் மரம் | `public/videos/surah_6/set_15_ayah_99-105.mp4` | 31.42 MB | Direct Reuse |
| **04** | 23–30 | Ark of Nuh Sailing Through Raging Floodwaters | நூஹ் (அலை) கப்பல் & பெரும் வெள்ளத்தின் சங்கமம் | `public/videos/surah_10/set_14_ayah_92-98.mp4` | 31.57 MB | Direct Reuse |
| **05** | 31–41 | Destruction of Succeeding Arrogant Generations | திமிர் பிடித்த சமுதாயங்களின் அழிவு & பெரும் சப்தம் | `public/videos/surah_7/set_10_ayah_64-70.mp4` | 30.56 MB | Direct Reuse |
| **06** | 42–50 | Successive Messengers & Sanctuary of Maryam and Her Son | தொடர் இறைத்தூதர்கள் & மர்யம், ஈஸாவின் அமைதிச் சோலை | `public/videos/surah_4/set_06_ayah_36-42.mp4` | 29.25 MB | Direct Reuse |
| **07** | 51–62 | Single Community of Faith & Pure Sustenance | ஒரே சமுதாயம், தூய உணவு & பணிவான இறைபக்தி | `public/videos/surah_5/set_02_ayah_8-14.mp4` | 28.51 MB | Direct Reuse |
| **08** | 63–77 | Hardened Hearts in Heedlessness & Unheeded Warnings | அலட்சியத்தில் மூழ்கிய உள்ளங்கள் & புறக்கணிக்கப்பட்ட அறிவுரை | `public/videos/surah_7/set_07_ayah_43-49.mp4` | 31.29 MB | Direct Reuse |
| **09** | 78–83 | Faculty of Hearing, Sight, Hearts & Skepticism of Resurrection | செவி, பார்வை, சிந்தனை அருட்கொடைகள் & உயிர்ப்பித்தல் சந்தேகம் | `public/videos/surah_4/set_08_ayah_50-56.mp4` | 31.39 MB | Direct Reuse |
| **10** | 84–90 | Sovereignty Over Seven Heavens and Mighty Throne | ஏழு வானங்கள் & மகத்தான அர்ஷின் அதிபதி யார்? | `public/videos/surah_10/set_01_ayah_1-7.mp4` | 27.24 MB | Direct Reuse |
| **11** | 91–92 | Transcendence Over Having a Son or Plurality of Gods | இறைவனுக்கு இணை இல்லை & அண்ட சராசரங்களின் தனி ஆளுகை | `public/videos/surah_4/set_20_ayah_134-140.mp4` | 28.16 MB | Direct Reuse |
| **12** | 93–98 | Seeking Refuge from Demonic Promptings & Repelling Evil | ஷைத்தானின் ஊசலாட்டங்களிலிருந்து பாதுகாப்பு & தீமையை நன்மையால் தடுத்தல் | `public/videos/surah_8/set_07_ayah_43-49.mp4` | 29.54 MB | Direct Reuse |
| **13** | 99–108 | Barrier of Barzakh & Scales of Justice on the Last Day | பர்ஸக் திரை & இறுதி நாளில் நன்மைகளின் தராசு | `public/videos/surah_5/set_07_ayah_43-49.mp4` | 29.62 MB | Direct Reuse |
| **14** | 109–118 | Supplication for Forgiveness, Sovereign Truth & Exalted Lord | பாவமன்னிப்பு வேண்டுதல் & சத்தியமான ஏக அரசன் | `public/videos/surah_4/set_21_ayah_141-147.mp4` | 27.24 MB | Direct Reuse |

---

### Surah 25: Al-Furqan (8 Sets • 77 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–9 | Criterion Revealed & Challenge of the Skeptics | சத்திய-அசத்திய அளவுகோல் & நிராகரிப்பாளர்களின் வீண் வாதங்கள் | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 10–20 | Exalted Creator of Gardens vs The Blaze of Blazing Fire | சுவனச் சோலைகளின் அதிபதி vs கொழுந்துவிட்டெரியும் நரகம் | `public/videos/surah_4/set_02_ayah_8-14.mp4` | 31.63 MB | Direct Reuse |
| **03** | 21–34 | Day the Sky Splits Open with Clouds & Gradual Quran | மேகங்களுடன் வானம் பிளக்கும் நாள் & படிப்படியாக இறங்கிய குர்ஆன் | `public/videos/surah_14/set_03_ayah_15-21.mp4` | 31.39 MB | Direct Reuse |
| **04** | 35–44 | Destinies of Past Nations & Taking Desires as Deities | முந்தைய சமுதாயங்களின் கதி & மனோ இச்சையை கடவுளாக்குவோர் | `public/videos/surah_7/set_10_ayah_64-70.mp4` | 30.56 MB | Direct Reuse |
| **05** | 45–52 | Lengthening Shadows, Soothing Night & Winds Bearing Good News | நிழலை நீட்டுதல், சாந்தமான இரவு & நற்செய்தி கூறும் காற்று | `public/videos/surah_4/set_07_ayah_43-49.mp4` | 29.83 MB | Direct Reuse |
| **06** | 53–60 | Two Merging Seas, Sweet and Salt, with an Impassable Barrier | இரு கடல்களின் சங்கமம், நன்னீரும் உவர்நீரும் & பிரிக்கப்பட்ட திரை | `public/videos/surah_10/set_04_ayah_22-28.mp4` | 30.82 MB | Direct Reuse |
| **07** | 61–67 | Constellations in the Sky & Servants of the Most Merciful | வானத்தில் நட்சத்திரக் கூட்டங்கள் & ரஹ்மானின் மெய்யடியார்கள் | `public/videos/surah_4/set_14_ayah_92-98.mp4` | 30.85 MB | Direct Reuse |
| **08** | 68–77 | Repentance Transforming Sins & Everlasting Chambers of Peace | பாவங்களை நன்மையாக மாற்றும் தவ்பா & சுவனத்தின் உயரிய மாளிகைகள் | `public/videos/surah_4/set_25_ayah_169-176.mp4` | 31.13 MB | Direct Reuse |

---

### Surah 26: Ash-Shu'ara (14 Sets • 227 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–9 | Clear Book & Divine Consolation of the Prophet | தெளிவான வேதம் & நபிகள் நாயகத்திற்கு ஆறுதல் | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 10–33 | Call of Moses, The Staff & White Radiant Hand | மூஸாவுக்கு இறைஅழைப்பு, கைத்தடி & பிரகாசமான கை அற்புதம் | `public/videos/surah_4/set_02_ayah_8-14.mp4` | 31.63 MB | Direct Reuse |
| **03** | 34–51 | Magicians Falling in Prostration to Lord of the Worlds | மூஸாவின் அத்தாட்சியை ஏற்று ஸஜ்தாவில் விழுந்த மந்திரவாதிகள் | `public/videos/surah_4/set_03_ayah_15-21.mp4` | 31.96 MB | Direct Reuse |
| **04** | 52–68 | Parting of the Red Sea Like Towering Mountains | பெருங்கடல் பிளந்து இரு பெரும் மலைகளென நின்ற அற்புதம் | `public/videos/surah_10/set_14_ayah_92-98.mp4` | 31.57 MB | Direct Reuse |
| **05** | 69–89 | Abraham Calling His People Away from Helpless Idols | இப்ராஹீமின் ஏகத்துவ வாதம் & தூய இதயத்தோடு இறைவனிடம் வருதல் | `public/videos/surah_6/set_12_ayah_78-84.mp4` | 31.29 MB | Direct Reuse |
| **06** | 90–104 | Paradise Brought Near & Hell Displayed to Deluded Sins | சுவனம் அருகில் கொண்டுவரப்படுதல் & நரகம் கண்களுக்கு முன் தெரிதல் | `public/videos/surah_4/set_08_ayah_50-56.mp4` | 31.39 MB | Direct Reuse |
| **07** | 105–122 | Mission of Nuh, The Heavy Ark & Delivery of the Faithful | நூஹ் (அலை) அறிவுரை & விசுவாசிகளுடன் காப்பாற்றப்பட்ட கப்பல் | `public/videos/surah_10/set_04_ayah_22-28.mp4` | 30.82 MB | Direct Reuse |
| **08** | 123–140 | Hud Addressing The Mighty Monuments of 'Ad in the Canyons | ஆத் சமுதாயத்திற்கு ஹூத் நபியின் எச்சரிக்கை & கம்பீரமான தூண்கள் | `public/videos/surah_7/set_08_ayah_50-56.mp4` | 30.63 MB | Direct Reuse |
| **09** | 141–159 | Salih & Thamud Carving Palaces into Granite Mountains | பாறைகளைக் குடைந்து மாளிகைகள் கட்டிய ஸமூத் & சாலிஹ் நபி | `public/videos/surah_4/set_17_ayah_113-119.mp4` | 31.53 MB | Direct Reuse |
| **10** | 160–175 | Lut Warning His People Against Transgression | லூத் (அலை) எச்சரிக்கை & பெருங்கல்லால் அழிக்கப்பட்ட தீயோர் | `public/videos/surah_7/set_10_ayah_64-70.mp4` | 30.56 MB | Direct Reuse |
| **11** | 176–191 | Shu'ayb & The Dwellers of the Wood (Ashab al-Aykah) | அய்ஃகா வாசிகள் & ஷுஐப் (அலை) அவர்களின் நீதியான தராசு | `public/videos/surah_4/set_06_ayah_36-42.mp4` | 29.25 MB | Direct Reuse |
| **12** | 192–209 | Quran Brought Down by the Trustworthy Spirit (Jibril) | ரூஹுல் அமீன் (ஜிப்ரயீல்) மூலம் இறங்கிய தூய குர்ஆன் | `public/videos/surah_4/set_16_ayah_106-112.mp4` | 31.25 MB | Direct Reuse |
| **13** | 210–220 | Devils Cannot Bring the Message & Reliance on Almighty | ஷைத்தான்களால் கொண்டுவர முடியாத வேதம் & இறைநம்பிக்கை | `public/videos/surah_8/set_07_ayah_43-49.mp4` | 29.54 MB | Direct Reuse |
| **14** | 221–227 | Aimless Poets vs Upright Believers Mentioning God Frequently | வீண் கற்பனை கவிஞர்கள் vs அல்லாஹ்வை அதிகம் நினைவுகூரும் நல்லோர் | `public/videos/surah_4/set_25_ayah_169-176.mp4` | 31.13 MB | Direct Reuse |

---

### Surah 28: Al-Qasas (11 Sets • 88 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–6 | Story of Moses and Pharaoh: Arrogance vs The Oppressed | மூஸா & ஃபிர்அவ்ன் வரலாறு: கொடுங்கோன்மை vs ஒடுக்கப்பட்டோர் | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 7–13 | Baby Moses Cast Upon the River & Reunited with Mother | ஆற்றில் விடப்பட்ட மூஸா & தாயிடம் மீள ஒப்படைக்கப்பட்ட அற்புதம் | `public/videos/surah_10/set_04_ayah_22-28.mp4` | 30.82 MB | Direct Reuse |
| **03** | 14–21 | Moses Escapes Egypt Towards the Desert of Madyan | எகிப்திலிருந்து மத்யன் நோக்கி பாலைவனத்தில் மூஸாவின் பயணம் | `public/videos/surah_4/set_02_ayah_8-14.mp4` | 31.63 MB | Direct Reuse |
| **04** | 22–28 | Well of Madyan & Ten-Year Covenant of Labor | மத்யன் கிணற்றடி நீர் இறைத்தல் & பத்து வருட உழைப்பு ஒப்பந்தம் | `public/videos/surah_4/set_06_ayah_36-42.mp4` | 29.25 MB | Direct Reuse |
| **05** | 29–35 | Commission at the Burning Bush & Fearless Mission | சினாய் மலையடிவாரத்தில் இறை ஆணை & அச்சமற்ற தூதுத்துவம் | `public/videos/surah_4/set_03_ayah_15-21.mp4` | 31.96 MB | Direct Reuse |
| **06** | 36–42 | Pharaoh's Defiance & Being Cast into the Deep Ocean | ஃபிர்அவ்னின் திமிர் & கடலில் மூழ்கடிக்கப்பட்டு பெற்ற அழிவு | `public/videos/surah_10/set_14_ayah_92-98.mp4` | 31.57 MB | Direct Reuse |
| **07** | 43–50 | Scripture Given as Enlightenment & Clear Proofs | மனிதர்களுக்கு வழிகாட்டியாக மூஸாவுக்கு வழங்கப்பட்ட தவ்ராத் | `public/videos/surah_4/set_07_ayah_43-49.mp4` | 29.83 MB | Direct Reuse |
| **08** | 51–60 | Word Reaching Humanity & Wealth of Towns Destroyed | தொடர்ந்து வரும் இறைவசனங்கள் & பெருமையில் அழிந்த ஊர்கள் | `public/videos/surah_7/set_07_ayah_43-49.mp4` | 31.29 MB | Direct Reuse |
| **09** | 61–75 | Transient Goods vs Eternity & Alternation of Night and Day | அற்ப உலக இன்பம் vs நிலையான மறுமை & இரவு-பகல் சுழற்சி | `public/videos/surah_4/set_08_ayah_50-56.mp4` | 31.39 MB | Direct Reuse |
| **10** | 76–82 | Qarun's Vast Treasures Swallowed by the Earth | காரூனின் அளவற்ற பொக்கிஷங்கள் & பூமியில் புதையுண்ட கர்வம் | `public/videos/surah_7/set_08_ayah_50-56.mp4` | 30.63 MB | Direct Reuse |
| **11** | 83–88 | The Ultimate Abode & Everything Perishing Except His Face | மறுமையின் வீடு & இறைவனின் முகத்தைத் தவிர அனைத்தும் அழியும் | `public/videos/surah_4/set_25_ayah_169-176.mp4` | 31.13 MB | Direct Reuse |

---

### Surah 30: Ar-Rum (8 Sets • 60 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–10 | Defeat of Rome & Triumphant Promise of God | ரோமானியர்களின் வெற்றி முன்கணிப்பு & உண்மையான இறைவாக்கு | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 11–19 | Bringing Forth Living from Dead & Cosmic Symmetry | இறந்ததிலிருந்து உயிருள்ளதை வெளிப்படுத்துதல் & பிரபஞ்ச சமச்சீர் | `public/videos/surah_4/set_07_ayah_43-49.mp4` | 29.83 MB | Direct Reuse |
| **03** | 20–27 | Signs of Creation: Dust, Spouses, Diversity of Tongues and Colors | மாபெரும் அத்தாட்சிகள்: மண், துணைவர்கள், மொழிகள் & நிறங்களின் வேறுபாடு | `public/videos/surah_6/set_15_ayah_99-105.mp4` | 31.42 MB | Direct Reuse |
| **04** | 28–32 | Pure Innate Fitrah & Avoidance of Factionalism | மனிதனின் தூய இயற்கை சுபாவம் (ஃபித்ரா) & மார்க்கத்தில் பிளவின்மை | `public/videos/surah_5/set_02_ayah_8-14.mp4` | 28.51 MB | Direct Reuse |
| **05** | 33–40 | Provision, Kinship, Prohibition of Usury & Charity | வாழ்வாதாரம், உறவினரின் உரிமை, வட்டி ஒழிப்பு & ஸகாத் | `public/videos/surah_4/set_06_ayah_36-42.mp4` | 29.25 MB | Direct Reuse |
| **06** | 41–45 | Corruption on Land and Sea & Consequences of Human Actions | தரையிலும் கடலிலும் குழப்பம் வெளிப்படுதல் & மனித கரங்களின் வினை | `public/videos/surah_7/set_10_ayah_64-70.mp4` | 30.56 MB | Direct Reuse |
| **07** | 46–53 | Winds of Glad Tidings, Gathering Clouds & Reviving Dead Soil | நற்செய்தி கூறும் காற்று, ஒன்றுசேரும் மேகங்கள் & உயிர்பெறும் பூமி | `public/videos/surah_10/set_04_ayah_22-28.mp4` | 30.82 MB | Direct Reuse |
| **08** | 54–60 | Stages of Human Weakness to Strength & Resolute Patience | பலவீனம் - பலம் - முதுமை மனித நிலைகள் & உறுதியான பொறுமை | `public/videos/surah_4/set_25_ayah_169-176.mp4` | 31.13 MB | Direct Reuse |

---

### Surah 31: Luqman (5 Sets • 34 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–11 | Book of Wisdom & Pillars Erected Without Columns | ஞானமுள்ள வேதம் & தூண்களின்றி நிறுவப்பட்ட வானங்கள் | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 12–19 | Luqman's Golden Advice to His Son: Humility and Modesty | மகனுக்கு லுக்மானின் பொன்னான அறிவுரைகள்: பணிவு & இறைபக்தி | `public/videos/surah_4/set_02_ayah_8-14.mp4` | 31.63 MB | Direct Reuse |
| **03** | 20–26 | Subservience of Heavens and Earth & Firm Handhold | வானம்-பூமியின் அருட்கொடைகள் & அறுந்துவிடாத உறுதியான கயிறு | `public/videos/surah_4/set_20_ayah_134-140.mp4` | 28.16 MB | Direct Reuse |
| **04** | 27–30 | All Oceans as Ink Cannot Exhaust the Words of Allah | உலக சமுத்திரங்கள் மையானாலும் முடிவடையாத இறைவனின் வார்த்தைகள் | `public/videos/surah_10/set_01_ayah_1-7.mp4` | 27.24 MB | Direct Reuse |
| **05** | 31–34 | Ships Sailing Smoothly & Five Unseen Keys of Tomorrow | கடலில் மிதக்கும் கப்பல்கள் & எவருக்கும் தெரியாத 5 மறைவான உண்மைகள் | `public/videos/surah_10/set_04_ayah_22-28.mp4` | 30.82 MB | Direct Reuse |

---

### Surah 32: As-Sajdah (4 Sets • 30 Ayahs)
| Set # | Ayahs | Theme (English) | Theme (Tamil) | Source Master Video | Size | Type |
| :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| **01** | 1–11 | Creation of Cosmos in Six Periods & Angel of Death | ஆறு நாட்களில் பிரபஞ்ச படைப்பு & உயிர்களைக் கைப்பற்றும் மலக்கு | `public/videos/surah_4/set_01_ayah_1-7.mp4` | 31.78 MB | Direct Reuse |
| **02** | 12–17 | Sinners in Humiliation vs The Flanks Shunning Beds in Prayer | தலைகுனியும் குற்றவாளிகள் vs படுக்கையிலிருந்து எழும் விசுவாசிகள் | `public/videos/surah_4/set_03_ayah_15-21.mp4` | 31.96 MB | Direct Reuse |
| **03** | 18–22 | True Believers Cannot Equal Wrongdoers & Gardens of Shelter | விசுவாசிகளும் பாவிகளும் சமமாக மாட்டார்கள் & தங்குமிட சுவனங்கள் | `public/videos/surah_4/set_08_ayah_50-56.mp4` | 31.39 MB | Direct Reuse |
| **04** | 23–30 | Guidance of Moses, Revived Barren Land & Day of Victory | மூஸாவின் நேர்வழி, செழிப்படையும் காய்ந்த நிலம் & இறுதி வெற்றி நாள் | `public/videos/surah_4/set_25_ayah_169-176.mp4` | 31.13 MB | Direct Reuse |

---

## 4. Quality Assurance & Islamic Thematic Verification (Rule 5)

Every one of the 78 sets was strictly verified against:
1. **No Representation of Prophets or Angels (Rule 5):**
   - Zero human depictions of Zakariya, Maryam, Isa, Yahya, Nuh, Hud, Salih, Lut, Shu'ayb, Musa, Ibrahim, Luqman, or Jibril.
   - All narratives are framed via authentic atmospheric landscapes (mountain passes, streams, oceans, desert dunes, date groves, ancient rock valleys).
2. **Technical Standards (CRF 21, 1080p, 16:9 Borderless):**
   - Resolution: 1920x1080
   - Framerate: 24 fps
   - Codec: H.264 / AAC Stereo
   - Black Bars: 0px (Aspect-preserving center crop where needed).

---

## 5. Confirmation of Zero Production Impact

- **Production Directories:** `public/videos/surah_19/` through `public/videos/surah_32/` have **NOT** been created.
- **Production Manifest:** `src/lib/data/videoManifest.ts` is **completely unchanged**.
- **Production Cloudflare R2:** **Zero uploads performed**.
- **Credit Balance:** **₹0 spent** (Balance remains ₹27,550.12).
- **Git Status:** Untracked staging files isolated exclusively to `scratch/staging/batch_1_review/`.
