import { http, HttpResponse } from "msw";

/**
 * Default MSW request handlers — shared by Vitest (node) and Storybook
 * (browser), so network behavior is defined once. Individual tests/stories
 * override these per-case via `server.use(...)` or a story `msw` parameter.
 * Keep defaults minimal + successful so an un-mocked screen never crashes.
 */
export const handlers = [
  http.get("*/v1/public/trending", () => HttpResponse.json({ cards: [] })),
  http.get("*/v1/public/search", () =>
    HttpResponse.json({
      results: [],
      total: 0,
      page: 1,
      page_size: 12,
      facets: { rarities: [], sets: [] },
    }),
  ),
];
