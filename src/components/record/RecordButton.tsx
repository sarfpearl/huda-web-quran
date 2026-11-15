"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { haptic } from "@/lib/haptics";
import { t } from "@/lib/uiLang";
import type { RecordStudioProps } from "./RecordStudio";

/**
 * Record (beside Share): opens the recorder. The recorder itself (and the
 * trim library behind it) loads on the first tap, so the page carries only
 * this button. Hidden where the browser can't record a canvas.
 */
let loading: Promise<typeof import("./RecordStudio")> | null = null;

export function RecordButton(props: Omit<RecordStudioProps, "onClose"> & { className?: string }) {
  const { className, ...studio } = props;
  const [supported, setSupported] = useState(false);
  const [Studio, setStudio] = useState<ComponentType<RecordStudioProps> | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function");
  }, []);

  // Loaded a little after the page, so the first tap opens the sheet at once.
  const load = useCallback(() => {
    if (!loading) loading = import("./RecordStudio");
    void loading.then((m) => setStudio(() => m.default));
  }, []);
  useEffect(() => {
    if (!supported) return;
    const id = setTimeout(load, 4000);
    return () => clearTimeout(id);
  }, [supported, load]);

  if (!supported) return null;
  const label = t(props.language, "Record video");
  return (
    <>
      <button
        type="button"
        onPointerEnter={load}
        onClick={() => {
          haptic();
          setOpen(true);
          load();
        }}
        aria-label={label}
        data-tooltip={label}
        className={className}
      >
        <RecordIcon className="text-base sm:text-lg" />
      </button>
      {/* On <body>: the player strip's backdrop blur would trap a fixed overlay. */}
      {open && Studio && createPortal(<Studio {...studio} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function RecordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.2 21 7v10l-5.5-3.2" />
      <circle cx="9" cy="12" r="2" fill="#ef4444" stroke="none" />
    </svg>
  );
}
