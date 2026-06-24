// Vitest setup for the jsdom "unit" project.
// Adds jest-dom matchers (toBeInTheDocument, etc.) and unmounts React trees
// between tests so the DOM doesn't leak across cases. Lives in src/ so the
// jest-dom matcher augmentation is visible to `tsc --noEmit` too.
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./msw/server";

// MSW intercepts network in every unit test; tests add per-case responses with
// `server.use(...)`. Unhandled requests only warn, so non-network tests are
// unaffected.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
