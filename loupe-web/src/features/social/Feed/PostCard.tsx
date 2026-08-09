import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Heart, MessageCircle } from "lucide-react";
import type { Post } from "@loupe/core";
import { useLikePost } from "@loupe/core";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/format";
import { FollowButton } from "../components/FollowButton";
import { SocialAvatar } from "../components/SocialAvatar";
import { formatCount } from "./formatCount";
import { EditPostModal } from "./EditPostModal";
import { Lightbox } from "./Lightbox";
import { PostCaption } from "./PostCaption";
import { PostMedia } from "./PostMedia";
import { PostMenu } from "./PostMenu";
import type { ReportTarget } from "./ReportModal";
import styles from "./Feed.module.scss";

export interface PostCardProps {
  post: Post;
  onOpenComments: (post: Post) => void;
  /** Hides the byline's follow control (already on the author's own page). */
  hideFollow?: boolean;
  /** Opens the report sheet. Absent on your own posts. */
  onReport?: (target: ReportTarget) => void;
}

/**
 * One post.
 *
 * The byline sits ABOVE the media rather than below it: scrolling past a
 * photo before learning whose it is means scrolling back.
 */
export function PostCard({
  post,
  onOpenComments,
  hideFollow,
  onReport,
}: PostCardProps) {
  const like = useLikePost();
  const [editing, setEditing] = useState<Post | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const author = post.author;
  const authorHref = `/app/u/${encodeURIComponent(author.username)}`;

  return (
    <article className={styles.post}>
      <header className={styles.postHead}>
        <Link to={authorHref} className={styles.postAuthor}>
          <SocialAvatar name={author.displayName || author.username} src={author.avatarUrl} />
          <span className={styles.postIdent}>
            <span className={styles.postName}>
              {author.displayName?.trim() || `@${author.username}`}
              {author.isAdmin && (
                <BadgeCheck
                  size={14}
                  className={styles.verified}
                  aria-label="Loupe staff"
                />
              )}
              {author.isPro && <span className={styles.pro}>PRO</span>}
            </span>
            <span className={styles.postMeta}>
              @{author.username} · {relativeTime(post.createdAt)}
              {/* Comments underneath may be answering words that are no
                  longer there. Saying so is the honest thing. */}
              {post.editedAt ? " · edited" : ""}
            </span>
          </span>
        </Link>

        {!hideFollow && author.relationship !== "self" && (
          <FollowButton
            username={author.username}
            relationship={author.relationship}
          />
        )}

        <PostMenu
          post={post}
          onEdit={setEditing}
          onReport={
            onReport
              ? (target) =>
                  onReport({
                    type: "post",
                    id: target.id,
                    label: `@${target.author.username}'s post`,
                  })
              : undefined
          }
        />
      </header>

      {post.media.length > 0 && (
        <PostMedia
          media={post.media}
          liked={post.viewerHasLiked}
          onOpen={setViewing}
          onLike={() => like.mutate({ postId: post.id, liked: false })}
        />
      )}

      {post.card && (
        <Link
          to={`/cards/${encodeURIComponent(post.card.cardId)}`}
          className={styles.cardChip}
        >
          {post.card.imageUrl && (
            <img src={post.card.imageUrl} alt="" className={styles.cardArt} />
          )}
          <span className={styles.cardText}>
            <span className={styles.cardName}>{post.card.name ?? "Card"}</span>
            <span className={styles.cardMeta}>
              {[post.card.setName, post.card.number && `#${post.card.number}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </span>
        </Link>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={cx(styles.action, post.viewerHasLiked && styles.actionLiked)}
          aria-label={post.viewerHasLiked ? "Unlike this post" : "Like this post"}
          aria-pressed={post.viewerHasLiked}
          onClick={() =>
            like.mutate({ postId: post.id, liked: post.viewerHasLiked })
          }
        >
          <Heart size={19} fill={post.viewerHasLiked ? "currentColor" : "none"} />
          {formatCount(post.likeCount)} {post.likeCount === 1 ? "Like" : "Likes"}
        </button>
        <button
          type="button"
          className={styles.action}
          aria-label={`${post.commentCount} comments`}
          onClick={() => onOpenComments(post)}
        >
          <MessageCircle size={19} />
          {formatCount(post.commentCount)}
        </button>
      </div>

      {post.body && (
        <PostCaption
          body={post.body}
          hashtags={post.hashtags}
          mentions={post.mentions}
          prefix={author.username}
        />
      )}

      <Link to={`/app/community/p/${post.id}`} className={styles.postDate}>
        {new Date(post.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </Link>

      {viewing !== null && (
        <Lightbox
          media={post.media}
          startIndex={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      <EditPostModal post={editing} onClose={() => setEditing(null)} />
    </article>
  );
}
