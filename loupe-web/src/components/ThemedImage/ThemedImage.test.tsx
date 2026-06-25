import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { ThemedImage } from "./ThemedImage";

afterEach(() => document.documentElement.removeAttribute("data-theme"));

describe("<ThemedImage />", () => {
  it("shows the dark source in dark mode and swaps live on theme change", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemedImage lightSrc="/logo-light.png" darkSrc="/logo-dark.png" alt="Loupe" />);
    const img = screen.getByAltText("Loupe");
    expect(img.getAttribute("src")).toBe("/logo-dark.png");

    act(() => {
      document.documentElement.setAttribute("data-theme", "light");
    });
    await waitFor(() => expect(img.getAttribute("src")).toBe("/logo-light.png"));
  });
});
