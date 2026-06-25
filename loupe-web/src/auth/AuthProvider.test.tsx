import { describe, it, expect, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { configureApi } from "@loupe/core";
import { server } from "@/test/msw/server";
import { AuthProvider, useAuth } from "./AuthProvider";

const TOKEN_KEY = "loupe.auth.token";

const USER = {
  id: "u1",
  email: "user@example.com",
  display_name: "User",
  avatar_url: null,
  created_at: "",
};

function tokenPair(access: string) {
  return {
    access_token: access,
    refresh_token: "refresh",
    token_type: "bearer",
    expires_in: 900,
    user: USER,
  };
}

/** Seed a signed-in session with just a token (no cached user) + a `/me` handler.
 *  Tests then await {@link waitForHydration} so the mount `/me` call has fully
 *  resolved before they act — otherwise its `.then(setUser)` could race a logout
 *  and re-populate the user. */
function seedAuthed(token = "old-token") {
  localStorage.setItem(TOKEN_KEY, token);
  server.use(http.get("*/v1/me", () => HttpResponse.json(USER)));
}

/** Wait until the mount `/me` hydration has populated the user. */
async function waitForHydration() {
  await waitFor(() =>
    expect(screen.getByTestId("email").textContent).toBe("user@example.com"),
  );
}

function Probe() {
  const { user, changePassword, logoutEverywhere, logout } = useAuth();
  return (
    <div>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <span data-testid="token">{localStorage.getItem(TOKEN_KEY) ?? "none"}</span>
      <button onClick={() => void changePassword("current-pw", "new-password")}>
        change
      </button>
      <button onClick={() => void logoutEverywhere()}>logout-all</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

function renderApp(): void {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
  render(<Probe />, { wrapper });
}

beforeEach(() => {
  localStorage.clear();
  configureApi({ baseUrl: "" });
});

describe("AuthProvider session methods", () => {
  it("changePassword adopts the fresh token pair the server returns", async () => {
    seedAuthed("old-token");
    server.use(
      http.post("*/v1/auth/change-password", () =>
        HttpResponse.json(tokenPair("new-token")),
      ),
    );

    renderApp();
    await waitForHydration();
    expect(screen.getByTestId("token").textContent).toBe("old-token");

    fireEvent.click(screen.getByText("change"));

    // The new access token replaces the old one (the server revoked it).
    await waitFor(() =>
      expect(screen.getByTestId("token").textContent).toBe("new-token"),
    );
    expect(screen.getByTestId("email").textContent).toBe("user@example.com");
  });

  it("logoutEverywhere calls logout-all then clears the local session", async () => {
    seedAuthed("old-token");
    let revoked = false;
    server.use(
      http.post("*/v1/auth/logout-all", () => {
        revoked = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderApp();
    await waitForHydration();

    fireEvent.click(screen.getByText("logout-all"));

    await waitFor(() =>
      expect(screen.getByTestId("email").textContent).toBe("none"),
    );
    expect(revoked).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("logoutEverywhere still signs out locally if the revoke call fails", async () => {
    seedAuthed("old-token");
    server.use(
      http.post("*/v1/auth/logout-all", () =>
        HttpResponse.json({ error: { code: "x", message: "boom" } }, { status: 500 }),
      ),
    );

    renderApp();
    await waitForHydration();
    fireEvent.click(screen.getByText("logout-all"));

    await waitFor(() =>
      expect(screen.getByTestId("email").textContent).toBe("none"),
    );
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it("logout clears the token and user", async () => {
    seedAuthed("old-token");
    server.use(
      http.post("*/v1/auth/logout", () => new HttpResponse(null, { status: 204 })),
    );

    renderApp();
    await waitForHydration();
    fireEvent.click(screen.getByText("logout"));

    await waitFor(() =>
      expect(screen.getByTestId("email").textContent).toBe("none"),
    );
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
