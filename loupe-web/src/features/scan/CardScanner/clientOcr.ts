/**
 * On-device OCR fallback (Tesseract.js).
 *
 * The backend identify returns `fallbackRequired` when the paid Google Vision
 * budget is exhausted. Rather than fail the scan, we OCR the frame in the
 * browser and resubmit the text to `POST /v1/cards/identify/text` — the scanner
 * keeps working and costs nothing. Tesseract's worker + WASM + language data
 * (~a few MB) load lazily on first use, so there's zero cost unless the fallback
 * actually fires.
 */

/** Minimal shape of the Tesseract worker we rely on (avoids an `any` leak). */
interface OcrWorker {
  recognize(image: Blob): Promise<{ data: { text: string } }>;
}

let workerPromise: Promise<OcrWorker> | null = null;

async function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(
      (m) => m.createWorker("eng") as unknown as Promise<OcrWorker>,
    );
  }
  return workerPromise;
}

/** OCR an image blob to raw text (best effort — returns "" on any failure). */
export async function ocrImageToText(blob: Blob): Promise<string> {
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(blob);
    return (data?.text ?? "").trim();
  } catch {
    return "";
  }
}
