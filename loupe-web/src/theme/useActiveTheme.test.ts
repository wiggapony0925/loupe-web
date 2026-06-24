import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useActiveTheme } from "./useActiveTheme";

afterEach(() => document.documentElement.removeAttribute("data-theme"));

describe("useActiveTheme", () => {
  it("reads the current <html data-theme>", () => {
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useActiveTheme());
    expect(result.current).toBe("light");
  });

  it("reacts to external data-theme changes via MutationObserver", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const { result } = renderHook(() => useActiveTheme());
    expect(result.current).toBe("dark");

    act(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    await waitFor(() => expect(result.current).toBe("light"));
  });
});
