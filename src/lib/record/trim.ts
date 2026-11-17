/**
 * Record: the file that is shared — the recording cut to the trim handles.
 *
 * Mediabunny (MPL-2.0, free; loaded only here, so the app itself carries
 * none of it) copies the encoded frames between the handles without
 * re-encoding: seconds, not minutes, even for 10 minutes. The cut starts at
 * the key frame at or before the start handle (one every second on Chrome).
 * It also turns MediaRecorder's fragmented / duration-less output into a
 * plain MP4 / WebM that WhatsApp and Instagram take.
 *
 * WebM recordings (Firefox) are converted to MP4 when this browser can
 * encode H.264 + AAC (re-encoded, slower); otherwise they stay WebM.
 */

import { opfsWritable } from "./chunkSink";

export interface ExportResult {
  file: File;
  /** WebM kept: this browser can't make MP4. */
  webm: boolean;
}

export async function exportClip(
  source: File,
  opts: { start: number; end: number; name: string; onProgress?: (p: number) => void },
): Promise<ExportResult> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(source), formats: mb.ALL_FORMATS });
  const isMp4 = source.type.includes("mp4");
  let toMp4 = isMp4;
  if (!isMp4) {
    toMp4 = (await mb.canEncodeVideo("avc").catch(() => false)) && (await mb.canEncodeAudio("aac").catch(() => false));
  }
  const ext = toMp4 ? "mp4" : "webm";
  const name = opts.name.replace(/\.(mp4|webm)$/, "") + `.${ext}`;
  const disk = await opfsWritable(`export-${Date.now()}.${ext}`);
  const target = disk ? new mb.StreamTarget(disk.stream as WritableStream<never>) : new mb.BufferTarget();
  const output = new mb.Output({ format: toMp4 ? new mb.Mp4OutputFormat() : new mb.WebMOutputFormat(), target });
  const conversion = await mb.Conversion.init({
    input,
    output,
    trim: { start: opts.start, end: opts.end },
    ...(toMp4 && !isMp4 ? { video: { codec: "avc" as const }, audio: { codec: "aac" as const } } : {}),
    copy: { mode: "preferred", boundaryPolicy: "expand" },
    showWarnings: false,
  });
  if (!conversion.isValid) throw new Error(`export: ${conversion.discardedTracks.map((d) => d.reason).join(", ")}`);
  if (opts.onProgress) conversion.onProgress = (p) => opts.onProgress!(p);
  await conversion.execute();
  const type = toMp4 ? "video/mp4" : "video/webm";
  const blob = disk ? await disk.file() : new Blob([(target as InstanceType<typeof mb.BufferTarget>).buffer!], { type });
  return { file: new File([blob], name, { type }), webm: !toMp4 };
}
