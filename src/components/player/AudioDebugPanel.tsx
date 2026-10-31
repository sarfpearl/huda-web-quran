"use client";

import { useEffect, useReducer, useState } from "react";
import { audioDebugLines, audioDebugOn, clearAudioDebug, onAudioDebug } from "@/lib/audioDebug";

// The `?debug=audio` log (see src/lib/audioDebug.ts). Renders nothing
// unless it is on.
export default function AudioDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!audioDebugOn()) return;
    setEnabled(true);
    return onAudioDebug(redraw);
  }, []);

  if (!enabled) return null;
  const lines = audioDebugLines();
  const text = () => lines.map((l) => `${l.t} ${l.msg}`).join("\n");
  const copy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    navigator.clipboard?.writeText(`${navigator.userAgent}\n${text()}`).then(done, () => {
      // Clipboard refused: select the text so it can be copied by hand.
      const pre = document.getElementById("audio-debug-log");
      if (pre) window.getSelection()?.selectAllChildren(pre);
    });
  };

  const btn = "rounded bg-white/15 px-2 py-1 active:bg-white/30";
  return (
    <div className="fixed left-2 right-2 top-2 z-[9999] rounded-lg bg-black/85 p-2 font-mono text-[10px] leading-snug text-green-300 shadow-lg">
      <div className="flex items-center gap-2 text-white">
        <b className="mr-auto">audio log ({lines.length})</b>
        <button type="button" className={btn} onClick={copy}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" className={btn} onClick={clearAudioDebug}>Clear</button>
        <button type="button" className={btn} onClick={() => setOpen((o) => !o)}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <pre id="audio-debug-log" className="mt-1 max-h-[40vh] select-text overflow-auto whitespace-pre-wrap">
          {lines.length ? text() : "Play a Surah, then take a call…"}
        </pre>
      )}
    </div>
  );
}
