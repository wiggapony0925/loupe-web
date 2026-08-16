/**
 * The live API base must stay SAME-ORIGIN, and the CSP is why.
 *
 * WHAT HAPPENED. `live` mode resolved to the absolute Cloud Run URL
 * (`https://loupe-api-….us-central1.run.app`). The deployed CSP is
 *
 *     connect-src 'self' https://accounts.google.com https://appleid.apple.com
 *
 * so the browser refused every request before sending it:
 *
 *     Connecting to 'https://loupe-api-….run.app/v1/announcement' violates
 *     the following Content Security Policy directive: "connect-src 'self' …"
 *
 * Not just login — every call on the site. And because the page itself is
 * static and rendered perfectly, the only symptom was "signing in doesn't
 * work". Nothing failed at build time, nothing failed in CI, and nothing
 * failed in dev, where Vite serves without nginx's CSP. It could only be seen
 * in a real browser against the deployed origin.
 *
 * A unit test cannot enforce a CSP. What it CAN do is pin the property the CSP
 * depends on — that live resolves to something relative — so the two cannot
 * drift apart again without a failure.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_BACKEND_URL,
  LOCAL_BACKEND_URL,
  resolveApiBaseUrl,
} from "@/lib/apiMode";

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe("api base url", () => {
  it("resolves live to a same-origin base", () => {
    // Anything with a scheme is cross-origin and connect-src 'self' blocks it.
    expect(resolveApiBaseUrl("live")).not.toMatch(/^https?:\/\//);
  });

  it("keeps LIVE_BACKEND_URL relative so nginx's /v1 proxy stays in the path", () => {
    expect(LIVE_BACKEND_URL).toBe("");
  });

  it("still points local mode at the dev server", () => {
    // Local dev runs under Vite, which does not serve nginx's CSP, so an
    // absolute loopback URL is fine — and necessary, it is a different port.
    expect(resolveApiBaseUrl("local")).toBe(LOCAL_BACKEND_URL);
    expect(LOCAL_BACKEND_URL).toMatch(/^http:\/\/127\.0\.0\.1:/);
  });

  it("lets an explicit VITE_API_URL override both", () => {
    // The escape hatch for pointing a build at a preview backend. It is opt-in
    // and build-time, so it cannot surprise the deployed site.
    vi.stubEnv("VITE_API_URL", "https://staging.example.com");
    expect(resolveApiBaseUrl("live")).toBe("https://staging.example.com");
  });

  it("builds a relative /v1 path when joined to a route", () => {
    // How @loupe/core composes it: base + path. Empty base must not produce
    // "//v1/..." (protocol-relative — a different origin entirely).
    const joined = `${resolveApiBaseUrl("live").replace(/\/$/, "")}/v1/auth/login`;
    expect(joined).toBe("/v1/auth/login");
    expect(joined.startsWith("//")).toBe(false);
  });
});
