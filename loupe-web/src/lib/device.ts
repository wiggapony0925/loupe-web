/**
 * Heuristic "is this a mobile device" check — used to route camera-first flows.
 * Live card scanning needs a rear camera; a desktop webcam is front-facing and
 * useless for scanning a card, so on desktop we steer users to photo upload.
 * This is UX routing, not security — don't gate anything sensitive on it.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|Tablet/i.test(ua)) return true;
  // iPadOS 13+ masquerades as macOS — fall back to touch + coarse pointer.
  const touch = navigator.maxTouchPoints > 1;
  const coarse =
    typeof matchMedia !== "undefined" && matchMedia("(pointer: coarse)").matches;
  return touch && coarse;
}
