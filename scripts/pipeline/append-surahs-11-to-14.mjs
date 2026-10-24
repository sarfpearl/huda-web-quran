#!/usr/bin/env node
/**
 * Append meaning overrides for Surahs 11, 12, 13, 14 to surah-meaning-overrides.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetFile = path.join(__dirname, "surah-meaning-overrides.mjs");

const newOverrides = {
  "11": [
    {
      "setIndex": 1,
      "startAyah": 1,
      "endAyah": 7,
      "name": "Throne Over the Waters & Creation of Heavens and Earth",
      "themeContext": "Creation of heavens and earth in six periods, His Throne was over the water ('Arshuhu 'ala al-Ma'), to test who is best in deed",
      "reuse": "surah_10/set_01_ayah_1-7.mp4"
    },
    {
      "setIndex": 2,
      "startAyah": 8,
      "endAyah": 14,
      "name": "Unyielding Granite Cliffs & The Inimitable Revelation",
      "themeContext": "Challenge to produce ten surahs like it; knowing it is revealed with Allah's knowledge and there is no deity except Him",
      "description": "towering vertical granite mountain ridges standing resolute and impenetrable against turbulent desert winds under clear sky, immutable strength",
      "prompt": "Wide-angle full frame landscape video, towering vertical granite mountain ridges standing resolute and impenetrable against turbulent desert winds under clear sky, immutable strength, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 3,
      "startAyah": 15,
      "endAyah": 21,
      "name": "Fleeting World vs The Clear Proof from the Lord",
      "themeContext": "Those who desire fleeting worldly life vs those on clear proof from their Lord, double punishment for deniers",
      "description": "dramatic view of desert dust dispersing as bright golden morning sunlight floods across rugged canyon bluffs, dispelling shadows",
      "prompt": "Wide-angle full frame landscape video, dramatic view of desert dust dispersing as bright golden morning sunlight floods across rugged canyon bluffs, dispelling shadows, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 4,
      "startAyah": 22,
      "endAyah": 28,
      "name": "Companions of Paradise & The Warning of Nuh",
      "themeContext": "Those who believe and do righteous deeds and humble themselves before their Lord, companions of Paradise; Nuh warning his people",
      "reuse": "surah_10/set_02_ayah_8-14.mp4"
    },
    {
      "setIndex": 5,
      "startAyah": 29,
      "endAyah": 35,
      "name": "Steadfast Solitary Peak in the Wild Expanse",
      "themeContext": "Nuh declaring he asks no wealth, relying on Allah, standing firm with the believers despite mockery",
      "description": "majestic solitary desert mountain peak rising sheer above endless rolling golden sands into a vibrant azure sky, steadfast and immovable",
      "prompt": "Wide-angle full frame landscape video, majestic solitary desert mountain peak rising sheer above endless rolling golden sands into a vibrant azure sky, steadfast and immovable, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 6,
      "startAyah": 36,
      "endAyah": 42,
      "name": "The Great Deluge & Waves Like Mountains (Mawjin kal-Jibal)",
      "themeContext": "The oven overflowing, fountains of the earth gushing, building the Ark, and the Ark sailing with them in waves towering like mountains",
      "description": "colossal turbulent ocean swells rising like mountains under dramatic storm skies with majestic golden sunlight piercing the clouds onto dark blue waters",
      "prompt": "Wide-angle full frame landscape video, colossal turbulent ocean swells rising like mountains under dramatic storm skies with majestic golden sunlight piercing the clouds onto dark blue waters, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 7,
      "startAyah": 43,
      "endAyah": 49,
      "name": "Mount Judi & The Calming of the Waters",
      "themeContext": "'O earth, swallow your water, and O sky, withhold'; the water subsided, the matter ended, and the Ark rested upon Mount Judi (Jabal al-Judi)",
      "description": "majestic high-altitude mountain summit emerging above a serene sea of white cloud inversion under glorious golden morning sun, peaceful calm",
      "prompt": "Wide-angle full frame landscape video, majestic high-altitude mountain summit emerging above a serene sea of white cloud inversion under glorious golden morning sun, peaceful calm, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 8,
      "startAyah": 50,
      "endAyah": 56,
      "name": "Prophet Hud & The Wind-Swept Dunes of 'Ad",
      "themeContext": "Hud sent to 'Ad, calling them to repentance; Allah holding the forelock of every creature; reliance on Allah's straight path",
      "description": "sweeping high-altitude aerial view of wind-sculpted golden sand dunes in the vast Ahqaf desert under dramatic gusting twilight skies",
      "prompt": "Wide-angle full frame landscape video, sweeping high-altitude aerial view of wind-sculpted golden sand dunes in the vast Ahqaf desert under dramatic gusting twilight skies, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 9,
      "startAyah": 57,
      "endAyah": 63,
      "name": "Ancient Rock Dwellings of Thamud & Settling the Earth",
      "themeContext": "Destruction of 'Ad; Prophet Salih sent to Thamud: 'He brought you forth from the earth and settled you therein, so seek His forgiveness'",
      "description": "ancient monumental sandstone canyon cliffs and geological monoliths standing in silent majesty under warm afternoon sunlight",
      "prompt": "Wide-angle full frame landscape video, ancient monumental sandstone canyon cliffs and geological monoliths standing in silent majesty under warm afternoon sunlight, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 10,
      "startAyah": 64,
      "endAyah": 70,
      "name": "Pastures of the Earth & Glad Tidings to Ibrahim",
      "themeContext": "The she-camel of Allah left to graze in Allah's earth; angels visiting Ibrahim with glad tidings and roasted calf",
      "description": "serene lush green alpine pasture surrounded by distant snowy peaks bathed in crisp morning daylight, tranquil mountain meadow",
      "prompt": "Wide-angle full frame landscape video, serene lush green alpine pasture surrounded by distant snowy peaks bathed in crisp morning daylight, tranquil mountain meadow, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 11,
      "startAyah": 71,
      "endAyah": 77,
      "name": "Solemn Twilight Horizons & The Deliverance of the Righteous",
      "themeContext": "Glad tidings of Ishaq and Ya'qub; angels proceeding to Lut at dusk; Allah's decree is irrevocable",
      "description": "expansive desert valley at deep indigo blue hour with a soft golden orange horizon afterglow reflecting across tranquil sands",
      "prompt": "Wide-angle full frame landscape video, expansive desert valley at deep indigo blue hour with a soft golden orange horizon afterglow reflecting across tranquil sands, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 12,
      "startAyah": 78,
      "endAyah": 84,
      "name": "Valley of Madyan & The Standard of Honest Weights",
      "themeContext": "Prophet Shu'ayb sent to Madyan; enjoining fair measures and weights in justice; what remains with Allah is better for you",
      "description": "ancient fertile desert valley with terraced olive groves and winding dry riverbeds under clear midday sun, balance and equity",
      "prompt": "Wide-angle full frame landscape video, ancient fertile desert valley with terraced olive groves and winding dry riverbeds under clear midday sun, balance and equity, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 13,
      "startAyah": 85,
      "endAyah": 91,
      "name": "Shu'ayb's Reform & Sincere Turning to Allah",
      "themeContext": "'I only intend reform as much as I am able; my success is only through Allah; upon Him I rely and to Him I turn' (In uridu illa al-islah)",
      "description": "crystal-clear mountain stream flowing gently through flowering desert shrubs into a tranquil green valley at sunrise, purity and renewal",
      "prompt": "Wide-angle full frame landscape video, crystal-clear mountain stream flowing gently through flowering desert shrubs into a tranquil green valley at sunrise, purity and renewal, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 14,
      "startAyah": 92,
      "endAyah": 98,
      "name": "Fallen Generations & Authority of Divine Truth",
      "themeContext": "Mighty blast overtaking Madyan, as if they had never flourished; Musa sent to Pharaoh with clear divine authority",
      "description": "towering red sandstone bluffs and deep shadow canyons resting in timeless solemn silence beneath an expansive desert sky",
      "prompt": "Wide-angle full frame landscape video, towering red sandstone bluffs and deep shadow canyons resting in timeless solemn silence beneath an expansive desert sky, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 15,
      "startAyah": 99,
      "endAyah": 105,
      "name": "The Great Gathering & The Day No Soul Shall Speak",
      "themeContext": "News of the fallen cities; the Day when humanity will be gathered; no soul will speak except by His permission",
      "description": "colossal panoramic view of vast rolling hills and infinite horizons beneath sweeping clouds lit by majestic golden sunset rays",
      "prompt": "Wide-angle full frame landscape video, colossal panoramic view of vast rolling hills and infinite horizons beneath sweeping clouds lit by majestic golden sunset rays, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 16,
      "startAyah": 106,
      "endAyah": 112,
      "name": "Eternal Bliss of Paradise & 'Remain Steadfast' (Fastaqim)",
      "themeContext": "The blessed in Paradise for eternity as long as heavens and earth endure; 'So remain steadfast as you have been commanded'",
      "reuse": "surah_10/set_02_ayah_8-14.mp4"
    },
    {
      "setIndex": 17,
      "startAyah": 113,
      "endAyah": 123,
      "name": "Prayer at the Ends of the Day & Unseen Belongs to Allah",
      "themeContext": "Establishing prayer at two ends of the day and approach of night; good deeds erase evil; to Allah belongs unseen of heavens and earth",
      "description": "breathtaking panoramic sunrise over layered mountain ridges with warm golden light dispersing morning mist across the valley",
      "prompt": "Wide-angle full frame landscape video, breathtaking panoramic sunrise over layered mountain ridges with warm golden light dispersing morning mist across the valley, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    }
  ],
  "12": [
    {
      "setIndex": 1,
      "startAyah": 1,
      "endAyah": 7,
      "name": "Best of Stories & The Celestial Dream of Eleven Stars",
      "themeContext": "Best of stories revealed; Yusuf's dream of eleven stars, the sun, and the moon prostrating to him; signs for those who ask",
      "reuse": "surah_10/set_01_ayah_1-7.mp4"
    },
    {
      "setIndex": 2,
      "startAyah": 8,
      "endAyah": 14,
      "name": "The Desert Plains of Canaan & The Conspiracy",
      "themeContext": "Envy of brothers, plotting to cast Yusuf into the dark depth of the well; Ya'qub fearing the wolf",
      "description": "sweeping high-altitude aerial view of arid Canaan desert hills under dry midday sun, wind swirling dust across rugged terrain",
      "prompt": "Wide-angle full frame landscape video, sweeping high-altitude aerial view of arid Canaan desert hills under dry midday sun, wind swirling dust across rugged terrain, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 3,
      "startAyah": 15,
      "endAyah": 21,
      "name": "The Deep Desert Well (Ghayabat al-Jubb) & The Passing Caravan",
      "themeContext": "Yusuf cast into the deep well; Allah inspiring him; water-drawer lowering his bucket; sold in Egypt: 'Make his stay comfortable'",
      "description": "ancient desert stone canyon with a natural rock cistern opening into cool shadows while brilliant sunlight illuminates the cliffs above",
      "prompt": "Wide-angle full frame landscape video, ancient desert stone canyon with a natural rock cistern opening into cool shadows while brilliant sunlight illuminates the cliffs above, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 4,
      "startAyah": 22,
      "endAyah": 28,
      "name": "Maturity, Wisdom & Seeking Refuge with Allah",
      "themeContext": "Yusuf granted judgment and knowledge; steadfast in chastity: 'Allah forbid! Truly He is my Lord, He made good my stay'; vindication",
      "description": "grand towering granite monolith standing unyielding and immaculate beneath pure bright daylight, pristine integrity",
      "prompt": "Wide-angle full frame landscape video, grand towering granite monolith standing unyielding and immaculate beneath pure bright daylight, pristine integrity, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 5,
      "startAyah": 29,
      "endAyah": 35,
      "name": "Choosing Righteousness & The Sanctuary of Faith",
      "themeContext": "Women of the city cutting their hands in wonder; Yusuf choosing prison over disobedience: 'My Lord, prison is more beloved to me'",
      "description": "secluded mountain cave sanctuary overlooking peaceful valley at golden hour, warm light filling the tranquil opening",
      "prompt": "Wide-angle full frame landscape video, secluded mountain cave sanctuary overlooking peaceful valley at golden hour, warm light filling the tranquil opening, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 6,
      "startAyah": 36,
      "endAyah": 42,
      "name": "The Call to Pure Monotheism (Tawhid)",
      "themeContext": "Yusuf in prison with two young men; 'Are separate lords better or Allah, the One, the Prevailing?'; interpreting their dreams",
      "description": "solitary ancient stone pillar standing firm in the open desert under vast radiant sky, pure uncompromising truth",
      "prompt": "Wide-angle full frame landscape video, solitary ancient stone pillar standing firm in the open desert under vast radiant sky, pure uncompromising truth, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 7,
      "startAyah": 43,
      "endAyah": 49,
      "name": "The King's Dream & Seven Years of Abundant Harvest",
      "themeContext": "Seven fat cows eaten by seven lean, seven green spikes of grain and seven dry; Yusuf interpreting seven years of bumper harvest and seven years of famine",
      "description": "vast undulating golden wheat fields waving under summer breeze beneath bright sun, symbol of abundant harvest and foresight",
      "prompt": "Wide-angle full frame landscape video, vast undulating golden wheat fields waving under summer breeze beneath bright sun, symbol of abundant harvest and foresight, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 8,
      "startAyah": 50,
      "endAyah": 56,
      "name": "Storehouses of the Land (Khaza'in al-Ard) & Elevation of Yusuf",
      "themeContext": "Vindication of Yusuf; king appointing him over storehouses of Egypt; 'Thus We established Yusuf in the land to settle therein as he willed'",
      "description": "breathtaking aerial panorama of the fertile Nile delta river valley branching into lush green channels under glorious golden sunrise",
      "prompt": "Wide-angle full frame landscape video, breathtaking aerial panorama of the fertile Nile delta river valley branching into lush green channels under glorious golden sunrise, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 9,
      "startAyah": 57,
      "endAyah": 63,
      "name": "Caravan from Canaan & Divine Favor",
      "themeContext": "Brothers arriving in Egypt seeking provisions; Yusuf recognizing them; demanding their younger brother Binyamin",
      "reuse": "surah_4/set_15_ayah_99-105.mp4"
    },
    {
      "setIndex": 10,
      "startAyah": 64,
      "endAyah": 70,
      "name": "'Allah is the Best Guardian' & The Journey to Egypt",
      "themeContext": "Ya'qub entrusting Binyamin: 'Allah is the best guardian and He is the most merciful of the merciful'; brothers arriving with provisions",
      "description": "gentle rolling desert dunes illuminated by warm morning sunlight with soft golden wind ripples and peaceful horizon",
      "prompt": "Wide-angle full frame landscape video, gentle rolling desert dunes illuminated by warm morning sunlight with soft golden wind ripples and peaceful horizon, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 11,
      "startAyah": 71,
      "endAyah": 77,
      "name": "The Royal Cup & The Divine Plan Unfolding",
      "themeContext": "The drinking cup placed in Binyamin's bag; 'Thus did We plan for Yusuf... We raise in degrees whom We will, and over every possessor of knowledge is One All-Knowing'",
      "description": "deep sandstone mountain pass with dramatic interplay of light and shadow carving through ancient canyon rock",
      "prompt": "Wide-angle full frame landscape video, deep sandstone mountain pass with dramatic interplay of light and shadow carving through ancient canyon rock, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 12,
      "startAyah": 78,
      "endAyah": 84,
      "name": "Ya'qub's Patient Grief (Sabrun Jamil) & The Tear-White Eyes",
      "themeContext": "Eldest brother staying behind; Ya'qub: 'So patience is most fitting (Sabrun Jamil); perhaps Allah will bring them all back to me'; eyes turning white from grief",
      "description": "solitary mountain spring quietly welling up from beneath smooth white stones in a silent alpine valley at dusk, poignant tranquility",
      "prompt": "Wide-angle full frame landscape video, solitary mountain spring quietly welling up from beneath smooth white stones in a silent alpine valley at dusk, poignant tranquility, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 13,
      "startAyah": 85,
      "endAyah": 91,
      "name": "'I Complain Only to Allah' & Yusuf Revealed",
      "themeContext": "'I only complain of my grief and sorrow to Allah, and I know from Allah that which you know not'; Yusuf revealing his identity: 'I am Yusuf and this is my brother'",
      "description": "glorious volumetric sunbeams suddenly breaking through dark clouds to illuminate a vast green river valley below, triumphant revelation",
      "prompt": "Wide-angle full frame landscape video, glorious volumetric sunbeams suddenly breaking through dark clouds to illuminate a vast green river valley below, triumphant revelation, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 14,
      "startAyah": 92,
      "endAyah": 98,
      "name": "Fragrance of Yusuf (Rih Yusuf) & Forgiveness Granted",
      "themeContext": "'No blame upon you today; may Allah forgive you'; Ya'qub sensing the fragrance of Yusuf from afar; shirt cast over his face, vision restored",
      "description": "flowering mountain meadow filled with blooming wild herbs and wildflowers swaying gently under fresh fragrant morning breeze",
      "prompt": "Wide-angle full frame landscape video, flowering mountain meadow filled with blooming wild herbs and wildflowers swaying gently under fresh fragrant morning breeze, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 15,
      "startAyah": 99,
      "endAyah": 104,
      "name": "Fulfillment of the Celestial Dream & Dying as a Muslim",
      "themeContext": "Parents welcomed in Egypt, elevated upon the throne; realization of original dream: 'My Lord has made it come true'; Yusuf's prayer: 'Cause me to die a Muslim and join me with the righteous'",
      "description": "breathtaking panoramic sunset vista over endless golden mountains and glowing clouds, supreme serenity and divine peace",
      "prompt": "Wide-angle full frame landscape video, breathtaking panoramic sunset vista over endless golden mountains and glowing clouds, supreme serenity and divine peace, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 16,
      "startAyah": 105,
      "endAyah": 111,
      "name": "Signs in Heavens and Earth & Calling with Insight (Basirah)",
      "themeContext": "Signs in heavens and earth passed by; 'Say: This is my way; I invite to Allah upon insight (Basirah), I and whoever follows me'; lesson for people of understanding",
      "reuse": "surah_10/set_15_ayah_99-109.mp4"
    }
  ],
  "13": [
    {
      "setIndex": 1,
      "startAyah": 1,
      "endAyah": 7,
      "name": "Heavens Raised Without Pillars & Neighboring Plots of Soil",
      "themeContext": "Allah raised the heavens without pillars you can see; subjected sun and moon; placed firm mountains and rivers; neighboring plots irrigated with one water yet differing in fruit taste",
      "description": "epic aerial panorama of vast fertile agricultural lands bordering desert mountains, diverse lush green plots watered by a winding river under vast open sky",
      "prompt": "Wide-angle full frame landscape video, epic aerial panorama of vast fertile agricultural lands bordering desert mountains, diverse lush green plots watered by a winding river under vast open sky, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 2,
      "startAyah": 8,
      "endAyah": 14,
      "name": "Knower of the Unseen & Lightning of Fear and Hope",
      "themeContext": "He knows what every female carries; Knower of the unseen; guardian angels; He shows you lightning for fear and hope and produces heavy clouds",
      "description": "dramatic colossal cumulus storm clouds illuminated by radiant flashes of atmospheric lightning over rugged mountains under sunset skies",
      "prompt": "Wide-angle full frame landscape video, dramatic colossal cumulus storm clouds illuminated by radiant flashes of atmospheric lightning over rugged mountains under sunset skies, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 3,
      "startAyah": 15,
      "endAyah": 21,
      "name": "Thunder Glorifying His Praise & The Enduring Benefit in the Earth",
      "themeContext": "The thunder glorifies His praise (wa-yusabbihu ar-ra'du bi-hamdihi); water flowing in valleys according to measure; foam vanishing while what benefits mankind remains in the earth",
      "description": "crystal-clear mountain river rushing powerfully through granite gorges, pure fresh water flowing steadily through fertile valleys under dramatic clearing clouds",
      "prompt": "Wide-angle full frame landscape video, crystal-clear mountain river rushing powerfully through granite gorges, pure fresh water flowing steadily through fertile valleys under dramatic clearing clouds, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 4,
      "startAyah": 22,
      "endAyah": 28,
      "name": "'In the Remembrance of Allah Hearts Find Rest' & Gardens of Eden",
      "themeContext": "Those patient seeking the face of their Lord; Gardens of perpetual residence; 'Unquestionably, by the remembrance of Allah hearts find rest' (Ala bi-dhikrillahi tatma'innu al-qulub)",
      "reuse": "surah_6/set_19_ayah_127-133.mp4"
    },
    {
      "setIndex": 5,
      "startAyah": 29,
      "endAyah": 35,
      "name": "Tuba: The Beautiful Place of Return & Eternal Fruit of Paradise",
      "themeContext": "Good for those who believe and a beautiful place of return; Parable of Paradise promised to the righteous: rivers flowing beneath, perpetual fruit and shade",
      "reuse": "surah_10/set_02_ayah_8-14.mp4"
    },
    {
      "setIndex": 6,
      "startAyah": 36,
      "endAyah": 43,
      "name": "The Mother of the Book (Umm al-Kitab) & All Sovereignty to Allah",
      "themeContext": "Allah eliminates what He wills and confirms, with Him is the Mother of the Book; seeing the earth diminished from its borders; Allah sufficient as witness",
      "description": "majestic high-altitude vista of mountain ranges meeting glowing horizon at sunrise, vast cosmic sovereignty",
      "prompt": "Wide-angle full frame landscape video, majestic high-altitude vista of mountain ranges meeting glowing horizon at sunrise, vast cosmic sovereignty, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    }
  ],
  "14": [
    {
      "setIndex": 1,
      "startAyah": 1,
      "endAyah": 7,
      "name": "From Darkness into Light & 'If You Are Grateful I Will Increase You'",
      "themeContext": "Book revealed to lead mankind from darkness into light; 'If you are grateful, I will surely increase your favor' (La'in shakartum la-azidannakum)",
      "description": "dramatic golden dawn breaking over dark mountain crests, brilliant rays of sunlight scattering morning mist and filling the valley with pure radiant light",
      "prompt": "Wide-angle full frame landscape video, dramatic golden dawn breaking over dark mountain crests, brilliant rays of sunlight scattering morning mist and filling the valley with pure radiant light, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 2,
      "startAyah": 8,
      "endAyah": 14,
      "name": "'Upon Allah Let the Relying Rely' & Resolute Mountains",
      "themeContext": "If all on earth disbelieved, Allah is Free of need and Praiseworthy; messengers relying upon Allah: 'Upon Allah let the relying rely'",
      "description": "monumental granite cliff face rising tall and immovable against howling winds under crisp daylight, steadfast reliance",
      "prompt": "Wide-angle full frame landscape video, monumental granite cliff face rising tall and immovable against howling winds under crisp daylight, steadfast reliance, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 3,
      "startAyah": 15,
      "endAyah": 21,
      "name": "Deeds Like Ashes in a Tempest & The True Creation",
      "themeContext": "Parable of those who disbelieve: their deeds are like ashes in a fierce wind on a stormy day; Allah created the heavens and earth in truth",
      "description": "dark dramatic desert storm clouds rolling rapidly over desolate red rock canyons with fierce wind blowing dust across the wilderness",
      "prompt": "Wide-angle full frame landscape video, dark dramatic desert storm clouds rolling rapidly over desolate red rock canyons with fierce wind blowing dust across the wilderness, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 4,
      "startAyah": 22,
      "endAyah": 28,
      "name": "Parable of the Good Word: The Noble Firmly-Rooted Tree",
      "themeContext": "Parable of a good word (Kalimah Tayyibah) like a good tree, its root firmly fixed and its branches high in the sky, producing fruit in every season",
      "description": "magnificent ancient cedar tree standing proudly on a mountain ridge with deep strong roots clinging to granite rocks and lush green canopy against sunset sky",
      "prompt": "Wide-angle full frame landscape video, magnificent ancient cedar tree standing proudly on a mountain ridge with deep strong roots clinging to granite rocks and lush green canopy against sunset sky, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 5,
      "startAyah": 29,
      "endAyah": 35,
      "name": "Subjected Sun, Moon, Ships and Rivers & Boundless Bounties",
      "themeContext": "He created heavens and earth, sends water from sky producing fruits, subjected ships to sail, subjected rivers, sun, moon, and night and day",
      "reuse": "surah_10/set_04_ayah_22-28.mp4"
    },
    {
      "setIndex": 6,
      "startAyah": 36,
      "endAyah": 42,
      "name": "Ibrahim's Prayer in the Barren Valley of Makkah",
      "themeContext": "'My Lord, make this city secure'; 'Our Lord, I have settled some of my offspring in an uncultivated valley near Your Sacred House so they may establish prayer... provide them with fruits'",
      "description": "stark, solemn red granite mountain valley in the desert surrounded by jagged barren peaks under warm afternoon sun, eternal sanctuary",
      "prompt": "Wide-angle full frame landscape video, stark, solemn red granite mountain valley in the desert surrounded by jagged barren peaks under warm afternoon sun, eternal sanctuary, slow gentle aerial glide moving smoothly forward across vast nature, breathtaking scale, National Geographic 8k nature documentary footage, peaceful, 24fps. Edge-to-edge 16:9 full screen filling every single pixel completely from top to bottom and left to right. 100% borderless, unmatted, clean full frame video. No black bars, no letterboxing, no pillarboxing, no dark bands, no darkened borders, no cinematic bars, no widescreen mattes, no film borders, no vignette, no shaded margins, no gradient bars, no human faces, no human bodies, no silhouettes, no angels, no prophets, no sacred figures, no people, no architecture, no buildings, no text, no logos"
    },
    {
      "setIndex": 7,
      "startAyah": 43,
      "endAyah": 52,
      "name": "The Transformation of Earth and Heavens & The Universal Message",
      "themeContext": "The Day the earth will be replaced with another earth, and the heavens as well; all come before Allah; this Quran is a notification for all mankind to know He is One God",
      "reuse": "surah_10/set_15_ayah_99-109.mp4"
    }
  ]
};

// Read current content and append before the closing bracket
let content = fs.readFileSync(targetFile, "utf8");
const lastBraceIdx = content.lastIndexOf("};");

if (lastBraceIdx === -1) {
  console.error("Could not find closing bracket in overrides file!");
  process.exit(1);
}

// Convert newOverrides into clean JS snippet
const jsonStr = JSON.stringify(newOverrides, null, 2).slice(1, -1).trim(); // remove outer {}

const updatedContent = content.slice(0, lastBraceIdx) + ",\n  " + jsonStr + "\n};\n";
fs.writeFileSync(targetFile, updatedContent, "utf8");
console.log("✅ Successfully appended Surahs 11, 12, 13, and 14 to surah-meaning-overrides.mjs!");
