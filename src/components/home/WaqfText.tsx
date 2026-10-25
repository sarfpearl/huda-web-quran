import { splitWaqf } from "@/lib/waqf";

/** A Quran word whose trailing waqf sign sits in a box of its own (waqf.ts). */
export function WaqfText({ text }: { text: string }) {
  const split = splitWaqf(text);
  if (!split) return <>{text}</>;
  const [word, sign, em] = split;
  return (
    <>
      {word}
      {/* Its ink width + a hair, so the box holds the whole sign. */}
      <span className="quran-waqf" style={{ width: `${(em + 0.02).toFixed(2)}em` }}>
        {sign}
      </span>
    </>
  );
}
