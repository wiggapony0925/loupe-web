import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Heart, SendHorizonal } from "lucide-react";
import type { Post, PostComment } from "@loupe/core";
import {
  useAddComment,
  useCommentReplies,
  useDeleteComment,
  useLikeComment,
  usePostComments,
} from "@loupe/core";
import { useModeratedSubmit } from "moderato/react";
import { Button, Modal, Skeleton } from "@/components";
import { cx } from "@/lib/cx";
import { relativeTime } from "@/lib/format";
import { SocialAvatar } from "../components/SocialAvatar";
import { formatCount } from "./formatCount";
import { PostCaption } from "./PostCaption";
import styles from "./Feed.module.scss";

/**
 * A post's comment thread.
 *
 * Ordered oldest-first — a conversation reads down, unlike the feed above
 * it, which is a river. The caption is pinned at the top so the thread reads
 * as replies to something rather than as a bare list of remarks.
 */
export function CommentsModal({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const postId = post?.id ?? null;
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  const thread = usePostComments(postId);
  const add = useAddComment();
  // Comments are screened server-side like any publish; before moderato a
  // 422 here vanished — spinner stopped, nothing explained. The backend's
  // own refusal copy now shows, and the draft survives.
  const moderated = useModeratedSubmit(add, {
    onDone: () => {
      setDraft("");
      setReplyTo(null);
    },
  });

  const comments = thread.data?.pages.flatMap((page) => page.items) ?? [];
  const total = thread.data?.pages[0]?.total ?? post?.commentCount ?? 0;

  const close = () => {
    setDraft("");
    setReplyTo(null);
    moderated.dismiss();
    onClose();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !postId || moderated.pending) return;
    moderated.submit({ postId, body, parentId: replyTo?.id ?? null });
  };

  const startReply = (comment: PostComment) => {
    setReplyTo(comment);
    // Seed the mention: the reply reads as addressed to someone, and the
    // backend indexes it as a real mention.
    setDraft((current) =>
      current.startsWith(`@${comment.author.username} `)
        ? current
        : `@${comment.author.username} `,
    );
  };

  return (
    <Modal
      open={Boolean(post)}
      onOpenChange={(next) => !next && close()}
      title="Comments"
      description={total > 0 ? `${total} ${total === 1 ? "comment" : "comments"}` : undefined}
      size="md"
    >
      <div className={styles.thread}>
        {post?.body && (
          <div className={styles.threadCaption}>
            <SocialAvatar
              name={post.author.displayName || post.author.username}
              src={post.author.avatarUrl}
            />
            <div>
              <PostCaption
                body={post.body}
                hashtags={post.hashtags}
                mentions={post.mentions}
                prefix={post.author.username}
              />
              <span className={styles.commentWhen}>
                {relativeTime(post.createdAt)}
              </span>
            </div>
          </div>
        )}

        {thread.isLoading ? (
          <div className={styles.threadList}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} height={56} radius={10} />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className={styles.threadEmpty}>
            No comments yet. Be the first to say something.
          </p>
        ) : (
          <div className={styles.threadList}>
            {comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                postId={postId as string}
                onReply={startReply}
              />
            ))}
          </div>
        )}

        {thread.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            disabled={thread.isFetchingNextPage}
            onClick={() => void thread.fetchNextPage()}
          >
            Load more comments
          </Button>
        )}

        {replyTo && (
          <p className={styles.replyBar}>
            Replying to @{replyTo.author.username}
            <button
              type="button"
              className={styles.replyCancel}
              onClick={() => {
                setReplyTo(null);
                setDraft("");
              }}
            >
              Cancel
            </button>
          </p>
        )}

        {moderated.refusal && (
          <p className={styles.composerRefusal} role="alert">
            {moderated.refusal}
          </p>
        )}
        {moderated.error && (
          <p className={styles.composerError}>
            {moderated.error.message || "Couldn't comment. Please try again."}
          </p>
        )}

        <form className={styles.composer} onSubmit={submit}>
          <input
            className={styles.composerInput}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (moderated.refusal) moderated.dismiss();
            }}
            placeholder="Add a comment…"
            aria-label="Write a comment"
            maxLength={1000}
          />
          <button
            type="submit"
            className={styles.composerSend}
            disabled={!draft.trim() || moderated.pending}
            aria-label="Post comment"
          >
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>
    </Modal>
  );
}

/** One comment, with its replies nested a single level under it. */
function CommentRow({
  comment,
  postId,
  onReply,
  nested,
}: {
  comment: PostComment;
  postId: string;
  onReply: (comment: PostComment) => void;
  nested?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const like = useLikeComment(postId);
  const remove = useDeleteComment();
  const extra = useCommentReplies(expanded ? comment.id : null);

  const shown = expanded && extra.data ? extra.data.items : comment.replies;
  const hidden = comment.replyCount - shown.length;
  const author = comment.author;

  return (
    <div className={cx(styles.comment, nested && styles.commentNested)}>
      <div className={styles.commentRow}>
        <Link to={`/app/u/${encodeURIComponent(author.username)}`}>
          <SocialAvatar name={author.displayName || author.username} src={author.avatarUrl} />
        </Link>
        <div className={styles.commentBody}>
          <span className={styles.commentByline}>
            <Link
              to={`/app/u/${encodeURIComponent(author.username)}`}
              className={styles.commentHandle}
            >
              {author.username}
            </Link>
            {author.isAdmin && <BadgeCheck size={12} className={styles.verified} />}
            {author.isPro && <span className={styles.pro}>PRO</span>}
            <span className={styles.commentWhen}>
              {relativeTime(comment.createdAt)}
            </span>
          </span>
          <PostCaption body={comment.body} hashtags={[]} mentions={[]} />
          <span className={styles.commentFooter}>
            {comment.likeCount > 0 && (
              <span>
                {formatCount(comment.likeCount)}{" "}
                {comment.likeCount === 1 ? "Like" : "Likes"}
              </span>
            )}
            <button type="button" onClick={() => onReply(comment)}>
              Reply
            </button>
            {comment.canDelete && (
              <button
                type="button"
                disabled={remove.isPending}
                onClick={() => remove.mutate({ commentId: comment.id, postId })}
              >
                Delete
              </button>
            )}
          </span>
        </div>
        <button
          type="button"
          className={cx(
            styles.commentHeart,
            comment.viewerHasLiked && styles.actionLiked,
          )}
          aria-label={
            comment.viewerHasLiked ? "Unlike this comment" : "Like this comment"
          }
          aria-pressed={comment.viewerHasLiked}
          onClick={() =>
            like.mutate({ commentId: comment.id, liked: comment.viewerHasLiked })
          }
        >
          <Heart size={14} fill={comment.viewerHasLiked ? "currentColor" : "none"} />
        </button>
      </div>

      {shown.map((reply) => (
        <CommentRow key={reply.id} comment={reply} postId={postId} onReply={onReply} nested />
      ))}

      {hidden > 0 && !nested && (
        <button
          type="button"
          className={styles.viewReplies}
          onClick={() => setExpanded(true)}
        >
          View {hidden} {hidden === 1 ? "reply" : "replies"}
        </button>
      )}
    </div>
  );
}
