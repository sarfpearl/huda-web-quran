/*
 * ─────────────────────────────────────────────────────────────────────────
 *  VERSE-BASED QURAN ARTWORK SYSTEM — SURAHS 1 → 114
 *  Single source of truth for all 114 Surah visual concepts.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface SurahArtworkConcept {
  surahNumber: number;
  name: string;
  ayat: string;
  core: string;
  visual: string;
  mood: string;
  prompt: string;
  negativePrompt: string;
}

export const QURAN_ARTWORK_CONCEPTS: SurahArtworkConcept[] = [
  {
    "surahNumber": 1,
    "name": "Al-Fatihah",
    "ayat": "1:1–7",
    "core": "Praise of Allah, mercy, and guidance toward the straight path.",
    "visual": "A luminous path through a beautiful blessed valley, illuminated by soft divine dawn light, with flowing water leading toward distant mountains.",
    "mood": "Guidance • Mercy • Peace",
    "prompt": "Wide cinematic view of a luminous radiant path winding through a serene fertile valley at dawn, crystal clear stream flowing beside the pathway, distant grand mountains glowing in soft golden morning sunlight, atmospheric mist, lush emerald vegetation, peaceful spiritual ambiance, 8K photorealistic landscape photography, no people, no text, no arabic calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 2,
    "name": "Al-Baqarah",
    "ayat": "2:2–5",
    "core": "The Quran as guidance for the believers.",
    "visual": "Vast open landscape with mountains and a strong beam of morning light breaking through clouds and illuminating the valley.",
    "mood": "Guidance • Faith • Certainty",
    "prompt": "Epic cinematic landscape of vast golden meadows and majestic mountains under dramatic morning clouds, a powerful focused beam of celestial sunlight breaking through the cloud cover and illuminating the valley floor, rich textures of earth and stone, atmospheric depth, 8K ultra realistic nature photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 3,
    "name": "Aal-Imran",
    "ayat": "3:190–191",
    "core": "Reflection upon the creation of the heavens and earth.",
    "visual": "Vast mountain landscape beneath a spectacular star-filled sky, with stars reflected in a calm lake.",
    "mood": "Reflection • Awe • Faith",
    "prompt": "Breathtaking panoramic view of majestic mountain peaks beneath an expansive cosmic night sky filled with millions of stars and the Milky Way galaxy, perfectly reflected on the mirror-smooth surface of an alpine lake at twilight, deep midnight blue, silver and emerald tones, 8K photorealistic astrophotography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 4,
    "name": "An-Nisa",
    "ayat": "4:135",
    "core": "Standing firmly for justice, equity, and moral integrity.",
    "visual": "A strong ancient stone bridge standing between dramatic mountains, illuminated by balanced directional light.",
    "mood": "Justice • Integrity • Strength",
    "prompt": "Cinematic monumental ancient stone arch bridge spanning a dramatic mountain canyon, sturdy weathered stonework, balanced symmetrical architectural composition, crystal mountain river rushing below, warm directional sunlight highlighting the stone textures, atmospheric depth, 8K photorealistic environmental photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 5,
    "name": "Al-Ma'idah",
    "ayat": "5:88",
    "core": "Good and lawful provision, gratitude, and divine blessings.",
    "visual": "Abundant natural garden with dates, grapes, grains, and fresh fruits arranged naturally within a fertile landscape.",
    "mood": "Gratitude • Blessings • Purity",
    "prompt": "Lush paradisiacal terraced garden orchard at golden hour, heavy boughs of ripe dates, glistening figs, grapes and pomegranates on trees, clear natural spring water trickling through stone channels, warm golden ambient sunlight, rich fertile soil and emerald foliage, 8K ultra realistic nature photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 6,
    "name": "Al-An'am",
    "ayat": "6:99",
    "core": "Rain bringing life to the earth, biodiversity, and creation.",
    "visual": "Rain falling over dry land as it transforms into lush green vegetation, with crops, trees, and flowing water.",
    "mood": "Life • Renewal • Creation",
    "prompt": "Cinematic wide landscape showing the miracle of rain falling from soft clouds onto fertile earth, sprouting fresh vibrant green shoots, olive and pomegranate groves emerging, glistening raindrops reflecting morning light on leaves, flowing streams reviving the valley, 8K hyper-detailed nature photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 7,
    "name": "Al-A'raf",
    "ayat": "7:54",
    "core": "Creation of the heavens and earth and the ordered universe.",
    "visual": "Monumental mountains, sky, clouds, rivers, and valleys arranged in a grand harmonious natural panorama.",
    "mood": "Creation • Majesty • Harmony",
    "prompt": "Grand panoramic natural vista from an elevated mountain ridge overlooking layered peaks, misty valleys, meandering rivers, and a vast sky transitioning from day to twilight, harmonious planetary order and natural balance, deep emerald, gold, and slate tones, 8K cinematic landscape photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 8,
    "name": "Al-Anfal",
    "ayat": "8:2–4",
    "core": "Faith, remembrance, unity, and humility before Allah.",
    "visual": "Quiet mountain landscape at dawn, with darkness gradually giving way to soft golden light.",
    "mood": "Faith • Reverence • Hope",
    "prompt": "Quiet tranquil desert mountain range at earliest dawn, deep shadows of the night slowly melting into soft amber and gold morning glow on the horizon, gentle wind sweeping fine sand across rocks, stillness and spiritual reverence, 8K photorealistic landscape, no people, no weapons, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 9,
    "name": "At-Tawbah",
    "ayat": "9:103",
    "core": "Charity purifying and cleansing, spiritual renewal.",
    "visual": "Clear flowing water passing through a fertile valley and transforming dry land into healthy green growth.",
    "mood": "Purification • Growth • Mercy",
    "prompt": "Dramatic view of clean pure spring water cascading over smoothed river stones through a flourishing valley, washing the earth, rainclouds clearing to let warm radiant sunbeams pour over blooming wildflowers and emerald grasses, atmosphere of purification and renewal, 8K realistic nature photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 10,
    "name": "Yunus",
    "ayat": "10:57",
    "core": "Quran as healing, mercy, and guidance.",
    "visual": "Dark clouds opening to reveal powerful warm sunlight over a peaceful valley.",
    "mood": "Healing • Hope • Guidance",
    "prompt": "Epic view of turbulent dark storm clouds breaking open in a circular formation to reveal intense radiant golden sun rays cascading down onto a tranquil green valley and calm lake, volumetric atmospheric light, spiritual hope and healing, 8K cinematic environmental photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 11,
    "name": "Hud",
    "ayat": "11:123",
    "core": "Perseverance, prophetic steadfastness, and trust in Allah.",
    "visual": "Ancient rocky desert landscape beneath dramatic moving clouds with an illuminated narrow pathway leading toward a bright horizon.",
    "mood": "Perseverance • Steadfastness • Trust",
    "prompt": "Rugged sandstone canyon cliffs and monumental weathered stone formations beneath dramatic moving clouds, a narrow cobblestone pathway winding through the gorge towards a glowing sunrise horizon, weathered stone textures, atmospheric depth, 8K ultra realistic nature photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 12,
    "name": "Yusuf",
    "ayat": "12:100",
    "core": "Patience, destiny, forgiveness, and fulfillment of dreams.",
    "visual": "Cinematic golden desert journey from twilight toward an illuminated ancient oasis settlement under starry skies.",
    "mood": "Patience • Destiny • Triumph",
    "prompt": "Wide cinematic desert landscape at deep twilight with rolling golden sand dunes leading to an illuminated ancient oasis palace surrounded by date palms and reflective calm pools, brilliant star-filled sky above, warm glowing lantern illumination, 8K photorealistic composition, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 13,
    "name": "Ar-Ra'd",
    "ayat": "13:12–13",
    "core": "Thunder glorifying Allah, natural power, and truth.",
    "visual": "Majestic storm clouds over vast mountains, distant lightning illuminating the sky, and rain falling over fertile valleys.",
    "mood": "Power • Reflection • Truth",
    "prompt": "Majestic high mountain range under intense dark indigo storm clouds, a brilliant distant fork of lightning illuminating the misty peaks, rain softly falling over green terraced valleys below, awe-inspiring atmosphere of natural praise, 8K ultra-detailed landscape photography, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 14,
    "name": "Ibrahim",
    "ayat": "14:35–37",
    "core": "Barren valley, prayer, family and provision.",
    "visual": "Dramatic rocky mountain valley with date palms, clear flowing water and warm sunrise.",
    "mood": "Trust • Prayer • Provision",
    "prompt": "Cinematic 8K masterpiece landscape of a dramatic rugged sandstone mountain valley in Mecca at sunrise, peaceful green date palms thriving beside a sparkling fresh water stream cutting across golden sand and river pebbles, warm radiant morning sunbeams bathing the ancient holy mountains in soft amber glow, trust, prayer and divine provision, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 15,
    "name": "Al-Hijr",
    "ayat": "15:80–84",
    "core": "People carving secure homes into mountains.",
    "visual": "Ancient stone dwellings carved directly into enormous rocky mountains, with dramatic sunlight entering the valley.",
    "mood": "History • Power • Warning",
    "prompt": "Cinematic 8K masterpiece environmental landscape showing monumental ancient sandstone dwellings and grand columned facades carved directly into towering rocky canyon cliffs, dramatic volumetric morning sunbeams slicing through deep amber and red rock shadows, fine weathered geological textures, history, power, and divine warning, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 16,
    "name": "An-Nahl",
    "ayat": "16:10–11, 16:68–69",
    "core": "Rain, olive trees, date palms, grapes, bees and honey.",
    "visual": "Lush olive and grape valley after rainfall, date palms and flowering plants, subtle natural honey-bee activity, warm golden morning light.",
    "mood": "Blessings • Creation • Sustenance",
    "prompt": "Cinematic 8K masterpiece nature landscape of a breathtaking lush terraced valley garden after rainfall, heavy olive branches glistening with raindrops, grape trellises, towering date palms, and blooming wildflowers, subtle warm golden honey-toned sunlight filtering through misty leaves, crystal clear stream, blessings, creation and sustenance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 17,
    "name": "Al-Isra",
    "ayat": "17:1",
    "core": "The night journey from Al-Masjid al-Haram to Al-Masjid al-Aqsa.",
    "visual": "Sacred ancient stone architecture under a magnificent star-filled night sky, connected by a subtle luminous atmospheric path.",
    "mood": "Wonder • Journey • Divine Signs",
    "prompt": "Cinematic 8K masterpiece architectural nightscape showing ancient sacred stone arcades, domes, and ornate marble terraces beneath a magnificent star-filled celestial midnight sky glowing with deep sapphire and silver galaxies, a subtle luminous radiant beam of divine starlight bridging the sacred earth toward the heavens, wonder, journey and divine signs, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 18,
    "name": "Al-Kahf",
    "ayat": "18:9–22",
    "core": "Companions of the Cave and divine protection.",
    "visual": "Deep natural cave opening toward a lush mountain valley, with controlled sunlight entering the cave.",
    "mood": "Protection • Faith • Mystery",
    "prompt": "Cinematic 8K masterpiece landscape looking out from a deep ancient natural limestone cave sanctuary with a majestic wide arch opening revealing a sun-drenched misty green mountain pine valley, a soft gentle volumetric shaft of morning golden sunlight slanting across the dark mossy stone cave floor, protection, faith and mystery, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 19,
    "name": "Maryam",
    "ayat": "19:23–26",
    "core": "Date palm, flowing water and provision.",
    "visual": "Desert oasis beneath a date palm, crystal-clear stream flowing beside it, warm dawn atmosphere.",
    "mood": "Mercy • Relief • Provision",
    "prompt": "Cinematic 8K masterpiece oasis landscape of a peaceful secluded desert sanctuary oasis at warm early dawn, a graceful tall date palm tree heavy with ripe golden dates arching over a crystal-clear natural fresh water spring trickling softly across smooth river stones and golden sand, pastel dawn sky, mercy, relief and provision, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 20,
    "name": "Ta-Ha",
    "ayat": "20:9–14",
    "core": "Musa and the sacred valley.",
    "visual": "Rugged mountain valley at night with a distant glowing fire/light source, without showing any person.",
    "mood": "Revelation • Awe • Guidance",
    "prompt": "Cinematic 8K masterpiece nightscape of ancient rugged red sandstone mountain valley of Mount Sinai at deep dusk under a celestial star-filled night sky, a solitary radiant glowing bush with pure mystical divine golden fire burning brightly on the mountain slopes without smoke, casting warm sacred illumination, revelation, awe and guidance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 21,
    "name": "Al-Anbiya",
    "ayat": "21:30",
    "core": "வானமும் பூமியும் இணைந்திருந்த நிலையில் பிரிக்கப்பட்டது; உயிர் நீரிலிருந்து.",
    "visual": "விண்வெளி போன்ற cosmic sky-இலிருந்து நீரால் உயிர்ப்பெறும் பூமி; vast mountains and oceans.",
    "mood": "Creation • Wonder • Life",
    "prompt": "Cinematic 8K masterpiece cosmic environmental landscape of deep sapphire star-filled cosmic space with luminous nebulae descending into majestic towering mountains and turquoise oceans, crystal waterfalls cascading from high cliffs nourishing vibrant emerald valleys with the origin of life, creation, wonder and life, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 22,
    "name": "Al-Hajj",
    "ayat": "22:5",
    "core": "பூமியின் உயிர்ப்பு, மழை மற்றும் மனித படைப்பு.",
    "visual": "வறண்ட cracked earth மீது முதல் மழைத்துளிகள் விழ, பசுமை மெதுவாக உருவாகும் cinematic macro landscape.",
    "mood": "Resurrection • Renewal • Power",
    "prompt": "Cinematic 8K masterpiece macro-environmental landscape showing parched dry cracked earth receiving glistening crystal morning raindrops, tender vibrant emerald green shoots and blooming wildflowers sprouting dynamically from the soil, soft golden sunbeams piercing parting rainclouds, resurrection, renewal and divine power, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 23,
    "name": "Al-Mu'minun",
    "ayat": "23:12–18",
    "core": "மனித படைப்பின் நிலைகள்; மழை மற்றும் நீர்.",
    "visual": "மழை மேகங்கள், நீர்த்தேக்கங்கள், பசுமையான பூமி மற்றும் இயற்கையின் உயிர்ப்பை காட்டும் layered landscape.",
    "mood": "Creation • Reflection • Wonder",
    "prompt": "Cinematic 8K masterpiece landscape showing dramatic rain clouds releasing gentle silver rain into pristine mountain reservoirs and lakes, flourishing terraced date palm groves and vineyards in the valley below, warm radiant sunbeams breaking through misty hills, creation, reflection, wonder and abundance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 24,
    "name": "An-Nur",
    "ayat": "24:35",
    "core": "அல்லாஹ் வானங்களுக்கும் பூமிக்கும் ஒளி.",
    "visual": "இருளான விண்வெளி போன்ற சூழலில் crystal lamp-inspired luminous light source, அதைச் சுற்றி பரவும் ethereal golden light.",
    "mood": "Light • Purity • Divine Beauty",
    "prompt": "Cinematic 8K masterpiece celestial composition of a majestic sacred carved marble niche suspended between the deep cosmos and an ancient sanctuary, an exquisite crystal glass lamp radiating pure divine golden light like a brilliant diamond star, ethereal golden light beams spilling outward, light, purity, and divine beauty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 25,
    "name": "Al-Furqan",
    "ayat": "25:48–49",
    "core": "காற்று, மழை மற்றும் உயிர்ப்பிக்கப்பட்ட நிலம்.",
    "visual": "மழை மேகங்கள் பாலைவனத்தின் மீது வந்து, அதன் பின்னால் பசுமையாக மாறும் landscape.",
    "mood": "Mercy • Renewal • Life",
    "prompt": "Cinematic 8K masterpiece panoramic landscape of dramatic towering rain clouds sweeping across sweeping desert sand dunes, fresh silver rain falling in the distance and transforming the arid desert into a flourishing green meadow of grasses, wildflowers and fresh streams, mercy, renewal and life, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 26,
    "name": "Ash-Shu'ara",
    "ayat": "26:7–9",
    "core": "பூமியில் உள்ள நல்ல தாவரங்களில் இறைவனின் அடையாளங்கள்.",
    "visual": "endless botanical valley with diverse plants, flowers, trees and sunlight.",
    "mood": "Signs • Beauty • Reflection",
    "prompt": "Cinematic 8K masterpiece botanical valley landscape of an endless panoramic valley teeming with every noble variety of botanical life, blooming jasmine, lavender, vibrant pomegranate and olive trees, aromatic flowering herbs and tall grasses, warm morning sunlight with sparkling dewdrops, signs, beauty and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 27,
    "name": "An-Naml",
    "ayat": "27:18–19",
    "core": "எறும்புகளின் உலகம் மற்றும் Solomon's gratitude.",
    "visual": "macro-scale natural environment showing a detailed ant colony beneath giant grasses and stones, golden sunlight filtering through.",
    "mood": "Wisdom • Gratitude • Creation",
    "prompt": "Cinematic 8K masterpiece macro ground-level perspective showing busy ants navigating beneath lush emerald forest grass blades, smoothed river stones and wildflowers, golden morning sunbeams filtering down creating volumetric god-rays, wisdom, gratitude, humility and wonder of creation, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 28,
    "name": "Al-Qasas",
    "ayat": "28:23–24",
    "core": "நீர்நிலையருகே உதவி, பின்னர் இறைவனிடம் நம்பிக்கை.",
    "visual": "ancient desert settlement beside a flowing spring; distant mountains and warm evening light.",
    "mood": "Trust • Compassion • Hope",
    "prompt": "Cinematic 8K masterpiece landscape of an ancient desert stone settlement beside a fresh bubbling natural spring, crystal water flowing through stone channels into a quiet pond, date palms swaying in gentle breeze against distant mountain silhouettes at warm golden sunset, trust, compassion and hope, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 29,
    "name": "Al-Ankabut",
    "ayat": "29:41",
    "core": "சிலந்தியின் வீடு பலவீனமானது; தவறான நம்பிக்கையின் பலவீனம்.",
    "visual": "delicate spider web covered with morning dew, contrasted against massive ancient rocks and powerful nature.",
    "mood": "Fragility • Reflection • Dependence",
    "prompt": "Cinematic 8K masterpiece macro photography of an intricate dewy spider web glistening with morning dew drops in front of colossal ancient granite cliff boulders, soft golden morning light highlighting the delicate fragility versus the immense enduring power of nature, fragility, reflection and divine dependence, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 30,
    "name": "Ar-Rum",
    "ayat": "30:20–25",
    "core": "பூமி, மனிதர்கள், மொழிகள், நிறங்கள் மற்றும் இயற்கையின் அடையாளங்கள்.",
    "visual": "diverse natural landscape transitioning from dawn to mountains, sea and fertile plains.",
    "mood": "Signs • Diversity • Harmony",
    "prompt": "Cinematic 8K masterpiece panoramic landscape showcasing the vast diversity of creation—snowcapped mountain summits transitioning into lush terraced green hills, meandering turquoise rivers, and expansive coastal seas beneath a magnificent dawn sky, signs, diversity and harmony of creation, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 31,
    "name": "Luqman",
    "ayat": "31:10–11",
    "core": "வானங்கள், மலைகள் மற்றும் பூமியில் இறைவனின் படைப்பு.",
    "visual": "enormous mountains anchored in a vast green valley beneath a perfectly clear sky.",
    "mood": "Wisdom • Creation • Reflection",
    "prompt": "Cinematic 8K masterpiece landscape of colossal majestic mountains standing firmly anchored across an expansive emerald green valley beneath a crystal-clear azure sky, gentle mountain river reflecting the morning sunlight, atmospheric clarity, wisdom, creation and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 32,
    "name": "As-Sajdah",
    "ayat": "32:4–9",
    "core": "வானங்களும் பூமியும் படைக்கப்பட்ட விதம்.",
    "visual": "cosmic heavens blending seamlessly into earthly mountains, rivers and forests.",
    "mood": "Majesty • Creation • Submission",
    "prompt": "Cinematic 8K masterpiece panoramic vision where luminous cosmic nebulae and swirling celestial galaxies blend seamlessly into tranquil earthly mountains, crystal rivers and ancient pine forests at twilight, cosmic majesty, divine design and reverent submission, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 33,
    "name": "Al-Ahzab",
    "ayat": "33:21",
    "core": "அல்லாஹ்வின் தூதரில் சிறந்த முன்மாதிரி.",
    "visual": "அமைதியான ancient desert pathway leading toward a luminous horizon; no human representation.",
    "mood": "Guidance • Character • Devotion",
    "prompt": "Cinematic 8K masterpiece landscape of a peaceful ancient desert pathway of smooth stones winding through serene sandstone hills toward a radiant glowing golden sunrise horizon, soft morning dust motes shimmering in sunlight, guidance, noble character and devotion, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 34,
    "name": "Saba",
    "ayat": "34:15–16",
    "core": "Saba நாட்டின் தோட்டங்கள், நீர்வளம் மற்றும் நன்றியுணர்வு.",
    "visual": "two enormous fertile gardens separated by a flowing water channel, surrounded by mountains.",
    "mood": "Prosperity • Gratitude • Blessings",
    "prompt": "Cinematic 8K masterpiece landscape of the two legendary twin gardens of Saba, brimming with lush date palms, grapevines, pomegranate trees, and flourishing terraced crops flanking a grand stone irrigation canal with cascading fresh mountain water, surrounded by protective peaks, prosperity, gratitude and blessings, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 35,
    "name": "Fatir",
    "ayat": "35:27–28",
    "core": "மழை, மலைகளின் நிற வேறுபாடு, உயிரினங்களின் diversity.",
    "visual": "multicolored mineral mountains, rain clouds, forests and diverse natural textures.",
    "mood": "Diversity • Beauty • Creation",
    "prompt": "Cinematic 8K masterpiece landscape of spectacular geological mineral mountain strata displaying vivid white limestone, deep crimson sandstone, and raven-black obsidian layers beneath parting rain clouds, lush green foothill forests and river, breathtaking natural diversity and divine creation, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 36,
    "name": "Ya-Sin",
    "ayat": "36:33–35",
    "core": "இறந்த பூமியை மழையால் உயிர்ப்பித்தல்.",
    "visual": "barren land transforming into lush green fields under dramatic rain and sunlight.",
    "mood": "Renewal • Life • Resurrection",
    "prompt": "Cinematic 8K masterpiece landscape capturing dead dry earth reviving into flourishing verdant fields, grain stalks, blossoming fruit orchards and flowing fresh water springs under dramatic sunbeams breaking through silver rainclouds, renewal, life and resurrection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 37,
    "name": "As-Saffat",
    "ayat": "37:5–7",
    "core": "வானத்தின் படைப்பு மற்றும் நட்சத்திரங்களால் அலங்காரம்.",
    "visual": "vast pristine night sky filled with brilliant stars above silent mountain peaks.",
    "mood": "Majesty • Protection • Wonder",
    "prompt": "Cinematic 8K masterpiece astrophotography showing a pristine cosmic night sky adorned with countless brilliant jewel-like stars, celestial constellations and the glowing Milky Way arching over silent dark mountain silhouettes and calm lake, majesty, divine protection and cosmic wonder, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 38,
    "name": "Sad",
    "ayat": "38:17–20",
    "core": "patience, strength and divine wisdom.",
    "visual": "powerful ancient mountain landscape with a calm river flowing through it despite dramatic skies.",
    "mood": "Strength • Patience • Wisdom",
    "prompt": "Cinematic 8K masterpiece landscape of enduring towering granite mountain ridges standing resolute beneath dramatic moving twilight storm clouds, a calm steady river flowing smoothly through the canyon floor reflecting soft ambient light, strength, steadfast patience and divine wisdom, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 39,
    "name": "Az-Zumar",
    "ayat": "39:21",
    "core": "மழை பூமிக்குள் சென்று பயிர்களை வளர்த்து பின்னர் வாடச் செய்கிறது.",
    "visual": "complete life cycle of a green field transitioning from fresh growth to golden maturity.",
    "mood": "Reflection • Transience • Renewal",
    "prompt": "Cinematic 8K masterpiece agricultural landscape capturing the harmonious cycle of earth—fresh green shoots sprouting from dark rain-watered soil on one side, transitioning into golden mature wheat fields on the other beneath warm evening sunlight, reflection, transience and renewal, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 40,
    "name": "Ghafir",
    "ayat": "40:61–64",
    "core": "இரவும் பகலும், வானமும் பூமியும், வாழ்வாதாரமும்.",
    "visual": "panoramic landscape where night gradually transitions into sunrise over fertile earth.",
    "mood": "Mercy • Creation • Gratitude",
    "prompt": "Cinematic 8K masterpiece panoramic landscape capturing the seamless celestial gradient where deep starry night softly transitions into a radiant golden sunrise over fertile green valleys, mountain ridges, and meandering rivers, mercy, creation and gratitude, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 41,
    "name": "Fussilat",
    "ayat": "41:9–12",
    "core": "பூமி, மலைகள், வானங்கள் மற்றும் படைப்பின் ஒழுங்கு.",
    "visual": "monumental earth landscape under a vast cosmic sky, with mountains and atmospheric layers.",
    "mood": "Creation • Order • Majesty",
    "prompt": "Cinematic 8K masterpiece landscape of colossal mountain peaks and fertile earth strata rising beneath an expansive multi-layered atmospheric sky transitioning into deep cosmic space, harmonious planetary order and cosmic majesty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 42,
    "name": "Ash-Shura",
    "ayat": "42:11",
    "core": "வானங்களையும் பூமியையும் படைத்தவன்; அவனுக்கு ஒப்பானது எதுவுமில்லை.",
    "visual": "vast untouched natural landscape emphasizing scale and uniqueness of creation.",
    "mood": "Majesty • Uniqueness • Awe",
    "prompt": "Cinematic 8K masterpiece untouched primordial natural landscape of monumental peaks, pristine emerald valleys, crystal rivers, and an infinite celestial sky, conveying peerless divine uniqueness, infinite scale and awe, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 43,
    "name": "Az-Zukhruf",
    "ayat": "43:10–13",
    "core": "பூமியை வாழ்விடமாக அமைத்து மழையை இறக்குதல்.",
    "visual": "fertile rolling hills after rainfall, lush fields and distant mountains under golden sunlight.",
    "mood": "Provision • Beauty • Gratitude",
    "prompt": "Cinematic 8K masterpiece landscape of fertile rolling green hills immediately after a refreshing rain, glistening foliage, terraced crops, and winding pathways leading toward distant mountains under warm golden evening sunlight, provision, beauty and gratitude, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 44,
    "name": "Ad-Dukhan",
    "ayat": "44:10–16",
    "core": "புகை மற்றும் எச்சரிக்கை.",
    "visual": "vast landscape obscured by an immense atmospheric veil of smoke-like mist, with faint light breaking through.",
    "mood": "Warning • Mystery • Awe",
    "prompt": "Cinematic 8K masterpiece dramatic atmospheric landscape of vast desert canyons and mountains enveloped in an immense dramatic veil of misty atmospheric fog, with striking beams of golden light piercing through the mist onto rugged rock formations, warning, mystery and awe, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 45,
    "name": "Al-Jathiyah",
    "ayat": "45:3–5",
    "core": "வானம், பூமி, உயிரினங்கள், இரவு-பகல் மற்றும் காற்றில் அடையாளங்கள்.",
    "visual": "one sweeping panorama combining mountains, animals' natural habitat, clouds, sunset and moving wind through grass.",
    "mood": "Signs • Reflection • Majesty",
    "prompt": "Cinematic 8K masterpiece sweeping panoramic landscape uniting rolling mountain ranges, dynamic wind rippling through golden savanna grasses, billowing sunset clouds, and a calm river under a twilight sky, profound signs of creation, reflection and majesty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 46,
    "name": "Al-Ahqaf",
    "ayat": "46:21–26",
    "core": "‘Ad மக்கள் மற்றும் மணல் மலைகளின் warning.",
    "visual": "enormous ancient desert dunes surrounding abandoned stone structures under a dramatic storm front.",
    "mood": "Warning • Power • History",
    "prompt": "Cinematic 8K masterpiece desert landscape of monumental curved sand dunes (Al-Ahqaf) stretching across the desert around ancient weathered stone ruins beneath an ominous approaching storm cloud front, warning, power, and historical reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 47,
    "name": "Muhammad",
    "ayat": "47:15",
    "core": "Paradise — நீரோடைகள், பால், தேன் மற்றும் தூய நீர்.",
    "visual": "magnificent paradise-inspired garden with multiple clear streams, lush greenery and golden light.",
    "mood": "Paradise • Peace • Reward",
    "prompt": "Cinematic 8K masterpiece paradisiacal garden valley featuring multiple crystal-clear cascading streams of pure water, lush emerald foliage, ripe pomegranate and fig trees, fragrant blossoms and radiant golden heavenly sunlight, paradise, eternal peace and reward, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 48,
    "name": "Al-Fath",
    "ayat": "48:1",
    "core": "தெளிவான வெற்றி.",
    "visual": "a narrow mountain passage opening into an immense radiant valley beneath sunrise.",
    "mood": "Victory • Hope • Opening",
    "prompt": "Cinematic 8K masterpiece landscape of a dark rocky mountain gorge suddenly opening out into an immense sun-drenched radiant valley flooded with triumphant golden morning light and blooming meadows, clear victory, hope, and expansive relief, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 49,
    "name": "Al-Hujurat",
    "ayat": "49:13",
    "core": "மனிதர்களின் பல்வேறு சமூகங்கள் மற்றும் ஒருவரையொருவர் அறிதல்.",
    "visual": "different natural regions—mountains, forests, deserts and coastlines—unified in one panoramic earth landscape.",
    "mood": "Unity • Diversity • Dignity",
    "prompt": "Cinematic 8K masterpiece panoramic landscape harmoniously uniting diverse natural realms—snowy peaks, lush pine forests, golden sand dunes, and turquoise ocean coasts—beneath a single radiant sky, unity in diversity, dignity and harmony, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 50,
    "name": "Qaf",
    "ayat": "50:6–11",
    "core": "வானம், பூமி, மலைகள், மழை மற்றும் உயிர்ப்பு.",
    "visual": "towering mountains beneath a dramatic sky with rain nourishing a lush valley.",
    "mood": "Resurrection • Majesty • Reflection",
    "prompt": "Cinematic 8K masterpiece landscape of towering granite mountains standing under a flawless sky, gentle rain falling from clouds to nourish tall clustered date palms and lush green valley pastures, resurrection, majesty and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 51,
    "name": "Adh-Dhariyat",
    "ayat": "51:20–23",
    "core": "பூமியிலும் மனிதர்களிலும் இறைவனின் அடையாளங்கள்.",
    "visual": "detailed earth textures, mountains, stars and vast natural horizon under dawn light.",
    "mood": "Signs • Certainty • Reflection",
    "prompt": "Cinematic 8K masterpiece landscape capturing intricate natural geological textures, mountain ridges, and vast desert horizons beneath a dawn sky still holding morning stars, profound certainty, signs and deep reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 52,
    "name": "At-Tur",
    "ayat": "52:1–8",
    "core": "மலை, வானம் மற்றும் இறுதி நாளின் மகத்துவம்.",
    "visual": "colossal mountain range beneath an extraordinary dramatic celestial sky.",
    "mood": "Majesty • Awe • Warning",
    "prompt": "Cinematic 8K masterpiece landscape of the colossal sacred rocky summit of Mount Sinai (At-Tur) rising dramatically beneath an extraordinary celestial sky with swelling distant seas on the horizon, sacred oaths, majesty and awe, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 53,
    "name": "An-Najm",
    "ayat": "53:1–18",
    "core": "நட்சத்திரம் மற்றும் வானத்தின் அடையாளங்கள்.",
    "visual": "luminous stars across a deep cosmic sky above a silent desert horizon.",
    "mood": "Wonder • Revelation • Majesty",
    "prompt": "Cinematic 8K masterpiece nightscape showing brilliant radiant falling stars and luminous cosmic nebulae arching over a silent desert mountain ridge, sacred lote tree silhouette glowing in celestial light, wonder, revelation and majesty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 54,
    "name": "Al-Qamar",
    "ayat": "54:1–2",
    "core": "சந்திரனின் பிளவு மற்றும் மறுப்பின் எச்சரிக்கை.",
    "visual": "enormous full moon over rugged mountains, dramatic celestial atmosphere.",
    "mood": "Miracle • Awe • Warning",
    "prompt": "Cinematic 8K masterpiece nightscape of an enormous radiant full moon hanging over dark rugged mountain peaks and a serene midnight sea, casting silvery reflections across the water, miracle, awe and celestial clarity, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 55,
    "name": "Ar-Rahman",
    "ayat": "55:1–13",
    "core": "இறைவனின் அருட்கொடைகள்; சமநிலை, சூரியன், சந்திரன், தாவரங்கள்.",
    "visual": "breathtaking balanced garden with sunlight, moonlit water, flowers, trees and mountains.",
    "mood": "Mercy • Beauty • Gratitude",
    "prompt": "Cinematic 8K masterpiece paradisiacal landscape showcasing the divine balance of creation—lush twin gardens, cascading waterfalls, turquoise coastal waters with pearls, pomegranates on trees, and balanced sunlight and moonlight, mercy, beauty and immense gratitude, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 56,
    "name": "Al-Waqi’ah",
    "ayat": "56:75–79",
    "core": "நட்சத்திரங்களின் நிலைகள் மற்றும் குர்ஆனின் மகத்துவம்.",
    "visual": "deep cosmic panorama filled with distant stars above a quiet earthly landscape.",
    "mood": "Majesty • Reverence • Wonder",
    "prompt": "Cinematic 8K masterpiece astrophotography capturing deep cosmic constellations and star fields arching above a tranquil earth landscape with thornless lote trees and calm reflecting waters, sacred majesty, reverence and wonder, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 57,
    "name": "Al-Hadid",
    "ayat": "57:20",
    "core": "உலக வாழ்க்கையின் நிலையின்மை.",
    "visual": "lush spring meadow gradually transitioning into dry autumn landscape under fading sunlight.",
    "mood": "Transience • Reflection • Detachment",
    "prompt": "Cinematic 8K masterpiece landscape showing the transience of life—a vibrant green flower-filled spring meadow on one side naturally fading into a golden dry autumn harvest under setting evening sun, reflection, transience and spiritual wisdom, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 58,
    "name": "Al-Mujadilah",
    "ayat": "58:7",
    "core": "அல்லாஹ்வின் அறிவு அனைத்தையும் சூழ்ந்துள்ளது.",
    "visual": "vast earth landscape seen from an elevated cosmic perspective, emphasizing unseen awareness.",
    "mood": "Awareness • Accountability • Omniscience",
    "prompt": "Cinematic 8K masterpiece elevated landscape looking out over vast continents, mountains, secluded valleys and oceans bathed in soft all-encompassing golden celestial light, divine omniscience, awareness and peace, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 59,
    "name": "Al-Hashr",
    "ayat": "59:21",
    "core": "குர்ஆன் மலையின் மீது இறக்கப்பட்டிருந்தால் அதன் மகத்துவத்தால் அது பணிந்திருக்கும்.",
    "visual": "enormous mountain under radiant heavenly light, its peaks surrounded by mist and dramatic clouds.",
    "mood": "Reverence • Majesty • Humility",
    "prompt": "Cinematic 8K masterpiece landscape of a colossal mountain peak bathed in intense beams of radiant celestial light pouring from parting heavenly clouds, mountain mist swirling in reverent stillness, reverence, majesty and profound humility, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 60,
    "name": "Al-Mumtahanah",
    "ayat": "60:8",
    "core": "நன்மை மற்றும் நீதியுடன் நடப்பது.",
    "visual": "peaceful bridge connecting two naturally different landscapes across a clear river.",
    "mood": "Justice • Peace • Compassion",
    "prompt": "Cinematic 8K masterpiece landscape of an elegant ancient stone bridge spanning a crystal river, harmoniously connecting a lush green olive orchard with a rugged flower-strewn hill under warm morning sun, justice, peace and compassion, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 61,
    "name": "As-Saff",
    "ayat": "61:4",
    "core": "ஒழுங்கும் ஒன்றுபட்ட அணியும்.",
    "visual": "perfectly aligned rows of monumental stone formations leading toward a radiant horizon.",
    "mood": "Unity • Discipline • Strength",
    "prompt": "Cinematic 8K masterpiece landscape of perfectly aligned natural granite mountain pillars and stone colonnades leading toward a radiant golden sunrise horizon, morning mist in the valley, unity, steadfast discipline and unyielding strength, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 62,
    "name": "Al-Jumu’ah",
    "ayat": "62:1–4",
    "core": "அல்லாஹ்வைப் புகழ்தல் மற்றும் வழிகாட்டுதல்.",
    "visual": "peaceful city skyline transitioning into a vast open landscape beneath golden Friday-afternoon light.",
    "mood": "Guidance • Community • Gratitude",
    "prompt": "Cinematic 8K masterpiece architectural landscape of an ancient peaceful courtyard and graceful stone arches transitioning into a vast open valley bathed in brilliant golden Friday afternoon sunlight, guidance, serenity and grateful praise, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 63,
    "name": "Al-Munafiqun",
    "ayat": "63:9–11",
    "core": "செல்வமும் குழந்தைகளும் அல்லாஹ்வின் நினைவிலிருந்து திசைதிருப்பக் கூடாது.",
    "visual": "magnificent worldly landscape fading into shadow while a distant luminous path remains visible.",
    "mood": "Reminder • Detachment • Awareness",
    "prompt": "Cinematic 8K masterpiece landscape showing ornate worldly palaces fading into evening twilight shadows, while a simple pure luminous stone pathway winding toward the mountains glows brightly in golden light, reminder, detachment and spiritual clarity, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 64,
    "name": "At-Taghabun",
    "ayat": "64:3",
    "core": "வானங்களையும் பூமியையும் உண்மையுடன் படைத்தல்.",
    "visual": "perfectly composed mountains, ocean, clouds and sky showing harmony and order.",
    "mood": "Creation • Harmony • Truth",
    "prompt": "Cinematic 8K masterpiece panoramic landscape showing perfect composition of towering mountain peaks, turquoise ocean surf, verdant hills and dramatic clouds under balanced golden twilight, creation in truth, flawless harmony and divine order, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 65,
    "name": "At-Talaq",
    "ayat": "65:2–3",
    "core": "இறைவனை அஞ்சுவோருக்கு வழி மற்றும் எதிர்பாராத இடத்திலிருந்து வாழ்வாதாரம்.",
    "visual": "narrow rocky path suddenly opening into a lush green valley filled with flowing water and sunlight.",
    "mood": "Trust • Relief • Provision",
    "prompt": "Cinematic 8K masterpiece landscape of a dark narrow canyon path suddenly opening into a wide sun-drenched fertile oasis filled with date palms, blooming flowers and sparkling spring water, trust in Allah, relief and unexpected provision, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 66,
    "name": "At-Tahrim",
    "ayat": "66:6",
    "core": "தன்னையும் குடும்பத்தையும் பாதுகாத்தல்.",
    "visual": "warm illuminated home-like architectural silhouette surrounded by peaceful protective landscape.",
    "mood": "Protection • Responsibility • Faith",
    "prompt": "Cinematic 8K masterpiece landscape of an ancient stone sanctuary residence glowing warmly with golden interior light, surrounded by protective sheltering date palm groves and calm waters under a quiet starlit sky, protection, responsibility and faith, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 67,
    "name": "Al-Mulk",
    "ayat": "67:3–5",
    "core": "ஏழு வானங்களின் perfect order; நட்சத்திரங்களின் அழகு.",
    "visual": "immense layered celestial sky filled with stars above majestic mountain peaks.",
    "mood": "Majesty • Order • Wonder",
    "prompt": "Cinematic 8K masterpiece astrophotography showing the flawless harmony of seven celestial spheres filled with glowing starry lamps and nebulae arching over majestic mountain silhouettes, absolute perfection of the Creator's dominion, majesty, order and wonder, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 68,
    "name": "Al-Qalam",
    "ayat": "68:17–33",
    "core": "தோட்டம், செல்வம் மற்றும் நன்றியின்மை பற்றிய எச்சரிக்கை.",
    "visual": "once-lush orchard transitioning into a devastated dry garden under pale morning light.",
    "mood": "Warning • Humility • Gratitude",
    "prompt": "Cinematic 8K masterpiece landscape contrasting a flourishing fruit orchard on one side with a withered dry garden on the other under pale early morning light, warning against arrogance, lesson in humility and gratitude, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 69,
    "name": "Al-Haqqah",
    "ayat": "69:13–18",
    "core": "இறுதி நாள் மற்றும் பூமி-மலைகளின் மாற்றம்.",
    "visual": "colossal mountains under a dramatically transformed sky, with immense atmospheric movement.",
    "mood": "Judgment • Power • Awe",
    "prompt": "Cinematic 8K masterpiece dramatic landscape of monumental mountains beneath an extraordinary transformed sky of swirling golden and crimson clouds parting to reveal celestial light, judgment, supreme power and awe, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 70,
    "name": "Al-Ma’arij",
    "ayat": "70:19–35",
    "core": "மனிதனின் இயல்பு; தொழுகையாளர்களின் பண்புகள்.",
    "visual": "long ascending mountain path toward a calm luminous horizon.",
    "mood": "Patience • Devotion • Aspiration",
    "prompt": "Cinematic 8K masterpiece landscape of a grand natural stone stairway ascending a rugged mountain ridge through morning mist toward a serene glowing sun-drenched summit, beautiful patience, steadfast devotion and spiritual ascent, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 71,
    "name": "Nuh",
    "ayat": "71:10–12",
    "core": "மன்னிப்பு கேட்பது; மழை, செல்வம் மற்றும் தோட்டங்கள்.",
    "visual": "heavy rain clouds opening over a dry land that becomes green, with flowing streams and orchards.",
    "mood": "Forgiveness • Renewal • Mercy",
    "prompt": "Cinematic 8K masterpiece landscape showing abundant refreshing rain pouring from soft clouds over a reviving valley, crystal streams swelling and nourishing blossoming date palms and emerald pastures, forgiveness, renewal and divine mercy, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 72,
    "name": "Al-Jinn",
    "ayat": "72:8–10",
    "core": "வானத்தின் பாதுகாப்பு மற்றும் unseen world.",
    "visual": "mysterious night sky surrounded by mountains and luminous celestial barriers.",
    "mood": "Mystery • Protection • Awe",
    "prompt": "Cinematic 8K masterpiece nightscape showing a deep indigo sky guarded by radiant shooting stars and luminous celestial auroral bands above quiet desert mountain pillars, mystery of the unseen world, protection and awe, no people, no monsters, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 73,
    "name": "Al-Muzzammil",
    "ayat": "73:1–8",
    "core": "இரவு தொழுகை, குர்ஆன் ஓதுதல், இறைவனை நினைத்தல்.",
    "visual": "serene moonlit landscape with a quiet mountain silhouette and soft dawn approaching.",
    "mood": "Devotion • Serenity • Reflection",
    "prompt": "Cinematic 8K masterpiece nightscape of a serene moonlit stone terrace overlooking a quiet mountain valley at the third hour of the night, a single warm oil lamp casting gentle amber light, stillness of late night devotion and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 74,
    "name": "Al-Muddaththir",
    "ayat": "74:1–7",
    "core": "எழுந்து எச்சரித்தல்; தூய்மை மற்றும் பொறுமை.",
    "visual": "dark landscape gradually illuminated by a strong dawn horizon.",
    "mood": "Awakening • Purity • Resolve",
    "prompt": "Cinematic 8K masterpiece landscape capturing the exact moment of dawn, pure brilliant golden sunlight bursting dramatically over dark mountain ridges, dispelling night shadows with crisp clarity, awakening, purity and steadfast resolve, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 75,
    "name": "Al-Qiyamah",
    "ayat": "75:1–15",
    "core": "மறுமை மற்றும் மனிதனின் பொறுப்பு.",
    "visual": "vast barren landscape beneath an extraordinary transformed sky, symbolizing the final awakening.",
    "mood": "Judgment • Accountability • Awe",
    "prompt": "Cinematic 8K masterpiece landscape of an expansive valley at sunrise beneath a dramatically illuminated sky, morning mist parting to reveal radiant golden light striking mountain peaks, judgment, accountability, and the final awakening, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 76,
    "name": "Al-Insan",
    "ayat": "76:5–22",
    "core": "நீதிமான்களுக்கு Paradise; pure drink, shade and comfort.",
    "visual": "lush paradise garden with flowing streams, shade trees and luminous peaceful atmosphere.",
    "mood": "Reward • Peace • Gratitude",
    "prompt": "Cinematic 8K masterpiece paradisiacal garden featuring cascading crystalline springs (Salsabil), shaded by date palms and flowering jasmine, cool soothing breeze and golden sunlight filtering through emerald leaves, eternal reward, peace and gratitude, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 77,
    "name": "Al-Mursalat",
    "ayat": "77:25–27",
    "core": "பூமி உயிர்களுக்கு தாங்கும் இடம்; மலைகள் மற்றும் நீர்.",
    "visual": "vast earth landscape with towering mountains and deep springs.",
    "mood": "Power • Provision • Certainty",
    "prompt": "Cinematic 8K masterpiece landscape of monumental mountain peaks firmly anchoring a vast green earth with deep fresh water springs and rushing mountain rivers under dynamic cloud formations, power, provision and certainty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 78,
    "name": "An-Naba",
    "ayat": "78:6–16",
    "core": "பூமி, மலைகள், இரவு, பகல், மழை மற்றும் தோட்டங்கள்.",
    "visual": "grand cinematic transition from night to sunrise over mountains, rain-fed fields and lush gardens.",
    "mood": "Creation • Renewal • Wonder",
    "prompt": "Cinematic 8K masterpiece landscape of monumental mountain peaks standing as pegs above fertile green terraced valleys, pouring rain clouds clearing to reveal a glorious sunrise over lush fruit gardens, creation, renewal and wonder, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 79,
    "name": "An-Nazi’at",
    "ayat": "79:27–33",
    "core": "வானம், இரவு, பகல், பூமி மற்றும் மலைகள்.",
    "visual": "immense sky above mountains and fertile earth illuminated by sunrise.",
    "mood": "Majesty • Creation • Power",
    "prompt": "Cinematic 8K masterpiece panoramic landscape showing the magnificent expanse of heaven above towering mountains and outspread fertile earth bathed in glorious sunrise light, majesty, creation and supreme power, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 80,
    "name": "Abasa",
    "ayat": "80:24–32",
    "core": "மனிதன் தனது உணவைப் பற்றி சிந்தித்தல்; மழை, தானியம், திராட்சை, ஆலிவ்.",
    "visual": "detailed fertile agricultural landscape with rain, grain fields, grapevines, olives and date palms.",
    "mood": "Sustenance • Gratitude • Reflection",
    "prompt": "Cinematic 8K masterpiece agricultural landscape brimming with ripe olive groves, lush grape trellises, towering date palms, and golden grain fields watered by clear mountain irrigation channels in morning light, sustenance, gratitude and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 81,
    "name": "At-Takwir",
    "ayat": "81:1–14",
    "core": "உலகத்தின் இறுதி மாற்றங்கள்.",
    "visual": "surreal but photorealistic cosmic transformation—darkened sun, altered sky and vast barren earth.",
    "mood": "Apocalypse • Awe • Judgment",
    "prompt": "Cinematic 8K masterpiece dramatic landscape of an awe-inspiring cosmic dawn where darkness and celestial transformation yield to the breathing morning light over mountains and vast horizons, profound awe, truth and reality, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 82,
    "name": "Al-Infitar",
    "ayat": "82:1–5",
    "core": "வானம் பிளத்தல் மற்றும் இறுதி நாள்.",
    "visual": "dramatic celestial sky splitting above a silent earthly landscape.",
    "mood": "Judgment • Awe • Awakening",
    "prompt": "Cinematic 8K masterpiece cosmic seascape beneath a deep night sky of swirling stars and celestial nebulae, calm ocean waters reflecting the infinite canopy of heaven, judgment, awe and spiritual awakening, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 83,
    "name": "Al-Mutaffifin",
    "ayat": "83:1–6",
    "core": "அளவு-எடையில் மோசடி செய்யும் மக்களுக்கு எச்சரிக்கை.",
    "visual": "ancient marketplace-inspired stone scales abandoned beneath stark directional light; no people.",
    "mood": "Justice • Accountability • Warning",
    "prompt": "Cinematic 8K masterpiece composition of an ancient stone courtyard with balanced marble columns beneath stark dramatic directional sunbeams, pure symmetrical lines and geometric architecture, justice, moral accountability and warning, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 84,
    "name": "Al-Inshiqaq",
    "ayat": "84:1–5",
    "core": "வானம் பிளந்து பூமி விரிவடையும் இறுதி நாள்.",
    "visual": "immense celestial transformation over an empty earthly horizon.",
    "mood": "Judgment • Surrender • Awe",
    "prompt": "Cinematic 8K masterpiece twilight sky glowing with vibrant crimson and golden afterglow (Al-Shafaq), a radiant full moon rising over serene rolling desert hills, peaceful cosmic surrender and awe, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 85,
    "name": "Al-Buruj",
    "ayat": "85:1–9",
    "core": "வானத்தின் towers/stars மற்றும் faith under persecution.",
    "visual": "majestic star-filled sky above ancient fortress-like mountain formations.",
    "mood": "Faith • Courage • Perseverance",
    "prompt": "Cinematic 8K masterpiece astrophotography showing majestic glowing constellations and the Milky Way arching over ancient fortress-like dark mountain ramparts, eternal faith, steadfast courage and perseverance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 86,
    "name": "At-Tariq",
    "ayat": "86:1–5",
    "core": "இரவு நட்சத்திரம் மற்றும் மனித படைப்பின் சிந்தனை.",
    "visual": "one intensely bright star dominating a deep night sky above a silent desert.",
    "mood": "Mystery • Reflection • Wonder",
    "prompt": "Cinematic 8K masterpiece nightscape featuring an intensely brilliant piercing morning star (At-Tariq) radiating diamond light in deep indigo skies above quiet desert sand ripples, mystery, reflection and wonder, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 87,
    "name": "Al-A’la",
    "ayat": "87:1–5",
    "core": "உயர்ந்த இறைவனைப் புகழ்தல்; தாவர வளர்ச்சி மற்றும் உலர்தல்.",
    "visual": "fresh green vegetation emerging from earth, transitioning into golden dry grass under sunlight.",
    "mood": "Glory • Creation • Reflection",
    "prompt": "Cinematic 8K masterpiece alpine meadow landscape with fresh emerald pasture grasses watered by clear mountain streams, transitioning into golden dry meadows beneath snowcapped summits, glory of the Most High, creation and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 88,
    "name": "Al-Ghashiyah",
    "ayat": "88:17–20",
    "core": "ஒட்டகம், வானம், மலைகள், பூமி ஆகியவற்றில் சிந்தனை.",
    "visual": "vast desert with distant camel silhouettes avoided; instead emphasize footprints, desert dunes, immense mountains and sky.",
    "mood": "Reflection • Creation • Majesty",
    "prompt": "Cinematic 8K masterpiece desert landscape of wind-rippled red and golden dunes stretching to monumental towering mountain ranges beneath an immense crystal blue sky, deep contemplation on creation and majesty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 89,
    "name": "Al-Fajr",
    "ayat": "89:6–14",
    "core": "பழைய சக்திவாய்ந்த மக்கள் மற்றும் அவர்களின் அழிவு.",
    "visual": "enormous abandoned ancient stone ruins in a desert valley beneath dramatic dawn light.",
    "mood": "Warning • History • Power",
    "prompt": "Cinematic 8K masterpiece landscape of colossal ancient stone pillars and carved ruins in a desert canyon at the first breaking light of dawn (Al-Fajr), morning mist parting around ancient stones, historical warning, majesty and divine power, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 90,
    "name": "Al-Balad",
    "ayat": "90:11–18",
    "core": "கடினமான பாதையைத் தேர்ந்தெடுப்பது; உதவி, பசி தீர்த்தல், நம்பிக்கை.",
    "visual": "steep rocky mountain pass leading toward a bright fertile valley.",
    "mood": "Struggle • Compassion • Hope",
    "prompt": "Cinematic 8K masterpiece landscape of a steep rugged mountain pass of ancient stones ascending through rocky cliffs and leading out into a sun-drenched fertile green valley, moral struggle, compassion and steadfast hope, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 91,
    "name": "Ash-Shams",
    "ayat": "91:1–10",
    "core": "சூரியன், சந்திரன், பகல், இரவு மற்றும் ஆன்மாவின் பரிசுத்தம்.",
    "visual": "sunrise and moonset over a pristine landscape, with light gradually covering the earth.",
    "mood": "Purification • Balance • Light",
    "prompt": "Cinematic 8K masterpiece landscape of a radiant golden sun rising over pristine mountain ranges while a pale crescent moon sets on the twilight horizon, golden rays spreading across the fertile earth, soul purification, balance and light, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 92,
    "name": "Al-Layl",
    "ayat": "92:1–11",
    "core": "இரவும் பகலும்; கொடுப்பவர் மற்றும் மறுப்பவர்.",
    "visual": "landscape split naturally between moonlit night and radiant sunrise.",
    "mood": "Choice • Generosity • Contrast",
    "prompt": "Cinematic 8K masterpiece panoramic landscape capturing the natural divide between starry night shadows on one mountain side and radiant golden morning sunlight illuminating a calm lake and green valley on the other, moral choice, generosity and balance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 93,
    "name": "Ad-Duha",
    "ayat": "93:1–11",
    "core": "காலை ஒளி, இறைவனின் அருள், அனாதை மற்றும் ஏழைகளுக்கு கருணை.",
    "visual": "soft golden dawn over a peaceful valley, gradually illuminating a once-shadowed landscape.",
    "mood": "Hope • Comfort • Mercy",
    "prompt": "Cinematic 8K masterpiece landscape of soft comforting morning brightness (Ad-Duha) spreading gently over a peaceful garden courtyard filled with blossoming olive trees, jasmine, and calm reflecting pools, divine consolation, hope and mercy, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 94,
    "name": "Ash-Sharh",
    "ayat": "94:5–8",
    "core": "கஷ்டத்துடன் இலகுவும் உள்ளது.",
    "visual": "narrow dark mountain canyon opening dramatically into a vast sunlit valley.",
    "mood": "Relief • Hope • Perseverance",
    "prompt": "Cinematic 8K masterpiece landscape of a narrow shadowed mountain canyon opening dramatically into an expansive sunlit valley flooded with warm golden light and green meadows, ease after hardship, relief and perseverance, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 95,
    "name": "At-Tin",
    "ayat": "95:1–8",
    "core": "அத்தி, ஒலிவ் மற்றும் மனிதனின் சிறந்த படைப்பு.",
    "visual": "ancient Mediterranean-style olive and fig groves beneath warm golden sunlight and distant mountains.",
    "mood": "Beauty • Creation • Dignity",
    "prompt": "Cinematic 8K masterpiece landscape of an ancient orchard of fruiting fig and olive trees in a tranquil rocky valley with the sacred rugged silhouette of Mount Sinai bathed in golden sunrise light, timeless beauty, creation and human dignity, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 96,
    "name": "Al-Alaq",
    "ayat": "96:1–5",
    "core": "படைத்த இறைவன்; அறிவும் எழுத்தும்.",
    "visual": "dawn light entering a quiet natural landscape, with abstract symbolic ink-like flowing patterns avoided as literal text; focus on light and creation.",
    "mood": "Knowledge • Revelation • Awakening",
    "prompt": "Cinematic 8K masterpiece landscape of the sacred mountain summit of Jabal al-Nour and the threshold of Cave Hira at earliest dawn, a pure beam of celestial light illuminating the stone entrance overlooking the vast desert horizon, first revelation, knowledge and spiritual awakening, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 97,
    "name": "Al-Qadr",
    "ayat": "97:1–5",
    "core": "Laylat al-Qadr; அமைதி நிறைந்த இரவு.",
    "visual": "exceptionally serene star-filled night sky over a quiet desert landscape with soft descending rays of light.",
    "mood": "Peace • Blessing • Revelation",
    "prompt": "Cinematic 8K masterpiece nightscape of the Blessed Night (Laylat al-Qadr), filled with soft translucent celestial luminescence, gentle silver moonlight washing over ancient stone courtyards and calm date palms, profound aura of peace until the break of dawn, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 98,
    "name": "Al-Bayyinah",
    "ayat": "98:5",
    "core": "தூய்மையான வழிபாடு, தொழுகை மற்றும் zakah.",
    "visual": "pristine landscape centered around a simple illuminated architectural sanctuary, surrounded by calm dawn light.",
    "mood": "Sincerity • Purity • Devotion",
    "prompt": "Cinematic 8K masterpiece landscape of a pristine natural mountain sanctuary with a simple elegant stone pavilion surrounded by flowering olive trees and crystal-clear spring water under pure morning dawn light, sincere monotheism, purity and devotion, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 99,
    "name": "Az-Zalzalah",
    "ayat": "99:1–8",
    "core": "பூமி கடுமையாக அதிரும் நாள்; சிறிய நன்மையும் தீமையும் வெளிப்படும்.",
    "visual": "vast earth landscape with dramatic ground fissures and a transformed sky, without destruction gore.",
    "mood": "Judgment • Accountability • Awe",
    "prompt": "Cinematic 8K masterpiece dramatic landscape of a monumental geological canyon showing deep earth bedrock strata and dramatic storm clouds parting under celestial light, profound gravity of ultimate accountability and earth bearing witness, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 100,
    "name": "Al-Adiyat",
    "ayat": "100:1–11",
    "core": "வேகமான குதிரைகள் மற்றும் மனிதனின் நன்றியின்மை.",
    "visual": "powerful horses represented only as distant silhouettes running across a vast desert at dawn, dust illuminated by golden light.",
    "mood": "Power • Urgency • Reflection",
    "prompt": "Cinematic 8K masterpiece desert landscape at early dawn with dynamic swirling clouds of golden dust catching low morning sunbeams across sweeping sand ripples, momentum, morning vigor and reflection, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 101,
    "name": "Al-Qari’ah",
    "ayat": "101:1–11",
    "core": "பேரழிவு நாள்; மலைகள் சிதறுதல்; deeds weighed.",
    "visual": "monumental mountains dissolving into dust beneath an immense transformed sky.",
    "mood": "Judgment • Awe • Accountability",
    "prompt": "Cinematic 8K masterpiece dramatic landscape of towering granite mountain summits standing beneath a monumental cloud canopy with balanced directional sunbeams creating stark contrast of light and shadow, solemn majesty, the scales of deeds and accountability, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 102,
    "name": "At-Takathur",
    "ayat": "102:1–8",
    "core": "உலக செல்வத்தைப் பெருக்குவதில் மூழ்குதல் மற்றும் இறுதி கணக்கு.",
    "visual": "magnificent worldly city/wealth landscape fading into an empty desert horizon.",
    "mood": "Detachment • Reflection • Accountability",
    "prompt": "Cinematic 8K masterpiece contemplative landscape of ancient smoothed stone markers resting peacefully in a quiet desert valley under an expansive crimson and gold sunset sky, profound reflection on the transience of worldly wealth and the final accounting, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 103,
    "name": "Al-Asr",
    "ayat": "103:1–3",
    "core": "காலத்தின் மதிப்பு; ஈமான், நற்செயல், உண்மை, பொறுமை.",
    "visual": "dramatic sunset casting long shadows across a winding path, symbolizing passing time.",
    "mood": "Time • Truth • Patience",
    "prompt": "Cinematic 8K masterpiece landscape of an enduring stone pathway through a mountain valley during the golden hour of Asr (late afternoon), warm elongated shadows stretching across cobblestones toward illuminated peaks, preciousness of time, faith and patience, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 104,
    "name": "Al-Humazah",
    "ayat": "104:1–9",
    "core": "பிறரை இகழ்தல் மற்றும் செல்வத்தின் அகந்தை.",
    "visual": "isolated towering vault-like structure surrounded by darkness, with wealth-like objects fading into shadow; no people.",
    "mood": "Warning • Humility • Accountability",
    "prompt": "Cinematic 8K masterpiece landscape of ancient monumental stone pillars and weathered arches standing alone in a desert valley beneath a dramatic fiery crimson sunset sky, deep heavy shadows, warning against arrogance and injustice, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 105,
    "name": "Al-Fil",
    "ayat": "105:1–5",
    "core": "யானைப் படையின் அழிவு மற்றும் இறைவனின் பாதுகாப்பு.",
    "visual": "ancient sacred-city-inspired valley protected beneath dramatic sky; distant birds as natural silhouettes, no human figures.",
    "mood": "Protection • Power • Divine Intervention",
    "prompt": "Cinematic 8K masterpiece landscape of the ancient mountain pass guarding the sacred valley of Mecca, dramatic golden clouds gathering over towering rocky ramparts at sunset, historic divine protection and victory, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 106,
    "name": "Quraysh",
    "ayat": "106:1–4",
    "core": "பயணங்கள், பாதுகாப்பு மற்றும் உணவளித்தல்.",
    "visual": "ancient desert caravan route represented without people; mountains, palm oasis and safe illuminated pathway.",
    "mood": "Security • Provision • Gratitude",
    "prompt": "Cinematic 8K masterpiece landscape of a historic desert caravan pathway winding peacefully through sheltering sandstone cliffs under a star-filled twilight sky, safe resting oasis with warm glowing lantern light beside date palms, provision and security, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 107,
    "name": "Al-Ma’un",
    "ayat": "107:1–7",
    "core": "அனாதை மற்றும் ஏழைகளை புறக்கணிக்காதிருத்தல்; sincere worship.",
    "visual": "simple village water source and abundant shared food setting, emphasizing generosity without people.",
    "mood": "Compassion • Sincerity • Charity",
    "prompt": "Cinematic 8K masterpiece composition of an ancient stone well and overflowing fresh water basin in a tranquil shaded oasis garden with ripe pomegranates and olives in morning sunlight, small acts of kindness, sincerity and charity, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 108,
    "name": "Al-Kawthar",
    "ayat": "108:1–3",
    "core": "மிகுதியான நன்மை மற்றும் இறைவனுக்காக தொழுதல்.",
    "visual": "magnificent crystal-clear river flowing through an endless lush garden under radiant golden light.",
    "mood": "Abundance • Gratitude • Peace",
    "prompt": "Cinematic 8K masterpiece paradisiacal landscape of the heavenly river of Al-Kawthar with crystalline water whiter than milk and clearer than diamonds, flowing gently over banks of pearls and gold beneath radiant golden morning light, supreme abundance, gratitude and eternal joy, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 109,
    "name": "Al-Kafirun",
    "ayat": "109:1–6",
    "core": "வழிபாட்டில் தெளிவு மற்றும் தனித்துவம்.",
    "visual": "two distinct natural paths extending through a vast landscape without conflict, emphasizing clear separation.",
    "mood": "Conviction • Clarity • Principle",
    "prompt": "Cinematic 8K masterpiece landscape showing two distinct steadfast cobblestone pathways extending clearly through rugged mountain terrain under a crystal-clear blue sky, unwavering direction, uncompromising clarity and steadfast principle, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 110,
    "name": "An-Nasr",
    "ayat": "110:1–3",
    "core": "அல்லாஹ்வின் உதவி மற்றும் வெற்றி; புகழ்தல் மற்றும் மன்னிப்பு வேண்டுதல்.",
    "visual": "vast mountain valley opening into brilliant sunrise after a long period of darkness.",
    "mood": "Victory • Gratitude • Humility",
    "prompt": "Cinematic 8K masterpiece landscape of a vast mountain valley flooded with glorious triumphant golden morning light, dark storm clouds completely dispersing to reveal brilliant sky and flourishing green life, divine help, victory and grateful humility, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 111,
    "name": "Al-Masad",
    "ayat": "111:1–5",
    "core": "அகந்தை மற்றும் உண்மைக்கு எதிரான நிலைப்பாட்டின் முடிவு.",
    "visual": "rugged barren landscape with a collapsing ancient stone structure under intense sunset shadows.",
    "mood": "Warning • Consequence • Justice",
    "prompt": "Cinematic 8K masterpiece landscape of a dry rugged desert canyon with weathered rocky cliffs and sparse desert thorn bushes under an intense fiery crimson sunset sky, solemn warning against arrogance and injustice, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 112,
    "name": "Al-Ikhlas",
    "ayat": "112:1–4",
    "core": "அல்லாஹ்வின் ஒருமை; அவன் தனித்தவன், ஒப்பற்றவன்.",
    "visual": "minimalist vast cosmic landscape with a single radiant horizon and immense surrounding darkness; no symbolic human or religious objects.",
    "mood": "Unity • Majesty • Eternity",
    "prompt": "Cinematic 8K masterpiece minimalist landscape of a solitary monumental pure granite mountain peak rising into an infinite, flawless celestial sky of pure golden and indigo cosmic light, absolute majesty, purity, and eternal oneness (Tawhid), no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 113,
    "name": "Al-Falaq",
    "ayat": "113:1–5",
    "core": "விடியலின் இறைவனிடம் அனைத்து தீமைகளிலிருந்தும் பாதுகாப்பு.",
    "visual": "dark night landscape with the first brilliant rays of dawn breaking across mountains and dispelling darkness.",
    "mood": "Protection • Dawn • Hope",
    "prompt": "Cinematic 8K masterpiece landscape capturing the dramatic splitting of the dawn sky (Al-Falaq), first radiant golden rays driving away deep indigo night shadows and mist over coastal waters and mountains, divine refuge, light and hope, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  },
  {
    "surahNumber": 114,
    "name": "An-Nas",
    "ayat": "114:1–6",
    "core": "மனிதர்களின் இறைவனிடம், அரசனிடம், இறைவனிடம் பாதுகாப்பு தேடுதல்; hidden whispers-இலிருந்து பாதுகாப்பு.",
    "visual": "peaceful night landscape surrounded by darkness, with a clear luminous path and soft protective dawn-like glow emerging from the horizon.",
    "mood": "Protection • Peace • Certainty",
    "prompt": "Cinematic 8K masterpiece landscape of a serene sacred mountain sanctuary courtyard enclosed by noble stone arches, bathed in warm protective golden morning light and surrounded by calm date palms, safe refuge, supreme peace and certainty, no people, no text, no calligraphy, no logos",
    "negativePrompt": "people, human faces, religious figures, text, arabic calligraphy, words, letters, logos, UI elements, modern buildings"
  }
];

export function getSurahArtwork(surahNumber: number): SurahArtworkConcept | undefined {
  return QURAN_ARTWORK_CONCEPTS.find((s) => s.surahNumber === surahNumber);
}
