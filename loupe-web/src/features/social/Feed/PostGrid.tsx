import { Link } from "react-router-dom";
import { Heart, Layers, MessageCircle } from "lucide-react";
import type { Post } from "@loupe/core";
import { formatCount } from "./formatCount";
import styles from "./PostGrid.module.scss";

/**
 * Posts as a mosaic — a profile's posts tab, and a hashtag page.
 *
 * A grid, not a stack of cards. Both surfaces are for BROWSING: you're
 * scanning someone's work for something that catches your eye, not reading
 * captions in order. Three columns show fifteen posts where the feed shows
 * four, which is why every app with a tag page uses one.
 *
 * Posts with no photo still get a tile. A text-only post that vanishes
 * from its own profile is a bug the author can see — the tile falls back to
 * the card art, then to the words themselves.
 */
export function PostGrid({
  posts,
  showStats = true,
  empty,
}: {
  posts: Post[];
  /**
   * Burn like/comment counts onto every tile.
   *
   * True on a hashtag page, which is RANKED by engagement — the numbers
   * are the reason a post is near the top. False on a profile, where they
   * are just a scrim over someone's photographs, answering a question
   * nobody asked.
   */
  showStats?: boolean;
  empty?: React.ReactNode;
}) {
  if (posts.length === 0) return <>{empty}</>;

  return (
    <div className={styles.grid}>
      {posts.map((post) => (
        <Link
          key={post.id}
          to={`/app/community/p/${post.id}`}
          className={styles.tile}
          aria-label={
            post.body
              ? `${post.body.slice(0, 60)} — ${post.likeCount} likes`
              : `Post by @${post.author.username}`
          }
        >
          {post.media[0] ? (
            <img
              src={post.media[0].url}
              alt=""
              className={styles.photo}
              loading="lazy"
            />
          ) : post.card?.imageUrl ? (
            // Card art is portrait; `contain` on a tinted ground beats
            // cropping the top off a Charizard.
            <span className={styles.artWrap}>
              <img
                src={post.card.imageUrl}
                alt=""
                className={styles.art}
                loading="lazy"
              />
            </span>
          ) : (
            <span className={styles.textTile}>
              <span className={styles.quote} aria-hidden>
                &ldquo;
              </span>
              <span className={styles.textBody}>{post.body}</span>
            </span>
          )}

          {post.media.length > 1 && (
            <span className={styles.stack} aria-hidden>
              <Layers size={15} />
            </span>
          )}

          {showStats && (post.likeCount > 0 || post.commentCount > 0) && (
            <span className={styles.stats} aria-hidden>
              {post.likeCount > 0 && (
                <span className={styles.stat}>
                  <Heart size={12} fill="currentColor" />
                  {formatCount(post.likeCount)}
                </span>
              )}
              {post.commentCount > 0 && (
                <span className={styles.stat}>
                  <MessageCircle size={12} fill="currentColor" />
                  {formatCount(post.commentCount)}
                </span>
              )}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
