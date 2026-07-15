/**
 * Admin · Loupe AI dev tool (`/v1/admin/ai/search/*`) — the chatbot's
 * flight recorder: who asked what, the model's answer, how it was served,
 * and the asker's thumbs verdict. Payload keys arrive camelCased from the
 * backend, so these shapes are passthrough (no adapter).
 */

/** One card exactly as it appeared under an AI answer. */
export interface AdminAiShownCard {
  id: string | null;
  name: string | null;
  setName: string | null;
  rarity: string | null;
  imageUrl: string | null;
  price: number | null;
}

/** One "describe it" exchange. */
export interface AdminAiAsk {
  id: string;
  userId: string | null;
  userEmail: string | null;
  query: string;
  gameHint: string | null;
  game: string | null;
  source: "ai" | "fallback";
  cacheHit: boolean;
  message: string | null;
  candidates: string[];
  /** The exact cards the user saw under the bubble (top 12). */
  results: AdminAiShownCard[];
  resultCount: number;
  latencyMs: number | null;
  /** +1 thumbs up, -1 thumbs down, null = not rated. */
  feedback: number | null;
  feedbackAt: string | null;
  createdAt: string | null;
}

/** A user's recent activity window, grouped for the "open conversations" list. */
export interface AdminAiConversation {
  userId: string | null;
  userEmail: string | null;
  lastAskAt: string | null;
  asks: AdminAiAsk[];
}

/** Headline stats + open conversations for /admin/ai. */
export interface AdminAiOverview {
  asks24h: number;
  users24h: number;
  cacheHitRate24h: number;
  aiRate24h: number;
  avgLatencyMs24h: number | null;
  feedback7d: {
    up: number;
    down: number;
    /** up / (up + down); null until something is rated. */
    satisfaction: number | null;
  };
  openConversations: AdminAiConversation[];
}

/** One page of the filterable ask history. */
export interface AdminAiLogPage {
  items: AdminAiAsk[];
  total: number;
  page: number;
  pageSize: number;
}

/** One ask in full + the asker's other recent asks. */
export interface AdminAiLogDetail extends AdminAiAsk {
  conversation: AdminAiAsk[];
}

/** Filters for the ask-history table. */
export interface AdminAiLogFilters {
  feedback?: "up" | "down" | "rated";
  source?: "ai" | "fallback";
  game?: string;
  userId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}
