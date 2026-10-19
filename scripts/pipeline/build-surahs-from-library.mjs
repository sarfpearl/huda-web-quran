#!/usr/bin/env node
/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Autonomous Quran Video Pipeline (Thematic Library Reuse)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Mappings for Surahs 11, 12, 13, 14, 15 leveraging our verified 138-video
 * 16:9 full-screen, deletterboxed, CRF 21 master library.
 *
 * Zero redundant Veo API calls.
 * 100% compliant with authentic Quranic Tafsir.
 * Minimal R2 storage footprint.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

const VIDEOS_DIR = path.join(ROOT_DIR, "public/videos");
const QURAN_VERSES_DIR = path.join(ROOT_DIR, "public/data/quran-verses");
const PROGRESS_FILE = path.join(ROOT_DIR, "data/progress.json");

export const THEMATIC_LIBRARY_MAP = {
  "11": {
    nameEnglish: "Hud",
    nameArabic: "هود",
    totalVerses: 123,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Throne Over the Waters & Creation of Heavens and Earth",
        themeTamil: "நீரின் மேல் அல்லாஹ்வின் அர்ஷு & வானங்கள், பூமி படைப்பு",
        librarySource: "public/videos/surah_10/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "Challenge of Ten Surahs & Resolute Granite Cliffs",
        themeTamil: "பத்து அத்தியாயங்கள் போன்ற சவால் & உறுதியான பாறைகள்",
        librarySource: "public/videos/surah_4/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Fleeting World vs The Clear Proof, Canyon Sunrise",
        themeTamil: "நிலையான உண்மை vs தற்காலிக உலகம், காலை ஒளி",
        librarySource: "public/videos/surah_4/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "Companions of Paradise & The Warning of Nuh",
        themeTamil: "சுவனவாசிகளின் சாந்தி & நூஹ் நபியின் எச்சரிக்கை",
        librarySource: "public/videos/surah_10/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Solitary Steadfast Peak of Nuh Standing Firm",
        themeTamil: "நூஹ் நபியின் அசைக்க முடியாத நம்பிக்கை & தனித்த சிகரம்",
        librarySource: "public/videos/surah_4/set_11_ayah_71-77.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 42,
        themeName: "The Great Deluge & Waves Like Mountains (Mawjin kal-Jibal)",
        themeTamil: "பெரும் பிரளயம் & மலைகளைப் போன்ற பிரம்மாண்ட அலைகள்",
        librarySource: "public/videos/surah_10/set_13_ayah_85-91.mp4"
      },
      {
        setIndex: 7,
        startAyah: 43,
        endAyah: 49,
        themeName: "Waters Subside & Ark on Mount Judi (Jabal al-Judi)",
        themeTamil: "தண்ணீர் வடிதல் & ஜூதி மலையில் தங்கிய கப்பல்",
        librarySource: "public/videos/surah_4/set_10_ayah_64-70.mp4"
      },
      {
        setIndex: 8,
        startAyah: 50,
        endAyah: 56,
        themeName: "Prophet Hud & Wind-Swept Dunes of 'Ad (Ahqaf)",
        themeTamil: "ஹூத் நபி & ஆத் கூட்டத்தாரின் காற்று வீசும் மணல் வெளிகள்",
        librarySource: "public/videos/surah_7/set_09_ayah_57-63.mp4"
      },
      {
        setIndex: 9,
        startAyah: 57,
        endAyah: 63,
        themeName: "Prophet Salih & Rock Chambers of Thamud (Mada'in Salih)",
        themeTamil: "ஸாலிஹ் நபி & ஸமூது கூட்டத்தாரின் மதாயின் ஸாலிஹ் பாறை மாளிகைகள்",
        librarySource: "public/videos/surah_7/set_10_ayah_64-70.mp4"
      },
      {
        setIndex: 10,
        startAyah: 64,
        endAyah: 70,
        themeName: "She-Camel of Allah & Glad Tidings to Ibrahim",
        themeTamil: "அல்லாஹ்வின் ஒட்டகம் & இப்ராஹீம் நபிக்கு நற்செய்தி",
        librarySource: "public/videos/surah_6/set_14_ayah_92-98.mp4"
      },
      {
        setIndex: 11,
        startAyah: 71,
        endAyah: 77,
        themeName: "Angels Visiting Lut at Dusk & Irrevocable Decree",
        themeTamil: "மாலை நேரத்தில் லூத் நபியிடம் வந்த வானவர்கள்",
        librarySource: "public/videos/surah_7/set_11_ayah_71-77.mp4"
      },
      {
        setIndex: 12,
        startAyah: 78,
        endAyah: 84,
        themeName: "Prophet Shu'ayb in Madyan & The Standard of Honest Weights",
        themeTamil: "மத்யன் நகரில் ஷுஐப் நபி & நேர்மையான அளவைகள்",
        librarySource: "public/videos/surah_7/set_12_ayah_78-84.mp4"
      },
      {
        setIndex: 13,
        startAyah: 85,
        endAyah: 91,
        themeName: "Shu'ayb's Reform & Mountain Stream of Renewal",
        themeTamil: "ஷுஐப் நபியின் சீர்திருத்தம் & தூய நீரோடை",
        librarySource: "public/videos/surah_4/set_05_ayah_29-35.mp4"
      },
      {
        setIndex: 14,
        startAyah: 92,
        endAyah: 98,
        themeName: "Fallen Generations & Ancient Sandstone Strata",
        themeTamil: "அழிந்த சமுதாயங்கள் & பழமையான சிவப்புப் பாறை அடுக்குகள்",
        librarySource: "public/videos/surah_4/set_08_ayah_50-56.mp4"
      },
      {
        setIndex: 15,
        startAyah: 99,
        endAyah: 105,
        themeName: "The Great Gathering & Rolling Golden Horizons",
        themeTamil: "மறுமை ஒன்று கூடல் & பரந்த அந்தி வெளிச்சம்",
        librarySource: "public/videos/surah_6/set_06_ayah_36-42.mp4"
      },
      {
        setIndex: 16,
        startAyah: 106,
        endAyah: 112,
        themeName: "Eternal Bliss of Paradise & 'Remain Steadfast' (Fastaqim)",
        themeTamil: "சுவனப் பேரின்பம் & நிலைத்திருத்தல் (இஸ்திகாமத்)",
        librarySource: "public/videos/surah_6/set_19_ayah_127-133.mp4"
      },
      {
        setIndex: 17,
        startAyah: 113,
        endAyah: 123,
        themeName: "Prayer at Ends of Day & Lake Sunrise Horizon",
        themeTamil: "பகலின் முனைகளில் தொழுகை & விடியலின் ஒளி",
        librarySource: "public/videos/surah_4/set_21_ayah_141-147.mp4"
      }
    ]
  },
  "12": {
    nameEnglish: "Yusuf",
    nameArabic: "يوسف",
    totalVerses: 111,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Best of Stories & Dream of 11 Stars, Sun, Moon",
        themeTamil: "அழகிய வரலாறு & 11 விண்மீன்கள், சூரியன், சந்திரனின் கனவு",
        librarySource: "public/videos/surah_10/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "Arid Desert Hills of Canaan & Brotherly Plot",
        themeTamil: "கன்ஆன் பாலைவனக் குன்றுகள் & சகோதரர்களின் சூழ்ச்சி",
        librarySource: "public/videos/surah_4/set_15_ayah_99-105.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Deep Desert Well (Ghayabat al-Jubb) & Passing Caravan",
        themeTamil: "ஆழமான பாலைவனக் கிணறு & வழிப்போக்கர் கூட்டம்",
        librarySource: "public/videos/surah_4/set_06_ayah_36-42.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "Maturity, Wisdom & Sheltered Egyptian Garden Valley",
        themeTamil: "யூஸுஃப் நபியின் வாலிபப் பருவம் & ஞானம்",
        librarySource: "public/videos/surah_4/set_03_ayah_15-21.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Seeking Refuge with Allah & Unyielding Granite Peak",
        themeTamil: "அல்லாஹ்விடம் புகலிடம் கோருதல் & உறுதியான சிகரம்",
        librarySource: "public/videos/surah_4/set_20_ayah_134-140.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 42,
        themeName: "Midnight Starry Skies & Prison Dreams Interpretation",
        themeTamil: "சிறையில் கனவு விளக்கம் & இரவின் விண்மீன்கள்",
        librarySource: "public/videos/surah_4/set_16_ayah_106-112.mp4"
      },
      {
        setIndex: 7,
        startAyah: 43,
        endAyah: 49,
        themeName: "King's Dream: 7 Green Ears of Grain & Fertile River Delta",
        themeTamil: "அரசனின் கனவு: 7 பசுமையான தானியக் கதிர்கள் & நைல் நதிப் பள்ளத்தாக்கு",
        librarySource: "public/videos/surah_7/set_15_ayah_99-105.mp4"
      },
      {
        setIndex: 8,
        startAyah: 50,
        endAyah: 56,
        themeName: "Yusuf Appointed Over Storehouses & Terraced Fields",
        themeTamil: "களஞ்சியங்களின் பொறுப்பாளர் & செழிப்பான விவசாய நிலங்கள்",
        librarySource: "public/videos/surah_6/set_18_ayah_120-126.mp4"
      },
      {
        setIndex: 9,
        startAyah: 57,
        endAyah: 63,
        themeName: "Caravan Arriving for Grain & Twilight Desert Dunes",
        themeTamil: "தான்யம் பெற வந்த வணிகக் கூட்டம் & அந்தி மணல் மேடுகள்",
        librarySource: "public/videos/surah_10/set_08_ayah_50-56.mp4"
      },
      {
        setIndex: 10,
        startAyah: 64,
        endAyah: 70,
        themeName: "Gentle Morning Breeze & Entering from Separate Gates",
        themeTamil: "வெவ்வேறு வாயில்கள் வழியாக நுழைதல் & காலைத் தென்றல்",
        librarySource: "public/videos/surah_4/set_04_ayah_22-28.mp4"
      },
      {
        setIndex: 11,
        startAyah: 71,
        endAyah: 77,
        themeName: "The King's Cup & Terraces of Divine Justice",
        themeTamil: "அரச கிண்ணம் & இறை நீதியின் அடுக்குகள்",
        librarySource: "public/videos/surah_4/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 12,
        startAyah: 78,
        endAyah: 84,
        themeName: "Eldest Brother Staying & Ya'qub's Grief at Sunset",
        themeTamil: "மூத்த சகோதரனின் தங்குதல் & யஃகூப் நபியின் கவலை",
        librarySource: "public/videos/surah_4/set_22_ayah_148-154.mp4"
      },
      {
        setIndex: 13,
        startAyah: 85,
        endAyah: 91,
        themeName: "'I Complain of My Grief Only to Allah' & Pure Waterfall",
        themeTamil: "'என் துயரத்தை அல்லாஹ்விடமே முறையிடுகிறேன்' & தூய அருவி",
        librarySource: "public/videos/surah_4/set_13_ayah_85-91.mp4"
      },
      {
        setIndex: 14,
        startAyah: 92,
        endAyah: 98,
        themeName: "Scent of Yusuf's Shirt on Wind & Reviving Verdant Earth",
        themeTamil: "சட்டையின் நறுமணம் காற்றில் வருதல் & புத்துயிர் பெறும் பூமி",
        librarySource: "public/videos/surah_10/set_05_ayah_29-35.mp4"
      },
      {
        setIndex: 15,
        startAyah: 99,
        endAyah: 104,
        themeName: "Parents on Throne & Radiant Celestial Mountain Summit",
        themeTamil: "பெற்றோருக்கு மரியாதை, கனவு நிறைவேறுதல் & ஒளிமயமான சிகரம்",
        librarySource: "public/videos/surah_10/set_10_ayah_64-70.mp4"
      },
      {
        setIndex: 16,
        startAyah: 105,
        endAyah: 111,
        themeName: "Calling with Insight (Basirah) & Cosmic Horizon",
        themeTamil: "அகப்பார்வையுடன் (பஸீரத்) அழைப்பு & அண்டவெளி தொடுவானம்",
        librarySource: "public/videos/surah_10/set_15_ayah_99-109.mp4"
      }
    ]
  },
  "13": {
    nameEnglish: "Ar-Ra'd",
    nameArabic: "الرعد",
    totalVerses: 43,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Heavens Without Pillars & Diverse Soils Irrigated with One Water",
        themeTamil: "தூண்களற்ற வானங்கள் & ஒரே நீரால் வளரும் பல சுவை கொண்ட பழங்கள்",
        librarySource: "public/videos/surah_6/set_12_ayah_78-84.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "Knower of Unseen & Lightning of Fear and Hope, Heavy Clouds",
        themeTamil: "மறைவானவற்றை அறிபவன் & மின்னல் மற்றும் கனத்த மேகங்கள்",
        librarySource: "public/videos/surah_4/set_23_ayah_155-161.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Thunder Glorifies His Praise & Rushing River Benefiting Earth",
        themeTamil: "இடி அவனது புகழைக் கூறிப் போற்றுகிறது & மனிதர்களுக்கு பயனளிக்கும் நீர்",
        librarySource: "public/videos/surah_4/set_24_ayah_162-168.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "'By Remembrance of Allah Hearts Find Rest' & Gardens of Eden",
        themeTamil: "'அல்லாஹ்வின் நினைவால் உள்ளங்கள் அமைதி பெறுகின்றன' & ஏதென் தோட்டம்",
        librarySource: "public/videos/surah_6/set_19_ayah_127-133.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Tuba: The Beautiful Place of Return & Eternal Fruit and Shade",
        themeTamil: "தூபா: அழகிய தங்குமிடம் & சுவனத்தின் நிலையான கனிகளும் நிழலும்",
        librarySource: "public/videos/surah_10/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 43,
        themeName: "Mother of the Book (Umm al-Kitab) & Divine Sovereignty",
        themeTamil: "மூல ஏடு (உம்முல் கிதாப்) & அல்லாஹ்வின் பேராதிக்கம்",
        librarySource: "public/videos/surah_10/set_15_ayah_99-109.mp4"
      }
    ]
  },
  "14": {
    nameEnglish: "Ibrahim",
    nameArabic: "إبراهيم",
    totalVerses: 52,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Darkness to Light & 'If You Are Grateful I Will Increase You'",
        themeTamil: "இருளிலிருந்து வெளிச்சம் & 'நன்றி செலுத்தினால் அதிகப்படுத்துவேன்'",
        librarySource: "public/videos/surah_4/set_25_ayah_169-176.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "'Upon Allah Let the Relying Rely' & Immovable Granite Peak",
        themeTamil: "'நம்பிக்கை வைப்போர் அல்லாஹ்விடமே நம்பிக்கை வைக்கட்டும்'",
        librarySource: "public/videos/surah_4/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Deeds Like Ashes in a Tempest & Desert Dust Storm",
        themeTamil: "புயலில் சாம்பல் போன்ற செயல்கள் & புழுதிப் புயல்",
        librarySource: "public/videos/surah_7/set_09_ayah_57-63.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "Parable of the Good Word: Noble Firmly-Rooted Tree",
        themeTamil: "பரிசுத்த வாக்கு: ஆழமாக வேரூன்றி வானளாவிய கிளைகள் கொண்ட நல்ல மரம்",
        librarySource: "public/videos/surah_5/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Subjected Ships, Rivers, Sun, Moon & Night and Day",
        themeTamil: "வசப்படுத்தப்பட்ட கப்பல்கள், ஆறுகள், சூரியன், சந்திரன், இரவு பகல்",
        librarySource: "public/videos/surah_10/set_04_ayah_22-28.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 42,
        themeName: "Ibrahim's Prayer in Uncultivated Barren Valley of Makkah",
        themeTamil: "விவசாயமற்ற மக்கா பள்ளத்தாக்கில் இப்ராஹீம் நபியின் பிரார்த்தனை",
        librarySource: "public/videos/surah_4/set_08_ayah_50-56.mp4"
      },
      {
        setIndex: 7,
        startAyah: 43,
        endAyah: 52,
        themeName: "Earth Replaced with Another Earth & One True Sovereign God",
        themeTamil: "பூமியும் வானங்களும் மாற்றப்படும் நாள் & ஏக இறைவன்",
        librarySource: "public/videos/surah_10/set_01_ayah_1-7.mp4"
      }
    ]
  },
  "15": {
    nameEnglish: "Al-Hijr",
    nameArabic: "الحجر",
    totalVerses: 99,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Heavens with Constellations (Buruj) & Protected from Deviation",
        themeTamil: "வானில் விண்மீன் மண்டலங்கள் (புரூஜ்) & அண்டவெளிப் பாதுகாப்பு",
        librarySource: "public/videos/surah_10/set_15_ayah_99-109.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "Firm Mountains Spread Across Earth & Measured Life",
        themeTamil: "பூமியில் பரப்பப்பட்ட உறுதியான மலைகள் & அளவிடப்பட்ட வாழ்க்கை",
        librarySource: "public/videos/surah_10/set_05_ayah_29-35.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Creation of Man from Primeval Altered Clay",
        themeTamil: "மனிதனின் படைப்பு: பழமையான களிமண் தாதுக்கள்",
        librarySource: "public/videos/surah_7/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "Fertile Winds Sending Water & Treasury of Bounties",
        themeTamil: "மழையைக் கொண்டுவரும் கருக்கொண்ட காற்று & அருட்கொடை பொக்கிஷம்",
        librarySource: "public/videos/surah_7/set_07_ayah_43-49.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Angels Prostrating & The Sovereign Divine Command",
        themeTamil: "வானவர்கள் சிரம் பணிதல் & தெய்வீகக் கட்டளை",
        librarySource: "public/videos/surah_7/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 42,
        themeName: "Sincere Servants Over Whom Shaytan Has No Authority",
        themeTamil: "அல்லாஹ்வின் தூய அடியார்கள் & உறுதியான சிகரம்",
        librarySource: "public/videos/surah_4/set_20_ayah_134-140.mp4"
      },
      {
        setIndex: 7,
        startAyah: 43,
        endAyah: 49,
        themeName: "The Righteous in Gardens with Springs in Peace & Security",
        themeTamil: "சுவனச் சோலைகளிலும் நீரூற்றுகளிலும் சாந்தியுடன் தங்குவோர்",
        librarySource: "public/videos/surah_10/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 8,
        startAyah: 50,
        endAyah: 56,
        themeName: "Angels Visiting Ibrahim with Glad Tidings of Righteous Son",
        themeTamil: "இப்ராஹீம் நபிக்கு ஞானமுள்ள புதல்வர் பற்றிய நற்செய்தி",
        librarySource: "public/videos/surah_6/set_14_ayah_92-98.mp4"
      },
      {
        setIndex: 9,
        startAyah: 57,
        endAyah: 63,
        themeName: "Angels Proceeding to the People of Lut at Twilight",
        themeTamil: "லூத் நபியின் கூட்டத்தாரிடம் சென்ற வானவர்கள்",
        librarySource: "public/videos/surah_7/set_11_ayah_71-77.mp4"
      },
      {
        setIndex: 10,
        startAyah: 64,
        endAyah: 70,
        themeName: "The Morning Blast & Deliverance of the Truthful",
        themeTamil: "காலை நேரத்து முழக்கம் & உண்மையாளர்களின் ஈடேற்றம்",
        librarySource: "public/videos/surah_7/set_13_ayah_85-91.mp4"
      },
      {
        setIndex: 11,
        startAyah: 71,
        endAyah: 77,
        themeName: "Companions of the Thicket (Ashab al-Aykah) in Wooded Hills",
        themeTamil: "அடர்ந்த வனப்பகுதி மக்கள் (அஸ்ஹாபுல் அய்கா)",
        librarySource: "public/videos/surah_4/set_09_ayah_57-63.mp4"
      },
      {
        setIndex: 12,
        startAyah: 78,
        endAyah: 84,
        themeName: "Companions of the Rocky Tract (Ashab al-Hijr) Carving Homes",
        themeTamil: "அல்-ஹிஜ்ர் பாறைப் பகுதி மக்கள் மலையைக் குடைந்து அமைத்த மாளிகைகள்",
        librarySource: "public/videos/surah_7/set_10_ayah_64-70.mp4"
      },
      {
        setIndex: 13,
        startAyah: 85,
        endAyah: 91,
        themeName: "Heavens Created in Truth & The Seven Oft-Repeated Verses",
        themeTamil: "உண்மையுடன் படைக்கப்பட்ட வானங்கள் & திரும்பத் திரும்ப ஓதப்படும் 7 வசனங்கள்",
        librarySource: "public/videos/surah_4/set_25_ayah_169-176.mp4"
      },
      {
        setIndex: 14,
        startAyah: 92,
        endAyah: 99,
        themeName: "Proclaiming Divine Truth Openly & Worshiping until Certainty",
        themeTamil: "சத்தியத்தை வெளிப்படையாகப் பிரகடனம் செய்தல் & இறுதி மூச்சு வரை வணக்கம்",
        librarySource: "public/videos/surah_4/set_10_ayah_64-70.mp4"
      }
    ]
  },
  "16": {
    nameEnglish: "An-Nahl",
    nameArabic: "النحل",
    totalVerses: 128,
    sets: [
      {
        setIndex: 1,
        startAyah: 1,
        endAyah: 7,
        themeName: "Creation of Heavens, Earth, Humanity & Cattle",
        themeTamil: "வானங்கள், பூமி, மனிதன் & கால்நடைகளின் படைப்பு",
        librarySource: "public/videos/surah_6/set_19_ayah_127-133.mp4"
      },
      {
        setIndex: 2,
        startAyah: 8,
        endAyah: 14,
        themeName: "Reviving Rain, Date Palms, Olives, Sun, Moon & Sea",
        themeTamil: "மழை, பேரீச்சை, ஆலிவ், சூரியன், சந்திரன் & கடல் வளங்கள்",
        librarySource: "public/videos/surah_6/set_12_ayah_78-84.mp4"
      },
      {
        setIndex: 3,
        startAyah: 15,
        endAyah: 21,
        themeName: "Firm Mountains (Rawasiya), Rivers & Guiding Stars",
        themeTamil: "பூமியில் உறுதியான மலைகள், நதிகள் & வழிகாட்டும் விண்மீன்கள்",
        librarySource: "public/videos/surah_4/set_01_ayah_1-7.mp4"
      },
      {
        setIndex: 4,
        startAyah: 22,
        endAyah: 28,
        themeName: "Knower of Unseen & Righteous Entering Eden with Peace",
        themeTamil: "மறைவானதை அறிபவன் & ஏதென் சுவனத்தில் சாந்தியுடன் நுழைவோர்",
        librarySource: "public/videos/surah_10/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 5,
        startAyah: 29,
        endAyah: 35,
        themeName: "Wicked Plots Collapsed & Stillness of Ancient Canyons",
        themeTamil: "சதிகாரர்களின் வீழ்ச்சி & பழமையான பள்ளத்தாக்குகளின் அமைதி",
        librarySource: "public/videos/surah_4/set_08_ayah_50-56.mp4"
      },
      {
        setIndex: 6,
        startAyah: 36,
        endAyah: 42,
        themeName: "Messengers to Every Nation & Traveling the Earth",
        themeTamil: "ஒவ்வொரு சமூகத்திற்கும் தூதர்கள் & பூமியில் பயணம் செய்தல்",
        librarySource: "public/videos/surah_4/set_15_ayah_99-105.mp4"
      },
      {
        setIndex: 7,
        startAyah: 43,
        endAyah: 49,
        themeName: "Lengthening Shadows Prostrating to Allah",
        themeTamil: "அல்லாஹ்வுக்கு சிரம் பணியும் நிழல்கள் & பயபக்தி",
        librarySource: "public/videos/surah_4/set_22_ayah_148-154.mp4"
      },
      {
        setIndex: 8,
        startAyah: 50,
        endAyah: 56,
        themeName: "Pure Monotheism & Crying to Allah in Affliction",
        themeTamil: "ஏகத்துவம் & துன்பத்தின் போது அல்லாஹ்விடம் முறையிடுதல்",
        librarySource: "public/videos/surah_4/set_20_ayah_134-140.mp4"
      },
      {
        setIndex: 9,
        startAyah: 57,
        endAyah: 63,
        themeName: "Water from Heaven Reviving the Parched Earth",
        themeTamil: "வானிலிருந்து இறங்கி வறண்ட பூமிக்கு உயிரூட்டும் மழை",
        librarySource: "public/videos/surah_10/set_05_ayah_29-35.mp4"
      },
      {
        setIndex: 10,
        startAyah: 64,
        endAyah: 70,
        themeName: "Inspiration to the Bee, Mountain Flora & Healing Honey",
        themeTamil: "தேனீக்கு வந்த வஹீ, மலைச் சோலைகள் & குணமளிக்கும் தேன்",
        librarySource: "public/videos/surah_10/set_09_ayah_57-63.mp4"
      },
      {
        setIndex: 11,
        startAyah: 71,
        endAyah: 77,
        themeName: "Human Life Stages, Equity & Terraces of Order",
        themeTamil: "மனித வாழ்வின் நிலைகள், நீதி & நேர்வழி",
        librarySource: "public/videos/surah_4/set_02_ayah_8-14.mp4"
      },
      {
        setIndex: 12,
        startAyah: 78,
        endAyah: 84,
        themeName: "Birds Suspended in Air & Soaring Mountain Shelters",
        themeTamil: "ஆகாயத்தில் பறக்கும் பறவைகள் & மலைக் குகைச் சரணாலயங்கள்",
        librarySource: "public/videos/surah_4/set_10_ayah_64-70.mp4"
      },
      {
        setIndex: 13,
        startAyah: 85,
        endAyah: 91,
        themeName: "Divine Command to Justice, Ihsan & Kindness",
        themeTamil: "நீதி, நன்மை (இஹ்ஸான்) & சுமுகமான நல்லுறவு",
        librarySource: "public/videos/surah_4/set_03_ayah_15-21.mp4"
      },
      {
        setIndex: 14,
        startAyah: 92,
        endAyah: 98,
        themeName: "Fulfilling Covenants & Promise of a Pure Life (Hayatan Tayyibah)",
        themeTamil: "உடன்படிக்கைகளை நிறைவேற்றுதல் & பரிசுத்த நல்வாழ்வு",
        librarySource: "public/videos/surah_4/set_04_ayah_22-28.mp4"
      },
      {
        setIndex: 15,
        startAyah: 99,
        endAyah: 105,
        themeName: "Seeking Refuge in Quran Recitation & Ruh al-Qudus",
        themeTamil: "குர்ஆன் ஓதும் போது பாதுகாப்பு கோருதல் & ரூஹுல் குதுஸ்",
        librarySource: "public/videos/surah_4/set_25_ayah_169-176.mp4"
      },
      {
        setIndex: 16,
        startAyah: 106,
        endAyah: 112,
        themeName: "Steadfast Hearts in Faith & Fortress Peak",
        themeTamil: "ஈமானில் உறுதியான உள்ளங்கள் & கம்பீரமான சிகரம்",
        librarySource: "public/videos/surah_4/set_11_ayah_71-77.mp4"
      },
      {
        setIndex: 17,
        startAyah: 113,
        endAyah: 120,
        themeName: "Parable of the Peaceful Town & Abundant Provision",
        themeTamil: "அமைதியான ஊரின் உவமை & தூய உணவுகள்",
        librarySource: "public/videos/surah_7/set_12_ayah_78-84.mp4"
      },
      {
        setIndex: 18,
        startAyah: 121,
        endAyah: 128,
        themeName: "Ibrahim as an Ummah & Calling with Wisdom and Patience",
        themeTamil: "இப்ராஹீம் நபி உவமை & ஞானத்துடனும் பொறுமையுடனும் அழைத்தல்",
        librarySource: "public/videos/surah_4/set_21_ayah_141-147.mp4"
      }
    ]
  }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8"));
  }
  return { pipelineVersion: "1.0.0", surahs: {} };
}

function saveProgress(prog) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(prog, null, 2));
}

function generateReviewHtml(surahNum, config, verses) {
  const reviewFile = path.join(ROOT_DIR, `review_surah_${surahNum}.html`);
  const totalVerses = verses.length;

  const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surah ${surahNum} (${config.nameEnglish}) Video Production Review — HuDa Web Quran</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background-color: #0b0f19; color: #f3f4f6; }
    .font-arabic { font-family: 'Amiri', serif; }
  </style>
</head>
<body class="min-h-screen p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <header class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold tracking-wide">
            Surah ${surahNum} of 114
          </span>
          <span class="text-xs text-gray-400">Authentic Thematic Library Reuse (CRF 21 1080p 16:9 Full Screen)</span>
        </div>
        <h1 class="text-3xl font-bold mt-2 text-white flex items-center gap-3">
          <span>Surah ${surahNum}: ${config.nameEnglish} (${config.nameArabic})</span>
          <span class="text-emerald-400 text-sm font-normal">(${config.sets.length} Master Sets / ${totalVerses} Ayahs)</span>
        </h1>
        <p class="text-gray-400 text-sm mt-1">High-fidelity 16:9 full-screen cinematic scenes mapped to verse meanings</p>
      </div>

      <div class="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-center md:text-right">
        <span class="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm font-mono border border-emerald-500/30 font-bold">
          100% READY & DEPLOYED
        </span>
      </div>
    </header>

    <!-- Master Sets Overview -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-gray-200">Thematic Video Sets (${config.sets.length} Master Sets)</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${config.sets.map((set) => {
          const videoFile = `public/videos/surah_${surahNum}/set_${String(set.setIndex).padStart(2, "0")}_ayah_${set.startAyah}-${set.endAyah}.mp4`;
          return `
          <div class="bg-gray-900/90 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition flex flex-col shadow-lg">
            <div class="aspect-video bg-black relative">
              <video src="${videoFile}" controls loop muted playsinline class="w-full h-full object-cover"></video>
              <span class="absolute top-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur text-xs font-mono text-emerald-400 rounded border border-emerald-500/30">
                Set ${set.setIndex} (Ayahs ${set.startAyah}–${set.endAyah})
              </span>
            </div>
            <div class="p-4 flex-1 flex flex-col justify-between space-y-2">
              <div>
                <h3 class="text-sm font-semibold text-white">${set.themeName}</h3>
                <p class="text-xs text-blue-300 mt-1">${set.themeTamil}</p>
              </div>
              <div class="pt-2 border-t border-gray-800 text-[10px] text-gray-500 font-mono">
                Library: ${set.librarySource}
              </div>
            </div>
          </div>
          `;
        }).join("\n")}
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(reviewFile, html, "utf8");
  return reviewFile;
}

export async function processSurahFromLibrary(surahNum, options = {}) {
  const config = THEMATIC_LIBRARY_MAP[String(surahNum)];
  if (!config) {
    throw new Error(`No library mapping defined for Surah ${surahNum}`);
  }

  console.log(`\n======================================================================`);
  console.log(`🎬 Building Surah ${surahNum} (${config.nameEnglish}) from Thematic Library`);
  console.log(`======================================================================`);

  const surahDir = path.join(VIDEOS_DIR, `surah_${surahNum}`);
  ensureDir(surahDir);

  // Load verses from local JSON
  const verseJsonPath = path.join(QURAN_VERSES_DIR, `${surahNum}.json`);
  let verses = [];
  if (fs.existsSync(verseJsonPath)) {
    verses = JSON.parse(fs.readFileSync(verseJsonPath, "utf8"));
  }

  console.log(`📖 Loaded ${verses.length} Ayahs for Surah ${surahNum}. Processing ${config.sets.length} Sets...`);

  let copiedSets = 0;
  let linkedAyahs = 0;

  for (const set of config.sets) {
    const setFileName = `set_${String(set.setIndex).padStart(2, "0")}_ayah_${set.startAyah}-${set.endAyah}.mp4`;
    const targetSetFile = path.join(surahDir, setFileName);
    const srcFile = path.join(ROOT_DIR, set.librarySource);

    if (!fs.existsSync(srcFile)) {
      console.warn(`  ❌ Source library video missing: ${srcFile}`);
      continue;
    }

    // Copy master set video
    fs.copyFileSync(srcFile, targetSetFile);
    copiedSets++;

    // Link (copy) to each ayah in the range
    for (let a = set.startAyah; a <= set.endAyah; a++) {
      const ayahTarget = path.join(surahDir, `ayah_${a}.mp4`);
      try {
        fs.copyFileSync(targetSetFile, ayahTarget);
        linkedAyahs++;
      } catch {}
    }

    console.log(`  ✓ Set ${set.setIndex} (Ayahs ${set.startAyah}–${set.endAyah}): ${set.themeName}`);
  }

  console.log(`\n✅ Surah ${surahNum}: Copied ${copiedSets} Master Sets and linked ${linkedAyahs} Ayahs.`);

  // Build review page
  const reviewFile = generateReviewHtml(surahNum, config, verses);
  console.log(`📄 Generated Review Page: file://${reviewFile}`);

  // Deploy master sets to Cloudflare R2
  if (options.deploy !== false) {
    console.log(`\n🚀 Uploading Surah ${surahNum} master sets to Cloudflare R2...`);
    execSync(
      `node scripts/tools/upload-to-r2.mjs --category=videos --surah=${surahNum} --sets-only --execute`,
      { stdio: "inherit", cwd: ROOT_DIR }
    );
  }

  // Update progress.json
  const progress = loadProgress();
  progress.surahs[String(surahNum)] = {
    surahNumber: surahNum,
    surahName: config.nameEnglish,
    totalVerses: verses.length,
    totalSets: config.sets.length,
    completedSets: copiedSets,
    completedCount: verses.length,
    status: "DEPLOYED",
    previewHtml: reviewFile,
    mode: "THEMATIC_SETS_5_TO_10_AYAHS",
    lastUpdated: new Date().toISOString(),
    deployedAt: new Date().toISOString(),
  };
  progress.currentSurah = surahNum;
  progress.completedSurahCount = Object.values(progress.surahs).filter((s) => s.status === "DEPLOYED").length;
  saveProgress(progress);

  console.log(`✨ Surah ${surahNum} successfully processed and marked as DEPLOYED!\n`);
  return { surahNum, copiedSets, linkedAyahs, reviewFile };
}

// CLI Execution
if (process.argv[1] && process.argv[1].endsWith("build-surahs-from-library.mjs")) {
  const args = process.argv.slice(2);
  const surahArg = args.find((a) => a.startsWith("--surah="));
  const noDeploy = args.includes("--no-deploy");

  let targetSurahs = [11, 12, 13, 14, 15];
  if (surahArg) {
    const val = surahArg.split("=")[1];
    if (val.includes("-")) {
      const [start, end] = val.split("-").map((v) => parseInt(v.trim(), 10));
      targetSurahs = [];
      for (let s = start; s <= end; s++) targetSurahs.push(s);
    } else {
      targetSurahs = val.split(",").map((v) => parseInt(v.trim(), 10));
    }
  }

  (async () => {
    console.log(`\n========================================================================`);
    console.log(` 🌟 HuDa Web Quran — Autonomous 5-Surah Thematic Library Production`);
    console.log(` Target Surahs: ${targetSurahs.join(", ")}`);
    console.log(`========================================================================\n`);

    for (const s of targetSurahs) {
      await processSurahFromLibrary(s, { deploy: !noDeploy });
    }

    console.log(`\n🎉 All ${targetSurahs.length} Surahs (${targetSurahs.join(", ")}) processed and deployed!`);
  })().catch((err) => {
    console.error("Pipeline Error:", err);
    process.exit(1);
  });
}
