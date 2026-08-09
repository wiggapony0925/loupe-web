import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { usePost } from "@loupe/core";
import { Skeleton } from "@/components";
import { CommentsModal } from "./CommentsModal";
import { PostCard } from "./PostCard";
import styles from "./Feed.module.scss";

/**
 * One post — the permalink.
 *
 * This is where a "@x commented on your post" notification lands, so the
 * thread opens with it: arriving at the post but not the comment you were
 * told about makes the notification a dead end.
 */
export function PostPage() {
  const { id = "" } = useParams<{ id: string }>();
  const post = usePost(id || null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  useEffect(() => {
    if (post.data) setCommentsOpen(true);
  }, [post.data]);

  return (
    <div className={styles.feed}>
      <header className={styles.head}>
        <Link to="/app/community" className={styles.back} aria-label="Back to the feed">
          <ChevronLeft size={20} />
        </Link>
        <h1 className={styles.title}>Post</h1>
      </header>

      {post.isLoading ? (
        <Skeleton height={320} radius={14} />
      ) : post.data ? (
        <div className={styles.list}>
          <PostCard post={post.data} onOpenComments={() => setCommentsOpen(true)} />
        </div>
      ) : (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Post unavailable</h2>
          <p className={styles.emptyBody}>
            It was deleted, or it belongs to a private account you don&rsquo;t follow.
          </p>
        </div>
      )}

      <CommentsModal
        post={commentsOpen ? (post.data ?? null) : null}
        onClose={() => setCommentsOpen(false)}
      />
    </div>
  );
}
