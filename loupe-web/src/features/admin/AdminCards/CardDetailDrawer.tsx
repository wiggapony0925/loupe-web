import { useState } from "react";
import { Link2, Tag, Plus } from "lucide-react";
import { useAdminCard, useAddCardPriceOverride } from "@loupe/core";
import { Modal, Skeleton, Button, Badge } from "@/components";
import { notify } from "@/stores/noticeStore";
import styles from "./AdminCards.module.scss";

interface Props {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HOUSES = ["loupe", "psa", "cgc", "bgs", "sgc", "tag"] as const;

function dt(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString() : "—";
}

/** Full card record + a super-admin manual price override. */
export function CardDetailDrawer({ cardId, open, onOpenChange }: Props) {
  const { data: c, isLoading } = useAdminCard(cardId, open && Boolean(cardId));
  const addPrice = useAddCardPriceOverride();
  const [form, setForm] = useState({ house: "loupe", grade: "10", price: "" });

  const submit = () => {
    if (!c) return;
    const grade = Number(form.grade);
    const priceUsd = Number(form.price);
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
      notify.error("Enter a price greater than 0.");
      return;
    }
    addPrice.mutate(
      { id: c.id, input: { house: form.house, grade, priceUsd } },
      {
        onSuccess: () => {
          notify.success(`Recorded $${priceUsd.toFixed(2)} for ${c.name}.`);
          setForm((f) => ({ ...f, price: "" }));
        },
        onError: (e) => notify.error(e?.message || "Couldn't save — super-admin only."),
      },
    );
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={c?.name}
      description={c ? [c.setName, c.number && `#${c.number}`].filter(Boolean).join(" · ") : undefined}
      footer={
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      {isLoading || !c ? (
        <Skeleton height={300} radius={12} />
      ) : (
        <div className={styles.detail}>
          <div className={styles.detail__head}>
            {c.imageUrl && <img className={styles.detail__img} src={c.imageUrl} alt="" />}
            <div className={styles.badges}>
              <Badge tone="neutral">{c.tcg}</Badge>
              {c.rarity && <Badge tone="blue">{c.rarity}</Badge>}
              {c.year && <Badge tone="neutral">{c.year}</Badge>}
              {c.imagePhash && <Badge tone="mint">pHash ✓</Badge>}
            </div>
          </div>

          {/* Provider refs */}
          <section>
            <h3 className={styles.detail__label}>Provider references</h3>
            {c.externalRefs.length === 0 ? (
              <p className={styles.empty}>No external references.</p>
            ) : (
              <div className={styles.refs}>
                {c.externalRefs.map((r, i) => (
                  <div key={i} className={styles.ref}>
                    <Link2 size={12} />
                    <span className={styles.ref__src}>{r.source}</span>
                    <code>{r.externalId}</code>
                    {r.confidence != null && <span className={styles.ref__conf}>{(r.confidence * 100).toFixed(0)}%</span>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Price ladder */}
          <section>
            <h3 className={styles.detail__label}>Price ladder</h3>
            {c.prices.length === 0 ? (
              <p className={styles.empty}>No price snapshots yet.</p>
            ) : (
              <table className={styles.prices}>
                <thead>
                  <tr><th>House</th><th>Grade</th><th>Source</th><th>Price</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {c.prices.map((p) => (
                    <tr key={p.id} data-manual={p.source === "manual" || undefined}>
                      <td>{p.house.toUpperCase()}</td>
                      <td>{p.grade}</td>
                      <td>{p.source}</td>
                      <td className={styles.price}>${p.priceUsd.toFixed(2)}</td>
                      <td>{dt(p.saleDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Manual override (super-admin) */}
          <section className={styles.override}>
            <h3 className={styles.detail__label}>
              <Tag size={13} /> Manual price override
            </h3>
            <div className={styles.overrideForm}>
              <select value={form.house} onChange={(e) => setForm((f) => ({ ...f, house: e.target.value }))}>
                {HOUSES.map((h) => (
                  <option key={h} value={h}>{h.toUpperCase()}</option>
                ))}
              </select>
              <input
                type="number" min="0" max="10" step="0.5"
                value={form.grade}
                onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
                aria-label="Grade"
              />
              <input
                type="number" min="0" step="0.01" placeholder="Price USD"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                aria-label="Price USD"
              />
              <Button size="sm" leadingIcon={<Plus size={14} />} disabled={addPrice.isPending} onClick={submit}>
                {addPrice.isPending ? "Saving…" : "Record"}
              </Button>
            </div>
            <p className={styles.overrideHint}>
              Adds a <code>manual</code> snapshot to the ladder. Super-admin only; audited.
            </p>
          </section>
        </div>
      )}
    </Modal>
  );
}
