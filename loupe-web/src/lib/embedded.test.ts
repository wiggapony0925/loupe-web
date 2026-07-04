import { describe, it, expect, beforeEach } from "vitest";
import { embedScope, isEmbedded, isAppEmbedded } from "./embedded";

function setSearch(search: string) {
  window.history.replaceState({}, "", `/page${search}`);
}

describe("embedded scopes", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    setSearch("");
  });

  it("is not embedded by default", () => {
    expect(embedScope()).toBeNull();
    expect(isEmbedded()).toBe(false);
    expect(isAppEmbedded()).toBe(false);
  });

  it("?embed=admin means the locked dev portal, not the app shell", () => {
    setSearch("?embed=admin");
    expect(isEmbedded()).toBe(true);
    expect(isAppEmbedded()).toBe(false);
  });

  it("?embed=app means chrome-less app bundling, not the portal", () => {
    setSearch("?embed=app");
    expect(isAppEmbedded()).toBe(true);
    expect(isEmbedded()).toBe(false);
  });

  it("persists the scope so it survives client-side navigation", () => {
    setSearch("?embed=app");
    expect(embedScope()).toBe("app");
    // SPA navigation drops the query string — the scope must hold.
    setSearch("");
    expect(embedScope()).toBe("app");
    expect(isAppEmbedded()).toBe(true);
  });

  it("a fresh URL param wins over a previously stored scope", () => {
    setSearch("?embed=admin");
    embedScope();
    setSearch("?embed=app");
    expect(embedScope()).toBe("app");
  });
});
