import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useHashtagPosts } from "@loupe/core";
import { FeedList } from "./FeedList";
import styles from "./Feed.module.scss";

/** Every post carrying one tag — where a chip and a tapped caption word land. */
export function HashtagPage() {
  const { tag = "" } = useParams<{ tag: string }>();
  const normalised = tag.replace(/^#/, "").toLowerCase();
  const posts = useHashtagPosts(normalised || null);

  return (
    <div className={styles.feed}>
      <header className={styles.head}>
        <Link to="/app/community" className={styles.back} aria-label="Back to the feed">
          <ChevronLeft size={20} />
        </Link>
        <h1 className={styles.title}>#{normalised}</h1>
      </header>
      <FeedList
        query={posts}
        emptyTitle={`Nothing tagged #${normalised}`}
        emptyBody="Put the tag in a caption and it shows up here."
      />
    </div>
  );
}
