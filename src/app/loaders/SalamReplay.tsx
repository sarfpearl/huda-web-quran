"use client";

import { useEffect, useState } from "react";
import { SalamWriting } from "@/components/ui/SalamWriting";

// The splash greeting, written in again every few seconds for review.
export function SalamReplay() {
  const [run, setRun] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRun((n) => n + 1), 3600);
    return () => clearInterval(id);
  }, []);
  return <SalamWriting key={run} />;
}
