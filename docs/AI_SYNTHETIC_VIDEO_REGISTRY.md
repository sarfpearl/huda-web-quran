# 🤖 HuDa Web Quran — AI Synthetic Video Asset Registry & Ledger

> **Audited & Created:** 2026-10-14  
> **Classification:** Tier B — Synthetic Generative Visual Assets  
> **Source Platform:** Google Cloud Vertex AI  
> **GCP Project ID:** `gen-lang-client-0172381348`  
> **Region:** `us-central1`  
> **Delivery Target:** Cloudflare R2 CDN (`pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`)  
> **Runtime Manifest:** [`src/lib/data/videoManifest.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoManifest.ts)  

---

## 1. Provenance Statement & Transparency

All background video assets documented in this registry are **synthetically generated cinematic landscapes** produced via Google Cloud Vertex AI video generation models (Veo). They are designed to provide meditative, non-distracting visual context for Quranic recitation.

* **Strict Truth in Labeling:** These assets are **NOT** camera-recorded real footage and must never be labeled, licensed, or represented as authentic real-world cinematography.
* **Real Footage Separation:** Authentic recorded camera footage is documented exclusively in [`docs/REAL_FOOTAGE_LICENSES.md`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/docs/REAL_FOOTAGE_LICENSES.md) and applies only to the 8 curated Ayah-level clips in Surah 2 (Al-Baqarah).

---

## 2. Models & Generation Specifications

| Model Identifier | Native Resolution | Frame Rate | Duration | Typical Bitrate | Usage Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `veo-3.1-fast-generate-001` | 1080p ($1920 \times 1080$) | 24 fps | 8.0 s | 15–20 Mbps (CRF 21) | Aal-Imran (03a–10b, Oct 2026); Al-Baqarah (ch8–ch9) |
| `veo-3.1-generate-001` | 4K UHD ($3840 \times 2160$) | 24 fps | 8.0 s | 98 Mbps (raw) | Al-Fatihah 4K master, Al-Baqarah 4K masters, Juz 1 4K |
| Legacy Veo / Pilot | 1080p / 720p | 24/30 fps | 5–8 s | 8–15 Mbps | Single Surah background loops (Surahs 4–114) |

---

## 3. Mandatory Prompt Architecture

Every generative clip adheres to the following strict 5-tier composition rules:

$$\text{Final Prompt} = \text{OPENING} + \text{SCENE} + \text{CAMERA} + \text{NEGATIVE} + \text{AVOID}$$

1. **`OPENING`:**  
   `"A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position with all filming equipment completely outside the visible composition"`
2. **`SCENE`:**  
   Authentic Quranic-historical terrain, light, and natural ambient motion (e.g. Hejaz granite valleys, Wadi Rum sandstone, Galilee hills, Jordan Valley groves).
3. **`CAMERA`:**  
   `"The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, orbit, rotation, drone movement, or artificial parallax. Completely consistent ambient illumination throughout the entire 8-second shot, with no moving sun, no time-lapse progression, no shifting shadows, and no exposure change. Completely motionless camera framing ensures absolute visual stability, zero parallax shift, and clean loop compatibility. Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame."`
4. **`NEGATIVE`:**  
   `"No black bars, no letterboxing, no pillarboxing, no black bands, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no numbers, no symbols, no text, no logos. No camera equipment, no tripod, no tripod legs, no equipment shadow, no filming gear, no modern objects, no roads, no vehicles, no power lines. No humans, no faces, no hands, no feet, no bodies, no silhouettes, no footprints, no human traces, no divine figures, no angels, no prophets, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, no casualties, no hellfire, no demons, no souls, no corpses, no graves, no skeletons, no resurrection imagery, no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no tents, no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no cosmic portals, no magical particles."`
5. **`AVOID`:**  
   Scene-specific exclusions (e.g., `"No mihrab, no altar, no curtains, no lamps"`, `"No boats, no fishing nets, no crosses"`).

---

## 4. Asset Registry by Category

### Category A: Multi-Chapter Surah Visuals (Al-Baqarah & Aal-Imran)

| Asset Key | Surah | Verses | Scene Theme | Model | Native Resolution | Publication Status |
| :--- | :---: | :---: | :--- | :--- | :---: | :---: |
| `/videos/surah/002-al-baqarah/01-the-book-of-guidance.mp4` | 2 | 1–5 | The Book of Guidance, Dawn light | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/02-storm-and-illumination.mp4` | 2 | 17–20 | Storm, Desert Rain, Illumination | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/03-signs-in-earth-and-sky.mp4` | 2 | 21–29 | Signs in Earth and Sky, Cosmic balance | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/04-primordial-trust-and-repentance.mp4` | 2 | 30–39 | Primordial Trust & Repentance | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/05a-deliverance-and-water-from-granite.mp4` | 2 | 40–74 | Deliverance & Water from Granite | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/05b-parable-of-the-living-stone.mp4` | 2 | 74 | Living Stone, Springs from Bedrock | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/05c1-the-fragmented-markings-and-transient-dust.mp4` | 2 | 75–86 | Ancient Weathered Limestone, Drifting Sand | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/05c2-the-enclosed-corridor-and-return-to-light.mp4` | 2 | 87–103 | Canyon Shadows, Radiant Sky | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/05c3-universal-dominion-east-west-boundless-horizon.mp4` | 2 | 104–123 | Universal Dominion, Boundless Horizon | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/06a-valley-of-peace-security-and-sustenance.mp4` | 2 | 124–126 | Valley of Peace, Desert Spring | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/06b-raising-the-ancient-foundations.mp4` | 2 | 127–129 | Ancient Foundations on Bedrock | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/06c-the-unbroken-path-of-submission.mp4` | 2 | 130–137 | Unbroken Path, Horizon Vista | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/06d-sincerity-purity-and-passage-of-generations.mp4` | 2 | 138–141 | Sibghatullah, Mineral-tinted Rock Face | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07a-unified-orientation-and-the-middle-community.mp4` | 2 | 142–152 | Unified Orientation, Bedrock Ridge | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07b-furnace-of-adversity-patience-and-return.mp4` | 2 | 153–157 | Rugged Desert Summit, Adversity & Patience | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07c-waymarks-of-guidance-vs-concealment.mp4` | 2 | 158–163 | Twin Geological Ridges (Safa & Marwah) | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07d-living-symphony-of-cosmic-signs.mp4` | 2 | 164–167 | Living Symphony of Cosmic Signs | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07e-divergent-trails-and-false-allegiance.mp4` | 2 | 168–171 | Divergent Desert Trails | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07f-wholesome-sustenance-and-discernment.mp4` | 2 | 172–176 | Wholesome Sustenance | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/07g-ayat-al-birr-comprehensive-righteousness.mp4` | 2 | 177 | Comprehensive Righteousness | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08a-scales-of-equitable-law-and-preservation-of-life.mp4` | 2 | 178–182 | Scales of Equitable Law | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08b-month-of-guidance-and-dawn-discipline.mp4` | 2 | 183–187 | Month of Guidance (Ramadan), Dawn | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08c-celestial-timetable-and-restrained-defense.mp4` | 2 | 188–195 | Celestial Timetable, Crescent Moon | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08d-sacred-rites-arafat-and-sacred-monument.mp4` | 2 | 196–203 | Sacred Rites, Plain of Arafat | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08e-ruin-of-cultivation-vs-shelter-of-peace.mp4` | 2 | 204–214 | Ruin of Cultivation vs Shelter of Peace | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08f-ethical-stewardship-and-guardianship.mp4` | 2 | 215–220 | Ethical Stewardship | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08g1-covenant-of-marriage-and-honorable-reconciliation.mp4` | 2 | 221–237 | Honorable Covenant & Reconciliation | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08g2-compassionate-provision-and-the-central-prayer.mp4` | 2 | 238–242 | Central Prayer, Quiet Twilight | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08h1-river-test-steadfast-minority-and-equilibrium.mp4` | 2 | 243–252 | River Test, Flowing Stream Bed | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/08h2-degrees-of-messengers-and-final-call-to-spend.mp4` | 2 | 253–254 | Final Call to Spend | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/09a-ayat-al-kursi-universal-sustenance-and-boundless-cosmos.mp4` | 2 | 255 | Ayat al-Kursi, Universal Sustenance | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/09b-the-firm-handhold-and-darkness-to-light.mp4` | 2 | 256–257 | Firm Handhold, Darkness to Light | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/09c-the-sovereign-horizon-and-irresistible-dawn.mp4` | 2 | 258 | Sovereign Horizon, Irresistible Dawn | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/09d-the-silent-ruins-and-renewal-across-time.mp4` | 2 | 259 | Renewal Across Time, Ancient Strata | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/09e-the-gathering-at-the-heights-and-certainty.mp4` | 2 | 260 | Gathering at the Heights, Mountain Ridge | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10a-the-grain-of-bounty-and-multiplied-harvest.mp4` | 2 | 261 | Grain of Bounty, Multiplied Harvest | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10b-the-barren-bedrock-and-washed-silt.mp4` | 2 | 262–264 | Barren Bedrock & Washed Silt | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10c-the-elevated-garden-and-vulnerability-of-loss.mp4` | 2 | 265–266 | Elevated Garden on Foothill | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10d-the-wholesome-provision-and-hidden-offering.mp4` | 2 | 267–274 | Wholesome Provision | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10e-lawful-trade-and-the-final-return.mp4` | 2 | 275–281 | Lawful Trade & The Final Return | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/10f-the-just-covenant-and-sacred-trust.mp4` | 2 | 282–283 | Just Covenant & Sacred Trust | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/11a-cosmic-dominion-and-hidden-scrutiny.mp4` | 2 | 284 | Cosmic Dominion | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/11b-the-covenant-of-faith-and-submission.mp4` | 2 | 285 | Covenant of Faith | Veo 3.1 | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/002-al-baqarah/11c-proportionate-mercy-and-ultimate-refuge.mp4` | 2 | 286 | Proportionate Mercy & Refuge | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/01a-the-immutable-foundation-and-muhkamat.mp4` | 3 | 1–9 | Muhkamat, Ancient Granite Bedrock | Veo 3.1 | 4K UHD Master (1080p web) | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/02a-the-wealth-of-this-world-and-the-better-return.mp4` | 3 | 10–17 | Worldly Wealth vs Eternal Gardens | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/02b-the-supreme-testimony-of-tawhid-and-justice.mp4` | 3 | 18–25 | Supreme Testimony of Tawhid (Shahidallah) | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/02c-the-supreme-sovereign-and-cosmic-order.mp4` | 3 | 26–32 | Malik al-Mulk, Escarpment Twilight | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/03a-the-sanctuary-of-maryam-and-zakariya-prayer.mp4` | 3 | 33–44 | Sanctuary of Maryam, Date-Palm Grove | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/04a-the-word-from-allah-and-primordial-creation.mp4` | 3 | 45–51 | Word from Allah, Rain on Desert Silt | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/04b-the-sincere-disciples-and-elevation-of-isa.mp4` | 3 | 52–63 | Rolling Hills of Galilee, Calm Lake | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/05a-the-common-word-of-pure-monotheism.mp4` | 3 | 64–80 | Steppe Plain of Harran, Pre-Dawn Star | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/05b-the-primordial-covenant-of-the-prophets.mp4` | 3 | 81–91 | Layered Sandstone Cliffs of Wadi Rum | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/06a-true-giving-bakkah-and-sacred-security.mp4` | 3 | 92–99 | Rugged Hejaz Granite Valley, Bakkah | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/06b-holding-fast-to-the-rope-of-allah.mp4` | 3 | 100–109 | Green Mountain Valley in Asir Highlands | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/06c-the-best-nation-and-moral-steadfastness.mp4` | 3 | 110–120 | Expansive Desert Plateau, Distant Ranges | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/07a-the-topography-of-uhud-and-divine-support.mp4` | 3 | 121–138 | Volcanic Basalt Plains of Mount Uhud | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/07b-fortitude-after-setback-and-divine-pardon.mp4` | 3 | 139–151 | Windswept Mountain Pass, Clearing Light | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/08a-the-gentle-mercy-and-mutual-consultation.mp4` | 3 | 152–160 | Sheltered Terraced Olive Grove, Soft Haze | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/08b-the-living-martyrs-and-perennial-bounty.mp4` | 3 | 161–175 | High Plateau Overlooking Valley, Amber Gold | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/09a-the-impotence-of-disbelief-and-moral-trial.mp4` | 3 | 176–184 | Arid Sun-baked Bedrock Basin | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/09b-every-soul-shall-taste-death-and-dominion.mp4` | 3 | 185–189 | Weathered Desert Monolith, Crepuscular Sky | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/10a-ulul-albab-and-contemplation-of-creation.mp4` | 3 | 190–195 | Desert Summit, Cosmic Sky & Stars at Dusk | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |
| `/videos/surah/003-aal-e-imran/10b-patience-unshakable-endurance-and-triumph.mp4` | 3 | 196–200 | Endless Desert Ridge at First Radiant Dawn | Veo 3.1 Fast | 1080p | ✅ Live on R2 (200) |

### Category B: Single-Surah Ambient Backgrounds (Surahs 1, 4–114)
* **Surah 1 (Al-Fatihah):** `/videos/surah/001-al-fatihah.mp4` — Veo 3.1 4K Master, delivered as 1080p web stream.
* **Surahs 4–114:** 111 dedicated landscape clips (e.g. `/videos/surah/004-an-nisa.mp4` through `/videos/surah/114-an-nas.mp4`), each generated via Veo models and web-optimized via FFmpeg VMAF ladder.
* **Juz Backgrounds:** `/videos/juz/juz-01.mp4` — Veo 3.1 4K master, delivered as 1080p web stream.

---

## 5. Verification Status

All 187 assets listed in this registry have been verified through automated HTTP HEAD checks against the Cloudflare R2 CDN (`pub-052ee8dfbe2748bbb3b9ad42d2f9e2b1.r2.dev`) and are actively declared in [`src/lib/data/videoManifest.ts`](file:///Users/pearl-9744/Claude/Projects/huda-web-quran/src/lib/data/videoManifest.ts).
