import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useAdminBlogPosts, type BlogPost } from "@loupe/core";
import { Button, Skeleton, NoteCard, IconButton } from "@/components";
import { BlogForm } from "../BlogForm/BlogForm";
import styles from "../admin.module.scss";

/** Admin: manage blog posts. */
export function AdminBlog() {
  const { data: posts, isLoading } = useAdminBlogPosts();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [open, setOpen] = useState(false);

  const create = () => {
    setEditing(null);
    setOpen(true);
  };
  const edit = (post: BlogPost) => {
    setEditing(post);
    setOpen(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>Write and publish posts to the public blog.</p>
        </div>
        <Button onClick={create} leadingIcon={<Plus size={16} />}>
          New post
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={68} radius={14} />
          ))}
        </div>
      ) : !posts || posts.length === 0 ? (
        <div className={styles.empty}>
          <NoteCard
            title="No posts yet"
            message="Write your first post. Set it to Published to make it live on the blog."
            action={
              <Button variant="secondary" size="sm" onClick={create}>
                New post
              </Button>
            }
          />
        </div>
      ) : (
        <div className={styles.list}>
          {posts.map((post) => (
            <div key={post.id} className={styles.row}>
              <div className={styles.row__main}>
                <span className={styles.row__title}>{post.title}</span>
                <span className={styles.row__meta}>
                  {post.tag} · {post.author} · {post.readMinutes} min read
                </span>
              </div>
              <div className={styles.row__actions}>
                <span className={styles.status} data-status={post.status}>
                  {post.status}
                </span>
                <IconButton label={`Edit ${post.title}`} onClick={() => edit(post)}>
                  <Pencil size={16} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      )}

      <BlogForm post={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
