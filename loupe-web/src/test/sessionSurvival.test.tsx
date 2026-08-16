/**
 * A failed `/me` must not end the session unless it failed with 401.
 *
 * WHAT THIS IS FOR. AuthProvider refreshes the cached user on mount and used to
 * do this with the refresh's outcome:
 *
 *     .catch(() => logout())
 *
 * which treats "the server did not answer" as "your token is bad". Those are
 * completely different things. A flaky connection, a 500, a cold backend, or —
 * as actually happened — a CSP that blocked the request before it left the tab
 * would each silently delete a perfectly valid token.
 *
 * During the connect-src outage that was every single page load: sign in, get
 * bounced to login, sign in again. The token was fine the whole time.
 *
 * A genuine 401 already has a dedicated handler (`onUnauthorized`) which knows
 * the difference between a lapsed session and an expiring impersonation and
 * tells the user which. The catch-all was redundant for the one case it should
 * handle and destructive for every case it should not.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@loupe/core";

const TOKEN_KEY = "loupe.auth.token";
const USER_KEY = "loupe.auth.user";
const USER = { id: "u1", email: "owner@loupe.app", display_name: "Jeffrey" };

const meGet = vi.fn();

vi.mock("@loupe/core", async () => {
  const actual = await vi.importActual<typeof import("@loupe/core")>("@loupe/core");
  return {
    ...actual,
    configureApi: vi.fn(),
    api: {
      me: { get: () => meGet() },
      auth: { logout: () => Promise.resolve(), logoutAll: () => Promise.resolve() },
    },
  };
});

async function mountAuthed() {
  localStorage.setItem(TOKEN_KEY, "a-perfectly-valid-token");
  localStorage.setItem(USER_KEY, JSON.stringify(USER));
  const { AuthProvider, useAuth } = await import("@/auth/AuthProvider");
  function Probe() {
    const { user } = useAuth();
    return <span data-testid="who">{user ? user.email : "signed-out"}</span>;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  meGet.mockReset();
});
afterEach(() => vi.resetModules());

describe("session survival", () => {
  it("keeps the session when /me fails because the network did", async () => {
    // status 0 — what the client produces for a fetch that never left, which
    // is exactly what a CSP block looks like from JS.
    meGet.mockRejectedValue(
      new ApiError("/v1/me", {
        code: "network.unreachable",
        message: "TypeError: Failed to fetch",
        status: 0,
      }),
    );

    await mountAuthed();

    await waitFor(() => expect(meGet).toHaveBeenCalled());
    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
    expect(screen.getByTestId("who").textContent).toBe(USER.email);
  });

  it("keeps the session when the server 500s", async () => {
    meGet.mockRejectedValue(
      new ApiError("/v1/me", { code: "server.error", message: "boom", status: 500 }),
    );

    await mountAuthed();

    await waitFor(() => expect(meGet).toHaveBeenCalled());
    expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();
  });

  it("DOES end the session on a real 401", async () => {
    // The one case that means the token is genuinely no good.
    meGet.mockRejectedValue(
      new ApiError("/v1/me", {
        code: "auth.invalid_token",
        message: "Invalid token",
        status: 401,
      }),
    );

    await mountAuthed();

    await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull());
  });

  it("refreshes the cached user when /me succeeds", async () => {
    meGet.mockResolvedValue({ ...USER, display_name: "Renamed" });

    await mountAuthed();

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(USER_KEY)!).display_name).toBe("Renamed"),
    );
  });
});
