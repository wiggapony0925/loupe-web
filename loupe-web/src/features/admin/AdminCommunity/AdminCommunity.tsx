import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clapperboard,
  Clock,
  Eye,
  Flag,
  MessageCircle,
  Sparkles,
  Star,
  Timer,
} from "lucide-react";
import type { StorySeedResult } from "@loupe/core";
import { useAdminStories, useExpireStory, useSeedStories } from "@loupe/core";
import { Button, NoteCard, Panel, SectionHeader, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/format";
import styles from "./AdminCommunity.module.scss";

/**
 * Community dev-tools — the levers behind the social side of the app.
 *
 * The centrepiece is the STORY LIFECYCLE bench. Stories expire on a
 * 24-hour clock, which makes them the one feature nobody can test by
 * waiting: this page seeds the test accounts with stories on demand and
 * force-expires them, so the whole loop — tray lights up, reel plays,
 * story vanishes on expiry, seeding works again — runs in a minute
 * instead of a day.
 *
 * The seed skips accounts that already have a live story (the retrigger
 * contract), so mashing the button can't flood the tray; expiry is the
 * reset switch.
 */
export function AdminCommunity() {
  const { data: stories, isLoading } = useAdminStories();
  const seed = useSeedStories();
  const expire = useExpireStory();
  const [lastSeed, setLastSeed] = useState<StorySeedResult | null>(null);

  const live = (stories ?? []).filter((s) => s.live);
  const expired = (stories ?? []).filter((s) => !s.live);

  return (
    <div className={styles.page}>
      <SectionHeader
        title="Community"
        subtitle="Dev tools for the social side — stories, moderation, curation."
      />

      {/* The other community controls, so this page is the one doorway. */}
      <div className={styles.links}>
        <Link to="/admin/moderation" className={styles.link}>
          <Flag size={14} />
          Moderation queue
        </Link>
        <Link to="/admin/featured" className={styles.link}>
          <Star size={14} />
          Featured collectors
        </Link>
      </div>

      <Panel className={styles.bench}>
        <div className={styles.benchHead}>
          <div>
            <h3 className={styles.benchTitle}>
              <Clapperboard size={16} />
              Story lifecycle bench
            </h3>
            <p className={styles.benchSub}>
              Seed makes the test accounts post stories from their own photos
              (some 2–3 cards each); it skips anyone with a live story until
              theirs expires. Expire is the 24-hour clock, minus the waiting.
            </p>
          </div>
          <Button
            onClick={() =>
              seed.mutate(undefined, { onSuccess: setLastSeed })
            }
            disabled={seed.isPending}
          >
            <Sparkles size={14} />
            {seed.isPending ? "Seeding…" : "Seed stories"}
          </Button>
        </div>

        {lastSeed && (
          <p className={styles.seedResult} role="status">
            Created <strong>{lastSeed.created}</strong>
            {lastSeed.authors.length > 0 && (
              <> across {lastSeed.authors.map((a) => `@${a}`).join(", ")}</>
            )}
            {lastSeed.created === 0 && lastSeed.skippedLive > 0 && (
              <>
                {" "}
                — all {lastSeed.skippedLive} accounts already have live
                stories. Expire some below, then seed again.
              </>
            )}
          </p>
        )}

        {isLoading ? (
          <div className={styles.rows}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height={44} radius={10} />
            ))}
          </div>
        ) : (stories?.length ?? 0) === 0 ? (
          <NoteCard
            title="No stories yet"
            message="Seed some — the tray in the app lights up the moment they land."
          />
        ) : (
          <>
            <StoryTable
              label={`Live (${live.length})`}
              rows={live}
              onExpire={(id) => expire.mutate(id)}
              expiring={expire.isPending}
            />
            {expired.length > 0 && (
              <StoryTable label={`Expired (${expired.length})`} rows={expired} />
            )}
          </>
        )}
      </Panel>
    </div>
  );
}

function StoryTable({
  label,
  rows,
  onExpire,
  expiring,
}: {
  label: string;
  rows: import("@loupe/core").AdminStory[];
  onExpire?: (id: string) => void;
  expiring?: boolean;
}) {
  return (
    <section className={styles.tableWrap}>
      <h4 className={styles.tableLabel}>{label}</h4>
      <div className={styles.rows}>
        {rows.map((story) => (
          <div key={story.id} className={styles.row}>
            <span className={cx(styles.dot, story.live && styles.dotLive)} />
            <span className={styles.author}>@{story.username}</span>
            <span className={styles.kind}>
              {story.kind === "video" ? "video" : "photo"}
            </span>
            <span className={styles.caption} title={story.caption ?? ""}>
              {story.caption ?? "—"}
            </span>
            <span className={styles.meta}>
              <Clock size={12} />
              {relativeTime(story.createdAt)}
            </span>
            <span className={styles.meta}>
              <Timer size={12} />
              {story.live
                ? `expires ${relativeTime(story.expiresAt)}`
                : `expired ${relativeTime(story.expiresAt)}`}
            </span>
            <span className={styles.meta}>
              <Eye size={12} />
              {story.viewCount}
            </span>
            <span className={styles.meta}>
              <MessageCircle size={12} />
              {story.commentCount}
            </span>
            {story.live && onExpire && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onExpire(story.id)}
                disabled={expiring}
              >
                Expire now
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
