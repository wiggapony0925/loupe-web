// Vitest setup for the jsdom "unit" project.
// Adds jest-dom matchers (toBeInTheDocument, etc.) and unmounts React trees
// between tests so the DOM doesn't leak across cases. Lives in src/ so the
// jest-dom matcher augmentation is visible to `tsc --noEmit` too.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
