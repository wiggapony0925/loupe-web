import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Flag, Heart, MessageCircle, Trash2 } from "lucide-react";
import type { Post } from "@loupe/core";
import { useDeletePost, useLikePost } from "@loupe/core";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/format";
import { FollowButton } from "../components/FollowButton";
import { SocialAvatar } from "../components/SocialAvatar";
import { formatCount } from "./formatCount";
import { PostCaption } from "./PostCaption";
import { PostMedia } from "./PostMedia";
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
  const remove = useDeletePost();
  const [confirming, setConfirming] = useState(false);
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
            </span>
          </span>
        </Link>

        {!hideFollow && author.relationship !== "self" && (
          <FollowButton
            username={author.username}
            relationship={author.relationship}
          />
        )}

        {/* Reporting your own post is meaningless, so it isn't offered. */}
        {onReport && author.relationship !== "self" && (
          <button
            type="button"
            className={styles.iconButton}
            aria-label={`Report @${author.username}'s post`}
            onClick={() =>
              onReport({
                type: "post",
                id: post.id,
                label: `@${author.username}'s post`,
              })
            }
          >
            <Flag size={15} />
          </button>
        )}

        {post.canDelete &&
          (confirming ? (
            <span className={styles.confirm}>
              <button
                type="button"
                className={styles.confirmYes}
                disabled={remove.isPending}
                onClick={() => remove.mutate(post.id)}
              >
                Delete
              </button>
              <button
                type="button"
                className={styles.confirmNo}
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={styles.iconButton}
              aria-label="Delete this post"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={16} />
            </button>
          ))}
      </header>

      {post.media.length > 0 && (
        <PostMedia media={post.media} onOpen={() => onOpenComments(post)} />
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
    </article>
  );
}
