import type { ApplicationStatus } from "@loupe/core";

/** Human labels for application pipeline stages. */
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  submitted: "Submitted",
  reviewing: "In review",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not moving forward",
  withdrawn: "Withdrawn",
};

/** Tone keys consumed by the `data-tone` CSS in the track + admin views. */
export const STATUS_TONE: Record<ApplicationStatus, "neutral" | "blue" | "amber" | "mint" | "rose"> = {
  submitted: "neutral",
  reviewing: "blue",
  interview: "amber",
  offer: "mint",
  hired: "mint",
  rejected: "rose",
  withdrawn: "neutral",
};

/** The pipeline order admins advance applications through. */
export const STATUS_ORDER: ApplicationStatus[] = [
  "submitted",
  "reviewing",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
];
