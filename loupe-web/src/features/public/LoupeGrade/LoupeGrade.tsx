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
  Loader2,
  Check,
  ArchiveRestore,
} from "lucide-react";
import {
  useValuation,
  useIdentifyCard,
  useAddGrade,
  type CardSummary,
  type ScanCandidate,
  type Money,
} from "@loupe/core";
import {
  Button,
  Badge,
  Stat,
  Delta,
  NoteCard,
  SearchCombobox,
  ThemeToggle,
  CardThumb,
} from "@/components";
import { Logo } from "@/assets";
import { useAuth } from "@/auth/AuthProvider";
import { formatMoney } from "@/lib/format";
import { InspectCanvas } from "./InspectCanvas";
import {
  measureCentering,
  loupeGrade,
  nearestPsaLabel,
  detectCard,
  type Frame,
} from "./grade";
import styles from "./LoupeGrade.module.scss";

const DEFAULT_OUTER: Frame = { top: 0.05, right: 0.95, bottom: 0.95, left: 0.05 };
const DEFAULT_INNER: Frame = { top: 0.13, right: 0.87, bottom: 0.87, left: 0.13 };

const money = (m?: Money | null) => (m ? formatMoney(m) : "—");

/** Downscale a phone photo before upload — mirrors the scanner so identify
 *  stays fast and within the backend's upload cap. */
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
 * Loupe Grade — a full-screen inspection workspace (Figma-canvas style): a
 * large centered canvas with a docked inspector rail. Drop a card photo, align
 * the frames + rate the corners/edges/surface, and get a transparent grade
 * estimate tied to Loupe's real PSA-10 value ladder.
 */
export function LoupeGrade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [src, setSrc] = useState<string | null>(null);
  const [outer, setOuter] = useState<Frame>(DEFAULT_OUTER);
  const [inner, setInner] = useState<Frame>(DEFAULT_INNER);
  const [corners, setCorners] = useState(9);
  const [edges, setEdges] = useState(9);
  const [surface, setSurface] = useState(9);
  const [card, setCard] = useState<Pick<CardSummary, "id" | "name"> | null>(null);
  const [identified, setIdentified] = useState<ScanCandidate | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Same identify (scan) API the mobile app + web scanner use.
  const identify = useIdentifyCard({
    onSuccess: (r) => {
      const top = r.candidates?.[0];
      if (top && top.confidence >= 0.35) {
        setIdentified(top);
        setCard({ id: top.id, name: top.name });
      }
    },
  });
  const addGrade = useAddGrade();

  const setFrame = useCallback((which: "outer" | "inner", f: Frame) => {
    (which === "outer" ? setOuter : setInner)(f);
  }, []);

  // Best-effort auto-detect the card edge + print border so the frames place
  // themselves — the user only adjusts if the read is off.
  const autoDetect = useCallback((url: string) => {
    const im = new Image();
    im.onload = () => {
      const found = detectCard(im);
      if (found) {
        setOuter(found.outer);
        setInner(found.inner);
      }
    };
    im.src = url;
  }, []);

  // Try to identify the card with the scan API, then auto-attach it (powers
  // the value upside + add-to-collection) and show the banner.
  const autoIdentify = useCallback(
    async (file: File) => {
      setIdentified(null);
      setCard(null);
      setSaved(false);
      identify.reset();
      const blob = await downscale(file);
      identify.mutate({ image: blob });
    },
    [identify],
  );

  const loadFile = useCallback(
    (file: File | undefined | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setOuter(DEFAULT_OUTER);
      setInner(DEFAULT_INNER);
      autoDetect(url);
      autoIdentify(file);
    },
    [autoDetect, autoIdentify],
  );

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

  // Save the identified card to the vault, graded at the Loupe estimate.
  const gradeInt = Math.round(result.estimate);
  function saveGraded() {
    if (!user) {
      navigate("/login");
      return;
    }
    if (!card || saved || addGrade.isPending) return;
    addGrade.mutate(
      {
        upstreamId: card.id,
        house: "psa",
        grade: gradeInt,
        estimatedValueUsd: graded?.amount ?? raw?.amount ?? null,
        notes: `Loupe Grade pre-screen — estimated ${result.band}`,
      },
      { onSuccess: () => setSaved(true) },
    );
  }

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
          {src && (identify.isPending || identified) && (
            <div className={styles.idBanner}>
              {identify.isPending ? (
                <>
                  <Loader2 className={styles.idSpin} size={18} />
                  <span className={styles.idText}>Identifying card…</span>
                </>
              ) : identified ? (
                <>
                  <span className={styles.idThumb}>
                    <CardThumb
                      src={identified.imageUrl ?? ""}
                      alt={identified.name}
                      size="sm"
                    />
                  </span>
                  <span className={styles.idBody}>
                    <span className={styles.idEyebrow}>Identified</span>
                    <span className={styles.idName}>{identified.name}</span>
                    <span className={styles.idMeta}>
                      {[identified.setName, identified.number]
                        .filter(Boolean)
                        .join(" · ")}
                      {" · "}
                      {Math.round(identified.confidence * 100)}% match
                    </span>
                  </span>
                  <button
                    type="button"
                    className={styles.idClear}
                    onClick={() => {
                      setIdentified(null);
                      setCard(null);
                    }}
                    aria-label="Not this card"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : null}
            </div>
          )}
          {src ? (
            <InspectCanvas
              src={src}
              outer={outer}
              inner={inner}
              onChange={setFrame}
              onAutoFit={() => autoDetect(src)}
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

              {/* Save to vault — graded at the Loupe estimate, via the grades API */}
              {card && (
                <section className={styles.block}>
                  <span className={styles.blockTitle}>
                    <ArchiveRestore size={14} /> Save to vault
                  </span>
                  <p className={styles.blockHint}>
                    Add <strong>{card.name}</strong> to your collection as a
                    graded card at the estimated <strong>PSA {gradeInt}</strong>.
                  </p>
                  <Button
                    block
                    leadingIcon={
                      saved ? <Check size={16} /> : <ArchiveRestore size={16} />
                    }
                    disabled={addGrade.isPending || saved}
                    onClick={saveGraded}
                  >
                    {saved
                      ? "Saved to vault"
                      : addGrade.isPending
                        ? "Saving…"
                        : user
                          ? `Add as graded · PSA ${gradeInt}`
                          : "Sign in to save"}
                  </Button>
                  {saved && (
                    <Link to="/app/vault" className={styles.valueChange}>
                      View in vault →
                    </Link>
                  )}
                </section>
              )}

              <NoteCard
                title="Estimate only"
                message="Loupe Grade is a photo-based pre-screen, not an official grade. It isn't affiliated with PSA, BGS, or CGC, and the real grade depends on factors a single photo can't show — saved grades are your own estimate."
              />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
