import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useBlogPost } from "@loupe/core";
import { NoteCard, Button, Skeleton, Markdown } from "@/components";
import { SitePage } from "@/features/site";
import { formatPostDate } from "../Blog/Blog";
import styles from "../Blog/Blog.module.scss";

/** A single blog post, loaded from the backend by slug. Body is Markdown. */
export function BlogPost() {
  const { slug = "" } = useParams();
  const { data: post, isLoading, isError } = useBlogPost(slug);

  if (isLoading) {
    return (
      <div className={styles.notFound}>
        <Skeleton height={320} radius={14} />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className={styles.notFound}>
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

  return (
    <SitePage
      eyebrow={post.tag}
      title={post.title}
      lead={`${post.author} · ${formatPostDate(post)} · ${post.readMinutes} min read`}
    >
      <Link to="/blog" className={styles.back}>
        <ArrowLeft size={15} /> All posts
      </Link>
      <Markdown>{post.body}</Markdown>
    </SitePage>
  );
}
