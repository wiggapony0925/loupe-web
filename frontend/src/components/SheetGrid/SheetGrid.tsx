/**
 * SheetGrid — the excel-styled view of combined accounts. Sticky header,
 * click-to-sort columns, zebra rows, tabular numerals, and a totals footer.
 * Wide by design: the grid scrolls horizontally inside its own container.
 * Tapping a row you're allowed to edit opens the same TagSheet as the feed.
 */
import { useMemo, useState } from 'react';
import { money } from '@/lib/format';
import { useHaptics } from '@/hooks/useHaptics';
import type { SheetRow } from '@/types/types';

type SortKey = 'date' | 'merchant' | 'account' | 'accountOwner' | 'amountCents' | 'splitType';

const COLUMNS: Array<{ key: SortKey | 'labels' | 'circle'; label: string; sortable: boolean }> = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'merchant', label: 'Merchant', sortable: true },
  { key: 'account', label: 'Account', sortable: true },
  { key: 'accountOwner', label: 'Cardholder', sortable: true },
  { key: 'splitType', label: 'Split', sortable: true },
  { key: 'circle', label: 'Circle', sortable: false },
  { key: 'labels', label: 'Labels', sortable: false },
  { key: 'amountCents', label: 'Amount', sortable: true },
];

export interface SheetGridProps {
  rows: SheetRow[];
  onRowPress: (row: SheetRow) => void;
}

export function SheetGrid({ rows, onRowPress }: SheetGridProps) {
  const haptics = useHaptics();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalCents = useMemo(() => rows.reduce((sum, row) => sum + row.amountCents, 0), [rows]);

  const toggleSort = (key: SortKey): void => {
    haptics.impactLight();
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'amountCents' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="sheet-grid">
      <div className="sheet-grid__scroll">
        <table className="sheet-grid__table">
          <thead>
            <tr className="sheet-grid__head-row">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`sheet-grid__head-cell${column.key === 'amountCents' ? ' sheet-grid__head-cell--number' : ''}`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      className="sheet-grid__sort"
                      onClick={() => toggleSort(column.key as SortKey)}
                    >
                      {column.label}
                      {sortKey === column.key ? (
                        <span className="sheet-grid__sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      ) : null}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.id} className="sheet-grid__row" onClick={() => onRowPress(row)}>
                <td className="sheet-grid__cell sheet-grid__cell--nowrap">{row.date}</td>
                <td className="sheet-grid__cell sheet-grid__cell--strong">{row.merchant}</td>
                <td className="sheet-grid__cell">{row.account}</td>
                <td className="sheet-grid__cell">{row.accountOwner}</td>
                <td className="sheet-grid__cell">
                  {row.status === 'REQUIRES_TAGGING' ? (
                    <span className="badge badge--alert">NEEDS TAG</span>
                  ) : (
                    row.splitType ?? '—'
                  )}
                </td>
                <td className="sheet-grid__cell">{row.circle ?? '—'}</td>
                <td className="sheet-grid__cell">{row.labels.join(', ') || '—'}</td>
                <td
                  className={`sheet-grid__cell sheet-grid__cell--number${row.amountCents < 0 ? ' sheet-grid__cell--credit' : ''}`}
                >
                  {row.amountCents < 0 ? `+${money(-row.amountCents)}` : money(row.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="sheet-grid__total-row">
              <td className="sheet-grid__cell sheet-grid__cell--strong" colSpan={COLUMNS.length - 1}>
                TOTAL · {rows.length} transactions
              </td>
              <td className="sheet-grid__cell sheet-grid__cell--number sheet-grid__cell--strong">
                {money(totalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
