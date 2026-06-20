import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBlogPosts, useBlogPost } from "@loupe/core";
import { NoteCard, Button, Skeleton, Markdown, Avatar } from "@/components";
import { formatPostDate } from "../Blog/Blog";
import styles from "./BlogPost.module.scss";

/** A single blog post rendered as a real article — cover hero, byline, and
 *  reading-width prose. Body is Markdown. */
export function BlogPost() {
  const { slug = "" } = useParams();
  const { data: post, isLoading, isError } = useBlogPost(slug);
  const { data: all } = useBlogPosts();

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Skeleton height={40} width="60%" radius={10} />
        <Skeleton height={320} radius={16} />
        <Skeleton height={240} radius={10} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className={styles.loading}>
        <NoteCard
          title="Post not found"
          message="This article may have moved. Browse the rest of the blog."
          action={
            <Link to="/blog">
              <Button variant="secondary" size="sm">
                Back to blog
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const more = (all ?? []).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <article className={styles.article}>
      <div className={styles.head}>
        <Link to="/blog" className={styles.back}>
          <ArrowLeft size={15} /> All posts
        </Link>
        <span className={styles.tag}>{post.tag}</span>
        <h1 className={styles.title}>{post.title}</h1>
        {post.excerpt && <p className={styles.lead}>{post.excerpt}</p>}
        <div className={styles.byline}>
          <Avatar name={post.author} />
          <span className={styles.byline__text}>
            <span className={styles.byline__name}>{post.author}</span>
            <span className={styles.byline__meta}>
              {formatPostDate(post)} · {post.readMinutes} min read
            </span>
          </span>
        </div>
      </div>

      {post.coverImageUrl && (
        <img className={styles.cover} src={post.coverImageUrl} alt={post.title} loading="eager" />
      )}

      <div className={styles.body}>
        <Markdown className={styles.prose}>{post.body}</Markdown>
      </div>

      {more.length > 0 && (
        <div className={styles.more}>
          <h2 className={styles.more__title}>Keep reading</h2>
          <div className={styles.more__list}>
            {more.map((p) => (
              <Link key={p.id} to={`/blog/${p.slug}`} className={styles.more__item}>
                <span className={styles.more__tag}>{p.tag}</span>
                <span className={styles.more__name}>{p.title}</span>
                <span className={styles.more__meta}>
                  {formatPostDate(p)} · {p.readMinutes} min read
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
