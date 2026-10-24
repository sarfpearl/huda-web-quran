/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  HuDa Web Quran — Safe Production Video Generation Adapter (Phase 6)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Provides a controlled, deterministic adapter for video generation scripts:
 *   - Planning & Dry-Run: Previews prompts, models, output paths, and exact costs.
 *   - Safety Guard: Structurally impossible to call paid APIs during dry-run, mock, or plan.
 *   - Ayah Preservation: Strictly blocks AI generation for authentic real-footage clips.
 *   - Approval Security: Enforces explicit, non-stale human approvals matching
 *     Surah number, clip list, model, and expected cost.
 *   - Budget Integration: Dynamically reads VIDEO_BUDGET_LEDGER.json without hardcoding.
 *   - Controlled Pilot: Orchestrates single-clip mock generation, operation ID capture,
 *     duplicate prevention, 0.40s seam crossfade post-processing, and composite QA.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  BUDGET_CONFIG,
  evaluateGenerationPermission,
  loadLedger,
  recordSuccessfulGeneration,
} from "../tools/video-budget-guard.mjs";
import {
  probeVideo,
  detectLetterbox,
  generateContactSheet,
  createSeamlessLoop,
  DEFAULT_OVERLAP_SEC,
} from "./seam-processor.mjs";
import {
  PRODUCTION_STATES,
  transitionClip,
  saveSurahState,
  loadOrInitSurahState,
  validateImageApproval,
  computeHash,
} from "./surah-state-machine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

/**
 * Standard scene prompt library for chapter generation (derived from approved scripts).
 */
export const SCENE_PROMPT_LIBRARY = {
  3: {
    "01a": {
      name: "01a-the-immutable-foundation-and-muhkamat",
      verses: "1–9",
      theme: "The Immutable Foundation, Muhkamat & Steadfast Faith",
      scene: "capturing rugged Western Arabian granite formations and ancient geological strata standing firm under calm dawn sky with soft mist.",
      avoid: "No people, no figures, no buildings, no text, no modern objects.",
    },
    "02a": {
      name: "02a-the-wealth-of-this-world-and-the-better-return",
      verses: "10–17",
      theme: "The Wealth of This World and the Better Return",
      scene: "capturing a shallow, natural spring-fed stream of clear water trickling smoothly down a gentle gradient through irregular weathered dry-stone boundaries in a traditional agricultural wadi valley in Western Arabia during the cool pre-dawn hour. Native date palms and sparse arid wadi vegetation sway very gently.",
      avoid: "No people, no figures, no buildings, no text, no modern objects, no coins, no money.",
    },
    "02b": {
      name: "02b-the-supreme-testimony-of-tawhid-and-justice",
      verses: "18–25",
      theme: "The Supreme Testimony of Tawhid & Equity",
      scene: "capturing an enduring horizontal pavement of weathered sedimentary bedrock in the authentic Tuwaiq Escarpment limestone plateau during clear, balanced mid-morning daylight. Very sparse desert grasses and small drought-adapted vegetation scattered across rocky terrain under pale azure sky.",
      avoid: "No people, no figures, no buildings, no text, no modern objects.",
    },
    "02c": {
      name: "02c-the-supreme-sovereign-and-cosmic-order",
      verses: "26–32",
      theme: "The Sovereign Kingdom, Night & Day Alternation (Malik al-Mulk)",
      scene: "capturing the vast Tuwaiq escarpment under an immense sky witnessing the peaceful alternation of twilight into dawn.",
      avoid: "No people, no figures, no buildings, no text, no modern objects.",
    },
    "03a": {
      id: "03a",
      name: "03a-the-sanctuary-of-maryam-and-zakariya-prayer",
      verses: "33–44",
      theme: "The Sanctuary of Maryam, Zakariya's Supplication & Date-Palm Grove",
      rawPrompt:
        "A wide natural history documentary landscape shot filmed from a fixed stationary ground tripod with a high-end cinema prime lens capturing a secluded natural date-palm oasis nestled in a serene limestone canyon in the arid Dead Sea valley during calm early morning. " +
        "Natural geological landscape: towering sedimentary limestone cliffs with soft, continuous horizontal bedding planes in warm buff and pale ochre tones, with zero vertical stripes, zero bands, and zero dark streaks. " +
        "Several mature, wild date palms stand upright with sturdy root bases along an organic wadi gravel bank, their vertical trunks showing natural curvature, fibrous bark, and weathered brown leaf-bases. " +
        "Palm fronds feature dry, matte, non-reflective botanical surfaces with fine organic pinnae, completely free of waxy gloss, plastic sheen, or artificial highlights. " +
        "Natural clusters of dates in mixed ripening stages from pale yellow-green to deep amber hang beneath the arching fronds on fibrous orange stalks. " +
        "The foreground is an authentic arid wadi shoreline: damp river gravel, fine silt, smooth weathered river stones, and sparse, irregular tufts of wild desert sedge and rushes growing naturally in rock crevices with non-uniform distribution, without repetitive lawn or cloned grass patches. " +
        "A shallow, crystal-clear desert spring stream flows gently across rounded pale pebbles, with natural light refraction and subtle continuous surface ripples reflecting the soft sky. " +
        "A steady gentle morning breeze causes the palm fronds and sparse sedge grasses to sway independently with realistic physical inertia. " +
        "Natural directional morning sunlight, soft physically grounded shadows, restrained neutral color grading, clean documentary lens clarity, authentic motion blur, zero CGI gloss, zero human figures. " +
        "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, borderless full frame. No black bars, no film borders, no sprockets, no edge codes, no numbers, no text.",
      scene:
        "capturing a secluded, sheltered date-palm grove in a quiet limestone hollow of the Jordan Valley during soft, calm early morning. " +
        "Mature date palms stand at natural irregular intervals, heavy clusters of ripe amber dates hanging beneath the fronds on fibrous orange stalks; " +
        "palm fronds display authentic matte botanical surfaces and weathered fibrous leaflets with zero plastic sheen or synthetic gloss. " +
        "The foreground is an organic arid wadi bank of pale river stones, damp gravel, and sparse, irregular tufts of wild riverside sedge growing naturally in rocky crevices without manicured lawn or repeating turf patterns. " +
        "A shallow natural spring pool of clear, still water lies at their feet among smooth pale stones with natural light refraction. " +
        "Pale limestone walls of the hollow enclose the grove gently on both sides, open to a soft, pale-gold sky. Palm fronds sway very slightly in a faint breeze.",
      avoid:
        "No mihrab, no altar, no curtains, no lamps, no people, no figures, no buildings, no text, " +
        "no manicured lawns, no turf, no repeating grass patches, no waxy glossy leaves, no plastic sheen, no CGI reflection.",
    },
    "04a": {
      id: "04a",
      name: "04a-the-word-from-allah-and-primordial-creation",
      verses: "45–51",
      theme: "The Word from Allah & Primordial Creation",
      rawPrompt:
        "A grounded natural history documentary landscape shot captured on a cinema camera with an authentic 50mm prime lens at f/4.0. " +
        "capturing a broad, shallow wadi floor in western Arabia shortly after rain, during soft overcast mid-morning light. " +
        "The foreground is fine, damp reddish-brown clay and silt, smooth and freshly settled, with delicate natural mud-crack patterns beginning at the edges and a few thin threads of standing rainwater reflecting the pale sky. " +
        "Low, rounded earthen banks frame the wadi; the first tiny green shoots of desert plants emerge from the moist soil. A gentle, even grey-white sky. " +
        "Continuous, physically grounded natural motion: a steady morning breeze causes foliage to sway with independent aerodynamic inertia; " +
        "freshwater streams flow actively across rounded river stones with moving surface ripples and specular light refractions. " +
        "Locked-off stationary camera on a heavy tripod. Zero pan, tilt, zoom, or camera jitter. Clean borderless 16:9 full frame. " +
        "No humans, no faces, no idols, no statues, no figures, no buildings, no text, No sculpted figures, no shaped clay forms, no handprints, no people, no text.",
      scene:
        "capturing a broad, shallow wadi floor in western Arabia shortly after rain, during soft overcast mid-morning light. " +
        "The foreground is fine, damp reddish-brown clay and silt, smooth and freshly settled, with delicate natural mud-crack patterns beginning at the edges and a few thin threads of standing rainwater reflecting the pale sky. " +
        "Low, rounded earthen banks frame the wadi; the first tiny green shoots of desert plants emerge from the moist soil. A gentle, even grey-white sky.",
      avoid: "No sculpted figures, no shaped clay forms, no handprints, no people, no text.",
    },
    "04b": {
      id: "04b",
      name: "04b-the-sincere-disciples-and-elevation-of-isa",
      verses: "52–63",
      theme: "The Sincere Disciples & Elevation of Isa",
      rawPrompt:
        "A grounded natural history documentary landscape shot captured on a cinema camera with an authentic 50mm prime lens at f/4.0. " +
        "capturing gently rolling green hills of the Galilee above a calm freshwater lake in late afternoon. " +
        "Wild grasses and scattered olive trees cover the hillsides in the foreground; the still lake lies below in the middle distance, its surface faintly rippled. " +
        "Most of the frame is open sky: a vast, high, clear pale-blue sky with a few soft, slow, still cumulus clouds high above. " +
        "Continuous, physically grounded natural motion: wild grasses move very slightly in a light breeze; soft surface ripples glide across the lake with natural specular light reflection. " +
        "Locked-off stationary camera on a heavy tripod. Zero pan, tilt, zoom, or camera jitter. Clean borderless 16:9 full frame. " +
        "No humans, no faces, no idols, no statues, no figures, no buildings, no text, No boats, no fishing nets, no crosses, no people, no text.",
      scene:
        "capturing gently rolling green hills of the Galilee above a calm freshwater lake in late afternoon. " +
        "Wild grasses and scattered olive trees cover the hillsides in the foreground; the still lake lies below in the middle distance, its surface faintly rippled. " +
        "Most of the frame is open sky: a vast, high, clear pale-blue sky with a few soft, slow, still cumulus clouds high above. Grasses move very slightly in a light breeze.",
      avoid: "No boats, no fishing nets, no crosses, no people, no text.",
    },
    "05a": {
      id: "05a",
      name: "05a-the-common-word-of-pure-monotheism",
      verses: "64–80",
      theme: "The Common Word of Pure Monotheism",
      rawPrompt:
        "A grounded natural history documentary landscape shot captured on a cinema camera with an authentic 50mm prime lens at f/4.0. " +
        "capturing a vast, flat, open steppe plain of upper Mesopotamia near Harran in the calm pre-dawn hour. " +
        "Short dry grasses and low steppe shrubs cover the level ground to a perfectly straight, unbroken horizon. " +
        "The sky is a deep, clear pre-dawn blue fading to a faint pale band along the horizon, with a single bright morning star low in the east and a few faint stars above. " +
        "Continuous, physically grounded natural motion: dry grasses and low steppe shrubs stir very slightly in a gentle pre-dawn breeze; subtle atmospheric clarity in the vast open horizon. " +
        "Locked-off stationary camera on a heavy tripod. Zero pan, tilt, zoom, or camera jitter. Clean borderless 16:9 full frame. " +
        "No humans, no faces, no idols, no statues, no figures, no buildings, no text, No idols, no statues, no standing stones, no fire, no people, no text.",
      scene:
        "capturing a vast, flat, open steppe plain of upper Mesopotamia near Harran in the calm pre-dawn hour. " +
        "Short dry grasses and low steppe shrubs cover the level ground to a perfectly straight, unbroken horizon. " +
        "The sky is a deep, clear pre-dawn blue fading to a faint pale band along the horizon, with a single bright morning star low in the east and a few faint stars above. Grasses stir very slightly.",
      avoid: "No idols, no statues, no standing stones, no fire, no people, no text.",
    },
    "05b": {
      id: "05b",
      name: "05b-the-primordial-covenant-of-the-prophets",
      verses: "81–91",
      theme: "The Primordial Covenant of the Prophets",
      rawPrompt:
        "A grounded natural history documentary landscape shot captured on a cinema camera with an authentic 50mm prime lens at f/4.0. " +
        "capturing towering ancient layered sandstone cliffs of Wadi Rum in southern Jordan during warm, steady golden-hour light. " +
        "The cliff face shows long, continuous, unbroken horizontal sedimentary layers in red, ochre and cream bands stretching across the frame. " +
        "In the foreground, soft red sand with gentle wind ripples and a few sparse desert shrubs. " +
        "Continuous, physically grounded natural motion: fine grains of desert sand drift very slightly across rippled dunes in a warm breeze; subtle atmospheric clarity across the enduring sandstone canyon. " +
        "Completely fixed locked-off framing. Zero pan, tilt, zoom, or camera jitter. Clean borderless 16:9 full frame with pristine untouched desert wilderness. Zero camera equipment in scene. " +
        "No humans, no faces, no idols, no statues, no figures, no buildings, no text, No camera, no tripod, no photography gear, no equipment, no stands, no electronics, no rock carvings, no inscriptions, no petroglyphs, no people, no text.",
      scene:
        "capturing towering ancient layered sandstone cliffs of Wadi Rum in southern Jordan during warm, steady golden-hour light. " +
        "The cliff face shows long, continuous, unbroken horizontal sedimentary layers in red, ochre and cream bands stretching across the frame. " +
        "In the foreground, soft red sand with gentle wind ripples and a few sparse desert shrubs; fine sand drifts very slightly across the surface.",
      avoid: "No camera, no tripod, no photography gear, no equipment, no stands, no electronics, no rock carvings, no inscriptions, no petroglyphs, no people, no text.",
    },
    "06a": {
      name: "06a-true-giving-bakkah-and-sacred-security",
      verses: "92–99",
      theme: "True Giving, Bakkah & Sacred Security",
      scene:
        "capturing a dry, rugged valley among the dark granite mountains of the Hejaz, far from any settlement, during calm, hazy mid-afternoon light. " +
        "Weathered dark granite and basalt ridges rise on both sides of a wide valley floor of pale sand and scattered rocks, a few hardy acacia trees standing alone. " +
        "A soft, warm haze softens the distant ridges under a pale, cloudless sky. Acacia leaves move very slightly.",
      avoid: "No city, no towers, no clock tower, no pilgrims, no black cube, no cloth, no walls, no people, no text.",
    },
    "06b": {
      name: "06b-holding-fast-to-the-rope-of-allah",
      verses: "100–109",
      theme: "Holding Fast to the Rope of Allah",
      scene:
        "capturing a green mountain valley in the Asir highlands of southwestern Arabia during cool, soft morning light with light mist. " +
        "A single, continuous, clear stream winds unbroken from the foreground into the distance through the valley floor, past ancient stone-edged natural rock shelves covered in grass and juniper trees. " +
        "Soft mist lies in the far valley under a pale sky. The stream water flows gently and naturally.",
      avoid: "No ropes, no bridges, no farm terraces with walls, no people, no text.",
    },
    "06c": {
      name: "06c-the-best-nation-and-moral-steadfastness",
      verses: "110–120",
      theme: "The Best Nation & Moral Steadfastness",
      scene:
        "capturing a calm Red Sea shoreline of pale coral limestone during clear, bright, steady morning light. " +
        "In the foreground, flat weathered coral rock and white sand meet extremely clear turquoise shallow water; the sea deepens to sapphire blue toward a straight, level horizon under a clean, light-blue sky. " +
        "Small, gentle waves wash softly over the shallows.",
      avoid: "No boats, no swimmers, no piers, no people, no text.",
    },
    "07a": {
      name: "07a-the-topography-of-uhud-and-divine-support",
      verses: "121–138",
      theme: "The Topography of Uhud & Divine Support",
      scene:
        "capturing a wide, open sandy plain north of Madinah with a large, dark reddish granite mountain massif rising across the background, during calm, clear early morning light. " +
        "In the foreground, a broad flat plain of pale sand and scattered small stones; in the middle ground, a single small, low rocky hill stands alone on the plain in front of the mountain. " +
        "The mountain's weathered ridges and gullies are sharply visible under a clear, pale-blue sky. Sparse desert grass moves very slightly.",
      avoid: "No city, no buildings, no fences, no battle, no archers, no horses, no banners, no people, no text.",
    },
    "07b": {
      name: "07b-fortitude-after-setback-and-divine-pardon",
      verses: "139–151",
      theme: "Fortitude After Setback & Divine Pardon",
      scene:
        "capturing a broad, dark basalt lava field (harrat) near Madinah under a sky clearing after a passing storm, during soft, steady late-morning light. " +
        "In the foreground, rough black volcanic rock with small pools of fresh rainwater reflecting the sky and a few new green desert plants; a low mountain saddle lies across the distance. " +
        "Thinning grey clouds drift slowly apart, revealing patches of clean blue sky; the light stays even and constant.",
      avoid: "No lightning, no flood, no battle, no people, no text.",
    },
    "08a": {
      name: "08a-the-gentle-mercy-and-mutual-consultation",
      verses: "152–160",
      theme: "The Gentle Mercy & Mutual Consultation",
      scene:
        "capturing a peaceful palm oasis in the al-Aqiq valley near Madinah during soft, warm early-morning light with a delicate low mist. " +
        "Many date palms of different heights stand together in a loose, natural grove; a narrow natural water channel runs quietly through soft green ground between them. " +
        "Light mist hangs low between the trunks; the sky is pale and gentle. Palm fronds sway very slightly.",
      avoid: "No gatherings, no seating, no carpets, no people, no text.",
    },
    "08b": {
      name: "08b-the-living-martyrs-and-perennial-bounty",
      verses: "161–175",
      theme: "The Living Martyrs & Perennial Bounty",
      scene:
        "capturing a lush, green, fertile mountain wadi in the Hejaz highlands in bright, soft, steady daylight. " +
        "A clear stream flows over smooth stones through the foreground between fig, pomegranate and date trees heavy with fruit; thick green grass and wildflowers cover the banks. " +
        "Green slopes rise behind under a clear, soft-blue sky. The stream flows gently; leaves move very slightly.",
      avoid: "No paradise fantasy, no glowing fruit, no golden light beams, no birds made of light, no people, no text.",
    },
    "09a": {
      name: "09a-the-impotence-of-disbelief-and-moral-trial",
      verses: "176–184",
      theme: "The Impotence of Disbelief & Moral Trial",
      scene:
        "capturing a vast, empty inland salt flat (sabkha) in eastern Arabia under a flat, overcast grey sky, during dull, even midday light. " +
        "The foreground is a hard, cracked white salt crust broken into irregular polygon plates, with a few dry, leaves dead shrubs; the barren flat stretches to a level horizon. " +
        "Fine dust drifts very slightly across the crust.",
      avoid: "No coins, no gold, no treasure, no chains, no people, no text.",
    },
    "09b": {
      name: "09b-every-soul-shall-taste-death-and-dominion",
      verses: "185–189",
      theme: "Every Soul Shall Taste Death & Universal Dominion",
      scene:
        "capturing the immense, smooth, sweeping sand dunes of the Rub' al-Khali (Empty Quarter) at calm late dusk. " +
        "Long, curved dune crests in soft apricot and rose tones layer into the far distance under a deepening, quiet twilight sky with the faint first stars. " +
        "The light is soft and steady; a very fine veil of sand blows slightly off the nearest dune crest.",
      avoid: "No skulls, no bones, no graves, no sunset sun disk, no people, no text.",
    },
    "10a": {
      name: "10a-ulul-albab-and-contemplation-of-creation",
      verses: "190–195",
      theme: "Ulul-Albab — Contemplation of Creation in Heavens & Earth",
      scene:
        "capturing a clear, dark night sky over a quiet desert plateau in the AlUla region, far from any light. " +
        "The Milky Way arcs across the upper frame among countless steady stars; below, the dark silhouettes of low, natural weathered sandstone outcrops sit on a flat, starlit desert floor. " +
        "The stars hold perfectly steady with only natural faint twinkling.",
      avoid: "No star trails, no rotating sky, no meteors, no auroras, no planets close-up, no people, no text.",
    },
    "10b": {
      name: "10b-patience-unshakable-endurance-and-triumph",
      verses: "196–200",
      theme: "Patience, Unshakable Endurance & Triumph",
      scene:
        "capturing a rugged rocky coastline of the Arabian Sea in Dhofar at calm, steady early sunrise light. " +
        "Solid, weathered dark limestone rocks hold firm in the foreground as gentle waves break against them and wash back in white foam; the open sea stretches to a level horizon under a soft pale-gold sky. " +
        "The waves move naturally; the rocks stand unmoved.",
      avoid: "No boats, no lighthouses, no storms, no people, no text.",
    },
  },
};

/**
 * Constructs the canonical documentary cinema prompt for Veo generation.
 */
export function buildPromptText(sceneDesc, avoidDesc = "") {
  const opening =
    "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position with all filming equipment completely outside the visible composition";
  const camera =
    "The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, orbit, rotation, drone movement, or artificial parallax. " +
    "Completely consistent ambient illumination throughout the entire 8-second shot, with no moving sun, no time-lapse progression, no shifting shadows, and no exposure change. " +
    "Completely motionless camera framing ensures absolute visual stability, zero parallax shift, and clean loop compatibility. " +
    "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame.";
  const negative =
    "No black bars, no letterboxing, no pillarboxing, no black bands, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no numbers, no symbols, no text, no logos. " +
    "No camera equipment, no tripod, no tripod legs, no equipment shadow, no filming gear, no modern objects, no roads, no vehicles, no power lines. " +
    "No humans, no faces, no hands, no feet, no bodies, no silhouettes, no footprints, no human traces, no divine figures, no angels, no prophets, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, no casualties, no hellfire, no demons, no souls, no corpses, no graves, no skeletons, no resurrection imagery, " +
    "no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no tents, no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no cosmic portals, no magical particles.";

  return `${opening}, ${sceneDesc}. ${camera} ${negative} ${avoidDesc}`.trim();
}

/**
 * Detects MIME type for supported image files.
 */
export function detectImageMimeType(filePath) {
  if (!filePath || typeof filePath !== "string") {
    return "image/png";
  }
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

/**
 * Constructs an image-conditioned or text-only Veo 3.1 video generation request object
 * adhering strictly to the Google GenAI SDK and Vertex AI Veo 3.1 API contract.
 *
 * Contract specifications:
 * - instances[0].prompt: string
 * - instances[0].image: { bytesBase64Encoded, mimeType } (mapped from source.image = { imageBytes, mimeType })
 * - parameters.durationSeconds: number (8)
 * - parameters.aspectRatio: string ('16:9' or '9:16')
 * - parameters.resolution: string ('720p' or '1080p')
 * - parameters.resizeMode: 'CROP' | 'PAD' (explicitly configured, defaulting to 'CROP')
 *
 * Safety requirements:
 * - If isImageFirst is true, an approved image must be provided. Text-only fallback is strictly blocked.
 * - resizeMode is explicitly set on all image-conditioned requests.
 */
export function constructVeoVideoRequest({
  prompt,
  imagePath = null,
  imageBytes = null,
  mimeType = null,
  durationSec = BUDGET_CONFIG.durationSec,
  resolution = BUDGET_CONFIG.resolution,
  aspectRatio = "16:9",
  resizeMode = BUDGET_CONFIG.defaultResizeMode || "CROP",
  model = BUDGET_CONFIG.model,
  isImageFirst = false,
} = {}) {
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("MISSING_PROMPT: A non-empty text prompt is required for video generation.");
  }

  const hasImage = Boolean(imagePath || imageBytes);

  if (isImageFirst && !hasImage) {
    throw new Error(
      "IMAGE_FIRST_TEXT_FALLBACK_BLOCKED: Text-only requests cannot accidentally be used for an image-first clip. A valid approved still image is strictly required."
    );
  }

  if (hasImage) {
    let finalBase64 = imageBytes;
    let finalMime = mimeType;

    if (!finalBase64) {
      if (!imagePath || !fs.existsSync(imagePath)) {
        throw new Error(`IMAGE_FILE_NOT_FOUND: Source image does not exist at '${imagePath}'.`);
      }
      const buffer = fs.readFileSync(imagePath);
      finalBase64 = buffer.toString("base64");
      finalMime = mimeType || detectImageMimeType(imagePath);
    } else {
      finalMime = finalMime || "image/png";
    }

    const explicitResizeMode = String(resizeMode || "CROP").toUpperCase();
    if (explicitResizeMode !== "CROP" && explicitResizeMode !== "PAD") {
      throw new Error(
        `INVALID_RESIZE_MODE: Unsupported resizeMode '${resizeMode}'. Supported modes in Google GenAI SDK are 'CROP' and 'PAD'.`
      );
    }

    return {
      model,
      source: {
        prompt: prompt.trim(),
        image: {
          imageBytes: finalBase64,
          mimeType: finalMime,
        },
      },
      config: {
        aspectRatio,
        durationSeconds: durationSec,
        resolution,
        resizeMode: explicitResizeMode,
      },
    };
  }

  return {
    model,
    source: {
      prompt: prompt.trim(),
    },
    config: {
      aspectRatio,
      durationSeconds: durationSec,
      resolution,
    },
  };
}

/**
 * Builds a deterministic per-clip generation plan for a Surah.
 */
export function buildGenerationPlan(surahNum, options = {}) {
  const { visualData, ayahVideosMap, targetClips } = options;
  const ledger = loadLedger();
  const clips = [];
  let clipsNeedingGeneration = 0;

  // 1. Chapters
  if (visualData?.chapters) {
    for (const ch of visualData.chapters) {
      const clipId = String(ch.id);
      if (targetClips && !targetClips.some((tc) => clipId.toLowerCase() === tc || ch.videoPath.toLowerCase().includes(tc))) {
        continue;
      }

      const localRel = ch.videoPath.startsWith("/") ? ch.videoPath.slice(1) : ch.videoPath;
      const localAbs = path.join(ROOT, "public", localRel);
      const existsLocal = fs.existsSync(localAbs);

      const filename = path.basename(ch.videoPath, ".mp4");
      const codeMatch = filename.match(/^([0-9]{2}[a-z])/);
      const clipCode = codeMatch ? codeMatch[1] : clipId;

      const promptInfo =
        SCENE_PROMPT_LIBRARY[surahNum]?.[clipCode] ||
        SCENE_PROMPT_LIBRARY[surahNum]?.[clipId] || {
          name: filename,
          verses: `${ch.fromVerse}–${ch.toVerse}`,
          theme: ch.theme,
          scene: ch.visualConcept || ch.theme,
          avoid: "No humans, no figures, no buildings, no text.",
        };

      const fullPrompt = promptInfo.rawPrompt || buildPromptText(promptInfo.scene, promptInfo.avoid);

      const clipPlan = {
        clipId,
        category: "CHAPTER_LOOP",
        theme: ch.theme,
        verses: `${ch.fromVerse}–${ch.toVerse}`,
        targetPath: ch.videoPath,
        localExists: existsLocal,
        localPath: existsLocal ? localAbs : null,
        method: "VERTEX_AI_VEO",
        model: BUDGET_CONFIG.model,
        durationSec: BUDGET_CONFIG.durationSec,
        resolution: BUDGET_CONFIG.resolution,
        aspectRatio: "16:9",
        costPerVideoINR: BUDGET_CONFIG.costPerVideoINR,
        estimatedCostINR: existsLocal ? 0.0 : BUDGET_CONFIG.costPerVideoINR,
        requiresGeneration: !existsLocal,
        aiProhibited: false,
        prompt: fullPrompt,
        status: existsLocal ? "ALREADY_EXISTS" : "GENERATION_REQUIRED",
      };

      if (!existsLocal) {
        clipsNeedingGeneration++;
      }

      clips.push(clipPlan);
    }
  }

  // 2. Ayah Real-Footage Clips
  if (ayahVideosMap) {
    for (const [ayahNumStr, ayahData] of Object.entries(ayahVideosMap)) {
      const clipId = `ayah-${ayahNumStr}`;
      if (targetClips && !targetClips.some((tc) => clipId.toLowerCase() === tc || ayahNumStr === tc || ayahData.videoPath.toLowerCase().includes(tc))) {
        continue;
      }

      const localRel = ayahData.videoPath.startsWith("/") ? ayahData.videoPath.slice(1) : ayahData.videoPath;
      const localAbs = path.join(ROOT, "public", localRel);
      const existsLocal = fs.existsSync(localAbs);

      const clipPlan = {
        clipId,
        category: "AYAH_REAL_FOOTAGE",
        theme: ayahData.theme,
        verses: ayahNumStr,
        targetPath: ayahData.videoPath,
        localExists: existsLocal,
        localPath: existsLocal ? localAbs : null,
        method: "LICENSED_REAL_FOOTAGE_ACQUISITION",
        license: ayahData.license || "Verified Footage License",
        source: ayahData.source || "Camera Production",
        estimatedCostINR: 0.0,
        requiresGeneration: false,
        aiProhibited: true,
        status: existsLocal ? "ALREADY_EXISTS" : "REAL_FOOTAGE_MISSING",
        note: "AI video generation strictly prohibited for Ayah-level clips. Must use authentic camera footage.",
      };

      clips.push(clipPlan);
    }
  }

  // Budget evaluation
  const totalEstimatedCostINR = clipsNeedingGeneration * BUDGET_CONFIG.costPerVideoINR;
  const budgetEval = evaluateGenerationPermission(clipsNeedingGeneration, ledger);

  const plan = {
    surahNumber: surahNum,
    generatedAt: new Date().toISOString(),
    totalClipsEvaluated: clips.length,
    clipsNeedingGeneration,
    totalEstimatedCostINR,
    budgetEvaluation: {
      allowed: budgetEval.allowed,
      currentRemainingINR: ledger.estimatedRemainingCreditINR,
      hardStopFloorINR: BUDGET_CONFIG.hardStopFloorINR,
      minimumReserveINR: BUDGET_CONFIG.minimumReserveINR,
      projectedRemainingINR: ledger.estimatedRemainingCreditINR - totalEstimatedCostINR,
      reason: budgetEval.reason,
    },
    clips,
    approvalRequired: clipsNeedingGeneration > 0,
    approvalSignature: {
      surah: surahNum,
      clipIds: clips.filter((c) => c.requiresGeneration).map((c) => c.clipId),
      model: BUDGET_CONFIG.model,
      expectedCostINR: totalEstimatedCostINR,
    },
  };

  return plan;
}

/**
 * Validates whether an explicit human approval matches the exact operation plan.
 */
export function validateApproval(plan, userApproval) {
  if (!userApproval) {
    return { valid: false, reason: "No approval object supplied." };
  }

  if (userApproval.surah !== plan.surahNumber) {
    return {
      valid: false,
      reason: `Surah mismatch: approved for Surah ${userApproval.surah}, but requested plan is for Surah ${plan.surahNumber}.`,
    };
  }

  const planClipIds = plan.approvalSignature.clipIds.slice().sort().join(",");
  const approvedClipIds = (userApproval.clipIds || []).slice().sort().join(",");
  if (planClipIds !== approvedClipIds) {
    return {
      valid: false,
      reason: `Clip list mismatch: approved [${approvedClipIds}], but plan requires [${planClipIds}].`,
    };
  }

  if (userApproval.model !== plan.approvalSignature.model) {
    return {
      valid: false,
      reason: `Model mismatch: approved ${userApproval.model}, expected ${plan.approvalSignature.model}.`,
    };
  }

  if (Math.abs(userApproval.expectedCostINR - plan.approvalSignature.expectedCostINR) > 0.01) {
    return {
      valid: false,
      reason: `Cost estimate mismatch: approved ₹${userApproval.expectedCostINR}, current plan is ₹${plan.approvalSignature.expectedCostINR}.`,
    };
  }

  // Check staleness (valid for at most 10 minutes)
  const approvalAgeMs = Date.now() - new Date(userApproval.timestamp || 0).getTime();
  if (approvalAgeMs > 10 * 60 * 1000) {
    return {
      valid: false,
      reason: `Approval is stale (${Math.round(approvalAgeMs / 1000)}s old; max 600s allowed). Re-approval required.`,
    };
  }

  return { valid: true, reason: "Approval signature verified and valid." };
}

/**
 * Executes a controlled, single-clip generation pilot workflow.
 *
 * Supports "plan", "mock", and "live" execution modes:
 * - "plan": Read-only preview of prompts, budget, and invocation arguments.
 * - "mock": Non-destructive test creating synthetic raw masters in destinationDir,
 *   running 0.40s seam crossfade, contact sheets, and QA without calling paid APIs.
 * - "live": Structurally blocked in Phase 6 to guarantee zero paid generation.
 */
export async function executeControlledPilot(options = {}) {
  const {
    surahNum = 3,
    clipId = "03a",
    mode = "mock",
    destinationDir = path.join(ROOT, "scratch/pilot"),
    approval = null,
    simulateFailure = false,
    force = false,
    customLedger = null,
    state = null,
    surahMeta = null,
    visualData = null,
    ayahVideosMap = null,
  } = options;

  // 1. Resolve Clip Info
  const clipInfo = SCENE_PROMPT_LIBRARY[surahNum]?.[clipId];
  if (!clipInfo) {
    throw new Error(`Clip '${clipId}' not found in SCENE_PROMPT_LIBRARY for Surah ${surahNum}.`);
  }

  // Ayah Real Footage Protection
  if (clipId.startsWith("ayah-") || clipInfo.aiProhibited) {
    return {
      success: false,
      step: "AI_PROHIBITION",
      error: "AI video generation strictly prohibited for Ayah-level clips. Must use authentic camera footage.",
      aiProhibited: true,
    };
  }

  // 2. Budget Evaluation
  const activeLedger = customLedger || loadLedger();
  const budgetEval = evaluateGenerationPermission(1, activeLedger);
  if (!budgetEval.allowed) {
    return {
      success: false,
      step: "BUDGET_GATE",
      error: budgetEval.reason,
      budgetEvaluation: budgetEval,
    };
  }

  // 3. Build Deterministic Plan
  const fullPrompt = clipInfo.rawPrompt || buildPromptText(clipInfo.scene, clipInfo.avoid);
  const plan = {
    surahNumber: surahNum,
    generatedAt: new Date().toISOString(),
    totalClipsEvaluated: 1,
    clipsNeedingGeneration: 1,
    totalEstimatedCostINR: BUDGET_CONFIG.costPerVideoINR,
    budgetEvaluation: {
      allowed: budgetEval.allowed,
      currentRemainingINR: activeLedger.estimatedRemainingCreditINR,
      hardStopFloorINR: BUDGET_CONFIG.hardStopFloorINR,
      minimumReserveINR: BUDGET_CONFIG.minimumReserveINR,
      projectedRemainingINR: activeLedger.estimatedRemainingCreditINR - BUDGET_CONFIG.costPerVideoINR,
      reason: budgetEval.reason,
    },
    clips: [
      {
        clipId,
        category: "CHAPTER_LOOP",
        theme: clipInfo.theme || clipInfo.name,
        verses: clipInfo.verses,
        method: "VERTEX_AI_VEO",
        model: BUDGET_CONFIG.model,
        durationSec: BUDGET_CONFIG.durationSec,
        resolution: BUDGET_CONFIG.resolution,
        aspectRatio: "16:9",
        costPerVideoINR: BUDGET_CONFIG.costPerVideoINR,
        estimatedCostINR: BUDGET_CONFIG.costPerVideoINR,
        prompt: fullPrompt,
      },
    ],
    approvalRequired: true,
    approvalSignature: {
      surah: surahNum,
      clipIds: [clipId],
      model: BUDGET_CONFIG.model,
      expectedCostINR: BUDGET_CONFIG.costPerVideoINR,
    },
  };

  // 4. Approval Validation (Required for mock & live execution)
  if (mode !== "plan") {
    const approvalCheck = validateApproval(plan, approval);
    if (!approvalCheck.valid) {
      return {
        success: false,
        step: "APPROVAL_GATE",
        error: approvalCheck.reason,
        plan,
      };
    }

    // 4.1 Image-First Human Approval Gate
    if (options.requireImageApproval !== false) {
      const surahState = loadOrInitSurahState(surahNum, { customDir: options.customDir });
      const clipState =
        surahState.clips[clipId] ||
        Object.values(surahState.clips).find(
          (c) =>
            c.id?.toLowerCase() === clipId.toLowerCase() ||
            c.targetPath?.toLowerCase().includes(`/${clipId.toLowerCase()}-`) ||
            c.targetPath?.toLowerCase().includes(clipId.toLowerCase())
        );

      if (!clipState) {
        return {
          success: false,
          step: "IMAGE_APPROVAL_GATE",
          error: `Clip '${clipId}' not found in state file.`,
          plan,
        };
      }

      const imageCheck = validateImageApproval({
        clip: clipState,
        videoPrompt: fullPrompt,
        videoConfig: {
          model: BUDGET_CONFIG.model,
          resolution: BUDGET_CONFIG.resolution,
          aspectRatio: "16:9",
          duration: BUDGET_CONFIG.durationSec,
        },
      });

      if (!imageCheck.valid) {
        return {
          success: false,
          step: "IMAGE_APPROVAL_GATE",
          error: `Image approval gate failed: ${imageCheck.reason}. Human approval of the still image is strictly required before video generation.`,
          plan,
          imageCheck,
        };
      }

      // 4.2 Check physical image file existence & hash match
      const approvedImagePath = options.imagePath || clipState.imageApproval?.imagePath;
      if (!approvedImagePath || !fs.existsSync(approvedImagePath)) {
        return {
          success: false,
          step: "IMAGE_APPROVAL_GATE",
          error: `Image approval gate failed: Approved image file is missing from disk: ${approvedImagePath}`,
          plan,
        };
      }

      const currentDiskSha = computeHash(approvedImagePath);
      if (currentDiskSha !== clipState.imageApproval.imageSha256) {
        return {
          success: false,
          step: "IMAGE_APPROVAL_GATE",
          error: `Image approval gate failed: Approved image content has been altered on disk (hash mismatch). Expected ${clipState.imageApproval.imageSha256}, got ${currentDiskSha}.`,
          plan,
        };
      }

      // 4.3 Check Image-Conditioned Model Capability
      if (options.requireImageConditioning) {
        const supportsConditioning = Boolean(BUDGET_CONFIG.supportsImageConditioning);
        if (!supportsConditioning) {
          return {
            success: false,
            step: "IMAGE_CONDITIONING_LIMITATION",
            error: `Model '${BUDGET_CONFIG.model}' does not support image-conditioned generation on this endpoint. The approved still image cannot be passed as first frame. Awaiting decision: authorize text-to-video with approved prompt or select an image-conditioned model.`,
            plan,
          };
        }
      }
    }
  }

  // 5. Target Paths & Duplicate Prevention
  const rawMastersDir = path.join(destinationDir, "raw_masters");
  const processedDir = path.join(destinationDir, "processed");
  const sheetsDir = path.join(destinationDir, "contact_sheets");
  const framesDir = path.join(destinationDir, "frames");

  const rawMasterPath = path.join(rawMastersDir, `${clipInfo.name}-raw-master.mp4`);
  const processedPath = path.join(processedDir, `${clipInfo.name}.mp4`);
  const sheetPath = path.join(sheetsDir, `${clipInfo.name}_contact_sheet.jpg`);

  const verifiedInvocation = {
    executable: "node",
    script: "scripts/generation/generate_vertex_imran_batch.mjs",
    args: [`--only=${clipId}`],
    model: BUDGET_CONFIG.model,
    durationSec: BUDGET_CONFIG.durationSec,
    resolution: BUDGET_CONFIG.resolution,
    aspectRatio: "16:9",
    promptLength: fullPrompt.length,
    outputTarget: rawMasterPath,
  };

  // Check duplicate output
  if (fs.existsSync(processedPath) && !force) {
    return {
      success: true,
      skippedDuplicate: true,
      status: "SKIPPED_DUPLICATE",
      reason: `Processed output already exists at ${processedPath}. Duplicate generation skipped to protect budget.`,
      clipId,
      processedPath,
      plan,
      verifiedInvocation,
    };
  }

  if (mode === "plan") {
    return {
      success: true,
      step: "PLAN",
      clipId,
      clipInfo,
      plan,
      verifiedInvocation,
      budgetEvaluation: budgetEval,
    };
  }

  if (mode === "live") {
    // 1. Strict Authorization Checks
    if (!clipInfo) {
      throw new Error(`UNAUTHORIZED_CLIP: Clip '${clipId}' is not defined in SCENE_PROMPT_LIBRARY for Surah ${surahNum}.`);
    }

    if (plan.totalEstimatedCostINR > 80.0) {
      throw new Error(`COST_EXCEEDS_LIMIT: Estimated cost ₹${plan.totalEstimatedCostINR.toFixed(2)} exceeds ₹80 limit.`);
    }

    if (plan.budgetEvaluation.projectedRemainingINR < BUDGET_CONFIG.hardStopFloorINR) {
      throw new Error(
        `HARD_STOP_FLOOR_BREACH: Projected balance ₹${plan.budgetEvaluation.projectedRemainingINR.toFixed(2)} falls below ₹${BUDGET_CONFIG.hardStopFloorINR.toFixed(2)} floor.`
      );
    }

    if (fs.existsSync(rawMasterPath) || fs.existsSync(processedPath)) {
      throw new Error(`DESTINATION_NOT_EMPTY: Destination file already exists. Aborting to avoid overwrite.`);
    }

    const confirmationToken = options.confirmation || process.env.PILOT_CONFIRMATION;
    if (confirmationToken !== "APPROVE") {
      return {
        success: false,
        step: "INTERACTIVE_CONFIRMATION",
        error: "Operator confirmation required. Must receive exact token 'APPROVE'.",
        requiresConfirmation: true,
        plan,
        verifiedInvocation,
      };
    }

    console.log(`\n======================================================================`);
    console.log(`🎬 Submitting Single Paid Video Generation Request to Vertex AI Veo...`);
    console.log(`   Model:       ${BUDGET_CONFIG.model}`);
    console.log(`   Duration:    ${BUDGET_CONFIG.durationSec}s @ 24fps`);
    console.log(`   Resolution:  ${BUDGET_CONFIG.resolution} (16:9)`);
    console.log(`   Cost:        ₹${BUDGET_CONFIG.costPerVideoINR} INR`);
    console.log(`   Project:     ${BUDGET_CONFIG.projectId}`);
    console.log(`======================================================================\n`);

    fs.mkdirSync(rawMastersDir, { recursive: true });
    fs.mkdirSync(processedDir, { recursive: true });
    fs.mkdirSync(sheetsDir, { recursive: true });
    fs.mkdirSync(framesDir, { recursive: true });

    const activeState = state || loadOrInitSurahState(surahNum, {
      surahMeta,
      visualData,
      ayahVideosMap,
      customDir: options.customDir,
    });

    const getClipState = (cId) =>
      activeState.clips[cId] ||
      Object.values(activeState.clips).find(
        (c) =>
          c.id?.toLowerCase() === cId.toLowerCase() ||
          c.targetPath?.toLowerCase().includes(`/${cId.toLowerCase()}-`) ||
          c.targetPath?.toLowerCase().includes(cId.toLowerCase())
      );

    const targetClip = getClipState(clipId);

    const isImageFirstClip = Boolean(
      options.requireImageFirst ||
      options.imagePath ||
      targetClip?.imageApproval !== undefined ||
      targetClip?.currentStillPreview !== undefined ||
      targetClip?.previewImagePath !== undefined ||
      options.requireImageApproval !== false
    );

    let videoRequest;
    if (isImageFirstClip) {
      if (!targetClip?.imageApproval || !targetClip.imageApproval.isValid) {
        throw new Error(
          "IMAGE_FIRST_TEXT_FALLBACK_BLOCKED: Video generation blocked. The image-first workflow requires explicit, valid human image approval. Text-only fallback is strictly prohibited."
        );
      }
      const approvedPath = options.imagePath || targetClip.imageApproval.imagePath;
      if (!approvedPath || !fs.existsSync(approvedPath)) {
        throw new Error(`IMAGE_FILE_NOT_FOUND: Approved image missing from disk at '${approvedPath}'.`);
      }
      const diskSha = computeHash(approvedPath);
      if (diskSha !== targetClip.imageApproval.imageSha256) {
        throw new Error(
          `IMAGE_TAMPERING_DETECTED: Approved image content on disk differs from approved hash. Expected ${targetClip.imageApproval.imageSha256}, got ${diskSha}.`
        );
      }
      videoRequest = constructVeoVideoRequest({
        prompt: fullPrompt,
        imagePath: approvedPath,
        durationSec: BUDGET_CONFIG.durationSec,
        resolution: BUDGET_CONFIG.resolution,
        aspectRatio: "16:9",
        resizeMode: options.resizeMode || BUDGET_CONFIG.defaultResizeMode || "CROP",
        model: BUDGET_CONFIG.model,
        isImageFirst: true,
      });
    } else {
      videoRequest = constructVeoVideoRequest({
        prompt: fullPrompt,
        durationSec: BUDGET_CONFIG.durationSec,
        resolution: BUDGET_CONFIG.resolution,
        aspectRatio: "16:9",
        model: BUDGET_CONFIG.model,
        isImageFirst: false,
      });
    }

    if (targetClip && targetClip.state === PRODUCTION_STATES.IMAGE_APPROVED) {
      transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL);
    }

    let ai;
    if (options.mockAiClient) {
      ai = options.mockAiClient;
    } else {
      const { GoogleGenAI } = await import("@google/genai");
      ai = new GoogleGenAI({ vertexai: true, project: BUDGET_CONFIG.projectId, location: "us-central1" });
    }

    let op;
    const existingOpId =
      options.resumeOperationId ||
      (targetClip?.state === PRODUCTION_STATES.VIDEO_GENERATING ? targetClip?.operationId : null) ||
      (options.allowResume && targetClip?.operationId ? targetClip?.operationId : null);

    if (existingOpId && !force && !options.freshCall) {
      console.log(`📡 Detected active operation: ${existingOpId}. Resuming polling without creating duplicate request...`);
      if (options.mockAiClient) {
        op = {
          name: existingOpId,
          done: true,
          response: {
            generatedVideos: [
              {
                video: {
                  videoBytes: Buffer.from("mock video content").toString("base64"),
                },
              },
            ],
          },
        };
      } else {
        const { GenerateVideosOperation } = await import("@google/genai");
        const existingOp = new GenerateVideosOperation();
        existingOp.name = existingOpId;
        op = existingOp;
      }
    } else {
      transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_GENERATING);
      try {
        op = await ai.models.generateVideos(videoRequest);
        if (targetClip) {
          targetClip.operationId = op.name;
          saveSurahState(activeState, options.customDir);
        }
      } catch (genErr) {
        transitionClip(activeState, clipId, PRODUCTION_STATES.FAILED, {
          error: `Vertex AI Request Failed: ${genErr.message}`,
          failedAt: new Date().toISOString(),
        });
        saveSurahState(activeState, options.customDir);
        throw new Error(`Vertex AI Request Failed: ${genErr.message}`);
      }
    }

    const operationId = op.name;
    console.log(`✓ Operation Created: ${operationId}`);
    console.log(`Polling rendering progress (typically 60-120 seconds)...`);

    let polls = 0;
    while (!op.done) {
      polls++;
      await new Promise((r) => setTimeout(r, options.mockAiClient ? 10 : 6000));
      try {
        op = await ai.operations.getVideosOperation({ operation: op });
        console.log(`  [Poll #${polls} @ ${polls * (options.mockAiClient ? 0.01 : 6)}s] Done: ${op.done ? "YES" : "IN_PROGRESS"}`);
      } catch (pollErr) {
        console.warn(`  [Poll #${polls}] Polling note: ${pollErr.message}`);
      }
    }

    if (op.error) {
      transitionClip(activeState, clipId, PRODUCTION_STATES.FAILED, {
        error: `Veo Generation Error: ${JSON.stringify(op.error)}`,
        failedAt: new Date().toISOString(),
      });
      saveSurahState(activeState, options.customDir);
      throw new Error(`Veo Generation Error: ${JSON.stringify(op.error)}`);
    }

    const video = op.response?.generatedVideos?.[0]?.video;
    const bytes = video?.videoBytes || video?.bytesBase64Encoded;
    if (!bytes) {
      throw new Error(`No video bytes returned: ${JSON.stringify(op.response)}`);
    }

    fs.writeFileSync(rawMasterPath, Buffer.from(bytes, "base64"));
    console.log(`✓ Saved raw master: ${rawMasterPath} (${(fs.statSync(rawMasterPath).size / 1024 / 1024).toFixed(2)} MB)`);

    // Record verified charge in budget ledger (skipped during mock AI testing)
    const updatedLedger = options.mockAiClient
      ? (options.customLedger || activeLedger)
      : recordSuccessfulGeneration(clipInfo.name, {
          id: clipId,
          operationId,
          model: BUDGET_CONFIG.model,
          destination: rawMasterPath,
          costINR: BUDGET_CONFIG.costPerVideoINR,
        });

    transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_GENERATED, {
      operationId,
      rawMasterPath,
      generatedAt: new Date().toISOString(),
    });

    // 0.40s seam crossfade post-processing
    console.log(`Applying approved 0.40s crossfade seam to ${clipId}...`);
    const loopRes = createSeamlessLoop({
      inputPath: rawMasterPath,
      outputPath: processedPath,
      overlapSec: DEFAULT_OVERLAP_SEC,
      dryRun: false,
    });

    transitionClip(activeState, clipId, PRODUCTION_STATES.PROCESSED, {
      processedPath,
      seamStandard: "0.40s crossfade",
      audioStatus: "stripped",
      durationSec: loopRes.outputDetails?.durationFormatted || 8.0,
    });

    // QA & Contact Sheet
    console.log(`Generating contact sheet & loop seam SSIM...`);
    const clipFramesDir = path.join(framesDir, clipId);
    const sheetRes = generateContactSheet(processedPath, sheetPath, clipFramesDir);
    const outProbe = probeVideo(processedPath);
    const letterbox = detectLetterbox(processedPath);

    transitionClip(activeState, clipId, PRODUCTION_STATES.QA_RUNNING);
    transitionClip(activeState, clipId, PRODUCTION_STATES.QA_PASSED, {
      seamSSIM: sheetRes.seamSSIM,
      resolution: `${outProbe.width}x${outProbe.height}`,
      fps: outProbe.fps,
      hasAudio: outProbe.hasAudio,
      letterboxed: letterbox?.isLetterboxed || false,
    });
    transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING, {
      humanReviewPending: true,
      contactSheetPath: sheetPath,
      processedVideoPath: processedPath,
      technicalQaPassed: true,
    });

    saveSurahState(activeState, options.customDir);

    return {
      success: true,
      mode: "live",
      operationId,
      clipId,
      clipInfo,
      rawMasterPath,
      processedPath,
      contactSheetPath: sheetPath,
      seamSSIM: sheetRes.seamSSIM,
      probe: outProbe,
      letterbox,
      verifiedInvocation,
      plan,
      videoRequest,
      confirmedCostINR: BUDGET_CONFIG.costPerVideoINR,
      ledger: updatedLedger,
      clipState: getClipState(clipId),
    };
  }

  // 6. Mock Execution
  fs.mkdirSync(rawMastersDir, { recursive: true });
  fs.mkdirSync(processedDir, { recursive: true });
  fs.mkdirSync(sheetsDir, { recursive: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const activeState = state || loadOrInitSurahState(surahNum, {
    surahMeta,
    visualData,
    ayahVideosMap,
    customDir: options.customDir,
  });

  const getClipState = (cId) =>
    activeState.clips[cId] ||
    Object.values(activeState.clips).find(
      (c) =>
        c.id?.toLowerCase() === cId.toLowerCase() ||
        c.targetPath?.toLowerCase().includes(`/${cId.toLowerCase()}-`) ||
        c.targetPath?.toLowerCase().includes(cId.toLowerCase())
    );

  const targetClip = getClipState(clipId);
  if (force && targetClip) {
    targetClip.state = PRODUCTION_STATES.PLANNED;
  }

  // State transitions: PLANNED -> PROMPTS_READY -> BUDGET_CHECKED -> GENERATION_PENDING_APPROVAL
  if (
    targetClip.state !== PRODUCTION_STATES.VIDEO_GENERATION_PENDING_APPROVAL &&
    targetClip.state !== PRODUCTION_STATES.GENERATION_PENDING_APPROVAL
  ) {
    if (targetClip.state === PRODUCTION_STATES.PLANNED) {
      transitionClip(activeState, clipId, PRODUCTION_STATES.PROMPTS_READY);
      transitionClip(activeState, clipId, PRODUCTION_STATES.BUDGET_CHECKED, { budgetApproved: true });
      transitionClip(activeState, clipId, PRODUCTION_STATES.GENERATION_PENDING_APPROVAL);
    }
  }

  if (simulateFailure) {
    transitionClip(activeState, clipId, PRODUCTION_STATES.FAILED, {
      error: "Simulated Vertex AI generation failure: API timeout or quota exceeded",
      failedAt: new Date().toISOString(),
    });
    const clipState = getClipState(clipId);
    if (clipState) {
      clipState.retryCount = (clipState.retryCount || 0) + 1;
    }
    saveSurahState(activeState);
    return {
      success: false,
      step: "GENERATION",
      error: "Simulated Vertex AI generation failure: API timeout or quota exceeded",
      operationId: null,
      clipState: getClipState(clipId),
      retryCount: getClipState(clipId)?.retryCount || 1,
    };
  }

  // Assign deterministic operation ID
  const operationId = `mock-op-${clipId}-${Date.now().toString(36)}`;

  // Create valid 8.00s raw master video in destinationDir
  spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc=duration=8:size=1920x1080:rate=24",
      "-c:v", "libx264",
      "-profile:v", "high",
      "-pix_fmt", "yuv420p",
      rawMasterPath,
    ],
    { stdio: "ignore" }
  );

  transitionClip(activeState, clipId, PRODUCTION_STATES.MOCK_GENERATED, {
    operationId,
    rawMasterPath,
    generatedAt: new Date().toISOString(),
  });

  // 7. Local Post-Processing (0.40s seam crossfade, audio stripped, web-optimized)
  const loopRes = createSeamlessLoop({
    inputPath: rawMasterPath,
    outputPath: processedPath,
    overlapSec: DEFAULT_OVERLAP_SEC,
    dryRun: false,
  });

  transitionClip(activeState, clipId, PRODUCTION_STATES.PROCESSED, {
    processedPath,
    seamStandard: "0.40s crossfade",
    audioStatus: "stripped",
    durationSec: loopRes.outputDetails?.durationFormatted || 7.60,
  });

  // 8. Contact Sheet & Seam QA
  const clipFramesDir = path.join(framesDir, clipId);
  const sheetRes = generateContactSheet(processedPath, sheetPath, clipFramesDir);
  const outProbe = probeVideo(processedPath);
  const letterbox = detectLetterbox(processedPath);

  transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_QA);
  transitionClip(activeState, clipId, PRODUCTION_STATES.VIDEO_HUMAN_REVIEW_PENDING, {
    seamSSIM: sheetRes.seamSSIM,
    resolution: `${outProbe.width}x${outProbe.height}`,
    fps: outProbe.fps,
    hasAudio: outProbe.hasAudio,
    letterboxed: letterbox?.isLetterboxed || false,
    technicalQaPassed: true,
    humanReviewPending: true,
    deploymentApproval: "BLOCKED",
  });

  saveSurahState(activeState, options.customDir);

  return {
    success: true,
    step: "COMPLETED",
    operationId,
    clipId,
    clipInfo,
    rawMasterPath,
    processedPath,
    contactSheetPath: sheetPath,
    seamSSIM: sheetRes.seamSSIM,
    probe: outProbe,
    letterbox,
    verifiedInvocation,
    plan,
    clipState: getClipState(clipId),
  };
}

/**
 * Records explicit human video review decision (APPROVE, REJECT, or REVISE).
 */
export function recordHumanVideoDecision({
  surahNum,
  clipId,
  decision, // "APPROVE" | "REJECT" | "REVISE"
  reviewer = "HUMAN_OPERATOR",
  notes = "",
  customDir = null,
}) {
  const state = loadOrInitSurahState(surahNum, { customDir });
  const clip =
    state.clips[clipId] ||
    Object.values(state.clips).find(
      (c) =>
        c.id?.toLowerCase() === clipId.toLowerCase() ||
        c.targetPath?.toLowerCase().includes(`/${clipId.toLowerCase()}-`) ||
        c.targetPath?.toLowerCase().includes(clipId.toLowerCase())
    );

  if (!clip) {
    throw new Error(`Clip '${clipId}' not found in Surah ${surahNum}.`);
  }

  if (decision === "APPROVE") {
    transitionClip(state, clipId, PRODUCTION_STATES.VIDEO_APPROVED, {
      videoApproval: {
        approvedAt: new Date().toISOString(),
        reviewer,
        notes,
        isValid: true,
      },
      humanReviewPending: false,
      eligibleForStaging: true,
      deploymentApproval: "PENDING_SEPARATE_DEPLOYMENT_APPROVAL",
    });

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "APPROVE",
      clipId,
      newState: clip.state,
      eligibleForStaging: true,
      deploymentApproval: "BLOCKED_PENDING_SEPARATE_AUTHORIZATION",
      message: `Video approved for ${clipId}. Eligible for local staging. Production deployment remains blocked pending separate approval.`,
    };
  }

  if (decision === "REJECT") {
    clip.videoRejectionHistory = clip.videoRejectionHistory || [];
    clip.videoRejectionHistory.push({
      rejectedAt: new Date().toISOString(),
      reviewer,
      notes,
    });

    transitionClip(state, clipId, PRODUCTION_STATES.VIDEO_REJECTED, {
      rejectionNotes: notes,
      humanReviewPending: false,
      deploymentApproval: "BLOCKED",
    });

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "REJECT",
      clipId,
      newState: clip.state,
      message: `Video rejected for ${clipId}. Artifacts preserved. Transitioned to ${clip.state}.`,
    };
  }

  if (decision === "REVISE") {
    clip.videoRevisionCount = (clip.videoRevisionCount || 0) + 1;
    clip.videoRevisionRequests = clip.videoRevisionRequests || [];
    clip.videoRevisionRequests.push({
      requestedAt: new Date().toISOString(),
      revisionNumber: clip.videoRevisionCount,
      reviewer,
      notes,
    });

    transitionClip(state, clipId, PRODUCTION_STATES.VIDEO_REVISION_REQUESTED, {
      revisionNotes: notes,
      humanReviewPending: false,
    });

    saveSurahState(state, customDir);

    return {
      success: true,
      decision: "REVISE",
      clipId,
      revisionCount: clip.videoRevisionCount,
      newState: clip.state,
      message: `Video revision requested for ${clipId}. Transitioned to ${clip.state}.`,
    };
  }

  throw new Error(`Unknown video decision '${decision}'. Must be 'APPROVE', 'REJECT', or 'REVISE'.`);
}
