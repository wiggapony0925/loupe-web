/** The user's vault: graded cards + watchlist + create/update inputs. */

/** A graded/owned card in the user's vault (from GET /v1/grades). */
export interface GradedCard {
  id: string;
  cardId: string;
  cardName?: string;
  cardImageUrl?: string;
  cardSetName?: string;
  cardNumber?: string;
  grade: number;
  house: string;
  condition?: RawCondition | null;
  estimatedValueUsd?: number;
  purchasePriceUsd?: number;
  purchaseDate?: string | null;
  notes?: string | null;
  /** Total graded copies of this card the user owns (backend `copies_owned`). */
  copies?: number;
}

export interface GradesParams {
  sort?: "value_desc" | "value_asc" | "grade_desc" | "grade_asc";
  limit?: number;
  cursor?: number;
  house?: string;
}

/** Grading house. `loupe` = ungraded/raw (uses `condition` instead of a slab grade). */
export type GradeHouse = "psa" | "bgs" | "sgc" | "cgc" | "tag" | "loupe";

/** Raw-card condition (only meaningful when `house === "loupe"`). */
export type RawCondition = "nm" | "lp" | "mp" | "hp" | "dmg";

/** Add a card to the user's collection (vault). Either `cardId` or
 *  `upstreamId` (e.g. `"pokemontcg:base1-4"`) must be supplied — the backend
 *  materializes the local card row from an upstream id. Mirrors the mobile
 *  app's `useCreateGrade`. */
export interface CreateGradeInput {
  cardId?: string | null;
  upstreamId?: string | null;
  /** Numeric grade in [0, 10]. For raw cards pass 0 and set `condition`. */
  grade: number;
  house: GradeHouse;
  condition?: RawCondition | null;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
}

/** Edit an existing holding. Every field is optional — send only what changed.
 *  Mirrors the mobile app's `useUpdateGrade` and `PATCH /v1/grades/{id}`. */
export interface UpdateGradeInput {
  id: string;
  grade?: number;
  house?: GradeHouse;
  condition?: RawCondition | null;
  purchasePriceUsd?: number | null;
  purchaseDate?: string | null;
  estimatedValueUsd?: number | null;
  notes?: string | null;
}

/** A pinned card on the user's watchlist (name/image joined for the UI). */
export interface WatchlistItem {
  id: string;
  cardId: string;
  cardName?: string;
  cardImageUrl?: string;
}
