import type { ScanCandidate } from "@loupe/core";

/** One entry in the batch scan tray. The captured photo shows instantly as a
 *  placeholder; once identify resolves it flips to the matched card (with its
 *  live price + trend), or a no-match you can retake. */
export interface TrayEntry {
  localId: string;
  photo: string; // object URL of the frame we captured
  status: "identifying" | "matched" | "nomatch";
  card: ScanCandidate | null;
}
