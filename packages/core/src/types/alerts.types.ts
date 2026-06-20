/** Price-alert domain types (mirrors backend `PriceAlertRead` / `PriceAlertCreate`). */

/** Fire when the card's market price crosses the threshold in this direction. */
export type PriceAlertCondition = "above" | "below";

/** A price alert the signed-in user has set on a card. */
export interface PriceAlert {
  id: string;
  cardId: string;
  condition: PriceAlertCondition;
  thresholdUsd: number;
  note: string | null;
  createdAt: string;
  /** Set once the alert has fired; `null` while still pending. */
  triggeredAt: string | null;
  triggeredPriceUsd: number | null;
  /** Joined card metadata so rows render without an extra fetch. */
  cardName: string | null;
  cardImageUrl: string | null;
}

/**
 * Create payload. Identify the card by *either* a public composite
 * `upstreamId` (web card-detail — the backend materializes a local card) or a
 * resolved local `cardId` (mobile).
 */
export interface CreateAlertInput {
  upstreamId?: string;
  cardId?: string;
  condition: PriceAlertCondition;
  thresholdUsd: number;
  note?: string;
}
