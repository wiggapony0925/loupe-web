/**
 * RailResults — a marketplace carousel expanded to its FULL contents
 * (`?game=…&rail=…`), the web counterpart of mobile's rail-filter tag.
 *
 * "View more" on any resolved rail lands here: the backend re-runs the
 * shelf's recipe over the deep pool (`/v1/public/carousels/rail`) with a real
 * total, and this page just paints it — heading from the canonical rail copy,
 * the standard shop grid, and numbered pagination. Clearing returns to the
 * game's storefront.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useCarouselRail } from "@loupe/core";
import {
  Button,
  NoteCard,
  Pagination,
  ShopCard,
  ShopCardSkeleton,
} from "@/components";
import styles from "./Browse.module.scss";

const PAGE_SIZE = 24;

export function RailResults({
  game,
  railId,
  onCard,
  onClear,
}: {
  game: string;
  railId: string;
  onCard: (id: string) => void;
  onClear: () => void;
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [game, railId]);

  const { data, isLoading, isFetching } = useCarouselRail({
    game,
    railId,
    page,
    pageSize: PAGE_SIZE,
  });
  const cards = data?.cards ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <>
      <div className={styles.browse__catalogHead}>
        <div>
          <h1 className={styles.browse__heading}>{data?.title ?? "Shelf"}</h1>
          {data?.subtitle && <p className={styles.browse__sub}>{data.subtitle}</p>}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClear}
          leadingIcon={<X size={14} />}
        >
          Clear shelf filter
        </Button>
      </div>

      <div className={styles.browse__toolbar}>
        <span className={styles.browse__count}>
          {isLoading
            ? "Loading…"
            : `${(data?.total ?? 0).toLocaleString()} card${
                (data?.total ?? 0) === 1 ? "" : "s"
              } on this shelf`}
        </span>
      </div>

      {isLoading ? (
        <div className={styles.browse__grid}>
          {Array.from({ length: 12 }).map((_, i) => (
            <ShopCardSkeleton key={i} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <NoteCard
          title="This shelf is empty"
          message="It may have rotated out — clear the filter to keep browsing."
          action={
            <Button variant="secondary" size="sm" onClick={onClear}>
              Back to the storefront
            </Button>
          }
        />
      ) : (
        <>
          <div
            className={styles.browse__grid}
            style={{ opacity: isFetching ? 0.6 : 1, transition: "opacity .15s" }}
          >
            {cards.map((c) => (
              <ShopCard
                key={c.id}
                imageUrl={c.imageUrl}
                title={c.name}
                subtitle={c.setName}
                price={c.price}
                tag={c.rarity}
                onClick={() => onCard(c.id)}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <div className={styles.browse__pager}>
              <Pagination page={page} pageCount={pageCount} onChange={setPage} />
            </div>
          )}
        </>
      )}
    </>
  );
}
