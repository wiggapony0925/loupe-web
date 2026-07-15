/**
 * AiSearchCallout — the Loupe Pro "describe it" search on the web results
 * page, Google-AI-overview style.
 *
 * One affordance + one answer: an "Ask Loupe AI" button under the search
 * results (PRO pill when locked — tapping opens the paywall instead of
 * burning a model call), then a chat bubble: the Loupe AI avatar, the
 * model's "this is what I found" one-liner, and the REAL catalog cards it
 * mapped the description to. The backend owns everything; a 402 opens the
 * paywall (server is the source of truth). Signed-out visitors never see it —
 * the public page stays clean.
 */
import { useEffect, useState } from "react";
import { MoonStar, RotateCcw, Sparkles } from "lucide-react";
import { ApiError, useAiSearch, useAiSearchLimits } from "@loupe/core";
import { ShopCard } from "@/components";
import { useAuth } from "@/auth/AuthProvider";
import { useProFeature } from "@/pro";
import styles from "./AiSearchCallout.module.scss";

export function AiSearchCallout({
  query,
  tcg,
  onCard,
  onPickCandidate,
}: {
  query: string;
  /** The active game tag — sent as the description's game preference. */
  tcg?: string;
  onCard: (id: string) => void;
  /** Click a candidate chip → run a normal search for that exact name. */
  onPickCandidate?: (name: string) => void;
}) {
  const { user } = useAuth();
  const { allowed, locked, requirePro } = useProFeature("ai_search");
  const { queryMaxChars, enabled: featureOn } = useAiSearchLimits();
  const [asked, setAsked] = useState(false);
  const ai = useAiSearch(query, asked && allowed, tcg);
  const nearLimit = query.length >= queryMaxChars - 20;

  // A new question resets to the ask state.
  useEffect(() => setAsked(false), [query]);

  // Server-side gate wins even if the local entitlement snapshot was stale.
  useEffect(() => {
    if (ai.error instanceof ApiError && ai.error.status === 402) {
      setAsked(false);
      requirePro("ai_search");
    }
  }, [ai.error, requirePro]);

  if (!user) return null;

  // Quota ran out / provider outage → honest rest state (hiding the feature
  // entirely read as "it's broken", so it stays visible and explains itself).
  if (!featureOn) {
    return (
      <div className={styles.rest}>
        <MoonStar size={15} />
        <span>
          <strong>Loupe AI is taking a quick break</strong> — it'll be back
          shortly. Name search works as always.
        </span>
      </div>
    );
  }

  const ask = () => {
    if (locked) {
      requirePro("ai_search");
      return;
    }
    setAsked(true);
  };

  const answer = asked && allowed ? ai.data : undefined;
  const showBubble = Boolean(answer?.message && (answer?.results.length ?? 0) > 0);

  if (!asked || locked) {
    return (
      <div className={styles.askWrap}>
        <button type="button" className={styles.ask} onClick={ask}>
          <Sparkles size={15} />
          <span>Ask Loupe AI — describe the card instead</span>
          {locked && <span className={styles.ask__pro}>PRO</span>}
        </button>
        <p className={styles.askWrap__hint}>
          {nearLimit
            ? `${query.length}/${queryMaxChars} — shorter descriptions work best.`
            : "In your own words — “red lizard with fire”, “blue turtle with water cannons”…"}
        </p>
      </div>
    );
  }

  if (ai.isLoading) {
    return (
      <div className={`${styles.bubble} ${styles["bubble--thinking"]}`} aria-busy="true">
        <span className={`${styles.bubble__avatar} ${styles["bubble__avatar--pulse"]}`}>
          <Sparkles size={15} />
        </span>
        <div className={styles.bubble__body}>
          <span className={styles.bubble__name}>Loupe AI</span>
          <p className={styles.bubble__message}>
            Reading “{query}”
            <span className={styles.dots} aria-hidden>
              <i /><i /><i />
            </span>
          </p>
        </div>
      </div>
    );
  }

  if (!showBubble || !answer) {
    return (
      <p className={styles.miss}>
        Loupe AI couldn't pin that one down — try a few more details.
      </p>
    );
  }

  return (
    <div className={styles.answer}>
      <div className={styles.bubble}>
        <span className={styles.bubble__avatar}>
          <Sparkles size={15} />
        </span>
        <div className={styles.bubble__body}>
          <span className={styles.bubble__name}>Loupe AI</span>
          {/* Backend-clamped to 400 chars (MESSAGE_MAX_CHARS) — never an essay. */}
          <p className={styles.bubble__message}>{answer.message}</p>
          {answer.candidates.length > 0 && (
            <div className={styles.bubble__chips}>
              <span className={styles.bubble__chipsLabel}>Could be:</span>
              {answer.candidates.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={styles.bubble__chip}
                  onClick={() => onPickCandidate?.(name)}
                  disabled={!onPickCandidate}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={styles.answer__cards}>
        {answer.results.slice(0, 12).map((c, i) => (
          <div
            key={c.id}
            className={styles.answer__card}
            style={{ animationDelay: `${Math.min(i * 55, 660)}ms` }}
          >
            <ShopCard
              imageUrl={c.imageUrl}
              title={c.name}
              subtitle={c.setName}
              price={c.price}
              tag={c.rarity}
              onClick={() => onCard(c.id)}
            />
          </div>
        ))}
      </div>
      {/* ── Footer: honesty line + retry (the Notion AI pattern) ── */}
      <div className={styles.answer__footer}>
        <span className={styles.answer__disclaimer}>
          AI can misread a description — cards and prices always come from the
          live catalog.
        </span>
        <button
          type="button"
          className={styles.answer__retry}
          onClick={() => void ai.refetch()}
        >
          <RotateCcw size={12} />
          Try again
        </button>
      </div>
    </div>
  );
}
