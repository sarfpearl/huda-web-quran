// fontkit ships no types; only what the IndoPak glyph prototype uses
// (src/app/dev/indopak-tajweed/GlyphWords.tsx).
declare module "fontkit" {
  export function create(data: Uint8Array): { getGlyph(id: number): { path: { toSVG(): string } } };
}
