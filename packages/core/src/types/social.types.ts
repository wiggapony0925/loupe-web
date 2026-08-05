/** Social layer — collector profiles, the follow graph, shared collections. */

/** How the signed-in viewer relates to another profile. */
export type SocialRelationship = "self" | "following" | "requested" | "none";

/** The caller's own social profile (null server-side until claimed). */
export interface SocialProfile {
  userId: string;
  username: string;
  bio: string | null;
  location: string | null;
  isPrivate: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

export interface SocialMe {
  profile: SocialProfile | null;
  incomingRequestCount: number;
}

export interface SocialProfileInput {
  username: string;
  bio?: string | null;
  location?: string | null;
  isPrivate?: boolean;
}

/** One row in search results / follower lists. */
export interface SocialUserCard {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  location: string | null;
  isPrivate: boolean;
  /** Paying/comped Loupe Pro — drives the gold PRO chip. */
  isPro: boolean;
  relationship: SocialRelationship;
}

/** A profile as seen by the viewer (Instagram-style header numbers). */
export interface SocialProfileView {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  isPrivate: boolean;
  isPro: boolean;
  joinedAt: string;
  followerCount: number;
  followingCount: number;
  cardCount: number;
  relationship: SocialRelationship;
  canViewCollection: boolean;
}

export interface SocialFollowRequest {
  id: string;
  requester: SocialUserCard;
  createdAt: string;
}

/** A holding as shown to other collectors — no cost basis, no notes. */
export interface SocialCollectionItem {
  id: string;
  /** Catalog card id — deep-links the tile to the card page. */
  cardId: string;
  cardName: string | null;
  cardImageUrl: string | null;
  cardSetName: string | null;
  cardNumber: string | null;
  cardTcg: string | null;
  grade: string;
  house: string;
  condition: string | null;
  estimatedValueUsd: number | null;
  gradedAt: string;
}

export interface SocialCollection {
  totalCards: number;
  estimatedValueUsd: number | null;
  items: SocialCollectionItem[];
}
