/** Shared facts for the Loupe Scanner product page + checkout. One source of
 *  truth so the buy box, order summary, and specs never drift. Mirrors the
 *  device the backend models in app/models/scanner.py — a Raspberry-Pi-based
 *  capture device that talks to the API over Wi-Fi/BLE and syncs to the vault. */

/** Launch price in USD. (Charged via Stripe once invites go out — $0 to reserve.) */
export const SCANNER_PRICE = 49.99;
export const SCANNER_LIST_PRICE = 79.99;

export function scannerPriceLabel(amount: number = SCANNER_PRICE): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** A canonical grade read-out used by the showcase overlay (sells the pitch:
 *  measure sub-grades, predict the slab). */
export const SCANNER_SUBGRADES: Array<{ label: string; value: number }> = [
  { label: "Centering", value: 9.5 },
  { label: "Edges", value: 9.0 },
  { label: "Corners", value: 9.5 },
  { label: "Surface", value: 10 },
];

export interface SpecRow {
  label: string;
  value: string;
}

export const SCANNER_HIGHLIGHTS: string[] = [
  "Computer-vision centering, edges, corners & surface — in seconds",
  "Instant PSA / BGS / CGC grade estimate before you submit",
  "Wi-Fi & Bluetooth — every scan lands in your vault automatically",
  "Raw singles or slabs, across Pokémon, Magic & Yu-Gi-Oh!",
];

export const SCANNER_SPECS: SpecRow[] = [
  { label: "Brain", value: "Raspberry Pi 5 — on-device capture, cloud-refined grading" },
  { label: "Capture", value: "12MP camera module + diffused LED ring" },
  { label: "Grading model", value: "Loupe vision model (centering, edges, corners, surface)" },
  { label: "Throughput", value: "~3 seconds per card" },
  { label: "Connectivity", value: "Wi-Fi + Bluetooth, auto-sync to web & mobile" },
  { label: "Compatibility", value: "Raw singles, graded slabs, standard & jumbo cards" },
  { label: "In the box", value: "Scanner, card tray, USB-C power, quick start guide" },
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
    a: "No. Reserving is free and needs no card. You only pay the launch price ($49.99) when you accept your invite.",
  },
  {
    q: "How accurate is the grade estimate?",
    a: "The scanner captures high-resolution images and our vision model measures centering, edges, corners, and surface, then maps them to the major grading scales — so you only send the cards worth slabbing.",
  },
  {
    q: "Does it work with my collection?",
    a: "Yes — it reads raw singles and slabbed cards across Pokémon, Magic, and Yu-Gi-Oh!, and every scan flows into your existing Loupe vault with live, grade-aware valuations.",
  },
];
