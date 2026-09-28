import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MotionQAClient } from "@/components/motion-qa/MotionQAClient";
import { getAllBayan } from "@/lib/data/service";
import { parseSort } from "@/lib/sort";

/*
 * TEMPORARY review page for the motion changes (PR #2). It renders the
 * original components next to their QA copies in src/components/motion-qa/.
 * The live UI is untouched. The page is only reachable in development, on
 * Vercel preview deploys, or with MOTION_QA=1; production returns 404.
 * Delete this route once every item is approved or rejected.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Motion QA",
  robots: { index: false, follow: false },
};

function enabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.MOTION_QA === "1"
  );
}

export default async function MotionQAPage({
  searchParams,
}: {
  searchParams: { sort?: string; player?: string; frame?: string };
}) {
  if (!enabled()) notFound();
  const items = await getAllBayan("latest");
  return (
    <MotionQAClient
      items={items}
      sort={parseSort(searchParams.sort)}
      player={searchParams.player === "before" ? "before" : "after"}
      frame={searchParams.frame === "1"}
    />
  );
}
