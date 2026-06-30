import { useMemo, useState } from "react";
import type { CardTree } from "@loupe/core";
import styles from "./CardTreeDiagram.module.scss";

/**
 * Interactive, Figma-style lineage diagram: games → catalog providers → the
 * unified Card "trunk" → the ordered price-fallback chain, wired with curved
 * connectors. Hovering or clicking any node lights up its full lineage path and
 * dims the rest, so you can trace exactly where a given card's data — and its
 * price — comes from. Built straight from the live /admin/card-tree payload.
 */

type Kind = "game" | "source" | "card" | "price";

interface DNode {
  id: string;
  kind: Kind;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  configured?: boolean;
  badge?: string;
}
interface DEdge {
  id: string;
  from: string;
  to: string;
  kind: Kind;
}

// ---- layout constants (SVG user units; the viewBox scales to fit) ----
const VIEW_W = 980;
const COL = { game: 16, source: 250, card: 492, price: 742 };
const SIZE = {
  gameW: 150,
  gameH: 46,
  sourceW: 180,
  sourceH: 46,
  cardW: 150,
  cardH: 140,
  priceW: 222,
  priceH: 34,
};
const ROW_TOP = 70;
const ROW_STEP = 64;
const PRICE_TOP = 44;
const PRICE_STEP = 42;

function curve(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function CardTreeDiagram({ tree }: { tree: CardTree }) {
  const [focus, setFocus] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges, height } = useMemo(() => buildGraph(tree), [tree]);
  const nodeById = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const active = useMemo(
    () => computeActive(hover ?? focus, tree, nodes),
    [hover, focus, tree, nodes],
  );

  const selected = focus ? nodeById.get(focus) : null;

  const isNodeOn = (id: string) => !active || active.nodes.has(id);
  const isEdgeOn = (id: string) => !active || active.edges.has(id);

  return (
    <div className={styles.wrap}>
      <div className={styles.columns}>
        <span>Game</span>
        <span>Catalog provider</span>
        <span>Unified card</span>
        <span>Price fallback</span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className={styles.canvas}
        role="img"
        aria-label="Interactive card data lineage diagram"
      >
        {/* edges first so nodes paint on top */}
        <g className={styles.edges}>
          {edges.map((e) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const [x1, y1] = anchor(a, "right");
            const [x2, y2] = anchor(b, "left");
            const on = isEdgeOn(e.id);
            return (
              <path
                key={e.id}
                d={
                  e.kind === "price"
                    ? curve(...chainAnchors(a, b))
                    : curve(x1, y1, x2, y2)
                }
                className={[
                  styles.edge,
                  styles[`edge--${e.kind}`],
                  on ? styles.edgeOn : styles.edgeOff,
                ].join(" ")}
                fill="none"
              />
            );
          })}
        </g>

        <g>
          {nodes.map((n) => (
            <Node
              key={n.id}
              node={n}
              on={isNodeOn(n.id)}
              selected={focus === n.id}
              onClick={() => setFocus((f) => (f === n.id ? null : n.id))}
              onEnter={() => setHover(n.id)}
              onLeave={() => setHover(null)}
            />
          ))}
        </g>
      </svg>

      <Caption selected={selected} tree={tree} />
    </div>
  );
}

function Node({
  node,
  on,
  selected,
  onClick,
  onEnter,
  onLeave,
}: {
  node: DNode;
  on: boolean;
  selected: boolean;
  onClick: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const cls = [
    styles.node,
    styles[`node--${node.kind}`],
    on ? styles.nodeOn : styles.nodeOff,
    selected ? styles.nodeSelected : "",
  ].join(" ");
  return (
    <g
      className={cls}
      transform={`translate(${node.x} ${node.y})`}
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <rect width={node.w} height={node.h} rx={12} className={styles.nodeBox} />
      {node.kind === "price" && (
        <text x={16} y={node.h / 2 + 4} className={styles.nodeOrder}>
          {node.badge}
        </text>
      )}
      <text
        x={node.kind === "price" ? 36 : 14}
        y={node.sub ? node.h / 2 - 4 : node.h / 2 + 5}
        className={styles.nodeLabel}
      >
        {node.label}
      </text>
      {node.sub && (
        <text x={14} y={node.h / 2 + 14} className={styles.nodeSub}>
          {node.sub}
        </text>
      )}
      {node.configured !== undefined && (
        <circle
          cx={node.w - 14}
          cy={node.h / 2}
          r={4}
          className={node.configured ? styles.dotOn : styles.dotOff}
        />
      )}
      {node.kind === "source" && node.badge && (
        <text x={node.w - 12} y={node.h - 8} className={styles.nodeMeter}>
          {node.badge}
        </text>
      )}
    </g>
  );
}

function Caption({
  selected,
  tree,
}: {
  selected: DNode | null | undefined;
  tree: CardTree;
}) {
  if (!selected) {
    return (
      <p className={styles.caption}>
        Hover or click any node to trace its lineage — a game routes to one
        catalog provider for identity, then every card resolves its price down
        the shared fallback chain.
      </p>
    );
  }
  let detail = "";
  if (selected.kind === "game") {
    const g = tree.games.find((x) => `game:${x.tcg}` === selected.id);
    detail = g
      ? `${g.label} cards get their name, set, art & rarity from ${g.catalog_label}; price = ${g.price}.`
      : "";
  } else if (selected.kind === "source") {
    const s = tree.catalog_sources.find((x) => `source:${x.id}` === selected.id);
    detail = s
      ? `${s.label} feeds ${s.games.join(", ")} — provides ${s.provides.join(", ")}. ${
          s.embedded_price ? "Carries its own price." : "No price; uses the chain."
        }`
      : "";
  } else if (selected.kind === "card") {
    detail =
      "The unified Card/Set trunk — every provider normalizes into this one shape, and the price chain fills its pricing_summary.";
  } else if (selected.kind === "price") {
    const p = tree.price_chain.find((x) => `price:${x.id}` === selected.id);
    detail = p
      ? `Price source #${p.order} — ${p.configured ? "live (configured)" : "off (no key)"}. The first source with a price wins.`
      : "";
  }
  return (
    <p className={styles.caption}>
      <strong>{selected.label}</strong> {detail}
    </p>
  );
}

// ---- geometry helpers ----
function anchor(n: DNode, side: "left" | "right"): [number, number] {
  const y = n.y + n.h / 2;
  return side === "left" ? [n.x, y] : [n.x + n.w, y];
}
function chainAnchors(a: DNode, b: DNode): [number, number, number, number] {
  // connect consecutive price nodes along their left edge
  return [a.x + 18, a.y + a.h, b.x + 18, b.y];
}

// ---- build the node/edge graph from the payload ----
function buildGraph(tree: CardTree): {
  nodes: DNode[];
  edges: DEdge[];
  height: number;
} {
  const nodes: DNode[] = [];
  const edges: DEdge[] = [];
  const budgetFor = (sourceId: string) =>
    tree.budgets?.find((b) => sourceId.includes(b.integration));

  tree.games.forEach((g, i) => {
    nodes.push({
      id: `game:${g.tcg}`,
      kind: "game",
      label: g.label,
      x: COL.game,
      y: ROW_TOP + i * ROW_STEP,
      w: SIZE.gameW,
      h: SIZE.gameH,
    });
  });

  tree.catalog_sources.forEach((s, i) => {
    const bud = budgetFor(s.id);
    nodes.push({
      id: `source:${s.id}`,
      kind: "source",
      label: s.label,
      sub: s.key_required ? "API key" : "no key",
      x: COL.source,
      y: ROW_TOP + i * ROW_STEP,
      w: SIZE.sourceW,
      h: SIZE.sourceH,
      badge: bud ? `${bud.used}/${bud.limit}` : undefined,
    });
  });

  // Unified card trunk — vertically centred against the game/source rows.
  const rowsBottom = ROW_TOP + (tree.games.length - 1) * ROW_STEP + SIZE.gameH;
  const centerY = (ROW_TOP + rowsBottom) / 2;
  nodes.push({
    id: "card",
    kind: "card",
    label: tree.card_model.name,
    sub: "unified trunk",
    x: COL.card,
    y: centerY - SIZE.cardH / 2,
    w: SIZE.cardW,
    h: SIZE.cardH,
  });

  tree.price_chain.forEach((p, i) => {
    nodes.push({
      id: `price:${p.id}`,
      kind: "price",
      label: p.id,
      x: COL.price,
      y: PRICE_TOP + i * PRICE_STEP,
      w: SIZE.priceW,
      h: SIZE.priceH,
      configured: p.configured,
      badge: String(p.order),
    });
  });

  // edges: game → its source
  tree.games.forEach((g) =>
    edges.push({
      id: `game:${g.tcg}->source:${g.catalog_source}`,
      from: `game:${g.tcg}`,
      to: `source:${g.catalog_source}`,
      kind: "game",
    }),
  );
  // edges: each source → card
  tree.catalog_sources.forEach((s) =>
    edges.push({
      id: `source:${s.id}->card`,
      from: `source:${s.id}`,
      to: "card",
      kind: "source",
    }),
  );
  // edge: card → first price source
  if (tree.price_chain[0]) {
    edges.push({
      id: `card->price:${tree.price_chain[0].id}`,
      from: "card",
      to: `price:${tree.price_chain[0].id}`,
      kind: "card",
    });
  }
  // edges: ordered price chain
  for (let i = 0; i < tree.price_chain.length - 1; i++) {
    const a = tree.price_chain[i];
    const b = tree.price_chain[i + 1];
    if (!a || !b) continue;
    edges.push({
      id: `price:${a.id}->price:${b.id}`,
      from: `price:${a.id}`,
      to: `price:${b.id}`,
      kind: "price",
    });
  }

  const priceBottom =
    PRICE_TOP + (tree.price_chain.length - 1) * PRICE_STEP + SIZE.priceH;
  const height = Math.max(rowsBottom, priceBottom) + 24;
  return { nodes, edges, height };
}

// ---- highlight model: which nodes/edges light up for a focused node ----
function computeActive(
  focusId: string | null,
  tree: CardTree,
  nodes: DNode[],
): { nodes: Set<string>; edges: Set<string> } | null {
  if (!focusId) return null;
  const N = new Set<string>();
  const E = new Set<string>();
  const priceIds = tree.price_chain.map((p) => `price:${p.id}`);

  const addChain = () => {
    N.add("card");
    priceIds.forEach((p) => N.add(p));
    if (priceIds[0]) E.add(`card->${priceIds[0]}`);
    for (let i = 0; i < priceIds.length - 1; i++) {
      E.add(`${priceIds[i]}->${priceIds[i + 1]}`);
    }
  };

  if (focusId.startsWith("game:")) {
    const tcg = focusId.slice("game:".length);
    const g = tree.games.find((x) => x.tcg === tcg);
    if (g) {
      N.add(focusId);
      N.add(`source:${g.catalog_source}`);
      E.add(`game:${tcg}->source:${g.catalog_source}`);
      E.add(`source:${g.catalog_source}->card`);
      addChain();
    }
  } else if (focusId.startsWith("source:")) {
    const sid = focusId.slice("source:".length);
    const s = tree.catalog_sources.find((x) => x.id === sid);
    if (s) {
      N.add(focusId);
      s.game_keys.forEach((gk) => {
        N.add(`game:${gk}`);
        E.add(`game:${gk}->source:${sid}`);
      });
      E.add(`source:${sid}->card`);
      addChain();
    }
  } else if (focusId === "card") {
    nodes.forEach((n) => N.add(n.id));
    tree.games.forEach((g) => {
      E.add(`game:${g.tcg}->source:${g.catalog_source}`);
    });
    tree.catalog_sources.forEach((s) => E.add(`source:${s.id}->card`));
    addChain();
  } else if (focusId.startsWith("price:")) {
    addChain();
  }
  return { nodes: N, edges: E };
}
