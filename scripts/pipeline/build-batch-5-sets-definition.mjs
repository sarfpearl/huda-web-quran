/**
 * Defines thematic sets for Batch 5 (Surahs 91–114)
 * 24 Surahs, 27 thematic sets, 100% verse coverage (0 gaps, 0 overlaps)
 */
import fs from "fs";

const BATCH_5_SETS = {
  "91": [
    {
      "from": 1,
      "to": 10,
      "title": "Sun and Brightness, Moon, Day, Sky, Earth, and Soul Purification",
      "theme": "Magnificent sunrise breaking over glowing desert dunes and soaring cosmic sky",
      "ta": "சூரியன், சந்திரன், பகல், இரவு, வானம், பூமி & ஆன்மாவைத் தூய்மையாக்குதல்"
    },
    {
      "from": 11,
      "to": 15,
      "title": "People of Thamud, the She-Camel, and Destruction of Transgressors",
      "theme": "Ancient rocky desert canyons and weathered stone cliffs under dramatic storm clouds",
      "ta": "ஸமூது கூட்டத்தினர், பெண் ஒட்டகம் & வரம்பு மீறியோரின் முடிவு"
    }
  ],
  "92": [
    {
      "from": 1,
      "to": 11,
      "title": "Night Enshrouding, Day Resplendent, and Striving in Generosity vs Greed",
      "theme": "Atmospheric transition from deep star-filled night into radiant glowing morning sky",
      "ta": "மூடிக்கொள்ளும் இரவு, ஒளிரும் பகல் & தர்மம் செய்வோரின் நற்பாதை"
    },
    {
      "from": 12,
      "to": 21,
      "title": "Divine Guidance, Warning of Blazing Fire, and Purity of the Righteous",
      "theme": "Serene green orchard bathed in gentle afternoon light with peaceful mountain breeze",
      "ta": "இறைவனின் நேர்வழி, எரியும் நரகத்தின் எச்சரிக்கை & தக்வாவுடையோரின் அமைதி"
    }
  ],
  "93": [
    {
      "from": 1,
      "to": 11,
      "title": "Morning Brightness, Lord's Constant Care, Orphan Shelter, and Proclaiming Favor",
      "theme": "Golden morning sunlight bathing tranquil green hills, dew drops, and peaceful dawn meadows",
      "ta": "முற்பகல் வெளிச்சம், இறைவனின் பேரன்பு, அநாதைகளுக்குப் புகலிடம் & இறைஅருளைக் கூறுதல்"
    }
  ],
  "94": [
    {
      "from": 1,
      "to": 8,
      "title": "Expansion of the Breast, Relief of Burden, and Ease with Hardship",
      "theme": "Sunbeams breaking through parting storm clouds over majestic open mountain summit",
      "ta": "மார்பை விரிவாக்குதல், சுமையை இறக்குதல் & துன்பத்துடன் கூடிய இன்பம்"
    }
  ],
  "95": [
    {
      "from": 1,
      "to": 8,
      "title": "By the Fig, Olive, Mount Sinai, and Sacred City: Man in Best Stature",
      "theme": "Lush olive and fig orchards clinging to rugged sunlit slopes of ancient Mount Sinai",
      "ta": "அத்தி, ஒலிவம், தூர் சினாய் மலை, புனித மக்கா & சிறந்த முறையில் மனிதனின் படைப்பு"
    }
  ],
  "96": [
    {
      "from": 1,
      "to": 8,
      "title": "Read in the Name of Your Lord, the Pen, and Man's Transgression",
      "theme": "Peaceful ancient stone cave entrance overlooking tranquil desert hills at quiet twilight",
      "ta": "படைத்த இறைவனின் திருநாமத்தால் ஓதுவீராக, எழுதுகோல் & மனிதனின் வரம்புமீறல்"
    },
    {
      "from": 9,
      "to": 19,
      "title": "The One Forbidding Prayer, Call to Council, and Prostrating Near to Allah",
      "theme": "Dramatic crimson twilight clouds above ancient rocky mountain plateau in quiet worship",
      "ta": "தொழுகையைத் தடுப்பவன் & ஸஜ்தா செய்து இறைவனை நெருங்குதல்"
    }
  ],
  "97": [
    {
      "from": 1,
      "to": 5,
      "title": "The Night of Glory (Laylat al-Qadr): Better Than a Thousand Months",
      "theme": "Deep velvet night sky illuminated by luminous glowing moon and descent of peaceful dawn light",
      "ta": "லைலத்துல் கத்ர் கண்ணியமிக்க இரவு, ஆயிரம் மாதங்களை விட மேலானது & விடியல் வரை சாந்தி"
    }
  ],
  "98": [
    {
      "from": 1,
      "to": 8,
      "title": "The Clear Evidence, Pure Scrolls, Sincere Worship, and Gardens of Eden",
      "theme": "Verdant eternal paradise gardens with pristine cascading rivers and radiant crystal waters",
      "ta": "தெளிவான ஆதாரம், தூய ஏடுகள், கலப்பற்ற வணக்கம் & அத்ன் சுவனச் சோலைகள்"
    }
  ],
  "99": [
    {
      "from": 1,
      "to": 8,
      "title": "Earth Shaken with Its Earthquake, Bringing Forth Burdens, and Atoms of Good and Evil",
      "theme": "Vast dramatic geological terrain under sweeping stormy sky with rolling tectonic hills",
      "ta": "பூமி பெரும் நடுக்கத்தால் அதிர்தல், வெளிப்படும் சுமை & அணுவளவு நன்மையும் தீமையும்"
    }
  ],
  "100": [
    {
      "from": 1,
      "to": 11,
      "title": "The Galloping War Horses Raising Dust, and Secrets of the Chests Exposed",
      "theme": "Dramatic windswept desert sands with billowing dust trails under radiant blazing sun",
      "ta": "மூச்சிரைக்க ஓடும் புரவிகள், கிளம்பும் புழுதி & இதயங்களில் உள்ளவை வெளிப்படுதல்"
    }
  ],
  "101": [
    {
      "from": 1,
      "to": 11,
      "title": "The Striking Calamity: People like Moths, Mountains like Wool, and Heavy Scales",
      "theme": "Massive misty mountain peaks shrouded in soft ethereal clouds under dramatic skies",
      "ta": "திடுக்கிடச் செய்யும் மறுமைப் பேரதிர்வு, பஞ்சைப் போன்ற மலைகள் & எடையுள்ள தராசு"
    }
  ],
  "102": [
    {
      "from": 1,
      "to": 8,
      "title": "Rivalry in Worldly Increase, Visiting Graves, and Questioning of Delights",
      "theme": "Ancient weathered desert cemetery stones under timeless quiet starry night sky",
      "ta": "பேராசை மனிதனை மயக்குதல், மண்ணறைகளை சந்தித்தல் & சுகங்களைப்பற்றிய விசாரணை"
    }
  ],
  "103": [
    {
      "from": 1,
      "to": 3,
      "title": "By Time: Mankind in Loss Except Believers Advising Truth and Patience",
      "theme": "Magnificent sweeping sunset over timeless desert sands marking the passage of moments",
      "ta": "காலத்தின் மீது சத்தியமாக: மனிதன் நஷ்டத்தில் உள்ளான், பொறுமையையும் உண்மையையும் போதிப்போர் தவிர"
    }
  ],
  "104": [
    {
      "from": 1,
      "to": 9,
      "title": "Woe to Every Slanderer, Hoarding Wealth, and the Closed Crushing Fire",
      "theme": "Harsh barren volcanic basalt field under blazing high desert heat and dark smoke haze",
      "ta": "புறம்பேசும் ஒவ்வொருவனுக்கும் கேடு, செல்வத்தைச் சேர்ப்போரும் மூடப்பட்ட நரகமும்"
    }
  ],
  "105": [
    {
      "from": 1,
      "to": 5,
      "title": "The Companions of the Elephant and Flocks of Birds Striking with Clay Stones",
      "theme": "Flocks of birds gliding across high azure sky above vast dramatic desert canyon landscape",
      "ta": "யானைப்படையினர் & சுடப்பட்ட களிமண் கற்களை எறிந்த பறவைக் கூட்டங்கள்"
    }
  ],
  "106": [
    {
      "from": 1,
      "to": 4,
      "title": "Caravans of Quraysh in Winter and Summer, and Worshiping the Lord of This House",
      "theme": "Tranquil ancient desert trade route winding through golden sand hills under clear twilight",
      "ta": "குறைஷியரின் குளிர்கால கோடைகால பயணங்களும் இவ்வாலயத்தின் இறைவனை வணங்குவதும்"
    }
  ],
  "107": [
    {
      "from": 1,
      "to": 7,
      "title": "Denying the Recompense, Repulsing the Orphan, and Withholding Small Kindness",
      "theme": "Peaceful humble desert village nestled among palm groves under calm evening light",
      "ta": "மறுமையை பொய்ப்பிப்பவன், அநாதையை விரட்டுபவன் & சிறு உதவிகளையும் தடுத்தல்"
    }
  ],
  "108": [
    {
      "from": 1,
      "to": 3,
      "title": "The Abundant Good (Al-Kawthar), Prayer, Sacrifice, and Severed Enemies",
      "theme": "Pure celestial crystalline river flowing gently through peaceful verdant meadows and flowers",
      "ta": "அல்கவ்ஸர் எனும் அபரிமிதமான நன்மைகள், தொழுகை, குர்பானி & பகைவனின் முடிவு"
    }
  ],
  "109": [
    {
      "from": 1,
      "to": 6,
      "title": "The Disbelievers: Uncompromising Pure Monotheism and Steadfast Faith",
      "theme": "Ancient resolute granite mountain peak standing unshakeable against sweeping winds",
      "ta": "இறைமறுப்பாளர்களே! நீங்கள் வணங்குவதை நான் வணங்கமாட்டேன், எனக்கு என் மார்க்கம் உங்களுக்கு உங்கள் மார்க்கம்"
    }
  ],
  "110": [
    {
      "from": 1,
      "to": 3,
      "title": "The Divine Victory, Conquest of Truth, Crowds Entering Faith, and Glorification",
      "theme": "Majestic golden dawn sunbeams illuminating serene mountain ranges with calm clear air",
      "ta": "இறைவனின் உதவியும் வெற்றியும், மார்க்கத்தில் மக்கள் கூட்டம் கூட்டமாக இணைதல்"
    }
  ],
  "111": [
    {
      "from": 1,
      "to": 5,
      "title": "The Perishing of Abu Lahab, Fire of Blazing Flame, and Twisted Fiber Rope",
      "theme": "Jagged dry desert rocks and arid thorn trees under intense burning midday heat",
      "ta": "அபூலஹபின் அழிவு, கொழுந்துவிட்டெரியும் நரகம் & முறுக்கேறிய கயிறு"
    }
  ],
  "112": [
    {
      "from": 1,
      "to": 4,
      "title": "The Absolute Oneness of Allah (Al-Ikhlas): Eternal, Neither Begotten Nor Begetting",
      "theme": "Pure transcendent cosmic deep night sky filled with luminous pristine starry majesty",
      "ta": "அல்லாஹ் ஒருவனே, அவன் தேவையற்றவன், அவன் யாரையும் பெறவுமில்லை பெறப்படவுமில்லை"
    }
  ],
  "113": [
    {
      "from": 1,
      "to": 5,
      "title": "The Lord of Daybreak (Al-Falaq): Seeking Refuge from Darkness, Envy, and Harm",
      "theme": "Glorious pure ray of daybreak piercing through dark ocean mist over calm tranquil waters",
      "ta": "விடியலின் அதிபதியிடம் பாதுகாப்புத் தேடுதல்: இருள், பொறாமை மற்றும் தீங்குகளிலிருந்து பாதுகாப்பு"
    }
  ],
  "114": [
    {
      "from": 1,
      "to": 6,
      "title": "The Lord, Sovereign, and God of Mankind: Refuge from Whispering Evil",
      "theme": "Vast peaceful starry heavens stretching above serene sleeping world under divine protection",
      "ta": "மனிதர்களின் இறைவன், அரசன், உண்மையான வணக்கத்திற்குரியவனிடம் பாதுகாப்புத் தேடுதல்"
    }
  ]
};

// Validate verse coverage
console.log("=== Validating Batch 5 Sets Definition ===");
let totalSets = 0;
let errors = 0;

for (let s = 91; s <= 114; s++) {
  const surahKey = String(s);
  const sets = BATCH_5_SETS[surahKey];
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
  fs.writeFileSync("scratch/batch_5_sets_definition.json", JSON.stringify(BATCH_5_SETS, null, 2));
  console.log(`✓ Batch 5 Validated: 24 Surahs (91–114), ${totalSets} sets, 0 gaps, 0 overlaps!`);
  console.log(`✓ Saved to scratch/batch_5_sets_definition.json`);
} else {
  console.error(`Validation failed with ${errors} errors.`);
  process.exit(1);
}
