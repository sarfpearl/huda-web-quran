#!/usr/bin/env node
/**
 * Aal-Imran's 16 chapter clips that were never rendered (03a … 10b), in the
 * style of the four that exist (generate_vertex_imran_01a … 02c): one 8 s
 * shot from a fixed camera, Veo 3.1 Fast on Vertex AI, 1080p, no audio, then
 * a 0.6 s cross-fade seam so it loops, plus QA frames (0 / 4 / 8 s).
 *
 *   node scripts/generation/generate_vertex_imran_rest.mjs --dry-run      # prompts + cost, no calls
 *   node scripts/generation/generate_vertex_imran_rest.mjs                # every clip not on disk yet
 *   node scripts/generation/generate_vertex_imran_rest.mjs --only 03a,04b # just these (re-takes too)
 *
 * Needs gcloud application-default credentials for the project below.
 * Output: public/videos/surah/003-aal-e-imran/<name>.mp4 (the loop master,
 * git-ignored) + <name>-1080p-raw-master.mp4; then encode / upload with
 * scripts/tools/reencode-videos.mjs --new and re-run video-manifest.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PROJECT_ID = "gen-lang-client-0172381348";
const LOCATION = "us-central1";
const MODEL = "veo-3.1-fast-generate-001";
// Vertex list price for Veo 3.1 Fast, video without audio (USD / second).
const PRICE_PER_SECOND = 0.1;
const DURATION = 8;
const OUTPUT_DIR = path.resolve("public/videos/surah/003-aal-e-imran");
const QA_DIR = path.join(OUTPUT_DIR, "qa_frames");

// Shared with the existing clips: a still, documentary landscape that loops,
// nothing that depicts people, prophets, worship or the unseen.
const CAMERA =
  "Authentic documentary-cinema landscape shot from a completely fixed, stationary camera locked off on a tripod: zero pan, tilt, zoom, dolly, push-in, tracking, orbit or drone movement, no artificial parallax. " +
  // Takes of 05a / 06a pushed in along a valley or track: say it plainly.
  "Every rock, tree and ridge stays at exactly the same position and size in the frame from the first frame to the last. " +
  "Only gentle, physically believable natural motion (wind in plants, drifting mist or dust, moving water) so the shot loops cleanly. " +
  "Completely consistent light through the whole 8-second shot: no time-lapse, no moving sun, no shifting shadows, no exposure change. ";
const FRAME =
  "Native 16:9 frame filled edge to edge: no black bars, no letterboxing, no borders, no camera HUD, no text, no numbers, no symbols, no logos, no watermark. " +
  "No camera equipment, tripod or equipment shadow, no modern objects. ";
const NEGATIVE =
  "No humans, no faces, no hands, no bodies, no silhouettes, no footprints, no animals, no prophets, no angels, no worshippers, no prayer pose, no crowds, no soldiers, no weapons, no blood, " +
  "no graves, no skeletons, no mosque, no minarets, no Kaaba, no buildings, no ruins, no shrines, no roads, no fences, " +
  "no fantasy CGI, no glowing objects, no halos, no god rays, no celestial beams, no supernatural light, no magical particles.";

const CLIPS = [
  {
    id: "03a", name: "03a-the-sanctuary-of-maryam-and-zakariya-prayer", verses: "33–44",
    scene: "A secluded, sheltered canyon basin in the Hijaz mountains in soft early-morning light. In the middle ground stands a single ancient, weathered wild olive tree with a gnarled trunk, its branches carrying fresh pale-green shoots and fine dew drops; its leaves stir slightly in a faint breeze. Smooth ochre canyon walls rise gently behind it; a thin layer of mist rests on the basin floor of fine sand and scattered stones.",
  },
  {
    id: "04a", name: "04a-the-word-from-allah-and-primordial-creation", verses: "45–51",
    scene: "A low, wide view across a dry wadi floor of cracked red clay under a soft overcast sky. Gentle, steady natural rain falls across the frame; the drops darken and soften the clay, small puddles form in the cracks, and tiny green sprouts stand among the stones in the foreground. Low rounded desert hills fade into the rain haze in the distance.",
  },
  {
    id: "04b", name: "04b-the-sincere-disciples-and-elevation-of-isa", verses: "52–63",
    // Take 1 came out as Monument Valley's "Mitten" butte (USA) with a
    // thumb-shaped spur — the look 02c already had to rule out.
    scene: "In the Hisma desert of north-western Saudi Arabia near AlUla, a single, isolated natural sandstone pillar rises from a flat sea of soft orange sand into a clear, deep azure sky, seen from a distance so the whole pillar stands in the centre of the frame. The pillar is one solid, smooth, wind-rounded column of layered rose and ochre sandstone with a rounded top, wider at its base, with no side spurs. Warm late-morning sunlight; fine sand drifts slowly across the flat ground at its base; a few dry desert shrubs move in the wind.",
    negativeExtra: "No other towers, no arches, no clouds touching the pillar, no mitten shape, no thumb-shaped spur, no side fingers or horns, no American Southwest, no Monument Valley. ",
  },
  {
    id: "05a", name: "05a-the-common-word-of-pure-monotheism", verses: "64–80",
    // Take 1: a track running away from the lens made Veo dolly forward
    // along it (shrubs moved between frames) — now seen side-on from a rise.
    scene: "A wide view from a low rise looking across a broad, level desert plateau under a clear morning sky. One single, natural ancient track of smooth, worn pale bedrock crosses the whole frame diagonally from the lower left to the far right horizon with no branches or forks; on both sides lies dark coarse gravel and pale sand with sparse low shrubs moving slightly in the wind. Faint heat shimmer at the horizon. The camera is locked off on a fixed point and never moves forward.",
    negativeExtra: "No paved road, no tyre tracks, no road markings, no second path, no forward camera movement, no walking point of view. ",
  },
  {
    id: "05b", name: "05b-the-primordial-covenant-of-the-prophets", verses: "81–91",
    scene: "A tall natural cliff face of sedimentary rock seen straight on, filling most of the frame: dozens of unbroken, parallel horizontal strata in bands of cream, ochre, rust and grey, continuous from one side of the frame to the other. Soft, even afternoon light; fine sand trickles down a few ledges and a thin dust haze drifts slowly past.",
  },
  {
    id: "06a", name: "06a-true-giving-bakkah-and-sacred-security", verses: "92–99",
    // Take 1 pushed in along the valley: now a side-on view across it.
    scene: "A calm, sheltered valley among rugged dark granite mountains of the Hijaz, seen side-on from a fixed point on its slope, looking across the valley to the mountain wall opposite, in soft golden early-morning light. The valley floor is fine pale sand with scattered rounded stones and a few low acacia trees whose leaves barely move; the mountains rise protectively on every side, and a light haze rests still in the valley.",
    negativeExtra: "No city, no clock tower, no lights, no people, no pilgrims, no structures of any kind, no forward camera movement. ",
  },
  {
    id: "06b", name: "06b-holding-fast-to-the-rope-of-allah", verses: "100–109",
    scene: "A close, low view of the base of an ancient desert acacia tree growing from a fissure in pale grey granite bedrock. Its thick, twisted roots are deeply intertwined with one another and locked firmly into the cracks of the rock; fine sand drifts slowly over the stone, and the small leaves above stir in a light breeze. Warm, soft side light.",
    negativeExtra: "No ropes, no cords, no hands. ",
  },
  {
    id: "06c", name: "06c-the-best-nation-and-moral-steadfastness", verses: "110–120",
    scene: "A wide desert landscape where a dense, continuous line of resilient thorny desert scrub and low tamarisk forms a natural windbreak across the middle ground. Wind blows fine sand in thin streams from the left; the sand gathers against the green line of shrubs while the ground behind them stays calm and settled. Clear, bright late-afternoon light.",
  },
  {
    id: "07a", name: "07a-the-topography-of-uhud-and-divine-support", verses: "121–138",
    scene: "A long mountain range of red and pink granite with dark spurs, rising behind a flat plain of black volcanic basalt stones near Madinah, in crisp, clear early-morning light. The sky is pale blue with a few thin high clouds; a faint dust haze drifts slowly across the plain; sparse dry grass moves slightly in the foreground.",
  },
  {
    id: "07b", name: "07b-fortitude-after-setback-and-divine-pardon", verses: "139–151",
    scene: "A rugged, windswept mountain saddle between two weather-beaten bedrock peaks. On the slopes below the pass, loose grey scree lies in long fans, with a few small stones and fine dust slowly sliding down; the solid rock heights above stand completely still. Cool, clear morning light and a thin veil of drifting cloud passing behind the pass.",
  },
  {
    id: "08a", name: "08a-the-gentle-mercy-and-mutual-consultation", verses: "152–160",
    scene: "A quiet, natural sandstone amphitheatre — a broad, curved bowl of smooth rose-coloured rock walls — in calm early morning. Soft, natural morning light enters through a wide alcove in the rock and falls gently across the sandy floor; fine dust floats slowly in the air; a few small desert plants grow at the foot of the walls.",
  },
  {
    id: "08b", name: "08b-the-living-martyrs-and-perennial-bounty", verses: "161–175",
    scene: "A perennial, crystal-clear mountain stream flowing over smooth stones through a high, green mountain valley terrace. Lush emerald grasses, ferns and small trees line both banks; the water ripples and sparkles in soft morning light; leaves move gently in a breeze. Mountain slopes rise softly in the background.",
  },
  {
    id: "09a", name: "09a-the-impotence-of-disbelief-and-moral-trial", verses: "176–184",
    scene: "A vast, flat, salt-encrusted clay sabkha stretching to a dull horizon under a pale, hazy sky. The ground is a pattern of cracked white and grey salt crust; a steady wind lifts the fragile surface crust into fine dust that drifts low across the flat ground and thins away. Flat, even midday light.",
  },
  {
    id: "09b", name: "09b-every-soul-shall-taste-death-and-dominion", verses: "185–189",
    scene: "A field of ancient, wind-sculpted yardang rock ridges — long, streamlined, low formations of pale sandstone — standing silently in rows across a flat desert floor, under a vast, deep blue twilight sky with a soft band of fading orange light along the horizon. Fine sand drifts slowly between the ridges. Calm and still.",
  },
  {
    id: "10a", name: "10a-ulul-albab-and-contemplation-of-creation", verses: "190–195",
    scene: "A clear, dark desert night far from any light: the Milky Way and a dense field of stars arch across the sky above the dark silhouette of a long granite ridge along the bottom of the frame. The stars move very slowly and steadily across the sky as in a real long-exposure astrophotography sequence; a faint blue glow of airglow sits low on the horizon.",
    negativeExtra: "No shooting stars, no comets, no satellites, no aircraft, no moon. ",
  },
  {
    id: "10b", name: "10b-patience-unshakable-endurance-and-triumph", verses: "196–200",
    scene: "A view from a high mountain pass looking out over a wide sea of soft dawn clouds that fills the valleys below; dark mountain peaks rise through the clouds, and warm golden light crowns the horizon and the cloud tops. The clouds drift very slowly; the light stays constant. Calm, serene and majestic.",
  },
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only"));
const only = onlyArg ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : args[args.indexOf(onlyArg) + 1]).split(",") : null;

const promptOf = (c) => CAMERA + c.scene + " " + FRAME + (c.negativeExtra ?? "") + NEGATIVE;
const webPath = (c) => path.join(OUTPUT_DIR, `${c.name}.mp4`);
const rawPath = (c) => path.join(OUTPUT_DIR, `${c.name}-1080p-raw-master.mp4`);

const todo = CLIPS.filter((c) => (only ? only.includes(c.id) : !fs.existsSync(webPath(c))));

console.log(`${todo.length} clip(s): ${todo.map((c) => c.id).join(", ") || "none"}`);
console.log(`Estimated cost: ${todo.length} × ${DURATION} s × $${PRICE_PER_SECOND} = $${(todo.length * DURATION * PRICE_PER_SECOND).toFixed(2)} (one take each)\n`);
if (dryRun) {
  for (const c of todo) console.log(`── ${c.id} (verses ${c.verses})\n${promptOf(c)}\n`);
  process.exit(0);
}

const { GoogleGenAI } = await import("@google/genai");
const ai = new GoogleGenAI({ vertexai: true, project: PROJECT_ID, location: LOCATION });
fs.mkdirSync(QA_DIR, { recursive: true });

const ff = (...a) => execFileSync("ffmpeg", ["-y", "-v", "error", ...a], { stdio: "pipe" });
const probe = (file) =>
  JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=width,height", "-of", "json", file], { encoding: "utf8" }),
  );

async function generate(c) {
  let op = await ai.models.generateVideos({
    model: MODEL,
    source: { prompt: promptOf(c) },
    config: { aspectRatio: "16:9", durationSeconds: DURATION, resolution: "1080p", generateAudio: false, numberOfVideos: 1 },
  });
  const started = Date.now();
  while (!op.done) {
    await new Promise((r) => setTimeout(r, 8000));
    try {
      op = await ai.operations.getVideosOperation({ operation: op });
    } catch (e) {
      console.warn(`  poll: ${e.message}`);
    }
    if (Date.now() - started > 15 * 60 * 1000) throw new Error("timed out after 15 min");
  }
  if (op.error) throw new Error(JSON.stringify(op.error));
  const video = op.response?.generatedVideos?.[0]?.video;
  const bytes = video?.videoBytes || video?.bytesBase64Encoded;
  if (!bytes) {
    const filtered = op.response?.raiMediaFilteredReasons;
    throw new Error(`no video returned${filtered ? ` (filtered: ${filtered.join("; ")})` : ""}`);
  }
  fs.writeFileSync(rawPath(c), Buffer.from(bytes, "base64"));
}

// The loop: the last 0.6 s cross-fades into the first 0.6 s (as 01a … 02c).
function encodeLoop(c) {
  const raw = rawPath(c);
  const dur = Number(probe(raw).format.duration) || DURATION;
  const ov = 0.6;
  const cut = (dur - ov).toFixed(3);
  const graph =
    `[0:v]scale=1920:1080:flags=lanczos,split=2[v1][v2];` +
    `[v1]trim=start=${ov}:end=${dur},setpts=PTS-STARTPTS[body];` +
    `[v2]trim=start=0:end=${ov},setpts=PTS-STARTPTS[head];` +
    `[0:v]scale=1920:1080:flags=lanczos,trim=start=${cut}:end=${dur},setpts=PTS-STARTPTS[tail];` +
    `[tail][head]xfade=transition=fade:duration=${ov}:offset=0[seam];[body][seam]concat=n=2:v=1:a=0[outv]`;
  ff("-i", raw, "-filter_complex", graph, "-map", "[outv]", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "21", "-movflags", "+faststart", "-an", webPath(c));
  for (const t of [0, 4]) ff("-ss", String(t), "-i", webPath(c), "-vframes", "1", path.join(QA_DIR, `${c.name}_${t}s.png`));
  ff("-sseof", "-0.05", "-i", webPath(c), "-vframes", "1", path.join(QA_DIR, `${c.name}_8s.png`));
}

const results = [];
for (const c of todo) {
  console.log(`🎬 ${c.id} ${c.name} (verses ${c.verses})`);
  try {
    let ok = false;
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
      try {
        await generate(c);
        ok = true;
      } catch (e) {
        console.error(`  attempt ${attempt}: ${e.message}`);
        if (attempt === 2) throw e;
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
    encodeLoop(c);
    const p = probe(webPath(c));
    const mb = (fs.statSync(webPath(c)).size / 1048576).toFixed(1);
    console.log(`  ✓ ${p.streams[0].width}x${p.streams[0].height}, ${Number(p.format.duration).toFixed(2)} s, ${mb} MB`);
    results.push({ id: c.id, ok: true, mb });
  } catch (e) {
    console.error(`  ✗ ${c.id}: ${e.message}`);
    results.push({ id: c.id, ok: false, error: e.message });
  }
}
fs.writeFileSync(path.join(OUTPUT_DIR, "generation_results_rest.json"), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok);
console.log(`\nDone: ${results.length - failed.length} ok, ${failed.length} failed${failed.length ? ` (${failed.map((r) => r.id).join(", ")})` : ""}`);
