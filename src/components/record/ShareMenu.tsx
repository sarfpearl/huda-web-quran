"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { ActionSheet } from "@/components/ui/ActionSheet";
import { RecordIcon, ShareIcon, CloseIcon } from "@/components/ui/Icon";
import { haptic } from "@/lib/haptics";
import { t, type UiLang } from "@/lib/uiLang";
import type { RecordStudioProps } from "./RecordStudio";

/**
 * Share (player strip): a sheet with "Share link" and "Record video", so the
 * strip carries one button for both. Where there is nothing to record (Juz,
 * or a browser that can't record a canvas) it shares the link at once.
 * The recorder (and the trim library behind it) is its own chunk, loaded a
 * little after the page.
 */
let loading: Promise<typeof import("./RecordStudio")> | null = null;

export function ShareMenu({
  onShareLink,
  record,
  language,
  className,
}: {
  onShareLink: () => void;
  /** The Surah to record; unset in Juz mode. */
  record?: Omit<RecordStudioProps, "onClose" | "language">;
  language: UiLang;
  className?: string;
}) {
  const [canRecord, setCanRecord] = useState(false);
  const [Studio, setStudio] = useState<ComponentType<RecordStudioProps> | null>(null);
  const [sheet, setSheet] = useState(false);
  const [studio, setStudioOpen] = useState(false);

  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function");
  }, []);
  const withRecord = canRecord && !!record;

  const load = useCallback(() => {
    if (!loading) loading = import("./RecordStudio");
    void loading.then((m) => setStudio(() => m.default));
  }, []);
  useEffect(() => {
    if (!withRecord) return;
    const id = setTimeout(load, 4000);
    return () => clearTimeout(id);
  }, [withRecord, load]);

  const L = (s: string) => t(language, s);
  const label = L("Share");
  return (
    <>
      <button
        type="button"
        onPointerEnter={withRecord ? load : undefined}
        onClick={() => {
          if (!withRecord) {
            onShareLink();
            return;
          }
          haptic();
          load();
          setSheet(true);
        }}
        aria-label={label}
        data-tooltip={label}
        data-tour="share"
        className={className}
      >
        <ShareIcon className="text-base sm:text-lg" />
      </button>
      {withRecord && (
        <ActionSheet open={sheet} onClose={() => setSheet(false)} label={label}>
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm sm:text-base font-bold leading-tight tracking-tight text-white">{label}</h3>
            <button
              type="button"
              onClick={() => setSheet(false)}
              aria-label={L("Close")}
              className="tap-44 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sand-300 transition-all hover:bg-white/20 hover:text-white active:scale-95 cursor-pointer"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            <Option
              icon={<ShareIcon className="text-lg" />}
              title={L("Share link")}
              hint={L("A link that opens this ayah")}
              onClick={() => {
                setSheet(false);
                // Still inside the tap: the system share sheet needs it.
                onShareLink();
              }}
            />
            <Option
              icon={<RecordIcon className="text-lg text-red-400" />}
              title={L("Record video")}
              hint={L("The recitation, highlight and meaning as a video")}
              onClick={() => {
                setSheet(false);
                // After this sheet's Back entry is gone: a sheet opening in
                // the same moment got that pop in Safari and closed at once.
                setTimeout(() => setStudioOpen(true), 400);
              }}
            />
          </div>
        </ActionSheet>
      )}
      {/* On <body>: the player strip's backdrop blur would trap a fixed overlay. */}
      {studio && Studio && record && createPortal(<Studio {...record} language={language} onClose={() => setStudioOpen(false)} />, document.body)}
    </>
  );
}

function Option({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-3.5 py-2.5 text-left text-sand-100 transition-all hover:border-white/15 hover:bg-white/[0.08] cursor-pointer"
    >
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-sand-50">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-bold">{title}</span>
        <span className="truncate text-xs text-sand-200/60">{hint}</span>
      </span>
    </button>
  );
}
