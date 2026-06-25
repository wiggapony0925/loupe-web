/** Admin revenue analytics view models. Mirrors app/schemas/revenue.py. */

export interface RevenueMonthPoint {
  month: string;
  newPro: number;
}

export interface RevenueSummary {
  billingConfigured: boolean;
  currency: string;

  // Subscriber mix.
  paying: number;
  trialing: number;
  comped: number;
  free: number;
  totalUsers: number;

  // Money (estimates).
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  estMrrUsd: number;
  estArrUsd: number;

  // Movement (trailing 30 days).
  newPro30d: number;
  churned30d: number;
  churnRate30d: number;

  // Trend.
  proByMonth: RevenueMonthPoint[];
}
