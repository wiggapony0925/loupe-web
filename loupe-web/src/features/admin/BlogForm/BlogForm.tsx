import { useEffect, useState } from "react";
import {
  useCreateBlogPost,
  useDeleteBlogPost,
  useUpdateBlogPost,
  type BlogPost,
  type BlogStatus,
} from "@loupe/core";
import { Button, Markdown, Modal, SegmentedControl, TextField } from "@/components";
import styles from "../admin.module.scss";

const STATUSES: { value: BlogStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
];

interface BlogFormProps {
  post: BlogPost | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface State {
  title: string;
  excerpt: string;
  tag: string;
  author: string;
  readMinutes: string;
  body: string;
  status: BlogStatus;
}

function initial(post: BlogPost | null): State {
  return {
    title: post?.title ?? "",
    excerpt: post?.excerpt ?? "",
    tag: post?.tag ?? "Update",
    author: post?.author ?? "The Loupe Team",
    readMinutes: post ? String(post.readMinutes) : "3",
    body: post?.body ?? "",
    status: post?.status ?? "draft",
  };
}

/** Create / edit / delete a blog post. Body uses `## ` for headings and blank
 *  lines between paragraphs — the public post view renders that. */
export function BlogForm({ post, open, onOpenChange }: BlogFormProps) {
  const isEdit = Boolean(post);
  const [s, setS] = useState<State>(() => initial(post));
  const [removing, setRemoving] = useState(false);
  const [preview, setPreview] = useState(false);

  const create = useCreateBlogPost({ onSuccess: () => onOpenChange(false) });
  const update = useUpdateBlogPost({ onSuccess: () => onOpenChange(false) });
  const remove = useDeleteBlogPost({ onSuccess: () => onOpenChange(false) });
  const pending = create.isPending || update.isPending || remove.isPending;
  const error = create.isError || update.isError || remove.isError;

  useEffect(() => {
    if (!open) return;
    setS(initial(post));
    setRemoving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, post?.id]);

  const set = <K extends keyof State>(k: K, v: State[K]) => setS((p) => ({ ...p, [k]: v }));
  const canSubmit = !pending && s.title.trim() !== "";

  const submit = () => {
    if (!canSubmit) return;
    const input = {
      title: s.title,
      excerpt: s.excerpt,
      tag: s.tag,
      author: s.author,
      readMinutes: Math.max(1, Math.min(120, parseInt(s.readMinutes, 10) || 3)),
      body: s.body,
      status: s.status,
    };
    if (isEdit && post) update.mutate({ id: post.id, input });
    else create.mutate(input);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={removing ? "Delete this post?" : isEdit ? "Edit post" : "New post"}
      description={
        removing
          ? "This permanently removes the post from the blog."
          : "Published posts appear on the public blog immediately."
      }
      footer={
        removing ? (
          <>
            <Button variant="secondary" onClick={() => setRemoving(false)} disabled={pending}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => post && remove.mutate(post.id)} disabled={pending}>
              {remove.isPending ? "Deleting…" : "Delete post"}
            </Button>
          </>
        ) : (
          <>
            {isEdit && (
              <Button variant="ghost" className={styles.remove} onClick={() => setRemoving(true)} disabled={pending}>
                Delete
              </Button>
            )}
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={!canSubmit}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create post"}
            </Button>
          </>
        )
      }
    >
      {!removing && (
        <div className={styles.form}>
          <TextField label="Title" value={s.title} onChange={(e) => set("title", e.target.value)} required />
          <TextField label="Excerpt" value={s.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="One-line summary for the list" />
          <div className={styles.formRow}>
            <TextField label="Tag" value={s.tag} onChange={(e) => set("tag", e.target.value)} />
            <TextField label="Author" value={s.author} onChange={(e) => set("author", e.target.value)} />
          </div>
          <div className={styles.formRow}>
            <TextField label="Read time (min)" type="number" min={1} max={120} value={s.readMinutes} onChange={(e) => set("readMinutes", e.target.value)} />
            <div className={styles.field}>
              <span className={styles.label}>Status</span>
              <SegmentedControl aria-label="Status" options={STATUSES} value={s.status} onChange={(v) => set("status", v)} />
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.bodyHead}>
              <label className={styles.label} htmlFor="post-body">
                Body (Markdown)
              </label>
              <button type="button" className={styles.previewToggle} onClick={() => setPreview((p) => !p)}>
                {preview ? "Write" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className={styles.previewPane}>
                {s.body.trim() ? <Markdown>{s.body}</Markdown> : <span className={styles.previewEmpty}>Nothing to preview yet.</span>}
              </div>
            ) : (
              <textarea
                id="post-body"
                className={styles.textarea}
                rows={10}
                value={s.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"Write the article in Markdown…\n\n## A heading\n\n**Bold**, _italic_, [links](https://), lists, and `code`."}
              />
            )}
          </div>
          {error && <p className={styles.error}>Couldn't save right now — please try again.</p>}
        </div>
      )}
    </Modal>
  );
}
