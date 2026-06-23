import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  ImageUp,
  Loader2,
  ScanLine,
  ScanSearch,
  X,
} from "lucide-react";
import { useScanLoop, type ScanCandidate } from "@loupe/core";
import { Button, CardThumb } from "@/components";
import { cx } from "@/lib/cx";
import { candidateArt } from "../candidateArt";
import styles from "./CardScanner.module.scss";

type CamState = "idle" | "starting" | "live" | "denied" | "unsupported";

/** Confidence at which we treat the top candidate as a confident lock. */
const LOCK = 0.6;
/** Gap between live identify frames (ms). Mirrors the mobile cadence. */
const FRAME_INTERVAL = 900;
/** Long edge we downscale captured frames to before upload. */
const CAPTURE_LONG_EDGE = 900;
/** Most recent identified cards kept in the bottom strip. */
const MAX_RECENTS = 8;

/** Category filter — narrows identify to one game (or all). */
const TCG_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All games" },
  { value: "pokemon", label: "Pokémon" },
  { value: "magic", label: "Magic" },
  { value: "yugioh", label: "Yu-Gi-Oh!" },
];

/**
 * In-browser card scanner. Streams the rear camera (when available) and POSTs
 * a downscaled frame to `/v1/cards/identify` on a debounced loop, exactly like
 * the mobile viewfinder — results stream into a bottom sheet and tapping one
 * opens the card. Falls back to a photo upload everywhere (no webcam needed),
 * which is also how it's exercised on desktop. Anonymous-friendly; "add to
 * vault" lives on the card page behind the normal sign-in.
 */
export function CardScanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [camState, setCamState] = useState<CamState>("idle");
  const [tcg, setTcg] = useState<string>(""); // "" = all games
  const [tcgMenuOpen, setTcgMenuOpen] = useState(false);
  const [recents, setRecents] = useState<ScanCandidate[]>([]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamState("unsupported");
      return;
    }
    setCamState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamState("live");
    } catch {
      setCamState("denied");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  /** Draw the current video frame to a downscaled JPEG blob. */
  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    const longEdge = Math.max(video.videoWidth, video.videoHeight);
    const scale = longEdge > CAPTURE_LONG_EDGE ? CAPTURE_LONG_EDGE / longEdge : 1;
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7),
    );
  }, []);

  // Shared scan-loop controller (cadence + single-flight + candidate/lock
  // state) — the same hook any Loupe client uses; we only supply captureFrame.
  const { candidates, topConfidence, scanning, locked, noMatch, identifyBlob, reset } = useScanLoop({
    captureFrame: captureBlob,
    enabled: camState === "live",
    intervalMs: FRAME_INTERVAL,
    tcg: tcg || undefined,
    lockConfidence: LOCK,
  });

  // Keep a strip of recently-identified cards (Collectr-style). Push the top
  // candidate once it locks; de-dupe by id, newest first.
  useEffect(() => {
    if (!locked || !candidates[0]) return;
    const top = candidates[0];
    setRecents((prev) =>
      prev[0]?.id === top.id
        ? prev
        : [top, ...prev.filter((c) => c.id !== top.id)].slice(0, MAX_RECENTS),
    );
  }, [locked, candidates]);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-picking the same file
      if (file) await identifyBlob(file, true); // manual — never dropped
    },
    [identifyBlob],
  );

  // Manual shutter — capture this exact frame now (Collectr-style), on top of
  // the always-on live loop. Manual so the single-flight guard never drops it.
  const onShutter = useCallback(async () => {
    const blob = await captureBlob();
    if (blob) await identifyBlob(blob, true);
  }, [captureBlob, identifyBlob]);

  const pick = useCallback(
    (c: ScanCandidate) => {
      stopCamera();
      navigate(`/cards/${c.id}`);
    },
    [navigate, stopCamera],
  );

  const pickTcg = useCallback(
    (value: string) => {
      setTcg(value);
      setTcgMenuOpen(false);
      reset(); // clear stale matches from the previous filter
    },
    [reset],
  );

  /** Take the found card straight into the Loupe Grade playground. */
  const gradeInPlayground = useCallback(
    (c: ScanCandidate) => {
      stopCamera();
      navigate("/grade", {
        state: {
          card: {
            id: c.id,
            name: c.name,
            imageUrl: c.imageUrl,
            setName: c.setName,
          },
        },
      });
    },
    [navigate, stopCamera],
  );

  const close = useCallback(() => {
    stopCamera();
    navigate(-1);
  }, [navigate, stopCamera]);

  return (
    <div className={styles.scan}>
      <video ref={videoRef} className={styles.video} autoPlay playsInline muted />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      {/* When there's no live feed, a calm branded backdrop sits behind the UI. */}
      {camState !== "live" && <div className={styles.backdrop} aria-hidden />}

      {/* Top bar */}
      <header className={styles.top}>
        <button className={styles.iconBtn} onClick={close} aria-label="Close scanner">
          <X size={20} />
        </button>
        <div className={styles.title}>
          <button
            className={styles.categoryBtn}
            onClick={() => setTcgMenuOpen((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={tcgMenuOpen}
          >
            <span className={styles.titleMain}>
              {TCG_OPTIONS.find((o) => o.value === tcg)?.label ?? "All games"}
            </span>
            <ChevronDown size={16} className={cx(styles.chev, tcgMenuOpen && styles.chevOpen)} />
          </button>
          <span className={styles.status}>
            <span className={cx(styles.dot, (scanning || locked) && styles.dotOn)} />
            {camState === "live"
              ? locked
                ? "Match found"
                : scanning
                  ? "Reading…"
                  : "Point at a card"
              : camState === "starting"
                ? "Starting camera…"
                : "Camera off"}
          </span>
          {tcgMenuOpen && (
            <div className={styles.tcgMenu} role="listbox">
              {TCG_OPTIONS.map((o) => (
                <button
                  key={o.value || "all"}
                  role="option"
                  aria-selected={o.value === tcg}
                  className={cx(styles.tcgOption, o.value === tcg && styles.tcgOptionActive)}
                  onClick={() => pickTcg(o.value)}
                >
                  {o.label}
                  {o.value === tcg && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className={styles.iconBtn}
          onClick={() => fileRef.current?.click()}
          aria-label="Upload a photo"
        >
          <ImageUp size={20} />
        </button>
      </header>

      {/* Tap-away scrim for the category menu. */}
      {tcgMenuOpen && (
        <button
          className={styles.menuScrim}
          aria-label="Close menu"
          onClick={() => setTcgMenuOpen(false)}
        />
      )}

      {/* Reticle */}
      <div className={styles.reticleWrap} aria-hidden>
        <div className={cx(styles.reticle, locked && styles.reticleLocked)}>
          {(["tl", "tr", "bl", "br"] as const).map((c) => (
            <span key={c} className={cx(styles.corner, styles[`corner_${c}`])} />
          ))}
          {scanning && !locked && <span className={styles.sweep} />}
        </div>
      </div>

      {/* Permission / upload entry — only when idle (no result, not mid-scan,
          no recent miss) so it never competes with live feedback. */}
      {(camState === "denied" || camState === "unsupported") &&
        candidates.length === 0 &&
        !scanning &&
        !noMatch && (
          <div className={styles.permission}>
            <Camera size={28} />
            <p className={styles.permissionTitle}>
              {camState === "unsupported"
                ? "This browser can’t open the camera"
                : "Camera access is off"}
            </p>
            <p className={styles.permissionSub}>
              Upload a clear photo of the card instead — same instant identification.
            </p>
            <Button leadingIcon={<ImageUp size={16} />} onClick={() => fileRef.current?.click()}>
              Upload a photo
            </Button>
            {camState === "denied" && (
              <Button variant="ghost" onClick={startCamera}>
                Try the camera again
              </Button>
            )}
          </div>
        )}

      {/* Live feedback — identifying spinner + an explicit "no match" so an
          upload always visibly does *something*. */}
      {candidates.length === 0 && scanning && (
        <div className={styles.feedback}>
          <span className={styles.feedbackPill}>
            <Loader2 size={16} className={styles.spin} /> Identifying…
          </span>
        </div>
      )}
      {candidates.length === 0 && !scanning && noMatch && (
        <div className={styles.feedback}>
          <div className={styles.noMatch}>
            <ScanSearch size={24} />
            <p className={styles.noMatchTitle}>No match found</p>
            <p className={styles.noMatchSub}>
              Try a sharper, well-lit photo with the whole card filling the frame.
            </p>
            <Button leadingIcon={<ImageUp size={16} />} onClick={() => fileRef.current?.click()}>
              Upload another
            </Button>
          </div>
        </div>
      )}

      {/* Results — prominent top match with real card art, then alternates. */}
      {candidates[0] && (
        <section
          className={cx(
            styles.sheet,
            styles.sheetOpen,
            camState === "live" && styles.sheetAboveControls,
          )}
        >
          <div className={styles.sheetHead}>
            <span className={styles.sheetTitle}>
              {locked ? (
                <>
                  <Check size={15} /> Best match
                </>
              ) : (
                <>
                  <ScanLine size={15} /> Possible matches
                </>
              )}
            </span>
            <span className={styles.confidence}>{Math.round(topConfidence * 100)}%</span>
          </div>

          {/* Hero card — big art so you can actually SEE the match. */}
          <button className={styles.hero} onClick={() => pick(candidates[0]!)}>
            <span className={styles.heroArt}>
              <CardThumb src={candidateArt(candidates[0]!)} alt={candidates[0]!.name} size="md" />
            </span>
            <span className={styles.heroBody}>
              <span className={styles.heroName}>{candidates[0]!.name}</span>
              <span className={styles.heroMeta}>
                {[candidates[0]!.setName, candidates[0]!.number && `#${candidates[0]!.number}`]
                  .filter(Boolean)
                  .join(" · ") || "Tap to open the card"}
              </span>
              <span className={styles.heroOpen}>
                View card <ArrowRight size={14} />
              </span>
            </span>
          </button>

          {/* Alternates — for reprint ties / lower-confidence matches. */}
          {candidates.length > 1 && (
            <ul className={styles.results}>
              {candidates.slice(1, 4).map((c) => (
                <li key={c.id}>
                  <button className={styles.result} onClick={() => pick(c)}>
                    <span className={styles.resultThumb}>
                      <CardThumb src={candidateArt(c)} alt={c.name} size="sm" />
                    </span>
                    <span className={styles.resultBody}>
                      <span className={styles.resultName}>{c.name}</span>
                      <span className={styles.resultMeta}>
                        {[c.setName, c.number && `#${c.number}`].filter(Boolean).join(" · ") ||
                          "Tap to open"}
                      </span>
                    </span>
                    <span className={styles.resultPct}>{Math.round(c.confidence * 100)}%</span>
                    <ArrowRight size={16} className={styles.resultArrow} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button className={styles.gradeCta} onClick={() => gradeInPlayground(candidates[0]!)}>
            <ScanSearch size={16} /> Grade in playground
          </button>
        </section>
      )}

      {/* Recent scans strip — your last few identified cards; tap to reopen. */}
      {recents.length > 0 && candidates.length === 0 && (
        <div className={cx(styles.recents, camState === "live" && styles.recentsAboveControls)}>
          <span className={styles.recentsLabel}>Recent</span>
          <div className={styles.recentsRow}>
            {recents.map((c) => (
              <button
                key={c.id}
                className={styles.recentItem}
                onClick={() => pick(c)}
                title={c.name}
                aria-label={`Reopen ${c.name}`}
              >
                <CardThumb src={candidateArt(c)} alt={c.name} size="sm" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera control bar — Collectr-style shutter + gallery. */}
      {camState === "live" && (
        <div className={styles.controls}>
          <button
            className={styles.ctrlSide}
            onClick={() => fileRef.current?.click()}
            aria-label="Upload a photo"
          >
            <ImageUp size={22} />
          </button>
          <button
            className={cx(styles.shutter, scanning && styles.shutterBusy)}
            onClick={onShutter}
            aria-label="Capture this frame"
          >
            {scanning && <Loader2 size={24} className={styles.spin} />}
          </button>
          <span className={styles.ctrlSide} aria-hidden />
          {candidates.length === 0 && (
            <span className={styles.controlsHint}>
              Hold a card in the frame — or tap to capture
            </span>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.fileInput}
        onChange={onFile}
      />
    </div>
  );
}
