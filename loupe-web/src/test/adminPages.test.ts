import { describe, it, expect } from "vitest";
import * as adminBarrel from "@/features/admin";
import {
  ADMIN_PAGES,
  ADMIN_GROUP_ORDER,
  ADMIN_FLAG_KEYS,
} from "@/features/admin/adminPages";

describe("ADMIN_PAGES registry", () => {
  it("every page maps to a real exported admin component", () => {
    const barrel = adminBarrel as Record<string, unknown>;
    for (const page of ADMIN_PAGES) {
      expect(typeof barrel[page.component], `${page.component} missing`).toBe("function");
    }
  });

  it("paths and flags are unique", () => {
    const paths = ADMIN_PAGES.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(new Set(ADMIN_FLAG_KEYS).size).toBe(ADMIN_FLAG_KEYS.length);
  });

  it("every page belongs to a known group", () => {
    for (const page of ADMIN_PAGES) {
      expect(ADMIN_GROUP_ORDER).toContain(page.group);
    }
  });

  it("flag keys match the backend key rule (lowercase/digits/underscore)", () => {
    for (const key of ADMIN_FLAG_KEYS) {
      expect(key).toMatch(/^[a-z][a-z0-9_]{1,79}$/);
      expect(key.startsWith("admin_")).toBe(true);
    }
  });

  it("keeps core pages (overview, flags) ungated so the portal can't lock out", () => {
    const overview = ADMIN_PAGES.find((p) => p.path === "overview");
    const flags = ADMIN_PAGES.find((p) => p.path === "flags");
    expect(overview?.flag).toBeUndefined();
    expect(flags?.flag).toBeUndefined();
  });

  it("gates every non-core page with a flag", () => {
    const ungated = ADMIN_PAGES.filter((p) => !p.flag).map((p) => p.path);
    expect(ungated.sort()).toEqual(["flags", "overview"]);
  });
});
