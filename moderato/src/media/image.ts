/** Image normalisation: whatever the caller has → a data URI. */

import type { ImagePart, ImageSource } from "../types.js";

type NodeBufferCtor = {
  from(bytes: Uint8Array): { toString(encoding: "base64"): string };
};

/** Base64 without assuming Node's Buffer or choking large arrays in btoa. */
export function toBase64(bytes: Uint8Array): string {
  const NodeBuffer = (globalThis as { Buffer?: NodeBufferCtor }).Buffer;
  if (NodeBuffer) return NodeBuffer.from(bytes).toString("base64");
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function bytesToDataUri(bytes: Uint8Array, contentType: string): string {
  return `data:${contentType};base64,${toBase64(bytes)}`;
}

/** Normalise one image source. Blobs are read; data URIs pass through. */
export async function toImagePart(source: ImageSource): Promise<ImagePart> {
  if (source instanceof Blob) {
    const bytes = new Uint8Array(await source.arrayBuffer());
    return { dataUri: bytesToDataUri(bytes, source.type || "image/jpeg") };
  }
  if ("dataUri" in source) return { dataUri: source.dataUri };
  return { dataUri: bytesToDataUri(source.bytes, source.contentType) };
}

/**
 * Downscale an image blob so its longest edge is at most `maxDimension`.
 * Browser only (needs canvas); anywhere else, or on any failure, the
 * original comes back — a smaller payload is an optimisation, not a
 * requirement, and screening must not fail because resizing did.
 */
export async function downscaleImage(
  blob: Blob,
  maxDimension = 1024,
): Promise<Blob> {
  if (typeof document === "undefined" || typeof createImageBitmap === "undefined") {
    return blob;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= maxDimension) {
      bitmap.close();
      return blob;
    }
    const scale = maxDimension / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return blob;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return out ?? blob;
  } catch {
    return blob;
  }
}
