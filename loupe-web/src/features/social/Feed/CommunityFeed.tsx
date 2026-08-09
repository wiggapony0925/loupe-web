import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Hash, Search, Users, X } from "lucide-react";
import type { FeedTab } from "@loupe/core";
import {
  useFeed,
  useSocialMe,
  useSocialSearchAll,
  useTrendingHashtags,
} from "@loupe/core";
import { useAuth } from "@/auth/AuthProvider";
import { Button, Panel, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import { UserRow } from "../components/UserRow";
import { EditProfileModal } from "../EditProfile/EditProfileModal";
import { Composer } from "./Composer";
import { FeedList } from "./FeedList";
import styles from "./Feed.module.scss";

const TABS: { key: FeedTab; label: string }[] = [
  { key: "following", label: "Following" },
  { key: "foryou", label: "For You" },
  { key: "mine", label: "Your Posts" },
];

/**
 * Community — the feed.
 *
 * The collector directory that used to live at this URL moved to
 * `/app/community/people`: a social product's home is the stream, and
 * finding a specific person is a different errand.
 *
 * What each tab CONTAINS is decided by the backend (see
 * `app/social/services/posts.py`), so this page and the native app can
 * never drift on what "Following" means.
 */
export function CommunityFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FeedTab>("following");
  const [query, setQuery] = useState("");
  const [claimOpen, setClaimOpen] = useState(false);

  const { data: me, isLoading: meLoading } = useSocialMe();
  const profile = me?.profile ?? null;
  const searching = query.trim().length > 1;

  const feed = useFeed(tab, Boolean(profile) && !searching);
  const { data: trending } = useTrendingHashtags(
    Boolean(profile) && tab === "foryou",
  );
  const search = useSocialSearchAll(query, Boolean(profile));

  // Nothing below the search bar works without a handle — posting,
  // following and the feed all key off it.
  if (meLoading) {
    return <Skeleton height={320} radius={14} />;
  }
  if (!profile) {
    return (
      <div className={styles.feed}>
        <h1 className={styles.title}>Community</h1>
        <Panel className={styles.claim}>
          <div>
            <h2 className={styles.claimTitle}>Claim your username</h2>
            <p className={styles.claimBody}>
              Set up a profile so you can post, follow collectors and be found.
            </p>
          </div>
          <Button onClick={() => setClaimOpen(true)}>Get started</Button>
        </Panel>
        <EditProfileModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          profile={null}
          accountName={user?.display_name}
        />
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      <header className={styles.head}>
        <h1 className={styles.title}>Community</h1>
        <div className={styles.search}>
          <Search size={16} aria-hidden className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users and hashtags"
            aria-label="Search collectors and hashtags"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              className={styles.searchClear}
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<Users size={15} />}
          onClick={() => navigate("/app/community/people")}
        >
          Collectors
        </Button>
      </header>

      {searching ? (
        <SearchResults query={query} results={search} />
      ) : (
        <>
          <Composer handle={profile.username} avatarUrl={profile.avatarUrl} />

          <nav className={styles.tabs} aria-label="Feed">
            {TABS.map((entry) => (
              <button
                key={entry.key}
                type="button"
                role="tab"
                aria-selected={entry.key === tab}
                className={cx(styles.tab, entry.key === tab && styles.tabOn)}
                onClick={() => setTab(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </nav>

          {tab === "foryou" && trending && trending.length > 0 && (
            <div className={styles.chips}>
              {trending.map((entry) => (
                <Link
                  key={entry.tag}
                  to={`/app/community/tag/${encodeURIComponent(entry.tag)}`}
                  className={styles.chip}
                >
                  #{entry.tag}
                </Link>
              ))}
            </div>
          )}

          <FeedList
            query={feed}
            emptyTitle={
              tab === "following"
                ? "Your feed is quiet"
                : tab === "mine"
                  ? "You haven't posted yet"
                  : "Nothing to discover yet"
            }
            emptyBody={
              tab === "following"
                ? "Follow some collectors and their posts land here."
                : tab === "mine"
                  ? "Show off a pull, a grail, or a whole binder."
                  : "Be the first to post something."
            }
            emptyAction={
              tab === "following" ? (
                <Button
                  variant="secondary"
                  onClick={() => navigate("/app/community/people")}
                >
                  Find collectors
                </Button>
              ) : null
            }
          />
        </>
      )}

      <EditProfileModal
        open={claimOpen}
        onOpenChange={setClaimOpen}
        profile={profile}
        accountName={user?.display_name}
      />
    </div>
  );
}

/** People first, then tags — a name is a more specific ask than a tag. */
function SearchResults({
  query,
  results,
}: {
  query: string;
  results: ReturnType<typeof useSocialSearchAll>;
}) {
  const navigate = useNavigate();
  const { data, isLoading } = results;
  const empty =
    !isLoading && !data?.users.length && !data?.hashtags.length;

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} height={56} radius={10} />
        ))}
      </div>
    );
  }
  if (empty) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>Nothing matches “{query.trim()}”</h2>
        <Button variant="secondary" onClick={() => navigate("/app/community/people")}>
          Browse all collectors
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.results}>
      {data!.users.length > 0 && (
        <section>
          <h2 className={styles.resultsLabel}>Collectors</h2>
          <div className={styles.list}>
            {data!.users.map((row) => (
              <UserRow key={row.userId} user={row} />
            ))}
          </div>
        </section>
      )}
      {data!.hashtags.length > 0 && (
        <section>
          <h2 className={styles.resultsLabel}>Hashtags</h2>
          <div className={styles.list}>
            {data!.hashtags.map((entry) => (
              <Link
                key={entry.tag}
                to={`/app/community/tag/${encodeURIComponent(entry.tag)}`}
                className={styles.tagRow}
              >
                <span className={styles.tagGlyph}>
                  <Hash size={18} />
                </span>
                <span className={styles.tagText}>
                  <span className={styles.tagName}>#{entry.tag}</span>
                  <span className={styles.tagMeta}>
                    {entry.postCount.toLocaleString()}{" "}
                    {entry.postCount === 1 ? "post" : "posts"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
