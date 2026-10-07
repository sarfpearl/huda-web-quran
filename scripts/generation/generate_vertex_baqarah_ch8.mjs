import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { GoogleGenAI } from "@google/genai";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const OUTPUT_DIR = "/Users/pearl-9744/Claude/Projects/huda-web-quran/public/videos/surah/002-al-baqarah";

const CHAPTER_8_SUBCHAPTERS = [
  {
    id: "08a",
    name: "08a-scales-of-equitable-law-and-preservation-of-life",
    verses: "178–182",
    theme: "The Scales of Equitable Law & Preservation of Life",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema ground-level tracking shot on a high limestone plateau in the Arabian Peninsula at post-sunset twilight. " +
      "The camera glides steadily along ancient, rough hand-aligned dry-stone boundary walls that divide the rocky terrain in clear, orderly rows. " +
      "In the background, massive naturally balanced limestone slabs rest firmly on solid bedrock, communicating physical stability, lawful order, and restraint. " +
      "Natural twilight sky with cool ambient blue light on weathered stone and a warm evening horizon gradient. " +
      "Subtle desert breeze moving fine dust along stone joints. Authentic rock weathering, rough unworked soil, irregular mortarless joints. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no humans, no weapons, no courtroom imagery, no text, no logos."
    ),
  },
  {
    id: "08b",
    name: "08b-month-of-guidance-and-dawn-discipline",
    verses: "183–188",
    theme: "The Month of Ramadan in which the Qur’an was revealed as guidance for humanity (Hero 1 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A high-end documentary nature cinema shot capturing the physical transition of true astronomical dawn over a high desert mountain ridge in Western Arabia. " +
      "The scene begins in deep natural starlit nocturnal stillness over dark, textured mountain bedrock. " +
      "The camera steadily rises and tilts upward as a distinct, razor-sharp horizontal white thread of true dawn emerges cleanly along the dark desert horizon, separating night from day. " +
      "Soft natural morning illumination gradually expands across the mountain peaks and quiet valley floor with authentic daylight exposure. " +
      "Natural cool mountain breeze stirring sparse desert scrub in rock fissures. Jagged natural rock fractures, authentic fading star field, natural atmospheric haze. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no artificial bloom, no fake god rays, no humans, no prayer mats, no mosques, no text, no logos."
    ),
  },
  {
    id: "08c",
    name: "08c-celestial-timetable-and-restrained-defense",
    verses: "189–195",
    theme: "The Celestial Timetable, Restrained Defense & Beneficence",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema tracking shot through a natural desert rock canyon gateway in Western Arabia under early post-sunset twilight. " +
      "A delicate, razor-thin natural waxing crescent moon hangs naturally in the deep indigo twilight sky above dark basalt cliff walls. " +
      "The camera moves steadily forward through the clearly bounded narrow stone pass in disciplined, controlled transit, emerging toward a wider, peaceful open desert landscape beyond. " +
      "Authentic natural evening twilight lighting with warm dusk glow on the horizon. " +
      "Fine sand softly drifting across the canyon floor in a quiet evening breeze. Realistic rock strata, wind-carved ledges, natural atmospheric depth. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no soldiers, no weapons, no battles, no artificial moon graphics, no people, no text, no logos."
    ),
  },
  {
    id: "08d",
    name: "08d-sacred-rites-arafat-and-sacred-monument",
    verses: "196–203",
    theme: "The Sacred Rites: Arafat, The Sacred Monument & Balanced Supplication (Hero 2 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A documentary cinematic stabilized aerial camera shot with slow, physically plausible forward travel and gradual elevation over the vast, authentic granite plain of Arafat in the Hijaz. " +
      "The camera glides over open rocky desert terrain bathed in late golden-hour sunlight, smoothly capturing the natural geographic transition toward the rugged, sheltering rocky hills of the sacred mountain pass. " +
      "Warm low-angle natural sunlight grazes weathered granite boulders and rocky scree slopes, casting soft natural shadows across the expansive valley floor under a quiet, vast evening sky. " +
      "Gentle desert wind carrying fine golden dust across the plain; sparse wild scrub. Authentic geological weathering, unpaved natural earth, genuine atmospheric perspective. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no humans, no crowds, no modern pilgrim infrastructure, no tents, no roads, no text, no logos."
    ),
  },
  {
    id: "08e",
    name: "08e-ruin-of-cultivation-vs-shelter-of-peace",
    verses: "204–214",
    theme: "Ruin of Agriculture/Progeny vs. The Shelter of Complete Peace",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema lateral slider shot showing a natural environmental transition in an Arabian foothills wadi. " +
      "The camera tracks from cracked, dry, sun-scorched earth and broken dry branches into a sheltered, modest, naturally irregular grove of healthy date palms and wild green grasses fed by a clear natural spring pool. " +
      "Natural afternoon daylight with bright sun on dry soil shifting into soft, natural dappled shade beneath the palm canopy. " +
      "Gentle breeze rustling palm fronds; natural water ripples on the spring pool; fine dust settling in the arid section. " +
      "Authentic natural irregularities, rough uncultivated soil, variable wild vegetation, realistic bark textures. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no fantasy lushness, no violence, no weapons, no humans, no text, no logos."
    ),
  },
  {
    id: "08f",
    name: "08f-ethical-stewardship-and-guardianship",
    verses: "215–220",
    theme: "Moral Discernment: Ethical Stewardship & Guardianship",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema slider shot moving alongside a sturdy, honest dry-stone retaining enclosure on an Arabian highland agricultural terrace. " +
      "Clear natural spring water is carefully divided into several modest hand-carved stone channels, flowing steadily to sustain separate distinct areas of vulnerable young olive saplings and pomegranate shoots. " +
      "Bright, natural late-morning sunlight filtering through leaves, casting natural light patterns across moist dark soil and weathered stones. " +
      "Gentle water trickling through stone channels; soft mountain breeze fluttering leaves. " +
      "Authentic hand-laid rough stones, variable sapling heights, natural soil pebbles, weathered mortarless joints. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no people, no orphans, no charity recipients, no alcohol, no gambling, no fighting, no text, no logos."
    ),
  },
  {
    id: "08g1",
    name: "08g1-covenant-of-marriage-and-honorable-reconciliation",
    verses: "221–232",
    theme: "The Covenant of Marriage, Oaths & Honorable Reconciliation",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A dignified documentary cinema camera dolly shot gliding across the calm threshold of an authentic ancient stone domestic courtyard in Western Arabia at dusk. " +
      "Two solid hand-hewn stone doorposts support an ancient weathered timber lintel that frames an open entryway looking from the sheltered courtyard out toward the peaceful desert evening horizon. " +
      "An unbroken, smooth stone threshold rests firmly under a quiet twilight sky, embodying covenant, boundaries, and honorable dignity. " +
      "Soft natural dusk lighting with warm ambient reflections on stone walls and deep twilight sky visible through the opening. " +
      "Gentle evening breeze moving fine dust across the stone floor. Weathered timber grain, rough hand-cut stone masonry, natural earth floor. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no people, no couples, no domestic disputes, no modern furniture, no text, no logos."
    ),
  },
  {
    id: "08g2",
    name: "08g2-compassionate-provision-and-the-central-prayer",
    verses: "233–242",
    theme: "Compassionate Provision, Nursing & The Central Prayer",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A documentary cinema tracking shot inside a sheltered rocky desert wadi alcove under clear midday daylight. " +
      "A pure, gentle natural spring trickles steadily into a smooth hand-carved stone basin, continuously nourishing small wild green seedlings growing in the cool protective shade of the rock wall. " +
      "Clear, ordered natural midday sunlight illuminates the open wadi terrain outside the alcove, providing balanced natural light without harsh glare. " +
      "Constant gentle water ripples in the basin; light breeze moving delicate green leaves. " +
      "Authentic mineral deposits in the stone basin, rough wadi gravel, variable plant growth, natural rock weathering. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no humans, no infants, no mothers, no prayer mats, no text, no logos."
    ),
  },
  {
    id: "08h1",
    name: "08h1-river-test-steadfast-minority-and-equilibrium",
    verses: "243–251",
    theme: "The River Test, Steadfast Minority & Preserving Equilibrium (Hero 3 - Native 4K)",
    model: "veo-3.1-generate-001",
    resolution: "4k",
    duration: 8,
    is4K: true,
    prompt: (
      "A high-end documentary cinema aerial tracking shot capturing a powerful, clear mountain river cutting through a steep, rugged rock gorge. " +
      "The camera begins low over the turbulent, clear river rapids, observing fast-moving water rushing past stable boulders, while natural river rocks and shallow banks create irregular passages along the gorge. " +
      "The camera executes a disciplined forward movement beside the torrent, gradually rising as the canyon walls open outward to reveal a vast, widening sunlit plain under an expansive sky. " +
      "Dramatic natural afternoon daylight with direct sun creating realistic specular glints on river rapids, while deep canyon shadows contrast with the bright widening plain ahead. " +
      "Powerful, realistic fluid dynamics of rushing water, foam, spray, and swirling eddies; canyon wind moving scrub on cliff edges. " +
      "Water-worn river boulders, natural turbulent foam, irregular rock strata, river gravel deposits. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no soldiers, no armies, no weapons, no Ark reconstructions, no humans, no text, no logos."
    ),
  },
  {
    id: "08h2",
    name: "08h2-degrees-of-messengers-and-final-call-to-spend",
    verses: "252–254",
    theme: "Degrees of Messengers, Signs of Truth & Final Call to Spend",
    model: "veo-3.1-fast-generate-001",
    resolution: "1080p",
    duration: 8,
    is4K: false,
    prompt: (
      "A solemn documentary cinema panoramic shot on a high desert summit in Western Arabia overlooking an immense, quiet landscape at late dusk. " +
      "Ancient, immovable bedrock stands under a vast, darkening twilight sky where the last subtle amber glow disappears over the western horizon, leaving a boundless, quiet earth beneath a profound celestial canopy. " +
      "The camera executes a slow, dignified panoramic sweep across the darkening horizon, coming to a complete, still rest on the boundless landscape, communicating vastness, silence, and solemn accountability. " +
      "Pure, unembellished natural late-dusk ambient lighting fading into deep indigo night. " +
      "Gentle desert wind blowing over the high summit. Weathered summit rock fractures, sparse dry mountain scrub, natural atmospheric dust on the horizon. " +
      "Borderless, full-screen 16:9 edge-to-edge frame. No black bars, no letterboxing, no humans, no angels, no prophets, no apocalyptic VFX, no Judgment Day depictions, no text, no logos."
    ),
  },
];

function probeAndEncode(sub, masterPath, opId = "") {
  const probeRaw = execSync(
    `ffprobe -v error -show_entries format=duration,size,bit_rate:stream=width,height,r_frame_rate,codec_name -of json "${masterPath}"`,
    { encoding: "utf8" }
  );
  const probe = JSON.parse(probeRaw);
  const stream = probe.streams?.[0] || {};
  const fmt = probe.format || {};

  console.log(`  • Resolution: ${stream.width}x${stream.height}`);
  console.log(`  • Duration:   ${Number(fmt.duration || sub.duration).toFixed(2)}s`);
  console.log(`  • Codec/FPS:  ${stream.codec_name} @ ${stream.r_frame_rate}`);
  console.log(`  • Bitrate:    ${(Number(fmt.bit_rate || 0) / 1000000).toFixed(2)} Mbps`);

  const defaultWebPath = path.join(OUTPUT_DIR, `${sub.name}.mp4`);
  console.log("3. Creating optimized delivery web encode...");
  if (sub.is4K) {
    const web4KPath = path.join(OUTPUT_DIR, `${sub.name}-4k.mp4`);
    const fallback1080Path = path.join(OUTPUT_DIR, `${sub.name}-1080p.mp4`);

    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 20 -movflags +faststart -c:a aac -b:a 192k "${web4KPath}"`,
      { stdio: "ignore" }
    );
    execSync(
      `ffmpeg -y -i "${masterPath}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${fallback1080Path}"`,
      { stdio: "ignore" }
    );
    fs.copyFileSync(fallback1080Path, defaultWebPath);
  } else {
    execSync(
      `ffmpeg -y -i "${masterPath}" -c:v libx264 -preset medium -crf 21 -movflags +faststart -c:a aac -b:a 192k "${defaultWebPath}"`,
      { stdio: "ignore" }
    );
  }

  // Extract representative QA frames
  const qaDir = path.join(OUTPUT_DIR, "qa_frames");
  fs.mkdirSync(qaDir, { recursive: true });

  const duration = Number(fmt.duration || sub.duration);
  const tStart = 1.0;
  const tMid = (duration / 2).toFixed(1);
  const tEnd = (duration - 1.0).toFixed(1);

  execSync(`ffmpeg -y -ss ${tStart} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_start.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tMid} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_mid.png`)}"`, { stdio: "ignore" });
  execSync(`ffmpeg -y -ss ${tEnd} -i "${masterPath}" -vframes 1 "${path.join(qaDir, `${sub.name}_end.png`)}"`, { stdio: "ignore" });

  const stats = fs.statSync(masterPath);

  return {
    id: sub.id,
    name: sub.name,
    verses: sub.verses,
    theme: sub.theme,
    model: sub.model,
    targetResolution: sub.resolution,
    nativeResolution: `${stream.width}x${stream.height}`,
    duration: Number(fmt.duration || sub.duration).toFixed(2),
    fps: stream.r_frame_rate,
    codec: stream.codec_name,
    masterFile: masterPath,
    masterSizeMB: (stats.size / 1024 / 1024).toFixed(2),
    defaultWebFile: defaultWebPath,
    operationId: opId,
  };
}

async function generateSubchapter(ai, sub) {
  console.log(`\n======================================================================`);
  console.log(`🎬 Generating [Al-Baqarah Subchapter ${sub.id.toUpperCase()}: ${sub.name}] (Verses ${sub.verses})`);
  console.log(`Model:      ${sub.model} [Target: ${sub.resolution.toUpperCase()}]`);
  console.log(`Standard:   Clean Borderless Frame + Documentary Realism`);
  console.log(`Duration:   ${sub.duration} seconds @ 24 fps`);
  console.log(`======================================================================`);

  const masterPath = path.join(
    OUTPUT_DIR,
    sub.is4K ? `${sub.name}-4k-master.mp4` : `${sub.name}-1080p-master.mp4`
  );

  console.log("1. Submitting generation request to Vertex AI...");
  let operation = await ai.models.generateVideos({
    model: sub.model,
    source: { prompt: sub.prompt },
    config: {
      aspectRatio: "16:9",
      durationSeconds: sub.duration,
      resolution: sub.resolution,
    },
  });

  const operationId = operation.name;
  console.log(`✓ Vertex AI Operation Created: ${operationId}`);
  console.log(`2. Polling rendering progress (${sub.is4K ? "4K Standard" : "1080p Fast"})...`);

  let pollCount = 0;
  while (!operation.done) {
    pollCount++;
    await new Promise((r) => setTimeout(r, 7000));
    try {
      operation = await ai.operations.getVideosOperation({ operation });
      console.log(`  [Poll #${pollCount} @ ${pollCount * 7}s] Done: ${operation.done ? "YES" : "IN_PROGRESS"}`);
    } catch (pollErr) {
      console.warn(`  [Poll #${pollCount} @ ${pollCount * 7}s] Transient poll warning: ${pollErr.message}`);
    }
  }

  if (operation.error) {
    throw new Error(`Generation failed for ${sub.name}: ${JSON.stringify(operation.error, null, 2)}`);
  }

  const response = operation.response;
  const videoObj = response?.generatedVideos?.[0]?.video;
  const rawBytes = videoObj?.videoBytes || videoObj?.bytesBase64Encoded;

  if (!rawBytes) {
    throw new Error(`No video bytes returned for ${sub.name}: ${JSON.stringify(response)}`);
  }

  const buffer = Buffer.from(rawBytes, "base64");
  fs.writeFileSync(masterPath, buffer);
  console.log(`✓ Master saved: ${masterPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

  return probeAndEncode(sub, masterPath, operationId);
}

async function main() {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: PROJECT_ID,
    location: LOCATION,
  });

  const results = [];
  for (const sub of CHAPTER_8_SUBCHAPTERS) {
    const res = await generateSubchapter(ai, sub);
    results.push(res);
  }

  const summaryPath = path.join(OUTPUT_DIR, "chapter_8_generation_results.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\n🎉 Chapter 8 Generation Completed! Results saved to: ${summaryPath}`);
}

main().catch((err) => {
  console.error("❌ Chapter 8 Generation Error:", err);
  process.exit(1);
});
