import { useMemo } from "react";
import type { DbGraph } from "@loupe/core";
import { Skeleton } from "@/components";
import styles from "./AdminDatabase.module.scss";

interface Props {
  graph?: DbGraph;
  selected: string | null;
  onSelect: (table: string) => void;
}

const W = 760;
const H = 560;
const CX = W / 2;
const CY = H / 2;
const R = 230;

/** A foreign-key relationship map: tables on a ring, FK edges between them.
 *  Selecting a table dims everything except it and its direct relationships. */
export function SchemaMap({ graph, selected, onSelect }: Props) {
  // Lay nodes out on a circle; memoised so positions are stable across renders.
  const positioned = useMemo(() => {
    const nodes = graph?.nodes ?? [];
    const pos = new Map<string, { x: number; y: number; r: number }>();
    nodes.forEach((n, i) => {
      const a = (i / Math.max(nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      pos.set(n.table, {
        x: CX + R * Math.cos(a),
        y: CY + R * Math.sin(a),
        r: Math.min(22, 9 + n.columns * 0.5),
      });
    });
    return pos;
  }, [graph]);

  if (!graph) return <Skeleton height={H} radius={16} />;

  // Neighbours of the selected node (either end of a shared edge).
  const neighbours = new Set<string>();
  if (selected) {
    for (const e of graph.edges) {
      if (e.source === selected) neighbours.add(e.target);
      if (e.target === selected) neighbours.add(e.source);
    }
  }
  const isActive = (table: string) =>
    !selected || table === selected || neighbours.has(table);

  return (
    <div className={styles.map}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.map__svg} role="img" aria-label="Schema relationship map">
        {/* Edges under nodes. */}
        {graph.edges.map((e, i) => {
          const a = positioned.get(e.source);
          const b = positioned.get(e.target);
          if (!a || !b) return null;
          const on = !selected || e.source === selected || e.target === selected;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={styles.edge}
              data-on={on || undefined}
            />
          );
        })}
        {/* Nodes. */}
        {graph.nodes.map((n) => {
          const p = positioned.get(n.table);
          if (!p) return null;
          const active = isActive(n.table);
          return (
            <g
              key={n.table}
              className={styles.node}
              data-active={active || undefined}
              data-selected={n.table === selected || undefined}
              transform={`translate(${p.x} ${p.y})`}
              onClick={() => onSelect(n.table)}
            >
              <circle r={p.r} className={styles.node__dot} />
              <text
                className={styles.node__label}
                y={p.r + 13}
                textAnchor={p.x < CX - 40 ? "end" : p.x > CX + 40 ? "start" : "middle"}
              >
                {n.table}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
