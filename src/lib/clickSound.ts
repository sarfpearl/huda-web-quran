/**
 * A short soft "click" for the voice search button (start / stop listening).
 *
 * Synthesised once into a tiny WAV data URI and played through one reused
 * <audio> element — not Web Audio, which takes over the audio session on iOS.
 * The element is first played inside a tap, so iOS then also lets it play the
 * stop click when listening ends on its own.
 */
let el: HTMLAudioElement | null = null;

function clickWav(): string {
  const rate = 22050;
  const n = Math.round(rate * 0.035);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, n * 2, true);
  // A 1.8 kHz tone with a fast decay, plus a touch of noise for the "tick".
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 140);
    const s = (Math.sin(2 * Math.PI * 1800 * t) * 0.8 + (Math.random() * 2 - 1) * 0.2) * env;
    v.setInt16(44 + i * 2, Math.round(s * 0.5 * 32767), true);
  }
  let bin = "";
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

export function playClick() {
  if (typeof window === "undefined") return;
  try {
    if (!el) {
      el = new Audio(clickWav());
      el.volume = 0.6;
    }
    el.currentTime = 0;
    void el.play().catch(() => {});
  } catch {
    /* no audio — silent */
  }
}
