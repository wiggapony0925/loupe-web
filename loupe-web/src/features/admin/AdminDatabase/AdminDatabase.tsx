import { useMemo, useState } from "react";
import { Table2, KeyRound, Link2, Database } from "lucide-react";
import { useAdminDbTables, useAdminDbGraph, useAdminDbTable } from "@loupe/core";
import { Skeleton, NoteCard, SegmentedControl, Badge } from "@/components";
import { SchemaMap } from "./SchemaMap";
import styles from "./AdminDatabase.module.scss";
import admin from "../admin.module.scss";

type View = "map" | "table";

/** Admin: Supabase-style read-only database explorer — schema, relationships,
 *  and live row counts. Metadata only; no row data and no writes. */
export function AdminDatabase() {
  const { data: overview, isLoading, isError } = useAdminDbTables();
  const { data: graph } = useAdminDbGraph();
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>("map");
  const [filter, setFilter] = useState("");

  const tables = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const rows = overview?.tables ?? [];
    return q ? rows.filter((t) => t.name.includes(q)) : rows;
  }, [overview, filter]);

  const select = (name: string) => {
    setSelected(name);
    setView("table");
  };

  return (
    <div className={admin.page}>
      <div className={admin.head}>
        <div>
          <h1 className={admin.title}>Database</h1>
          <p className={admin.subtitle}>
            Live schema, foreign-key relationships, and row counts. Read-only — no row data leaves the database.
          </p>
        </div>
        {overview && (
          <div className={styles.dialect}>
            <Database size={15} />
            {overview.dialect} · {overview.tableCount} tables
          </div>
        )}
      </div>

      {isError ? (
        <NoteCard
          title="Couldn't load the database"
          message="The schema endpoint didn't respond — if this is local, make sure the backend is running the latest code (it may not be deployed yet)."
        />
      ) : (
      <div className={styles.layout}>
        {/* ── Table list ── */}
        <aside className={styles.sidebar}>
          <input
            className={styles.search}
            placeholder="Filter tables…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {isLoading ? (
            <div className={styles.list}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} height={40} radius={10} />
              ))}
            </div>
          ) : (
            <div className={styles.list}>
              {tables.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={styles.tableRow}
                  data-active={t.name === selected || undefined}
                  onClick={() => select(t.name)}
                >
                  <Table2 size={14} className={styles.tableRow__icon} />
                  <span className={styles.tableRow__name}>{t.name}</span>
                  <span className={styles.tableRow__rows}>{t.rowEstimate.toLocaleString()}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* ── Detail / map ── */}
        <section className={styles.main}>
          <SegmentedControl<View>
            aria-label="Database view"
            value={view}
            onChange={setView}
            options={[
              { value: "map", label: "Schema map" },
              { value: "table", label: selected ?? "Table" },
            ]}
          />
          {view === "map" ? (
            <SchemaMap graph={graph} selected={selected} onSelect={select} />
          ) : selected ? (
            <TableDetail name={selected} />
          ) : (
            <NoteCard title="No table selected" message="Pick a table from the list or the map." />
          )}
        </section>
      </div>
      )}
    </div>
  );
}

/** Columns, indexes, and relationships for one table. */
function TableDetail({ name }: { name: string }) {
  const { data, isLoading } = useAdminDbTable(name);

  if (isLoading || !data) return <Skeleton height={320} radius={16} />;

  return (
    <div className={styles.detail}>
      <div className={styles.detail__meta}>
        <span className={styles.detail__rows}>
          {data.rowEstimate.toLocaleString()} rows
        </span>
        {data.referencedBy.length > 0 && (
          <span className={styles.detail__refs}>
            Referenced by {data.referencedBy.join(", ")}
          </span>
        )}
      </div>

      <table className={styles.cols}>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
            <th>Null</th>
            <th>Key</th>
          </tr>
        </thead>
        <tbody>
          {data.columns.map((c) => (
            <tr key={c.name}>
              <td className={styles.cols__name}>{c.name}</td>
              <td className={styles.cols__type}>{c.type}</td>
              <td>{c.nullable ? "·" : "no"}</td>
              <td>
                {c.primaryKey && (
                  <Badge tone="mint">
                    <KeyRound size={11} /> PK
                  </Badge>
                )}
                {c.foreignKey && (
                  <span className={styles.fk}>
                    <Link2 size={11} /> {c.foreignKey}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.indexes.length > 0 && (
        <div className={styles.indexes}>
          <h3 className={styles.detail__label}>Indexes</h3>
          {data.indexes.map((ix) => (
            <div key={ix.name} className={styles.index}>
              <code>{ix.name}</code>
              <span>({ix.columns.join(", ")})</span>
              {ix.unique && <Badge tone="neutral">unique</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
