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

type Bg = HTMLVideoElement | HTMLImageElement;

/** The page's large scene images (the Surah artwork sits under its clips). */
function sceneImage(): HTMLImageElement | null {
  let img: HTMLImageElement | null = null;
  let area = 0;
  document.querySelectorAll("img").forEach((el) => {
    if (!el.currentSrc || !el.complete || !el.naturalWidth) return;
    const r = el.getBoundingClientRect();
    if (r.width * r.height < window.innerWidth * window.innerHeight * 0.6) return;
    if (r.width * r.height >= area) {
      area = r.width * r.height;
      img = el;
    }
  });
  return img;
}

/** The scene's background as the page shows it: the top visible clip, else the artwork. */
function visibleBackground(own: Set<HTMLVideoElement>): Bg | null {
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
  return best ?? sceneImage();
}

/**
 * A CORS-clean copy of the page's background (through /media-cors), kept in
 * step with it. Never draws nothing: a clip that is still loading, failed or
 * stalled leaves the last good picture — or the Surah artwork — on screen.
 */
class BackgroundMirror {
  own = new Set<HTMLVideoElement>();
  private cur: { src: string; el: Bg; since: number } | null = null;
  private prev: { el: Bg } | null = null;
  private loading: { src: string; el: Bg; at: number } | null = null;
  /** The artwork, loaded too, for whenever no clip is ready. */
  private art: { src: string; el: HTMLImageElement; ok: boolean } | null = null;
  /** URLs that failed, and when they may be tried again. */
  private failed = new Map<string, { n: number; next: number }>();
  private lastSync = 0;

  private fail(url: string, el: Bg) {
    const f = this.failed.get(url) ?? { n: 0, next: 0 };
    f.n += 1;
    f.next = performance.now() + 2000 * f.n;
    this.failed.set(url, f);
    if (el instanceof HTMLVideoElement) this.drop(el);
    if (this.loading?.src === url) this.loading = null;
  }

  private canTry(url: string) {
    const f = this.failed.get(url);
    return !f || (f.n < 4 && performance.now() >= f.next);
  }

  private load(src: Bg) {
    const url = src.currentSrc;
    if (src instanceof HTMLVideoElement) {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.loop = src.loop;
      v.crossOrigin = "anonymous";
      v.preload = "auto";
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
      v.addEventListener("error", () => this.fail(url, v), { once: true });
      v.src = corsUrl(url);
      this.loading = { src: url, el: v, at: performance.now() };
    } else {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.decoding = "async";
      im.onload = () => this.ready(url, im);
      im.onerror = () => this.fail(url, im);
      im.src = corsUrl(url);
      this.loading = { src: url, el: im, at: performance.now() };
    }
  }

  private loadArt(img: HTMLImageElement) {
    const url = img.currentSrc;
    if (this.art?.src === url || !this.canTry(url)) return;
    const im = new Image();
    im.crossOrigin = "anonymous";
    const art = { src: url, el: im, ok: false };
    im.onload = () => (art.ok = true);
    im.onerror = () => this.failed.set(url, { n: (this.failed.get(url)?.n ?? 0) + 1, next: performance.now() + 4000 });
    im.src = corsUrl(url);
    this.art = art;
  }

  private ready(url: string, el: Bg) {
    if (this.loading?.src !== url) return;
    this.loading = null;
    this.failed.delete(url);
    if (this.prev?.el instanceof HTMLVideoElement && this.prev.el !== this.cur?.el) this.drop(this.prev.el);
    this.prev = this.cur ? { el: this.cur.el } : null;
    this.cur = { src: url, el, since: performance.now() };
  }

  private drop(v: HTMLVideoElement) {
    v.pause();
    v.removeAttribute("src");
    v.load();
    this.own.delete(v);
  }

  /** Has a picture to show (a broken or empty video has none). */
  private static shows(el: Bg) {
    return el instanceof HTMLVideoElement ? !el.error && el.readyState >= 2 && el.videoWidth > 0 : el.complete && el.naturalWidth > 0;
  }

  /** Follows the page; returns what to draw (with the incoming one's fade). */
  layers(now: number): { el: Bg; alpha: number }[] {
    const src = visibleBackground(this.own);
    const art = sceneImage();
    if (art) this.loadArt(art);
    // A load that hangs (a stalled request) is given up and tried again.
    if (this.loading && now - this.loading.at > 12000) this.fail(this.loading.src, this.loading.el);
    if (src && src.currentSrc !== this.cur?.src && src.currentSrc !== this.loading?.src && this.canTry(src.currentSrc)) this.load(src);
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
    const out: { el: Bg; alpha: number }[] = [];
    // Underneath everything: the artwork, so there is never a black frame.
    if (this.art?.ok) out.push({ el: this.art.el, alpha: 1 });
    if (this.cur && BackgroundMirror.shows(this.cur.el)) {
      const fade = Math.min(1, (now - this.cur.since) / 700);
      if (fade < 1 && this.prev && BackgroundMirror.shows(this.prev.el)) out.push({ el: this.prev.el, alpha: 1 });
      out.push({ el: this.cur.el, alpha: this.prev || this.art?.ok ? fade : 1 });
    } else if (this.prev && BackgroundMirror.shows(this.prev.el)) {
      out.push({ el: this.prev.el, alpha: 1 });
    }
    return out;
  }

  dispose() {
    for (const v of [...this.own]) this.drop(v);
    this.cur = this.prev = this.loading = this.art = null;
  }
}

// The logo, loaded once and decoded ahead (from when this module loads, a
// little after the page): a recording's first frames had no logo while it
// was still arriving.
let logo: HTMLImageElement | null = null;
function sharedLogo(): HTMLImageElement {
  if (!logo) {
    logo = new Image();
    logo.decoding = "async";
    logo.src = "/huda-logo.webp?v=3";
    void logo.decode?.().catch(() => {});
  }
  return logo;
}
if (typeof Image !== "undefined") sharedLogo();

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
  private logo = sharedLogo();
  /** The app's UI font, Poppins (self-hosted: next/font's own family name). */
  private uiFont = uiFontFamily();
  /** The title's serif: Amiri (self-hosted, also used for the app's Arabic). */
  private serifFont = (() => {
    const amiri = getComputedStyle(document.documentElement).getPropertyValue("--font-amiri").trim();
    return amiri ? `${amiri}, serif` : "serif";
  })();
  private stage: Stage | null = null;
  // The verse stage is read again only after it changed (and for a moment
  // after, while its colour transitions run) — not every frame: reading every
  // word's computed style 30 times a second made garbage that piled up.
  private stageDirtyUntil = 0;
  private stageReadAt = -Infinity;
  private observer: MutationObserver | null = null;
  private observed: Element | null = null;
  private scrim: { h: number; g: CanvasGradient } | null = null;
  private layout: { key: string; arabic: Block; meaning: Block | null; top: number; meaningTop: number } | null = null;

  constructor(private opts: ComposerOptions) {
    this.bg = warm ?? new BackgroundMirror();
    warm = null;
    this.canvas = document.createElement("canvas");
    this.canvas.width = opts.width;
    this.canvas.height = opts.height;
    this.ctx = this.canvas.getContext("2d", { alpha: false })!;
    this.observer = new MutationObserver(() => {
      this.stageDirtyUntil = performance.now() + 300;
    });
    // The canvas only draws a web font that is already loaded.
    void document.fonts?.load(`600 32px ${this.uiFont}`, SITE_LINK).catch(() => {});
    void document.fonts?.load(`36px ${this.serifFont}`, "Al-Fatihah").catch(() => {});
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
    // Watch the verse stage (re-attached if the page swaps it).
    const stageEl = document.querySelector("[data-verse-stage]");
    if (stageEl !== this.observed && this.observer) {
      this.observer.disconnect();
      this.observed = stageEl;
      this.stageDirtyUntil = now + 300;
      if (stageEl) this.observer.observe(stageEl, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"], characterData: true });
    }
    // Changed recently, or a slow safety refresh (twice a second).
    if (now <= this.stageDirtyUntil || now - this.stageReadAt > 500) {
      this.stageReadAt = now;
      const fresh = readStage();
      if (fresh) this.stage = fresh;
    }
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
    if (this.scrim?.h !== H) {
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "rgba(0,0,0,0.6)");
      grad.addColorStop(0.5, "rgba(0,0,0,0.45)");
      grad.addColorStop(1, "rgba(0,0,0,0.82)");
      this.scrim = { h: H, g: grad };
    }
    const g = this.scrim.g;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Watermark: the HuDa logo as faint frosted glass over the scene, under
    // the text — there if you look, never in the way of reading.
    this.drawWatermark();

    // Title: in a gold-edged pill with a small flourish either side.
    this.drawTitle(W / 2, H * 0.065, W - margin * 2);

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

  /** The logo's shape in one colour (for the glass watermark), made once per size. */
  private glass: { size: number; light: HTMLCanvasElement; dark: HTMLCanvasElement } | null = null;

  private drawWatermark() {
    const lg = this.logo;
    if (!lg.complete || !lg.naturalWidth) return;
    const { ctx } = this;
    const { width: W, height: H } = this.opts;
    const size = Math.round(Math.min(W, H) * 0.62);
    if (this.glass?.size !== size) {
      const tint = (color: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const x = c.getContext("2d")!;
        x.drawImage(lg, 0, 0, size, size);
        x.globalCompositeOperation = "source-in";
        x.fillStyle = color;
        x.fillRect(0, 0, size, size);
        return c;
      };
      this.glass = { size, light: tint("#ffffff"), dark: tint("#000000") };
    }
    const u = this.unit;
    const x = (W - size) / 2;
    const y = H * 0.47 - size / 2;
    ctx.save();
    ctx.shadowBlur = 0;
    // Frosted glass: a pale body, a soft shade below-right and a thin light
    // edge above-left, so it reads as raised glass rather than a print.
    ctx.globalAlpha = 0.08;
    ctx.drawImage(this.glass.dark, x + 3 * u, y + 3 * u);
    ctx.globalAlpha = 0.045;
    ctx.drawImage(this.glass.light, x, y);
    ctx.globalAlpha = 0.035;
    ctx.drawImage(this.glass.light, x - 1.5 * u, y - 1.5 * u);
    ctx.restore();
  }

  private drawTitle(cx: number, cy: number, maxW: number) {
    const { ctx } = this;
    const u = this.unit;
    const gold = "rgba(227, 182, 90, 0.95)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.direction = "ltr";
    ctx.font = `${Math.round(36 * u)}px ${this.serifFont}`;
    const title = this.opts.title();
    const tw = Math.min(ctx.measureText(title).width, maxW - 260 * u);
    const h = 60 * u;
    const w = tw + 56 * u;
    const x = cx - w / 2;
    const y = cy - h / 2;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10 * u;
    ctx.fillStyle = "rgba(8, 12, 26, 0.5)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2 * u;
    ctx.strokeStyle = gold;
    ctx.stroke();
    // Flourishes: a line, a diamond, a scroll and a dot, mirrored.
    for (const dir of [-1, 1]) {
      const ex = dir < 0 ? x : x + w;
      ctx.beginPath();
      ctx.moveTo(ex + dir * 8 * u, cy);
      ctx.lineTo(ex + dir * 70 * u, cy);
      ctx.stroke();
      const dx = ex + dir * 34 * u;
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(dx - 7 * u, cy);
      ctx.lineTo(dx, cy - 7 * u);
      ctx.lineTo(dx + 7 * u, cy);
      ctx.lineTo(dx, cy + 7 * u);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex + dir * 54 * u, cy - 6 * u, 6 * u, 0, Math.PI * 2);
      ctx.arc(ex + dir * 54 * u, cy + 6 * u, 6 * u, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex + dir * 76 * u, cy, 3 * u, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6 * u;
    ctx.fillStyle = "rgba(255, 248, 230, 0.97)";
    ctx.fillText(title, cx, cy + 2 * u, maxW - 260 * u);
    ctx.shadowBlur = 0;
  }

  dispose() {
    this.observer?.disconnect();
    this.observer = null;
    this.bg.dispose();
  }
}
