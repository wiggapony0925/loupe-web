import { Link } from "react-router-dom";
import { useBlogPosts, type BlogPost } from "@loupe/core";
import { Skeleton, NoteCard } from "@/components";
import { SitePage } from "@/features/site";
import styles from "./Blog.module.scss";

export function formatPostDate(post: Pick<BlogPost, "publishedAt" | "createdAt">): string {
  return new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Blog index — live published posts, newest first. */
export function Blog() {
  const { data: posts, isLoading, isError } = useBlogPosts();

  return (
    <SitePage
      eyebrow="Blog"
      title="From the Loupe team"
      lead="Product notes, collecting strategy, and the thinking behind how we price cards."
    >
      {isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={150} radius={14} />
          ))}
        </div>
      ) : isError || !posts || posts.length === 0 ? (
        <NoteCard title="No posts yet" message="We're working on our first articles — check back soon." />
      ) : (
        <ul className={styles.list}>
          {posts.map((post) => (
            <li key={post.id}>
              <Link to={`/blog/${post.slug}`} className={styles.post}>
                <span className={styles.post__tag}>{post.tag}</span>
                <h2 className={styles.post__title}>{post.title}</h2>
                <p className={styles.post__excerpt}>{post.excerpt}</p>
                <span className={styles.post__meta}>
                  {post.author} · {formatPostDate(post)} · {post.readMinutes} min read
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SitePage>
  );
}
