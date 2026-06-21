/** Sealed-product catalog + ownership types (mirrors backend `schemas/sealed.py`). */

import type { Money } from "./money.types";

/** Closed vocabulary of sealed product categories (mirrors SealedProductTypeEnum). */
export type SealedProductType =
  | "booster_box"
  | "booster_pack"
  | "etb"
  | "collection_box"
  | "premium_collection"
  | "tin"
  | "blister"
  | "bundle"
  | "case"
  | "other";

/** A sealed product in the public catalog (booster box, ETB, tin, …). */
export interface SealedProduct {
  id: string;
  tcg: string;
  productType: SealedProductType | string;
  setId?: string | null;
  name: string;
  setName?: string | null;
  imageUrl?: string | null;
  /** Manufacturer's suggested retail price. */
  msrp?: Money | null;
  releaseDate?: string | null;
}

/** The signed-in user's owned sealed product (joined to catalog metadata). */
export interface SealedHolding {
  id: string;
  productId: string;
  quantity: number;
  purchasePrice?: Money | null;
  purchaseDate?: string | null;
  estimatedValue?: Money | null;
  notes?: string | null;
  /** Set when the user "rips" the box; null while still sealed. */
  openedAt?: string | null;
  acquiredAt: string;
  // Joined product metadata (so a holdings list renders without an N+1 fetch).
  productName?: string | null;
  productImageUrl?: string | null;
  productType?: SealedProductType | string | null;
  productTcg?: string | null;
  productSetName?: string | null;
}

export interface SealedSearchParams {
  q?: string;
  tcg?: string;
  productType?: string;
  limit?: number;
  cursor?: number;
}

export type SealedHoldingSort = "recent" | "oldest" | "value_desc" | "value_asc";

export interface SealedHoldingsParams {
  includeOpened?: boolean;
  sort?: SealedHoldingSort;
  limit?: number;
  cursor?: number;
}

/** Body for `POST /v1/sealed-holdings`. */
export interface SealedHoldingCreateInput {
  productId: string;
  quantity?: number;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
}

/** Body for `PATCH /v1/sealed-holdings/{id}`. */
export interface SealedHoldingUpdateInput {
  quantity?: number;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
  /** ISO timestamp to mark the box opened (one-way toggle in the UI). */
  openedAt?: string | null;
}
