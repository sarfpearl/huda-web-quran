/*
 * The one selected-state look for every list row, sheet option and tab:
 * soft glass with a thin gold border (the player's Quran gold), no glow.
 */

/** A selected row / option / tab. Unselected ones take `UNSELECTED_EDGE` so nothing shifts. */
export const SELECTED = "border border-amber-200/40 bg-white/[0.11] text-white";

/** Unselected: the same 1px border, invisible, so selecting doesn't move the content. */
export const UNSELECTED_EDGE = "border border-transparent";

/** Small badge in a selected row (✓, view count). */
export const SELECTED_BADGE = "border border-amber-300/30 bg-amber-300/15 text-amber-200";

/*
 * Segmented tabs (Surah | Juz, Word sync | Audio only) — sizes from the Figma
 * design (node 27669:8694): a pill track, tabs of 14px Poppins Medium. The
 * selected one is gold like the maker logo — gold edge, gold label and the
 * logo's shine (.huda-tab-gold, globals.css).
 */
/** The pill track the tabs sit in (tabs sit edge to edge, no gap): translucent, blurring what's behind. */
export const TAB_TRACK = "flex rounded-full border border-[#4b433b] bg-[#201e20]/55 p-[2px] backdrop-blur-md";
/** Every tab; add SELECTED_TAB or UNSELECTED_TAB. */
export const TAB =
  "flex flex-1 items-center justify-center gap-1.5 rounded-full border px-[10px] py-[6px] text-center text-[13px] font-medium leading-6 tracking-[-0.26px] transition-colors cursor-pointer";
export const SELECTED_TAB = "huda-tab-gold";
export const UNSELECTED_TAB = "border-transparent text-white hover:bg-white/5";
