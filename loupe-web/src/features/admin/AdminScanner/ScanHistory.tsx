import { useState } from "react";
import { Check, ImageOff, ScanLine, X } from "lucide-react";
import {
  useAdminScanHistory,
  useAdminScanDetail,
  type ScanHistoryItem,
} from "@loupe/core";
import { Badge, FilterPill, Modal, NoteCard, Panel, SegmentedControl, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import styles from "./ScanHistory.module.scss";

type MatchFilter = "all" | "hit" | "miss";
const PAGE = 24;

const SOURCE_OPTIONS = [
  { label: "pHash (fast path)", value: "phash" },
  { label: "OCR text", value: "text" },
  { label: "Feedback", value: "feedback" },
  { label: "No match", value: "none" },
];
const TCG_OPTIONS = [
  { label: "Pokémon", value: "pokemon" },
  { label: "Magic", value: "magic" },
  { label: "Yu-Gi-Oh!", value: "yugioh" },
  { label: "One Piece", value: "onepiece" },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const sourceTone = (s: string): "mint" | "blue" | "purple" | "neutral" =>
  s === "phash" ? "mint" : s === "text" ? "blue" : s === "feedback" ? "purple" : "neutral";

/** Admin: the scan history log — every scan's photo + who/when/what we returned. */
export function ScanHistory() {
  const [match, setMatch] = useState<MatchFilter>("all");
  const [source, setSource] = useState<string | null>(null);
  const [tcg, setTcg] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const matched = match === "all" ? undefined : match === "hit";
  const { data, isLoading, isError } = useAdminScanHistory({
    limit: PAGE,
    offset,
    matched,
    source: source ?? undefined,
    tcg: tcg ?? undefined,
  });

  const reset = (fn: () => void) => {
    fn();
    setOffset(0);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <SegmentedControl<MatchFilter>
          aria-label="Match filter"
          value={match}
          onChange={(v) => reset(() => setMatch(v))}
          options={[
            { value: "all", label: "All" },
            { value: "hit", label: "Matched" },
            { value: "miss", label: "Misses" },
          ]}
        />
        <FilterPill
          label="Signal"
          options={SOURCE_OPTIONS}
          value={source}
          onChange={(v) => reset(() => setSource(v))}
        />
        <FilterPill
          label="Game"
          options={TCG_OPTIONS}
          value={tcg}
          onChange={(v) => reset(() => setTcg(v))}
        />
        {data && (
          <span className={styles.total}>{data.total.toLocaleString()} scans</span>
        )}
      </div>

      {isLoading && !data ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={220} radius={16} />
          ))}
        </div>
      ) : isError ? (
        <NoteCard title="Couldn't load scan history" message="Please refresh in a moment." />
      ) : !data || data.items.length === 0 ? (
        <NoteCard
          title="No scans yet"
          message="Scans made through the camera or upload will appear here with their photo and result."
        />
      ) : (
        <>
          <div className={styles.grid}>
            {data.items.map((it) => (
              <ScanCard key={it.id} item={it} onOpen={() => setOpenId(it.id)} />
            ))}
          </div>

          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={offset === 0}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE))}
            >
              Newer
            </button>
            <span className={styles.pageInfo}>
              {offset + 1}–{offset + data.items.length} of {data.total.toLocaleString()}
            </span>
            <button
              className={styles.pageBtn}
              disabled={!data.nextCursor}
              onClick={() => setOffset((o) => o + PAGE)}
            >
              Older
            </button>
          </div>
        </>
      )}

      <ScanDetailModal id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** One scan tile — the scanned frame + the top result + who/when. */
function ScanCard({ item, onOpen }: { item: ScanHistoryItem; onOpen: () => void }) {
  const hit = !!item.topUpstreamId;
  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <span className={styles.photoWrap}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className={styles.photo} loading="lazy" />
        ) : (
          <span className={styles.noPhoto}>
            <ImageOff size={22} />
          </span>
        )}
        <span className={cx(styles.verdict, hit ? styles.verdictHit : styles.verdictMiss)}>
          {hit ? <Check size={11} /> : <X size={11} />}
          {hit ? pct(item.topConfidence) : "No match"}
        </span>
      </span>

      <span className={styles.body}>
        <span className={styles.name}>
          {hit ? item.topName : item.parsedTitle || "Unidentified"}
        </span>
        <span className={styles.badges}>
          <Badge tone={sourceTone(item.primarySource)} dot>
            {item.primarySource}
          </Badge>
          {item.tcgInferred && item.tcgInferred !== "all" && (
            <Badge tone="neutral">{item.tcgInferred}</Badge>
          )}
        </span>
        <span className={styles.meta}>
          <span className={styles.who}>{item.userEmail ?? "anonymous"}</span>
          <span className={styles.dot}>·</span>
          <span>{timeAgo(item.createdAt)}</span>
        </span>
      </span>
    </button>
  );
}

/** Full drill-down for one scan: photo, every candidate, raw OCR, metadata. */
function ScanDetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: d, isLoading } = useAdminScanDetail(id);
  return (
    <Modal
      open={!!id}
      onOpenChange={(o) => !o && onClose()}
      title="Scan detail"
      size="lg"
    >
      {isLoading || !d ? (
        <Skeleton height={320} radius={12} />
      ) : (
        <div className={styles.detail}>
          <div className={styles.detailTop}>
            <div className={styles.detailPhoto}>
              {d.imageUrl ? (
                <img src={d.imageUrl} alt="Scanned frame" />
              ) : (
                <span className={styles.noPhoto}>
                  <ScanLine size={26} />
                </span>
              )}
            </div>
            <dl className={styles.facts}>
              <Fact k="Account" v={d.userEmail ?? "anonymous"} />
              <Fact k="When" v={new Date(d.createdAt).toLocaleString()} />
              <Fact k="Winning signal" v={d.primarySource} />
              <Fact k="Game" v={d.tcgInferred} />
              <Fact k="OCR provider" v={d.ocrProvider} />
              <Fact k="Latency" v={`${d.latencyMs.toLocaleString()} ms`} />
              <Fact k="Cost" v={`$${d.costUsd.toFixed(4)}`} />
              <Fact k="Parsed" v={[d.parsedTitle, d.parsedNumber].filter(Boolean).join(" · ") || "—"} />
              {d.feedbackCorrect != null && (
                <Fact k="User feedback" v={d.feedbackCorrect ? "✓ correct" : "✗ wrong"} />
              )}
            </dl>
          </div>

          <Panel padding="md" className={styles.section}>
            <h3 className={styles.sectionTitle}>Candidates ({d.candidates.length})</h3>
            {d.candidates.length === 0 ? (
              <p className={styles.muted}>No candidates were returned.</p>
            ) : (
              <ol className={styles.cands}>
                {d.candidates.map((c, i) => (
                  <li key={`${c.upstreamId ?? c.name}-${i}`} className={styles.cand}>
                    <span className={styles.candRank}>{i + 1}</span>
                    <span className={styles.candName}>{c.name}</span>
                    <Badge tone={sourceTone(c.source)}>{c.source}</Badge>
                    <span className={styles.candConf}>{pct(c.confidence)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel padding="md" className={styles.section}>
            <h3 className={styles.sectionTitle}>Raw OCR text</h3>
            <pre className={styles.ocr}>{d.ocrFullText?.trim() || "— (no text / pHash fast path)"}</pre>
            <div className={styles.hashes}>
              {d.phash && <code>phash: {d.phash}</code>}
              {d.imageSha256 && <code>sha256: {d.imageSha256.slice(0, 16)}…</code>}
            </div>
          </Panel>
        </div>
      )}
    </Modal>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className={styles.fact}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
