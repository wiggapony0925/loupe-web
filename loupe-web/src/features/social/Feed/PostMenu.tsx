import { useEffect, useRef, useState } from "react";
import { Flag, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Post } from "@loupe/core";
import { useDeletePost } from "@loupe/core";
import styles from "./Feed.module.scss";

/**
 * The ⋯ menu on a post.
 *
 * Replaces the row of naked icon buttons in the byline — a flag and a
 * dustbin sitting permanently beside someone's name, which put "delete" one
 * mis-click from "follow" and got worse with every action added.
 *
 * What it offers is decided by the SERVER, via `canEdit` / `canDelete`.
 * That matters for the staff case: a moderator may remove a post but must
 * not rewrite one under someone else's byline, and re-deriving that rule
 * per client is how one of them gets it wrong.
 *
 * Delete asks twice, in place. It is irreversible and it takes other
 * people's replies with it — the one action in this app that earns a
 * confirmation.
 */
export function PostMenu({
  post,
  onEdit,
  onReport,
}: {
  post: Post;
  onEdit: (post: Post) => void;
  onReport?: (post: Post) => void;
}) {
  const remove = useDeletePost();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  const canReport = Boolean(onReport) && post.author.relationship !== "self";
  const hasAnything = post.canEdit || canReport || post.canDelete;

  useEffect(() => {
    if (!open) return;
    const onAway = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setConfirming(false);
      }
    };
    // `mousedown`, not `click`: a click listener added during this render
    // fires on the very event that opened the menu and closes it again.
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Nothing to offer — don't render a button that opens an empty menu.
  if (!hasAnything) return null;

  return (
    <div className={styles.menuRoot} ref={root}>
      <button
        type="button"
        className={styles.iconButton}
        aria-label="Post options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {post.canEdit && (
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit(post);
              }}
            >
              <Pencil size={15} />
              Edit caption
            </button>
          )}

          {canReport && (
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onReport?.(post);
              }}
            >
              <Flag size={15} />
              Report post
            </button>
          )}

          {post.canDelete &&
            (confirming ? (
              <div className={styles.menuConfirm}>
                <span className={styles.menuConfirmText}>
                  Delete this post and its comments?
                </span>
                <div className={styles.menuConfirmRow}>
                  <button
                    type="button"
                    className={styles.confirmYes}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(post.id)}
                  >
                    {remove.isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    className={styles.confirmNo}
                    onClick={() => setConfirming(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.menuItemDanger}
                role="menuitem"
                onClick={() => setConfirming(true)}
              >
                <Trash2 size={15} />
                Delete post
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
