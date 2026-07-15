import { useState } from "react";
import {
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessagesSquare,
  Zap,
  Gauge,
  Users,
} from "lucide-react";
import {
  useAdminAiLog,
  useAdminAiLogs,
  useAdminAiOverview,
  type AdminAiAsk,
  type AdminAiLogFilters,
} from "@loupe/core";
import { Badge, MetricCard, Modal, NoteCard, SegmentedControl, Skeleton } from "@/components";
import styles from "./AdminAi.module.scss";
import admin from "../admin.module.scss";

type FeedbackFilter = "all" | "up" | "down" | "rated";
type SourceFilter = "all" | "ai" | "fallback";

const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${Math.round(n * 100)}%`;

function ago(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** The thumbs verdict as a compact glyph (null = unrated). */
function Verdict({ feedback }: { feedback: number | null }) {
  if (feedback == null) return <span className={styles.verdict}>·</span>;
  return feedback > 0 ? (
    <span className={styles.verdict} data-verdict="up">
      <ThumbsUp size={13} />
    </span>
  ) : (
    <span className={styles.verdict} data-verdict="down">
      <ThumbsDown size={13} />
    </span>
  );
}

function AskRow({ ask, onOpen }: { ask: AdminAiAsk; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      className={`${admin.row} ${admin.rowButton}`}
      onClick={() => onOpen(ask.id)}
    >
      <Verdict feedback={ask.feedback} />
      <div className={admin.row__main}>
        <span className={admin.row__title}>“{ask.query}”</span>
        <span className={admin.row__meta}>
          {ask.userEmail ?? "unknown"} · {ask.game ?? "all games"} ·{" "}
          {ask.resultCount} results · {ask.latencyMs != null ? `${ask.latencyMs}ms` : "—"}
          {ask.cacheHit ? " · cached" : ""}
        </span>
      </div>
      <div className={admin.row__actions}>
        <Badge tone={ask.source === "ai" ? "mint" : "amber"}>{ask.source}</Badge>
        <time className={styles.time}>{ago(ask.createdAt)}</time>
      </div>
    </button>
  );
}

/** Admin: the Loupe AI chatbot dev tool — live open conversations, the full
 *  ask history with thumbs verdicts, and per-exchange drill-in. */
export function AdminAi() {
  const [feedback, setFeedback] = useState<FeedbackFilter>("all");
  const [source, setSource] = useState<SourceFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: view, isLoading, isError, isFetching } = useAdminAiOverview();
  const filters: AdminAiLogFilters = {
    feedback: feedback === "all" ? undefined : feedback,
    source: source === "all" ? undefined : source,
    pageSize: 50,
  };
  const { data: logs, isLoading: logsLoading } = useAdminAiLogs(filters);
  const { data: detail } = useAdminAiLog(openId);

  const sat = view?.feedback7d.satisfaction;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Loupe AI</h1>
          <p className={admin.subtitle}>
            Chatbot conversations, thumbs feedback, and answer accuracy.
          </p>
        </div>
        <span className={styles.live} data-on={isFetching || undefined}>
          <span className={styles.live__dot} />
          Live
        </span>
      </div>

      {isLoading ? (
        <div className={styles.metrics}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={112} radius={16} />
          ))}
        </div>
      ) : isError || !view ? (
        <NoteCard title="Couldn't load AI telemetry" message="Please refresh in a moment." />
      ) : (
        <>
          <div className={styles.metrics}>
            <MetricCard
              label="Asks · 24h"
              value={view.asks24h.toLocaleString()}
              icon={<MessagesSquare size={16} />}
              caption={`${view.users24h.toLocaleString()} collector${view.users24h === 1 ? "" : "s"}`}
            />
            <MetricCard
              label="Satisfaction · 7d"
              value={sat == null ? "—" : pct(sat)}
              icon={sat != null && sat < 0.5 ? <ThumbsDown size={16} /> : <ThumbsUp size={16} />}
              caption={`${view.feedback7d.up} up · ${view.feedback7d.down} down`}
            />
            <MetricCard
              label="Answered by AI"
              value={pct(view.aiRate24h)}
              icon={<Sparkles size={16} />}
              caption={`${pct(view.cacheHitRate24h)} cache hits`}
            />
            <MetricCard
              label="Avg answer time"
              value={view.avgLatencyMs24h != null ? `${view.avgLatencyMs24h}ms` : "—"}
              icon={<Gauge size={16} />}
              caption="24h, cache included"
            />
          </div>

          <section className={styles.section}>
            <h2 className={styles.section__title}>
              <Zap size={15} /> Open conversations
              <span className={styles.section__hint}>active in the last 30 min</span>
            </h2>
            {view.openConversations.length === 0 ? (
              <p className={styles.quiet}>Nobody is talking to the bot right now.</p>
            ) : (
              <div className={styles.convos}>
                {view.openConversations.map((c) => (
                  <div key={c.userId ?? "anon"} className={styles.convo}>
                    <div className={styles.convo__head}>
                      <Users size={14} />
                      <span className={styles.convo__user}>{c.userEmail ?? "unknown"}</span>
                      <time className={styles.time}>{ago(c.lastAskAt)}</time>
                    </div>
                    <div className={admin.list}>
                      {c.asks.map((a) => (
                        <AskRow key={a.id} ask={a} onOpen={setOpenId} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <section className={styles.section}>
        <h2 className={styles.section__title}>
          <MessagesSquare size={15} /> Ask history
        </h2>
        <div className={admin.toolbar}>
          <SegmentedControl<FeedbackFilter>
            options={[
              { value: "all", label: "All" },
              { value: "up", label: "👍 Up" },
              { value: "down", label: "👎 Down" },
              { value: "rated", label: "Rated" },
            ]}
            value={feedback}
            onChange={setFeedback}
            aria-label="Filter by verdict"
          />
          <SegmentedControl<SourceFilter>
            options={[
              { value: "all", label: "Any source" },
              { value: "ai", label: "AI" },
              { value: "fallback", label: "Fallback" },
            ]}
            value={source}
            onChange={setSource}
            aria-label="Filter by answer source"
          />
        </div>
        {logsLoading ? (
          <div className={admin.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={58} radius={14} />
            ))}
          </div>
        ) : !logs || logs.items.length === 0 ? (
          <p className={styles.quiet}>No asks match this filter yet.</p>
        ) : (
          <div className={admin.list}>
            {logs.items.map((a) => (
              <AskRow key={a.id} ask={a} onOpen={setOpenId} />
            ))}
          </div>
        )}
      </section>

      <Modal
        open={openId !== null}
        onOpenChange={(open) => !open && setOpenId(null)}
        title="Exchange"
        size="lg"
      >
        {detail && (
          <div className={styles.detail}>
            <div className={styles.detail__bubbleUser}>“{detail.query}”</div>
            {detail.message ? (
              <div className={styles.detail__bubbleAi}>
                <span className={styles.detail__brand}>
                  <Sparkles size={12} /> LOUPE AI
                </span>
                {detail.message}
              </div>
            ) : (
              <p className={styles.quiet}>No AI message — served by fallback search.</p>
            )}
            {detail.candidates.length > 0 && (
              <div className={styles.detail__chips}>
                {detail.candidates.map((c) => (
                  <span key={c} className={styles.chip}>
                    {c}
                  </span>
                ))}
              </div>
            )}
            <dl className={styles.detail__facts}>
              <div>
                <dt>Asker</dt>
                <dd>{detail.userEmail ?? "unknown"}</dd>
              </div>
              <div>
                <dt>Verdict</dt>
                <dd>
                  {detail.feedback == null
                    ? "not rated"
                    : detail.feedback > 0
                      ? "👍 got it right"
                      : "👎 missed"}
                </dd>
              </div>
              <div>
                <dt>Game</dt>
                <dd>
                  {detail.game ?? "all"}
                  {detail.gameHint ? ` (tag: ${detail.gameHint})` : ""}
                </dd>
              </div>
              <div>
                <dt>Served</dt>
                <dd>
                  {detail.source}
                  {detail.cacheHit ? " · cached plan" : " · fresh model call"}
                </dd>
              </div>
              <div>
                <dt>Results</dt>
                <dd>{detail.resultCount}</dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd>{detail.latencyMs != null ? `${detail.latencyMs}ms` : "—"}</dd>
              </div>
              <div>
                <dt>Asked</dt>
                <dd>{ago(detail.createdAt)}</dd>
              </div>
            </dl>
            {detail.conversation.length > 0 && (
              <>
                <h3 className={styles.detail__more}>More from this collector</h3>
                <div className={admin.list}>
                  {detail.conversation.map((a) => (
                    <AskRow key={a.id} ask={a} onOpen={setOpenId} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
