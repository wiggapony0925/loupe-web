import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload,
  RefreshCw,
  Sparkles,
  Tag,
  TrendingUp,
  X,
  ImagePlus,
} from "lucide-react";
import { useValuation, type CardSummary, type Money } from "@loupe/core";
import { Button, Badge, Stat, Delta, NoteCard, SearchCombobox, ThemeToggle } from "@/components";
import { Logo } from "@/assets";
import { formatMoney } from "@/lib/format";
import { InspectCanvas } from "./InspectCanvas";
import {
  measureCentering,
  loupeGrade,
  nearestPsaLabel,
  type Frame,
} from "./grade";
import styles from "./LoupeGrade.module.scss";

const DEFAULT_OUTER: Frame = { top: 0.05, right: 0.95, bottom: 0.95, left: 0.05 };
const DEFAULT_INNER: Frame = { top: 0.13, right: 0.87, bottom: 0.87, left: 0.13 };

const money = (m?: Money | null) => (m ? formatMoney(m) : "—");

/**
 * Loupe Grade — a full-screen inspection workspace (Figma-canvas style): a
 * large centered canvas with a docked inspector rail. Drop a card photo, align
 * the frames + rate the corners/edges/surface, and get a transparent grade
 * estimate tied to Loupe's real PSA-10 value ladder.
 */
export function LoupeGrade() {
  const navigate = useNavigate();
  const [src, setSrc] = useState<string | null>(null);
  const [outer, setOuter] = useState<Frame>(DEFAULT_OUTER);
  const [inner, setInner] = useState<Frame>(DEFAULT_INNER);
  const [corners, setCorners] = useState(9);
  const [edges, setEdges] = useState(9);
  const [surface, setSurface] = useState(9);
  const [card, setCard] = useState<Pick<CardSummary, "id" | "name"> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setFrame = useCallback((which: "outer" | "inner", f: Frame) => {
    (which === "outer" ? setOuter : setInner)(f);
  }, []);

  const loadFile = useCallback((file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setOuter(DEFAULT_OUTER);
    setInner(DEFAULT_INNER);
  }, []);

  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );

  const centering = useMemo(() => measureCentering(outer, inner), [outer, inner]);
  const subs = { centering: centering?.grade ?? 8, corners, edges, surface };
  const result = loupeGrade(subs);

  // PSA-10 upside — Loupe's real graded ladder for the attached card.
  const { data: valuation } = useValuation(card?.id ?? "");
  const raw =
    valuation?.grades.find((g) => /ungraded|raw/i.test(g.grade))?.medianRecent ??
    valuation?.fairValue ??
    null;
  const tierLabel = nearestPsaLabel(result.estimate);
  const tier =
    valuation?.grades.find((g) => g.grade.toUpperCase() === tierLabel) ??
    valuation?.grades.find((g) => g.grade.toUpperCase() === "PSA 10");
  const graded = tier?.medianRecent ?? null;
  const upsidePct =
    raw?.amount && graded?.amount && raw.amount > 0
      ? ((graded.amount - raw.amount) / raw.amount) * 100
      : undefined;

  return (
    <div className={styles.workspace}>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand} aria-label="Loupe home">
          <Logo size={22} />
        </Link>
        <span className={styles.title}>
          <Sparkles size={14} /> Loupe Grade
        </span>
        <span className={styles.titleSub}>Inspection playground</span>
        <span className={styles.flex} />
        {src && (
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<RefreshCw size={15} />}
            onClick={() => fileRef.current?.click()}
          >
            New photo
          </Button>
        )}
        <ThemeToggle compact />
        <button
          type="button"
          className={styles.close}
          onClick={() => navigate("/")}
          aria-label="Exit workspace"
        >
          <X size={18} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.fileInput}
          onChange={(e) => loadFile(e.target.files?.[0])}
        />
      </header>

      <div className={styles.body}>
        <main className={styles.canvasZone}>
          {src ? (
            <InspectCanvas
              src={src}
              outer={outer}
              inner={inner}
              onChange={setFrame}
            />
          ) : (
            <label
              className={styles.drop}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                loadFile(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={(e) => loadFile(e.target.files?.[0])}
              />
              <span className={styles.dropIcon}>
                <ImagePlus size={34} />
              </span>
              <span className={styles.dropTitle}>Drop a card photo here</span>
              <span className={styles.dropHint}>
                or click to browse · JPG / PNG · front of the card works best
              </span>
            </label>
          )}
        </main>

        <aside className={styles.rail}>
          {!src ? (
            <div className={styles.intro}>
              <h1 className={styles.introTitle}>Grade it before you grade it</h1>
              <p className={styles.introSub}>
                Measure centering, loupe the corners, and see the estimated
                grade next to the real PSA-10 upside — before you pay a
                submission fee.
              </p>
              <ol className={styles.steps}>
                <li>
                  <span>1</span> Drop a card photo (or an eBay listing
                  screenshot).
                </li>
                <li>
                  <span>2</span> Align the card-edge + print-border frames to
                  measure centering.
                </li>
                <li>
                  <span>3</span> Loupe the corners, rate condition, read the
                  estimate + upside.
                </li>
              </ol>
              <Button
                size="lg"
                leadingIcon={<Upload size={16} />}
                onClick={() => fileRef.current?.click()}
              >
                Upload a photo
              </Button>
            </div>
          ) : (
            <div className={styles.panels}>
              {/* The estimate */}
              <section className={styles.score}>
                <span className={styles.cardLabel}>Estimated Loupe Grade</span>
                <div className={styles.scoreRow}>
                  <span className={styles.scoreNum}>
                    {result.estimate.toFixed(1)}
                  </span>
                  <Badge tone="mint">{result.band}</Badge>
                </div>
                <p className={styles.verdict}>{result.verdict}</p>
                <div className={styles.subs}>
                  <Stat
                    label="Centering"
                    value={
                      centering
                        ? `${subs.centering.toFixed(0)} · ${centering.hLabel}`
                        : "Align frames"
                    }
                  />
                  <Stat label="Corners" value={String(corners)} />
                  <Stat label="Edges" value={String(edges)} />
                  <Stat label="Surface" value={String(surface)} />
                </div>
                {centering && (
                  <p className={styles.centeringNote}>
                    Horizontal {centering.hLabel} · Vertical {centering.vLabel} —
                    the worse axis sets the centering sub-grade.
                  </p>
                )}
              </section>

              {/* Condition self-rating */}
              <section className={styles.block}>
                <span className={styles.blockTitle}>Condition read</span>
                {(
                  [
                    ["Corners", corners, setCorners],
                    ["Edges", edges, setEdges],
                    ["Surface", surface, setSurface],
                  ] as const
                ).map(([label, val, set]) => (
                  <label key={label} className={styles.slider}>
                    <span className={styles.sliderHead}>
                      <span>{label}</span>
                      <span className={styles.sliderVal}>{val}</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={val}
                      onChange={(e) => set(Number(e.target.value))}
                    />
                  </label>
                ))}
                <p className={styles.blockHint}>
                  Use the loupe (2×/5×/10×) to read each corner, then rate it.
                </p>
              </section>

              {/* PSA-10 upside */}
              <section className={styles.block}>
                <span className={styles.blockTitle}>
                  <Tag size={14} /> Grade upside
                </span>
                {!card ? (
                  <>
                    <p className={styles.blockHint}>
                      Attach the matching card to see raw value vs the grade
                      you're estimating.
                    </p>
                    <SearchCombobox
                      onSearch={(q) =>
                        navigate(
                          `/cards${q ? `?q=${encodeURIComponent(q)}` : ""}`,
                        )
                      }
                      onSelectCard={(c) => setCard({ id: c.id, name: c.name })}
                    />
                  </>
                ) : (
                  <>
                    <div className={styles.valueCard}>
                      <span className={styles.valueName}>{card.name}</span>
                      <button
                        type="button"
                        className={styles.valueChange}
                        onClick={() => setCard(null)}
                      >
                        Change
                      </button>
                    </div>
                    <div className={styles.valueRow}>
                      <Stat label="Raw market" value={money(raw)} />
                      <Stat
                        label={`If it grades ~${tierLabel}`}
                        value={money(graded)}
                      />
                    </div>
                    {upsidePct !== undefined ? (
                      <div className={styles.upside}>
                        <TrendingUp size={16} />
                        <span>Potential upside</span>
                        <Delta percent={upsidePct} variant="pill" size="md" />
                      </div>
                    ) : (
                      <p className={styles.blockHint}>
                        No graded comps yet for this card — try a higher-volume
                        card or check back as comps fill in.
                      </p>
                    )}
                  </>
                )}
              </section>

              <NoteCard
                title="Estimate only"
                message="Loupe Grade is a photo-based pre-screen, not an official grade. It isn't affiliated with PSA, BGS, or CGC, and the real grade depends on factors a single photo can't show."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
