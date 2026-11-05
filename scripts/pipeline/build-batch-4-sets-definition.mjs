/**
 * Defines thematic sets for Batch 4 (Surahs 71–90)
 * 20 Surahs, 51 thematic sets, 100% verse coverage (0 gaps, 0 overlaps)
 */
import fs from "fs";

const BATCH_4_SETS = {
  "71": [
    {
      "from": 1,
      "to": 10,
      "title": "Noah's Call to His People and Promise of Abundant Rain",
      "theme": "Rain pouring from atmospheric storm clouds over desert landscape reviving barren earth",
      "ta": "நூஹ் நபியின் அழைப்பு & வான்மழையின் அருள் வாக்குறுதி"
    },
    {
      "from": 11,
      "to": 20,
      "title": "Signs of Creation: Seven Heavens, Moon, Sun, and Earth as Expanse",
      "theme": "Seven celestial atmospheric strata with luminous sun, glowing moon, and vast rolling earth expanse",
      "ta": "ஏழு வானங்கள், சூரியன், சந்திரன் & பரந்து விரிந்த பூமி"
    },
    {
      "from": 21,
      "to": 28,
      "title": "Rejection of the Message, the Great Deluge, and Noah's Prayer",
      "theme": "Massive surging stormy flood ocean waves and dark tempestuous horizon",
      "ta": "நிராகரிப்பும், பெருவெள்ளத்தின் அழிவும், நூஹ் நபியின் பிரார்த்தனையும்"
    }
  ],
  "72": [
    {
      "from": 1,
      "to": 15,
      "title": "The Jinn Listening to the Quran and Finding Guidance",
      "theme": "Serene midnight starry sky above quiet mountain sanctuaries and glowing dusk atmosphere",
      "ta": "குர்ஆனைக் கேட்ட ஜின்களும் அவர்களின் நேர்வழியும்"
    },
    {
      "from": 16,
      "to": 28,
      "title": "Abundant Water on the Straight Path and Allah's Unseen Knowledge",
      "theme": "Pure freshwater mountain stream cascades through rocky canyon under clear light",
      "ta": "நேர்வழியில் உள்ளோருக்கு அருளப்படும் நீர் & மறைவான ஞானம்"
    }
  ],
  "73": [
    {
      "from": 1,
      "to": 10,
      "title": "Night Vigil Prayer, Slow Recitation, and Patient Trust",
      "theme": "Tranquil midnight silence with glowing crescent moon over peaceful hills and quiet desert",
      "ta": "இரவுத் தொழுகை, குர்ஆனை நிறுத்தி ஓதுதல் & பொறுமையுடன் நம்பிக்கை வைத்தல்"
    },
    {
      "from": 11,
      "to": 20,
      "title": "Trembling Earth, Heavy Chains, and Easing of Night Worship",
      "theme": "Distant volcanic mountain peaks trembling and golden dawn light breaking through dark clouds",
      "ta": "பூமி அதிரும் நாளும் இரவு வழிபாட்டை எளிதாக்கிய கருணையும்"
    }
  ],
  "74": [
    {
      "from": 1,
      "to": 10,
      "title": "Arise and Warn, Magnify Your Lord, and the Day of Difficulty",
      "theme": "Dramatic sunrise breaking over rugged mountain crest with sharp light rays piercing clouds",
      "ta": "எழுந்து எச்சரிக்கை செய்வீராக & கடினமான மறுமை நாள்"
    },
    {
      "from": 11,
      "to": 30,
      "title": "Ungrateful Deniers and the Scorching Fire of Saqar",
      "theme": "Intense scorched volcanic caldera with glowing fissures and dark billowing smoke",
      "ta": "நன்றிகெட்ட மனிதனும் ஸகர் நரகத்தின் கொடிய எச்சரிக்கையும்"
    },
    {
      "from": 31,
      "to": 48,
      "title": "Guardians of Fire and Questions to the Criminals in Hell",
      "theme": "Barren craggy dark canyon walls under ominous red twilight sky",
      "ta": "நரகக் காவலர்களும் குற்றவாளிகளிடம் கேட்கப்படும் கேள்விகளும்"
    },
    {
      "from": 49,
      "to": 56,
      "title": "Fleeing from the Reminder and the Call to Heed",
      "theme": "Sweeping golden desert sands windswept under vast open sky",
      "ta": "நல்லுரையை புறக்கணிப்போரும் பயனுள்ள படிப்பினையும்"
    }
  ],
  "75": [
    {
      "from": 1,
      "to": 15,
      "title": "Day of Resurrection, Assembling Fingertips, and Eclipse of the Moon",
      "theme": "Luminous total eclipse of the moon against deep cosmic starry sky and eclipse shadows",
      "ta": "மறுமை நாள், கைவிரல் நுனிகள் சீரமைக்கப்படுதல் & சந்திரன் ஒளி மங்குதல்"
    },
    {
      "from": 16,
      "to": 25,
      "title": "Moving Tongue with Revelation and Radiant Faces Gazing at Their Lord",
      "theme": "Radiant golden light cascading over tranquil reflective mountain waters and peaceful meadows",
      "ta": "இறைச்செய்தியின் உறுதி & இறைவனைப் பார்த்துப் பிரகாசிக்கும் முகங்கள்"
    },
    {
      "from": 26,
      "to": 40,
      "title": "Soul Departing to Collarbones and Creation from a Single Drop",
      "theme": "Gentle ocean waves lapping at twilight shoreline under quiet dusk skies",
      "ta": "உயிர் தொண்டைங்குழியை அடையும் நேரமும் மனிதனின் படைப்பும்"
    }
  ],
  "76": [
    {
      "from": 1,
      "to": 12,
      "title": "Creation of Man and the Righteous Drinking of Camphor Springs",
      "theme": "Crystalline mountain spring pool with pure bubbling water among lush moss and stones",
      "ta": "மனிதனின் படைப்பும் காஃபூர் சுனையின் பானமும்"
    },
    {
      "from": 13,
      "to": 22,
      "title": "Lush Paradise Groves, Silver Vessels, and Ginger Infused Streams",
      "theme": "Enchanting green forest garden canopy with dappled sunlight, waterfalls, and exotic fruit blossoms",
      "ta": "சுவனச் சோலைகளின் நிழல்களும் ஸல்ஸபீல் சுனையும்"
    },
    {
      "from": 23,
      "to": 31,
      "title": "Patience with Lord's Decree and Prostration at Morning and Evening",
      "theme": "Dazzling sunset colors reflected across calm still lake with mountain silhouettes",
      "ta": "இறைவனின் கட்டளைக்குப் பொறுமையும் காலை மாலை திக்ருகளும்"
    }
  ],
  "77": [
    {
      "from": 1,
      "to": 15,
      "title": "The Sent-Forth Winds, Blasted Mountains, and Day of Decision",
      "theme": "Fierce gale winds blowing across ocean surf and crumbling mountain cliffs",
      "ta": "அனுப்பப்படும் காற்று, துகள்களாகும் மலைகள் & தீர்ப்பு நாள்"
    },
    {
      "from": 16,
      "to": 28,
      "title": "Destruction of the Former Peoples and Earth as Container of Life",
      "theme": "Ancient rocky desert strata and timeless mountain plateaus under dramatic skies",
      "ta": "முந்தைய சமூகங்களின் முடிவும் உயிர்களைச் சுமக்கும் பூமியும்"
    },
    {
      "from": 29,
      "to": 40,
      "title": "Shadow of Three Columns of Smoke on the Day of Sorting",
      "theme": "Towering plumes of volcanic smoke rising into stormy twilight atmosphere",
      "ta": "புகை மூட்டமும் பிரிக்கப்படும் தீர்ப்பு நாளும்"
    },
    {
      "from": 41,
      "to": 50,
      "title": "The Righteous Amid Cool Shades, Springs, and Fruits",
      "theme": "Verdant tranquil mountain valley with crystal clear running streams and fruit-laden orchard",
      "ta": "குளிர்ந்த நிழல்களிலும் சுனைகளிலும் நல்லடியார்கள்"
    }
  ],
  "78": [
    {
      "from": 1,
      "to": 16,
      "title": "The Great News: Earth as Couch, Mountains as Pegs, and Rain Clouds",
      "theme": "Towering mountain peaks anchored deep into earth with rain clouds releasing torrents over green fields",
      "ta": "பெரும் செய்தி: முளைகளாகிய மலைகளும் சோலைகளை வளர்க்கும் மழையும்"
    },
    {
      "from": 17,
      "to": 30,
      "title": "The Day of Sorting, Skies Opened as Gateways, and Hellfire as Ambush",
      "theme": "Dramatic sky storm opening with fierce lightning flashes over dark horizon",
      "ta": "திறக்கப்படும் வானங்களும் கொதிக்கும் நரகத்தின் எச்சரிக்கையும்"
    },
    {
      "from": 31,
      "to": 40,
      "title": "Gardens of Triumph, Grapevine Groves, and Standing in Rows",
      "theme": "Glorious lush vineyards and flowing clear waterways bathed in brilliant peaceful sunlight",
      "ta": "வெற்றி பெற்றவர்களுக்கான திராட்சைத் தோட்டங்களும் சுவனமும்"
    }
  ],
  "79": [
    {
      "from": 1,
      "to": 14,
      "title": "Extracting Angels, Celestial Orbits, and the Trembling Tremor",
      "theme": "Cosmic planetary bodies gliding smoothly through celestial night orbits",
      "ta": "விண்ணில் இயங்கும் கோள்களும் பூமியை உலுக்கும் பெரும் நிலநடுக்கமும்"
    },
    {
      "from": 15,
      "to": 26,
      "title": "Moses at the Sacred Valley of Tuwa and the End of Pharaoh",
      "theme": "Majestic red rock canyon in serene desert valley under golden sunset light",
      "ta": "துவா எனும் புனித பள்ளத்தாக்கில் மூஸா நபியும் ஃபிர்அவ்னின் முடிவும்"
    },
    {
      "from": 27,
      "to": 46,
      "title": "The Vaulted Heaven, Earth Spread, Mountains Fixed, and the Great Calamity",
      "theme": "Firmly anchored mountain massifs with green alpine meadows under towering vaulted sky",
      "ta": "உயர்த்தப்பட்ட வானம், விரிந்த பூமி, நாட்டப்பட்ட மலைகள் & மறுமையின் அதிர்வு"
    }
  ],
  "80": [
    {
      "from": 1,
      "to": 16,
      "title": "He Frowned and Turned Away, and the Honored Noble Scrolls",
      "theme": "Golden ancient sunbeam illuminating timeless stone sanctuary with serene atmosphere",
      "ta": "கண்ணியமிக்க ஏடுகளும் தூய்மையான நல்லுரைகளும்"
    },
    {
      "from": 17,
      "to": 32,
      "title": "Creation from Fluid, Poured Waters, Grapes, Olives, Palms, and Pastures",
      "theme": "Rich olive groves and date palms flourishing beside crystal clear irrigation streams",
      "ta": "வானிலிருந்து பொழியும் மழை, ஒலிவத் தோட்டங்கள் & பேரீச்சை மரங்கள்"
    },
    {
      "from": 33,
      "to": 42,
      "title": "The Deafening Cry, Joyful Radiance vs Dust-Covered Faces",
      "theme": "Dramatic high-contrast twilight clouds breaking over vast open desert plain",
      "ta": "செவிடாக்கும் பெருஞ்சத்தமும் மலர்ந்த முகங்களின் மகிழ்ச்சியும்"
    }
  ],
  "81": [
    {
      "from": 1,
      "to": 14,
      "title": "Sun Folded, Stars Falling, Mountains Blown, and Seas Set Ablaze",
      "theme": "Surging tempestuous ocean waves under fiery cosmic sunset sky with falling meteors",
      "ta": "சுருட்டப்படும் சூரியன், உதிரும் நட்சத்திரங்கள் & கொதித்தெழும் கடல்கள்"
    },
    {
      "from": 15,
      "to": 29,
      "title": "Receding Stars, Departing Night, Breathing Dawn, and the Noble Messenger",
      "theme": "Spectacular misty mountain dawn as twilight recedes and morning breaths fresh golden light",
      "ta": "மறையும் விண்மீன்கள், விடியும் காலை & கண்ணியமிக்க தூதர்"
    }
  ],
  "82": [
    {
      "from": 1,
      "to": 12,
      "title": "Sky Cleaved Asunder, Stars Scattered, Seas Gushing, and Generous Lord",
      "theme": "Deep night sky filled with countless stars over tranquil reflecting lake waters",
      "ta": "பிளந்துபோகும் வானமும் உதிரும் நட்சத்திரங்களும் கருணையுள்ள இறைவனும்"
    },
    {
      "from": 13,
      "to": 19,
      "title": "The Righteous in Abundant Delight and the Absolute Day of Sovereignty",
      "theme": "Serene green meadow dotted with wildflowers under clear blue sky with gentle breeze",
      "ta": "இன்பத்தில் திளைக்கும் நல்லோரும் முழுமையான ஆதிபத்திய நாளும்"
    }
  ],
  "83": [
    {
      "from": 1,
      "to": 17,
      "title": "Woe to Defrauders, Standing before the Lord, and Record of Wicked in Sijjin",
      "theme": "Stark desert canyon with sheer cliffs and harsh dry dust under midday sun",
      "ta": "அளவையில் மோசம் செய்வோருக்கு கேடும் ஸிஜ்ஜீன் பதிவேடும்"
    },
    {
      "from": 18,
      "to": 36,
      "title": "The Record in Illiyyun, Pure Sealed Nectar Sealed with Musk, and Spring of Tasnim",
      "theme": "Pure mountain spring waterfall cascading into turquoise pool among fragrant flowering blossoms",
      "ta": "இல்லிய்யீன் பதிவேடு, கஸ்தூரி முத்திரையிடப்பட்ட மதுபானம் & தஸ்னீம் சுனை"
    }
  ],
  "84": [
    {
      "from": 1,
      "to": 15,
      "title": "Sky Split, Earth Spread Out, and Easy Accounting for the Believer",
      "theme": "Vast desert horizon stretching endlessly under dramatic spreading sunset clouds",
      "ta": "பிளந்துபோகும் வானம், விரிந்துவிடும் பூமி & எளிதான கேள்வி கணக்கு"
    },
    {
      "from": 16,
      "to": 25,
      "title": "Afterglow of Sunset, Night Gathering, and Full Moon in Splendor",
      "theme": "Breathtaking orange twilight afterglow with full luminous moon rising over calm ocean waters",
      "ta": "செவ்வானம், இருள் சூழும் இரவு & முழு நிலவின் அழகு"
    }
  ],
  "85": [
    {
      "from": 1,
      "to": 11,
      "title": "Sky with Constellations, People of the Ditch, and Gardens with Flowing Rivers",
      "theme": "Vivid glittering constellations across deep velvet cosmos over tranquil landscape",
      "ta": "நட்சத்திர மண்டலங்கள் கொண்ட வானமும் சுவனச் சோலைகளும்"
    },
    {
      "from": 12,
      "to": 22,
      "title": "Mighty Seizure of the Lord, All-Forgiving and Loving, and the Preserved Tablet",
      "theme": "Majestic thunderous mountain range standing firm under magnificent atmospheric clouds",
      "ta": "இறைவனின் வலிமைமிக்க பிடியும் லவ்ஹுல் மஹ்ஃபூளும்"
    }
  ],
  "86": [
    {
      "from": 1,
      "to": 10,
      "title": "The Night Comer, Piercing Star, and Origin of Creation",
      "theme": "Intensely bright piercing star shining in deep dark night sky over calm sea",
      "ta": "இரவில் தோன்றும் தாரிக் விண்மீனும் மனிதனின் படைப்பின் தொடக்கமும்"
    },
    {
      "from": 11,
      "to": 17,
      "title": "Sky with Returning Rain, Earth Splitting with Shoots, and Decisive Word",
      "theme": "Gentle spring rain nourishing earth as fresh green shoots burst through fertile soil",
      "ta": "மழை பொழியும் வானமும் தாவரங்கள் வெளிப்படும் பூமியும்"
    }
  ],
  "87": [
    {
      "from": 1,
      "to": 13,
      "title": "Exalt the Most High: Proportioning, Guiding, and Bringing Forth Pasture",
      "theme": "Lush emerald green alpine pasture rolling down mountain slopes under bright morning light",
      "ta": "உன்னதமான இறைவனை தஸ்பீஹ் செய்தலும் பசுமையான மேய்ச்சல் நிலங்களும்"
    },
    {
      "from": 14,
      "to": 19,
      "title": "Purification, Prayer, and Scriptures of Abraham and Moses",
      "theme": "Peaceful dawn sunbeam filtering through ancient mountain pine trees over quiet stream",
      "ta": "தூய்மை அடைந்தோரின் வெற்றியும் இப்ராஹீம், மூஸா நபியின் ஏடுகளும்"
    }
  ],
  "88": [
    {
      "from": 1,
      "to": 16,
      "title": "The Overwhelming Calamity: Burning Spring vs Joyous Garden with Flowing Spring",
      "theme": "Paradise garden with crystal clear flowing spring, fragrant flowers, and tranquil shade",
      "ta": "சூழ்ந்து கொள்ளும் பெரும் நாளும் ஓடும் சுனையுடைய சுவனச் சோலைகளும்"
    },
    {
      "from": 17,
      "to": 26,
      "title": "Look at Camels, Raised Sky, Fixed Mountains, and Spread Earth",
      "theme": "Panoramic view of soaring sky, rugged fixed mountain peaks, and wide expansive desert plains",
      "ta": "உயர்த்தப்பட்ட வானம், நாட்டப்பட்ட மலைகள் & விரிக்கப்பட்ட பூமி"
    }
  ],
  "89": [
    {
      "from": 1,
      "to": 14,
      "title": "By the Dawn and Ten Nights: Pillars of Iram, Rock Valleys of Thamud",
      "theme": "First golden light of dawn rising above towering desert sandstone monoliths and canyons",
      "ta": "விடியற்காலை, பத்து இரவுகள் & தூண்களையுடைய இரம் நகரம்"
    },
    {
      "from": 15,
      "to": 20,
      "title": "Trials of Wealth, Generosity, Honoring Orphans, and Righteous Deeds",
      "theme": "Peaceful oasis with palm trees and gentle refreshing water in vast desert landscape",
      "ta": "செல்வத்தின் சோதனையும் அநாதைகளை ஆதரிக்கும் நற்பண்பும்"
    },
    {
      "from": 21,
      "to": 30,
      "title": "Earth Crushed to Powder, Angels in Rows, and the Tranquil Soul Returning",
      "theme": "Serene majestic golden clouds over calm tranquil ocean horizon at peaceful sunset",
      "ta": "தூள் தூளாகும் பூமியும் நிம்மதியடைந்த ஆன்மாவிற்கு சுவன அழைப்பும்"
    }
  ],
  "90": [
    {
      "from": 1,
      "to": 10,
      "title": "Oath by the Sacred City, Creation of Man in Hardship, and Two Eyes and Lips",
      "theme": "Venerable ancient city stone architecture nestled amidst quiet desert hills at twilight",
      "ta": "புனித நகரின் மீது சத்தியமும் மனிதனுக்கு வழங்கப்பட்ட இரு கண்களும் உதடுகளும்"
    },
    {
      "from": 11,
      "to": 20,
      "title": "Ascending the Steep Path: Feeding the Orphan and Companions of the Right",
      "theme": "Sunlit mountain pathway leading upward to glowing peak through peaceful green valley",
      "ta": "செங்குத்தான மலையின் பாதை: பசித்தோருக்கு உணவளித்தலும் வலப்பக்கத்தோரும்"
    }
  ]
};

// Validate verse coverage
console.log("=== Validating Batch 4 Sets Definition ===");
let totalSets = 0;
let errors = 0;

for (let s = 71; s <= 90; s++) {
  const surahKey = String(s);
  const sets = BATCH_4_SETS[surahKey];
  if (!sets) {
    console.error(`Missing sets for Surah ${s}`);
    errors++;
    continue;
  }
  const qData = JSON.parse(fs.readFileSync(`public/data/quran-verses/${s}.json`, "utf8"));
  const expectedVerses = qData.verses ? qData.verses.length : Object.keys(qData).length;
  
  let currentAyah = 1;
  for (let i = 0; i < sets.length; i++) {
    const st = sets[i];
    if (st.from !== currentAyah) {
      console.error(`Surah ${s} set ${i+1}: expected from=${currentAyah}, got ${st.from}`);
      errors++;
    }
    currentAyah = st.to + 1;
    totalSets++;
  }
  if (currentAyah - 1 !== expectedVerses) {
    console.error(`Surah ${s}: expected ${expectedVerses} verses, covered up to ${currentAyah - 1}`);
    errors++;
  }
}

if (errors === 0) {
  fs.writeFileSync("scratch/batch_4_sets_definition.json", JSON.stringify(BATCH_4_SETS, null, 2));
  console.log(`✓ Batch 4 Validated: 20 Surahs (71–90), ${totalSets} sets, 0 gaps, 0 overlaps!`);
  console.log(`✓ Saved to scratch/batch_4_sets_definition.json`);
} else {
  console.error(`Validation failed with ${errors} errors.`);
  process.exit(1);
}
