/** Developer portal: blog posts. */

export type BlogStatus = "draft" | "published";

/** A blog post. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  tag: string;
  author: string;
  coverImageUrl?: string | null;
  readMinutes: number;
  status: BlogStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Create/update body for a blog post (all optional on update). */
export interface BlogPostInput {
  title?: string;
  excerpt?: string;
  body?: string;
  tag?: string;
  author?: string;
  coverImageUrl?: string | null;
  readMinutes?: number;
  status?: BlogStatus;
  slug?: string;
}
