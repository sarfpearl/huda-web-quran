/**
 * Aal-Imran background clips 03a … 10b (ayahs 33–200) — the 16 chapters in
 * src/lib/data/surahChapters.ts that have no clip yet. Same pipeline as
 * generate_vertex_imran_02c.mjs: Veo 3.1 Fast, 8 s, 1080p, static camera,
 * 0.6 s crossfade loop, QA frames.
 *
 * Needs gcloud Application Default Credentials for project
 * gen-lang-client-0172381348 (Vertex AI), plus ffmpeg / ffprobe. Each clip is
 * a paid render — check the budget first.
 *
 *   node scripts/generation/generate_vertex_imran_batch.mjs --list
 *   node scripts/generation/generate_vertex_imran_batch.mjs --dry-run --only=03a
 *   node scripts/generation/generate_vertex_imran_batch.mjs --only=03a
 *   node scripts/generation/generate_vertex_imran_batch.mjs --only=03a,04a,04b
 *   node scripts/generation/generate_vertex_imran_batch.mjs            (all missing)
 *
 * A clip whose .mp4 already exists is skipped (--force renders it again).
 * Then: open qa_frames/, and upload with
 *   node scripts/tools/reencode-videos.mjs --new --only=003-aal-e-imran …
 * (see that file), then re-run video-manifest.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const MODEL = "veo-3.1-fast-generate-001";
const DURATION = 8;
const OUTPUT_DIR = path.resolve("public/videos/surah/003-aal-e-imran");
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

// The rules every clip shares (from 01a–02c and their regenerations).
const OPENING =
  "A wide, authentic documentary-cinema static landscape shot filmed from a fixed stationary camera position with all filming equipment completely outside the visible composition";
const CAMERA =
  "The camera is completely motionless with zero pan, tilt, zoom, dolly, tracking, orbit, rotation, drone movement, or artificial parallax. " +
  "Completely consistent ambient illumination throughout the entire 8-second shot, with no moving sun, no time-lapse progression, no shifting shadows, and no exposure change. " +
  "Completely motionless camera framing ensures absolute visual stability, zero parallax shift, and clean loop compatibility. " +
  "Native 16:9 full-screen edge-to-edge frame filling every pixel from top to bottom. Completely clean, unobstructed, borderless edge-to-edge full frame.";
const NEGATIVE =
  "No black bars, no letterboxing, no pillarboxing, no black bands, no widescreen mattes, no film borders, no viewfinder graphics, no camera HUD, no crosshairs, no numbers, no symbols, no text, no logos. " +
  "No camera equipment, no tripod, no tripod legs, no equipment shadow, no filming gear, no modern objects, no roads, no vehicles, no power lines. " +
  "No humans, no faces, no hands, no feet, no bodies, no silhouettes, no footprints, no human traces, no divine figures, no angels, no prophets, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, no casualties, no hellfire, no demons, no souls, no corpses, no graves, no skeletons, no resurrection imagery, " +
  "no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no tents, no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no cosmic portals, no magical particles.";

/** One scene per chapter: place, terrain, light, the one natural motion. */
const CLIPS = [
  {
    id: "03a", name: "03a-the-sanctuary-of-maryam-and-zakariya-prayer", verses: "33–44",
    scene:
      "capturing a secluded, sheltered date-palm grove in a quiet limestone hollow of the Jordan Valley during soft, calm early morning. " +
      "Mature date palms stand at natural intervals, heavy clusters of ripe amber dates hanging beneath the fronds; a small natural spring pool of clear, still water lies at their feet among smooth pale stones and fresh green grass. " +
      "Pale limestone walls of the hollow enclose the grove gently on both sides, open to a soft, pale-gold sky. Palm fronds sway very slightly in a faint breeze.",
    avoid: "No mihrab, no altar, no curtains, no lamps.",
  },
  {
    id: "04a", name: "04a-the-word-from-allah-and-primordial-creation", verses: "45–51",
    scene:
      "capturing a broad, shallow wadi floor in western Arabia shortly after rain, during soft overcast mid-morning light. " +
      "The foreground is fine, damp reddish-brown clay and silt, smooth and freshly settled, with delicate natural mud-crack patterns beginning at the edges and a few thin threads of standing rainwater reflecting the pale sky. " +
      "Low, rounded earthen banks frame the wadi; the first tiny green shoots of desert plants emerge from the moist soil. A gentle, even grey-white sky.",
    avoid: "No sculpted figures, no shaped clay forms, no handprints.",
  },
  {
    id: "04b", name: "04b-the-sincere-disciples-and-elevation-of-isa", verses: "52–63",
    scene:
      "capturing gently rolling green hills of the Galilee above a calm freshwater lake in late afternoon. " +
      "Wild grasses and scattered olive trees cover the hillsides in the foreground; the still lake lies below in the middle distance, its surface faintly rippled. " +
      "Most of the frame is open sky: a vast, high, clear pale-blue sky with a few soft, slow, still cumulus clouds high above. Grasses move very slightly in a light breeze.",
    avoid: "No boats, no fishing nets, no crosses.",
  },
  {
    id: "05a", name: "05a-the-common-word-of-pure-monotheism", verses: "64–80",
    scene:
      "capturing a vast, flat, open steppe plain of upper Mesopotamia near Harran in the calm pre-dawn hour. " +
      "Short dry grasses and low steppe shrubs cover the level ground to a perfectly straight, unbroken horizon. " +
      "The sky is a deep, clear pre-dawn blue fading to a faint pale band along the horizon, with a single bright morning star low in the east and a few faint stars above. Grasses stir very slightly.",
    avoid: "No idols, no statues, no standing stones, no fire.",
  },
  {
    id: "05b", name: "05b-the-primordial-covenant-of-the-prophets", verses: "81–91",
    scene:
      "capturing towering ancient layered sandstone cliffs of Wadi Rum in southern Jordan during warm, steady golden-hour light. " +
      "The cliff face shows long, continuous, unbroken horizontal sedimentary layers in red, ochre and cream bands stretching across the frame. " +
      "In the foreground, soft red sand with gentle wind ripples and a few sparse desert shrubs; fine sand drifts very slightly across the surface.",
    avoid: "No rock carvings, no inscriptions, no petroglyphs.",
  },
  {
    id: "06a", name: "06a-true-giving-bakkah-and-sacred-security", verses: "92–99",
    scene:
      "capturing a dry, rugged valley among the dark granite mountains of the Hejaz, far from any settlement, during calm, hazy mid-afternoon light. " +
      "Weathered dark granite and basalt ridges rise on both sides of a wide valley floor of pale sand and scattered rocks, a few hardy acacia trees standing alone. " +
      "A soft, warm haze softens the distant ridges under a pale, cloudless sky. Acacia leaves move very slightly.",
    avoid: "No city, no towers, no clock tower, no pilgrims, no black cube, no cloth, no walls.",
  },
  {
    id: "06b", name: "06b-holding-fast-to-the-rope-of-allah", verses: "100–109",
    scene:
      "capturing a green mountain valley in the Asir highlands of southwestern Arabia during cool, soft morning light with light mist. " +
      "A single, continuous, clear stream winds unbroken from the foreground into the distance through the valley floor, past ancient stone-edged natural rock shelves covered in grass and juniper trees. " +
      "Soft mist lies in the far valley under a pale sky. The stream water flows gently and naturally.",
    avoid: "No ropes, no bridges, no farm terraces with walls.",
  },
  {
    id: "06c", name: "06c-the-best-nation-and-moral-steadfastness", verses: "110–120",
    scene:
      "capturing a calm Red Sea shoreline of pale coral limestone during clear, bright, steady morning light. " +
      "In the foreground, flat weathered coral rock and white sand meet extremely clear turquoise shallow water; the sea deepens to sapphire blue toward a straight, level horizon under a clean, light-blue sky. " +
      "Small, gentle waves wash softly over the shallows.",
    avoid: "No boats, no swimmers, no piers.",
  },
  {
    id: "07a", name: "07a-the-topography-of-uhud-and-divine-support", verses: "121–138",
    scene:
      "capturing a wide, open sandy plain north of Madinah with a large, dark reddish granite mountain massif rising across the background, during calm, clear early morning light. " +
      "In the foreground, a broad flat plain of pale sand and scattered small stones; in the middle ground, a single small, low rocky hill stands alone on the plain in front of the mountain. " +
      "The mountain's weathered ridges and gullies are sharply visible under a clear, pale-blue sky. Sparse desert grass moves very slightly.",
    avoid: "No city, no buildings, no fences, no battle, no archers, no horses, no banners.",
  },
  {
    id: "07b", name: "07b-fortitude-after-setback-and-divine-pardon", verses: "139–151",
    scene:
      "capturing a broad, dark basalt lava field (harrat) near Madinah under a sky clearing after a passing storm, during soft, steady late-morning light. " +
      "In the foreground, rough black volcanic rock with small pools of fresh rainwater reflecting the sky and a few new green desert plants; a low mountain saddle lies across the distance. " +
      "Thinning grey clouds drift slowly apart, revealing patches of clean blue sky; the light stays even and constant.",
    avoid: "No lightning, no flood, no battle.",
  },
  {
    id: "08a", name: "08a-the-gentle-mercy-and-mutual-consultation", verses: "152–160",
    scene:
      "capturing a peaceful palm oasis in the al-Aqiq valley near Madinah during soft, warm early-morning light with a delicate low mist. " +
      "Many date palms of different heights stand together in a loose, natural grove; a narrow natural water channel runs quietly through soft green ground between them. " +
      "Light mist hangs low between the trunks; the sky is pale and gentle. Palm fronds sway very slightly.",
    avoid: "No gatherings, no seating, no carpets.",
  },
  {
    id: "08b", name: "08b-the-living-martyrs-and-perennial-bounty", verses: "161–175",
    scene:
      "capturing a lush, green, fertile mountain wadi in the Hejaz highlands in bright, soft, steady daylight. " +
      "A clear stream flows over smooth stones through the foreground between fig, pomegranate and date trees heavy with fruit; thick green grass and wildflowers cover the banks. " +
      "Green slopes rise behind under a clear, soft-blue sky. The stream flows gently; leaves move very slightly.",
    avoid: "No paradise fantasy, no glowing fruit, no golden light beams, no birds made of light.",
  },
  {
    id: "09a", name: "09a-the-impotence-of-disbelief-and-moral-trial", verses: "176–184",
    scene:
      "capturing a vast, empty inland salt flat (sabkha) in eastern Arabia under a flat, overcast grey sky, during dull, even midday light. " +
      "The foreground is a hard, cracked white salt crust broken into irregular polygon plates, with a few dry, leafless dead shrubs; the barren flat stretches to a level horizon. " +
      "Fine dust drifts very slightly across the crust.",
    avoid: "No coins, no gold, no treasure, no chains.",
  },
  {
    id: "09b", name: "09b-every-soul-shall-taste-death-and-dominion", verses: "185–189",
    scene:
      "capturing the immense, smooth, sweeping sand dunes of the Rub' al-Khali (Empty Quarter) at calm late dusk. " +
      "Long, curved dune crests in soft apricot and rose tones layer into the far distance under a deepening, quiet twilight sky with the faint first stars. " +
      "The light is soft and steady; a very fine veil of sand blows slightly off the nearest dune crest.",
    avoid: "No skulls, no bones, no graves, no sunset sun disk.",
  },
  {
    id: "10a", name: "10a-ulul-albab-and-contemplation-of-creation", verses: "190–195",
    scene:
      "capturing a clear, dark night sky over a quiet desert plateau in the AlUla region, far from any light. " +
      "The Milky Way arcs across the upper frame among countless steady stars; below, the dark silhouettes of low, natural weathered sandstone outcrops sit on a flat, starlit desert floor. " +
      "The stars hold perfectly steady with only natural faint twinkling.",
    avoid: "No star trails, no rotating sky, no meteors, no auroras, no planets close-up.",
  },
  {
    id: "10b", name: "10b-patience-unshakable-endurance-and-triumph", verses: "196–200",
    scene:
      "capturing a rugged rocky coastline of the Arabian Sea in Dhofar at calm, steady early sunrise light. " +
      "Solid, weathered dark limestone rocks hold firm in the foreground as gentle waves break against them and wash back in white foam; the open sea stretches to a level horizon under a soft pale-gold sky. " +
      "The waves move naturally; the rocks stand unmoved.",
    avoid: "No boats, no lighthouses, no storms.",
  },
];

const promptFor = (c) => `${OPENING}, ${c.scene} ${CAMERA} ${NEGATIVE} ${c.avoid}`;

// ── CLI ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map((s) => s.trim()).filter(Boolean);
const outFile = (c) => path.join(OUTPUT_DIR, `${c.name}.mp4`);

const picked = CLIPS.filter((c) => !only || only.includes(c.id));
if (only && picked.length !== only.length) {
  const known = new Set(CLIPS.map((c) => c.id));
  console.error(`Unknown id(s): ${only.filter((id) => !known.has(id)).join(", ")}. Known: ${[...known].join(" ")}`);
  process.exit(1);
}

if (flag("list")) {
  for (const c of CLIPS) console.log(`${fs.existsSync(outFile(c)) ? "done" : "todo"}  ${c.id}  ${c.verses.padEnd(8)}  ${c.name}`);
  process.exit(0);
}
if (flag("dry-run")) {
  for (const c of picked) console.log(`\n── ${c.id} (${c.verses}) ${c.name}\n${promptFor(c)}`);
  process.exit(0);
}

// ── Render ──────────────────────────────────────────────────────────────────
async function render(ai, c, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`\n🎬 ${c.id} (${c.verses}) ${c.name} — attempt ${attempt}/${maxRetries}`);
    try {
      let op = await ai.models.generateVideos({
        model: MODEL,
        source: { prompt: promptFor(c) },
        config: { aspectRatio: "16:9", durationSeconds: DURATION, resolution: "1080p" },
      });
      let polls = 0;
      while (!op.done) {
        polls++;
        await new Promise((r) => setTimeout(r, 6000));
        try {
          op = await ai.operations.getVideosOperation({ operation: op });
        } catch (e) {
          console.warn(`  poll ${polls}: ${e.message}`);
        }
      }
      if (op.error) throw new Error(JSON.stringify(op.error));
      const video = op.response?.generatedVideos?.[0]?.video;
      const bytes = video?.videoBytes || video?.bytesBase64Encoded;
      if (!bytes) throw new Error(`no video bytes: ${JSON.stringify(op.response)}`);
      const raw = path.join(OUTPUT_DIR, `${c.name}-1080p-raw-master.mp4`);
      fs.writeFileSync(raw, Buffer.from(bytes, "base64"));
      console.log(`  ✓ raw master ${raw}`);
      return { raw, operationId: op.name };
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      if (attempt === maxRetries) throw e;
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

const sh = (cmd) => execSync(cmd, { stdio: "ignore" });
const probe = (file) =>
  JSON.parse(
    execSync(`ffprobe -v error -show_entries format=duration,size:stream=width,height,r_frame_rate,codec_name,pix_fmt -of json "${file}"`, {
      encoding: "utf8",
    })
  );

function letterbox(file) {
  try {
    const out = execSync(`ffmpeg -i "${file}" -vf cropdetect=24:16:0 -f null -t 3 - 2>&1`, { encoding: "utf8" });
    const m = [...out.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)].pop();
    return m ? { w: +m[1], h: +m[2], x: +m[3], y: +m[4] } : null;
  } catch {
    return null;
  }
}

/** Raw master → 1080p loop with a 0.6 s crossfade seam, plus QA frames. */
function encode(c, raw) {
  const p = probe(raw);
  const dur = Number(p.format?.duration || DURATION);
  const w = p.streams?.[0]?.width || 1920;
  const h = p.streams?.[0]?.height || 1080;
  const crop = letterbox(raw);
  const pre = crop && crop.h < h * 0.98 ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},scale=${w}:${h}:flags=lanczos,` : "";
  if (pre) console.log(`  ⚠️ letterbox ${crop.w}x${crop.h} — cropped`);
  const overlap = 0.6;
  const cut = (dur - overlap).toFixed(3);
  const out = outFile(c);
  const graph =
    `[0:v]${pre}scale=1920:1080:flags=lanczos,split=2[v1][v2];` +
    `[v1]trim=start=${overlap}:end=${dur},setpts=PTS-STARTPTS[body];` +
    `[v2]trim=start=0:end=${overlap},setpts=PTS-STARTPTS[head];` +
    `[0:v]${pre}scale=1920:1080:flags=lanczos,trim=start=${cut}:end=${dur},setpts=PTS-STARTPTS[tail];` +
    `[tail][head]xfade=transition=fade:duration=${overlap}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  sh(`ffmpeg -y -i "${raw}" -filter_complex "${graph}" -map "[outv]" -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 21 -movflags +faststart -an "${out}"`);
  for (const t of [0, 2, 4, 6]) sh(`ffmpeg -y -ss ${t} -i "${out}" -vframes 1 "${path.join(QA_DIR, `${c.name}_${t}s.png`)}"`);
  sh(`ffmpeg -y -sseof -0.05 -i "${out}" -vframes 1 "${path.join(QA_DIR, `${c.name}_8s.png`)}"`);
  sh(`ffmpeg -y -stream_loop 2 -i "${out}" -c copy "${path.join(QA_DIR, `${c.name}_loop_3x_test.mp4`)}"`);
  const f = probe(out);
  console.log(`  ✓ ${out} (${f.streams[0].width}x${f.streams[0].height}, ${Number(f.format.duration).toFixed(2)} s, ${(f.format.size / 1048576).toFixed(1)} MB)`);
  return { file: out, duration: Number(f.format.duration), sizeMB: +(f.format.size / 1048576).toFixed(2) };
}

async function main() {
  const todo = picked.filter((c) => flag("force") || !fs.existsSync(outFile(c)));
  if (todo.length === 0) return console.log("Nothing to render (all exist; --force to redo).");
  console.log(`Rendering ${todo.length} clip(s) × ${DURATION} s with ${MODEL}: ${todo.map((c) => c.id).join(" ")}`);
  fs.mkdirSync(QA_DIR, { recursive: true });
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });
  const results = [];
  for (const c of todo) {
    try {
      const { raw, operationId } = await render(ai, c);
      results.push({ id: c.id, name: c.name, verses: c.verses, model: MODEL, operationId, ...encode(c, raw) });
    } catch (e) {
      results.push({ id: c.id, name: c.name, error: e.message });
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, "generation_results_batch.json"), JSON.stringify(results, null, 2));
  }
  const failed = results.filter((r) => r.error);
  console.log(`\nDone: ${results.length - failed.length} ok, ${failed.length} failed${failed.length ? ` (${failed.map((r) => r.id).join(" ")})` : ""}.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
