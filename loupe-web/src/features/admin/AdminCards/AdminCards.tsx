import { useState } from "react";
import { Search } from "lucide-react";
import { useAdminCards } from "@loupe/core";
import { Skeleton, NoteCard, Pagination, Badge } from "@/components";
import { CardDetailDrawer } from "./CardDetailDrawer";
import styles from "./AdminCards.module.scss";
import admin from "../admin.module.scss";

const PAGE_SIZE = 25;

/** Admin: card explorer — search the local catalog, inspect a card's full
 *  record (provider refs + price ladder), and record a manual price override. */
export function AdminCards() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading, isError } = useAdminCards({ q: q || undefined, page });

  const onSearch = (value: string) => {
    setQ(value);
    setPage(1);
  };
  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Card data</h1>
          <p className={admin.subtitle}>
            Search the local catalog, inspect provider refs + the price ladder, and override prices.
          </p>
        </div>
      </div>

      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          placeholder="Search by name, number, or set…"
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          autoFocus
        />
        {data && <span className={styles.count}>{data.total.toLocaleString()} cards</span>}
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={72} radius={14} />
          ))}
        </div>
      ) : isError || !data ? (
        <NoteCard title="Couldn't load cards" message="Please refresh in a moment." />
      ) : data.results.length === 0 ? (
        <NoteCard title="No cards" message="No catalog cards match that search." />
      ) : (
        <>
          <div className={styles.grid}>
            {data.results.map((c) => (
              <button key={c.id} type="button" className={styles.row} onClick={() => setOpenId(c.id)}>
                {c.imageUrl ? (
                  <img className={styles.thumb} src={c.imageUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.thumb} data-empty />
                )}
                <span className={styles.row__main}>
                  <span className={styles.row__name}>{c.name}</span>
                  <span className={styles.row__meta}>
                    {[c.setName, c.number && `#${c.number}`].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={styles.row__tags}>
                  <Badge tone="neutral">{c.tcg}</Badge>
                  {c.rarity && <span className={styles.rarity}>{c.rarity}</span>}
                </span>
              </button>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      )}

      <CardDetailDrawer cardId={openId} open={Boolean(openId)} onOpenChange={(o) => !o && setOpenId(null)} />
    </div>
  );
}
