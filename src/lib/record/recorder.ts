/**
 * Record: canvas frames + the player's audio → MediaRecorder → on-device file.
 *
 * MP4 (H.264 + AAC) where the browser can record it — Safari, Chrome / Edge
 * 126+ (Android included) — since WhatsApp and Instagram want MP4. Firefox
 * records WebM only (see webmOnly / trim.ts toMp4).
 */

import { ensureAudioTap } from "./audioTap";
import { openChunkSink, type ChunkSink } from "./chunkSink";
import { FrameComposer } from "./frameComposer";

export type Quality = "1080" | "720";
export type Shape = "9:16" | "1:1" | "16:9";

/** Frame size: the short side is the quality (1080 / 720). */
export function frameSize(shape: Shape, quality: Quality): { width: number; height: number } {
  const s = Number(quality);
  if (shape === "1:1") return { width: s, height: s };
  const long = Math.round((s * 16) / 9 / 2) * 2;
  return shape === "9:16" ? { width: s, height: long } : { width: long, height: s };
}

/**
 * Bitrate: the file size. The frame is mostly a soft, dark clip behind
 * still text, which H.264 keeps sharp at these rates (measured: see the PR).
 */
export const VIDEO_BPS: Record<Quality, number> = { "1080": 3_000_000, "720": 1_500_000 };
const AUDIO_BPS = 128_000;
const FPS = 30;

const TYPES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.4d0028,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

/** The best format this browser records, or null (no MediaRecorder / canvas capture). */
export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export const recordingSupported = () => typeof window !== "undefined" && pickMimeType() !== null;
export const webmOnly = () => !!pickMimeType()?.startsWith("video/webm");
export const extFor = (type: string) => (type.startsWith("video/mp4") ? "mp4" : "webm");

export interface Session {
  composer: FrameComposer;
  /** Starts writing (call once the recitation is playing). */
  start(): void;
  /** Seconds recorded so far. */
  elapsed(): number;
  stop(): Promise<File>;
  cancel(): Promise<void>;
}

/**
 * Prepares a recording: the audio tap (call from the Start tap — iOS starts
 * audio only in a gesture), the canvas and its draw loop, the file on disk.
 */
export async function prepareSession(opts: { shape: Shape; quality: Quality; fileName: string; title: () => string }): Promise<Session> {
  const type = pickMimeType();
  if (!type) throw new Error("unsupported");
  const tap = ensureAudioTap();
  const size = frameSize(opts.shape, opts.quality);
  const composer = new FrameComposer({ ...size, title: opts.title });
  const sink: ChunkSink = await openChunkSink(opts.fileName);

  // Draw loop: animation frames while the page is in view; a timer keeps
  // frames coming when the browser holds those back (tab in the background).
  let raf = 0;
  let last = 0;
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    if (now - last < 1000 / FPS - 2) return;
    last = now;
    composer.draw(now);
  };
  raf = requestAnimationFrame(frame);
  const backup = setInterval(() => {
    if (performance.now() - last > 250) {
      last = performance.now();
      composer.draw(last);
    }
  }, 100);
  composer.draw();

  const video = composer.canvas.captureStream(FPS);
  const stream = new MediaStream([...video.getVideoTracks(), ...tap.dest.stream.getAudioTracks()]);
  const rec = new MediaRecorder(stream, {
    mimeType: type,
    videoBitsPerSecond: VIDEO_BPS[opts.quality],
    audioBitsPerSecond: AUDIO_BPS,
    // A key frame every second (Chrome): trim cuts without re-encoding,
    // at most a second outside the handles.
    ...({ videoKeyFrameIntervalDuration: 1000 } as object),
  });
  const writes: Promise<void>[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) writes.push(sink.write(e.data));
  };
  let startedAt = 0;
  let stoppedAt = 0;

  const teardown = () => {
    cancelAnimationFrame(raf);
    clearInterval(backup);
    video.getTracks().forEach((t) => t.stop());
    composer.dispose();
  };

  const finish = () =>
    new Promise<void>((resolve) => {
      if (rec.state === "inactive") return resolve();
      rec.onstop = () => resolve();
      rec.stop();
    });

  return {
    composer,
    start() {
      if (rec.state !== "inactive") return;
      rec.start(1000);
      startedAt = performance.now();
    },
    elapsed() {
      return startedAt ? ((stoppedAt || performance.now()) - startedAt) / 1000 : 0;
    },
    async stop() {
      stoppedAt = performance.now();
      await finish();
      teardown();
      await Promise.all(writes);
      return sink.finish(type.split(";")[0]);
    },
    async cancel() {
      await finish();
      teardown();
      await Promise.all(writes).catch(() => {});
      await sink.discard();
    },
  };
}
