import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = path.resolve("public/images/quran");

export const SURAH_THEMES = [
  // 1-10
  { num: 1, name: "Al-Fatihah", prompt: "A luminous celestial beam of golden and emerald light descending into a sacred illuminated marble mihrab archway at dawn, symbolizing opening, guidance, and spiritual illumination. Elegant Islamic geometric composition, cinematic atmosphere, gold and deep emerald palette, no text, no people." },
  { num: 2, name: "Al-Baqarah", prompt: "An ancient illuminated Quran manuscript open upon a beautifully carved dark sandalwood rehal stand, glowing golden calligraphy aura, set within an emerald and gold scholar library chamber. Deep navy and gold tones, cinematic lighting, no text, no people." },
  { num: 3, name: "Aal-E-Imran", prompt: "A serene moonlit sanctuary courtyard surrounded by majestic date palms and an ornate stone pavilion, three warm glowing brass lanterns, tranquil reflecting pool, deep midnight navy and gold palette, no text, no people." },
  { num: 4, name: "An-Nisa", prompt: "Ornate scales of divine justice crafted of polished gold and crystal standing in an elegant palace colonnade, overlooking a tranquil courtyard pool at twilight, dignity, protection, emerald and gold palette, no text, no people." },
  { num: 5, name: "Al-Ma'idah", prompt: "A magnificent royal banquet table spread in an open arch pavilion at dusk, adorned with golden platters of fresh pomegranates, figs, dates, and crystal water decanters, warm candlelight, no text, no people." },
  { num: 6, name: "Al-An'am", prompt: "A peaceful fertile valley of gentle rolling green hills at golden sunset, delicate wildflowers, tranquil desert oasis stream, glowing amber clouds, symbolizing abundant creation and providence, no text, no people." },
  { num: 7, name: "Al-A'raf", prompt: "A towering majestic mountain ridge with an ancient carved stone gateway overlooking a glowing valley of dawn light below under a starry cosmic twilight sky, deep indigo and gold, no text, no people." },
  { num: 8, name: "Al-Anfal", prompt: "Intricately engraved Islamic geometric brass shields and archer bows mounted in a moonlit fortress hall with glowing braziers, symbolizing unity and strength, deep navy and burnished bronze, no text, no people." },
  { num: 9, name: "At-Tawbah", prompt: "A solitary quiet prayer alcove in an ancient stone mosque, a single hanging glass lantern casting warm golden rays onto a clean polished marble floor, symbolizing sincere repentance and stillness, no text, no people." },
  { num: 10, name: "Yunus", prompt: "Calm nocturnal ocean waves softly reflecting a brilliant crescent moon and starry night sky, a distant glowing lighthouse beacon on a rocky promontory, deep sapphire blue and silver, no text, no people." },

  // 11-20
  { num: 11, name: "Hud", prompt: "Majestic desert sand dunes during a dramatic sunset, where storm clouds part to reveal radiant golden sun rays illuminating ancient carved stone monuments, amber and terracotta, no text, no people." },
  { num: 12, name: "Yusuf", prompt: "A deep stone well in a moonlit desert oasis with a shaft of celestial golden light piercing down to crystal clear water at the bottom, surrounded by blooming desert lilies, midnight blue and gold, no text, no people." },
  { num: 13, name: "Ar-Ra'd", prompt: "Dramatic thunderclouds illuminated from within by golden divine light over serene mountain slopes, gentle rain falling on a lush blooming Islamic courtyard garden, teal and gold, no text, no people." },
  { num: 14, name: "Ibrahim", prompt: "A tranquil desert oasis with towering date palms and an ancient stone altar under a vast starry Arabian night sky, glowing embers in a stone hearth, deep indigo and warm amber, no text, no people." },
  { num: 15, name: "Al-Hijr", prompt: "Towering ancient sandstone canyon dwellings with intricate carved rock facades glowing in the warm golden light of late afternoon sun, majestic and timeless, ochre and deep shadow, no text, no people." },
  { num: 16, name: "An-Nahl", prompt: "A golden honeycomb with perfect crystalline hexagon geometry surrounded by blooming white jasmine and orange blossoms in an Andalusian garden courtyard, warm honey and emerald palette, no text, no people." },
  { num: 17, name: "Al-Isra", prompt: "A celestial cosmic pathway of luminous golden stars and crescent moon ascending through indigo clouds towards a majestic celestial dome in the heavens, mystical night journey, deep royal blue and gold, no text, no people." },
  { num: 18, name: "Al-Kahf", prompt: "A mystical tranquil cave entrance with soft golden sunlight streaming through hanging vines into a cavern with a clear emerald pool and glowing moss, serene sanctuary, deep forest green and gold, no text, no people." },
  { num: 19, name: "Maryam", prompt: "A solitary blooming white lily and date palm heavy with ripe fruit beside a pure desert spring at peaceful dawn, soft rose and golden light, purity and devotion, no text, no people." },
  { num: 20, name: "Ta-Ha", prompt: "Mount Sinai at twilight with a softly glowing, divine golden flame on the sacred mountain slope illuminating ancient stones without consuming the bush, deep twilight purple and warm gold, no text, no people." },

  // 21-30
  { num: 21, name: "Al-Anbiya", prompt: "A brilliant constellation of golden stars aligned in sacred geometric arcs across a deep midnight sky above an ancient stone observatory terrace, legacy of truth, sapphire and gold, no text, no people." },
  { num: 22, name: "Al-Hajj", prompt: "The Holy Kaaba draped in rich black silk with gold-embroidered Kiswah bands under a serene moonlit Mecca sky with soft lantern light, profound peace, obsidian and gold, no text, no people." },
  { num: 23, name: "Al-Mu'minun", prompt: "A high marble terrace with Islamic carved balustrades overlooking a serene ocean at sunrise, soft golden morning light, reflecting pool, tranquility and faith, pearl white and turquoise, no text, no people." },
  { num: 24, name: "An-Nur", prompt: "An ornate crystal glass lantern ('Misbah') hanging in an arched niche, radiating multifaceted pure golden light ('Light upon Light') across intricate geometric wall tiles, luminous emerald and gold, no text, no people." },
  { num: 25, name: "Al-Furqan", prompt: "A grand archway standing between golden dawn and deep starlit night, an ornate golden scale of discernment resting on a marble pedestal, balance and truth, navy and amber, no text, no people." },
  { num: 26, name: "Ash-Shu'ara", prompt: "A golden reed calligraphy pen and an illuminated parchment scroll resting beside an antique crystal inkwell on a carved rosewood desk in a moonlit study, deep emerald and mahogany, no text, no people." },
  { num: 27, name: "An-Naml", prompt: "A lush hidden green canyon valley with delicate waterfalls, vibrant moss, ferns, and golden sunbeams filtering through dense palm canopies, wonder of nature, vibrant emerald and gold, no text, no people." },
  { num: 28, name: "Al-Qasas", prompt: "Ancient leather-bound illuminated historical scrolls and manuscripts carefully stacked inside a carved cedar treasure chest beside a glowing oil lamp, deep amber and burgundy, no text, no people." },
  { num: 29, name: "Al-Ankabut", prompt: "An intricate geometric spiderweb glistening with morning dew drops catching rainbow sunbeams across an ornate stone carved window lattice, delicate fragility, silver and soft teal, no text, no people." },
  { num: 30, name: "Ar-Rum", prompt: "A grand classical stone arch with Islamic mosaic inlays overlooking a turquoise Mediterranean sea at glorious sunrise, symbol of victory and renewal, azure and warm gold, no text, no people." },

  // 31-40
  { num: 31, name: "Luqman", prompt: "An ancient majestic olive tree with shimmering silver-green leaves under a clear full moon, deep roots anchored in fertile earth, wisdom and patience, sage green and moonlight silver, no text, no people." },
  { num: 32, name: "As-Sajdah", prompt: "A finely woven traditional prayer rug laid on a gleaming white marble courtyard floor, reflecting a slender crescent moon through an arched portico, profound humility, midnight teal and gold, no text, no people." },
  { num: 33, name: "Al-Ahzab", prompt: "An ancient fortress wall and defensive trench illuminated by watchfire braziers under a dramatic starry desert night sky, unity and perseverance, charcoal and fiery amber, no text, no people." },
  { num: 34, name: "Saba", prompt: "The legendary stone dam and fertile terraced gardens of Marib with crystal clear water channels flowing through lush date palm groves at dawn, terracotta and emerald, no text, no people." },
  { num: 35, name: "Fatir", prompt: "Majestic heavenly clouds pierced by brilliant multi-directional golden light rays across a vast azure celestial sky, divine origin of creation, sky blue and golden radiance, no text, no people." },
  { num: 36, name: "Ya-Sin", prompt: "A glowing golden eight-pointed Islamic star rosette radiating intricate Arabesque mandala light patterns against a deep velvet emerald background, the heart of the Quran, emerald and gold, no text, no people." },
  { num: 37, name: "As-Saffat", prompt: "Ascending vertical shafts of pure crystalline light rising in perfect symmetrical ranks into the starry cosmic heavens, divine order, deep indigo and luminous white, no text, no people." },
  { num: 38, name: "Sad", prompt: "An antique carved bronze inkstand with calligraphy pens and a rolled illuminated scroll on a velvet cloth in an ancient sanctuary, deep lapis lazuli and bronze, no text, no people." },
  { num: 39, name: "Az-Zumar", prompt: "Magnificent golden celestial gates opening into a paradise courtyard with shining marble colonnades and flowing fountains of light, divine welcome, radiant gold and pearl, no text, no people." },
  { num: 40, name: "Ghafir", prompt: "Heavy iron chains broken and transforming into soft glowing golden particles on a clean marble temple floor, divine forgiveness and liberation, charcoal and radiant gold, no text, no people." },

  // 41-50
  { num: 41, name: "Fussilat", prompt: "Celestial orbits, rotating planetary spheres and geometric astrolabe coordinate rings mapped across a stunning deep space nebula, cosmic precision, indigo, violet and gold, no text, no people." },
  { num: 42, name: "Ash-Shura", prompt: "A circular council pavilion of carved sandalwood seating surrounding a tranquil central fountain of water under an illuminated dome, mutual counsel and harmony, teal and bronze, no text, no people." },
  { num: 43, name: "Az-Zukhruf", prompt: "An open royal treasure chest overflowing with exquisite Islamic gold filigree, lapis lazuli jewelry, and luminous pearls on a velvet dais, opulence versus eternal value, royal purple and gold, no text, no people." },
  { num: 44, name: "Ad-Dukhan", prompt: "Ethereal golden and violet twilight mist drifting over a majestic mountain ridge under a radiant starry crescent sky, mystical and contemplative, plum and soft amber, no text, no people." },
  { num: 45, name: "Al-Jathiyah", prompt: "A vast quiet marble courtyard reflecting arches under an expansive starlit dome of heaven, atmosphere of awe and reverence, obsidian and silver, no text, no people." },
  { num: 46, name: "Al-Ahqaf", prompt: "Sweeping wind-carved red and golden desert sand dunes of the Empty Quarter under a dramatic twilight sky with solitary desert stars, terracotta and deep azure, no text, no people." },
  { num: 47, name: "Muhammad", prompt: "A lush walled garden of damask roses, fragrant jasmine, and a bubbling fresh water spring under gentle morning sunshine, mercy and peace, vibrant rose, green and morning gold, no text, no people." },
  { num: 48, name: "Al-Fath", prompt: "Grand open city gates decorated with golden olive branches, looking out onto a peaceful city illuminated by the golden rays of victory at sunrise, warm gold and sky blue, no text, no people." },
  { num: 49, name: "Al-Hujurat", prompt: "A private peaceful courtyard with intricate wooden mashrabiya lattice screens and fragrant climbing jasmine, modesty and brotherhood, warm cedar and ivory, no text, no people." },
  { num: 50, name: "Qaf", prompt: "A colossal emerald mountain range ('Mount Qaf') towering at the edge of the world, touching a cosmic sky studded with nebulae and golden stars, majestic emerald and deep cosmos, no text, no people." },

  // 51-60
  { num: 51, name: "Adh-Dhariyat", prompt: "Graceful desert winds carving intricate wave ripples across golden sand dunes under a glorious blazing sunset, dynamic motion and divine power, fiery amber and gold, no text, no people." },
  { num: 52, name: "At-Tur", prompt: "The sacred Mount Sinai crowned with a halo of golden twilight clouds under a deep indigo sky, enduring steadfastness, granite gray and divine gold, no text, no people." },
  { num: 53, name: "An-Najm", prompt: "A brilliant shooting star streaking across a deep cosmic nebula of teal and purple with sparkling stardust, the descending star, celestial teal and diamond light, no text, no people." },
  { num: 54, name: "Al-Qamar", prompt: "A brilliant silver full moon illuminating calm nocturnal desert dunes under a velvet star-filled sky, divine sign and wonder, cool silver and midnight blue, no text, no people." },
  { num: 55, name: "Ar-Rahman", prompt: "Two majestic oceans of different shades meeting with a visible crystal barrier between them, flanked by lush shores of coral and pearls, divine beauty and gifts, turquoise, coral and gold, no text, no people." },
  { num: 56, name: "Al-Waqi'ah", prompt: "A visionary paradise garden with cascading crystal rivers, lush laden fruit trees, and serene shaded pavilions of light, emerald, gold and sapphire, no text, no people." },
  { num: 57, name: "Al-Hadid", prompt: "An ancient blacksmith's forge with a glowing iron blade on a stone anvil, glowing sparks flying in the dark, strength and craftsmanship, molten orange and steel gray, no text, no people." },
  { num: 58, name: "Al-Mujadila", prompt: "A quiet secluded alcove with draped silk curtains where soft light illuminates a peaceful prayer area, divine listening and solace, lavender, rose and warm light, no text, no people." },
  { num: 59, name: "Al-Hashr", prompt: "An ancient stone desert fortress surrounded by a grove of date palms under a dramatic golden twilight sky, unity and gathering, sandstone and twilight indigo, no text, no people." },
  { num: 60, name: "Al-Mumtahanah", prompt: "An open golden birdcage with a white dove soaring into a bright clear dawn sky, faith, trial and liberation, sky blue, gold and pure white, no text, no people." },

  // 61-70
  { num: 61, name: "As-Saff", prompt: "A pristine array of polished golden shields and ceremonial spears aligned in perfect symmetrical rows before an ancient marble citadel, discipline and unity, gold and polished stone, no text, no people." },
  { num: 62, name: "Al-Jumu'ah", prompt: "A grand sunlit mosque courtyard with rhythmic shadows cast by tall arched colonnades on a peaceful Friday morning, ivory marble and bright gold, no text, no people." },
  { num: 63, name: "Al-Munafiqun", prompt: "A carved stone pedestal holding a dual-toned mask of polished silver and dark obsidian beside a flickering oil lamp, contrast of truth and deceit, silver and shadow, no text, no people." },
  { num: 64, name: "At-Taghabun", prompt: "A celestial glowing balance scale where radiant deeds of crystal light outweigh heavy dark stones, ultimate gain and loss, sapphire and radiant light, no text, no people." },
  { num: 65, name: "At-Talaq", prompt: "An ornate stone bridge connecting two steep cliffs over a tranquil river at sunrise, symbol of new beginnings and lawful paths, morning mist and golden light, no text, no people." },
  { num: 66, name: "At-Tahrim", prompt: "A clay bowl of golden honey and a platter of fresh ripe figs and pomegranates resting on a rustic wooden table in a sunlit garden kitchen, warm ochre and green, no text, no people." },
  { num: 67, name: "Al-Mulk", prompt: "A radiant celestial golden crown floating above the curvature of the earth surrounded by orbital star rings and constellations, cosmic dominion and sovereignty, royal blue and brilliant gold, no text, no people." },
  { num: 68, name: "Al-Qalam", prompt: "A magnificent golden celestial reed pen writing a luminous ribbon of light across an open heavenly parchment tablet, the sacred pen and written word, deep midnight navy and glowing gold, no text, no people." },
  { num: 69, name: "Al-Haqqah", prompt: "A grand ceremonial golden trumpet resting on a marble cloud dais against a cosmic sky of aurora and stars, the inevitable reality, indigo, crimson and gold, no text, no people." },
  { num: 70, name: "Al-Ma'arij", prompt: "A spiraling celestial staircase of pure crystal and golden light ascending endlessly into the starry heavens, the ascending ways, celestial cyan and gold, no text, no people." },

  // 71-80
  { num: 71, name: "Nuh", prompt: "A majestic wooden ark sailing upon calm moonlit waters under a clear starry sky following the great rain, hope and salvation, deep sea blue and moonlight, no text, no people." },
  { num: 72, name: "Al-Jinn", prompt: "Wisps of ethereal golden and emerald smokeless flame swirling gracefully in the night air above ancient desert ruins under a starry sky, mystical and unseen, deep teal and amber, no text, no people." },
  { num: 73, name: "Al-Muzzammil", prompt: "A soft woollen cloak folded neatly upon a traditional prayer rug beside a glowing brass oil lamp in the stillness of deep night, nightly devotion, warm amber and dark navy, no text, no people." },
  { num: 74, name: "Al-Muddaththir", prompt: "A glorious sunrise breaking over a mountain peak, awakening the slumbering desert valley with brilliant golden light, call to rise and warn, sunrise crimson and gold, no text, no people." },
  { num: 75, name: "Al-Qiyamah", prompt: "Fresh green sprouts and delicate vibrant blossoms emerging from dry cracked desert earth into brilliant morning sunshine, resurrection and rebirth, earth brown, vivid green and golden light, no text, no people." },
  { num: 76, name: "Al-Insan", prompt: "A delicate silver chalice filled with crystal water and a sprig of fresh ginger beside a bowl of white camphor in a heavenly marble pavilion, silver, turquoise and white, no text, no people." },
  { num: 77, name: "Al-Mursalat", prompt: "Gentle winds carrying radiant pastel clouds across an emerald-tinted twilight sky above peaceful mountain crests, sent forth in succession, seafoam green and lavender, no text, no people." },
  { num: 78, name: "An-Naba", prompt: "A colossal mountain peak firmly anchored as a great stake into the earth, rising into a vast starry celestial sphere, grandeur of creation, granite gray and cosmic blue, no text, no people." },
  { num: 79, name: "An-Nazi'at", prompt: "Celestial comets and glowing meteors tracing brilliant arcs of light through the dark velvet cosmic ocean, celestial forces, midnight blue and gold stardust, no text, no people." },
  { num: 80, name: "Abasa", prompt: "A bountiful garden overflowing with clusters of purple grapes, dark olives, sweet dates, and lush green leaves under refreshing rain clouds, rich earth, emerald and violet, no text, no people." },

  // 81-90
  { num: 81, name: "At-Takwir", prompt: "The sun surrounded by a dramatic corona of golden light against a swirling velvet galaxy of distant stars, celestial transformation, cosmic gold and obsidian, no text, no people." },
  { num: 82, name: "Al-Infitar", prompt: "The celestial vault of heaven parting to reveal luminous layers of cosmic nebulae and radiant starlight, turquoise, violet and gold, no text, no people." },
  { num: 83, name: "Al-Mutaffifin", prompt: "A set of precision brass balance weights and an engraved measuring bowl sitting on a polished walnut table, honest measure and justice, warm walnut and polished brass, no text, no people." },
  { num: 84, name: "Al-Inshiqaq", prompt: "A heavenly portal of soft golden light opening in a tranquil starry evening sky over peaceful desert dunes, serene and awe-inspiring, twilight blue and gold, no text, no people." },
  { num: 85, name: "Al-Buruj", prompt: "The twelve constellations of the celestial zodiac mapped in glowing golden geometric lines on an antique brass astrolabe against a dark starry sky, sapphire and gold, no text, no people." },
  { num: 86, name: "At-Tariq", prompt: "A solitary, piercingly bright white star pulsating with sharp rays of light against the deep black abyss of space, the piercing night comer, pure diamond white and obsidian, no text, no people." },
  { num: 87, name: "Al-A'la", prompt: "A majestic mountain summit bathed in transcendent morning sunlight rising high above a sea of soft white clouds, glorification of the Most High, celestial gold and cloud white, no text, no people." },
  { num: 88, name: "Al-Ghashiyah", prompt: "A tranquil desert oasis with a bubbling freshwater spring and sheltering shade trees beneath a calm amber sunset, peace and paradise, emerald and warm sunset, no text, no people." },
  { num: 89, name: "Al-Fajr", prompt: "The first crisp crimson and golden rays of dawn breaking over ten sacred desert mountain ridges, dawn of renewal, crimson, coral and morning gold, no text, no people." },
  { num: 90, name: "Al-Balad", prompt: "The sacred valley of ancient Mecca with rugged mountains surrounding the city under a serene crescent moon and stars, sacred city and perseverance, sandstone, charcoal and starlight, no text, no people." },

  // 91-100
  { num: 91, name: "Ash-Shams", prompt: "A glorious brilliant golden sun rising at the desert horizon, casting long warm golden rays across pristine undulating sand dunes, radiance and light, golden yellow and warm terracotta, no text, no people." },
  { num: 92, name: "Al-Layl", prompt: "A deep velvet indigo night sky filled with millions of glittering stars framing the dark silhouette of a graceful desert acacia tree, night and contemplation, deep indigo and starlight silver, no text, no people." },
  { num: 93, name: "Ad-Duha", prompt: "Warm comforting morning sunlight pouring through an open carved archway into a peaceful room, dispelling all shadows, solace and brightness, amber, ivory and warm light, no text, no people." },
  { num: 94, name: "Ash-Sharh", prompt: "An open geometric lotus rosette of light unfurling its petals to reveal a glowing golden jewel inside, expansion of the breast and relief, soft rose, white and gold, no text, no people." },
  { num: 95, name: "At-Tin", prompt: "A freshly picked branch with green figs and ripe black olives resting on a white marble slab with Mount Sinai in the background, sacred symbols, olive green, deep purple and marble white, no text, no people." },
  { num: 96, name: "Al-Alaq", prompt: "An ancient illuminated parchment manuscript resting in the peaceful secluded Cave of Hira, glowing with the first light of revelation, sacred study, deep stone gray and golden aura, no text, no people." },
  { num: 97, name: "Al-Qadr", prompt: "The Night of Power ('Laylatul Qadr') with shafts of serene golden celestial light descending from a brilliant full moon through soft night clouds to a peaceful sanctuary, royal navy and pure divine gold, no text, no people." },
  { num: 98, name: "Al-Bayyinah", prompt: "An open illuminated book of scripture radiating pure clear white light from a stone pedestal in an ancient library, clear evidence and purity, deep mahogany and brilliant light, no text, no people." },
  { num: 99, name: "Az-Zalzalah", prompt: "A split geode rock in the earth revealing sparkling crystalline golden veins and hidden precious gemstones inside, the earth yielding its burdens, earth brown and sparkling crystal gold, no text, no people." },
  { num: 100, name: "Al-Adiyat", prompt: "Sparks of golden light struck from galloping horseshoes in the dust of dawn under a dramatic sunrise sky, swiftness and energy, fiery orange and dusty ochre, no text, no people." },

  // 101-114
  { num: 101, name: "Al-Qari'ah", prompt: "A majestic golden balance scale in a cosmic hall weighing glowing orbs of light against dark stones, the striking hour of accountability, cosmic blue and glowing gold, no text, no people." },
  { num: 102, name: "At-Takathur", prompt: "An antique carved wooden chest overflowing with ancient coins half-covered by shifting desert sand beneath a quiet moon, worldly competition, sand gold and weathered wood, no text, no people." },
  { num: 103, name: "Al-Asr", prompt: "An exquisite antique brass hourglass with glowing golden sand grains flowing down beside a classical sundial in late afternoon sun, the value of time, warm brass and late-afternoon shadow, no text, no people." },
  { num: 104, name: "Al-Humazah", prompt: "A heavy iron fortress door with reinforced brass locks standing firm against a dark turbulent storm outside, protected sanctuary, charcoal iron and warm interior glow, no text, no people." },
  { num: 105, name: "Al-Fil", prompt: "A flock of small divine birds ('Ababil') soaring through a dramatic desert sky carrying small glowing stones over a vast arid valley, divine protection, twilight sky and glowing amber, no text, no people." },
  { num: 106, name: "Quraysh", prompt: "A merchant camel caravan traveling peacefully across moonlit sand dunes under a clear desert navigation sky with the North Star shining brightly, quiet desert and starlight, silver-blue and sand, no text, no people." },
  { num: 107, name: "Al-Ma'un", prompt: "A rustic earthenware bowl of warm soup and fresh bread sitting on a stone window sill with an open door welcoming a traveler, neighborly kindness and charity, terracotta and warm hearth glow, no text, no people." },
  { num: 108, name: "Al-Kawthar", prompt: "The celestial heavenly river of Al-Kawthar with water purer than crystal flowing over pebbles of pearls, rubies and emeralds beneath blooming paradise trees, turquoise, pearl and ruby, no text, no people." },
  { num: 109, name: "Al-Kafirun", prompt: "Two clear, distinct stone pathways diverging at a crossroads in the desert under a vast starlit sky, distinct ways and clarity of faith, slate gray, desert sand and starlight, no text, no people." },
  { num: 110, name: "An-Nasr", prompt: "Pure white victory banners fluttering gracefully in a gentle morning breeze above an ancient stone city bathed in golden sunrise light, divine victory and peace, morning gold and ivory, no text, no people." },
  { num: 111, name: "Al-Masad", prompt: "A strong coil of twisted natural palm fiber rope resting beside the textured trunk of a date palm in the desert sun, coarse fibers and palm wood, ochre and desert sunlight, no text, no people." },
  { num: 112, name: "Al-Ikhlas", prompt: "A radiant, pure eight-pointed golden Islamic star geometry emanating concentric rings of flawless white-gold light in a deep cosmic space, absolute unity and purity, deep obsidian and pure radiant gold, no text, no people." },
  { num: 113, name: "Al-Falaq", prompt: "The brilliant golden and violet light of dawn cleaving sharply through the darkness of night over calm coastal waters, the daybreak, dawn violet, coral and bright gold, no text, no people." },
  { num: 114, name: "An-Nas", prompt: "A serene protective sanctuary of warm golden light and ornate carved arches shielding against dark outer shadows of the night, sanctuary of mankind and refuge, deep emerald, navy and protective warm gold, no text, no people." }
];

function pollinationsUrl(prompt, seed) {
  const base = "https://image.pollinations.ai/prompt/";
  const params = `?width=1920&height=1080&seed=${seed}&nologo=true&enhance=true`;
  return base + encodeURIComponent(prompt) + params;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchImage(url, tries = 3) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 60000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) throw new Error("image too small");
      return buf;
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(2000 * attempt);
    }
  }
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Generating ${SURAH_THEMES.length} ultra high-definition 4K 16:9 Surah wallpapers...`);

  let count = 0;
  for (const item of SURAH_THEMES) {
    const file = path.join(OUT_DIR, `surah-${item.num}.jpg`);
    const prompt = `4k ultra high resolution cinematic Islamic wallpaper, Holy Quran Surah ${item.num} (${item.name}): ${item.prompt} Dark emerald, deep navy, warm amber and gold Huda palette, photorealistic, 8k wallpaper, masterpiece, cinematic lighting, wide angle landscape 16:9, sharp focus, crystal clear, no text, no letters, no people, no faces, high resolution.`;
    const url = pollinationsUrl(prompt, item.num * 313 + 77);

    try {
      console.log(`[${item.num}/114] Generating 4K artwork for Surah ${item.num} — ${item.name}...`);
      const buf = await fetchImage(url);
      await writeFile(file, buf);
      count++;
      console.log(`  ✅ Surah ${item.num} saved (${Math.round(buf.length / 1024)} KB)`);
      await sleep(1200);
    } catch (e) {
      console.error(`  ❌ Failed for Surah ${item.num}:`, e.message);
    }
  }

  console.log(`\n🎉 Complete! Generated ${count} 4K 16:9 Surah wallpapers.`);
}

run().catch(console.error);
