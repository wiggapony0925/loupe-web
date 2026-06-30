import { describe, it, expect } from "vitest";
import { readClientEnv } from "@/features/admin/AdminEnv/envRegistry";

describe("readClientEnv", () => {
  const vars = readClientEnv();
  const byKey = Object.fromEntries(vars.map((v) => [v.key, v]));

  it("includes the Vite build built-ins and declared VITE_ vars", () => {
    expect(byKey.MODE).toBeDefined();
    expect(byKey.VITE_API_URL).toBeDefined();
    expect(byKey.VITE_GOOGLE_CLIENT_ID).toBeDefined();
    expect(byKey.VITE_SENTRY_DSN).toBeDefined();
  });

  it("resolves MODE to a live value under test", () => {
    expect(byKey.MODE!.isSet).toBe(true);
    expect(byKey.MODE!.value).toBeTruthy();
  });

  it("flags the Sentry DSN as secret (masked by default in the UI)", () => {
    expect(byKey.VITE_SENTRY_DSN!.secret).toBe(true);
  });

  it("marks unset VITE_ vars as not configured", () => {
    // VITE_USE_DEMO_DATA isn't set in the test env.
    const demo = byKey.VITE_USE_DEMO_DATA!;
    expect(demo.isSet).toBe(false);
    expect(demo.value).toBeNull();
  });

  it("every entry carries a label, group, and description", () => {
    for (const v of vars) {
      expect(v.key).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.group).toBeTruthy();
      expect(v.description).toBeTruthy();
    }
  });
});
