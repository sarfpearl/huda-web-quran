import { cn } from "@/lib/utils";

export const DOT_LOADER_LOOKS = [
  "grid",
  "orbit",
  "wave",
  "chase",
  "merge",
  "swap",
  "pulse",
  "spin",
  "eight",
  "ripple",
  "newton",
] as const;
export type DotLoaderLook = (typeof DOT_LOADER_LOOKS)[number];

/*
 * HuDa's loading mark: four brand-gold dots in continuous motion, in one of
 * eleven looks (keyframes in globals.css). Without `look` it takes the one the
 * splash script picked for this app open (a
 * different one each open). Pure CSS, so it also runs
 * in the server HTML before any script. Size follows `font-size` (the box is
 * 1em); colour is `currentColor`.
 */
export function DotLoader({
  className,
  label = "Loading",
  look,
}: {
  className?: string;
  label?: string;
  look?: DotLoaderLook;
}) {
  return (
    <span className={cn("huda-dots", className)} data-look={look} role="img" aria-label={label}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}
