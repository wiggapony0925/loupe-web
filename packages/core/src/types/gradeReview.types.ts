/** Admin grade-review queue view models. Mirrors app/schemas/grade_review.py. */

export interface GradeReviewRow {
  id: string;
  userEmail: string | null;
  cardName: string | null;
  cardImageUrl: string | null;
  setName: string | null;
  house: string;
  grade: number;
  subgrades: Record<string, unknown> | null;
  condition: string | null;
  estimatedValueUsd: number | null;
  acquiredVia: string | null;
  gradedAt: string;
}

export interface GradeReviewPage {
  results: GradeReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  houses: string[];
}

export interface GradeReviewParams {
  house?: string;
  page?: number;
  pageSize?: number;
}
