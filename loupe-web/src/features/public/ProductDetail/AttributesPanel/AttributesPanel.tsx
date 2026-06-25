import type { CSSProperties } from "react";
import { useCardAttributes, type CardAttributes } from "@loupe/core";
import { Panel } from "@/components";
import styles from "./AttributesPanel.module.scss";

const TCG_LABEL: Record<string, string> = {
  pokemon: "Pokédex",
  magic: "Oracle",
  yugioh: "Card text",
  lorcana: "Card stats",
  onepiece: "Card stats",
};

/** Energy-type accent colors for Pokémon attack / retreat costs (subtle tints). */
const ENERGY_COLOR: Record<string, string> = {
  Fire: "#f0803c",
  Water: "#5a9ee6",
  Grass: "#5fbf73",
  Lightning: "#f2c84b",
  Psychic: "#b06fd6",
  Fighting: "#d9743f",
  Darkness: "#5a6072",
  Metal: "#9aa3b0",
  Fairy: "#ee8fc4",
  Dragon: "#c9a23a",
  Colorless: "#c9cdd6",
};

function label(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Small colored chip for one energy type in an attack / retreat cost. */
function Energy({ type }: { type: string }) {
  const color = ENERGY_COLOR[type] ?? "var(--ink-dim)";
  return (
    <span
      className={styles.energy}
      style={{ "--energy": color } as CSSProperties}
      title={type}
    >
      {type.slice(0, 1)}
    </span>
  );
}

function Modifiers({
  label: lbl,
  rows,
}: {
  label: string;
  rows: CardAttributes["weaknesses"];
}) {
  if (!rows?.length) return null;
  return (
    <div className={styles.mod}>
      <span className={styles.mod__label}>{lbl}</span>
      <span className={styles.mod__val}>
        {rows.map((r) => `${r.type}${r.value ? ` ${r.value}` : ""}`).join(", ")}
      </span>
    </div>
  );
}

/**
 * Per-game attributes — Pokédex stats + attacks/abilities (Pokémon), MTG oracle,
 * YGO text. Driven by `useCardAttributes` (the basic card endpoint, whose
 * `attributes` block carries the full structured data). Renders nothing for
 * cards with no registered attributes.
 */
export function AttributesPanel({ cardId }: { cardId: string }) {
  const { data: a } = useCardAttributes(cardId);
  if (!a) return null;

  const heading = TCG_LABEL[a.tcg] ?? "Card stats";
  const types = a.types ?? [];
  const stage = a.subtypes?.join(" · ");

  // Non-Pokémon headline fields + any leftover primitives → a definition list.
  const rows: Array<[string, string]> = [];
  if (a.tcg !== "pokemon") {
    if (a.hp != null) rows.push(["HP", String(a.hp)]);
    if (a.manaCost) rows.push(["Mana cost", a.manaCost]);
    if (a.typeLine) rows.push(["Type", a.typeLine]);
  }
  for (const [k, v] of Object.entries(a.extra)) rows.push([label(k), v]);

  const hasCombat =
    (a.attacks?.length ?? 0) > 0 ||
    (a.abilities?.length ?? 0) > 0 ||
    (a.weaknesses?.length ?? 0) > 0 ||
    (a.resistances?.length ?? 0) > 0 ||
    (a.retreatCost?.length ?? 0) > 0;
  if (
    types.length === 0 &&
    !hasCombat &&
    rows.length === 0 &&
    !a.oracleText &&
    !a.flavorText
  )
    return null;

  const showMeta = a.hp != null || !!stage || types.length > 0 || !!a.evolvesFrom;

  return (
    <section className={styles.attrs}>
      <h2 className={styles.attrs__title}>{heading}</h2>
      <Panel padding="lg" className={styles.attrs__panel}>
        {/* Headline meta: HP · stage · evolves-from · types (Pokémon) */}
        {a.tcg === "pokemon" && showMeta && (
          <div className={styles.meta}>
            {a.hp != null && (
              <span className={styles.hp}>
                {a.hp} <span className={styles.hp__unit}>HP</span>
              </span>
            )}
            {stage && <span className={styles.metaChip}>{stage}</span>}
            {a.evolvesFrom && (
              <span className={styles.metaChip}>Evolves from {a.evolvesFrom}</span>
            )}
            <span className={styles.metaSpacer} />
            {types.map((t) => (
              <span key={t} className={styles.type}>
                {t}
              </span>
            ))}
          </div>
        )}

        {/* Abilities */}
        {a.abilities?.map((ab) => (
          <div key={ab.name} className={styles.move}>
            <div className={styles.move__head}>
              {ab.type && <span className={styles.move__tag}>{ab.type}</span>}
              <span className={styles.move__name}>{ab.name}</span>
            </div>
            {ab.text && <p className={styles.move__text}>{ab.text}</p>}
          </div>
        ))}

        {/* Attacks */}
        {a.attacks?.map((atk, i) => (
          <div key={`${atk.name}-${i}`} className={styles.move}>
            <div className={styles.move__head}>
              {atk.cost && atk.cost.length > 0 && (
                <span className={styles.cost}>
                  {atk.cost.map((c, j) => (
                    <Energy key={j} type={c} />
                  ))}
                </span>
              )}
              <span className={styles.move__name}>{atk.name}</span>
              {atk.damage && <span className={styles.move__damage}>{atk.damage}</span>}
            </div>
            {atk.text && <p className={styles.move__text}>{atk.text}</p>}
          </div>
        ))}

        {/* Weakness / resistance / retreat */}
        {((a.weaknesses?.length ?? 0) > 0 ||
          (a.resistances?.length ?? 0) > 0 ||
          (a.retreatCost?.length ?? 0) > 0) && (
          <div className={styles.mods}>
            <Modifiers label="Weakness" rows={a.weaknesses} />
            <Modifiers label="Resistance" rows={a.resistances} />
            {a.retreatCost && a.retreatCost.length > 0 && (
              <div className={styles.mod}>
                <span className={styles.mod__label}>Retreat</span>
                <span className={styles.cost}>
                  {a.retreatCost.map((c, j) => (
                    <Energy key={j} type={c} />
                  ))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Non-Pokémon: types pills + definition list + oracle text */}
        {a.tcg !== "pokemon" && types.length > 0 && (
          <div className={styles.attrs__types}>
            {types.map((t) => (
              <span key={t} className={styles.type}>
                {t}
              </span>
            ))}
          </div>
        )}
        {rows.length > 0 && (
          <dl className={styles.attrs__grid}>
            {rows.map(([k, v]) => (
              <div key={k} className={styles.attrs__row}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {a.oracleText && <p className={styles.attrs__prose}>{a.oracleText}</p>}

        {/* Footer: flavor + artist */}
        {(a.flavorText || a.artist) && (
          <div className={styles.footer}>
            {a.flavorText && <p className={styles.flavor}>{a.flavorText}</p>}
            {a.artist && <p className={styles.artist}>Illustrated by {a.artist}</p>}
          </div>
        )}
      </Panel>
    </section>
  );
}
