import { useState, type ReactNode } from "react";
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query";
import type { Feed, Post } from "@loupe/core";
import { feedPosts } from "@loupe/core";
import { Button, Skeleton } from "@/components";
import { CommentsModal } from "./CommentsModal";
import { PostCard } from "./PostCard";
import { ReportModal, type ReportTarget } from "./ReportModal";
import styles from "./Feed.module.scss";

export interface FeedListProps {
  query: UseInfiniteQueryResult<InfiniteData<Feed>>;
  emptyTitle?: string;
  emptyBody?: string;
  emptyAction?: ReactNode;
  hideFollow?: boolean;
}

/**
 * The one list every post surface renders through — the feed tabs, a
 * collector's profile grid and a hashtag page.
 *
 * Writing them separately is how a like button ends up behaving differently
 * depending on which page you clicked it from.
 */
export function FeedList({
  query,
  emptyTitle = "Nothing here yet",
  emptyBody = "Posts will show up here.",
  emptyAction,
  hideFollow,
}: FeedListProps) {
  const [openPost, setOpenPost] = useState<Post | null>(null);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const posts = feedPosts(query.data);

  if (query.isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={280} radius={14} />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>{emptyTitle}</h2>
        <p className={styles.emptyBody}>{emptyBody}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <div className={styles.list}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onOpenComments={setOpenPost}
            hideFollow={hideFollow}
            onReport={setReporting}
          />
        ))}
      </div>

      {query.hasNextPage && (
        <div className={styles.more}>
          <Button
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <CommentsModal post={openPost} onClose={() => setOpenPost(null)} />
      <ReportModal target={reporting} onClose={() => setReporting(null)} />
    </>
  );
}
