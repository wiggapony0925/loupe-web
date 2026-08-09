import { useEffect, useState } from "react";
import type { Post } from "@loupe/core";
import { useEditPost } from "@loupe/core";
import { Button, Modal } from "@/components";
import styles from "./Feed.module.scss";

/** Matches the server's `MAX_POST_BODY`. */
const MAX_BODY = 2200;

/**
 * Rewrite a caption.
 *
 * The caption ONLY. Photos are immutable once published — swapping the
 * image under a post people have already liked changes what they endorsed.
 * Editing words is a correction; editing the picture is a bait-and-switch.
 *
 * The server re-screens the new text, so a rewrite can be refused. The
 * refusal renders in the modal rather than as a toast: the words that
 * caused it are still on screen and still editable, which is the point.
 */
export function EditPostModal({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const edit = useEditPost();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reseed on a DIFFERENT post, keyed by id — a cache patch (someone likes
  // it while the modal is open) must not wipe out what's being typed.
  useEffect(() => {
    if (post) {
      setBody(post.body ?? "");
      setError(null);
    }
  }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = post ? body.trim() !== (post.body ?? "").trim() : false;
  const hasOtherContent = Boolean(post && (post.media.length > 0 || post.card));
  // Clearing the text of a text-only post is a delete, and the author
  // should do it as one rather than be left with an invisible post.
  const wouldEmpty = body.trim().length === 0 && !hasOtherContent;
  const canSave = dirty && !wouldEmpty && !edit.isPending;

  const save = () => {
    if (!post || !canSave) return;
    setError(null);
    edit.mutate(
      { postId: post.id, body: body.trim() },
      { onSuccess: () => onClose(), onError: (err) => setError(err.message) },
    );
  };

  return (
    <Modal
      open={Boolean(post)}
      onOpenChange={(next) => !next && onClose()}
      title="Edit caption"
      description="Photos can't be changed after posting."
    >
      <textarea
        className={styles.composerBody}
        value={body}
        onChange={(event) => {
          setBody(event.target.value.slice(0, MAX_BODY));
          // Editing IS the answer to a refusal — clear it as they type.
          if (error) setError(null);
        }}
        placeholder="Write a caption…"
        aria-label="Post caption"
        rows={5}
        autoFocus
      />

      {wouldEmpty && (
        <p className={styles.composerHint}>
          A post needs a caption or a photo — delete it instead.
        </p>
      )}
      {error && <p className={styles.composerError}>{error}</p>}

      <div className={styles.composerActions}>
        <span className={styles.composerCount}>{MAX_BODY - body.length}</span>
        <Button onClick={save} disabled={!canSave}>
          {edit.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}
