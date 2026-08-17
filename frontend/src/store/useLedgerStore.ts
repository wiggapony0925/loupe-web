/**
 * Global app state (Zustand). One store, sliced by domain: session, feed,
 * accounts, circles + ledgers, net worth, labels, sheet.
 *
 * Server data is cached here and refreshed by actions; only the sheet filter
 * is persisted (localStorage) — user/financial data never touches disk on
 * the client. Tagging is optimistic: the row updates instantly (the bottom
 * sheet closes on the spot), and a failed PATCH rolls it back.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { apiFetch } from '@/lib/api';
import { pushWidgetData } from '@/native/widget';
import {
  AccountSchema,
  CircleSchema,
  InstitutionSchema,
  LabelSchema,
  LedgerSchema,
  LinkTokenSchema,
  NetWorthHistorySchema,
  NetWorthSummarySchema,
  RecurringSummarySchema,
  SheetRowSchema,
  TransactionSchema,
  UserSchema,
} from '@/types/schemas';
import type {
  Account,
  Circle,
  Institution,
  Label,
  Ledger,
  NetWorthHistory,
  NetWorthRange,
  NetWorthSummary,
  RecurringSummary,
  SheetRow,
  SplitType,
  Transaction,
  User,
} from '@/types/types';

export interface SheetFilter {
  accountIds: string[];
  circleIds: string[];
  labelIds: string[];
  from: string | null; // YYYY-MM-DD
  to: string | null;
}

export interface TagInput {
  splitType: SplitType | null;
  circleId?: string | null;
  taggedOwnerId?: string | null;
  notes?: string | null;
}

interface LedgerStore {
  // session
  me: User | null;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;
  bootstrap: () => Promise<void>;
  clearSession: () => void;

  // feed
  feed: Transaction[];
  feedCursor: string | null;
  feedLoading: boolean;
  loadFeed: (reset?: boolean) => Promise<void>;
  tagTransaction: (transactionId: string, tag: TagInput) => Promise<void>;
  setTransactionLabels: (transactionId: string, labelIds: string[]) => Promise<void>;
  transactionById: (transactionId: string) => Transaction | undefined;
  fetchTransaction: (transactionId: string) => Promise<Transaction | null>;

  // accounts
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  createLinkToken: () => Promise<string>;
  exchangePublicToken: (publicToken: string) => Promise<void>;
  syncAccount: (accountId: string) => Promise<void>;

  // circles + ledgers
  circles: Circle[];
  ledgers: Record<string, Ledger>;
  loadCircles: () => Promise<void>;
  createCircle: (name: string) => Promise<Circle>;
  joinCircle: (inviteCode: string) => Promise<Circle>;
  loadLedger: (circleId: string) => Promise<void>;
  recordSettlement: (circleId: string, fromUserId: string, toUserId: string) => Promise<void>;
  confirmSettlement: (circleId: string, settlementId: string) => Promise<void>;

  // net worth
  netWorth: NetWorthSummary | null;
  netWorthHistory: NetWorthHistory | null;
  netWorthRange: NetWorthRange;
  loadNetWorth: (range?: NetWorthRange) => Promise<void>;

  // labels
  labels: Label[];
  loadLabels: () => Promise<void>;
  createLabel: (name: string) => Promise<Label>;

  // recurring (subscription manager)
  recurring: RecurringSummary | null;
  loadRecurring: () => Promise<void>;

  // institution directory
  institutions: Institution[];
  institutionsLoading: boolean;
  searchInstitutions: (query: string) => Promise<void>;

  // sheet
  sheetRows: SheetRow[];
  sheetLoading: boolean;
  sheetFilter: SheetFilter;
  setSheetFilter: (partial: Partial<SheetFilter>) => void;
  loadSheet: () => Promise<void>;
}

const EMPTY_FILTER: SheetFilter = { accountIds: [], circleIds: [], labelIds: [], from: null, to: null };

/** Mirrors current state into the iOS home/lock-screen widget (no-op elsewhere). */
function syncWidget(state: Pick<LedgerStore, 'netWorth' | 'netWorthHistory' | 'feed'>): void {
  if (!state.netWorth) return;
  const points = state.netWorthHistory?.points ?? [];
  const stride = Math.max(1, Math.ceil(points.length / 24));
  const sparkline = points.filter((_, i) => i % stride === 0).map((p) => p.netWorthCents);
  const first = points[0]?.netWorthCents;
  void pushWidgetData({
    netWorthCents: state.netWorth.netWorthCents,
    deltaCents: first === undefined ? null : state.netWorth.netWorthCents - first,
    sparkline,
    needsTaggingCount: state.feed.filter((t) => t.status === 'REQUIRES_TAGGING').length,
    updatedAt: new Date().toISOString(),
  });
}

function sheetQuery(filter: SheetFilter): Record<string, string | undefined> {
  return {
    accountIds: filter.accountIds.length ? filter.accountIds.join(',') : undefined,
    circleIds: filter.circleIds.length ? filter.circleIds.join(',') : undefined,
    labelIds: filter.labelIds.length ? filter.labelIds.join(',') : undefined,
    from: filter.from ?? undefined,
    to: filter.to ?? undefined,
  };
}

export const useLedgerStore = create<LedgerStore>()(
  persist(
    (set, get) => ({
      // ── session ────────────────────────────────────────────────────────
      me: null,
      authReady: false,
      setAuthReady: (ready) => set({ authReady: ready }),

      bootstrap: async () => {
        const { data: me } = await apiFetch('/v1/users/me', { schema: UserSchema });
        set({ me });
        // Fire the rest in parallel — none depends on another.
        await Promise.allSettled([
          get().loadAccounts(),
          get().loadCircles(),
          get().loadNetWorth(),
          get().loadLabels(),
          get().loadFeed(true),
          get().loadRecurring(),
        ]);
      },

      clearSession: () =>
        set({
          me: null,
          feed: [],
          feedCursor: null,
          accounts: [],
          circles: [],
          ledgers: {},
          netWorth: null,
          netWorthHistory: null,
          labels: [],
          sheetRows: [],
          recurring: null,
          institutions: [],
        }),

      // ── feed ───────────────────────────────────────────────────────────
      feed: [],
      feedCursor: null,
      feedLoading: false,

      loadFeed: async (reset = false) => {
        if (get().feedLoading) return;
        set({ feedLoading: true });
        try {
          const cursor = reset ? undefined : get().feedCursor ?? undefined;
          const { data, meta } = await apiFetch('/v1/transactions', {
            query: { limit: 50, cursor },
            schema: z.array(TransactionSchema),
          });
          set({
            feed: reset ? data : [...get().feed, ...data],
            feedCursor: (meta?.nextCursor as string | null) ?? null,
          });
          syncWidget(get());
        } finally {
          set({ feedLoading: false });
        }
      },

      tagTransaction: async (transactionId, tag) => {
        const previous = get().feed;
        // Optimistic: the sheet closes and the row re-renders immediately.
        set({
          feed: previous.map((t) =>
            t.id === transactionId
              ? {
                  ...t,
                  splitType: tag.splitType,
                  status: t.status === 'REQUIRES_TAGGING' ? 'PENDING' : t.status,
                }
              : t,
          ),
        });
        try {
          const { data } = await apiFetch(`/v1/transactions/${transactionId}/tag`, {
            method: 'PATCH',
            body: tag,
            schema: TransactionSchema,
          });
          set({ feed: get().feed.map((t) => (t.id === transactionId ? data : t)) });
          // Tagging moves ledger balances — refresh the affected circle.
          if (data.circle) void get().loadLedger(data.circle.id).catch(() => undefined);
        } catch (error) {
          set({ feed: previous }); // roll back — the server said no
          throw error;
        }
      },

      setTransactionLabels: async (transactionId, labelIds) => {
        const { data } = await apiFetch(`/v1/transactions/${transactionId}/labels`, {
          method: 'PUT',
          body: { labelIds },
          schema: TransactionSchema,
        });
        set({ feed: get().feed.map((t) => (t.id === transactionId ? data : t)) });
      },

      transactionById: (transactionId) => get().feed.find((t) => t.id === transactionId),

      fetchTransaction: async (transactionId) => {
        try {
          const { data } = await apiFetch(`/v1/transactions/${transactionId}`, {
            schema: TransactionSchema,
          });
          if (!get().feed.some((t) => t.id === data.id)) {
            set({ feed: [data, ...get().feed] });
          }
          return data;
        } catch {
          return null;
        }
      },

      // ── accounts ───────────────────────────────────────────────────────
      accounts: [],

      loadAccounts: async () => {
        const { data } = await apiFetch('/v1/accounts', { schema: z.array(AccountSchema) });
        set({ accounts: data });
      },

      createLinkToken: async () => {
        const { data } = await apiFetch('/v1/accounts/link-token', {
          method: 'POST',
          schema: LinkTokenSchema,
        });
        return data.linkToken;
      },

      exchangePublicToken: async (publicToken) => {
        await apiFetch('/v1/accounts/exchange', { method: 'POST', body: { publicToken } });
        await Promise.allSettled([get().loadAccounts(), get().loadNetWorth()]);
      },

      syncAccount: async (accountId) => {
        await apiFetch(`/v1/accounts/${accountId}/sync`, { method: 'POST' });
        await Promise.allSettled([get().loadAccounts(), get().loadFeed(true), get().loadNetWorth()]);
      },

      // ── circles ────────────────────────────────────────────────────────
      circles: [],
      ledgers: {},

      loadCircles: async () => {
        const { data } = await apiFetch('/v1/circles', { schema: z.array(CircleSchema) });
        set({ circles: data });
      },

      createCircle: async (name) => {
        const { data } = await apiFetch('/v1/circles', {
          method: 'POST',
          body: { name },
          schema: CircleSchema,
        });
        set({ circles: [...get().circles, data] });
        return data;
      },

      joinCircle: async (inviteCode) => {
        const { data } = await apiFetch('/v1/circles/join', {
          method: 'POST',
          body: { inviteCode },
          schema: CircleSchema,
        });
        const others = get().circles.filter((c) => c.id !== data.id);
        set({ circles: [...others, data] });
        return data;
      },

      loadLedger: async (circleId) => {
        const { data } = await apiFetch(`/v1/circles/${circleId}/ledger`, { schema: LedgerSchema });
        set({ ledgers: { ...get().ledgers, [circleId]: data } });
      },

      recordSettlement: async (circleId, fromUserId, toUserId) => {
        await apiFetch(`/v1/circles/${circleId}/settlements`, {
          method: 'POST',
          body: { fromUserId, toUserId },
        });
        await get().loadLedger(circleId);
      },

      confirmSettlement: async (circleId, settlementId) => {
        await apiFetch(`/v1/circles/${circleId}/settlements/${settlementId}/confirm`, {
          method: 'POST',
        });
        await get().loadLedger(circleId);
      },

      // ── net worth ──────────────────────────────────────────────────────
      netWorth: null,
      netWorthHistory: null,
      netWorthRange: '3M',

      loadNetWorth: async (range) => {
        const nextRange = range ?? get().netWorthRange;
        set({ netWorthRange: nextRange });
        const [summary, history] = await Promise.allSettled([
          apiFetch('/v1/networth', { schema: NetWorthSummarySchema }),
          apiFetch('/v1/networth/history', {
            query: { range: nextRange },
            schema: NetWorthHistorySchema,
          }),
        ]);
        if (summary.status === 'fulfilled') set({ netWorth: summary.value.data });
        if (history.status === 'fulfilled') set({ netWorthHistory: history.value.data });
        syncWidget(get());
      },

      // ── labels ─────────────────────────────────────────────────────────
      labels: [],

      loadLabels: async () => {
        const { data } = await apiFetch('/v1/labels', { schema: z.array(LabelSchema) });
        set({ labels: data });
      },

      createLabel: async (name) => {
        const { data } = await apiFetch('/v1/labels', {
          method: 'POST',
          body: { name },
          schema: LabelSchema,
        });
        set({ labels: [...get().labels, data].sort((a, b) => a.name.localeCompare(b.name)) });
        return data;
      },

      // ── recurring ──────────────────────────────────────────────────────
      recurring: null,

      loadRecurring: async () => {
        const { data } = await apiFetch('/v1/recurring', { schema: RecurringSummarySchema });
        set({ recurring: data });
      },

      // ── institutions ───────────────────────────────────────────────────
      institutions: [],
      institutionsLoading: false,

      searchInstitutions: async (query) => {
        set({ institutionsLoading: true });
        try {
          const { data } = await apiFetch('/v1/accounts/institutions', {
            query: { query },
            schema: z.array(InstitutionSchema),
          });
          set({ institutions: data });
        } finally {
          set({ institutionsLoading: false });
        }
      },

      // ── sheet ──────────────────────────────────────────────────────────
      sheetRows: [],
      sheetLoading: false,
      sheetFilter: EMPTY_FILTER,

      setSheetFilter: (partial) => set({ sheetFilter: { ...get().sheetFilter, ...partial } }),

      loadSheet: async () => {
        set({ sheetLoading: true });
        try {
          const { data } = await apiFetch('/v1/transactions/sheet', {
            query: sheetQuery(get().sheetFilter),
            schema: z.array(SheetRowSchema),
          });
          set({ sheetRows: data });
        } finally {
          set({ sheetLoading: false });
        }
      },
    }),
    {
      name: 'trackify.ui',
      // ONLY the sheet filter persists — never balances, rows, or identity.
      partialize: (state) => ({ sheetFilter: state.sheetFilter }),
    },
  ),
);

export { sheetQuery };
