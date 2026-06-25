/** Admin engagement / retention view models. Mirrors app/schemas/engagement.py. */

export interface EngWeekPoint {
  week: string;
  newUsers: number;
}

export interface EngFunnelStep {
  label: string;
  count: number;
}

export interface EngagementSummary {
  totalUsers: number;
  active7d: number;
  active30d: number;
  active90d: number;

  activatedUsers: number;
  activationRate: number;
  proUsers: number;
  proRate: number;

  newUsersByWeek: EngWeekPoint[];
  funnel: EngFunnelStep[];
}
