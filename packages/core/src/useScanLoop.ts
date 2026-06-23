import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { ScanCandidate } from "./types";

export interface UseScanLoopOptions {
  /**
   * Capture the current camera frame as a JPEG `Blob`, or `null` when the
   * camera isn't ready. This is the ONE platform-specific piece each caller
   * supplies — web draws the `<video>` to a `<canvas>`; React Native shoots a
   * frame with the camera module. Everything else (cadence, single-flight,
   * candidate + lock state) is shared here.
   */
  captureFrame: () => Promise<Blob | null>;
  /** Run the loop while `true`; pause (and stop firing) when `false`. */
  enabled: boolean;
  /** Minimum gap between identify calls, ms. Mirrors the mobile cadence. */
  intervalMs?: number;
  /** Optional TCG hint forwarded to `/v1/cards/identify`. */
  tcg?: string;
  /** Confidence at/above which the top match counts as a confident lock. */
  lockConfidence?: number;
}

export interface ScanLoopResult {
  candidates: ScanCandidate[];
  /** Confidence of the current top candidate (0 when none). */
  topConfidence: number;
  /** True while an identify request is in flight. */
  scanning: boolean;
  /** True once `topConfidence >= lockConfidence`. */
  locked: boolean;
  /** True when the last *manual* capture/upload matched nothing — drives the
   *  "no match, try a clearer photo" feedback. Never set by the live loop. */
  noMatch: boolean;
  /**
   * Run a single identify on a provided blob (e.g. an uploaded photo). Pass
   * `manual = true` for a deliberate upload/shutter so it bypasses the loop's
   * single-flight guard (it must never be silently dropped) and reports a miss.
   */
  identifyBlob: (blob: Blob, manual?: boolean) => Promise<void>;
  /** Clear candidates + confidence (e.g. to re-scan). */
  reset: () => void;
}

/**
 * Framework-agnostic "point the camera, stream matches" loop, shared by every
 * Loupe scanner (web `CardScanner`, the upload modal, and any future client).
 *
 * The valuable logic — debounced cadence, single-flight so a slow request
 * never stacks, candidate + lock-confidence state — lives here once; callers
 * only provide `captureFrame()`. The identify API + ranking already live
 * server-side in `/v1/cards/identify` (pHash fast path + OCR + scoring), so
 * this is purely the client orchestration around it.
 */
export function useScanLoop({
  captureFrame,
  enabled,
  intervalMs = 800,
  tcg,
  lockConfidence = 0.6,
}: UseScanLoopOptions): ScanLoopResult {
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [topConfidence, setTopConfidence] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const busyRef = useRef(false); // single-flight guard — never stack requests
  const cancelledRef = useRef(false);

  const identifyBlob = useCallback(
    async (blob: Blob, manual = false) => {
      // The live loop is single-flighted so requests never stack; a manual
      // upload/shutter must ALWAYS run, even if a frame is mid-identify.
      if (!manual && busyRef.current) return;
      if (!manual) busyRef.current = true;
      setScanning(true);
      setNoMatch(false);
      try {
        const res = await api.cards.identify(blob, tcg);
        if (cancelledRef.current) return;
        if (res.candidates.length > 0) {
          setCandidates(res.candidates);
          setTopConfidence(res.accuracy);
        } else if (manual) {
          // A deliberate capture that matched nothing — surface it so the
          // user isn't left staring at a frame that "did nothing".
          setNoMatch(true);
        }
      } catch {
        // Transient (network blip / bad frame) — the next frame retries.
      } finally {
        if (!manual) busyRef.current = false;
        setScanning(false);
      }
    },
    [tcg],
  );

  const reset = useCallback(() => {
    setCandidates([]);
    setTopConfidence(0);
    setNoMatch(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    if (!enabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (!active) return;
      const blob = await captureFrame();
      if (blob) await identifyBlob(blob);
      if (active) timer = setTimeout(tick, intervalMs);
    };
    // Small initial delay so the camera has a beat to settle.
    timer = setTimeout(tick, Math.round(intervalMs / 2));
    return () => {
      active = false;
      cancelledRef.current = true;
      clearTimeout(timer);
    };
  }, [enabled, captureFrame, identifyBlob, intervalMs]);

  return {
    candidates,
    topConfidence,
    scanning,
    locked: topConfidence >= lockConfidence,
    noMatch,
    identifyBlob,
    reset,
  };
}
