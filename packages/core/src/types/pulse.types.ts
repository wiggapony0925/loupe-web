/** Admin live activity feed view models. Mirrors app/schemas/pulse.py. */

export type PulseType = "signup" | "scan" | "acquisition" | "admin";

export interface PulseEvent {
  id: string;
  type: PulseType;
  at: string;
  actor: string | null;
  title: string;
  detail: string | null;
  valueUsd: number | null;
}

export interface PulseFeed {
  events: PulseEvent[];
}
