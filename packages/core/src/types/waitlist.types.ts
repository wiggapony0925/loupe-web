/** Loupe Scanner waitlist. */

export type WaitlistStatus = "waiting" | "invited" | "purchased" | "removed";

/** A Loupe Scanner waitlist signup (admin view). */
export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  interest?: string | null;
  referralSource?: string | null;
  /** Linked Loupe account, when the visitor was signed in at signup. */
  userId?: string | null;
  quantity: number;
  status: WaitlistStatus;
  createdAt: string;
  updatedAt: string;
}

/** Public response after joining the waitlist. */
export interface WaitlistJoined {
  id: string;
  email: string;
  status: WaitlistStatus;
  /** 1-based place in line among waiting signups. */
  position: number;
  createdAt: string;
}

/** Aggregate waitlist counts for social proof. */
export interface WaitlistStats {
  total: number;
  waiting: number;
}

/** Payload for the "Join the waitlist" checkout CTA. */
export interface WaitlistJoinInput {
  email: string;
  name?: string;
  interest?: string;
  referralSource?: string;
  quantity?: number;
}
