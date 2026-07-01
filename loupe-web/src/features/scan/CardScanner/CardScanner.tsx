import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clipboard,
  ImageUp,
  Layers,
  Loader2,
  MousePointerClick,
  RotateCcw,
  ScanLine,
  ScanSearch,
  Smartphone,
  X,
} from "lucide-react";
import { api, useScanLoop, type ScanCandidate } from "@loupe/core";
import { Button, CardThumb } from "@/components";
import { cx } from "@/lib/cx";
import { isMobileDevice } from "@/lib/device";
import { candidateArt } from "../candidateArt";
import { detectCardRect, lerpRect, type DetectRect } from "./cardDetect";
import { ScanResultRow } from "./ScanResultRow";
import type { TrayEntry } from "./scanTypes";
import styles from "./CardScanner.module.scss";

type CamState =
  | "idle"
  | "starting"
  | "live"
  | "denied"
  | "unsupported"
  | "desktop";

/** Confidence at which we treat the top candidate as a confident lock. */
const LOCK = 0.6;
/**
 * Minimum confidence gap between the top match and the runner-up for us to
 * call it decisively. When two candidates sit within this margin (a reprint
 * tie, a look-alike), we don't silently commit — we ask the user to confirm
 * the exact printing. That's how you get to "always the right card": be
 * decisive when the signal is decisive, ask when it genuinely isn't.
 */
const AMBIGUOUS_GAP = 0.12;
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

/** Pretty game names for the result chip. */
const GAME_LABELS: Record<string, string> = {
  pokemon: "Pokémon",
  magic: "Magic",
  yugioh: "Yu-Gi-Oh!",
  onepiece: "One Piece",
  digimon: "Digimon",
  lorcana: "Lorcana",
};
const gameLabel = (tcg?: string) => (tcg ? (GAME_LABELS[tcg] ?? tcg) : null);

let _traySeq = 0;
const nextTrayId = () => `t${Date.now().toString(36)}${(_traySeq++).toString(36)}`;

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
  // Batch scan session — like the mobile app's bottom tray. Each capture drops
  // in instantly as the photo you took, then resolves in place to the matched
  // card. Scan a stack; add or remove without leaving the viewfinder.
  const [session, setSession] = useState<TrayEntry[]>([]);
  const photoUrls = useRef<Set<string>>(new Set()); // for objectURL cleanup
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0); // enter/leave fire per-child; count to avoid flicker
  // Adaptive reticle — the corner brackets glide to the detected card.
  const [reticleRect, setReticleRect] = useState<DetectRect | null>(null);
  const detectCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    // Live camera is a phone flow — a desktop webcam is front-facing and can't
    // scan a card. Steer desktop users to photo upload instead of opening it.
    if (!isMobileDevice()) {
      setCamState("desktop");
      return;
    }
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
    void startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  // Adaptive reticle loop — while the camera is live, look for the card in each
  // frame and glide the corner brackets to it. Best effort: after a few misses
  // we release back to the centred frame so it never sticks to nothing.
  useEffect(() => {
    if (camState !== "live") {
      setReticleRect(null);
      return;
    }
    if (!detectCanvasRef.current) detectCanvasRef.current = document.createElement("canvas");
    const ctx = detectCanvasRef.current.getContext("2d", { willReadFrequently: true });
    let timer: ReturnType<typeof setTimeout>;
    let active = true;
    let current: DetectRect | null = null;
    let misses = 0;
    const tick = () => {
      if (!active) return;
      const video = videoRef.current;
      if (video && ctx && video.videoWidth) {
        const found = detectCardRect(video, ctx, window.innerWidth, window.innerHeight);
        if (found) {
          misses = 0;
          current = current ? lerpRect(current, found, 0.5) : found;
          setReticleRect(current);
        } else if (++misses >= 5) {
          current = null;
          setReticleRect(null);
        }
      }
      timer = setTimeout(tick, 170);
    };
    timer = setTimeout(tick, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [camState]);

  /** Draw the current video frame to a downscaled JPEG blob. We send the whole
   *  frame (not a crop): the catalog pHash is of the *entire* card image, so a
   *  loose content-crop actually shifts the hash toward the wrong card. Proper
   *  card-boundary cropping needs true corner detection + deskew (see notes). */
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

  // Scan-loop controller — used for its manual `identifyBlob` (desktop uploads)
  // and candidate/lock state. The continuous auto-loop is OFF: capturing is
  // deliberate (tap the shutter), so we never fire identify — and flash the
  // "Identifying…" spinner + sweep — every second when nothing's in frame.
  const { candidates, topConfidence, scanning, locked, noMatch, identifyBlob, reset } = useScanLoop({
    captureFrame: captureBlob,
    enabled: false,
    intervalMs: FRAME_INTERVAL,
    tcg: tcg || undefined,
    lockConfidence: LOCK,
  });

  const dropPhoto = useCallback((url?: string) => {
    if (url && photoUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      photoUrls.current.delete(url);
    }
  }, []);

  const removeFromSession = useCallback(
    (localId: string) =>
      setSession((prev) => {
        const gone = prev.find((e) => e.localId === localId);
        dropPhoto(gone?.photo);
        return prev.filter((e) => e.localId !== localId);
      }),
    [dropPhoto],
  );

  const clearSession = useCallback(() => {
    setSession((prev) => {
      prev.forEach((e) => dropPhoto(e.photo));
      return [];
    });
  }, [dropPhoto]);

  // A capture: show the photo you just took in the tray immediately, then
  // resolve it in place to the identified card (or a no-match you can retake).
  const captureToTray = useCallback(
    async (blob: Blob) => {
      const localId = nextTrayId();
      const photo = URL.createObjectURL(blob);
      photoUrls.current.add(photo);
      setSession((prev) => [{ localId, photo, status: "identifying", card: null }, ...prev]);
      try {
        const res = await api.cards.identify(blob, tcg || undefined);
        const card = res.candidates[0] ?? null;
        setSession((prev) => {
          // Already have this exact card as a resolved match? Drop the dupe.
          if (
            card &&
            prev.some(
              (e) => e.localId !== localId && e.card?.id === card.id && e.status === "matched",
            )
          ) {
            dropPhoto(photo);
            return prev.filter((e) => e.localId !== localId);
          }
          return prev.map((e) =>
            e.localId === localId
              ? { ...e, status: card ? "matched" : "nomatch", card }
              : e,
          );
        });
      } catch {
        setSession((prev) =>
          prev.map((e) => (e.localId === localId ? { ...e, status: "nomatch" } : e)),
        );
      }
    },
    [tcg, dropPhoto],
  );

  // Desktop/upload path still feeds the recents strip on a lock.
  useEffect(() => {
    if (!locked || !candidates[0] || camState === "live") return;
    const top = candidates[0];
    setRecents((prev) =>
      prev[0]?.id === top.id
        ? prev
        : [top, ...prev.filter((c) => c.id !== top.id)].slice(0, MAX_RECENTS),
    );
  }, [locked, candidates, camState]);

  // Revoke any outstanding object URLs when the scanner unmounts.
  useEffect(() => {
    const urls = photoUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ""; // allow re-picking the same file
      if (!file) return;
      // On the live camera an upload joins the batch tray (photo → match); on
      // desktop it drives the single centered result panel.
      if (camState === "live") await captureToTray(file);
      else await identifyBlob(file, true);
    },
    [camState, captureToTray, identifyBlob],
  );

  // ── Desktop-native ways to hand us a photo: drag a card image anywhere onto
  // the surface, or just paste one from the clipboard (⌘/Ctrl+V). Both feed the
  // same identify path as the file picker — no clicking through a dialog.
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) e.preventDefault();
  }, []);
  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    dragDepth.current += 1;
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  }, []);
  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragOver(false);
      const file = Array.from(e.dataTransfer.files).find((f) =>
        f.type.startsWith("image/"),
      );
      if (file) await identifyBlob(file, true);
    },
    [identifyBlob],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (file) void identifyBlob(file, true);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [identifyBlob]);

  // Shutter — snap the current frame into the tray as a photo, then let it
  // resolve to the matched card in place.
  const onShutter = useCallback(async () => {
    const blob = await captureBlob();
    if (blob) await captureToTray(blob);
  }, [captureBlob, captureToTray]);

  const pick = useCallback(
    (c: ScanCandidate) => {
      stopCamera();
      void navigate(`/cards/${c.id}`);
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
      void navigate("/grade", {
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
    void navigate(-1);
  }, [navigate, stopCamera]);

  // Esc closes the menu first, then the scanner — standard for a full-screen
  // overlay. Keyboard parity is table stakes for a production surface.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (tcgMenuOpen) setTcgMenuOpen(false);
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tcgMenuOpen, close]);

  // Match quality: is the top candidate a decisive win, or are we genuinely
  // torn between look-alikes/reprints? Drives whether we say "Best match" or
  // ask the user to confirm the exact printing.
  const top = candidates[0];
  const second = candidates[1];
  const decisive =
    !!top &&
    topConfidence >= LOCK &&
    (!second || topConfidence - second.confidence >= AMBIGUOUS_GAP);
  const ambiguous = !!top && !decisive;

  // The viewfinder reticle belongs to framing a card — show it on the live
  // camera or while a desktop frame is being read (the sweep), but never once a
  // match is on screen or behind the idle dropzone, where it's just noise.
  const showReticle = !top && (camState === "live" || scanning);

  return (
    <div
      className={styles.scan}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <video ref={videoRef} className={styles.video} autoPlay playsInline muted />
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden />

      {/* When there's no live feed, a calm branded backdrop sits behind the UI. */}
      {camState !== "live" && <div className={styles.backdrop} aria-hidden />}

      {/* Drag-a-photo overlay — the whole surface is a dropzone on desktop. */}
      {dragOver && (
        <div className={styles.dropOverlay} aria-hidden>
          <div className={styles.dropInner}>
            <ImageUp size={40} />
            <p className={styles.dropTitle}>Drop to identify</p>
            <p className={styles.dropSub}>Release the card photo anywhere</p>
          </div>
        </div>
      )}

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

      {/* Reticle — live viewfinder, or the desktop "reading a frame" sweep.
          When the detector finds the card, the frame glides to its bounds. */}
      {showReticle && (
        <div className={styles.reticleWrap} aria-hidden>
          <div
            className={cx(
              styles.reticle,
              locked && styles.reticleLocked,
              reticleRect && styles.reticleTracking,
            )}
            style={
              reticleRect
                ? {
                    left: `${reticleRect.left * 100}%`,
                    top: `${reticleRect.top * 100}%`,
                    width: `${reticleRect.width * 100}%`,
                    height: `${reticleRect.height * 100}%`,
                  }
                : undefined
            }
          >
            {(["tl", "tr", "bl", "br"] as const).map((c) => (
              <span key={c} className={cx(styles.corner, styles[`corner_${c}`])} />
            ))}
            {scanning && !locked && <span className={styles.sweep} />}
          </div>
        </div>
      )}

      {/* Permission / upload entry — only when idle (no result, not mid-scan,
          no recent miss) so it never competes with live feedback. */}
      {(camState === "denied" ||
        camState === "unsupported" ||
        camState === "desktop") &&
        candidates.length === 0 &&
        !scanning &&
        !noMatch && (
          <div className={styles.permission}>
            {/* A big, framed dropzone — click, drag, or paste. On desktop this
                is the primary flow (a laptop's front camera can't scan a card),
                so it earns the spotlight instead of hiding behind a dialog. */}
            <button
              type="button"
              className={cx(styles.dropzone, dragOver && styles.dropzoneActive)}
              onClick={() => fileRef.current?.click()}
              aria-label="Upload a card photo"
            >
              <span className={styles.dropzoneReticle} aria-hidden>
                {(["tl", "tr", "bl", "br"] as const).map((c) => (
                  <span key={c} className={cx(styles.corner, styles[`corner_${c}`])} />
                ))}
                <ScanSearch size={30} className={styles.dropzoneIcon} />
              </span>
              <span className={styles.dropzoneTitle}>
                {camState === "desktop"
                  ? "Drop a card photo to identify"
                  : camState === "unsupported"
                    ? "This browser can’t open the camera"
                    : "Camera access is off"}
              </span>
              <span className={styles.dropzoneSub}>
                Drag &amp; drop, paste from your clipboard, or click to browse —
                same instant identification as the live camera.
              </span>
              <span className={styles.dropzoneChips}>
                <span className={styles.chip}>
                  <ImageUp size={14} /> Browse
                </span>
                <span className={styles.chip}>
                  <Clipboard size={14} /> Paste
                  <kbd className={styles.kbd}>⌘V</kbd>
                </span>
                <span className={styles.chip}>
                  <MousePointerClick size={14} /> Drag &amp; drop
                </span>
              </span>
            </button>
            <p className={styles.permissionSub}>
              {camState === "desktop" ? (
                <>
                  <Smartphone size={13} /> On your phone, Loupe scans live through
                  the camera.
                </>
              ) : (
                "Upload a clear photo of the card instead."
              )}
            </p>
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

      {/* Single-result panel — the desktop / upload path. On the live camera the
          batch tray (below) owns the result surface instead, so you can scan a
          stack of cards without a sheet interrupting each one. */}
      {candidates[0] && camState !== "live" && (
        <section className={cx(styles.sheet, styles.sheetOpen, styles.sheetCentered)}>
          <div className={styles.sheetHead}>
            <span className={cx(styles.sheetTitle, ambiguous && styles.sheetTitleAsk)}>
              {decisive ? (
                <>
                  <Check size={15} /> Best match
                </>
              ) : (
                <>
                  <ScanLine size={15} /> Which one is it?
                </>
              )}
            </span>
            {ambiguous && (
              <span className={styles.askHint}>Confirm the exact printing</span>
            )}
          </div>

          {/* Hero card — big art + a confidence ring so the match reads at a
              glance. Only shown as the definitive pick when it's decisive. */}
          <button
            className={cx(styles.hero, ambiguous && styles.heroAsk)}
            onClick={() => pick(candidates[0]!)}
          >
            <span className={styles.heroArt}>
              <CardThumb
                src={candidateArt(candidates[0])}
                alt={candidates[0].name}
                size="lg"
                className={styles.fillThumb}
              />
              <ConfidenceRing value={topConfidence} tone={decisive ? "good" : "warn"} />
            </span>
            <span className={styles.heroBody}>
              <span className={styles.heroName}>{candidates[0].name}</span>
              <span className={styles.heroMeta}>
                {[candidates[0].setName, candidates[0].number && `#${candidates[0].number}`]
                  .filter(Boolean)
                  .join(" · ") || "Tap to open the card"}
              </span>
              {gameLabel(candidates[0].tcg) && (
                <span className={styles.gameChip}>{gameLabel(candidates[0].tcg)}</span>
              )}
            </span>
          </button>

          {/* Alternates — for reprint ties / lower-confidence matches. */}
          {candidates.length > 1 && (
            <ul className={styles.results}>
              {candidates.slice(1, 4).map((c) => (
                <li key={c.id}>
                  <button className={styles.result} onClick={() => pick(c)}>
                    <span className={styles.resultThumb}>
                      <CardThumb
                        src={candidateArt(c)}
                        alt={c.name}
                        size="lg"
                        className={styles.fillThumb}
                      />
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

          {/* Action hierarchy (Collectr/Ludex-style): one prominent primary,
              then quiet secondaries — not two equal-weight buttons. */}
          <button className={styles.primaryCta} onClick={() => pick(candidates[0]!)}>
            View card <ArrowRight size={17} />
          </button>
          <div className={styles.sheetActions}>
            <button
              className={styles.secondaryBtn}
              onClick={() => gradeInPlayground(candidates[0]!)}
            >
              <ScanSearch size={16} /> Grade
            </button>
            <button className={styles.secondaryBtn} onClick={reset}>
              <RotateCcw size={16} /> Scan again
            </button>
          </div>
        </section>
      )}

      {/* Batch scan results (live) — each capture becomes a rich row: the card,
          its collector number, live price, and 30-day trend. One row per photo. */}
      {camState === "live" && session.length > 0 && (
        <section className={styles.tray} aria-label={`${session.length} cards scanned`}>
          <div className={styles.trayHead}>
            <span className={styles.trayCount}>
              <Layers size={13} /> {session.filter((e) => e.status === "matched").length}/
              {session.length} identified
            </span>
            <button className={styles.trayClear} onClick={clearSession}>
              Clear
            </button>
          </div>
          <ul className={styles.trayList}>
            {session.map((e) => (
              <ScanResultRow
                key={e.localId}
                entry={e}
                onOpen={() => e.card && pick(e.card)}
                onRemove={() => removeFromSession(e.localId)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Recent scans strip (desktop/upload) — last few identified; tap to reopen. */}
      {camState !== "live" && recents.length > 0 && candidates.length === 0 && (
        <div className={styles.recents}>
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
                <CardThumb
                  src={candidateArt(c)}
                  alt={c.name}
                  size="lg"
                  className={styles.fillThumb}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Camera control bar — shutter + gallery. Stays up during batch scanning
          so you keep capturing card after card into the tray. */}
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
          {/* Invisible spacer that balances the left button so the shutter
              stays optically centered (must NOT inherit the button chrome). */}
          <span className={styles.ctrlSpacer} aria-hidden />
          {/* The coaching hint shares the tray's row — once cards are in the
              tray, let it own that space instead of overlapping. */}
          {session.length === 0 && (
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

/**
 * Circular match-confidence badge shown over the hero art. Reads at a glance:
 * a filled mint ring for a decisive match, amber when we're asking the user to
 * confirm. The number is the top-1 confidence as a percentage.
 */
function ConfidenceRing({ value, tone }: { value: number; tone: "good" | "warn" }) {
  const pct = Math.max(0, Math.min(1, value));
  const R = 15.5;
  const circ = 2 * Math.PI * R;
  return (
    <span className={cx(styles.ring, tone === "warn" && styles.ringWarn)}>
      <svg viewBox="0 0 40 40" className={styles.ringSvg} aria-hidden>
        <circle className={styles.ringTrack} cx="20" cy="20" r={R} />
        <circle
          className={styles.ringFill}
          cx="20"
          cy="20"
          r={R}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
        />
      </svg>
      <span className={styles.ringPct}>{Math.round(pct * 100)}</span>
    </span>
  );
}
