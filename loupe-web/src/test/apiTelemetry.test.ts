import { describe, it, expect, beforeEach } from "vitest";
import {
  normalizeRoute,
  summarizeShape,
  recordApiCall,
  getApiLog,
  clearApiLog,
  subscribeApiTelemetry,
  summarizeApiStats,
  summarizeApiTelemetry,
  withApiSource,
  peekApiSource,
  setApiTelemetryCapacity,
  type ApiCallRecord,
} from "@loupe/core";

/** Build a recordable call with sane defaults. */
function call(over: Partial<Omit<ApiCallRecord, "id">> = {}): Omit<ApiCallRecord, "id"> {
  return {
    method: "GET",
    path: "/v1/cards/search",
    route: "/v1/cards/search",
    status: 200,
    ok: true,
    durationMs: 100,
    serverMs: 40,
    bytes: 512,
    requestId: "req_1",
    startedAt: Date.now(),
    dataShape: "Array(10)",
    error: null,
    source: null,
    ...over,
  };
}

describe("normalizeRoute", () => {
  it("collapses uuid + numeric + hash-like id segments", () => {
    expect(normalizeRoute("/v1/cards/abc123def/market")).toBe("/v1/cards/:id/market");
    expect(normalizeRoute("/v1/users/3f9c1e22-7b1a-4c2e-9f1a-1b2c3d4e5f60/revoke-sessions")).toBe(
      "/v1/users/:id/revoke-sessions",
    );
    expect(normalizeRoute("/v1/reports/12345/download")).toBe("/v1/reports/:id/download");
  });

  it("collapses provider-scoped catalog ids", () => {
    expect(normalizeRoute("/v1/cards/pokemontcg:swsh7-215/prices")).toBe(
      "/v1/cards/:id/prices",
    );
    expect(
      normalizeRoute("/v1/cards/scryfall:ababe16b-9359-44cb-81fb-e0b3a42b46bd/market"),
    ).toBe("/v1/cards/:id/market");
  });

  it("drops the query string", () => {
    expect(normalizeRoute("/v1/cards/search?q=charizard&tcg=pokemon")).toBe("/v1/cards/search");
  });

  it("keeps real route words intact", () => {
    expect(normalizeRoute("/v1/admin/health")).toBe("/v1/admin/health");
    expect(normalizeRoute("/v1/me/entitlements")).toBe("/v1/me/entitlements");
  });
});

describe("summarizeShape", () => {
  it("describes arrays, objects, and primitives without the payload", () => {
    expect(summarizeShape([1, 2, 3])).toBe("Array(3)");
    expect(summarizeShape(null)).toBe("null");
    expect(summarizeShape("hi")).toBe("string");
    expect(summarizeShape(42)).toBe("number");
    expect(summarizeShape({ a: 1, b: 2 })).toBe("{ a, b }");
  });

  it("truncates wide objects to the first five keys", () => {
    expect(summarizeShape({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 })).toBe(
      "{ a, b, c, d, e, +2 }",
    );
  });
});

describe("recorder", () => {
  beforeEach(() => {
    clearApiLog();
    setApiTelemetryCapacity(500);
  });

  it("appends records and assigns increasing ids", () => {
    recordApiCall(call());
    recordApiCall(call({ path: "/v1/me" }));
    const log = getApiLog();
    expect(log).toHaveLength(2);
    expect(log[1]!.id).toBeGreaterThan(log[0]!.id);
  });

  it("notifies subscribers on change and unsubscribes cleanly", () => {
    let hits = 0;
    const unsub = subscribeApiTelemetry(() => hits++);
    recordApiCall(call());
    expect(hits).toBe(1);
    unsub();
    recordApiCall(call());
    expect(hits).toBe(1);
  });

  it("returns a stable snapshot reference between recordings", () => {
    recordApiCall(call());
    const a = getApiLog();
    const b = getApiLog();
    expect(a).toBe(b); // same ref → safe for useSyncExternalStore
    recordApiCall(call());
    expect(getApiLog()).not.toBe(a); // new ref after a change
  });

  it("respects the ring-buffer capacity", () => {
    setApiTelemetryCapacity(3);
    for (let i = 0; i < 10; i++) recordApiCall(call({ path: `/v1/x/${i}` }));
    expect(getApiLog()).toHaveLength(3);
  });
});

describe("withApiSource", () => {
  it("brackets the source synchronously and restores it after", () => {
    expect(peekApiSource()).toBeNull();
    const inside = withApiSource("CardDetail", () => peekApiSource());
    expect(inside).toBe("CardDetail");
    expect(peekApiSource()).toBeNull();
  });

  it("nests correctly", () => {
    withApiSource("Outer", () => {
      expect(peekApiSource()).toBe("Outer");
      withApiSource("Inner", () => {
        expect(peekApiSource()).toBe("Inner");
      });
      expect(peekApiSource()).toBe("Outer");
    });
  });
});

describe("aggregation", () => {
  beforeEach(() => clearApiLog());

  it("rolls calls up per route, busiest first, with error + latency stats", () => {
    const t = Date.now();
    const records: ApiCallRecord[] = [
      { ...call({ route: "/v1/cards/search", durationMs: 100, startedAt: t }), id: 1 },
      { ...call({ route: "/v1/cards/search", durationMs: 300, startedAt: t + 1 }), id: 2 },
      {
        ...call({
          route: "/v1/cards/search",
          durationMs: 200,
          status: 500,
          ok: false,
          startedAt: t + 2,
        }),
        id: 3,
      },
      { ...call({ route: "/v1/me", method: "GET", durationMs: 50, startedAt: t }), id: 4 },
    ];
    const top = summarizeApiStats(records)[0]!;
    expect(top.route).toBe("/v1/cards/search"); // busiest
    expect(top.count).toBe(3);
    expect(top.errors).toBe(1);
    expect(top.errorRate).toBeCloseTo(1 / 3);
    expect(top.avgMs).toBe(200);
    expect(top.maxMs).toBe(300);
    expect(top.lastStatus).toBe(500); // most recent call
  });

  it("summarizes top-level totals", () => {
    const records: ApiCallRecord[] = [
      { ...call({ route: "/a", bytes: 100, ok: true }), id: 1 },
      { ...call({ route: "/b", bytes: 200, ok: false, status: 404 }), id: 2 },
    ];
    const s = summarizeApiTelemetry(records);
    expect(s.totalCalls).toBe(2);
    expect(s.uniqueRoutes).toBe(2);
    expect(s.errorCount).toBe(1);
    expect(s.errorRate).toBeCloseTo(0.5);
    expect(s.totalBytes).toBe(300);
  });

  it("returns a zeroed summary for an empty log", () => {
    const s = summarizeApiTelemetry([]);
    expect(s.totalCalls).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(s.uniqueRoutes).toBe(0);
  });
});
