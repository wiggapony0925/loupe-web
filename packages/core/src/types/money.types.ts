/** Money + trend primitives. */

export interface Money {
  amount: number;
  currency: string;
}

export type Trend = "up" | "down" | "flat";
