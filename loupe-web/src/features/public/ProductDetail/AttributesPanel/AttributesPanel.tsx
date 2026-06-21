import { useCardAttributes } from "@loupe/core";
import { Panel } from "@/components";
import styles from "./AttributesPanel.module.scss";

const TCG_LABEL: Record<string, string> = {
  pokemon: "Pokédex",
  magic: "Oracle",
  yugioh: "Card text",
  lorcana: "Card stats",
  onepiece: "Card stats",
};

function label(key: string): string {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Per-game attributes — the canonical Pokédex / MTG oracle / YGO stats block.
 * Driven by `/v1/cards/{id}/canonical`; renders nothing for cards without
 * registered attributes (mirrors the mobile CardAttributesPanel registry, but
 * as one adaptive panel).
 */
export function AttributesPanel({ cardId }: { cardId: string }) {
  const { data: attrs } = useCardAttributes(cardId);
  if (!attrs) return null;

  // Headline stat rows (known fields first, then any extra primitives).
  const rows: Array<[string, string]> = [];
  if (attrs.hp != null) rows.push(["HP", String(attrs.hp)]);
  if (attrs.manaCost) rows.push(["Mana cost", attrs.manaCost]);
  if (attrs.typeLine) rows.push(["Type", attrs.typeLine]);
  for (const [k, v] of Object.entries(attrs.extra)) rows.push([label(k), v]);

  const hasTypes = (attrs.types?.length ?? 0) > 0;
  if (!hasTypes && rows.length === 0 && !attrs.oracleText) return null;

  const heading = TCG_LABEL[attrs.tcg] ?? "Card stats";

  return (
    <section className={styles.attrs}>
      <h2 className={styles.attrs__title}>{heading}</h2>
      <Panel padding="lg" className={styles.attrs__panel}>
        {hasTypes && (
          <div className={styles.attrs__types}>
            {attrs.types!.map((t) => (
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
        {attrs.oracleText && <p className={styles.attrs__prose}>{attrs.oracleText}</p>}
      </Panel>
    </section>
  );
}
