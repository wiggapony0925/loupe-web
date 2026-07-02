import { useEffect, useState } from "react";
import { Check, ChevronUp, Layers, X } from "lucide-react";
import type { ScanCandidate } from "@loupe/core";
import { CardThumb } from "@/components";
import { cx } from "@/lib/cx";
import { candidateArt } from "../candidateArt";
import { ScanResultRow } from "./ScanResultRow";
import type { TrayEntry } from "./scanTypes";
import styles from "./ScanDock.module.scss";

/**
 * The live-scan basket, redesigned so a growing stack never buries the camera.
 *
 * Two states:
 *  • **Collapsed** (default while scanning) — a slim bar above the shutter with
 *    a count and a horizontal strip of small thumbnails. The viewfinder stays
 *    fully visible so you can keep capturing card after card.
 *  • **Expanded** (tap to review) — a bottom sheet with the full rich rows
 *    (art · number · live price · 30-day trend) over a scrim, where you open or
 *    remove cards. Tap the handle / scrim / a matched card to leave review.
 *
 * The newest capture animates in, so each scan still gives instant feedback
 * without a result panel covering the frame.
 */
export function ScanDock({
  session,
  onOpen,
  onRemove,
  onClear,
}: {
  session: TrayEntry[];
  onOpen: (card: ScanCandidate) => void;
  onRemove: (localId: string) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const matched = session.filter((e) => e.status === "matched").length;
  const working = session.some((e) => e.status === "identifying");

  // Auto-collapse once the basket is emptied so we never strand an open sheet.
  useEffect(() => {
    if (session.length === 0) setExpanded(false);
  }, [session.length]);

  if (session.length === 0) return null;

  return (
    <>
      {expanded && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close review"
          onClick={() => setExpanded(false)}
        />
      )}

      <section
        className={cx(styles.dock, expanded && styles.dockExpanded)}
        aria-label={`${session.length} cards scanned`}
      >
        {expanded ? (
          <div className={styles.sheet}>
            <button
              type="button"
              className={styles.handle}
              aria-label="Collapse review"
              onClick={() => setExpanded(false)}
            >
              <span className={styles.handleBar} />
            </button>
            <div className={styles.sheetHead}>
              <span className={styles.count}>
                <Layers size={13} /> {matched}/{session.length} identified
              </span>
              <button type="button" className={styles.clear} onClick={onClear}>
                Clear all
              </button>
            </div>
            <ul className={styles.list}>
              {session.map((e) => (
                <ScanResultRow
                  key={e.localId}
                  entry={e}
                  onOpen={() => e.card && onOpen(e.card)}
                  onRemove={() => onRemove(e.localId)}
                />
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            className={styles.bar}
            onClick={() => setExpanded(true)}
            aria-label={`Review ${session.length} scanned cards`}
          >
            <span className={cx(styles.pill, working && styles.pillWorking)}>
              <Layers size={13} />
              {matched}
              <span className={styles.pillTotal}>/{session.length}</span>
            </span>

            <span className={styles.strip}>
              {session.map((e) => (
                <DockThumb key={e.localId} entry={e} />
              ))}
            </span>

            <span className={styles.review}>
              Review
              <ChevronUp size={15} />
            </span>
          </button>
        )}
      </section>
    </>
  );
}

/** A small square in the collapsed strip: the photo, resolving to card art. */
function DockThumb({ entry }: { entry: TrayEntry }) {
  const card = entry.card;
  const matched = entry.status === "matched" && card !== null;
  return (
    <span
      className={cx(
        styles.thumb,
        styles.thumbNew,
        entry.status === "nomatch" && styles.thumbBad,
      )}
    >
      {matched ? (
        <CardThumb src={candidateArt(card)} alt={card.name} size="sm" className={styles.thumbImg} />
      ) : (
        <img
          src={entry.photo}
          alt=""
          className={cx(styles.thumbImg, entry.status === "nomatch" && styles.thumbDim)}
        />
      )}
      {entry.status === "identifying" && <span className={styles.thumbScan} aria-hidden />}
      {matched && (
        <span className={styles.thumbCheck} aria-hidden>
          <Check size={9} />
        </span>
      )}
      {entry.status === "nomatch" && (
        <span className={styles.thumbX} aria-hidden>
          <X size={9} />
        </span>
      )}
    </span>
  );
}
