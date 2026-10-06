/** A track category (the Quran tracks use a single "quran-recitation" one). */
export interface Category {
  id: string;
  name: string;
  /** Tamil display name, optional. */
  nameTa?: string;
  slug: string;
  description: string;
  /** Lucide-style icon key resolved in the UI (see CategoryIcon). */
  icon: string;
  coverImageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}
