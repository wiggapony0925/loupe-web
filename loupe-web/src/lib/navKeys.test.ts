import { describe, it, expect, beforeEach } from "vitest";
import {
  mintNavKey,
  encodeNavKey,
  decodeNavKey,
  navKeyLoginUrl,
  navTargetById,
  NAV_TARGETS,
  NAV_KEY_TTL_MS,
  stashPendingKey,
  takePendingKey,
  logMintedKey,
  readMintLog,
  clearMintLog,
} from "./navKeys";

describe("navKeys encode/decode", () => {
  it("round-trips a full key", () => {
    const key = mintNavKey({
      to: "/cards/abc?resume=watchlist.add",
      intent: "watchlist.add",
      card: { id: "abc", title: "Charizard" },
      uid: "user_123",
      src: "test",
    });
    const decoded = decodeNavKey(encodeNavKey(key));
    expect(decoded).toEqual(key);
  });

  it("returns null for a tampered token (checksum mismatch)", () => {
    const token = encodeNavKey(mintNavKey({ to: "/app", intent: "page" }));
    // flip a character in the payload portion
    const tampered = (token[0] === "a" ? "b" : "a") + token.slice(1);
    expect(decodeNavKey(tampered)).toBeNull();
  });

  it("returns null for garbage / missing tokens", () => {
    expect(decodeNavKey(null)).toBeNull();
    expect(decodeNavKey("")).toBeNull();
    expect(decodeNavKey("not-a-key")).toBeNull();
    expect(decodeNavKey("nodot")).toBeNull();
  });

  it("rejects expired keys but honors ignoreExpiry", () => {
    const stale = mintNavKey({
      to: "/app",
      intent: "page",
      ts: Date.now() - NAV_KEY_TTL_MS - 1000,
    });
    const token = encodeNavKey(stale);
    expect(decodeNavKey(token)).toBeNull();
    expect(decodeNavKey(token, { ignoreExpiry: true })).not.toBeNull();
  });

  it("refuses off-site destinations (open-redirect guard)", () => {
    const evil = encodeNavKey(
      mintNavKey({ to: "https://evil.example/phish", intent: "page" }),
    );
    expect(decodeNavKey(evil)).toBeNull();
    const protoRel = encodeNavKey(
      mintNavKey({ to: "//evil.example", intent: "page" }),
    );
    expect(decodeNavKey(protoRel)).toBeNull();
  });

  it("builds a login URL carrying the encoded key", () => {
    const key = mintNavKey({ to: "/cards/x", intent: "alert.set" });
    const url = navKeyLoginUrl(key);
    expect(url.startsWith("/login?k=")).toBe(true);
    const token = decodeURIComponent(url.split("k=")[1] ?? "");
    expect(decodeNavKey(token)?.to).toBe("/cards/x");
  });
});

describe("navKeys catalog", () => {
  it("every target builds a valid in-app path with a resume intent", () => {
    for (const t of NAV_TARGETS) {
      const built = t.build({ cardId: "abc", path: "/app/vault" });
      expect(built.to.startsWith("/")).toBe(true);
      expect(built.intent).toBeTruthy();
      const decoded = decodeNavKey(
        encodeNavKey(mintNavKey({ to: built.to, intent: built.intent })),
      );
      expect(decoded?.to).toBe(built.to);
    }
  });

  it("card targets embed ?resume= so the page can auto-resume", () => {
    const t = navTargetById("watchlist.add")!;
    expect(t.build({ cardId: "abc" }).to).toBe("/cards/abc?resume=watchlist.add");
  });
});

describe("navKeys session storage", () => {
  beforeEach(() => {
    clearMintLog();
    takePendingKey();
  });

  it("stashes and takes the pending key once", () => {
    stashPendingKey("token-1");
    expect(takePendingKey()).toBe("token-1");
    expect(takePendingKey()).toBeNull();
  });

  it("logs minted keys newest-first", () => {
    const a = mintNavKey({ to: "/app", intent: "page" });
    const b = mintNavKey({ to: "/cards/x", intent: "watchlist.add" });
    logMintedKey(a, encodeNavKey(a));
    logMintedKey(b, encodeNavKey(b));
    const log = readMintLog();
    expect(log).toHaveLength(2);
    expect(log[0]?.key.to).toBe("/cards/x");
  });
});
