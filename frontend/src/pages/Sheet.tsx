/**
 * Sheet — the excel-styled combined view. Pick any mix of YOUR accounts and
 * shared circles (business + personal + Nicol's shared spending in one
 * grid), filter by label and date, then export: .xlsx, .csv, a PDF
 * statement, or a real Google Sheet shared to your email.
 */
import { useEffect, useMemo, useState } from 'react';
import { SheetGrid } from '@/components/SheetGrid/SheetGrid';
import { TagSheet } from '@/components/TagSheet/TagSheet';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { useLedgerStore, sheetQuery } from '@/store/useLedgerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { openExternal } from '@/native/browser';
import { apiDownload, apiFetch, ApiError } from '@/lib/api';
import { GoogleSheetExportSchema } from '@/types/schemas';
import type { SheetRow, Transaction } from '@/types/types';

const MONTH_PRESETS = [
  { key: 'this', label: 'This month' },
  { key: 'last', label: 'Last month' },
  { key: 'all', label: 'All time' },
] as const;

function monthRange(which: 'this' | 'last' | 'all'): { from: string | null; to: string | null } {
  if (which === 'all') return { from: null, to: null };
  const now = new Date();
  const shift = which === 'last' ? -1 : 0;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + shift + 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}

export function Sheet() {
  const haptics = useHaptics();
  const accounts = useLedgerStore((s) => s.accounts);
  const circles = useLedgerStore((s) => s.circles);
  const labels = useLedgerStore((s) => s.labels);
  const rows = useLedgerStore((s) => s.sheetRows);
  const loading = useLedgerStore((s) => s.sheetLoading);
  const filter = useLedgerStore((s) => s.sheetFilter);
  const setFilter = useLedgerStore((s) => s.setSheetFilter);
  const loadSheet = useLedgerStore((s) => s.loadSheet);
  const fetchTransaction = useLedgerStore((s) => s.fetchTransaction);

  const [selected, setSelected] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadSheet();
    // Refetch whenever the filter changes — the grid IS the query.
  }, [loadSheet, filter]);

  const toggle = (key: 'accountIds' | 'circleIds' | 'labelIds', id: string): void => {
    haptics.impactLight();
    const current = filter[key];
    setFilter({
      [key]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    });
  };

  const activePreset = useMemo(() => {
    for (const preset of MONTH_PRESETS) {
      const range = monthRange(preset.key);
      if (range.from === filter.from && range.to === filter.to) return preset.key;
    }
    return null;
  }, [filter.from, filter.to]);

  const runExport = async (kind: 'xlsx' | 'csv' | 'pdf' | 'google'): Promise<void> => {
    haptics.impactLight();
    setExporting(kind);
    setError(null);
    setSheetUrl(null);
    const query = sheetQuery(filter);
    try {
      if (kind === 'xlsx') {
        await apiDownload('/v1/exports/xlsx', query, 'trackify-export.xlsx');
      } else if (kind === 'csv') {
        await apiDownload('/v1/exports/csv', query, 'trackify-export.csv');
      } else if (kind === 'pdf') {
        await apiDownload('/v1/exports/statement.pdf', query, 'trackify-statement.pdf');
      } else {
        const { data } = await apiFetch('/v1/exports/google-sheet', {
          method: 'POST',
          body: { filter: query },
          schema: GoogleSheetExportSchema,
        });
        setSheetUrl(data.url);
      }
      haptics.success();
    } catch (err) {
      haptics.warning();
      setError(err instanceof ApiError ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const openRow = (row: SheetRow): void => {
    void fetchTransaction(row.id).then((transaction) => {
      if (transaction) setSelected(transaction);
    });
  };

  return (
    <div className="page page--wide sheet-page">
      <header className="page__header">
        <h1 className="page__title">Sheet</h1>
        <span className="page__action">{loading ? 'Loading…' : `${rows.length} rows`}</span>
      </header>

      <div className="sheet-page__filters">
        <div className="chip-row">
          {MONTH_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`chip${activePreset === preset.key ? ' chip--active' : ''}`}
              onClick={() => {
                haptics.impactLight();
                setFilter(monthRange(preset.key));
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {accounts.length > 0 ? (
          <div className="chip-row">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={`chip${filter.accountIds.includes(account.id) ? ' chip--active' : ''}`}
                onClick={() => toggle('accountIds', account.id)}
              >
                {account.name}
                {account.mask ? ` ••${account.mask}` : ''}
              </button>
            ))}
          </div>
        ) : null}
        {circles.length > 0 ? (
          <div className="chip-row">
            {circles.map((circle) => (
              <button
                key={circle.id}
                type="button"
                className={`chip${filter.circleIds.includes(circle.id) ? ' chip--active' : ''}`}
                onClick={() => toggle('circleIds', circle.id)}
              >
                ⊙ {circle.name}
              </button>
            ))}
          </div>
        ) : null}
        {labels.length > 0 ? (
          <div className="chip-row">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                className={`chip${filter.labelIds.includes(label.id) ? ' chip--active' : ''}`}
                onClick={() => toggle('labelIds', label.id)}
              >
                # {label.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {rows.length === 0 && !loading ? (
        <EmptyState title="Nothing to show" body="Adjust the filters, or link an account first." />
      ) : (
        <SheetGrid rows={rows} onRowPress={openRow} />
      )}

      <div className="sheet-page__exports">
        {(
          [
            ['xlsx', 'Excel (.xlsx)'],
            ['csv', 'CSV'],
            ['pdf', 'PDF statement'],
            ['google', 'Google Sheet'],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            className={`button button--ghost${exporting !== null ? ' button--disabled' : ''}`}
            disabled={exporting !== null}
            onClick={() => void runExport(kind)}
          >
            {exporting === kind ? 'Exporting…' : label}
          </button>
        ))}
      </div>
      {sheetUrl ? (
        <p className="notice">
          Google Sheet created —{' '}
          {/* Browser bridge: SFSafariViewController/Custom Tabs on device. */}
          <a
            className="sheet-page__sheet-link"
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              event.preventDefault();
              void openExternal(sheetUrl);
            }}
          >
            open it
          </a>
          .
        </p>
      ) : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <TagSheet transaction={selected} open={selected !== null} onClose={() => setSelected(null)} />
    </div>
  );
}
