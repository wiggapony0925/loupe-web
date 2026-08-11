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
  /** Canonical https URLs keyed by platform (server-normalized). */
  links: Record<string, string> | null;
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
  /** Omit = leave stored links alone; {} = clear; values may be bare
   *  handles — the server canonicalises to https URLs. */
  links?: Record<string, string> | null;
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
  /** Canonical https URLs keyed by platform (server-normalized). */
  links: Record<string, string> | null;
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

// ── The feed ──

/** Which feed tab. The BACKEND owns what each one means; clients ask. */
export type FeedTab = "following" | "foryou" | "mine";

/** A byline. Leaner than {@link SocialUserCard} — a feed page shows twenty
 *  and a full card would drag a collection lookup along with each one. */
export interface PostAuthor {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Gold PRO chip. */
  isPro: boolean;
  /** Loupe staff — drives the verified tick. */
  isAdmin: boolean;
  relationship: SocialRelationship;
}

export interface PostMedia {
  id: string;
  url: string;
  position: number;
  /** "image" or "video" — sent as a KIND so no client sniffs the MIME type. */
  kind: "image" | "video";
  /** Intrinsic size when known — reserve this aspect ratio before load. */
  width: number | null;
  height: number | null;
}

/** The catalog card a post showcases. Carries no price: the card page holds
 *  the authoritative, grade-aware number. */
export interface PostCardRef {
  cardId: string;
  name: string | null;
  imageUrl: string | null;
  setName: string | null;
  number: string | null;
  tcg: string | null;
}

export interface Post {
  id: string;
  author: PostAuthor;
  body: string | null;
  media: PostMedia[];
  card: PostCardRef | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  viewerHasLiked: boolean;
  /** Lowercase, no '#'. */
  hashtags: string[];
  /** Handles in the caption that resolve to real accounts. */
  mentions: string[];
  /** When the caption was last rewritten, or null. Render "· edited":
   *  comments underneath may be answering words that are gone. */
  editedAt: string | null;
  canDelete: boolean;
  /** Author only. Staff can remove a post but never rewrite one under
   *  someone else's byline — the rule lives on the server. */
  canEdit: boolean;
}

/** A page of posts. `nextCursor` is opaque — hand it back verbatim. */
export interface Feed {
  items: Post[];
  nextCursor: string | null;
}

export interface PostComment {
  id: string;
  postId: string;
  parentId: string | null;
  author: PostAuthor;
  body: string;
  createdAt: string;
  likeCount: number;
  viewerHasLiked: boolean;
  /** Replies under this top-level comment; always 0 on a reply. */
  replyCount: number;
  replies: PostComment[];
  canDelete: boolean;
}

export interface CommentThread {
  items: PostComment[];
  nextCursor: string | null;
  /** Every comment including replies — the number under the bubble. */
  total: number;
}

export interface Hashtag {
  tag: string;
  postCount: number;
}

/** One query, both kinds of result — ranked together server-side. */
export interface SocialSearchResults {
  users: SocialUserCard[];
  hashtags: Hashtag[];
}

/** New like state + the fresh total, so a client never guesses. */
export interface LikeState {
  liked: boolean;
  likeCount: number;
}

/** Body for creating a post. Images ride along as real files. */
export interface NewPostInput {
  body?: string;
  cardId?: string;
  images?: File[];
}

// ── Safety ──

/** What a report can say. Server-owned closed list (`/social/report-reasons`)
 *  so both clients offer the same options and every reason can be counted. */
export type ReportReason =
  | "spam"
  | "nudity"
  | "hate"
  | "violence"
  | "counterfeit"
  | "other";

export interface ReportInput {
  targetType: "post" | "comment" | "profile";
  targetId: string;
  reason: ReportReason | string;
  note?: string;
}

/** One row in the moderation queue — an auto-flag or a user report. */
export interface ModerationCase {
  id: string;
  targetType: string;
  targetId: string;
  authorId: string | null;
  authorUsername: string | null;
  /** "auto" (the classifier) | "report" (a user). */
  source: string;
  reason: string | null;
  reasonLabel: string | null;
  detail: string | null;
  /** Worst classifier score, 0-1 — the queue is ordered by it. */
  score: number | null;
  /** A copy of the text, kept in case the target is deleted before review. */
  excerpt: string | null;
  reporterUsername: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ModerationQueue {
  items: ModerationCase[];
  total: number;
  /** Open cases regardless of the filter — the badge on the nav. */
  openCount: number;
}

/** Admin: one story as the dev-portal sees it — live and expired alike. */
export interface AdminStory {
  id: string;
  username: string;
  kind: "image" | "video";
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  live: boolean;
  viewCount: number;
  commentCount: number;
}

/** Admin: what one seed run did. `skippedLive` is the retrigger contract —
 *  accounts with a live story are skipped until it expires. */
export interface StorySeedResult {
  created: number;
  skippedLive: number;
  authors: string[];
}
