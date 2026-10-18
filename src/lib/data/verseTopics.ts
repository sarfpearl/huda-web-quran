/*
 * Topic chips for the Verse search tab. Each chip runs an OR keyword search
 * over its `terms` (no AI — the same keyword engine as the box), the way the
 * reference site's non-AI "Popular Topics" chips do. `label` is the English
 * key looked up through t()/pickers.ts for the shown name.
 */
export interface VerseTopic {
  key: string;
  /** English UI key (translated in pickers.ts). */
  label: string;
  /** Keywords searched together (English so they hit the English translation). */
  terms: string[];
}

export const VERSE_TOPICS: VerseTopic[] = [
  { key: "paradise", label: "Paradise", terms: ["paradise", "gardens", "garden"] },
  { key: "mercy", label: "Mercy", terms: ["mercy", "merciful"] },
  { key: "patience", label: "Patience", terms: ["patience", "patient", "patiently"] },
  { key: "forgiveness", label: "Forgiveness", terms: ["forgive", "forgiveness", "forgiving"] },
  { key: "gratitude", label: "Gratitude", terms: ["grateful", "thankful", "gratitude"] },
  { key: "charity", label: "Charity", terms: ["charity", "spend", "needy"] },
  { key: "justice", label: "Justice", terms: ["justice", "just", "justly"] },
  { key: "prayer", label: "Prayer", terms: ["prayer", "prostrate", "worship"] },
  { key: "parents", label: "Parents", terms: ["parents", "mother", "father"] },
  { key: "repentance", label: "Repentance", terms: ["repent", "repentance", "turn"] },
];
