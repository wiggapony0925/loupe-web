import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useBlogPosts, type BlogPost } from "@loupe/core";
import { Skeleton, NoteCard, Avatar } from "@/components";
import styles from "./Blog.module.scss";

export function formatPostDate(post: Pick<BlogPost, "publishedAt" | "createdAt">): string {
  return new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Cover image, or a branded gradient fallback stamped with the tag. */
function Cover({ post, className }: { post: BlogPost; className?: string }) {
  if (post.coverImageUrl) {
    return (
      <span
        className={`${styles.cover} ${className ?? ""}`}
        style={{ backgroundImage: `url("${post.coverImageUrl}")` }}
        role="img"
        aria-label={post.title}
      />
    );
  }
  return (
    <span className={`${styles.cover} ${styles.coverFallback} ${className ?? ""}`} aria-hidden>
      <span className={styles.coverFallback__mark}>{post.tag}</span>
    </span>
  );
}

function Byline({ post }: { post: BlogPost }) {
  return (
    <span className={styles.byline}>
      <Avatar name={post.author} size="sm" />
      <span className={styles.byline__text}>
        <span className={styles.byline__name}>{post.author}</span>
        <span className={styles.byline__meta}>
          {formatPostDate(post)} · {post.readMinutes} min read
        </span>
      </span>
    </span>
  );
}

/** Blog index — live published posts, newest first, in an editorial layout. */
export function Blog() {
  const { data: posts, isLoading, isError } = useBlogPosts();
  const [featured, ...rest] = posts ?? [];

  return (
    <div className={styles.blog}>
      <header className={styles.head}>
        <p className={styles.head__eyebrow}>Blog</p>
        <h1 className={styles.head__title}>From the Loupe team</h1>
        <p className={styles.head__lead}>
          Product notes, collecting strategy, and the thinking behind how we price cards.
        </p>
      </header>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={320} radius={16} />
          ))}
        </div>
      ) : isError || !posts || posts.length === 0 ? (
        <NoteCard title="No posts yet" message="We're working on our first articles — check back soon." />
      ) : (
        <>
          {/* Featured */}
          {featured && (
            <Link to={`/blog/${featured.slug}`} className={styles.featured}>
              <Cover post={featured} className={styles.featured__cover} />
              <span className={styles.featured__body}>
                <span className={styles.tag}>{featured.tag}</span>
                <h2 className={styles.featured__title}>{featured.title}</h2>
                <p className={styles.featured__excerpt}>{featured.excerpt}</p>
                <Byline post={featured} />
                <span className={styles.featured__more}>
                  Read article <ArrowRight size={15} />
                </span>
              </span>
            </Link>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className={styles.grid}>
              {rest.map((post) => (
                <Link key={post.id} to={`/blog/${post.slug}`} className={styles.card}>
                  <Cover post={post} className={styles.card__cover} />
                  <span className={styles.card__body}>
                    <span className={styles.tag}>{post.tag}</span>
                    <h3 className={styles.card__title}>{post.title}</h3>
                    <p className={styles.card__excerpt}>{post.excerpt}</p>
                    <Byline post={post} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
