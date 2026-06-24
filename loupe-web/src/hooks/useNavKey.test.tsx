import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useSearchParams } from "react-router-dom";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { AuthProvider } from "@/auth/AuthProvider";
import { useResolveNavKey, useResumeOnReturn } from "./useNavKey";
import { mintNavKey, encodeNavKey, stashPendingKey, peekPendingKey } from "@/lib/navKeys";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function tokenFor(to: string): string {
  return encodeNavKey(mintNavKey({ to, intent: "page" }));
}

describe("useResolveNavKey", () => {
  function resolveAt(entry: string | { pathname: string; search?: string; state?: unknown }) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>
    );
    return renderHook(() => useResolveNavKey(), { wrapper });
  }

  it("prefers the ?k= param", () => {
    const { result } = resolveAt(`/login?k=${encodeURIComponent(tokenFor("/cards/abc"))}`);
    expect(result.current).toEqual({ to: "/cards/abc", fromKey: true });
  });

  it("falls back to the stashed pending key and consumes it", () => {
    stashPendingKey(tokenFor("/app/vault"));
    const { result } = resolveAt("/login");
    expect(result.current).toEqual({ to: "/app/vault", fromKey: true });
    expect(peekPendingKey()).toBeNull(); // consumed
  });

  it("prefers the param over a stashed pending key (but still consumes pending)", () => {
    stashPendingKey(tokenFor("/app/vault"));
    const { result } = resolveAt(`/login?k=${encodeURIComponent(tokenFor("/cards/abc"))}`);
    expect(result.current.to).toBe("/cards/abc");
    expect(peekPendingKey()).toBeNull();
  });

  it("falls back to legacy location.state.from", () => {
    const { result } = resolveAt({ pathname: "/login", state: { from: "/app/watchlist" } });
    expect(result.current).toEqual({ to: "/app/watchlist", fromKey: true });
  });

  it("defaults to /app when nothing is present", () => {
    const { result } = resolveAt("/login");
    expect(result.current).toEqual({ to: "/app", fromKey: false });
  });

  it("resolves exactly once — a re-render after the pending key is cleared keeps the destination", () => {
    stashPendingKey(tokenFor("/app/vault"));
    const { result, rerender } = resolveAt("/login");
    expect(result.current.to).toBe("/app/vault");
    rerender();
    expect(result.current.to).toBe("/app/vault"); // not reset to /app
  });

  it("ignores a corrupt key and defaults", () => {
    const { result } = resolveAt("/login?k=not-a-real-token");
    expect(result.current).toEqual({ to: "/app", fromKey: false });
  });
});

describe("useResumeOnReturn", () => {
  function authed() {
    // AuthProvider reads the cached user synchronously, so the probe mounts
    // already-signed-in; the token keeps /me from logging it back out.
    localStorage.setItem("loupe.auth.token", "test-token");
    localStorage.setItem(
      "loupe.auth.user",
      JSON.stringify({ id: "u1", email: "u@x.com", display_name: null, avatar_url: null, created_at: "" }),
    );
    server.use(
      http.get("*/v1/me", () =>
        HttpResponse.json({ id: "u1", email: "u@x.com", display_name: null, avatar_url: null, created_at: "" }),
      ),
    );
  }

  function ResumeProbe({ spy }: { spy: () => void }) {
    const [params] = useSearchParams();
    useResumeOnReturn("watchlist.add", spy);
    return <span data-testid="resume">{params.get("resume") ?? "none"}</span>;
  }

  function renderAt(entry: string, opts: { withAuth: boolean }, spy: () => void) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        {opts.withAuth ? (
          <AuthProvider>
            <ResumeProbe spy={spy} />
          </AuthProvider>
        ) : (
          <ResumeProbe spy={spy} />
        )}
      </MemoryRouter>,
    );
  }

  it("fires once and strips the resume param when signed in", async () => {
    authed();
    const spy = vi.fn();
    renderAt("/cards/x?resume=watchlist.add", { withAuth: true }, spy);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("resume").textContent).toBe("none"));
  });

  it("does nothing when the resume intent doesn't match", async () => {
    authed();
    const spy = vi.fn();
    renderAt("/cards/x?resume=alert.set", { withAuth: true }, spy);
    // give effects a tick
    await waitFor(() => expect(screen.getByTestId("resume").textContent).toBe("alert.set"));
    expect(spy).not.toHaveBeenCalled();
  });

  it("does nothing for a guest (no user) even when resume matches", async () => {
    const spy = vi.fn();
    renderAt("/cards/x?resume=watchlist.add", { withAuth: true }, spy);
    // unauthed: AuthProvider settles to no user, so the param stays and spy never runs
    await waitFor(() => expect(screen.getByTestId("resume").textContent).toBe("watchlist.add"));
    expect(spy).not.toHaveBeenCalled();
  });
});
