/**
 * Record: draws one video frame — the scene's background clip (or artwork),
 * the ayah with its word highlight, the meaning, the HuDa logo and link — onto
 * the recording canvas.
 *
 * Everything is read from the page as the app shows it (the verse stage's
 * word spans and their computed colours, the meaning pane, the visible
 * background <video>), so the recording follows the app's own sync, Tajweed /
 * IndoPak choice and meaning language without a second copy of that logic.
 * The layout is the recorder's own, fitted to the chosen frame size.
 */

import { corsUrl } from "./corsMedia";

export const SITE_LINK = "www.hudaguidance.com";

type Token = { text: string; color: string; font: string };
type Stage = {
  key: string;
  arabic: Token[];
  /** The ayah number, drawn as the Hafs font's rosette after the last word. */
  ayah: number | null;
  meaning: Token[];
  meaningDir: "ltr" | "rtl";
};

type Placed = { text: string; x: number; y: number; w: number; idx: number };
type Block = { size: number; lineH: number; placed: Placed[]; height: number };

function uiFontFamily(): string {
  const poppins = getComputedStyle(document.documentElement).getPropertyValue("--font-poppins").trim();
  return poppins ? `${poppins}, sans-serif` : "Poppins, sans-serif";
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const toArabicNumerals = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

function readStage(): Stage | null {
  const stage = document.querySelector<HTMLElement>("[data-verse-stage]");
  const h2 = stage?.querySelector<HTMLElement>('h2[lang="ar"]');
  if (!stage || !h2) return null;
  const h2Style = getComputedStyle(h2);
  let ayah: number | null = null;
  const arabic: Token[] = [];
  h2.querySelectorAll<HTMLElement>("[data-word-idx]").forEach((el) => {
    // Glyph words (Tajweed page fonts) carry the plain text for screen readers.
    const text = (el.querySelector(".sr-only")?.textContent ?? el.textContent ?? "").trim();
    if (!text) return;
    const cs = getComputedStyle(el);
    arabic.push({ text, color: cs.color, font: cs.fontFamily });
    const m = /^\d+:(\d+):\d+$/.exec(el.dataset.wordId ?? "");
    if (m) ayah = Number(m[1]);
  });
  if (!arabic.length) {
    const text = (h2.textContent ?? "").trim();
    if (text) arabic.push(...text.split(/\s+/).map((w) => ({ text: w, color: h2Style.color, font: h2Style.fontFamily })));
  }
  const p = stage.querySelector<HTMLElement>("p[data-fit-text]");
  const meaning: Token[] = [];
  let meaningDir: "ltr" | "rtl" = "ltr";
  if (p && p.offsetParent !== null) {
    const ps = getComputedStyle(p);
    meaningDir = ps.direction === "rtl" ? "rtl" : "ltr";
    const spans = p.querySelectorAll<HTMLElement>(":scope > span");
    if (spans.length) {
      spans.forEach((s) => {
        const text = (s.textContent ?? "").trim();
        if (text) meaning.push({ text, color: getComputedStyle(s).color, font: ps.fontFamily });
      });
    } else {
      for (const w of (p.textContent ?? "").split(/\s+/)) if (w) meaning.push({ text: w, color: ps.color, font: ps.fontFamily });
    }
  }
  const key = `${arabic.map((t) => t.text).join(" ")}|${ayah}|${meaning.map((t) => t.text).join(" ")}`;
  return { key, arabic, ayah, meaning, meaningDir };
}

/** The scene's background as the page shows it: the top visible clip, else the artwork. */
function visibleBackground(own: Set<HTMLVideoElement>): HTMLVideoElement | HTMLImageElement | null {
  let best: HTMLVideoElement | null = null;
  let bestZ = -Infinity;
  document.querySelectorAll("video").forEach((v) => {
    if (own.has(v) || !v.currentSrc || v.readyState < 2) return;
    const cs = getComputedStyle(v);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.5) return;
    const r = v.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.6) return;
    const z = Number(cs.zIndex) || 0;
    if (z >= bestZ) {
      bestZ = z;
      best = v;
    }
  });
  if (best) return best;
  let img: HTMLImageElement | null = null;
  let area = 0;
  document.querySelectorAll("img").forEach((el) => {
    if (!el.currentSrc || !el.complete || !el.naturalWidth) return;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < window.innerWidth * window.innerHeight * 0.6) return;
    if (Number(getComputedStyle(el).opacity) < 0.5) return;
    if (r.width * r.height >= area) {
      area = r.width * r.height;
      img = el;
    }
  });
  return img;
}

/** A CORS-clean copy of the page's background clip, kept in step with it. */
class BackgroundMirror {
  own = new Set<HTMLVideoElement>();
  private cur: { src: string; el: HTMLVideoElement | HTMLImageElement; since: number } | null = null;
  private prev: { el: HTMLVideoElement | HTMLImageElement } | null = null;
  private loading: { src: string; el: HTMLVideoElement | HTMLImageElement } | null = null;
  private lastSync = 0;

  private load(src: HTMLVideoElement | HTMLImageElement) {
    const url = src.currentSrc;
    if (src instanceof HTMLVideoElement) {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.loop = src.loop;
      v.crossOrigin = "anonymous";
      v.preload = "auto";
      v.src = corsUrl(url);
      this.own.add(v);
      v.addEventListener(
        "loadeddata",
        () => {
          try {
            v.currentTime = src.currentTime;
          } catch {
            /* ignore */
          }
          void v.play().catch(() => {});
          this.ready(url, v);
        },
        { once: true },
      );
      this.loading = { src: url, el: v };
    } else {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.decoding = "async";
      im.onload = () => this.ready(url, im);
      im.src = corsUrl(url);
      this.loading = { src: url, el: im };
    }
  }

  private ready(url: string, el: HTMLVideoElement | HTMLImageElement) {
    if (this.loading?.src !== url) return;
    this.loading = null;
    if (this.prev?.el instanceof HTMLVideoElement) this.drop(this.prev.el);
    this.prev = this.cur ? { el: this.cur.el } : null;
    this.cur = { src: url, el, since: performance.now() };
  }

  private drop(v: HTMLVideoElement) {
    v.pause();
    v.removeAttribute("src");
    v.load();
    this.own.delete(v);
  }

  /** Follows the page; returns what to draw (with the incoming one's fade). */
  layers(now: number): { el: HTMLVideoElement | HTMLImageElement; alpha: number }[] {
    const src = visibleBackground(this.own);
    if (src && src.currentSrc !== this.cur?.src && src.currentSrc !== this.loading?.src) this.load(src);
    // Drift: the page's clip is the clock (it loops and follows the scene).
    if (src instanceof HTMLVideoElement && this.cur?.el instanceof HTMLVideoElement && this.cur.src === src.currentSrc && now - this.lastSync > 1000) {
      this.lastSync = now;
      const m = this.cur.el;
      if (Math.abs(m.currentTime - src.currentTime) > 0.6 && !m.seeking) {
        try {
          m.currentTime = src.currentTime;
        } catch {
          /* ignore */
        }
      }
      if (m.paused && !src.paused) void m.play().catch(() => {});
    }
    const out: { el: HTMLVideoElement | HTMLImageElement; alpha: number }[] = [];
    if (!this.cur) return out;
    const fade = Math.min(1, (now - this.cur.since) / 700);
    if (fade < 1 && this.prev) out.push({ el: this.prev.el, alpha: 1 });
    out.push({ el: this.cur.el, alpha: this.prev ? fade : 1 });
    return out;
  }

  dispose() {
    for (const v of [...this.own]) this.drop(v);
    this.cur = this.prev = this.loading = null;
  }
}

// Loaded while the setup sheet is open, so the video's first frame already
// has the scene (the clip takes a moment to arrive through /media-cors).
let warm: BackgroundMirror | null = null;

/** Starts (and keeps following) the background copy before recording. */
export function warmBackground() {
  warm ??= new BackgroundMirror();
  warm.layers(performance.now());
}

/** Drops a warmed copy that no recording took. */
export function coolBackground() {
  warm?.dispose();
  warm = null;
}

function drawCover(ctx: CanvasRenderingContext2D, el: HTMLVideoElement | HTMLImageElement, w: number, h: number) {
  const iw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth;
  const ih = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.drawImage(el, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

const isGold = (color: string) => {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  return !!m && Number(m[1]) > 200 && Number(m[2]) > 150 && Number(m[3]) < 140;
};

/**
 * Lays `tokens` out in lines `maxW` wide, the largest size between `max` and
 * `min` whose height fits `maxH`. RTL lines start at the right.
 */
function fit(
  ctx: CanvasRenderingContext2D,
  tokens: Token[],
  opts: { max: number; min: number; maxW: number; maxH: number; lineH: number; gap: number; rtl: boolean; suffix?: string; suffixFont?: string },
): Block {
  let best: Block | null = null;
  for (let size = opts.max; size >= opts.min; size = Math.floor(size * 0.93)) {
    const gap = size * opts.gap;
    const widths = tokens.map((t) => {
      ctx.font = `${size}px ${t.font}`;
      return ctx.measureText(t.text).width;
    });
    if (opts.suffix) {
      ctx.font = `${size}px ${opts.suffixFont}`;
      widths.push(ctx.measureText(opts.suffix).width);
    }
    const texts = [...tokens.map((t) => t.text), ...(opts.suffix ? [opts.suffix] : [])];
    const lines: { idx: number[]; w: number }[] = [];
    let line: { idx: number[]; w: number } = { idx: [], w: 0 };
    texts.forEach((_, i) => {
      const add = (line.idx.length ? gap : 0) + widths[i];
      // The rosette stays on the last word's line.
      const glued = opts.suffix && i === texts.length - 1;
      if (line.idx.length && line.w + add > opts.maxW && !glued) {
        lines.push(line);
        line = { idx: [], w: 0 };
      }
      line.w += (line.idx.length ? gap : 0) + widths[i];
      line.idx.push(i);
    });
    if (line.idx.length) lines.push(line);
    const lineH = size * opts.lineH;
    const height = lines.length * lineH;
    const placed: Placed[] = [];
    lines.forEach((l, li) => {
      let x = opts.rtl ? (opts.maxW + l.w) / 2 : (opts.maxW - l.w) / 2;
      for (const i of l.idx) {
        const w = widths[i];
        placed.push({ text: texts[i], x: opts.rtl ? x - w : x, y: li * lineH + lineH / 2, w, idx: i });
        x += opts.rtl ? -(w + gap) : w + gap;
      }
    });
    best = { size, lineH, placed, height };
    if (height <= opts.maxH) break;
  }
  return best!;
}

export interface ComposerOptions {
  width: number;
  height: number;
  /** "Surah Ya-Sin · 36" — drawn small at the top. */
  title: () => string;
}

export class FrameComposer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private bg: BackgroundMirror;
  private logo = new Image();
  /** The app's UI font, Poppins (self-hosted: next/font's own family name). */
  private uiFont = uiFontFamily();
  private stage: Stage | null = null;
  private layout: { key: string; arabic: Block; meaning: Block | null; top: number; meaningTop: number } | null = null;

  constructor(private opts: ComposerOptions) {
    this.bg = warm ?? new BackgroundMirror();
    warm = null;
    this.canvas = document.createElement("canvas");
    this.canvas.width = opts.width;
    this.canvas.height = opts.height;
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.logo.src = "/huda-logo.webp?v=3";
    // The canvas only draws a web font that is already loaded.
    void document.fonts?.load(`600 32px ${this.uiFont}`, SITE_LINK).catch(() => {});
  }

  /** Scale against a 1080-wide portrait frame. */
  private get unit() {
    return Math.min(this.opts.width, this.opts.height) / 1080;
  }

  private relayout(stage: Stage) {
    const { ctx } = this;
    const { width: W, height: H } = this.opts;
    const u = this.unit;
    const portrait = H > W * 1.2;
    const margin = W * (portrait ? 0.07 : 0.08);
    // Header (title) and footer (logo + link) bands; the text fits between.
    const top = H * (portrait ? 0.12 : 0.13);
    const bottom = H * (portrait ? 0.84 : 0.8);
    const area = bottom - top;
    const maxW = W - margin * 2;
    const hasMeaning = stage.meaning.length > 0;
    const arabicFont = stage.arabic[0]?.font ?? "serif";
    const arabic = fit(ctx, stage.arabic, {
      max: Math.round((portrait ? 104 : 92) * u),
      min: Math.round(26 * u),
      maxW,
      maxH: hasMeaning ? area * 0.58 : area,
      lineH: 1.9,
      gap: 0.3,
      rtl: true,
      suffix: stage.ayah ? toArabicNumerals(stage.ayah) : undefined,
      suffixFont: arabicFont,
    });
    let meaning: Block | null = null;
    const space = Math.round(28 * u);
    if (hasMeaning) {
      meaning = fit(ctx, stage.meaning, {
        max: Math.round((portrait ? 50 : 44) * u),
        min: Math.round(18 * u),
        maxW,
        maxH: area - arabic.height - space,
        lineH: 1.65,
        gap: 0.28,
        rtl: stage.meaningDir === "rtl",
      });
    }
    const total = arabic.height + (meaning ? space + meaning.height : 0);
    const blockTop = top + Math.max(0, (area - total) / 2);
    this.layout = {
      key: `${stage.key}|${W}x${H}`,
      arabic,
      meaning,
      top: blockTop,
      meaningTop: blockTop + arabic.height + space,
    };
  }

  draw(now = performance.now()) {
    const { ctx } = this;
    const { width: W, height: H } = this.opts;
    const u = this.unit;
    const margin = W * 0.07;
    const fresh = readStage();
    if (fresh) this.stage = fresh;
    const stage = this.stage;

    // Background
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, W, H);
    for (const layer of this.bg.layers(now)) {
      ctx.globalAlpha = layer.alpha;
      drawCover(ctx, layer.el, W, H);
    }
    ctx.globalAlpha = 1;
    // The app's scrim: darker at the bottom and top, so the text reads on any clip.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0.6)");
    g.addColorStop(0.5, "rgba(0,0,0,0.45)");
    g.addColorStop(1, "rgba(0,0,0,0.82)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.direction = "ltr";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 8 * u;
    ctx.fillStyle = "rgba(253, 230, 138, 0.95)";
    ctx.font = `600 ${Math.round(34 * u)}px ${this.uiFont}`;
    ctx.fillText(this.opts.title(), W / 2, H * 0.065, W - margin * 2);

    if (stage) {
      if (this.layout?.key !== `${stage.key}|${W}x${H}`) this.relayout(stage);
      const L = this.layout!;
      const left = (W - (W - margin * 2)) / 2;
      // Arabic, word by word in the app's colours.
      ctx.direction = "rtl";
      ctx.textAlign = "left";
      for (const p of L.arabic.placed) {
        const tok = stage.arabic[p.idx];
        const color = tok?.color ?? "rgb(252, 211, 77)";
        ctx.font = `${L.arabic.size}px ${tok?.font ?? stage.arabic[0]?.font ?? "serif"}`;
        const gold = isGold(color) || !tok;
        ctx.shadowColor = gold ? "rgba(251,191,36,0.6)" : "rgba(0,0,0,0.9)";
        ctx.shadowBlur = (gold ? 24 : 6) * u;
        ctx.fillStyle = tok ? color : "rgb(252, 211, 77)";
        ctx.fillText(p.text, left + p.x, L.top + p.y);
      }
      // Meaning
      if (L.meaning) {
        ctx.direction = stage.meaningDir;
        for (const p of L.meaning.placed) {
          const tok = stage.meaning[p.idx];
          ctx.font = `${L.meaning.size}px ${tok.font}`;
          const gold = isGold(tok.color);
          ctx.shadowColor = gold ? "rgba(251,191,36,0.55)" : "rgba(0,0,0,0.9)";
          ctx.shadowBlur = (gold ? 16 : 6) * u;
          ctx.fillStyle = tok.color;
          ctx.fillText(p.text, left + p.x, L.meaningTop + p.y);
        }
      }
    }

    // Logo + link
    ctx.direction = "ltr";
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10 * u;
    const logoH = Math.round(96 * u);
    ctx.font = `600 ${Math.round(32 * u)}px ${this.uiFont}`;
    const linkW = ctx.measureText(SITE_LINK).width;
    const gap = 18 * u;
    const rowW = logoH + gap + linkW;
    const x0 = (W - rowW) / 2;
    const y0 = H - logoH - H * 0.045;
    if (this.logo.complete && this.logo.naturalWidth) ctx.drawImage(this.logo, x0, y0, logoH, logoH);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(SITE_LINK, x0 + logoH + gap, y0 + logoH / 2);
    ctx.shadowBlur = 0;
  }

  dispose() {
    this.bg.dispose();
  }
}
