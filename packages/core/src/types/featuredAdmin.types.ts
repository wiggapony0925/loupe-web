/**
 * Operator curation of the Community "Featured collectors" rail.
 *
 * The rail is algorithmic by default and curated when an operator sets a
 * list, so `usernames` being empty is the normal, healthy state — not an
 * error and not an empty rail.
 */

/** One collector as the admin portal lists them. */
export interface AdminFeaturedCollector {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_admin: boolean;
  card_count: number;
  preview_image_urls: string[];
}

export interface AdminFeaturedView {
  /** Handles in operator order — these are the removable tags. */
  usernames: string[];
  /** Resolved collectors, same order. Shorter than `usernames` when an
   *  entry no longer resolves. */
  collectors: AdminFeaturedCollector[];
  /** Handles that no longer resolve (renamed, deactivated, deleted, banned).
   *  Surfaced so a dangling tag is visible rather than silently missing. */
  unresolved: string[];
  /** Server-enforced cap on the rail. */
  max_featured: number;
}
