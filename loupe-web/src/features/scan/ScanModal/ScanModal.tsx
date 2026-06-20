import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImageUp, Loader2, ScanLine } from "lucide-react";
import { useIdentifyCard, type ScanResult } from "@loupe/core";
import { Modal, Button, CardThumb } from "@/components";
import styles from "./ScanModal.module.scss";

export interface ScanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Downscale a photo to a sane size before upload — phone shots are huge and
 *  the backend caps the upload; ~1600px JPEG keeps it fast and within budget. */
async function downscale(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality),
  );
}

/**
 * Web card scan — pick or shoot a photo, we identify it, and link to the match.
 * Mirrors the mobile scan screen. Gated to signed-in users by the caller.
 */
export function ScanModal({ open, onOpenChange }: ScanModalProps) {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const identify = useIdentifyCard({ onSuccess: (r) => setResult(r) });

  useEffect(() => {
    if (open) return;
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return null;
    });
    setResult(null);
    identify.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setResult(null);
    setPreview((p) => {
      if (p) URL.revokeObjectURL(p);
      return URL.createObjectURL(file);
    });
    const blob = await downscale(file);
    identify.mutate({ image: blob });
  }

  const top = result?.candidates ?? [];

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title="Scan a card"
      description="Take or upload a clear photo of a single card — we'll find it in the catalog."
    >
      <div className={styles.scan}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={styles.hidden}
          onChange={onPick}
        />

        {!preview && !result && (
          <button type="button" className={styles.drop} onClick={() => fileRef.current?.click()}>
            <span className={styles.drop__icon}>
              <ScanLine size={30} />
            </span>
            <span className={styles.drop__title}>Take or choose a photo</span>
            <span className={styles.drop__hint}>Center one card, fill the frame, avoid glare.</span>
          </button>
        )}

        {preview && (
          <div className={styles.stage}>
            <img src={preview} alt="Scanned card" className={styles.stage__img} />
            {identify.isPending && (
              <div className={styles.stage__scanning}>
                <Loader2 className={styles.spin} size={22} /> Identifying…
              </div>
            )}
          </div>
        )}

        {result && top.length > 0 && (
          <div className={styles.matches}>
            <span className={styles.matches__label}>Best matches</span>
            {top.slice(0, 4).map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.match}
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/cards/${encodeURIComponent(c.id)}`);
                }}
              >
                {c.imageUrl && (
                  <span className={styles.match__art}>
                    <CardThumb src={c.imageUrl} alt={c.name} size="sm" />
                  </span>
                )}
                <span className={styles.match__body}>
                  <span className={styles.match__name}>{c.name}</span>
                  <span className={styles.match__meta}>
                    {[c.setName, c.number].filter(Boolean).join(" · ") || c.tcg}
                  </span>
                </span>
                <span className={styles.match__conf}>{Math.round(c.confidence * 100)}%</span>
              </button>
            ))}
          </div>
        )}

        {result && top.length === 0 && !identify.isPending && (
          <p className={styles.empty}>
            No confident match. Try a sharper, well-lit photo with the whole card in frame.
          </p>
        )}
        {identify.isError && (
          <p className={styles.empty}>Couldn't process that image. Please try another photo.</p>
        )}

        <div className={styles.actions}>
          <Button
            block
            variant={preview ? "secondary" : "primary"}
            size="lg"
            leadingIcon={preview ? <ImageUp size={18} /> : <Camera size={18} />}
            onClick={() => fileRef.current?.click()}
            disabled={identify.isPending}
          >
            {preview ? "Try another photo" : "Take / upload photo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
