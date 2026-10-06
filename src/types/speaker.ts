/** A track's reciter, as shown by the player. */
export interface Speaker {
  id: string;
  name: string;
  slug: string;
  bio: string;
  profileImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
}
