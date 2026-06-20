/** Shared facts for the Loupe Scanner product page + checkout. One source of
 *  truth so the buy box, order summary, and specs never drift. */

/** Launch price in USD. (Charged via Stripe once invites go out — $0 to reserve.) */
export const SCANNER_PRICE = 149;
export const SCANNER_LIST_PRICE = 199;

export function scannerPriceLabel(amount: number = SCANNER_PRICE): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export interface SpecRow {
  label: string;
  value: string;
}

export const SCANNER_HIGHLIGHTS: string[] = [
  "Computer-vision centering, edges & corners in seconds",
  "Instant PSA / BGS / CGC grade estimate before you submit",
  "Every scan syncs straight to your Loupe vault",
  "Works with raw singles and slabs — no calibration",
];

export const SCANNER_SPECS: SpecRow[] = [
  { label: "Capture", value: "Dual 48MP sensors, diffuse LED ring" },
  { label: "Grading model", value: "On-device vision + cloud refinement" },
  { label: "Throughput", value: "~3 seconds per card" },
  { label: "Connectivity", value: "USB-C + Wi-Fi sync to web & mobile" },
  { label: "Compatibility", value: "Standard & oversized TCG cards, slabs" },
  { label: "In the box", value: "Scanner, tray, USB-C cable, quick start" },
];

export interface ScannerFaq {
  q: string;
  a: string;
}

export const SCANNER_FAQ: ScannerFaq[] = [
  {
    q: "When does it ship?",
    a: "We're inviting waitlist members in batches. Join now to lock your place — you'll get a private checkout link the moment your batch opens.",
  },
  {
    q: "Do I pay now?",
    a: "No. Reserving is free and requires no card. You only pay the launch price when you accept your invite.",
  },
  {
    q: "How accurate is the grade estimate?",
    a: "The scanner predicts centering, edges, and corners from high-resolution capture and maps them to the major grading scales, so you only send the cards worth slabbing.",
  },
  {
    q: "Does it work with my collection?",
    a: "Yes — every scan flows into your existing Loupe vault on web and mobile, with live, grade-aware valuations.",
  },
];
