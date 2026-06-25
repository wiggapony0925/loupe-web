/** Admin catalog-coverage view models. Mirrors app/schemas/catalog.py. */

export interface GameCoverage {
  tcg: string;
  label: string;
  sets: number;
  cards: number;
  /** Cards with a perceptual hash — eligible for the scanner fast path. */
  phashCards: number;
  phashPct: number;
  /** False when marketed/scaffolded but with no catalog data yet. */
  backed: boolean;
}

export interface CatalogCoverage {
  totalCards: number;
  totalSets: number;
  phashCoveragePct: number;
  priceSnapshots: number;
  priceBySource: Record<string, number>;
  games: GameCoverage[];
}
