import type { Metadata } from "next";
import { DOT_LOADER_LOOKS, DotLoader } from "@/components/ui/DotLoader";

export const metadata: Metadata = {
  title: "Loaders",
  robots: { index: false, follow: false },
};

const NOTES: Record<(typeof DOT_LOADER_LOOKS)[number], string> = {
  grid: "Square ⇄ diagonal",
  orbit: "Circling, swelling",
  wave: "Bobbing row",
  chase: "Following round",
  merge: "In and out, turning",
  swap: "1↔4, then 2↔3",
};

// Every loader look side by side, large, for review. Not linked from the app.
export default function LoadersPage() {
  return (
    <main className="min-h-dvh bg-[#0e100f] px-4 py-10 text-[#e9e2d3]">
      <h1 className="text-center font-poppins text-2xl font-bold text-[#fcd34d]">HuDa loaders</h1>
      <p className="mt-1 text-center text-sm text-[#e9e2d3]/60">
        One is picked at random each time the app opens.
      </p>
      <section className="mx-auto mt-8 flex max-w-3xl flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-8">
        <DotLoader className="text-[40px]" look="swap" label="swap" />
        <p className="huda-splash-salam huda-salam-loop" lang="ar" dir="rtl">
          السَّلَامُ عَلَيْكُمْ
        </p>
        <p className="mt-2 text-xs text-[#e9e2d3]/60">Splash: dots, then the greeting writes itself in</p>
      </section>
      <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {DOT_LOADER_LOOKS.map((look) => (
          <section
            key={look}
            className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-8"
          >
            <DotLoader look={look} className="text-[64px]" label={look} />
            <p className="mt-6 font-mono text-sm text-[#fcd34d]">{look}</p>
            <p className="mt-1 text-center text-xs text-[#e9e2d3]/60">{NOTES[look]}</p>
            <DotLoader look={look} className="mt-5 text-[28px]" label={`${look}, small`} />
          </section>
        ))}
      </div>
    </main>
  );
}
