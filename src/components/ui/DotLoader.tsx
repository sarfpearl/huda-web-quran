import { cn } from "@/lib/utils";

/*
 * HuDa's loading mark: four warm-orange dots that keep rearranging — a square,
 * dots 2↔3 swapping, 1↔4 swapping, folding into a triangle, a line, a diamond,
 * and back. Pure CSS (keyframes in globals.css), so it also runs in the server
 * HTML before any script. Size follows `font-size` (the box is 1em); colour is
 * `currentColor`.
 */
export function DotLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span className={cn("huda-dots", className)} role="img" aria-label={label}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
