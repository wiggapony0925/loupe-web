/** Admin card explorer view models. Mirrors app/schemas/card_admin.py. */

export interface AdminCardRow {
  id: string;
  name: string;
  setName: string | null;
  number: string | null;
  tcg: string;
  rarity: string | null;
  year: number | null;
  imageUrl: string | null;
}

export interface AdminCardPage {
  results: AdminCardRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminExternalRef {
  source: string;
  externalId: string;
  confidence: number | null;
}

export interface AdminPriceSnapshot {
  id: string;
  house: string;
  grade: number;
  source: string;
  priceUsd: number;
  saleDate: string | null;
  createdAt: string;
}

export interface AdminCardDetail extends AdminCardRow {
  setId: string;
  imagePhash: string | null;
  cardMetadata: Record<string, unknown> | null;
  externalRefs: AdminExternalRef[];
  prices: AdminPriceSnapshot[];
}

export interface AdminCardsParams {
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface PriceOverrideInput {
  house?: string;
  grade: number;
  priceUsd: number;
  saleDate?: string | null;
}
