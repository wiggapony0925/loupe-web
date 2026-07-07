/**
 * CurrencySwitcher — the dashboard's display-currency control.
 *
 * A compact pill (flag · code · chevron) opening a popover of every
 * supported currency. Selection flows through `useDisplayCurrency`, which
 * PATCHes the profile — so a switch made here appears on mobile within a
 * refresh, and vice-versa. Conversion itself uses the backend FX table
 * (`/v1/market/fx/rates`), the same one mobile renders with.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { CURRENCIES } from "@/lib/currency";
import { useDisplayCurrency } from "@/providers/DisplayCurrencyProvider";
import styles from "./CurrencySwitcher.module.scss";

export function CurrencySwitcher() {
  const { code, meta, setCurrency } = useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const fiat = CURRENCIES.filter((c) => c.kind === "fiat");
  const crypto = CURRENCIES.filter((c) => c.kind === "crypto");

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Display currency ${code}. Change currency.`}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden>{meta.flag}</span>
        <span className={styles.code}>{code}</span>
        <ChevronDown size={13} className={styles.chev} />
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label="Display currency">
          <p className={styles.group}>Fiat</p>
          {fiat.map((c) => (
            <MenuRow
              key={c.code}
              flag={c.flag}
              code={c.code}
              name={c.name}
              active={c.code === code}
              onPick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
            />
          ))}
          <p className={styles.group}>Crypto</p>
          {crypto.map((c) => (
            <MenuRow
              key={c.code}
              flag={c.flag}
              code={c.code}
              name={c.name}
              active={c.code === code}
              onPick={() => {
                setCurrency(c.code);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  flag,
  code,
  name,
  active,
  onPick,
}: {
  flag: string;
  code: string;
  name: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      className={active ? `${styles.row} ${styles.rowActive}` : styles.row}
      onClick={onPick}
    >
      <span className={styles.flag} aria-hidden>
        {flag}
      </span>
      <span className={styles.rowCode}>{code}</span>
      <span className={styles.rowName}>{name}</span>
      {active && <Check size={14} className={styles.check} />}
    </button>
  );
}
