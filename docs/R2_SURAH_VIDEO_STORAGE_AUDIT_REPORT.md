# Cloudflare R2 Surah Video & Storage Audit Report

**தேதி:** 2026-10-23  
**நிலை:** ✅ COMPLETE (Strictly Read-Only Audit)  
**பக்கெட்:** `huda-quran-media`  
**முறைமை:** Zero-Modification, Zero-Upload, Zero-Delete, Zero-Compress (முழுமையான தகவல் அறிக்கை மட்டும்)

---

## 1. Executive Summary (சுருக்கம்)

Cloudflare R2 பக்கெட்டில் (`huda-quran-media`) உள்ள **1,206 கோப்புகள்** (10,599,718,606 பைட்டுகள் / ~10.60 GB) அனுமதிக்கப்பட்ட S3 Read-Only API வழியாக நேரடியாகத் தணிக்கை செய்யப்பட்டு, புனித குர்ஆனின் **114 சுராக்களுக்கும் தனித்தனியாக வீடியோ எண்ணிக்கை, சேமிப்பளவு பயன்பாடு (Storage Usage), மற்றும் விடுபட்ட வடிவங்கள் (Missing Formats)** விரிவாகக் கணக்கிடப்பட்டுள்ளன.

- **114 சுராக்களின் உள்ளடக்கம் (Coverage):** **114 / 114 (100%)** — அனைத்து 114 சுராக்களுக்கும் R2-ல் வீடியோக்கள் உள்ளன. எவ்வித வீடியோவுமே இல்லாத சுரா என்று ஒன்று கூட இல்லை (0 Missing Surahs).
- **சுரா வீடியோக்களின் மொத்த எண்ணிக்கை:** **505 வீடியோக்கள்** (8,269,240,524 பைட்டுகள் / ~**7.70 GB**).
- **பிற உற்பத்தி சொத்துக்கள் (Production Assets):**
  - ஜுஸ் 1 வீடியோக்கள்: 9 கோப்புகள் (50.33 MB)
  - மாகேர் அல்-முஐக்லி 30 ஜுஸ் ஆடியோக்கள்: 50 கோப்புகள் (1,946.81 MB / ~1.95 GB)
  - வலைத்தள UI படங்கள் & பேனர்கள்: 642 கோப்புகள் (225.18 MB)
- **சேமிப்பகக் குவிப்பு (Storage Concentration):** 
  - Canonical Sets கொண்ட **22 சுராக்கள்** மட்டும் **6.76 GB** (85.8% வீடியோ சேமிப்பிடம்) எடுத்துக்கொள்கின்றன.
  - **77 வீடியோ கோப்புகள்** 30 MB-க்கும் அதிகமான அளவில் உள்ளன (மொத்தம் 3.31 GB).
  - இவற்றை வலைத்தளத்திற்கு உகந்த உயர்தர பிட்ரேட்டுக்கு (6–8 Mbps) சுருக்குவதன் (compress) மூலம் **~2.77 GB முதல் ~4.53 GB வரை** மிகப்பெரிய சேமிப்பக சேமிப்பை (storage savings) பெற வாய்ப்புள்ளது.

---

## 2. R2 சுரா வீடியோக்களின் 3 அடுக்கு கட்டமைப்பு (3-Tier Video Architecture)

R2 பக்கெட்டில் உள்ள 114 சுராக்களும் தங்களின் தயாரிப்பு நிலையின் அடிப்படையில் 3 வகைகளாகப் பிரிக்கப்பட்டுள்ளன:

| வகை (Group) | சுராக்கள் எண்ணிக்கை | வீடியோக்கள் | கொள்ளளவு (MB) | விவரிப்பு & தற்போதைய நிலை | விடுபட்ட அம்சங்கள் (Missing Aspects) |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **Group A: Canonical Sets Ready** | **22 சுராக்கள்** | 332 வீடியோக்கள் | 6,761.61 MB (~6.76 GB) | சுராக்கள் 4–17, 19, 23, 25, 26, 28, 30, 31, 32. வசன-குழு வாரியான (`set_*.mp4`) அங்கீகரிக்கப்பட்ட செட்கள் + முழு சுரா வீடியோ | முழுமையான உற்பத்தி நிலை (No missing files) |
| **Group B: Chapter Segmented** | **3 சுராக்கள்** | 84 வீடியோக்கள் | 875.60 MB (~0.88 GB) | சுரா 2 (53 அத்தியாயங்கள் + 8 ஆயாக்கள்), சுரா 3 (20 அத்தியாயங்கள்), சுரா 18 (3 அத்தியாயங்கள்) | தனித்தனி வசன-குழு `set_*` கோப்புகள் இல்லை |
| **Group C: Full Surah Video Only** | **89 சுராக்கள்** | 89 வீடியோக்கள் | 249.13 MB (~0.25 GB) | சுரா 1, 20–22, 24, 27, 29, 33–114. ஒரு முழுமையான ஒற்றை சுரா வீடியோ (`videos/surah/<num>-<slug>.mp4`) | வசன-குழு வாரியான Canonical Sets இன்னும் உருவாக்கப்படவில்லை |
| **மொத்தம்** | **114 சுராக்கள்** | **505 வீடியோக்கள்** | **7,886.34 MB (~7.70 GB)** | **100% சுராக்களுக்கும் வீடியோ ஆதரவு உள்ளது** | **Group C-ல் செட்கள் உருவாக்கப்படலாம்** |

---

## 3. சேமிப்பகப் பயன்பாட்டில் முதல் 15 சுராக்கள் (Top 15 Storage Consuming Surahs)

R2 பக்கெட்டில் அதிக சேமிப்பகத்தை எடுத்துக்கொள்ளும் முதல் 15 சுராக்கள் கீழே பட்டியலிடப்பட்டுள்ளன:

| எண் | சுரா எண் & பெயர் | ஆங்கிலப் பெயர் | தமிழ் ஒலிபெயர்ப்பு | வகை (Tier) | வீடியோ எண்ணிக்கை | சேமிப்பளவு (MB) | % of Video Storage |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | சுரா 2. سُورَةُ البَقَرَةِ | The Cow | அல்-பகரா | Chapter Segmented | 61 | 722.76 MB | 9.2% |
| 2 | சுரா 6. سُورَةُ الأَنۡعَامِ | The Cattle | அல்-அன்ஆம் | Canonical Sets Ready | 24 | 656.48 MB | 8.3% |
| 3 | சுரா 7. سُورَةُ الأَعۡرَافِ | The Heights | அல்-அஃராஃப் | Canonical Sets Ready | 30 | 637.18 MB | 8.1% |
| 4 | சுரா 4. سُورَةُ النِّسَاءِ | The Women | அந்-நிஸா | Canonical Sets Ready | 26 | 621.09 MB | 7.9% |
| 5 | சுரா 9. سُورَةُ التَّوۡبَةِ | The Repentance | அத்-தவ்பா | Canonical Sets Ready | 19 | 434.50 MB | 5.5% |
| 6 | சுரா 5. سُورَةُ المَائِدَةِ | The Table | அல்-மாயிதா | Canonical Sets Ready | 18 | 373.54 MB | 4.7% |
| 7 | சுரா 16. سُورَةُ النَّحۡلِ | The Bee | அந்-நஹ்ல் | Canonical Sets Ready | 19 | 367.39 MB | 4.7% |
| 8 | சுரா 11. سُورَةُ هُودٍ | Hud | ஹூத் | Canonical Sets Ready | 18 | 365.82 MB | 4.6% |
| 9 | சுரா 15. سُورَةُ الحِجۡرِ | The Rock | அல்-ஹிஜ்ர் | Canonical Sets Ready | 15 | 360.48 MB | 4.6% |
| 10 | சுரா 23. سُورَةُ المُؤۡمِنُونَ | The Believers | அல்-முஃமினூன் | Canonical Sets Ready | 15 | 339.63 MB | 4.3% |
| 11 | சுரா 17. سُورَةُ الإِسۡرَاءِ | The Night Journey | அல்-இஸ்ரா | Canonical Sets Ready | 17 | 339.28 MB | 4.3% |
| 12 | சுரா 26. سُورَةُ الشُّعَرَاءِ | The Poets | அஷ்-ஷுஅரா | Canonical Sets Ready | 15 | 323.89 MB | 4.1% |
| 13 | சுரா 12. سُورَةُ يُوسُفَ | Joseph | யூஸுஃப் | Canonical Sets Ready | 17 | 269.61 MB | 3.4% |
| 14 | சுரா 19. سُورَةُ مَرۡيَمَ | Mary | மர்யம் | Canonical Sets Ready | 15 | 268.39 MB | 3.4% |
| 15 | சுரா 28. سُورَةُ القَصَصِ | The Stories | அல்-கஸஸ் | Canonical Sets Ready | 12 | 251.05 MB | 3.2% |

---

## 4. சுருக்க மதிப்பீடு & முடிவெடுக்கும் வழிகாட்டி (Compression Decision Matrix)

பயனர் கேட்டபடி, எதை சுருக்கலாம் என்பதை முடிவு செய்வதற்குத் தேவையான தொழில்நுட்பப் பகுப்பாய்வு:

### 4.1. பெரிய கோப்புகளின் விநியோகம் (Size Distribution):
- **> 50 MB உள்ள கோப்புகள்:** 15 கோப்புகள் — மொத்தம் **989.33 MB**
- **> 40 MB உள்ள கோப்புகள்:** 32 கோப்புகள் — மொத்தம் **1,748.34 MB**
- **> 30 MB உள்ள கோப்புகள்:** 77 கோப்புகள் — மொத்தம் **3,312.93 MB (~3.31 GB)**

### 4.2. சுருக்குவதற்கான பரிந்துரைக்கப்பட்ட முன்னுரிமைகள் (Compression Stages):

#### நிலை 1 (Stage 1 — உடனடி சேமிப்பு / High-Yield Target):
- **இலக்கு:** 30 MB-க்கு மேல் உள்ள **77 பெரிய Canonical Set வீடியோக்கள்**.
- **காரணம்:** இவை வெறும் 8 வினாடிகள் கொண்ட கிளிப்புகள், ஆனால் 35–61 Mbps போன்ற அதீத பிட்ரேட்டில் ரெண்டர் செய்யப்பட்டுள்ளன.
- **நடவடிக்கை:** H.264 CRF 20 (6–8 Mbps) உயர்தர வலைத்தள பிட்ரேட்டுக்கு மாற்றினால் தரம் துளியும் குறையாமல் கோப்பு அளவு 7–8 MB ஆகக் குறையும்.
- **எதிர்பார்க்கப்படும் சேமிப்பிடம்:** 3,313 MB → ~540 MB (**~2,773 MB / ~2.77 GB சேமிக்கப்படும் — 83.7% குறைப்பு!**).

#### நிலை 2 (Stage 2 — முழுமையான Canonical Sets உகப்பாக்கம் / Full Optimization):
- **இலக்கு:** அனைத்து **310 Canonical செட்கள்** (தற்போது 6,696 MB / ~6.70 GB).
- **எதிர்பார்க்கப்படும் சேமிப்பிடம்:** 6,696 MB → ~2,170 MB (**~4,526 MB / ~4.53 GB சேமிக்கப்படும் — 67.6% குறைப்பு!**).

---

## 5. 114 சுராக்களின் முழுமையான விரிவான அட்டவணை (Complete 114 Surah Audit Table)

கீழ்க்கண்ட அட்டவணையில் அனைத்து 114 சுராக்களின் நேரடி R2 வீடியோ இருப்பு விவரங்கள் வழங்கப்பட்டுள்ளன:

| எண் | சுரா பெயர் (அரபு & தமிழ்) | ஆங்கிலப் பெயர் | வீடியோக்கள் | R2 சேமிப்பளவு (MB) | தற்போதைய நிலை | உள்ள கோப்புகள் விவரம் | விடுபட்டவை / குறிப்புகள் |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| 1 | سُورَةُ ٱلْفَاتِحَةِ (அல்-ஃபாத்திஹா) | The Opening | 1 | 6.70 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 2 | سُورَةُ البَقَرَةِ (அல்-பகரா) | The Cow | 61 | 722.76 MB | Chapter Segmented | 53 Chapters + 8 Ayahs | No Canonical set_* videos |
| 3 | سُورَةُ آلِ عِمۡرَانَ (ஆலு இம்ரான்) | The Family of Imraan | 20 | 151.97 MB | Chapter Segmented | 20 Chapters | No Canonical set_* videos |
| 4 | سُورَةُ النِّسَاءِ (அந்-நிஸா) | The Women | 26 | 621.09 MB | Canonical Sets Ready | 25 Canonical Sets + 1 Full Video | None (முழுமை) |
| 5 | سُورَةُ المَائِدَةِ (அல்-மாயிதா) | The Table | 18 | 373.54 MB | Canonical Sets Ready | 17 Canonical Sets + 1 Full Video | None (முழுமை) |
| 6 | سُورَةُ الأَنۡعَامِ (அல்-அன்ஆம்) | The Cattle | 24 | 656.48 MB | Canonical Sets Ready | 23 Canonical Sets + 1 Full Video | None (முழுமை) |
| 7 | سُورَةُ الأَعۡرَافِ (அல்-அஃராஃப்) | The Heights | 30 | 637.18 MB | Canonical Sets Ready | 29 Canonical Sets + 1 Full Video | None (முழுமை) |
| 8 | سُورَةُ الأَنفَالِ (அல்-அன்ஃபால்) | The Spoils of War | 12 | 180.16 MB | Canonical Sets Ready | 11 Canonical Sets + 1 Full Video | None (முழுமை) |
| 9 | سُورَةُ التَّوۡبَةِ (அத்-தவ்பா) | The Repentance | 19 | 434.50 MB | Canonical Sets Ready | 18 Canonical Sets + 1 Full Video | None (முழுமை) |
| 10 | سُورَةُ يُونُسَ (யூனுஸ்) | Jonas | 16 | 244.07 MB | Canonical Sets Ready | 15 Canonical Sets + 1 Full Video | None (முழுமை) |
| 11 | سُورَةُ هُودٍ (ஹூத்) | Hud | 18 | 365.82 MB | Canonical Sets Ready | 17 Canonical Sets + 1 Full Video | None (முழுமை) |
| 12 | سُورَةُ يُوسُفَ (யூஸுஃப்) | Joseph | 17 | 269.61 MB | Canonical Sets Ready | 16 Canonical Sets + 1 Full Video | None (முழுமை) |
| 13 | سُورَةُ الرَّعۡدِ (அர்-ரஃது) | The Thunder | 7 | 132.35 MB | Canonical Sets Ready | 6 Canonical Sets + 1 Full Video | None (முழுமை) |
| 14 | سُورَةُ إِبۡرَاهِيمَ (இப்ராஹீம்) | Abraham | 8 | 130.78 MB | Canonical Sets Ready | 7 Canonical Sets + 1 Full Video | None (முழுமை) |
| 15 | سُورَةُ الحِجۡرِ (அல்-ஹிஜ்ர்) | The Rock | 15 | 360.48 MB | Canonical Sets Ready | 14 Canonical Sets + 1 Full Video | None (முழுமை) |
| 16 | سُورَةُ النَّحۡلِ (அந்-நஹ்ல்) | The Bee | 19 | 367.39 MB | Canonical Sets Ready | 18 Canonical Sets + 1 Full Video | None (முழுமை) |
| 17 | سُورَةُ الإِسۡرَاءِ (அல்-இஸ்ரா) | The Night Journey | 17 | 339.28 MB | Canonical Sets Ready | 16 Canonical Sets + 1 Full Video | None (முழுமை) |
| 18 | سُورَةُ الكَهۡفِ (அல்-கஹ்ஃப்) | The Cave | 3 | 0.87 MB | Chapter Segmented | 3 Chapters | No Canonical set_* videos |
| 19 | سُورَةُ مَرۡيَمَ (மர்யம்) | Mary | 15 | 268.39 MB | Canonical Sets Ready | 14 Canonical Sets + 1 Full Video | None (முழுமை) |
| 20 | سُورَةُ طه (தாஹா) | Taa-Haa | 1 | 3.49 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 21 | سُورَةُ الأَنبِيَاءِ (அல்-அன்பியா) | The Prophets | 1 | 2.39 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 22 | سُورَةُ الحَجِّ (அல்-ஹஜ்) | The Pilgrimage | 1 | 2.33 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 23 | سُورَةُ المُؤۡمِنُونَ (அல்-முஃமினூன்) | The Believers | 15 | 339.63 MB | Canonical Sets Ready | 14 Canonical Sets + 1 Full Video | None (முழுமை) |
| 24 | سُورَةُ النُّورِ (அந்-நூர்) | The Light | 1 | 2.16 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 25 | سُورَةُ الفُرۡقَانِ (அல்-ஃபுர்கான்) | The Criterion | 9 | 176.32 MB | Canonical Sets Ready | 8 Canonical Sets + 1 Full Video | None (முழுமை) |
| 26 | سُورَةُ الشُّعَرَاءِ (அஷ்-ஷுஅரா) | The Poets | 15 | 323.89 MB | Canonical Sets Ready | 14 Canonical Sets + 1 Full Video | None (முழுமை) |
| 27 | سُورَةُ النَّمۡلِ (அந்-நம்ல்) | The Ant | 1 | 2.55 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 28 | سُورَةُ القَصَصِ (அல்-கஸஸ்) | The Stories | 12 | 251.05 MB | Canonical Sets Ready | 11 Canonical Sets + 1 Full Video | None (முழுமை) |
| 29 | سُورَةُ العَنكَبُوتِ (அல்-அன்கபூத்) | The Spider | 1 | 2.29 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 30 | سُورَةُ الرُّومِ (அர்-ரூம்) | The Romans | 9 | 146.17 MB | Canonical Sets Ready | 8 Canonical Sets + 1 Full Video | None (முழுமை) |
| 31 | سُورَةُ لُقۡمَانَ (லுக்மான்) | Luqman | 6 | 55.56 MB | Canonical Sets Ready | 5 Canonical Sets + 1 Full Video | None (முழுமை) |
| 32 | سُورَةُ السَّجۡدَةِ (அஸ்-ஸஜ்தா) | The Prostration | 5 | 87.87 MB | Canonical Sets Ready | 4 Canonical Sets + 1 Full Video | None (முழுமை) |
| 33 | سُورَةُ الأَحۡزَابِ (அல்-அஹ்ஸாப்) | The Clans | 1 | 2.38 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 34 | سُورَةُ سَبَإٍ (ஸபா) | Sheba | 1 | 2.49 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 35 | سُورَةُ فَاطِرٍ (ஃபாத்திர்) | The Originator | 1 | 2.99 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 36 | سُورَةُ يسٓ (யாஸீன்) | Yaseen | 1 | 1.97 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 37 | سُورَةُ الصَّافَّاتِ (அஸ்-ஸாஃப்ஃபாத்) | Those drawn up in Ranks | 1 | 2.22 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 38 | سُورَةُ صٓ (ஸாத்) | The letter Saad | 1 | 2.58 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 39 | سُورَةُ الزُّمَرِ (அஸ்-ஸுமர்) | The Groups | 1 | 2.62 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 40 | سُورَةُ غَافِرٍ (ஃகாஃபிர்) | The Forgiver | 1 | 3.21 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 41 | سُورَةُ فُصِّلَتۡ (ஃபுஸ்ஸிலத்) | Explained in detail | 1 | 2.51 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 42 | سُورَةُ الشُّورَىٰ (அஷ்-ஷூரா) | Consultation | 1 | 2.25 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 43 | سُورَةُ الزُّخۡرُفِ (அஸ்-ஸுக்ருஃப்) | Ornaments of gold | 1 | 2.29 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 44 | سُورَةُ الدُّخَانِ (அத்-துகான்) | The Smoke | 1 | 3.73 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 45 | سُورَةُ الجَاثِيَةِ (அல்-ஜாஸியா) | Crouching | 1 | 1.96 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 46 | سُورَةُ الأَحۡقَافِ (அல்-அஹ்காஃப்) | The Dunes | 1 | 3.36 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 47 | سُورَةُ مُحَمَّدٍ (முஹம்மத்) | Muhammad | 1 | 3.06 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 48 | سُورَةُ الفَتۡحِ (அல்-ஃபத்ஹ்) | The Victory | 1 | 2.25 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 49 | سُورَةُ الحُجُرَاتِ (அல்-ஹுஜுராத்) | The Inner Apartments | 1 | 2.60 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 50 | سُورَةُ قٓ (காஃப்) | The letter Qaaf | 1 | 2.14 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 51 | سُورَةُ الذَّارِيَاتِ (அத்-தாரியாத்) | The Winnowing Winds | 1 | 3.59 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 52 | سُورَةُ الطُّورِ (அத்-தூர்) | The Mount | 1 | 1.99 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 53 | سُورَةُ النَّجۡمِ (அந்-நஜ்ம்) | The Star | 1 | 3.81 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 54 | سُورَةُ القَمَرِ (அல்-கமர்) | The Moon | 1 | 1.97 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 55 | سُورَةُ الرَّحۡمَٰن (அர்-ரஹ்மான்) | The Beneficent | 1 | 2.60 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 56 | سُورَةُ الوَاقِعَةِ (அல்-வாகிஆ) | The Inevitable | 1 | 2.73 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 57 | سُورَةُ الحَدِيدِ (அல்-ஹதீத்) | The Iron | 1 | 3.87 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 58 | سُورَةُ المُجَادلَةِ (அல்-முஜாதலா) | The Pleading Woman | 1 | 2.23 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 59 | سُورَةُ الحَشۡرِ (அல்-ஹஷ்ர்) | The Exile | 1 | 4.00 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 60 | سُورَةُ المُمۡتَحنَةِ (அல்-மும்தஹினா) | She that is to be examined | 1 | 2.83 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 61 | سُورَةُ الصَّفِّ (அஸ்-ஸஃப்ஃப்) | The Ranks | 1 | 3.31 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 62 | سُورَةُ الجُمُعَةِ (அல்-ஜுமுஆ) | Friday | 1 | 4.08 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 63 | سُورَةُ المُنَافِقُونَ (அல்-முனாஃபிகூன்) | The Hypocrites | 1 | 3.34 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 64 | سُورَةُ التَّغَابُنِ (அத்-தகாபுன்) | Mutual Disillusion | 1 | 2.39 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 65 | سُورَةُ الطَّلَاقِ (அத்-தலாக்) | Divorce | 1 | 2.06 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 66 | سُورَةُ التَّحۡرِيمِ (அத்-தஹ்ரீம்) | The Prohibition | 1 | 2.30 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 67 | سُورَةُ المُلۡكِ (அல்-முல்க்) | The Sovereignty | 1 | 2.43 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 68 | سُورَةُ القَلَمِ (அல்-கலம்) | The Pen | 1 | 2.22 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 69 | سُورَةُ الحَاقَّةِ (அல்-ஹாக்கா) | The Reality | 1 | 2.43 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 70 | سُورَةُ المَعَارِجِ (அல்-மஆரிஜ்) | The Ascending Stairways | 1 | 2.45 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 71 | سُورَةُ نُوحٍ (நூஹ்) | Noah | 1 | 3.70 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 72 | سُورَةُ الجِنِّ (அல்-ஜின்) | The Jinn | 1 | 2.55 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 73 | سُورَةُ المُزَّمِّلِ (அல்-முஸ்ஸம்மில்) | The Enshrouded One | 1 | 4.00 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 74 | سُورَةُ المُدَّثِّرِ (அல்-முத்தஸ்ஸிர்) | The Cloaked One | 1 | 3.87 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 75 | سُورَةُ القِيَامَةِ (அல்-கியாமா) | The Resurrection | 1 | 2.27 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 76 | سُورَةُ الإِنسَانِ (அல்-இன்ஸான்) | Man | 1 | 2.11 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 77 | سُورَةُ المُرۡسَلَاتِ (அல்-முர்ஸலாத்) | The Emissaries | 1 | 2.70 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 78 | سُورَةُ النَّبَإِ (அந்-நபா) | The Announcement | 1 | 2.58 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 79 | سُورَةُ النَّازِعَاتِ (அந்-நாஸிஆத்) | Those who drag forth | 1 | 2.13 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 80 | سُورَةُ عَبَسَ (அபஸ) | He frowned | 1 | 2.60 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 81 | سُورَةُ التَّكۡوِيرِ (அத்-தக்வீர்) | The Overthrowing | 1 | 2.28 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 82 | سُورَةُ الانفِطَارِ (அல்-இன்ஃபிதார்) | The Cleaving | 1 | 4.30 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 83 | سُورَةُ المُطَفِّفِينَ (அல்-முதஃப்ஃபிஃபீன்) | Defrauding | 1 | 2.51 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 84 | سُورَةُ الانشِقَاقِ (அல்-இன்ஷிகாக்) | The Splitting Open | 1 | 3.67 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 85 | سُورَةُ البُرُوجِ (அல்-புரூஜ்) | The Constellations | 1 | 2.59 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 86 | سُورَةُ الطَّارِقِ (அத்-தாரிக்) | The Morning Star | 1 | 3.36 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 87 | سُورَةُ الأَعۡلَىٰ (அல்-அஃலா) | The Most High | 1 | 2.19 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 88 | سُورَةُ الغَاشِيَةِ (அல்-ஃகாஷியா) | The Overwhelming | 1 | 2.58 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 89 | سُورَةُ الفَجۡرِ (அல்-ஃபஜ்ர்) | The Dawn | 1 | 2.42 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 90 | سُورَةُ البَلَدِ (அல்-பலத்) | The City | 1 | 2.26 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 91 | سُورَةُ الشَّمۡسِ (அஷ்-ஷம்ஸ்) | The Sun | 1 | 2.52 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 92 | سُورَةُ اللَّيۡلِ (அல்-லைல்) | The Night | 1 | 2.48 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 93 | سُورَةُ الضُّحَىٰ (அள்-ளுஹா) | The Morning Hours | 1 | 2.49 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 94 | سُورَةُ الشَّرۡحِ (அஷ்-ஷரஹ்) | The Consolation | 1 | 2.73 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 95 | سُورَةُ التِّينِ (அத்-தீன்) | The Fig | 1 | 2.40 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 96 | سُورَةُ العَلَقِ (அல்-அலக்) | The Clot | 1 | 3.92 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 97 | سُورَةُ القَدۡرِ (அல்-கத்ர்) | The Power, Fate | 1 | 3.68 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 98 | سُورَةُ البَيِّنَةِ (அல்-பய்யினா) | The Evidence | 1 | 3.04 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 99 | سُورَةُ الزَّلۡزَلَةِ (அஸ்-ஸல்ஸலா) | The Earthquake | 1 | 2.74 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 100 | سُورَةُ العَادِيَاتِ (அல்-ஆதியாத்) | The Chargers | 1 | 2.64 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 101 | سُورَةُ القَارِعَةِ (அல்-காரிஆ) | The Calamity | 1 | 2.48 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 102 | سُورَةُ التَّكَاثُرِ (அத்-தகாஸுர்) | Competition | 1 | 2.30 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 103 | سُورَةُ العَصۡرِ (அல்-அஸ்ர்) | The Declining Day, Epoch | 1 | 2.29 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 104 | سُورَةُ الهُمَزَةِ (அல்-ஹுமஸா) | The Traducer | 1 | 2.33 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 105 | سُورَةُ الفِيلِ (அல்-ஃபீல்) | The Elephant | 1 | 2.87 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 106 | سُورَةُ قُرَيۡشٍ (குறைஷ்) | Quraysh | 1 | 2.59 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 107 | سُورَةُ المَاعُونِ (அல்-மாஊன்) | Almsgiving | 1 | 2.62 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 108 | سُورَةُ الكَوۡثَرِ (அல்-கவ்ஸர்) | Abundance | 1 | 3.05 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 109 | سُورَةُ الكَافِرُونَ (அல்-காஃபிரூன்) | The Disbelievers | 1 | 2.71 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 110 | سُورَةُ النَّصۡرِ (அந்-நஸ்ர்) | Divine Support | 1 | 2.55 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 111 | سُورَةُ المَسَدِ (அல்-மஸத்) | The Palm Fibre | 1 | 3.82 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 112 | سُورَةُ الإِخۡلَاصِ (அல்-இக்லாஸ்) | Sincerity | 1 | 2.54 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 113 | سُورَةُ الفَلَقِ (அல்-ஃபலக்) | The Dawn | 1 | 3.08 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |
| 114 | سُورَةُ النَّاسِ (அந்-நாஸ்) | Mankind | 1 | 3.44 MB | Full Surah Only | 1 Full Video | No Canonical set_* verse-group videos |

---

## 6. பாதுகாப்பு மற்றும் உறுதிப்பாட்டு அறிக்கை (Zero-Action Read-Only Guarantee)

- **பயன்படுத்தப்பட்ட API:** `@aws-sdk/client-s3` (வழங்கப்பட்ட அதிகாரப்பூர்வ `.env.local` நற்சான்றிதழ்கள் மூலம் `ListObjectsV2Command` மட்டும் பயன்படுத்தப்பட்டது).
- **பதிவேற்றங்கள் (Uploads):** 0 (எதுவும் பதிவேற்றப்படவில்லை).
- **நீக்கங்கள் (Deletions):** 0 (எதுவும் நீக்கப்படவில்லை).
- **கோப்பு மாற்றங்கள் (Modifications):** 0 (எந்தக் குறியீடும் மாற்றப்படவில்லை).
- **சுருக்கம் (Compression):** 0 (பயனரின் எதிர்கால முடிவிற்காக பகுப்பாய்வு மட்டுமே செய்யப்பட்டுள்ளது; எந்த வீடியோவும் சுருக்கப்படவில்லை).
- **Deployment & Git:** Zero Git commit, Zero push, Zero deployment.
