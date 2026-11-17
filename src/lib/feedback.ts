import { getSupabaseRpcClient } from "@/lib/supabase/rpc";
import { getSessionId } from "@/lib/audio/session";

/*
 * In-app feedback: the lantern at the screen edge opens a short form; it goes
 * to Supabase through submit_feedback() and, with a screenshot, to the private
 * 'feedback-screenshots' bucket (supabase/migrations/20261115121000_feedback.sql).
 * The owner reads it on /admin/feedback.
 */

export type FeedbackKind = "issue" | "improvement" | "other";
export const FEEDBACK_KINDS: { id: FeedbackKind; label: string }[] = [
  { id: "issue", label: "Issue" },
  { id: "improvement", label: "Improvement" },
  { id: "other", label: "Other" },
];
export const FEEDBACK_MAX_CHARS = 2000;
export const FEEDBACK_BUCKET = "feedback-screenshots";

/** Set once the lantern has made its one full peek (first visit). */
export const FEEDBACK_PEEKED_KEY = "huda-feedback-peeked";
/** Marks the form's own nodes so "Attach this screen" leaves them out. */
export const FEEDBACK_UI_ATTR = "data-feedback-ui";

/** Screenshots are shrunk to this many pixels on the long side, as JPEG. */
const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.8;
/** The bucket refuses anything larger (1.5 MB). */
const MAX_BYTES = 1_500_000;

export type SendResult = { ok: true; screenshotUploaded: boolean } | { ok: false; error: "rate_limited" | "unavailable" | "failed" };

function toBlob(canvas: HTMLCanvasElement, quality = JPEG_QUALITY): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/** Draws `source` at most MAX_SIDE px on its long side and encodes it as JPEG under the size cap. */
async function shrink(source: CanvasImageSource, width: number, height: number): Promise<Blob | null> {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const q of [JPEG_QUALITY, 0.6, 0.45]) {
    const blob = await toBlob(canvas, q);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  return null;
}

/** A picked image file → a small JPEG, or null when it can't be read. */
export async function shrinkImageFile(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await shrink(img, img.naturalWidth, img.naturalHeight);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * "Attach this screen": draws the scene as it is (minus the lantern; the form
 * is portalled outside it) into an image in the browser. Loaded only when
 * asked for. Video frames and
 * images from another origin without CORS can't be read by the page, so they
 * come out dark; the text and controls — what an issue report needs — show.
 */
export async function captureScreen(root: HTMLElement): Promise<Blob | null> {
  const { toCanvas } = await import("html-to-image");
  const { width, height } = root.getBoundingClientRect();
  const canvas = await toCanvas(root, {
    width,
    height,
    backgroundColor: "#000",
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    preferredFontFormat: "woff2",
    // A grey pixel where an image can't be fetched, instead of failing the whole capture.
    imagePlaceholder:
      "data:image/gif;base64,R0lGODlhAQABAIAAAD8/PwAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
    filter: (node) =>
      !(node instanceof HTMLElement) ||
      !(node.hasAttribute(FEEDBACK_UI_ATTR) || node.tagName === "VIDEO"),
  });
  return shrink(canvas, canvas.width, canvas.height);
}

async function uploadScreenshot(path: string, blob: Blob): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    // Plain Storage REST call: the home page doesn't load the full Supabase client.
    const res = await fetch(`${url}/storage/v1/object/${FEEDBACK_BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": blob.type || "image/jpeg",
        "x-upsert": "false",
      },
      body: blob,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendFeedback(input: {
  kind: FeedbackKind;
  message: string;
  screenshot: Blob | null;
  uiLang: string;
}): Promise<SendResult> {
  const rpc = getSupabaseRpcClient();
  if (!rpc) return { ok: false, error: "unavailable" };
  const { data, error } = await rpc.rpc("submit_feedback", {
    p_viewer: getSessionId(),
    p_kind: input.kind,
    p_message: input.message.slice(0, FEEDBACK_MAX_CHARS),
    p_with_screenshot: Boolean(input.screenshot),
    p_screenshot_ext: "jpg",
    p_page: `${location.pathname}${location.search}${location.hash}`,
    p_ui_lang: input.uiLang,
    p_user_agent: navigator.userAgent,
    p_viewport: `${window.innerWidth}x${window.innerHeight}`,
  });
  if (error || !data) return { ok: false, error: "failed" };
  const res = data as { ok: boolean; error?: string; upload_path?: string | null };
  if (!res.ok) return { ok: false, error: res.error === "rate_limited" ? "rate_limited" : "failed" };
  const screenshotUploaded =
    input.screenshot && res.upload_path ? await uploadScreenshot(res.upload_path, input.screenshot) : false;
  return { ok: true, screenshotUploaded };
}
