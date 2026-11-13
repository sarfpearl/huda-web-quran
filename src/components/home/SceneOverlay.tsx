"use client";

import { useEffect, useState } from "react";

// One flat black layer over the whole scene (image or video), edge to edge —
// no gradient. Opacity is per mode and set in Settings › Background
// (owner, 2026-11-12: video 64%, image 54% by default).
export const SCENE_DIM_DEFAULTS = { video: 0.64, image: 0.54 };
const STORAGE_KEY = "huda-scene-dim";

export type SceneDim = typeof SCENE_DIM_DEFAULTS;
type Mode = keyof SceneDim;

/** The saved dim per mode, and a setter that saves it. */
export function useSceneDim(): [SceneDim, (mode: Mode, v: number) => void] {
  const [values, setValues] = useState(SCENE_DIM_DEFAULTS);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && typeof saved.video === "number" && typeof saved.image === "number") setValues(saved);
    } catch {}
  }, []);

  const update = (mode: Mode, v: number) => {
    setValues((prev) => {
      const next = { ...prev, [mode]: v };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return [values, update];
}

export function SceneOverlay({ opacity }: { opacity: number }) {
  return (
    <div
      className="absolute inset-0 z-[1] bg-black pointer-events-none transition-opacity duration-300"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
